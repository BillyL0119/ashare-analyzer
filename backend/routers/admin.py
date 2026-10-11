"""
Accounts, roles and the admin impact dashboard.

  /api/auth/session  POST  signed-in page load: records the login, returns the caller's role
  /api/admin/overview GET   admin only: users, visits, sources, feature usage, paper trading
  /api/admin/members  GET/POST admin only: list and grant/revoke membership

Everything under /api/admin goes through services.auth.require_admin (verified Supabase token +
server-side admin list), so hiding the page in the UI is a convenience and not the protection.
"""

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services import auth

auth_router = APIRouter()
admin_router = APIRouter()

_EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")


class SessionBody(BaseModel):
    ui: str = ""
    new_session: bool = True       # false when the tab only re-checks the role


@auth_router.post("/session")
def session(body: SessionBody, ident: dict = Depends(auth.current_identity)):
    try:
        auth.record_login(ident, ui=body.ui, new_session=body.new_session)
    except Exception:
        pass                       # tracking must never break signing in
    return {"role": auth.role_for(ident)}


# ── Admin ────────────────────────────────────────────────────────────────────

def _paper_stats() -> dict:
    try:
        from routers.paper_trading import _all_accounts
        accounts = _all_accounts()
    except Exception:
        return {"accounts": 0, "traders": 0, "trades": 0}
    trades = 0
    traders = 0
    for a in accounts:
        n = sum(len(v) for k, v in a.items() if k.endswith("transactions") and isinstance(v, list))
        trades += n
        traders += 1 if n else 0
    return {"accounts": len(accounts), "traders": traders, "trades": trades}


@admin_router.get("/overview")
def overview(_: dict = Depends(auth.require_admin)):
    from routers.analytics import get_stats

    site = get_stats()
    store = auth.load_users()
    users = store.get("users", {})
    today = auth.today()
    today_dt = datetime.strptime(today, "%Y-%m-%d")

    def day(offset: int) -> str:
        return (today_dt - timedelta(days=offset)).strftime("%Y-%m-%d")

    span = 90
    dates = [day(i) for i in range(span - 1, -1, -1)]
    new_by_day = {d: 0 for d in dates}
    active_by_day = {d: 0 for d in dates}
    sessions_by_day = {d: 0 for d in dates}
    for u in users.values():
        if u.get("first") in new_by_day:
            new_by_day[u["first"]] += 1
        for d, n in (u.get("days") or {}).items():
            if d in active_by_day:
                active_by_day[d] += 1
                sessions_by_day[d] += n

    def active_since(days_back: int) -> int:
        cutoff = day(days_back - 1)
        return sum(1 for u in users.values() if any(d >= cutoff for d in (u.get("days") or {})))

    returning = sum(1 for u in users.values() if len(u.get("days") or {}) >= 2)
    ui_users = {"mobile": 0, "desktop": 0}
    for u in users.values():
        if u.get("ui") in ui_users:
            ui_users[u["ui"]] += 1

    # Site visits per day, last 90 days, from the anonymous visitor counter
    from routers.analytics import _load as load_site
    daily_visits = load_site().get("daily_visits", {})

    series = [{
        "date": d,
        "new_users": new_by_day[d],
        "active_users": active_by_day[d],
        "logins": sessions_by_day[d],
        "visits": daily_visits.get(d, {}).get("visits", 0),
    } for d in dates]

    members = auth.member_emails()
    total = len(users)
    return {
        "generated": today,
        "tracking_since": store.get("tracking_since"),
        "users": {
            "total": total,
            "new_today": new_by_day[today],
            "new_7d": sum(new_by_day[day(i)] for i in range(7)),
            "new_30d": sum(new_by_day[day(i)] for i in range(30)),
            "dau": active_by_day[today],
            "wau": active_since(7),
            "mau": active_since(30),
            "returning": returning,
            "returning_pct": round(returning / total * 100, 1) if total else 0,
            "total_logins": sum(sessions_by_day.values()),
            "ui": ui_users,
        },
        "roles": {"admins": len(auth.admin_emails()), "members": len(members)},
        "site": {
            "total_visits": site["total_visits"],
            "unique_devices": site["unique_devices"],
            "this_week_visits": site["this_week_visits"],
            "today_visits": site["today_visits"],
            "stocks_analyzed": site["stocks_analyzed"],
            "ui_split": site["ui_split"],
            "sources": site["sources"],
            "top_stocks": site["top_stocks"],
            "feature_usage": site["feature_usage"],
        },
        "paper": _paper_stats(),
        "series": series,
    }


class MemberBody(BaseModel):
    email: str
    member: bool = True


@admin_router.get("/members")
def members(_: dict = Depends(auth.require_admin)):
    m = auth.member_emails()
    return {
        "admins": sorted(auth.admin_emails()),
        "members": sorted(({"email": e, "since": v.get("since")} for e, v in m.items()), key=lambda x: x["email"]),
    }


@admin_router.post("/members")
def set_member(body: MemberBody, ident: dict = Depends(auth.require_admin)):
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if email in auth.admin_emails():
        raise HTTPException(status_code=400, detail="Admins already have every permission")
    auth.set_member(email, body.member, ident["id"])
    return members(ident)
