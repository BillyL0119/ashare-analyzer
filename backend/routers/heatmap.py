"""
Market heatmap — /api/heatmap?market=us|cn&limit=N

Tiles sized by market cap and coloured by today's move, grouped by sector.
  us: the largest N US-listed companies from the screener universe (live Tencent quotes,
      refreshed by the screener's background enrichment), grouped by Nasdaq sector.
  cn: the ~210 followed A-shares in data/industry_map.json, grouped by those industries,
      quoted in one Tencent batch (cached 60s).
Each sector also gets a cap-weighted change so the group header says how it did.
"""

import json
import os
import time

from fastapi import APIRouter, Query

router = APIRouter()

_MAP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_map.json")
_CN_SECTOR_EN = {
    "白酒": "Baijiu", "银行": "Banks", "新能源": "New Energy", "科技": "Tech", "医药": "Pharma",
    "消费": "Consumer", "地产": "Real Estate", "军工": "Defense", "能源": "Energy", "化工": "Chemicals",
    "汽车": "Autos", "电力": "Utilities", "传媒": "Media",
}
_cn_cache: dict = {"ts": 0.0, "data": None}


def _group(rows: list[dict], key: str) -> list[dict]:
    groups: dict = {}
    for r in rows:
        groups.setdefault(r.get(key) or "Other", []).append(r)
    out = []
    for name, items in groups.items():
        cap = sum(i["market_cap"] for i in items)
        moved = [i for i in items if i["change_pct"] is not None]
        wcap = sum(i["market_cap"] for i in moved)
        chg = sum(i["market_cap"] * i["change_pct"] for i in moved) / wcap if wcap else None
        items.sort(key=lambda i: -i["market_cap"])
        out.append({"name": name, "market_cap": cap, "change_pct": round(chg, 2) if chg is not None else None,
                    "stocks": items})
    out.sort(key=lambda g: -g["market_cap"])
    return out


def _us(limit: int) -> dict:
    from routers.screener import _universe, _state
    rows = [r for r in _universe() if r.get("market_cap") and r.get("change_pct") is not None]
    rows.sort(key=lambda r: -r["market_cap"])
    tiles = [{
        "symbol": r["symbol"], "name": r["name"], "market_cap": r["market_cap"],
        "change_pct": round(r["change_pct"], 2), "price": r.get("price"),
        "sector": r.get("sector") or "Other", "industry": r.get("industry"),
    } for r in rows[:limit]]
    return {"market": "us", "count": len(tiles), "sectors": _group(tiles, "sector"),
            "updated": _state.get("enrich_ts") or _state.get("ts")}


def _cn() -> dict:
    if _cn_cache["data"] and time.time() - _cn_cache["ts"] < 60:
        return _cn_cache["data"]
    from services.stock_service import tencent_quotes
    with open(_MAP_PATH, encoding="utf-8") as f:
        industries = json.load(f).get("industries", {})
    codes = [c for cs in industries.values() for c in cs]
    quotes = tencent_quotes(codes, timeout=6)
    tiles, seen = [], set()
    for sector, cs in industries.items():
        for c in cs:
            q = quotes.get(c)
            if c in seen or not q or not q.get("market_cap_yi") or not q.get("price"):
                continue
            seen.add(c)
            prev = q.get("prev_close") or 0
            tiles.append({
                "symbol": c, "name": q["name"], "market_cap": q["market_cap_yi"] * 1e8,
                "change_pct": round((q["price"] - prev) / prev * 100, 2) if prev else None,
                "price": q["price"], "sector": sector, "sector_en": _CN_SECTOR_EN.get(sector, sector),
            })
    data = {"market": "cn", "count": len(tiles), "sectors": _group(tiles, "sector"), "updated": time.time()}
    for g in data["sectors"]:
        g["name_en"] = _CN_SECTOR_EN.get(g["name"], g["name"])
    if tiles:
        _cn_cache.update(ts=time.time(), data=data)
    return data


@router.get("")
def heatmap(market: str = Query("us", pattern="^(us|cn)$"), limit: int = Query(300, ge=20, le=500)):
    return _us(limit) if market == "us" else _cn()
