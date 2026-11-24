"""Journal API: admins only, refuses impossible entries, edit/delete re-check the whole list, CSV export."""
import pytest

pytest.importorskip("fastapi.testclient")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from routers import journal  # noqa: E402
from services import auth  # noqa: E402

H = {"Authorization": "Bearer boss"}


@pytest.fixture
def c(monkeypatch, tmp_path):
    monkeypatch.setattr(journal, "DIR", str(tmp_path))
    monkeypatch.setattr(journal, "summarize", lambda entries: {"n": len(entries)})
    monkeypatch.setattr(auth, "verify_token", lambda tok: {"id": tok, "email": f"{tok}@x.com"} if tok else None)
    monkeypatch.setattr(auth, "role_for", lambda ident: "admin" if ident["id"] == "boss" else "user")
    app = FastAPI()
    app.include_router(journal.journal_router, prefix="/api/admin/journal")
    return TestClient(app)


def test_only_admins(c):
    assert c.get("/api/admin/journal").status_code == 401
    assert c.get("/api/admin/journal", headers={"Authorization": "Bearer kid"}).status_code == 403


def test_add_edit_delete_and_checks(c):
    r = c.post("/api/admin/journal/entries", headers=H, json={"type": "buy", "date": "2026-11-02", "ticker": "AAPL",
                                                               "shares": 1, "price": 200, "reason": "test buy"})
    assert r.status_code == 422 and "deposit" in r.json()["detail"]            # no cash yet
    dep = c.post("/api/admin/journal/entries", headers=H, json={"type": "deposit", "date": "2026-11-02", "amount": 500}).json()["entry"]
    buy = c.post("/api/admin/journal/entries", headers=H, json={"type": "buy", "date": "2026-11-02", "ticker": "aapl",
                                                                 "shares": 1, "price": 200, "reason": "test buy"}).json()["entry"]
    assert buy["ticker"] == "AAPL"
    r = c.put(f"/api/admin/journal/entries/{dep['id']}", headers=H, json={"type": "deposit", "date": "2026-11-02", "amount": 50})
    assert r.status_code == 422                                                  # would leave the buy unpaid
    assert c.delete(f"/api/admin/journal/entries/{dep['id']}", headers=H).status_code == 422
    r = c.get("/api/admin/journal", headers=H).json()
    assert r["summary"] == {"n": 2} and r["entries"][0]["type"] == "buy"
    assert "AAPL" in c.get("/api/admin/journal/export.csv", headers=H).text
    assert c.delete(f"/api/admin/journal/entries/{buy['id']}", headers=H).status_code == 200


def test_accounts_are_separate(c, monkeypatch):
    c.post("/api/admin/journal/entries", headers=H, json={"type": "deposit", "date": "2026-11-02", "amount": 5})
    monkeypatch.setattr(auth, "role_for", lambda ident: "admin")
    other = c.get("/api/admin/journal", headers={"Authorization": "Bearer other"}).json()
    assert other["entries"] == []
