from fastapi import APIRouter, HTTPException
import pandas as pd
import math
import requests
import time
from concurrent.futures import ThreadPoolExecutor
from io import StringIO
from bs4 import BeautifulSoup

router = APIRouter()


def _safe(val):
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 4)
    except Exception:
        return None


def _fmt_large(val):
    """Format large numbers into 亿 units."""
    v = _safe(val)
    if v is None:
        return None
    return round(v / 1e8, 2)  # convert to 亿


def _symbol_to_yf_ticker(symbol: str) -> str:
    """Convert 6-digit A-share code to Yahoo Finance ticker."""
    from services.stock_service import yahoo_cn_symbol
    return yahoo_cn_symbol(symbol)


def _get_yf_valuation(symbol: str) -> dict:
    """PE/PB from Tencent quotes, cached per-symbol for 1 hour."""
    cache = _get_yf_valuation._yf_cache
    now = time.time()
    if symbol in cache:
        cached_val, cached_ts = cache[symbol]
        if now - cached_ts < 3600:
            return cached_val

    # Tencent's quote feed carries P/E (TTM) and P/B; yfinance is rate limited from the server
    # and made this endpoint wait ~9s before giving up.
    try:
        from services.stock_service import tencent_quotes
        q = tencent_quotes([symbol]).get(symbol) or {}
        result = {"pe_ttm": _safe(q.get("pe")), "pb": _safe(q.get("pb"))}
    except Exception:
        result = {"pe_ttm": None, "pb": None}

    cache[symbol] = (result, now)
    return result


_get_yf_valuation._yf_cache = {}


_FIN_PAGE = "https://money.finance.sina.com.cn/corp/go.php/vFD_FinancialGuideLine/stockid/{}/ctrl/{}/displaytype/4.phtml"
_FIN_SECTIONS = ["每股指标", "盈利能力", "成长能力", "营运能力", "偿债及资本结构", "现金流量", "其他指标"]


def _financial_indicator(symbol: str, start_year: str) -> pd.DataFrame:
    """ak.stock_financial_analysis_indicator(symbol, start_year) (same frame), with Sina's yearly pages
    fetched in parallel: akshare reads them one after another, ~1s each."""
    def page(year: str) -> str:
        return requests.get(_FIN_PAGE.format(symbol, year), headers={"User-Agent": "Mozilla/5.0"}, timeout=10).text

    first = page("2020")                       # akshare reads the year list from this page
    soup = BeautifulSoup(first, features="lxml")
    year_list = [a.text for a in soup.find(attrs={"id": "con02-1"}).find("table").find_all("a")]
    if start_year not in year_list:
        return pd.DataFrame()
    year_list = year_list[: year_list.index(start_year) + 1]
    with ThreadPoolExecutor(max_workers=8) as pool:
        pages = list(pool.map(lambda y: first if y == "2020" else page(y), year_list))

    out_df = pd.DataFrame()
    for text in pages:
        temp_df = pd.read_html(StringIO(text))[12].iloc[:, :-1]
        temp_df.columns = temp_df.iloc[0, :]
        temp_df = temp_df.iloc[1:, :]
        heads = [temp_df.loc[temp_df.iloc[:, 0].str.find(name) == 0, :].index[0] for name in _FIN_SECTIONS]
        big_df = pd.DataFrame()
        for i, head in enumerate(heads):
            inner_df = (temp_df[head:] if i == len(heads) - 1 else temp_df[head: heads[i + 1] - 1]).T
            big_df = pd.concat(objs=[big_df, inner_df.reset_index(drop=True)], axis=1)
        big_df.columns = big_df.iloc[0, :].tolist()
        big_df = big_df.iloc[1:, :]
        big_df.index = temp_df.columns.tolist()[1:]
        out_df = pd.concat(objs=[out_df, big_df])

    out_df.dropna(inplace=True)
    out_df.reset_index(inplace=True)
    out_df.rename(columns={"index": "日期"}, inplace=True)
    out_df.sort_values(by=["日期"], ignore_index=True, inplace=True)
    out_df["日期"] = pd.to_datetime(out_df["日期"], errors="coerce").dt.date
    for item in out_df.columns[1:]:
        out_df[item] = pd.to_numeric(out_df[item], errors="coerce")
    return out_df


_result_cache: dict = {}     # symbol -> (ts, result); quarterly figures, so 12h is plenty


@router.get("/{symbol}")
def financial_analysis(symbol: str):
    """
    Return key financial ratios for a stock.
    PE/PB from Tencent quotes; financial ratios from Sina's financial guideline pages.
    """
    hit = _result_cache.get(symbol)
    if hit and time.time() - hit[0] < 12 * 3600:
        return hit[1]
    result = _build_financial(symbol)
    if result.get("profitability") or result.get("valuation", {}).get("pe_ttm"):
        _result_cache[symbol] = (time.time(), result)
    return result


def _build_financial(symbol: str) -> dict:
    result = {
        "symbol": symbol,
        "valuation": {},      # PE, PB
        "profitability": {},  # Gross Margin, Net Margin, ROE
        "growth": {},         # Revenue YoY
        "cashflow": {},       # Operating Cash Flow
        "history": {
            "pe": [],
            "pb": [],
            "gross_margin": [],
            "net_margin": [],
            "roe": [],
            "revenue_growth": [],
        },
    }

    # ── Valuation: PE / PB from yfinance ──────────────────────────────────────
    try:
        val = _get_yf_valuation(symbol)
        result["valuation"]["pe_ttm"] = val.get("pe_ttm")
        result["valuation"]["pb"] = val.get("pb")
    except Exception as e:
        print(f"[financial] valuation error for {symbol}: {e}")

    # ── Financial ratios from stock_financial_analysis_indicator ──────────────
    try:
        df_fin = _financial_indicator(symbol, "2020")
        if df_fin is not None and not df_fin.empty:
            # Normalise column names (strip whitespace)
            df_fin.columns = [c.strip() for c in df_fin.columns]
            df_fin = df_fin.sort_values("日期", ascending=True)

            # Map Chinese column names to keys (AkShare column names vary by version)
            col_map = {
                "gross_margin": ["销售毛利率(%)", "毛利率(%)", "销售毛利率"],
                "net_margin": ["净利率(%)", "销售净利率(%)", "净利率"],
                "roe": ["净资产收益率(%)", "加权净资产收益率(%)", "净资产收益率"],
                "revenue_growth": ["营业总收入同比增长(%)", "营业收入同比增长(%)", "营业总收入同比增长率(%)"],
                "operating_cf": ["经营活动产生的现金流量净额(元)", "经营现金流量净额(元)", "经营活动现金流量净额(元)"],
            }

            def find_col(df, candidates):
                for c in candidates:
                    if c in df.columns:
                        return c
                # fuzzy: partial match
                for c in candidates:
                    base = c.rstrip("(%)")
                    for col in df.columns:
                        if base in col:
                            return col
                return None

            def build_history(df, col_name, transform=None):
                if col_name is None:
                    return []
                hist = []
                for _, row in df.iterrows():
                    v = _safe(row.get(col_name))
                    if v is not None:
                        if transform:
                            v = transform(v)
                        hist.append({"date": str(row["日期"])[:10], "value": v})
                return hist

            latest_fin = df_fin.iloc[-1]
            prev_year_idx = max(0, len(df_fin) - 5)  # roughly 1 year back (quarterly)
            prev_fin = df_fin.iloc[prev_year_idx]

            for key, candidates in col_map.items():
                col = find_col(df_fin, candidates)
                val = _safe(latest_fin.get(col)) if col else None
                prev_val = _safe(prev_fin.get(col)) if col else None
                yoy = None
                if val is not None and prev_val is not None and prev_val != 0:
                    yoy = round(val - prev_val, 2)

                if key == "operating_cf":
                    result["cashflow"]["operating_cf"] = {
                        "value": None,
                        "yoy": None,
                        "date": str(latest_fin.get("日期", ""))[:10],
                    }
                    raw_col = find_col(df_fin, candidates)
                    if raw_col:
                        raw_val = _safe(latest_fin.get(raw_col))
                        # heuristic: if value > 1e4, it's in yuan, convert to 亿
                        if raw_val is not None and abs(raw_val) > 1e4:
                            result["cashflow"]["operating_cf"]["value"] = round(raw_val / 1e8, 2)
                        else:
                            result["cashflow"]["operating_cf"]["value"] = raw_val
                    result["history"]["operating_cf"] = build_history(df_fin, raw_col)
                elif key in ("gross_margin", "net_margin", "roe"):
                    result["profitability"][key] = {
                        "value": val,
                        "yoy": yoy,
                        "date": str(latest_fin.get("日期", ""))[:10],
                    }
                    result["history"][key] = build_history(df_fin, col)
                elif key == "revenue_growth":
                    result["growth"]["revenue_growth"] = {
                        "value": val,
                        "yoy": None,
                        "date": str(latest_fin.get("日期", ""))[:10],
                    }
                    result["history"]["revenue_growth"] = build_history(df_fin, col)

    except Exception as e:
        print(f"[financial] ratios error for {symbol}: {e}")

    # Check if we got anything useful
    has_data = (
        result["valuation"]
        or result["profitability"]
        or result["growth"]
        or result["cashflow"]
    )
    if not has_data:
        raise HTTPException(status_code=404, detail=f"{symbol} 暂无财务数据")

    return result
