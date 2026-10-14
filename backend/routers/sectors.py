"""
Sector Rotation — /api/sectors/rotation

Returns multi-period sector performance for heatmap + ranking:
  CN (A-share): ~28 industry boards from AkShare stock_board_industry_name_em
  US: 11 S&P sector ETFs via yfinance

Cached 1 hour per market.
"""

from fastapi import APIRouter, Query
import json
import os
import time
import logging
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from services.js_runtime import V8_LOCK

router = APIRouter()
logger = logging.getLogger("sectors")

_CACHE_TTL = 3600  # 1 hour

_cn_ts: float = 0
_cn_data: dict | None = None

_us_ts: float = 0
_us_data: dict | None = None

# ── US sector ETFs ────────────────────────────────────────────────────────────

_US_ETFS = {
    "XLK":  {"name_en": "Technology",       "name_zh": "科技"},
    "XLF":  {"name_en": "Financials",       "name_zh": "金融"},
    "XLV":  {"name_en": "Health Care",      "name_zh": "医疗健康"},
    "XLE":  {"name_en": "Energy",           "name_zh": "能源"},
    "XLI":  {"name_en": "Industrials",      "name_zh": "工业"},
    "XLP":  {"name_en": "Consumer Staples", "name_zh": "必需消费"},
    "XLY":  {"name_en": "Consumer Discret.","name_zh": "可选消费"},
    "XLB":  {"name_en": "Materials",        "name_zh": "材料"},
    "XLU":  {"name_en": "Utilities",        "name_zh": "公用事业"},
    "XLRE": {"name_en": "Real Estate",      "name_zh": "房地产"},
    "XLC":  {"name_en": "Communication",    "name_zh": "通信服务"},
}

# ── helpers ───────────────────────────────────────────────────────────────────

def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _pct_change_n(series: pd.Series, n: int) -> float:
    """Calculate n-day cumulative % change from a close price series (newest last)."""
    if len(series) < n + 1:
        return 0.0
    old = series.iloc[-(n + 1)]
    new = series.iloc[-1]
    if old == 0:
        return 0.0
    return round((new - old) / abs(old) * 100, 2)


# English names for A-share industry boards (Tonghuashun + Eastmoney); unknown names stay Chinese.
CN_SECTOR_EN = {
    "影视院线": "Film & Cinemas",
    "文化传媒": "Culture & Media",
    "贵金属": "Precious Metals",
    "种植业与林业": "Crops & Forestry",
    "软件开发": "Software",
    "游戏": "Gaming",
    "零售": "Retail",
    "IT服务": "IT Services",
    "证券": "Brokerages",
    "电池": "Batteries",
    "饮料制造": "Beverages",
    "中药": "Traditional Chinese Medicine",
    "教育": "Education",
    "农产品加工": "Agricultural Processing",
    "互联网电商": "Internet & E-commerce",
    "服装家纺": "Apparel & Home Textiles",
    "多元金融": "Diversified Financials",
    "美容护理": "Beauty & Personal Care",
    "计算机设备": "Computer Hardware",
    "化学制药": "Chemical Pharmaceuticals",
    "医药商业": "Pharma Distribution",
    "生物制品": "Biologics",
    "贸易": "Trading",
    "农化制品": "Agrochemicals",
    "煤炭开采加工": "Coal Mining",
    "化学原料": "Basic Chemicals",
    "医疗器械": "Medical Devices",
    "食品加工制造": "Food Processing",
    "养殖业": "Livestock Farming",
    "旅游及酒店": "Travel & Hotels",
    "橡胶制品": "Rubber Products",
    "化学纤维": "Chemical Fibers",
    "工业金属": "Industrial Metals",
    "小家电": "Small Appliances",
    "家居用品": "Home Furnishings",
    "厨卫电器": "Kitchen & Bath Appliances",
    "公路铁路运输": "Road & Rail Transport",
    "物流": "Logistics",
    "机场航运": "Airports & Airlines",
    "白酒": "Baijiu (Liquor)",
    "化学制品": "Chemical Products",
    "通信服务": "Telecom Services",
    "其他社会服务": "Other Consumer Services",
    "纺织制造": "Textile Manufacturing",
    "包装印刷": "Packaging & Printing",
    "钢铁": "Steel",
    "汽车服务及其他": "Auto Services",
    "综合": "Conglomerates",
    "造纸": "Paper",
    "保险": "Insurance",
    "光伏设备": "Solar Equipment",
    "环境治理": "Environmental Services",
    "汽车零部件": "Auto Parts",
    "能源金属": "Energy Metals",
    "房地产": "Real Estate",
    "电力": "Power Utilities",
    "汽车整车": "Automakers",
    "港口航运": "Ports & Shipping",
    "建筑材料": "Building Materials",
    "建筑装饰": "Construction & Decoration",
    "黑色家电": "TVs & AV Appliances",
    "轨交设备": "Rail Equipment",
    "工程机械": "Construction Machinery",
    "小金属": "Minor Metals",
    "环保设备": "Environmental Equipment",
    "电网设备": "Grid Equipment",
    "石油加工贸易": "Oil Refining & Trading",
    "专用设备": "Specialized Equipment",
    "通用设备": "General Machinery",
    "通信设备": "Telecom Equipment",
    "金属新材料": "Advanced Metal Materials",
    "自动化设备": "Automation Equipment",
    "油气开采及服务": "Oil & Gas E&P and Services",
    "塑料制品": "Plastics",
    "消费电子": "Consumer Electronics",
    "非金属材料": "Non-metallic Materials",
    "光学光电子": "Optics & Optoelectronics",
    "军工电子": "Defense Electronics",
    "燃气": "Gas Utilities",
    "军工装备": "Defense Equipment",
    "其他电源设备": "Other Power Equipment",
    "半导体": "Semiconductors",
    "其他电子": "Other Electronics",
    "电子化学品": "Electronic Chemicals",
    "风电设备": "Wind Power Equipment",
    "元件": "Electronic Components",
    "银行": "Banks",
    "酿酒行业": "Liquor",
    "医疗服务": "Healthcare Services",
    "电子元件": "Electronic Components",
    "房地产开发": "Property Development",
    "房地产服务": "Property Services",
    "有色金属": "Non-ferrous Metals",
    "煤炭行业": "Coal",
    "石油行业": "Oil",
    "航运港口": "Shipping & Ports",
    "航空机场": "Airlines & Airports",
    "物流行业": "Logistics",
    "交运设备": "Transport Equipment",
    "船舶制造": "Shipbuilding",
    "航天航空": "Aerospace",
    "电力行业": "Power Utilities",
    "公用事业": "Utilities",
    "水泥建材": "Cement & Building Materials",
    "装修建材": "Decoration Materials",
    "工程建设": "Engineering & Construction",
    "工程咨询服务": "Engineering Consulting",
    "家电行业": "Home Appliances",
    "食品饮料": "Food & Beverage",
    "纺织服装": "Textiles & Apparel",
    "商业百货": "Department Stores",
    "旅游酒店": "Travel & Hotels",
    "互联网服务": "Internet Services",
    "通信行业": "Telecom",
    "钢铁行业": "Steel",
    "农牧饲渔": "Agriculture & Fisheries",
    "农药兽药": "Pesticides & Veterinary Drugs",
    "化肥行业": "Fertilizers",
    "化纤行业": "Chemical Fibers",
    "玻璃玻纤": "Glass & Fiberglass",
    "造纸印刷": "Paper & Printing",
    "包装材料": "Packaging Materials",
    "环保行业": "Environmental Protection",
    "电机": "Electric Motors",
    "电源设备": "Power Equipment",
    "仪器仪表": "Instruments",
    "汽车服务": "Auto Services",
    "贸易行业": "Trading",
    "家用轻工": "Household Light Industry",
    "珠宝首饰": "Jewelry",
    "综合行业": "Conglomerates",
    "采掘行业": "Mining",
    "专业服务": "Professional Services",
    "铁路公路": "Rail & Road",
    "航天军工": "Aerospace & Defense",
    "船舶": "Shipbuilding"
}


def _with_english(data: dict) -> dict:
    for sec in data.get("sectors") or []:
        sec["name_en"] = CN_SECTOR_EN.get(sec.get("name_zh") or sec.get("name"), sec.get("name_en"))
    return data


# ── CN sector fetch ───────────────────────────────────────────────────────────

def _fetch_cn_board_hist(row) -> dict | None:
    """Fetch 25-day history for one CN industry board."""
    try:
        import akshare as ak
        name = str(row["板块名称"])
        today_pct = _safe_float(row.get("涨跌幅", 0))
        today_vol  = _safe_float(row.get("成交额", 0))   # 亿元
        leader     = str(row.get("领涨股票", ""))

        end_date   = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=40)).strftime("%Y%m%d")

        hist = ak.stock_board_industry_hist_em(
            symbol=name, period="日k",
            start_date=start_date, end_date=end_date, adjust=""
        )
        if hist is None or hist.empty:
            return {
                "name": name, "name_zh": name, "name_en": name,
                "today_pct": today_pct, "pct_5d": 0.0, "pct_20d": 0.0,
                "vol_ratio": 1.0, "leader": leader,
            }

        # Columns: 日期 开盘 收盘 最高 最低 涨跌幅 涨跌额 成交量 成交额 振幅 换手率
        close = pd.to_numeric(hist["收盘"], errors="coerce").dropna()
        vol   = pd.to_numeric(hist["成交额"], errors="coerce").dropna()

        pct_5d  = _pct_change_n(close, 5)
        pct_20d = _pct_change_n(close, 20)

        # Volume ratio: today vs 20d average
        vol_ratio = 1.0
        if len(vol) >= 21:
            avg20 = vol.iloc[-21:-1].mean()
            if avg20 > 0:
                vol_ratio = round(float(vol.iloc[-1]) / float(avg20), 2)

        return {
            "name":       name,
            "name_zh":    name,
            "name_en":    name,
            "today_pct":  today_pct,
            "pct_5d":     pct_5d,
            "pct_20d":    pct_20d,
            "vol_ratio":  vol_ratio,
            "leader":     leader,
        }
    except Exception as e:
        logger.warning("CN board hist failed for %s: %s", row.get("板块名称", "?"), e)
        return None


def _fetch_ths_board(row) -> dict | None:
    """One Tonghuashun industry board: today's move from the summary row, 5d/20d/volume ratio from its index history."""
    try:
        import akshare as ak
        name = str(row["板块"])
        today_pct = _safe_float(row.get("涨跌幅", 0))
        leader = str(row.get("领涨股", ""))
        base = {"name": name, "name_zh": name, "name_en": name, "today_pct": today_pct,
                "pct_5d": 0.0, "pct_20d": 0.0, "vol_ratio": 1.0, "leader": leader}
        # 10jqka drops connections (SSL EOF) under bursts: one retry after a short pause
        for attempt in range(2):
            try:
                with V8_LOCK:      # its hexin-v cookie is computed in mini_racer
                    hist = ak.stock_board_industry_index_ths(
                        symbol=name,
                        start_date=(datetime.now() - timedelta(days=45)).strftime("%Y%m%d"),
                        end_date=datetime.now().strftime("%Y%m%d"),
                    )
                break
            except Exception:
                if attempt:
                    raise
                time.sleep(1.5)
        if hist is None or hist.empty:
            return base
        close = pd.to_numeric(hist["收盘价"], errors="coerce").dropna()
        vol = pd.to_numeric(hist["成交额"], errors="coerce").dropna()
        base["pct_5d"] = _pct_change_n(close, 5)
        base["pct_20d"] = _pct_change_n(close, 20)
        if len(vol) >= 21:
            avg20 = vol.iloc[-21:-1].mean()
            if avg20 > 0:
                base["vol_ratio"] = round(float(vol.iloc[-1]) / float(avg20), 2)
        return base
    except Exception as e:
        logger.warning("THS board failed for %s: %s", row.get("板块", "?"), e)
        return None


def _build_cn_ths() -> dict:
    import akshare as ak
    with V8_LOCK:
        rows = ak.stock_board_industry_summary_ths().to_dict("records")
    sectors = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(_fetch_ths_board, rows):
            if res:
                sectors.append(res)
    if not sectors:
        raise RuntimeError("no THS sector data")
    sectors.sort(key=lambda x: x["today_pct"], reverse=True)
    return {"market": "cn", "date": datetime.now().strftime("%Y-%m-%d"), "sectors": sectors}


def _build_cn() -> dict:
    """Tonghuashun first (Eastmoney connections are dropped from the server), Eastmoney as the fallback."""
    try:
        return _with_english(_build_cn_ths())
    except Exception as e:
        logger.warning("THS sector build failed (%s); trying Eastmoney", e)
    return _with_english(_build_cn_em())


def _build_cn_em() -> dict:
    import akshare as ak

    # Step 1: get all boards with today data
    df = ak.stock_board_industry_name_em()
    rows = df.to_dict("records")

    # Step 2: fetch hist in parallel (max 8 threads to avoid throttling)
    sectors = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_fetch_cn_board_hist, row): row for row in rows}
        for fut in as_completed(futures):
            result = fut.result()
            if result:
                sectors.append(result)

    sectors.sort(key=lambda x: x["today_pct"], reverse=True)
    return {
        "market": "cn",
        "date":   datetime.now().strftime("%Y-%m-%d"),
        "sectors": sectors,
    }


# ── US sector fetch ───────────────────────────────────────────────────────────

def _build_us() -> dict:
    """11 SPDR sector ETFs from Tencent's kline feed (yfinance is rate limited from the server)."""
    from routers.us_stocks import _tencent_history

    def one(sym: str):
        candles = _tencent_history(sym, 90)
        if len(candles) < 21:                       # one retry: the feed occasionally drops a request
            candles = _tencent_history(sym, 90)
        close = pd.Series([c["close"] for c in candles], dtype=float)
        vol = pd.Series([c["volume"] for c in candles], dtype=float)
        if len(close) < 21:
            raise ValueError("not enough history")
        vol_ratio = 1.0
        avg20 = vol.iloc[-21:-1].mean()
        if avg20 > 0:
            vol_ratio = round(float(vol.iloc[-1]) / float(avg20), 2)
        return {
            "name":      sym,
            "name_zh":   _US_ETFS[sym]["name_zh"],
            "name_en":   _US_ETFS[sym]["name_en"],
            "today_pct": _pct_change_n(close, 1),
            "pct_5d":    _pct_change_n(close, 5),
            "pct_20d":   _pct_change_n(close, 20),
            "vol_ratio": vol_ratio,
            "leader":    sym,
        }

    sectors = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(one, sym): sym for sym in _US_ETFS}
        for fut in as_completed(futures):
            try:
                sectors.append(fut.result())
            except Exception as e:
                logger.warning("US ETF %s failed: %s", futures[fut], e)
    if not sectors:
        raise RuntimeError("no US sector data")

    sectors.sort(key=lambda x: x["today_pct"], reverse=True)
    return {
        "market": "us",
        "date":   datetime.now().strftime("%Y-%m-%d"),
        "sectors": sectors,
    }


# ── endpoint ──────────────────────────────────────────────────────────────────

@router.get("/rotation")
def sector_rotation(market: str = Query("cn", pattern="^(cn|us)$")):
    global _cn_ts, _cn_data, _us_ts, _us_data

    now = time.time()

    if market == "cn":
        # Built only by the warm-up thread (about a minute through V8_LOCK): a request that built it
        # too would wait that long and stack up behind the others. Serve the latest copy, even stale.
        if _cn_data is not None:
            return _cn_data
        return {"market": "cn", "date": "", "sectors": [], "pending": True,
                "error": "Sector data is being prepared, try again in a minute"}

    else:  # us
        if _us_data is not None and now - _us_ts < _CACHE_TTL:
            return _us_data
        try:
            _us_data = _build_us()
            _us_ts   = now
        except Exception as e:
            logger.error("US sector rotation failed: %s", e)
            if _us_data:
                return _us_data
            return {"market": "us", "date": "", "sectors": [], "error": str(e)}
        return _us_data


_CN_DISK = os.path.join(os.path.dirname(__file__), "..", "data", "sector_rotation_cn.cache.json")


def _load_cn_disk() -> None:
    """After a restart, serve the last build at once instead of nothing for a minute."""
    global _cn_ts, _cn_data
    try:
        with open(_CN_DISK, encoding="utf-8") as f:
            _cn_data = json.load(f)
        _cn_ts = os.path.getmtime(_CN_DISK)
    except Exception:
        pass


def _warm_cn_loop():
    """The CN build takes about a minute (90 boards, one at a time through V8_LOCK); keep it hot so users never wait for it."""
    global _cn_ts, _cn_data
    _load_cn_disk()
    while True:
        try:
            data = _build_cn()
            _cn_data, _cn_ts = data, time.time()
            try:
                tmp = _CN_DISK + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)
                os.replace(tmp, _CN_DISK)
            except Exception as e:
                logger.warning("sector rotation cache write failed: %s", e)
        except Exception as e:
            logger.warning("CN sector warm-up failed: %s", e)
        time.sleep(_CACHE_TTL - 300)


import threading as _threading
_threading.Thread(target=_warm_cn_loop, daemon=True, name="sectors-cn-warm").start()
