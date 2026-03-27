import akshare as ak
import pandas as pd
import requests
from functools import lru_cache
from typing import List, Optional
import math

SINA_HEADERS = {"Referer": "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0"}
_name_cache: dict = {}


def _fetch_stock_name_from_sina(symbol: str) -> str:
    """Fetch stock name from Sina HQ API."""
    if symbol in _name_cache:
        return _name_cache[symbol]
    try:
        sina_sym = _get_sina_symbol(symbol)
        r = requests.get(
            f"http://hq.sinajs.cn/list={sina_sym}",
            headers=SINA_HEADERS,
            timeout=5,
        )
        # Response: var hq_str_sz300394="天孚通信,305.57,...";
        text = r.text
        if '"' in text:
            name = text.split('"')[1].split(",")[0]
            if name:
                _name_cache[symbol] = name
                return name
    except Exception:
        pass
    return symbol


def _clean_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _get_sina_symbol(code: str) -> str:
    """Convert bare code to Sina Finance symbol (e.g. '300394' -> 'sz300394')."""
    code = code.strip()
    if code.startswith(("sh", "sz", "bj")):
        return code
    if code.startswith(("6", "9")):  # Shanghai A/B shares
        return f"sh{code}"
    if code.startswith(("4", "8")):  # Beijing exchange
        return f"bj{code}"
    return f"sz{code}"  # Shenzhen A/B shares


def _is_b_share(code: str) -> bool:
    """200xxx = Shenzhen B share, 900xxx = Shanghai B share."""
    c = code.lstrip("shszbj")
    return c.startswith("2") or c.startswith("9")


@lru_cache(maxsize=1)
def get_stock_list() -> List[dict]:
    """Fetch full A-share code+name list. Cached after first call."""
    try:
        df = ak.stock_info_a_code_name()
        return df[["code", "name"]].to_dict(orient="records")
    except Exception as e:
        print(f"Error fetching stock list: {e}")
        return []


def _search_via_sina(q: str) -> List[dict]:
    """Try Sina's suggest API. Works fast from China-based servers."""
    try:
        from urllib.parse import quote
        r = requests.get(
            f"https://suggest3.sinajs.cn/suggest/type=11,12&key={quote(q)}&name=suggestdata",
            headers=SINA_HEADERS,
            timeout=4,
        )
        r.encoding = "gbk"  # Sina returns GBK — must set before reading .text
        text = r.text
        if '"' not in text:
            return []
        raw = text.split('"')[1]
        if not raw:
            return []
        results = []
        for entry in raw.split(";"):
            parts = entry.strip().split(",")
            if len(parts) >= 5 and parts[1] in ("11", "12"):
                code = parts[2].strip()
                name = parts[4].strip() or parts[0].strip()
                if code and name:
                    _name_cache[code] = name
                    results.append({"code": code, "name": name})
        return results[:30]
    except Exception as e:
        print(f"[search] Sina API failed: {e}")
        return []


def _search_via_eastmoney(q: str) -> List[dict]:
    """East Money search API — works globally, returns JSON."""
    try:
        url = (
            "https://searchapi.eastmoney.com/api/suggest/get"
            f"?input={requests.utils.quote(q)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=20"
        )
        r = requests.get(url, timeout=5, headers={"User-Agent": "Mozilla/5.0"})
        data = r.json()
        results = []
        for item in data.get("QuotationCodeTable", {}).get("Data") or []:
            code = item.get("Code", "").strip()
            name = item.get("Name", "").strip()
            market = item.get("MktNum", "")
            # Only A-shares: market 0=SZ, 1=SH
            if code and name and str(market) in ("0", "1"):
                _name_cache[code] = name
                results.append({"code": code, "name": name})
        return results[:30]
    except Exception as e:
        print(f"[search] EastMoney API failed: {e}")
        return []


def _search_via_local(q: str) -> List[dict]:
    """Local full-list fallback using cached AkShare stock list."""
    stocks = get_stock_list()
    if not stocks:
        return []
    q_lower = q.lower()
    results = []
    for s in stocks:
        code = s.get("code", "")
        name = s.get("name", "")
        if q_lower in code.lower() or q_lower in name.lower():
            results.append({"code": code, "name": name})
        if len(results) >= 30:
            break
    return results


def search_stocks(q: str) -> List[dict]:
    """Search A-share stocks.
    Tries Sina first (fast, China), then EastMoney (global), then local list fallback.
    """
    # 1. Sina (fast if reachable)
    results = _search_via_sina(q)
    if results:
        return results

    # 2. EastMoney (more globally accessible)
    results = _search_via_eastmoney(q)
    if results:
        return results

    # 3. Local cached list (always works, may be empty on first cold start)
    return _search_via_local(q)


def get_stock_name(symbol: str) -> str:
    """Get stock name, using cache then Sina API."""
    if symbol in _name_cache:
        return _name_cache[symbol]
    return _fetch_stock_name_from_sina(symbol)


def _resample_to_period(df: pd.DataFrame, period: str) -> pd.DataFrame:
    """Resample daily OHLCV to weekly or monthly."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()

    freq = "W-FRI" if period == "weekly" else "ME"
    agg = {
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum",
        "amount": "sum",
        "turnover": "sum",
    }
    resampled = df.resample(freq).agg(agg).dropna(subset=["close"])
    resampled = resampled[resampled["close"] > 0]
    resampled["pct_change"] = resampled["close"].pct_change() * 100
    resampled = resampled.reset_index()
    resampled["date"] = resampled["date"].dt.strftime("%Y-%m-%d")
    return resampled


def _fetch_b_share_daily(sina_symbol: str, start_date: str, end_date: str, adjust: str) -> Optional[pd.DataFrame]:
    """Fetch B-share OHLCV via akshare. Avoids py_mini_racer (crashes on Apple Silicon)."""
    try:
        df = ak.stock_zh_b_daily(symbol=sina_symbol, start_date=start_date, end_date=end_date, adjust=adjust or "")
        df["date"] = df["date"].astype(str)
        if "amount" not in df.columns:
            df["amount"] = 0.0
        if "turnover" not in df.columns:
            df["turnover"] = 0.0
        return df
    except Exception as e:
        print(f"B-share fetch failed for {sina_symbol}: {e}")
        return None


def get_stock_history(
    symbol: str,
    period: str = "daily",
    start_date: str = "20230101",
    end_date: str = "20991231",
    adjust: str = "qfq",
) -> Optional[pd.DataFrame]:
    """Fetch historical OHLCV data using Sina Finance."""
    try:
        sina_symbol = _get_sina_symbol(symbol)
        adjust_map = {"qfq": "qfq", "hfq": "hfq", "": ""}
        ak_adjust = adjust_map.get(adjust, "qfq")

        if _is_b_share(symbol):
            df = _fetch_b_share_daily(sina_symbol, start_date, end_date, ak_adjust)
        else:
            df = ak.stock_zh_a_daily(
                symbol=sina_symbol,
                start_date=start_date,
                end_date=end_date,
                adjust=ak_adjust if ak_adjust else None,
            )

        if df is None or df.empty:
            return None

        # Sina Finance columns: date, open, high, low, close, volume, amount, outstanding_share, turnover
        df = df.rename(columns={"high": "high", "low": "low"})
        df["date"] = df["date"].astype(str)

        # Compute daily pct_change
        df["pct_change"] = df["close"].pct_change() * 100
        df["pct_change"] = df["pct_change"].fillna(0.0)

        # Ensure turnover is numeric (Sina returns ratio, multiply by 100 for %)
        for col in ["open", "close", "high", "low", "volume", "amount", "turnover"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        if "turnover" in df.columns:
            # Sina returns turnover as decimal (0.001), convert to percent
            df["turnover"] = df["turnover"] * 100

        # Resample if needed
        if period in ("weekly", "monthly"):
            df = _resample_to_period(df, period)

        cols = ["date", "open", "close", "high", "low", "volume", "amount", "pct_change", "turnover"]
        existing = [c for c in cols if c in df.columns]
        df = df[existing].copy()
        for col in cols:
            if col not in df.columns:
                df[col] = 0.0

        # Always reset index to 0,1,2,... so indicator_service can use .loc safely
        df = df.reset_index(drop=True)
        return df

    except Exception as e:
        print(f"Error fetching history for {symbol} ({_get_sina_symbol(symbol)}): {e}")
        return None


def get_realtime_quote(symbol: str) -> Optional[dict]:
    """Get latest quote by fetching the most recent daily candle from Sina Finance."""
    try:
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y%m%d")
        month_ago = (datetime.now() - timedelta(days=10)).strftime("%Y%m%d")

        df = get_stock_history(symbol, "daily", month_ago, today, "qfq")
        if df is None or df.empty:
            return None

        name = get_stock_name(symbol)
        last = df.iloc[-1]
        prev_close = float(df.iloc[-2]["close"]) if len(df) >= 2 else float(last["close"])
        price = float(last["close"])
        change = round(price - prev_close, 4)
        pct = round((change / prev_close * 100) if prev_close else 0, 4)

        return {
            "code": symbol,
            "name": name,
            "price": price,
            "change": change,
            "pct_change": pct,
            "volume": float(last["volume"]),
            "amount": float(last["amount"]),
            "high": float(last["high"]),
            "low": float(last["low"]),
            "open": float(last["open"]),
            "prev_close": prev_close,
        }
    except Exception as e:
        print(f"Error fetching realtime for {symbol}: {e}")
        return None
