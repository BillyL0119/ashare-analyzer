from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
import time

router = APIRouter()

# Module-level cache: symbol -> (industry_name, [code, ...])
_industry_cache: dict = {}

# Load industry map once at import time
_INDUSTRY_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_INDUSTRY_MAP_PATH, "r", encoding="utf-8") as f:
        _INDUSTRY_MAP = json.load(f)
except Exception:
    _INDUSTRY_MAP = {"prefixes": {}, "industries": {}}


def _get_60d_closes(symbol: str, start: str, end: str) -> pd.Series:
    """Fetch daily closes using Sina Finance (ak.stock_zh_a_daily)."""
    try:
        df = ak.stock_zh_a_daily(
            symbol=symbol,
            start_date=start,
            end_date=end,
            adjust="qfq",
        )
        if df is None or df.empty:
            return pd.Series(dtype=float, name=symbol)
        df = df.sort_index()
        return df["close"].rename(symbol)
    except Exception:
        return pd.Series(dtype=float, name=symbol)


def _find_industry(symbol: str):
    """Return (industry_name, [code, ...]) using the local industry_map.json.
    Falls back to prefix-based lookup if not found by exact match."""
    if symbol in _industry_cache:
        return _industry_cache[symbol]

    industries = _INDUSTRY_MAP.get("industries", {})
    prefixes = _INDUSTRY_MAP.get("prefixes", {})

    # Exact match in industries
    for industry_name, codes in industries.items():
        if symbol in codes:
            _industry_cache[symbol] = (industry_name, list(codes))
            return industry_name, list(codes)

    # Prefix fallback
    industry_name = prefixes.get(symbol)
    if industry_name and industry_name in industries:
        codes = list(industries[industry_name])
        _industry_cache[symbol] = (industry_name, codes)
        return industry_name, codes

    # Last resort: guess by first digit
    prefix_map = {
        "6": "银行",
        "0": "房地产",
        "3": "半导体",
    }
    guessed = prefix_map.get(symbol[0], "消费电子")
    codes = list(industries.get(guessed, []))
    _industry_cache[symbol] = (guessed, codes)
    return guessed, codes


@router.get("/{symbol}")
def similar_stocks(symbol: str):
    from services.stock_service import search_stocks

    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=100)  # ~70 trading days
    start_str = start_dt.strftime("%Y%m%d")
    end_str = end_dt.strftime("%Y%m%d")

    # 1. Get target stock's price series
    target_closes = _get_60d_closes(symbol, start_str, end_str)
    if len(target_closes) < 10:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")

    target_returns = target_closes.pct_change().dropna()

    # 2. Find industry and peer list
    industry_name, peer_codes = _find_industry(symbol)

    # Exclude self; limit to 15 peers
    peer_codes = [c for c in peer_codes if c != symbol][:15]

    # Build name lookup via search_stocks
    def _lookup_name(code: str) -> str:
        try:
            results = search_stocks(code)
            for r in results:
                if r.get("code") == code:
                    return r.get("name", code)
        except Exception:
            pass
        return code

    # 3. Fetch price data SEQUENTIALLY with throttle
    peer_results = []
    for code in peer_codes:
        closes = _get_60d_closes(code, start_str, end_str)
        name = _lookup_name(code)
        peer_results.append((code, name, closes))
        time.sleep(0.3)

    # 4. Compute Pearson correlation on daily returns
    results = []
    for code, name, closes in peer_results:
        if len(closes) < 10:
            continue
        peer_returns = closes.pct_change().dropna()
        common = target_returns.index.intersection(peer_returns.index)
        if len(common) < 10:
            continue
        corr = target_returns[common].corr(peer_returns[common])
        if pd.isna(corr):
            continue

        # Build sparkline: normalized to 100 at first close
        base = closes.iloc[0]
        sparkline = [round(float(v / base * 100), 2) for v in closes.values]

        results.append({
            "code": code,
            "name": name,
            "correlation": round(float(corr), 4),
            "sparkline": sparkline,
        })

    # 5. Sort descending, top 10
    results.sort(key=lambda x: x["correlation"], reverse=True)

    return {
        "symbol": symbol,
        "industry": industry_name,
        "results": results[:10],
    }
