from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.middleware.rate_limiter import RateLimitMiddleware, clear_rate_limit_store
from app.middleware import rate_limiter


@pytest.fixture()
def rate_limited_client(monkeypatch):
    clear_rate_limit_store()

    monkeypatch.setattr(rate_limiter, "decode_token", lambda token: {"sub": "user-123"} if token == "valid-token" else None)
    monkeypatch.setattr(rate_limiter, "time", lambda: 1000.0)

    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.post("/ask")
    def ask():
        return {"ok": True}

    @app.post("/rag/chat")
    def rag_chat():
        return {"ok": True}

    @app.post("/rag/upload")
    def rag_upload():
        return {"ok": True}

    with TestClient(app) as client:
        yield client

    clear_rate_limit_store()


def test_rate_limiter_allows_normal_usage(rate_limited_client):
    headers = {"Authorization": "Bearer valid-token"}

    responses = [rate_limited_client.post("/ask", headers=headers) for _ in range(10)]

    assert all(response.status_code == 200 for response in responses)


def test_rate_limiter_allows_edge_limit(rate_limited_client):
    headers = {"Authorization": "Bearer valid-token"}

    responses = [rate_limited_client.post("/rag/chat", headers=headers) for _ in range(50)]

    assert all(response.status_code == 200 for response in responses)


def test_rate_limiter_blocks_overflow(rate_limited_client):
    headers = {"Authorization": "Bearer valid-token"}

    for _ in range(50):
        response = rate_limited_client.post("/rag/upload", headers=headers)
        assert response.status_code == 200

    blocked = rate_limited_client.post("/rag/upload", headers=headers)

    assert blocked.status_code == 429
    assert blocked.json() == {"detail": "Rate limit exceeded. Please try again after 15 minutes."}
    assert blocked.headers["Retry-After"] == "900"
