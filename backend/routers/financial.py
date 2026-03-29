from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import math
import time

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
    if symbol.startswith("6"):
        return f"{symbol}.SS"
    return f"{symbol}.SZ"


def _get_yf_valuation(symbol: str) -> dict:
    """Fetch PE/PB from yfinance, cached per-symbol for 1 hour."""
    cache = _get_yf_valuation._yf_cache
    now = time.time()
    if symbol in cache:
        cached_val, cached_ts = cache[symbol]
        if now - cached_ts < 3600:
            return cached_val

    try:
        import yfinance as yf
        ticker_str = _symbol_to_yf_ticker(symbol)
        info = yf.Ticker(ticker_str).info
        pe_ttm = _safe(info.get("trailingPE") or info.get("forwardPE"))
        pb = _safe(info.get("priceToBook"))
        result = {"pe_ttm": pe_ttm, "pb": pb}
    except Exception as e:
        print(f"[financial] yfinance valuation error for {symbol}: {e}")
        result = {"pe_ttm": None, "pb": None}

    cache[symbol] = (result, now)
    return result


_get_yf_valuation._yf_cache = {}


@router.get("/{symbol}")
def financial_analysis(symbol: str):
    """
    Return key financial ratios for a stock.
    PE/PB from yfinance; financial ratios from ak.stock_financial_analysis_indicator.
    """
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
        df_fin = ak.stock_financial_analysis_indicator(symbol=symbol, start_year="2020")
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
