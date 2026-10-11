"""
Account roles and login tracking.

Roles: "admin" > "member" > "user".
  - admin:  emails listed in the ADMIN_EMAILS env var (comma separated, set in backend/.env on the
            server, never in the repo). Admins cannot be created or removed from the UI.
  - member: emails an admin has granted membership to (backend/data/roles.json).
  - user:   every other signed-in account.

Identity comes from Supabase: the browser sends its access token as a Bearer header and we ask
Supabase's /auth/v1/user who it belongs to. Nothing the client says about itself is trusted, and an
account whose email is not confirmed is always treated as a plain user.

Login tracking stores a salted hash of the Supabase user id plus dates. No emails or IPs.
"""

import fcntl
import hashlib
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from fastapi import Header, HTTPException

logger = logging.getLogger("auth")

SUPABASE_URL = os.getenv("BFS_SUPABASE_URL", "https://yanbnkraietnntyqhtck.supabase.co")
# Public anon key (the same one the website ships to every browser); it only identifies the project.
SUPABASE_ANON_KEY = os.getenv(
    "BFS_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbmJua3JhaWV0bm50eXFodGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzY5MDQsImV4cCI6MjEwNTAxMjkwNH0.PF5VVcdbqpYzAz6QfZgNWETTqJawZ5_zpDwjlKMFtTY",
)

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_ROLES_PATH = os.path.join(_DATA_DIR, "roles.json")
_USERS_PATH = os.path.join(_DATA_DIR, "users.json")
_BEIJING_TZ = timezone(timedelta(hours=8))
ROLES = ("admin", "member", "user")
_MAX_DAYS_KEPT = 400


def today() -> str:
    return datetime.now(_BEIJING_TZ).strftime("%Y-%m-%d")


# ── Token verification ───────────────────────────────────────────────────────

_token_cache: dict[str, tuple[float, Optional[dict]]] = {}
_token_lock = threading.Lock()
_TOKEN_TTL = 300


def verify_token(token: str) -> Optional[dict]:
    """{id, email, confirmed} for a valid Supabase access token, else None. Cached for 5 minutes."""
    if not token or len(token) > 4096:
        return None
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.time()
    with _token_lock:
        hit = _token_cache.get(key)
        if hit and now - hit[0] < _TOKEN_TTL:
            return hit[1]
        if len(_token_cache) > 2000:
            for k in [k for k, (t, _) in _token_cache.items() if now - t >= _TOKEN_TTL]:
                _token_cache.pop(k, None)
    ident = None
    try:
        r = requests.get(f"{SUPABASE_URL}/auth/v1/user", timeout=6,
                         headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"})
        if r.status_code == 200:
            u = r.json() or {}
            if u.get("id"):
                ident = {"id": u["id"], "email": (u.get("email") or "").strip().lower(),
                         "confirmed": bool(u.get("email_confirmed_at") or u.get("confirmed_at"))}
        elif r.status_code not in (401, 403):
            return None          # Supabase hiccup: don't cache a failure as "invalid"
    except Exception as exc:
        logger.warning("token verify failed: %s", exc)
        return None
    with _token_lock:
        _token_cache[key] = (now, ident)
    return ident


def _bearer(authorization: Optional[str]) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


# ── Roles ────────────────────────────────────────────────────────────────────

def admin_emails() -> set[str]:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def _read_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def member_emails() -> dict:
    return _read_json(_ROLES_PATH, {}).get("members", {})


def role_for(ident: Optional[dict]) -> str:
    if not ident or not ident.get("email") or not ident.get("confirmed"):
        return "user"
    if ident["email"] in admin_emails():
        return "admin"
    if ident["email"] in member_emails():
        return "member"
    return "user"


def set_member(email: str, on: bool, by: str) -> None:
    email = email.strip().lower()
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(_ROLES_PATH + ".lock", "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        data = _read_json(_ROLES_PATH, {})
        members = data.setdefault("members", {})
        if on:
            members[email] = {"since": today(), "by": hashlib.sha256(by.encode()).hexdigest()[:8]}
        else:
            members.pop(email, None)
        tmp = _ROLES_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, _ROLES_PATH)


# ── FastAPI dependencies ─────────────────────────────────────────────────────

def current_identity(authorization: Optional[str] = Header(None)) -> dict:
    ident = verify_token(_bearer(authorization))
    if not ident:
        raise HTTPException(status_code=401, detail="Sign in required")
    return ident


def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    ident = verify_token(_bearer(authorization))
    if not ident:
        raise HTTPException(status_code=401, detail="Sign in required")
    if role_for(ident) != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return ident


# ── Login tracking ───────────────────────────────────────────────────────────

_SALT = os.getenv("BFS_USER_HASH_SALT", "bfs-users-v1")


def uid_hash(user_id: str) -> str:
    return hashlib.sha256((_SALT + user_id).encode()).hexdigest()[:16]


def load_users() -> dict:
    return _read_json(_USERS_PATH, {"users": {}, "tracking_since": None})


def record_login(ident: dict, ui: str = "", new_session: bool = True) -> None:
    """Count one signed-in visit. A user record is {first, days: {date: sessions}, ui}."""
    day = today()
    h = uid_hash(ident["id"])
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(_USERS_PATH + ".lock", "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        data = load_users()
        data.setdefault("users", {})
        data["tracking_since"] = data.get("tracking_since") or day
        u = data["users"].setdefault(h, {"first": day, "days": {}, "ui": ""})
        days = u["days"]
        days[day] = days.get(day, 0) + (1 if new_session else 0) or 1
        if len(days) > _MAX_DAYS_KEPT:
            for old in sorted(days)[:-_MAX_DAYS_KEPT]:
                days.pop(old, None)
        if ui in ("mobile", "desktop"):
            u["ui"] = ui
        tmp = _USERS_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        os.replace(tmp, _USERS_PATH)
