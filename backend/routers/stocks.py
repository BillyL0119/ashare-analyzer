from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import time
import requests as _req
import akshare as ak

from models.schemas import (
    StockInfo,
    StockHistoryResponse,
    Candle,
    MAIndicator,
    MACDData,
    RSIData,
    RealtimeQuote,
)
from services.stock_service import (
    search_stocks,
    get_stock_history,
    get_stock_name,
    get_realtime_quote,
)
from services.indicator_service import calc_all_indicators
from services.analysis_service import analyze_pair
from services.risk_service import analyze_risk
from services.regime_service import detect_regimes
from services.factor_service import analyze_factors

router = APIRouter()

# ── Hot stocks cache ──────────────────────────────────────────────────────────
_HOT_TTL = 1800  # 30 min
_hot_cn_ts: float = 0
_hot_cn_data: list | None = None
_hot_us_ts: float = 0
_hot_us_data: list | None = None

_SINA_HDRS = {"Referer": "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0"}

_US_HOT = [
    ("AAPL", "Apple"), ("NVDA", "NVIDIA"), ("TSLA", "Tesla"),
    ("MSFT", "Microsoft"), ("GOOGL", "Alphabet"), ("META", "Meta"),
    ("AMZN", "Amazon"), ("AMD", "AMD"), ("TSM", "TSMC"), ("NFLX", "Netflix"),
]


def _us_pct_tencent(symbols: list) -> dict:
    """US day change % from qt.gtimg.cn (one fast request)."""
    r = _req.get("https://qt.gtimg.cn/q=" + ",".join("us" + s for s in symbols), timeout=6)
    out: dict = {}
    for chunk in r.content.decode("gbk", errors="ignore").split(";"):
        _, _, val = chunk.partition("=")
        f = val.strip().strip('"').split("~")
        if len(f) < 33:
            continue
        try:
            out[f[2].split(".")[0]] = round(float(f[32]), 2)
        except ValueError:
            pass
    return out


def _cn_hot_from_spot() -> list:
    """Fallback when eastmoney's hot-rank is down: most active A-shares by turnover."""
    import pandas as pd
    from routers.market import _get_spot_df
    df = _get_spot_df()
    if df is None:
        return []
    df = df.copy()
    df["成交额"] = pd.to_numeric(df["成交额"], errors="coerce")
    df["涨跌幅"] = pd.to_numeric(df["涨跌幅"], errors="coerce")
    df = df.dropna(subset=["成交额"]).sort_values("成交额", ascending=False).head(20)
    out = []
    for i, (_, row) in enumerate(df.iterrows()):
        pct = row["涨跌幅"]
        out.append({
            "code": _cn_code(str(row["代码"])),
            "name": str(row["名称"]),
            "change_pct": None if pd.isna(pct) else round(float(pct), 2),
            "rank": i + 1,
            "market": "cn",
        })
    return out


def _cn_code(raw: str) -> str:
    """Strip exchange prefix: SZ000725 -> 000725."""
    if len(raw) > 6 and raw[:2].upper() in ("SH", "SZ", "BJ"):
        return raw[2:]
    return raw


def _sina_sym(code: str) -> str:
    c = code.strip().lower()
    if c.startswith(("sh", "sz", "bj")):
        return c
    if c[:1] in ("6", "9"):
        return f"sh{c}"
    if c[:1] in ("4", "8"):
        return f"bj{c}"
    return f"sz{c}"


def _fetch_pct_batch(codes: list) -> dict:
    """Batch-fetch change_pct for A-share codes via Sina HQ API (single request)."""
    if not codes:
        return {}
    try:
        syms = ",".join(_sina_sym(c) for c in codes)
        r = _req.get(f"http://hq.sinajs.cn/list={syms}", headers=_SINA_HDRS, timeout=4)
        r.encoding = "gbk"
        out: dict = {}
        for line in r.text.splitlines():
            if '="' not in line:
                continue
            key = line.split('"')[0].split("_")[-1]   # e.g. sh600519
            code = key[2:] if len(key) > 2 else key
            vals = line.split('"')[1].split(",")
            if len(vals) > 3:
                try:
                    yest = float(vals[2])
                    cur  = float(vals[3])
                    if yest > 0 and cur > 0:
                        out[code] = round((cur - yest) / yest * 100, 2)
                except Exception:
                    pass
        return out
    except Exception:
        return {}


@router.get("/search")
def search(q: str = Query(..., min_length=1)):
    """Search A-share stocks; returns code/name/change_pct."""
    results = search_stocks(q)[:20]
    codes = [s["code"] for s in results[:8]]
    pct_map = _fetch_pct_batch(codes)
    return [
        {"code": s["code"], "name": s["name"],
         "change_pct": pct_map.get(s["code"]), "market": "cn"}
        for s in results
    ]


@router.get("/hot")
def hot_stocks(market: str = Query("cn", pattern="^(cn|us)$")):
    """Return hot/trending stocks. Cached 30 min."""
    global _hot_cn_ts, _hot_cn_data, _hot_us_ts, _hot_us_data
    now = time.time()

    if market == "cn":
        if _hot_cn_data is not None and now - _hot_cn_ts < _HOT_TTL:
            return _hot_cn_data
        try:
            df = ak.stock_hot_rank_em()
            result = []
            for _, row in df.head(20).iterrows():
                code = _cn_code(str(row.get("代码", "")))
                try:
                    pct = round(float(row.get("涨跌幅", 0)), 2)
                except Exception:
                    pct = None
                result.append({
                    "code": code,
                    "name": str(row.get("股票名称", "")),
                    "change_pct": pct,
                    "rank": int(row.get("当前排名", 0)),
                    "market": "cn",
                })
            _hot_cn_data = result
            _hot_cn_ts = now
            return result
        except Exception:
            if _hot_cn_data:
                return _hot_cn_data
            fallback = _cn_hot_from_spot()
            # cache briefly so a dead upstream isn't hammered on every request
            _hot_cn_data = fallback
            _hot_cn_ts = now - (_HOT_TTL - (120 if fallback else 20))
            return fallback

    else:  # us
        try:
            from routers.us_market import _cached, _ttl, _build_overview
            data = _cached("overview", _ttl(), _build_overview)
            active = data.get("active_20") or data.get("active") or []
            if active:
                return [{"code": q["symbol"], "name": q["name"], "change_pct": q["pct"], "rank": i + 1, "market": "us"}
                        for i, q in enumerate(active[:20])]
        except Exception:
            pass
        if _hot_us_data is not None and now - _hot_us_ts < _HOT_TTL:
            return _hot_us_data
        pct_map: dict = {}
        try:
            pct_map = _us_pct_tencent([s for s, _ in _US_HOT])
        except Exception:
            pass
        if len(pct_map) < len(_US_HOT):
            try:
                import yfinance as yf
                syms = " ".join(s for s, _ in _US_HOT)
                data = yf.download(syms, period="2d", group_by="ticker",
                                   progress=False, threads=False, auto_adjust=True)
                for sym, _ in _US_HOT:
                    try:
                        hist = (data[sym] if len(_US_HOT) > 1 else data).dropna(subset=["Close"])
                        if len(hist) >= 2 and sym not in pct_map:
                            last, prev = float(hist["Close"].iloc[-1]), float(hist["Close"].iloc[-2])
                            pct_map[sym] = round((last - prev) / prev * 100, 2) if prev else None
                    except Exception:
                        pass
            except Exception:
                pass
        result = [
            {"code": sym, "name": name,
             "change_pct": pct_map.get(sym), "rank": i + 1, "market": "us"}
            for i, (sym, name) in enumerate(_US_HOT)
        ]
        _hot_us_data = result
        # incomplete (no pct at all) data expires quickly
        _hot_us_ts = now if pct_map else now - (_HOT_TTL - 60)
        return result


@router.get("/{symbol}/history", response_model=StockHistoryResponse)
def stock_history(
    symbol: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|)$"),
):
    """Return historical OHLCV + all technical indicators."""
    # Default date range: last 1 year
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")

    df = get_stock_history(symbol, period, start_date, end_date, adjust)

    # If no data in the requested range, try the full history (handles delisted/B-share stocks)
    if df is None or df.empty:
        df = get_stock_history(symbol, period, "19900101", end_date, adjust)

    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} 暂无数据（可能已退市、转板或数据源不支持该时段）"
        )

    # If we got data but it falls entirely before the requested start_date, keep it anyway
    # so the user sees the last available trading data

    name = get_stock_name(symbol)
    indicators = calc_all_indicators(df)

    candles = []
    for _, row in df.iterrows():
        candles.append(
            Candle(
                date=str(row["date"]),
                open=float(row["open"]),
                close=float(row["close"]),
                high=float(row["high"]),
                low=float(row["low"]),
                volume=float(row["volume"]),
                amount=float(row["amount"]),
                pct_change=float(row["pct_change"]),
                turnover=float(row["turnover"]),
            )
        )

    ma_list = [MAIndicator(**m) for m in indicators["ma"]]
    macd_list = [MACDData(**m) for m in indicators["macd"]]
    rsi_list = [RSIData(**r) for r in indicators["rsi"]]

    return StockHistoryResponse(
        symbol=symbol,
        name=name,
        candles=candles,
        ma=ma_list,
        macd=macd_list,
        rsi=rsi_list,
    )


def _is_us_symbol(symbol: str) -> bool:
    return not symbol.isdigit()


def _us_history_df(symbol: str, period: str, start_date: str, end_date: str):
    """US daily candles from Tencent shaped like get_stock_history's DataFrame."""
    import pandas as pd
    from routers.us_stocks import _tencent_history
    from services.stock_service import _resample_to_period
    days = max((datetime.now() - datetime.strptime(start_date, "%Y%m%d")).days + 10, 60)
    rows = _tencent_history(symbol.upper(), days)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df["date"] = df["date"].astype(str)
    lo, hi = f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}", f"{end_date[:4]}-{end_date[4:6]}-{end_date[6:]}"
    df = df[(df["date"] >= lo) & (df["date"] <= hi)]
    if df.empty:
        return None
    df["pct_change"] = (df["close"].pct_change() * 100).fillna(0.0)
    df["amount"] = 0.0
    df["turnover"] = 0.0
    if period in ("weekly", "monthly"):
        df = _resample_to_period(df, period)
    return df.reset_index(drop=True)


def _us_name(symbol: str) -> str:
    try:
        from routers.us_market import us_quotes
        q = us_quotes([symbol.upper()]).get(symbol.upper()) or {}
        return q.get("name") or symbol.upper()
    except Exception:
        return symbol.upper()


@router.get("/pair-analysis")
def pair_analysis(
    symbol1: str = Query(...),
    symbol2: str = Query(...),
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|)$"),
    lang: str = Query("zh"),
):
    """Analyze chart patterns and price similarity between two stocks."""
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")

    def load(sym):
        if _is_us_symbol(sym):
            return _us_history_df(sym, period, start_date, end_date)
        df = get_stock_history(sym, period, start_date, end_date, adjust)
        if df is None or df.empty:
            df = get_stock_history(sym, period, "19900101", end_date, adjust)
        return df

    df1, df2 = load(symbol1), load(symbol2)
    for sym, df in ((symbol1, df1), (symbol2, df2)):
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {sym}" if lang == "en" else f"{sym} 暂无数据")

    name1 = _us_name(symbol1) if _is_us_symbol(symbol1) else get_stock_name(symbol1)
    name2 = _us_name(symbol2) if _is_us_symbol(symbol2) else get_stock_name(symbol2)

    result = analyze_pair(df1, name1, df2, name2, lang=lang)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{symbol}/regime")
def stock_regime(
    symbol: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|)$"),
    window: int = Query(20),
):
    """Detect market regimes for a stock."""
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365 * 2)).strftime("%Y%m%d")

    df = get_stock_history(symbol, period, start_date, end_date, adjust)
    if df is None or df.empty:
        df = get_stock_history(symbol, period, "19900101", end_date, adjust)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{symbol} 暂无数据")

    result = detect_regimes(df, window=window)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{symbol}/risk")
def stock_risk(
    symbol: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|)$"),
):
    """Return risk analytics for a stock."""
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")

    df = get_stock_history(symbol, period, start_date, end_date, adjust)
    if df is None or df.empty:
        df = get_stock_history(symbol, period, "19900101", end_date, adjust)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{symbol} 暂无数据")

    result = analyze_risk(df)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{symbol}/factor")
def stock_factor(
    symbol: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    adjust: str = Query("qfq", pattern="^(qfq|hfq|)$"),
):
    """Return CAPM factor analysis for a stock."""
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365 * 2)).strftime("%Y%m%d")

    df = get_stock_history(symbol, period, start_date, end_date, adjust)
    if df is None or df.empty:
        df = get_stock_history(symbol, period, "19900101", end_date, adjust)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{symbol} 暂无数据")

    result = analyze_factors(df)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{symbol}/realtime", response_model=RealtimeQuote)
def realtime_quote(symbol: str):
    """Return real-time quote for a stock."""
    quote = get_realtime_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"No realtime data for {symbol}")
    return RealtimeQuote(**quote)
