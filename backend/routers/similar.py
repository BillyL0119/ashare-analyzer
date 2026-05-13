from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import time
import requests

router = APIRouter()

# ── Cache ────────────────────────────────────────────────────────────────────
_industry_cache: dict = {}          # symbol -> (industry, [codes])
_name_cache: dict = {}              # code -> name
_similar_cache: dict = {}           # symbol -> (timestamp, result)
_CACHE_TTL = 3600                   # 1 hour

# ── Industry map ─────────────────────────────────────────────────────────────
_INDUSTRY_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_INDUSTRY_MAP_PATH, "r", encoding="utf-8") as f:
        _INDUSTRY_MAP = json.load(f)
except Exception:
    _INDUSTRY_MAP = {"industries": {}}

SINA_HEADERS = {
    "Referer": "https://finance.sina.com.cn",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_sina_symbol(code: str) -> str:
    """Convert bare A-share code to Sina Finance prefix format (sh/sz/bj)."""
    code = code.strip()
    if code.startswith(("sh", "sz", "bj")):
        return code
    if code.startswith(("60", "68", "51", "11")):
        return "sh" + code
    if code.startswith(("00", "30", "12", "15", "16", "17", "18")):
        return "sz" + code
    if code.startswith(("43", "83", "87", "88")):
        return "bj" + code
    # default: Shanghai
    return "sh" + code


def _get_stock_name(code: str) -> str:
    """Look up stock name via Sina HQ API; fall back to bare code."""
    if code in _name_cache:
        return _name_cache[code]
    try:
        sina_sym = _to_sina_symbol(code)
        r = requests.get(
            f"http://hq.sinajs.cn/list={sina_sym}",
            headers=SINA_HEADERS,
            timeout=5,
        )
        text = r.text
        if '"' in text:
            name = text.split('"')[1].split(",")[0]
            if name and name != sina_sym:
                _name_cache[code] = name
                return name
    except Exception:
        pass
    return code


def _get_closes(code: str, start: str, end: str) -> pd.Series:
    """Fetch daily adjusted closes from Sina Finance via akshare."""
    try:
        sina_sym = _to_sina_symbol(code)
        df = ak.stock_zh_a_daily(
            symbol=sina_sym,
            start_date=start,
            end_date=end,
            adjust="qfq",
        )
        if df is None or df.empty:
            return pd.Series(dtype=float, name=code)
        df = df.sort_index()
        return df["close"].rename(code)
    except Exception:
        return pd.Series(dtype=float, name=code)


def _find_industry(symbol: str):
    """Return (industry_name, [peer_codes]) for the given symbol."""
    if symbol in _industry_cache:
        return _industry_cache[symbol]

    industries = _INDUSTRY_MAP.get("industries", {})

    # Exact match: find which industry list contains this symbol
    for name, codes in industries.items():
        if symbol in codes:
            _industry_cache[symbol] = (name, list(codes))
            return name, list(codes)

    # Not found → return empty
    _industry_cache[symbol] = ("未知", [])
    return "未知", []


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def similar_stocks(symbol: str):
    # Check cache
    now = time.time()
    if symbol in _similar_cache:
        ts, result = _similar_cache[symbol]
        if now - ts < _CACHE_TTL:
            return result

    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=100)   # ~70 trading days
    start_str = start_dt.strftime("%Y%m%d")
    end_str = end_dt.strftime("%Y%m%d")

    # 1. Target price series
    target_closes = _get_closes(symbol, start_str, end_str)
    if len(target_closes) < 10:
        raise HTTPException(status_code=404, detail=f"无法获取 {symbol} 的历史数据，请检查股票代码")

    target_returns = target_closes.pct_change().dropna()

    # 2. Industry + peers
    industry_name, peer_codes = _find_industry(symbol)
    if not peer_codes:
        raise HTTPException(status_code=404, detail=f"未找到 {symbol} 的行业分类")

    peer_codes = [c for c in peer_codes if c != symbol][:20]

    # 3. Fetch peers SEQUENTIALLY with throttle
    peer_data = []
    for code in peer_codes:
        closes = _get_closes(code, start_str, end_str)
        name = _get_stock_name(code)
        peer_data.append((code, name, closes))
        time.sleep(0.3)

    # 4. Pearson correlation on daily returns
    results = []
    for code, name, closes in peer_data:
        if len(closes) < 10:
            continue
        peer_returns = closes.pct_change().dropna()
        common = target_returns.index.intersection(peer_returns.index)
        if len(common) < 10:
            continue
        corr = target_returns[common].corr(peer_returns[common])
        if pd.isna(corr):
            continue

        base = closes.iloc[0]
        if base == 0:
            continue
        sparkline = [round(float(v / base * 100), 2) for v in closes.values]

        results.append({
            "code": code,
            "name": name,
            "correlation": round(float(corr), 4),
            "sparkline": sparkline,
        })

    results.sort(key=lambda x: x["correlation"], reverse=True)

    response = {
        "symbol": symbol,
        "industry": industry_name,
        "results": results[:10],
    }
    _similar_cache[symbol] = (now, response)
    return response
