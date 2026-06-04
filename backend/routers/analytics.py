"""
Visitor Analytics — /api/analytics/*

Tracks page visits, unique devices, stock searches, and feature usage.
Data persisted to backend/data/analytics.json with an advisory file lock
(fcntl on Linux) to prevent concurrent-write corruption.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import os
import json
import fcntl
import logging

router = APIRouter()
logger = logging.getLogger("analytics")

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "analytics.json")
_BEIJING_TZ = timezone(timedelta(hours=8))

_EMPTY: dict = {
    "total_visits":   0,
    "unique_devices": 0,
    "daily_visits":   {},
    "stock_searches": {},
    "feature_usage":  {},
    "devices":        [],
}

# Known stock names (supplement with stock_names.json)
_NAMES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "stock_names.json")
try:
    with open(_NAMES_PATH, "r", encoding="utf-8") as _f:
        _STOCK_NAMES: dict = json.load(_f)
except Exception:
    _STOCK_NAMES = {}

# Common US stock names (hardcoded for display; avoids live API call per request)
_US_NAMES: dict = {
    "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "NVIDIA", "GOOGL": "Alphabet",
    "AMZN": "Amazon", "META": "Meta", "TSLA": "Tesla", "BRK.B": "Berkshire",
    "AVGO": "Broadcom", "JPM": "JPMorgan", "LLY": "Eli Lilly", "V": "Visa",
    "UNH": "UnitedHealth", "XOM": "ExxonMobil", "MA": "Mastercard", "JNJ": "J&J",
    "PG": "P&G", "HD": "Home Depot", "COST": "Costco", "ABBV": "AbbVie",
    "AMD": "AMD", "NFLX": "Netflix", "CRM": "Salesforce", "BAC": "BofA",
    "ORCL": "Oracle", "WMT": "Walmart", "MRK": "Merck", "CVX": "Chevron",
    "PEP": "PepsiCo", "ADBE": "Adobe", "QCOM": "Qualcomm", "TXN": "TI",
    "INTC": "Intel", "MU": "Micron", "ARM": "ARM Holdings", "TSM": "TSMC",
    "BABA": "Alibaba", "PDD": "PDD Holdings", "JD": "JD.com", "BIDU": "Baidu",
}


def _resolve_name(sym: str) -> str:
    """Resolve stock symbol to display name, checking A-share and US name tables."""
    if sym in _STOCK_NAMES:
        return _STOCK_NAMES[sym]
    if sym.upper() in _US_NAMES:
        return _US_NAMES[sym.upper()]
    # Try AkShare for unknown A-share codes (6-digit numbers)
    if sym.isdigit() and len(sym) == 6:
        try:
            import akshare as ak
            df = ak.stock_info_a_code_name()
            row = df[df["code"] == sym]
            if not row.empty:
                name = str(row.iloc[0]["name"])
                _STOCK_NAMES[sym] = name  # cache for this process lifetime
                return name
        except Exception:
            pass
    return sym


def _today() -> str:
    return datetime.now(_BEIJING_TZ).strftime("%Y-%m-%d")


def _load() -> dict:
    if not os.path.exists(_DATA_PATH):
        return {k: (v.copy() if isinstance(v, (dict, list)) else v) for k, v in _EMPTY.items()}
    try:
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure all keys exist
        for k, v in _EMPTY.items():
            if k not in data:
                data[k] = v.copy() if isinstance(v, (dict, list)) else v
        return data
    except Exception:
        return {k: (v.copy() if isinstance(v, (dict, list)) else v) for k, v in _EMPTY.items()}


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(_DATA_PATH), exist_ok=True)
    with open(_DATA_PATH, "w", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(data, f, ensure_ascii=False, indent=2)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _locked_update(fn) -> None:
    """Load → mutate → save under an exclusive file lock."""
    # Use a separate lock file so we can hold the lock while reading+writing
    lock_path = _DATA_PATH + ".lock"
    os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    with open(lock_path, "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            data = _load()
            fn(data)
            _save(data)
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


# ── Pydantic models ──────────────────────────────────────────────────────────

class VisitBody(BaseModel):
    device_id: str
    page: str = "home"

class TrackBody(BaseModel):
    device_id: str
    event: str            # "search" | "feature"
    symbol: str = ""
    feature: str = ""


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/visit")
def record_visit(body: VisitBody):
    today = _today()

    def mutate(data: dict):
        data["total_visits"] = data.get("total_visits", 0) + 1

        devices = data.setdefault("devices", [])
        if body.device_id not in devices:
            devices.append(body.device_id)
            data["unique_devices"] = data.get("unique_devices", 0) + 1

        daily = data.setdefault("daily_visits", {})
        if today not in daily:
            daily[today] = {"visits": 0, "unique": 0}
        daily[today]["visits"] += 1
        # Track unique per day (store seen devices per day would be heavy;
        # approximate: count visit as unique if device not seen overall before today)
        daily[today]["unique"] = min(daily[today]["unique"] + 1, daily[today]["visits"])

    try:
        _locked_update(mutate)
    except Exception as e:
        logger.warning("visit write failed: %s", e)

    return {"ok": True}


@router.post("/track")
def record_track(body: TrackBody):
    def mutate(data: dict):
        if body.event == "search" and body.symbol:
            searches = data.setdefault("stock_searches", {})
            searches[body.symbol] = searches.get(body.symbol, 0) + 1
        elif body.event == "feature" and body.feature:
            usage = data.setdefault("feature_usage", {})
            usage[body.feature] = usage.get(body.feature, 0) + 1

    try:
        _locked_update(mutate)
    except Exception as e:
        logger.warning("track write failed: %s", e)

    return {"ok": True}


@router.get("/stats")
def get_stats():
    data = _load()
    today = _today()
    today_dt = datetime.strptime(today, "%Y-%m-%d")
    daily = data.get("daily_visits", {})

    # Today
    today_entry   = daily.get(today, {})
    today_visits  = today_entry.get("visits", 0)
    today_unique  = today_entry.get("unique",  0)

    # This week (last 7 days)
    this_week = 0
    for i in range(7):
        d = (today_dt - timedelta(days=i)).strftime("%Y-%m-%d")
        this_week += daily.get(d, {}).get("visits", 0)

    # Top stocks (top 10)
    searches = data.get("stock_searches", {})
    top_stocks = sorted(searches.items(), key=lambda x: x[1], reverse=True)[:10]
    top_stocks_out = [
        {
            "symbol":   sym,
            "name":     _resolve_name(sym),
            "searches": cnt,
        }
        for sym, cnt in top_stocks
    ]

    # Daily chart — last 30 days, sorted ascending
    chart = []
    for i in range(29, -1, -1):
        d = (today_dt - timedelta(days=i)).strftime("%Y-%m-%d")
        chart.append({
            "date":   d,
            "visits": daily.get(d, {}).get("visits", 0),
            "unique": daily.get(d, {}).get("unique",  0),
        })

    feature_usage = data.get("feature_usage", {})
    stocks_analyzed = sum(data.get("stock_searches", {}).values())
    study_sessions  = feature_usage.get("study", 0)

    return {
        "total_visits":    data.get("total_visits",   0),
        "unique_devices":  data.get("unique_devices",  0),
        "today_visits":    today_visits,
        "today_unique":    today_unique,
        "this_week_visits": this_week,
        "stocks_analyzed": stocks_analyzed,
        "study_sessions":  study_sessions,
        "top_stocks":      top_stocks_out,
        "feature_usage":   feature_usage,
        "daily_chart":     chart,
    }
