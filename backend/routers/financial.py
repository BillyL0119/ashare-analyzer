from fastapi import APIRouter, HTTPException
import akshare as ak
import pandas as pd
import math

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


@router.get("/{symbol}")
def financial_analysis(symbol: str):
    """
    Return key financial ratios for a stock.
    PE/PB from ak.stock_a_indicator_lg; financial ratios from ak.stock_financial_analysis_indicator.
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

    # ── Valuation: PE / PB from stock_a_indicator_lg ──────────────────────────
    try:
        df_val = ak.stock_a_indicator_lg(symbol=symbol)
        if df_val is not None and not df_val.empty:
            df_val = df_val.sort_values("日期", ascending=True).tail(120)
            latest = df_val.iloc[-1]

            result["valuation"]["pe_ttm"] = _safe(latest.get("pe_ttm") or latest.get("pe"))
            result["valuation"]["pb"] = _safe(latest.get("pb"))

            # Build sparkline history (last 60 points)
            for col, key in [("pe_ttm", "pe"), ("pb", "pb")]:
                col_name = col if col in df_val.columns else "pe"
                hist = []
                for _, row in df_val.tail(60).iterrows():
                    v = _safe(row.get(col_name))
                    if v is not None:
                        hist.append({"date": str(row["日期"])[:10], "value": v})
                result["history"][key] = hist
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
                    # Store in 亿 units
                    result["cashflow"]["operating_cf"] = {
                        "value": _fmt_large(val * 1e8 if val is not None else None) if col and "亿" not in (col or "") else _fmt_large(val),
                        "yoy": None,
                        "date": str(latest_fin.get("日期", ""))[:10],
                    }
                    # Try raw value in case unit is already yuan
                    raw_col = find_col(df_fin, candidates)
                    if raw_col:
                        raw_val = _safe(latest_fin.get(raw_col))
                        # heuristic: if value > 1e6, it's already in yuan, convert to 亿
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
