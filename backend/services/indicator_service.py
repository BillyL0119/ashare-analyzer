import pandas as pd
import numpy as np
from typing import List
import math


def _safe_float(val):
    """Convert NaN/Inf to None."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (TypeError, ValueError):
        return None


def calc_ma(df: pd.DataFrame, windows: List[int] = [5, 10, 20, 60]) -> List[dict]:
    """Calculate Moving Averages."""
    result = []
    close = df["close"]
    ma_series = {}
    for w in windows:
        ma_series[f"ma{w}"] = close.rolling(window=w).mean()

    for i, row in df.iterrows():
        item = {"date": str(row["date"])}
        for w in windows:
            item[f"ma{w}"] = _safe_float(ma_series[f"ma{w}"].loc[i])
        result.append(item)

    return result


def calc_macd(
    df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9
) -> List[dict]:
    """Calculate MACD (DIF, DEA, MACD histogram)."""
    close = df["close"]

    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    dif = ema_fast - ema_slow
    dea = dif.ewm(span=signal, adjust=False).mean()
    macd_hist = (dif - dea) * 2

    result = []
    dates = df["date"].tolist()
    dif_list = dif.tolist()
    dea_list = dea.tolist()
    macd_list = macd_hist.tolist()

    for i in range(len(dates)):
        result.append({
            "date": str(dates[i]),
            "dif": _safe_float(dif_list[i]),
            "dea": _safe_float(dea_list[i]),
            "macd": _safe_float(macd_list[i]),
        })

    return result


def calc_rsi(df: pd.DataFrame, periods: List[int] = [6, 12, 24]) -> List[dict]:
    """Calculate RSI using Wilder's smoothing method."""
    close = df["close"]
    delta = close.diff()

    rsi_series = {}
    for period in periods:
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
        avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        rsi_series[f"rsi{period}"] = rsi

    result = []
    dates = df["date"].tolist()

    for i in range(len(dates)):
        item = {"date": str(dates[i])}
        for period in periods:
            val_list = rsi_series[f"rsi{period}"].tolist()
            item[f"rsi{period}"] = _safe_float(val_list[i])
        result.append(item)

    return result


def calc_all_indicators(df: pd.DataFrame) -> dict:
    """Calculate all indicators from a DataFrame."""
    return {
        "ma": calc_ma(df),
        "macd": calc_macd(df),
        "rsi": calc_rsi(df),
    }
