import logging
from collections import deque
from math import ceil
from threading import Lock
from time import time
from typing import Deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token

MAX_REQUESTS = 50
WINDOW_SECONDS = 15 * 60
LIMITED_PATHS = {"/ask", "/rag/chat", "/rag/upload"}

logger = logging.getLogger("inventiq.rate_limiter")
_request_store: dict[str, Deque[float]] = {}
_store_lock = Lock()


def clear_rate_limit_store() -> None:
    with _store_lock:
        _request_store.clear()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _client_key(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_token(token)
        user_id = payload.get("sub") if payload else None
        if user_id:
            return f"user:{user_id}"

    return f"ip:{_client_ip(request)}"


def _prune_requests(requests: Deque[float], now: float) -> None:
    cutoff = now - WINDOW_SECONDS
    while requests and requests[0] <= cutoff:
        requests.popleft()


def _register_request(client_key: str, now: float) -> tuple[bool, int]:
    with _store_lock:
        requests = _request_store.setdefault(client_key, deque())
        _prune_requests(requests, now)

        if len(requests) >= MAX_REQUESTS:
            retry_after = max(1, ceil(WINDOW_SECONDS - (now - requests[0])))
            return False, retry_after

        requests.append(now)
        return True, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path not in LIMITED_PATHS:
            return await call_next(request)

        client_key = _client_key(request)
        allowed, retry_after = _register_request(client_key, time())

        if not allowed:
            logger.warning("Rate limit exceeded for %s on %s", client_key, request.url.path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please try again after 15 minutes."},
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
