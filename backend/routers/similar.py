from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()

# Module-level cache: symbol -> (industry_name, [(code, name), ...])
_industry_cache: dict = {}


def _get_60d_closes(symbol: str, start: str, end: str) -> pd.Series:
    try:
        df = ak.stock_zh_a_hist(
            symbol=symbol, period="daily",
            start_date=start, end_date=end, adjust="qfq"
        )
        if df is None or df.empty:
            return pd.Series(dtype=float, name=symbol)
        df = df.sort_values("日期")
        return df.set_index("日期")["收盘"].rename(symbol)
    except Exception:
        return pd.Series(dtype=float, name=symbol)


def _find_industry(symbol: str):
    """Return (industry_name, [(code, name), ...]) for the given symbol.
    Checks all industries in parallel; result is cached at module level."""
    if symbol in _industry_cache:
        return _industry_cache[symbol]

    try:
        industries_df = ak.stock_board_industry_name_em()
        industry_names = industries_df["板块名称"].tolist()
    except Exception as e:
        raise RuntimeError(f"Failed to load industry list: {e}")

    found = [None]  # mutable container for early exit

    def _check(ind_name):
        if found[0] is not None:
            return None
        try:
            cons = ak.stock_board_industry_cons_em(symbol=ind_name)
            if cons is None or cons.empty:
                return None
            codes = cons["代码"].astype(str).str.zfill(6).tolist()
            if symbol in codes:
                pairs = list(zip(codes, cons["名称"].tolist()))
                return ind_name, pairs
        except Exception:
            pass
        return None

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_check, ind): ind for ind in industry_names}
        for future in as_completed(futures):
            res = future.result()
            if res:
                found[0] = res
                # cancel remaining (best effort)
                for f in futures:
                    f.cancel()
                break

    if found[0] is None:
        raise RuntimeError(f"Could not identify industry for {symbol}")

    _industry_cache[symbol] = found[0]
    return found[0]


@router.get("/{symbol}")
def similar_stocks(symbol: str):
    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=100)  # ~70 trading days
    start_str = start_dt.strftime("%Y%m%d")
    end_str = end_dt.strftime("%Y%m%d")

    # 1. Get target stock's price series
    target_closes = _get_60d_closes(symbol, start_str, end_str)
    if len(target_closes) < 10:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")

    target_returns = target_closes.pct_change().dropna()

    # 2. Find industry and peer list
    try:
        industry_name, peers = _find_industry(symbol)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Exclude self; limit to 60 peers for speed
    peer_list = [(c, n) for c, n in peers if c != symbol][:60]

    # 3. Fetch price data for all peers in parallel
    def _fetch(item):
        code, name = item
        closes = _get_60d_closes(code, start_str, end_str)
        return code, name, closes

    peer_results = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(_fetch, item): item for item in peer_list}
        for future in as_completed(futures, timeout=45):
            try:
                peer_results.append(future.result())
            except Exception:
                pass

    # 4. Compute Pearson correlation on daily returns
    results = []
    for code, name, closes in peer_results:
        if len(closes) < 10:
            continue
        peer_returns = closes.pct_change().dropna()
        common = target_returns.index.intersection(peer_returns.index)
        if len(common) < 10:
            continue
        corr = target_returns[common].corr(peer_returns[common])
        if pd.isna(corr):
            continue

        # Build sparkline: normalized to 100 at first close
        base = closes.iloc[0]
        sparkline = [round(float(v / base * 100), 2) for v in closes.values]

        results.append({
            "code": code,
            "name": name,
            "correlation": round(float(corr), 4),
            "sparkline": sparkline,
        })

    # 5. Sort descending, top 10
    results.sort(key=lambda x: x["correlation"], reverse=True)

    return {
        "symbol": symbol,
        "industry": industry_name,
        "results": results[:10],
    }
