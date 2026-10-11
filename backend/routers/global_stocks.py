"""
Hong Kong and Japanese stocks: /api/hk/... and /api/jp/...

Same response shapes as the US endpoints (/api/us/stock/{sym}, /realtime, /search), so the
frontend treats them like US stocks with a different URL prefix.

Sources (all reachable from the server, no keys):
  - Universe: the exchanges' own lists (HKEX ListOfSecurities in English and Chinese,
    JPX data_j/data_e), refreshed daily; Tencent batch quotes add simplified Chinese names
    (HK), market caps (ranking) and board lots.
  - Quotes: Tencent qt.gtimg.cn (r_hk00700 realtime, jp7203).
  - History: HK from Tencent's hkfqkline (forward-adjusted). Tencent has no Japanese history,
    so JP daily bars come from the FT markets chart API (symbol "7203:TYO" resolved to its xid).
"""
import io
import json
import logging
import os
import re
import threading
import time
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import requests
from fastapi import APIRouter, HTTPException, Query

from routers.us_stocks import _compute_ma, _compute_macd, _compute_rsi, _safe, _fmt_date

logger = logging.getLogger(__name__)

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
_UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/140 Safari/537.36"}

MARKETS = ("hk", "jp")
CURRENCY = {"hk": "HKD", "jp": "JPY"}

# Popular names, shown before the universe has loaded and used to break search ties.
# Chinese names for Japanese companies: people search 丰田/索尼, not トヨタ.
HOT = {
    "hk": ["00700", "09988", "03690", "01810", "00005", "00941", "01299", "02318", "09618",
           "01024", "00388", "02800", "00883", "01211", "09999", "00981", "02015", "09888",
           "00939", "01398", "06618", "02020", "00175", "09868"],
    "jp": ["7203", "6758", "9984", "7974", "8306", "6861", "9983", "8035", "6501", "7267",
           "4063", "6098", "9432", "8058", "6857", "7011", "4519", "8001", "6367", "4502",
           "6954", "7741", "6902", "8766", "9433", "6594", "2914", "7751", "4661", "6273"],
}
JP_ZH = {
    "7203": "丰田汽车", "6758": "索尼", "9984": "软银集团", "7974": "任天堂", "8306": "三菱日联金融",
    "6861": "基恩士", "9983": "迅销（优衣库）", "8035": "东京电子", "6501": "日立", "7267": "本田",
    "4063": "信越化学", "6098": "Recruit", "9432": "日本电信电话（NTT）", "8058": "三菱商事",
    "6857": "爱德万测试", "7011": "三菱重工", "4519": "中外制药", "8001": "伊藤忠商事", "6367": "大金工业",
    "4502": "武田药品", "6954": "发那科", "7741": "豪雅", "6902": "电装", "8766": "东京海上",
    "9433": "KDDI", "6594": "日本电产（尼得科）", "2914": "日本烟草", "7751": "佳能", "4661": "东方乐园",
    "6273": "SMC", "7201": "日产汽车", "7270": "斯巴鲁", "7269": "铃木", "6752": "松下", "6753": "夏普",
    "6971": "京瓷", "6762": "TDK", "6981": "村田制作所", "8316": "三井住友金融", "8411": "瑞穗金融",
    "8031": "三井物产", "9020": "JR东日本", "9022": "JR东海", "4911": "资生堂", "2502": "朝日啤酒",
    "2503": "麒麟", "3382": "7&i控股", "9201": "日本航空", "9202": "全日空", "6178": "日本邮政",
    "4755": "乐天", "3659": "Nexon", "9766": "科乐美", "9697": "卡普空", "7832": "万代南梦宫",
    "4689": "LY（雅虎日本）", "6723": "瑞萨电子", "5108": "普利司通", "7733": "奥林巴斯", "6503": "三菱电机",
}

# HKEX short names ("BABA-W", "MEITUAN-W") are not what people type
HK_EN = {
    "00700": "Tencent", "09988": "Alibaba", "03690": "Meituan", "01810": "Xiaomi", "00005": "HSBC",
    "09618": "JD.com", "09999": "NetEase", "09888": "Baidu", "01024": "Kuaishou", "02318": "Ping An Insurance",
    "00941": "China Mobile", "01211": "BYD", "02015": "Li Auto", "09868": "XPeng", "09866": "NIO",
    "00388": "Hong Kong Exchanges (HKEX)", "01299": "AIA", "00883": "CNOOC", "00981": "SMIC", "06618": "JD Health",
    "02020": "Anta Sports", "00175": "Geely Auto", "00939": "China Construction Bank", "01398": "ICBC",
    "03988": "Bank of China", "02800": "Tracker Fund of Hong Kong", "00016": "Sun Hung Kai Properties",
    "00001": "CK Hutchison", "00027": "Galaxy Entertainment", "01928": "Sands China", "02269": "WuXi Biologics",
    "06862": "Haidilao", "09633": "Nongfu Spring", "00291": "China Resources Beer", "02331": "Li Ning",
    "06690": "Haier Smart Home", "01093": "CSPC Pharmaceutical", "02382": "Sunny Optical", "00268": "Kingdee",
    "09961": "Trip.com", "09626": "Bilibili", "02057": "ZTO Express", "00002": "CLP Holdings",
    "00003": "HK and China Gas", "00011": "Hang Seng Bank", "00066": "MTR Corporation", "00823": "Link REIT",
    "01113": "CK Asset", "02628": "China Life", "00857": "PetroChina", "00386": "Sinopec", "02899": "Zijin Mining",
    "01088": "China Shenhua", "00762": "China Unicom", "00728": "China Telecom", "09992": "Pop Mart",
    "06160": "BeiGene", "01177": "Sino Biopharm", "00020": "SenseTime", "02013": "Weimob", "01797": "East Buy",
}

# ── Universe ─────────────────────────────────────────────────────────────────

_universe: dict = {m: [] for m in MARKETS}          # [{code, name, name_en, name_zh, name_local, lot, cap}]
_universe_ts: dict = {m: 0.0 for m in MARKETS}
_universe_lock = threading.Lock()
_UNIVERSE_TTL = 24 * 3600


def _cache_path(market: str) -> str:
    return os.path.join(_DATA_DIR, f"{market}_universe.cache.json")


def _tencent_code(market: str, code: str, realtime: bool = True) -> str:
    return (f"r_hk{code}" if realtime else f"hk{code}") if market == "hk" else f"jp{code}"


def _num(v) -> Optional[float]:
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def tencent_quotes(market: str, codes: list, timeout: float = 6) -> dict:
    """{code: parsed quote} via qt.gtimg.cn, 60 codes per request."""
    out = {}
    codes = [c for c in dict.fromkeys(codes) if c]
    for i in range(0, len(codes), 60):
        chunk = codes[i:i + 60]
        try:
            r = requests.get("https://qt.gtimg.cn/q=" + ",".join(_tencent_code(market, c) for c in chunk), timeout=timeout)
            r.encoding = "gbk"
        except Exception as e:
            logger.debug("tencent %s quotes failed: %s", market, e)
            continue
        for line in r.text.splitlines():
            if '="' not in line:
                continue
            v = line.split('"')[1].split("~")
            if len(v) < 50 or not v[2]:
                continue
            code = v[2].split(".")[0]                       # "7203.T" -> "7203"
            price, prev = _num(v[3]), _num(v[4])
            if not price:
                continue
            q = {
                "code": code, "price": price, "prev_close": prev, "open": _num(v[5]),
                "volume": _num(v[6]), "time": v[30], "change": _num(v[31]), "change_pct": _num(v[32]),
                "high": _num(v[33]), "low": _num(v[34]),
                "week52_high": _num(v[48]), "week52_low": _num(v[49]),
            }
            if market == "hk":
                q.update({"name_zh": v[1].replace(" ", ""), "name_en": v[46].strip(), "amount": _num(v[37]),
                          "pe_ratio": _num(v[39]), "dividend_yield": _num(v[47]),
                          "market_cap": (_num(v[44]) or 0) * 1e8 or None,
                          "lot": int(_num(v[60]) or 0) or None if len(v) > 60 else None})
            else:
                q.update({"name_en": v[1].strip(), "market_cap": (_num(v[45]) or 0) * 1e8 or None, "lot": 100,
                          "amount": price * (q["volume"] or 0) or None})
            out[code] = q
    return out


def _download(url: str) -> bytes:
    r = requests.get(url, headers=_UA, timeout=40)
    r.raise_for_status()
    return r.content


def _build_hk() -> list:
    base = "https://www.hkex.com.hk/{}/services/trading/securities/securitieslists/ListOfSecurities{}.xlsx"
    en = pd.read_excel(io.BytesIO(_download(base.format("eng", ""))), header=2, dtype=str)
    zh = pd.read_excel(io.BytesIO(_download(base.format("chi", "_c"))), header=2, dtype=str)
    en = en[en["Category"].isin(["Equity", "Exchange Traded Products", "Real Estate Investment Trusts"])]
    # HKD counters only: drops RMB/USD counters (80700 TENCENT-R) and US shares quoted in HK
    # (04338 MICROSOFT-T), which otherwise outrank the real listings by market cap
    en = en[(en["Trading Currency"] == "HKD") & ~en["Name of Securities"].str.strip().str.endswith("-T")]
    trad = dict(zip(zh["股份代號"], zh["股份名稱"]))
    rows = []
    for _, r in en.iterrows():
        code = str(r["Stock Code"]).strip().zfill(5)
        lot = _num(str(r.get("Board Lot", "")).replace(",", ""))
        rows.append({"code": code, "name_en": HK_EN.get(code) or str(r["Name of Securities"]).strip(),
                     "name_local": (trad.get(r["Stock Code"]) or "").strip(), "lot": int(lot) if lot else None,
                     "etf": r["Category"] != "Equity"})
    quotes = tencent_quotes("hk", [r["code"] for r in rows])
    for r in rows:
        q = quotes.get(r["code"]) or {}
        r["name_zh"] = q.get("name_zh") or r["name_local"]
        r["cap"] = q.get("market_cap") or 0
    return rows


def _build_jp() -> list:
    base = "https://www.jpx.co.jp{}/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_{}.xlsx"
    ja = pd.read_excel(io.BytesIO(_download(base.format("", "j"))), dtype=str)
    en = pd.read_excel(io.BytesIO(_download(base.format("/english", "e"))), dtype=str)
    en_name = dict(zip(en["Local Code"], en["Name (English)"]))
    en_sector = dict(zip(en["Local Code"], en["33 Sector(name)"]))
    rows = []
    for _, r in ja.iterrows():
        seg = str(r["市場・商品区分"])
        if "PRO" in seg or "出資証券" in seg:
            continue
        code = str(r["コード"]).strip()
        etf = "ETF" in seg or "REIT" in seg
        rows.append({"code": code, "name_local": str(r["銘柄名"]).strip(),
                     "name_en": str(en_name.get(r["コード"]) or "").strip(),
                     "name_zh": JP_ZH.get(code, ""), "sector": None if etf else str(en_sector.get(r["コード"]) or "") or None,
                     "lot": 100, "etf": etf})
    quotes = tencent_quotes("jp", [r["code"] for r in rows if not r["etf"]])
    for r in rows:
        r["cap"] = (quotes.get(r["code"]) or {}).get("market_cap") or 0
    return rows


def _load_universe(market: str):
    with _universe_lock:
        _load_universe_locked(market)


def _load_universe_locked(market: str):
    path = _cache_path(market)
    try:
        if os.path.exists(path) and time.time() - os.path.getmtime(path) < _UNIVERSE_TTL:
            with open(path, encoding="utf-8") as f:
                _universe[market] = json.load(f)
            _universe_ts[market] = os.path.getmtime(path)
            return
    except Exception as e:
        logger.warning("%s universe cache unreadable: %s", market, e)
    if not _universe[market] and os.path.exists(path):
        try:        # serve yesterday's list while today's is built (~1 min)
            with open(path, encoding="utf-8") as f:
                _universe[market] = json.load(f)
        except Exception:
            pass
    try:
        rows = _build_hk() if market == "hk" else _build_jp()
        if len(rows) > 500:
            _universe[market], _universe_ts[market] = rows, time.time()
            os.makedirs(_DATA_DIR, exist_ok=True)
            tmp = f"{path}.{os.getpid()}.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(rows, f, ensure_ascii=False)
            os.replace(tmp, path)
            logger.info("%s universe: %d securities", market, len(rows))
    except Exception as e:
        logger.warning("%s universe build failed: %s", market, e)


def _universe_loop():
    while True:
        for m in MARKETS:
            if time.time() - _universe_ts[m] >= _UNIVERSE_TTL:
                _load_universe(m)
        time.sleep(3600)


threading.Thread(target=_universe_loop, daemon=True, name="global-universe").start()


def normalize_code(market: str, symbol: str) -> str:
    s = symbol.strip().upper()
    s = re.sub(r"\.(HK|T|JP)$", "", s)
    s = re.sub(r"^(HK|JP)", "", s)
    if market == "hk":
        if not s.isdigit() or len(s) > 5:
            raise HTTPException(404, "Unknown symbol")
        return s.zfill(5)
    if not re.fullmatch(r"\d{4}|\d{3}[A-Z]", s):        # 7203, and the newer alphanumeric codes like 285A
        raise HTTPException(404, "Unknown symbol")
    return s


def _find(market: str, code: str) -> dict:
    for r in _universe[market]:
        if r["code"] == code:
            return r
    return {}


# ── History ──────────────────────────────────────────────────────────────────

_hist_cache: dict = {}            # (market, code) -> (ts, [candles])
_HIST_TTL = 15 * 60
_ft_xid: dict = {}
_FT_XID_PATH = os.path.join(_DATA_DIR, "ft_xid.cache.json")
try:
    with open(_FT_XID_PATH, encoding="utf-8") as _f:
        _ft_xid = json.load(_f)
except Exception:
    pass


def _ft_xid_for(code: str) -> Optional[str]:
    if code in _ft_xid:
        return _ft_xid[code]
    r = requests.get("https://markets.ft.com/data/searchapi/searchsecurities", params={"query": code},
                     headers=_UA, timeout=8)
    xid = next((s.get("xid") for s in (r.json().get("data") or {}).get("security") or []
                if s.get("symbol") == f"{code}:TYO"), None)
    if xid:
        _ft_xid[code] = xid
        try:
            with open(_FT_XID_PATH, "w", encoding="utf-8") as f:
                json.dump(_ft_xid, f)
        except Exception:
            pass
    return xid


def _hk_history(code: str, days: int) -> list:
    n = min(int(days * 0.7) + 30, 2000)
    r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get",
                     params={"param": f"hk{code},day,,,{n},qfq"}, timeout=10)
    node = ((r.json().get("data") or {}).get(f"hk{code}") or {})
    rows = node.get("qfqday") or node.get("day") or []
    # Tencent order: date, open, close, high, low, volume
    return [{"date": x[0], "open": float(x[1]), "close": float(x[2]), "high": float(x[3]),
             "low": float(x[4]), "volume": float(x[5])} for x in rows if len(x) >= 6]


def _jp_history(code: str, days: int) -> list:
    xid = _ft_xid_for(code)
    if not xid:
        return []
    body = {"days": days, "dataNormalized": False, "dataPeriod": "Day", "dataInterval": 1, "realtime": False,
            "yFormat": "0.###", "timeServiceFormat": "JSON", "returnDateType": "ISO8601",
            "elements": [{"Type": "price", "Symbol": xid}, {"Type": "volume", "Symbol": xid}]}
    r = requests.post("https://markets.ft.com/data/chartapi/series", json=body, headers=_UA, timeout=12)
    d = r.json()
    dates = [s[:10] for s in d.get("Dates") or []]
    series = {}
    for el in d.get("Elements") or []:
        for comp in el.get("ComponentSeries") or []:
            series[comp["Type"]] = comp["Values"]
    if not dates or "Close" not in series:
        return []
    out = []
    for i, day in enumerate(dates):
        c = series["Close"][i]
        if c is None:
            continue
        out.append({"date": day, "open": series.get("Open", [c] * len(dates))[i] or c,
                    "high": series.get("High", [c] * len(dates))[i] or c,
                    "low": series.get("Low", [c] * len(dates))[i] or c, "close": c,
                    "volume": (series.get("Volume") or [0] * len(dates))[i] or 0})
    return out


def history(market: str, code: str, days: int = 1100) -> list:
    """Daily candles, oldest first; today's bar is patched from the live quote when the feed lags."""
    key = (market, code)
    hit = _hist_cache.get(key)
    if hit and time.time() - hit[0] < _HIST_TTL:
        return hit[1]
    try:
        candles = _hk_history(code, days) if market == "hk" else _jp_history(code, days)
    except Exception as e:
        logger.warning("%s history %s failed: %s", market, code, e)
        candles = []
    if not candles:
        return hit[1] if hit else []
    q = tencent_quotes(market, [code]).get(code)
    if q and q.get("time"):
        qd = q["time"][:10].replace("/", "-")
        if qd > candles[-1]["date"] and q.get("open"):
            candles.append({"date": qd, "open": q["open"], "high": q["high"] or q["price"],
                            "low": q["low"] or q["price"], "close": q["price"], "volume": q["volume"] or 0})
        elif qd == candles[-1]["date"]:
            candles[-1]["close"] = q["price"]
    _hist_cache[key] = (time.time(), candles)
    return candles


def _resample(candles: list, period: str) -> list:
    if period not in ("weekly", "monthly"):
        return candles
    df = pd.DataFrame(candles)
    df["date"] = pd.to_datetime(df["date"])
    g = df.set_index("date").resample("W-FRI" if period == "weekly" else "ME")
    out = pd.DataFrame({"open": g["open"].first(), "high": g["high"].max(), "low": g["low"].min(),
                        "close": g["close"].last(), "volume": g["volume"].sum(),
                        "last": g["close"].apply(lambda s: s.index.max() if len(s) else pd.NaT)}).dropna()
    return [{"date": r["last"].strftime("%Y-%m-%d"), "open": r["open"], "high": r["high"], "low": r["low"],
             "close": r["close"], "volume": r["volume"]} for _, r in out.iterrows()]


# ── Routes ───────────────────────────────────────────────────────────────────

def _display_name(market: str, row: dict, q: dict | None = None) -> str:
    q = q or {}
    if market == "hk":
        return q.get("name_zh") or row.get("name_zh") or row.get("name_local") or row.get("name_en") or ""
    return row.get("name_local") or q.get("name_en") or row.get("name_en") or ""


def _name_en(market: str, code: str, row: dict, q: dict | None) -> str:
    return (HK_EN.get(code) if market == "hk" else None) or row.get("name_en") or (q or {}).get("name_en") or ""


def make_router(market: str) -> APIRouter:
    router = APIRouter()

    @router.get("/stock/{symbol}/realtime")
    def realtime(symbol: str):
        code = normalize_code(market, symbol)
        q = tencent_quotes(market, [code]).get(code)
        if not q:
            raise HTTPException(404, "Unknown symbol")
        row = _find(market, code)
        return {
            "symbol": code, "market": market, "currency": CURRENCY[market],
            "name": _display_name(market, row, q), "name_en": _name_en(market, code, row, q),
            "name_zh": (q.get("name_zh") or row.get("name_zh")) if market == "hk" else (row.get("name_zh") or None),
            "name_local": row.get("name_local"), "sector": row.get("sector"),
            "lot_size": row.get("lot") or q.get("lot"),
            **{k: q.get(k) for k in ("price", "change", "change_pct", "prev_close", "open", "high", "low",
                                      "volume", "amount", "market_cap", "pe_ratio", "dividend_yield",
                                      "week52_high", "week52_low", "time")},
        }

    @router.get("/stock/{symbol}/history")
    def stock_history(symbol: str, count: int = Query(250, ge=1, le=1000)):
        """Latest `count` daily candles, the shape of /api/us/stock/{sym}/history (phone UI, iOS)."""
        code = normalize_code(market, symbol)
        daily = history(market, code)
        if not daily:
            raise HTTPException(404, f"No data found for {code}")
        return {"symbol": code, "market": market, "currency": CURRENCY[market], "data": daily[-count:]}

    @router.get("/stock/{symbol}")
    def stock(symbol: str, period: str = "daily", start_date: Optional[str] = None, end_date: Optional[str] = None):
        code = normalize_code(market, symbol)
        daily = history(market, code)
        if not daily:
            raise HTTPException(404, f"No data found for {code}")
        allc = _resample(daily, period)
        start = _fmt_date(start_date) or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        end = _fmt_date(end_date) or datetime.now().strftime("%Y-%m-%d")
        # Indicators run over the whole history so the first bars in the window are warmed up
        closes = pd.Series([c["close"] for c in allc], dtype=float)
        ma, (dif, dea, hist_), rsi = _compute_ma(closes), _compute_macd(closes), _compute_rsi(closes)
        pct = closes.pct_change() * 100
        idx = [i for i, c in enumerate(allc) if start <= c["date"] <= end]
        if not idx:
            raise HTTPException(404, f"No data in range for {code}")
        candles = [{"date": allc[i]["date"], "open": allc[i]["open"], "high": allc[i]["high"], "low": allc[i]["low"],
                    "close": allc[i]["close"], "volume": allc[i]["volume"],
                    "amount": round(allc[i]["close"] * allc[i]["volume"], 2) if allc[i]["volume"] else None,
                    "pct_change": _safe(pct.iloc[i]), "turnover": 0} for i in idx]
        row = _find(market, code)
        return {
            "symbol": code, "market": market, "currency": CURRENCY[market],
            "name": _display_name(market, row) or code,
            "candles": candles,
            "ma": [{"date": allc[i]["date"], **{k: _safe(ma[k].iloc[i]) for k in ("ma5", "ma10", "ma20", "ma60")}} for i in idx],
            "macd": [{"date": allc[i]["date"], "dif": _safe(dif.iloc[i]), "dea": _safe(dea.iloc[i]),
                      "macd": _safe(hist_.iloc[i])} for i in idx],
            "rsi": [{"date": allc[i]["date"], **{k: _safe(rsi[k].iloc[i]) for k in ("rsi6", "rsi12", "rsi24")}} for i in idx],
        }

    @router.get("/search")
    def search(q: str = Query(..., min_length=1, max_length=40)):
        term = q.strip()
        t_up, t_low = term.upper(), term.lower()
        digits = re.sub(r"\D", "", term)
        hot = {c: i for i, c in enumerate(HOT[market])}
        scored = []
        rows = _universe[market] or [{"code": c, "name_zh": JP_ZH.get(c, "") if market == "jp" else "",
                                      "name_en": "", "name_local": "", "cap": 0} for c in HOT[market]]
        for r in rows:
            code = r["code"]
            names = [r.get("name_zh") or "", r.get("name_local") or "", r.get("name_en") or "",
                     (HK_EN.get(code, "") if market == "hk" else "")]
            bare = code.lstrip("0") if market == "hk" else code        # HK: "700" means 00700
            if code == t_up or (digits and digits == term and bare == digits.lstrip("0")):
                s = 0
            elif digits and digits == term and len(digits) >= 2 and (code.startswith(digits) or bare.startswith(digits.lstrip("0"))):
                s = 2
            elif any(n and n.lower().startswith(t_low) for n in names):
                s = 3
            elif len(term) >= 2 and any(t_low in n.lower() for n in names if n):
                s = 4
            else:
                continue
            scored.append((s, hot.get(code, 999), -(r.get("cap") or 0), r))
        scored.sort(key=lambda x: x[:3])
        top = [x[3] for x in scored[:12]]
        quotes = tencent_quotes(market, [r["code"] for r in top]) if top else {}
        out = []
        for r in top:
            qt = quotes.get(r["code"]) or {}
            out.append({"symbol": r["code"], "market": market, "name": _display_name(market, r, qt),
                        "name_en": _name_en(market, r["code"], r, qt),
                        "name_zh": (qt.get("name_zh") or r.get("name_zh")) if market == "hk" else (r.get("name_zh") or ""),
                        "price": qt.get("price"), "change_pct": qt.get("change_pct"), "etf": bool(r.get("etf"))})
        return out

    @router.get("/hot")
    def hot():
        codes = HOT[market][:16]
        quotes = tencent_quotes(market, codes)
        out = []
        for c in codes:
            q = quotes.get(c)
            if not q:
                continue
            row = _find(market, c) or {"name_zh": JP_ZH.get(c, "")}
            out.append({"symbol": c, "market": market, "name": _display_name(market, row, q),
                        "name_en": _name_en(market, c, row, q),
                        "name_zh": (q.get("name_zh") or row.get("name_zh")) if market == "hk" else (row.get("name_zh") or ""),
                        "price": q["price"], "change_pct": q.get("change_pct"), "market_cap": q.get("market_cap")})
        return out

    @router.get("/overview")
    def overview():
        """Index levels and the popular names, for the market's landing panel."""
        indices = []
        if market == "hk":
            try:
                r = requests.get("https://qt.gtimg.cn/q=r_hkHSI,r_hkHSTECH,r_hkHSCEI", timeout=6)
                r.encoding = "gbk"
                names_en = {"HSI": "Hang Seng Index", "HSTECH": "Hang Seng TECH", "HSCEI": "HS China Enterprises"}
                for line in r.text.splitlines():
                    if '="' not in line:
                        continue
                    v = line.split('"')[1].split("~")
                    if len(v) > 32 and _num(v[3]):
                        indices.append({"symbol": v[2], "name_zh": v[1], "name_en": names_en.get(v[2], v[2]),
                                        "price": _num(v[3]), "change": _num(v[31]), "change_pct": _num(v[32])})
            except Exception as e:
                logger.debug("hk indices failed: %s", e)
        else:
            try:
                from routers import market as _mk
                for i in (_mk._sentiment_data or {}).get("indices") or []:
                    if i.get("symbol") == "^N225":
                        indices.append({"symbol": "N225", "name_zh": "日经225", "name_en": "Nikkei 225",
                                        "price": i.get("close"), "change_pct": i.get("change_pct")})
            except Exception as e:
                logger.debug("jp indices failed: %s", e)
        return {"market": market, "currency": CURRENCY[market], "indices": indices, "hot": hot()}

    return router


hk_router = make_router("hk")
jp_router = make_router("jp")
