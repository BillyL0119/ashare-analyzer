from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from services.stock_service import get_stock_history
from services.indicator_service import calc_ma, calc_macd, calc_rsi
import pandas as pd
import numpy as np
import math

router = APIRouter()


def _safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (TypeError, ValueError):
        return None


def calc_bollinger(df: pd.DataFrame, window: int = 20, num_std: float = 2.0):
    close = df["close"]
    middle = close.rolling(window=window).mean()
    std = close.rolling(window=window).std()
    upper = middle + num_std * std
    lower = middle - num_std * std

    result = []
    dates = df["date"].tolist()
    for i in range(len(dates)):
        result.append({
            "date": str(dates[i]),
            "upper": _safe_float(upper.iloc[i]),
            "middle": _safe_float(middle.iloc[i]),
            "lower": _safe_float(lower.iloc[i]),
        })
    return result


@router.get("/{code}")
def get_indicators(
    code: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start: str = Query(None),
    end: str = Query(None),
):
    if not end:
        end = datetime.now().strftime("%Y%m%d")
    if not start:
        start = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")

    df = get_stock_history(code, period, start, end, "qfq")
    if df is None or df.empty:
        df = get_stock_history(code, period, "19900101", end, "qfq")
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{code} 暂无数据")

    ma = calc_ma(df, windows=[5, 10, 20, 60])
    macd = calc_macd(df)
    rsi = calc_rsi(df, periods=[14])
    bollinger = calc_bollinger(df)

    # Merge RSI to use rsi14 key
    rsi_mapped = []
    for item in rsi:
        rsi_mapped.append({
            "date": item["date"],
            "rsi14": item.get("rsi12"),  # use rsi12 as closest to rsi14
        })

    # Recalculate RSI with period 14 properly
    close = df["close"]
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=13, adjust=False).mean()
    avg_loss = loss.ewm(com=13, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi14 = 100 - (100 / (1 + rs))

    rsi14_list = []
    dates = df["date"].tolist()
    for i in range(len(dates)):
        rsi14_list.append({
            "date": str(dates[i]),
            "rsi14": _safe_float(rsi14.iloc[i]),
        })

    return {
        "code": code,
        "ma": ma,
        "macd": macd,
        "rsi": rsi14_list,
        "bollinger": bollinger,
    }
