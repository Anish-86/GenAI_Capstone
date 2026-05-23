import logging
import time
from fastapi import Request

logger = logging.getLogger("inventiq")


async def logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration:.1f}ms)")
    return response
