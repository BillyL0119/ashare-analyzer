import akshare as ak
import pandas as pd
import requests
from typing import List, Optional
import math
import threading
import time
from services.js_runtime import v8_call

SINA_HEADERS = {"Referer": "https://finance.sina.com.cn", "User-Agent": "Mozilla/5.0"}
_name_cache: dict = {}


def tencent_quotes(codes: list, timeout: float = 4) -> dict:
    """{bare_code: {"name", "price", "prev_close", "pe", "pb", "market_cap_yi", "limit_up", "limit_down"}} for A-share codes via qt.gtimg.cn, in chunks.
    Sina hq.sinajs.cn answers 403 after ~5s from our server, so nothing should call it."""
    out: dict = {}
    codes = [c for c in dict.fromkeys(c.strip() for c in codes) if c]
    for i in range(0, len(codes), 60):
        chunk = codes[i:i + 60]
        try:
            r = requests.get("https://qt.gtimg.cn/q=" + ",".join(_get_sina_symbol(c) for c in chunk), timeout=timeout)
            r.encoding = "gbk"
        except Exception:
            continue
        for line in r.text.splitlines():
            if '="' not in line:
                continue
            vals = line.split('"')[1].split("~")
            if len(vals) < 5 or not vals[2]:
                continue
            try:
                price, prev = float(vals[3] or 0), float(vals[4] or 0)
            except ValueError:
                price, prev = 0.0, 0.0
            def _f(i):
                try:
                    return float(vals[i]) if len(vals) > i and vals[i] not in ("", "-") else None
                except ValueError:
                    return None
            out[vals[2]] = {"name": vals[1].replace(" ", ""), "price": price, "prev_close": prev,
                            # P/E (TTM), P/B and total market cap in 100M CNY, when Tencent has them
                            "pe": _f(39), "pb": _f(46), "market_cap_yi": _f(45),
                            # the exchange's daily price band (涨停价 / 跌停价)
                            "limit_up": _f(47), "limit_down": _f(48)}
    return out


def _fetch_stock_name_from_sina(symbol: str) -> str:
    """Stock name (kept the old name for callers; now served by Tencent quotes)."""
    if symbol in _name_cache:
        return _name_cache[symbol]
    q = tencent_quotes([symbol]).get(symbol.strip()[-6:])
    if q and q["name"]:
        _name_cache[symbol] = q["name"]
        return q["name"]
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
    if code.startswith(("4", "8", "92")):  # Beijing exchange (920xxx is its code range since 2024)
        return f"bj{code}"
    if code.startswith(("6", "9", "5", "11")):  # Shanghai A/B shares, funds/ETFs (5xxxxx), convertibles (11xxxx)
        return f"sh{code}"
    return f"sz{code}"  # Shenzhen A/B shares, funds (1xxxxx except 11), convertibles (12xxxx)


def sina_daily_closes(code: str, n: int) -> dict:
    """{YYYY-MM-DD: close} for the last n trading days of an A-share index ("sh000300"), fund ("sh510300")
    or stock, unadjusted, from Sina's daily history (the feed the stock charts use): the fallback when
    Tencent's K-line fails."""
    sym = _get_sina_symbol(code)
    if sym.startswith(("sh000", "sz399")):
        df = v8_call(ak.stock_zh_index_daily, symbol=sym)
    elif sym[2:].startswith(("5", "1")):
        df = v8_call(ak.fund_etf_hist_sina, symbol=sym)
    else:
        start = time.strftime("%Y%m%d", time.localtime(time.time() - (n * 1.5 + 30) * 86400))
        df = get_stock_history(sym[2:], "daily", start, time.strftime("%Y%m%d"), "")
    if df is None or df.empty:
        return {}
    df = df.tail(n)
    return {str(d)[:10]: float(c) for d, c in zip(df["date"], df["close"])}


def yahoo_cn_symbol(code: str) -> str:
    """Bare A-share code -> Yahoo Finance ticker (600519.SS, 000001.SZ, 920002.BJ)."""
    ex = _get_sina_symbol(code)[:2]
    return f"{code[-6:]}.{ {'sh': 'SS', 'sz': 'SZ', 'bj': 'BJ'}[ex] }"


def _is_b_share(code: str) -> bool:
    """200xxx = Shenzhen B share, 900xxx = Shanghai B share."""
    c = code.lstrip("shszbj")
    return c.startswith("2") or c.startswith("9")


_stock_list: List[dict] = []
_stock_list_lock = threading.Lock()


def get_stock_list(wait: bool = True) -> List[dict]:
    """Full A-share code+name list (downloads in ~5-12s; preloaded at startup).
    Only a successful download is cached, so a transient failure is retried on the next call.
    wait=False returns [] instead of blocking while another thread is still downloading."""
    global _stock_list
    if _stock_list:
        return _stock_list
    if not _stock_list_lock.acquire(blocking=wait):
        return []
    try:
        if _stock_list:
            return _stock_list
        df = ak.stock_info_a_code_name()
        records = df[["code", "name"]].to_dict(orient="records")
        # Populate name cache so get_stock_name() can serve from memory
        for r in records:
            code, name = r.get("code", ""), r.get("name", "")
            if code and name:
                _name_cache[code] = name
        _stock_list = records
        return records
    except Exception as e:
        print(f"Error fetching stock list: {e}")
        return []
    finally:
        _stock_list_lock.release()


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
    """Local full-list fallback using cached AkShare stock list (skipped while it is still loading)."""
    stocks = get_stock_list(wait=False)
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
        df = v8_call(ak.stock_zh_b_daily, symbol=sina_symbol, start_date=start_date, end_date=end_date, adjust=adjust or "")
        df["date"] = df["date"].astype(str)
        if "amount" not in df.columns:
            df["amount"] = 0.0
        if "turnover" not in df.columns:
            df["turnover"] = 0.0
        return df
    except Exception as e:
        print(f"B-share fetch failed for {sina_symbol}: {e}")
        return None


_hist_cache: dict = {}            # (symbol, period, start, end, adjust) -> (ts, DataFrame)
_hist_lock = threading.Lock()


def _hist_ttl() -> int:
    """2 minutes while A-shares trade (the latest bar can still change), 30 minutes otherwise."""
    try:
        from services.paper_engine import in_trading_day
        return 120 if in_trading_day("cn") else 1800
    except Exception:
        return 120


def get_stock_history(
    symbol: str,
    period: str = "daily",
    start_date: str = "20230101",
    end_date: str = "20991231",
    adjust: str = "qfq",
) -> Optional[pd.DataFrame]:
    """Historical OHLCV from Sina Finance, cached briefly: the fetch runs under the shared V8 lock,
    so uncached it serialises every stock page, indicator and risk call behind each other."""
    key = (symbol, period, start_date, end_date, adjust)
    hit = _hist_cache.get(key)
    if hit and time.time() - hit[0] < _hist_ttl():
        return hit[1].copy()
    df = _fetch_stock_history(symbol, period, start_date, end_date, adjust)
    if df is not None:
        with _hist_lock:
            if len(_hist_cache) > 400:
                _hist_cache.clear()
            _hist_cache[key] = (time.time(), df)
        return df.copy()
    return None


def _fetch_stock_history(symbol: str, period: str, start_date: str, end_date: str, adjust: str) -> Optional[pd.DataFrame]:
    try:
        sina_symbol = _get_sina_symbol(symbol)
        adjust_map = {"qfq": "qfq", "hfq": "hfq", "": ""}
        ak_adjust = adjust_map.get(adjust, "qfq")

        if _is_b_share(symbol):
            df = _fetch_b_share_daily(sina_symbol, start_date, end_date, ak_adjust)
        else:
            df = v8_call(ak.stock_zh_a_daily,
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


def _tencent_live_quote(symbol: str) -> Optional[dict]:
    """Live A-share quote from qt.gtimg.cn (the daily candle feeds only gain today's bar after the close)."""
    try:
        r = requests.get("https://qt.gtimg.cn/q=" + _get_sina_symbol(symbol), timeout=4)
        r.encoding = "gbk"
        f = r.text.split('"')[1].split("~")
        price, prev = float(f[3] or 0), float(f[4] or 0)
        if price <= 0 or prev <= 0:          # suspended or not yet traded: let the candle feed answer
            return None
        try:
            amount = float(f[35].split("/")[2])          # exact turnover in CNY
        except (IndexError, ValueError):
            amount = float(f[37] or 0) * 1e4             # turnover in 10k CNY
        change = round(price - prev, 4)

        def num(i, scale=1.0):
            try:
                v = float(f[i])
            except (IndexError, ValueError):
                return None
            return v * scale if v > 0 else None      # 0 or negative means "not available" (a loss-making PE too)

        return {
            "code": symbol, "name": f[1].replace(" ", "") or get_stock_name(symbol),
            "price": price, "change": change, "pct_change": round(change / prev * 100, 4),
            "volume": float(f[6] or 0) * 100,              # lots of 100 shares -> shares
            "amount": amount, "high": float(f[33] or price), "low": float(f[34] or price),
            "open": float(f[5] or price), "prev_close": prev,
            "pe_ttm": num(39), "pb": num(46), "market_cap": num(45, 1e8),   # cap in 100M CNY -> CNY
            "week52_high": num(67), "week52_low": num(68),
        }
    except Exception:
        return None


def get_realtime_quote(symbol: str) -> Optional[dict]:
    """Latest quote: Tencent's live feed, else the most recent daily candle."""
    live = _tencent_live_quote(symbol)
    if live:
        return live
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
