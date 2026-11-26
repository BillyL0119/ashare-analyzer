"""
"我的投资记录" API (admin only; the admin's own real account).

  GET    /api/admin/journal                 entries + computed summary (holdings, return vs SPY, warnings, review)
  POST   /api/admin/journal/entries         add one entry
  PUT    /api/admin/journal/entries/{id}    change one entry
  DELETE /api/admin/journal/entries/{id}    remove one entry
  GET    /api/admin/journal/export.csv      all entries as CSV (a backup the owner keeps)

Entries are stored per signed-in account in backend/data/journal/<hashed user id>.json on the server only (gitignored),
written atomically. Every change re-plays the whole list (services.journal.ledger) so an impossible sell or a buy
without the cash is refused with a plain message. The maths lives in services/journal.py.
"""
import csv
import io
import json
import os
import shutil
import threading
import time
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse, Response

from services import auth
from services import journal as J

journal_router = APIRouter()
DIR = os.path.join(os.path.dirname(__file__), "..", "data", "journal")
_lock = threading.Lock()
_GICS = os.path.join(os.path.dirname(__file__), "..", "data", "us_gics_sectors.json")
_SIGNALS = os.path.join(os.path.dirname(__file__), "..", "data", "quant", "signals.json")


def _path(ident):
    uid = ident.get("sub") or ident.get("id") or ident.get("email") or "admin"
    return os.path.join(DIR, f"{auth.uid_hash(str(uid))}.json")


def _read(ident):
    try:
        with open(_path(ident), encoding="utf-8") as fh:
            return json.load(fh).get("entries", [])
    except (OSError, ValueError):
        return []


HISTORY_KEEP = 60           # previous versions kept per account (every add / edit / delete / import saves one)


def _keep_previous(p):
    """Copy the file about to be replaced into data/journal/history/ (a bad edit or delete can be undone from there)."""
    if not os.path.exists(p):
        return
    hist = os.path.join(DIR, "history")
    try:
        os.makedirs(hist, exist_ok=True)
        base = os.path.basename(p)[:-len(".json")]
        shutil.copy2(p, os.path.join(hist, f"{base}-{time.strftime('%Y%m%d-%H%M%S')}-{time.time_ns()}.json"))
        old = sorted(f for f in os.listdir(hist) if f.startswith(base + "-"))
        for f in old[:-HISTORY_KEEP]:
            os.remove(os.path.join(hist, f))
    except OSError:
        pass                                      # a failed copy must never block saving the entry


def _write(ident, entries):
    os.makedirs(DIR, exist_ok=True)
    p = _path(ident)
    _keep_previous(p)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump({"entries": entries, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S")}, fh, ensure_ascii=False)
    os.replace(tmp, p)


def _today():
    # the latest calendar day anywhere (UTC+14): a trade dated "today" in Asia must not count as the future
    return (datetime.utcnow() + timedelta(hours=14)).date().isoformat()


def _check(entries):
    try:
        J.ledger(entries)
    except J.JournalError as e:
        raise HTTPException(422, str(e)) from None


# ── summary ──────────────────────────────────────────────────────────────────

def _sector_map():
    try:
        with open(_GICS) as fh:
            return json.load(fh).get("sectors", {})
    except (OSError, ValueError):
        return {}


def _model_return(start, end):
    """The desk's live model (top 50) over [start, end] from its weekly record, when the windows overlap."""
    try:
        with open(_SIGNALS) as fh:
            live = (json.load(fh).get("live") or {}).get("series") or []
    except (OSError, ValueError):
        return None
    pts = [p for p in live if start <= p["date"] <= end]
    if len(pts) < 2:
        return None
    return {"from": pts[0]["date"], "to": pts[-1]["date"], "pct": round((pts[-1]["model"] / pts[0]["model"] - 1) * 100, 2)}


def summarize(entries):
    from services import nasdaq
    if not entries:
        return {"empty": True}
    syms = sorted({e["ticker"] for e in entries if e.get("ticker")})
    hist = {s: nasdaq.daily_history(s) for s in syms + ["SPY"]}
    splits = {s: nasdaq.splits(s) for s in syms}
    factor = lambda sym, day: nasdaq.split_factor_after(splits.get(sym) or [], day)   # noqa: E731
    first = min(e["date"] for e in entries)
    days = [r["date"] for r in hist["SPY"] if r["date"] >= first]
    if not days:
        days = [first]
    values = J.daily_values(entries, days, hist, factor)
    curve = J.time_weighted(values)
    spy = J.total_return_index(hist["SPY"], nasdaq.dividends("SPY"), days)
    lg = J.ledger(entries, factor)

    # value the holdings at live prices where available, else the last close
    try:
        from routers.us_market import us_quotes
        quotes = us_quotes(list(lg["positions"])) if lg["positions"] else {}
    except Exception:
        quotes = {}
    sectors_gics = _sector_map()
    holdings, total = [], lg["cash"]
    for sym, p in lg["positions"].items():
        q = quotes.get(sym) or {}
        last = (hist.get(sym) or [{}])[-1].get("close") if hist.get(sym) else None
        price = q.get("price") or last or (p["cost"] / p["shares"])
        value = p["shares"] * price
        total += value
        ac = None
        try:
            ac = nasdaq.asset_class(sym)
        except Exception:
            pass
        sector = "ETF / fund" if ac == "etf" else sectors_gics.get(sym)
        if not sector:
            try:
                sector = ((nasdaq.summary(sym) or {}).get("Sector") or {}).get("value") or "Other"
            except Exception:
                sector = "Other"
        holdings.append({"ticker": sym, "name": q.get("name") or sym, "name_zh": q.get("name_zh"), "shares": round(p["shares"], 6),
                         "avg_cost": round(p["cost"] / p["shares"], 4), "price": round(price, 4), "value": round(value, 2),
                         "gain": round(value - p["cost"], 2), "gain_pct": round((value / p["cost"] - 1) * 100, 2) if p["cost"] > 0 else None,
                         "sector": sector, "first_buy": p["first_buy"], "reasons": p["reasons"][-3:]})
    for h in holdings:
        h["weight"] = round(h["value"] / total * 100, 2) if total > 0 else 0
    holdings.sort(key=lambda h: -h["value"])
    sectors = {}
    for h in holdings:
        sectors[h["sector"]] = round(sectors.get(h["sector"], 0) + h["weight"], 2)
    sectors["cash"] = round(lg["cash"] / total * 100, 2) if total > 0 else 0
    net_dep = sum(a for _, a in lg["flows"])
    dd = J.max_drawdown(curve) * 100
    cutoff = (date.fromisoformat(_today()) - timedelta(days=30)).isoformat()
    trades_30d = sum(1 for e in entries if e["type"] in ("buy", "sell") and e["date"] >= cutoff)
    step = max(1, len(days) // 120)
    series = [{"date": days[i], "account": round(curve[i] * 100, 2), "spy": round(spy[i] * 100, 2)}
              for i in range(0, len(days), step)]
    if series and series[-1]["date"] != days[-1]:
        series.append({"date": days[-1], "account": round(curve[-1] * 100, 2), "spy": round(spy[-1] * 100, 2)})
    return {
        "empty": False, "as_of": days[-1], "first_date": first,
        "total_value": round(total, 2), "cash": round(lg["cash"], 2), "net_deposits": round(net_dep, 2),
        "total_gain": round(total - net_dep, 2),
        "return_pct": round((curve[-1] - 1) * 100, 2), "spy_pct": round((spy[-1] - 1) * 100, 2),
        "model": _model_return(first, days[-1]),
        "max_drawdown_pct": round(dd, 2), "holdings": holdings, "sectors": sectors,
        "realised": list(reversed(lg["realised"])), "realised_total": round(sum(r["gain"] for r in lg["realised"]), 2),
        "warnings": J.warnings_for(holdings, total, sectors, dd, trades_30d), "trades_30d": trades_30d,
        "series": series,
    }


# ── routes ───────────────────────────────────────────────────────────────────

@journal_router.get("")
def get_journal(ident: dict = Depends(auth.require_admin)):
    entries = _read(ident)
    try:
        summary = summarize(entries)
    except J.JournalError as e:
        summary = {"empty": False, "error": str(e)}
    return JSONResponse({"entries": J._sorted(entries)[::-1], "summary": summary}, headers={"Cache-Control": "no-store"})


@journal_router.post("/entries")
def add_entry(body: dict = Body(...), ident: dict = Depends(auth.require_admin)):
    try:
        e = J.new_entry(body, _today())
    except J.JournalError as err:
        raise HTTPException(422, str(err)) from None
    e["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with _lock:
        entries = _read(ident) + [e]
        _check(entries)
        _write(ident, entries)
    return {"ok": True, "entry": e}


@journal_router.put("/entries/{entry_id}")
def edit_entry(entry_id: str, body: dict = Body(...), ident: dict = Depends(auth.require_admin)):
    try:
        cleaned = J.clean_entry(body, _today())
    except J.JournalError as err:
        raise HTTPException(422, str(err)) from None
    with _lock:
        entries = _read(ident)
        hit = next((x for x in entries if x.get("id") == entry_id), None)
        if not hit:
            raise HTTPException(404, "entry not found")
        new = {**cleaned, "id": entry_id, "created_at": hit.get("created_at"), "edited_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
               **({"imported": True} if hit.get("imported") else {})}       # a real reason clears needs_reason
        entries = [new if x.get("id") == entry_id else x for x in entries]
        _check(entries)
        _write(ident, entries)
    return {"ok": True, "entry": new}


@journal_router.delete("/entries/{entry_id}")
def delete_entry(entry_id: str, ident: dict = Depends(auth.require_admin)):
    with _lock:
        entries = _read(ident)
        rest = [x for x in entries if x.get("id") != entry_id]
        if len(rest) == len(entries):
            raise HTTPException(404, "entry not found")
        _check(rest)
        _write(ident, rest)
    return {"ok": True}


@journal_router.post("/import")
def import_entries(body: dict = Body(...), ident: dict = Depends(auth.require_admin)):
    """{"rows": [...form-shaped rows parsed from a broker CSV in the browser], "dry_run": true|false}. A dry run only
    reports what would happen; otherwise every new row is added in one go, or none if the whole list would sell more
    than was held or spend cash the account did not have."""
    rows = body.get("rows")
    if not isinstance(rows, list) or not rows:
        raise HTTPException(422, "no rows to import")
    with _lock:
        existing = _read(ident)
        add, report = J.plan_import(existing, rows, _today())
        problem = None
        try:
            J.ledger(existing + add)
        except J.JournalError as e:
            problem = str(e)
        counts = {k: sum(1 for r in report if r["status"] == k) for k in ("ok", "duplicate", "error")}
        if body.get("dry_run", True) is not False:
            return {"dry_run": True, "counts": counts, "report": report, "problem": problem,
                    "needs_reason": sum(1 for e in add if e.get("needs_reason"))}
        if problem:
            raise HTTPException(422, problem)
        stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
        for e in add:
            e["created_at"] = stamp
        if add:
            _write(ident, existing + add)
    return {"dry_run": False, "counts": counts, "added": len(add)}


@journal_router.get("/export.csv")
def export_csv(ident: dict = Depends(auth.require_admin)):
    cols = ["date", "type", "ticker", "shares", "price", "fee", "amount", "tag", "reason", "needs_reason", "id", "created_at"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for e in J._sorted(_read(ident)):
        w.writerow(e)
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=investing-journal.csv", "Cache-Control": "no-store"})
