from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta

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




@router.get("/search", response_model=List[StockInfo])
def search(q: str = Query(..., min_length=1)):
    """Search stocks by code or name."""
    results = search_stocks(q)
    return [StockInfo(code=s["code"], name=s["name"]) for s in results]


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

    df1 = get_stock_history(symbol1, period, start_date, end_date, adjust)
    if df1 is None or df1.empty:
        df1 = get_stock_history(symbol1, period, "19900101", end_date, adjust)

    df2 = get_stock_history(symbol2, period, start_date, end_date, adjust)
    if df2 is None or df2.empty:
        df2 = get_stock_history(symbol2, period, "19900101", end_date, adjust)

    if df1 is None or df1.empty:
        raise HTTPException(status_code=404, detail=f"{symbol1} 暂无数据")
    if df2 is None or df2.empty:
        raise HTTPException(status_code=404, detail=f"{symbol2} 暂无数据")

    name1 = get_stock_name(symbol1)
    name2 = get_stock_name(symbol2)

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
