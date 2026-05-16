"""
Market overview — /api/market/overview

Returns A-share market overview: main indices, advance/decline, total volume,
northbound flow, and sector performance. Data cached 5 minutes.
"""

from fastapi import APIRouter
import akshare as ak
import pandas as pd
import json
import os
import time
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("market")

_CACHE_TTL = 300
_cache_ts: float = 0
_cache_data: dict | None = None

_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
try:
    with open(_MAP_PATH, "r", encoding="utf-8") as _f:
        _INDUSTRY_MAP: dict = json.load(_f)
except Exception:
    _INDUSTRY_MAP = {"industries": {}}


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _build_sector_performance(spot_df: pd.DataFrame) -> list:
    try:
        codes = spot_df["代码"].astype(str)
        pcts = pd.to_numeric(spot_df["涨跌幅"], errors="coerce")
        price_map = dict(zip(codes, pcts))
        sectors = []
        for name, code_list in _INDUSTRY_MAP.get("industries", {}).items():
            vals = [price_map[c] for c in code_list
                    if c in price_map and not pd.isna(price_map[c])]
            if vals:
                sectors.append({"name": name, "change_pct": round(sum(vals) / len(vals), 2)})
        sectors.sort(key=lambda x: x["change_pct"], reverse=True)
        return sectors
    except Exception as e:
        logger.warning("Sector performance failed: %s", e)
        return []


@router.get("/overview")
def market_overview():
    global _cache_ts, _cache_data

    now = time.time()
    if _cache_data is not None and now - _cache_ts < _CACHE_TTL:
        return _cache_data

    result: dict = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M"),
        "advance_count": 0,
        "decline_count": 0,
        "flat_count": 0,
        "total_volume": "N/A",
        "shanghai_index": None,
        "shenzhen_index": None,
        "chinext_index": None,
        "northbound_flow": "N/A",
        "sector_performance": [],
    }

    # Spot data: advance/decline counts, volume, sector perf
    spot_df = None
    try:
        spot_df = ak.stock_zh_a_spot_em()
        pct = pd.to_numeric(spot_df["涨跌幅"], errors="coerce")
        result["advance_count"] = int((pct > 0).sum())
        result["decline_count"] = int((pct < 0).sum())
        result["flat_count"]    = int((pct == 0).sum())
        vol = pd.to_numeric(spot_df["成交额"], errors="coerce").sum()
        result["total_volume"]  = f"{vol / 1e8:.0f}亿"
        result["sector_performance"] = _build_sector_performance(spot_df)
    except Exception as e:
        logger.warning("stock_zh_a_spot_em failed: %s", e)

    # Index data
    for sym_param in ("上证系列指数", "深证系列指数"):
        try:
            df = ak.stock_zh_index_spot_em(symbol=sym_param)
            for _, row in df.iterrows():
                name = str(row.get("名称", ""))
                entry = {
                    "value":      _safe_float(row.get("最新价", 0)),
                    "change":     _safe_float(row.get("涨跌额", 0)),
                    "change_pct": round(_safe_float(row.get("涨跌幅", 0)) / 100, 4),
                }
                if ("上证指数" in name or "上综指" in name) and not result["shanghai_index"]:
                    result["shanghai_index"] = entry
                elif ("深证成指" in name or "深成指" in name) and not result["shenzhen_index"]:
                    result["shenzhen_index"] = entry
                elif "创业板指" in name and not result["chinext_index"]:
                    result["chinext_index"] = entry
        except Exception as e:
            logger.warning("Index %s failed: %s", sym_param, e)

    # Northbound flow
    try:
        nf = ak.stock_hsgt_north_net_flow_in_em(symbol="沪股通")
        if nf is not None and not nf.empty:
            val = _safe_float(nf.iloc[-1].get("净流入", 0))
            sign = "+" if val >= 0 else ""
            result["northbound_flow"] = f"{sign}{val / 1e8:.1f}亿"
    except Exception as e:
        logger.warning("Northbound flow failed: %s", e)

    _cache_ts   = now
    _cache_data = result
    return result
