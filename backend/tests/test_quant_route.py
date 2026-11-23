"""The admin research desk route: admins only, 404 before anything is published, never cached."""
import json

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from routers import quant  # noqa: E402
from services import auth  # noqa: E402


@pytest.fixture
def client(monkeypatch, tmp_path):
    path = tmp_path / "signals.json"
    monkeypatch.setattr(quant, "SIGNALS", str(path))
    monkeypatch.setattr(quant, "_cache", {"mtime": None, "data": None})
    monkeypatch.setattr(auth, "verify_token", lambda tok: {"email": f"{tok}@x.com"} if tok else None)
    monkeypatch.setattr(auth, "role_for", lambda ident: "admin" if ident["email"].startswith("boss") else "user")
    app = FastAPI()
    app.include_router(quant.quant_router, prefix="/api/admin/quant")
    return TestClient(app), path


def test_needs_sign_in_and_admin(client):
    c, path = client
    path.write_text(json.dumps({"as_of": "2026-11-20"}))
    assert c.get("/api/admin/quant/signals").status_code == 401
    assert c.get("/api/admin/quant/signals", headers={"Authorization": "Bearer someone"}).status_code == 403


def test_admin_gets_the_file_uncached(client):
    c, path = client
    r = c.get("/api/admin/quant/signals", headers={"Authorization": "Bearer boss"})
    assert r.status_code == 404                                    # nothing published yet
    path.write_text(json.dumps({"as_of": "2026-11-20", "ranking": [{"ticker": "THC"}]}))
    r = c.get("/api/admin/quant/signals", headers={"Authorization": "Bearer boss"})
    assert r.status_code == 200 and r.json()["ranking"][0]["ticker"] == "THC"
    assert r.headers["cache-control"] == "no-store"
