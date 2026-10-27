"""
Market heatmap — /api/heatmap?market=us|cn|hk|jp&limit=N

Tiles sized by market cap and coloured by today's move, grouped by sector.
  us: the largest N US-listed companies from the screener universe (live Tencent quotes,
      refreshed by the screener's background enrichment), grouped by Nasdaq sector.
  cn: the ~210 followed A-shares in data/industry_map.json, grouped by those industries,
      quoted in one Tencent batch (cached 60s).
  hk: the largest N Hong Kong equities (HKEX securities list), grouped by Hang Seng Industry
      Classification industry as shown on HKEX's own quote pages (cached on disk, weekly).
  jp: the largest N Tokyo equities (JPX list), grouped by the TSE 33 sectors from that list.
Each sector also gets a cap-weighted change so the group header says how it did.
"""

import json
import logging
import os
import re
import threading
import time

import requests

from fastapi import APIRouter, Query

router = APIRouter()
logger = logging.getLogger(__name__)

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
        out.append({"name": name, "market_cap": cap, "change_pct": (round(chg, 2) or 0.0) if chg is not None else None,
                    "stocks": items})
    out.sort(key=lambda g: -g["market_cap"])
    return out


_GICS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "us_gics_sectors.json")
_gics: dict = {}
# Nasdaq's sector words for the companies outside the GICS list, renamed to the GICS ones;
# "Technology" stays short so it fits a tile header
_SECTOR_NAMES = {"Information Technology": "Technology", "Finance": "Financials",
                 "Telecommunications": "Communication Services", "Basic Materials": "Materials",
                 "Miscellaneous": "Other"}
# A second listing of a company already on the map: Berkshire's A shares, Comcast's exchangeable notes
_US_SKIP = {"BRK.A", "CCZ"}


def _us_sector(r: dict) -> str:
    """GICS sector (tools/build_us_gics.py); Nasdaq's own puts Visa under Consumer Discretionary."""
    if not _gics:
        try:
            with open(_GICS_PATH, encoding="utf-8") as f:
                _gics.update(json.load(f)["sectors"])
        except Exception as e:
            logger.warning(f"heatmap: no GICS sectors ({e})")
    s = _gics.get(r["symbol"]) or r.get("sector") or "Other"
    return _SECTOR_NAMES.get(s, s)


def _us(limit: int) -> dict:
    from routers.screener import _universe, _state
    rows = [r for r in _universe()
            if r.get("market_cap") and r.get("change_pct") is not None and r["symbol"] not in _US_SKIP]
    rows.sort(key=lambda r: -r["market_cap"])
    tiles = [{
        "symbol": r["symbol"], "name": r["name"], "market_cap": r["market_cap"],
        "change_pct": round(r["change_pct"], 2), "price": r.get("price"),
        "sector": _us_sector(r), "industry": r.get("industry"),
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


# ── Hong Kong industries (HSICS, from HKEX's quote data) ──────────────────────

_HSICS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "hk_hsics.cache.json")
_HSICS_TOP = 300                     # classify the largest companies; the rest show as "Other"
_HSICS_MAX_AGE = 30 * 86400          # a company's industry rarely changes
_UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36"}
# HKEX's Chinese pages are in traditional characters; the site shows simplified
_T2S = str.maketrans("業訊資療醫電產築綜費軟務銀險築類運輸設備車導體藥並環營發實樂廣傳飲團體與鋼鐵礦構書遊戲網絡紡織製個護農漁區線",
                     "业讯资疗医电产筑综费软务银险筑类运输设备车导体药并环营发实乐广传饮团体与钢铁矿构书游戏网络纺织制个护农渔区线")
_hsics: dict = {}


def _load_hsics() -> dict:
    global _hsics
    if not _hsics:
        try:
            with open(_HSICS_PATH, encoding="utf-8") as f:
                _hsics = json.load(f)
        except Exception:
            _hsics = {}
    return _hsics


def _hkex_token(session: requests.Session) -> str | None:
    """The quote widget's public token, embedded in HKEX's own equity quote page."""
    r = session.get("https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote",
                    params={"sym": "700", "sc_lang": "en"}, timeout=20)
    m = re.search(r'return "([A-Za-z0-9%+/=]{40,})"', r.text)
    return m.group(1) if m else None


def _hkex_industry(session: requests.Session, token: str, code: str, lang: str) -> str | None:
    url = (f"https://www1.hkex.com.hk/hkexwidget/data/getequityquote?sym={int(code)}&token={token}"
           f"&lang={lang}&qid={int(time.time() * 1000)}&callback=jQuery_1")
    r = session.get(url, headers={"Referer": "https://www.hkex.com.hk/"}, timeout=15)
    m = re.search(r'"hsic_ind_classification":"([^"]*)"', r.text)
    return m.group(1).strip() if m and m.group(1).strip() else None


def _refresh_hsics() -> None:
    """Fill in missing or month-old industries for the largest HK companies, gently (~2 requests/s)."""
    from routers.global_stocks import _universe
    rows = [r for r in (_universe.get("hk") or []) if not r.get("etf") and r.get("cap")]
    rows.sort(key=lambda r: -r["cap"])
    data = dict(_load_hsics())
    now = time.time()
    todo = [r["code"] for r in rows[:_HSICS_TOP] if now - (data.get(r["code"]) or {}).get("ts", 0) > _HSICS_MAX_AGE]
    if not todo:
        return
    s = requests.Session()
    s.headers.update(_UA)
    token = _hkex_token(s)
    if not token:
        logger.warning("HSICS: no HKEX token")
        return
    done = 0
    for code in todo:
        try:
            en = _hkex_industry(s, token, code, "eng")
            time.sleep(0.5)
            zh = _hkex_industry(s, token, code, "chi")
            time.sleep(0.5)
        except Exception as e:
            logger.warning("HSICS %s: %s", code, e)
            continue
        if en:
            data[code] = {"en": en, "zh": (zh or "").translate(_T2S), "ts": now}
            done += 1
    tmp = _HSICS_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, _HSICS_PATH)
    _hsics.clear()
    _hsics.update(data)
    logger.info("HSICS: classified %d of %d", done, len(todo))


def _hsics_loop():
    time.sleep(120)                  # let the HK securities list load first
    while True:
        try:
            _refresh_hsics()
        except Exception as e:
            logger.warning("HSICS refresh failed: %s", e)
        time.sleep(7 * 86400)


threading.Thread(target=_hsics_loop, daemon=True, name="hk-hsics").start()


# ── Hong Kong / Japan ─────────────────────────────────────────────────────────

_intl_cache: dict = {}


def _intl(market: str, limit: int) -> dict:
    hit = _intl_cache.get((market, limit))
    if hit and time.time() - hit[0] < 60:
        return hit[1]
    from routers.global_stocks import _universe, tencent_quotes as intl_quotes
    rows = [r for r in (_universe.get(market) or []) if not r.get("etf") and r.get("cap")]
    rows.sort(key=lambda r: -r["cap"])
    rows = rows[:limit]
    quotes = intl_quotes(market, [r["code"] for r in rows])
    hsics = _load_hsics() if market == "hk" else {}
    tiles, zh_of = [], {}
    for r in rows:
        q = quotes.get(r["code"]) or {}
        if not q.get("price"):
            continue
        if market == "hk":
            ind = hsics.get(r["code"]) or {}
            sector = (ind.get("en") or "Other").split(" - ")[0]
            zh_of[sector] = (ind.get("zh") or "其他").split(" - ")[0]
            name_en, name_zh, name_ja = q.get("name_en") or r.get("name_en"), r.get("name_zh") or r.get("name_local"), r.get("name_local")
        else:
            sector = r.get("sector") or "Other"
            zh_of[sector] = r.get("sector_local") or sector
            name_en, name_zh, name_ja = r.get("name_en"), r.get("name_zh") or r.get("name_local"), r.get("name_local")
        tiles.append({
            "symbol": r["code"], "name": name_en or r["code"], "name_en": name_en, "name_zh": name_zh, "name_ja": name_ja,
            "market_cap": q.get("market_cap") or r["cap"], "price": q["price"],
            "change_pct": round(q["change_pct"], 2) if q.get("change_pct") is not None else None,
            "sector": sector,
        })
    data = {"market": market, "count": len(tiles), "sectors": _group(tiles, "sector"), "updated": time.time()}
    for g in data["sectors"]:
        g["name_zh"] = zh_of.get(g["name"], g["name"])
    if tiles:
        _intl_cache[(market, limit)] = (time.time(), data)
    return data


@router.get("")
def heatmap(market: str = Query("us", pattern="^(us|cn|hk|jp)$"), limit: int = Query(300, ge=20, le=500)):
    if market == "us":
        return _us(limit)
    if market == "cn":
        return _cn()
    return _intl(market, min(limit, 300))
