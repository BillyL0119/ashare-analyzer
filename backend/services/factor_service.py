import numpy as np
import pandas as pd
from scipy import stats
import akshare as ak

RISK_FREE_ANNUAL = 0.025   # ~2.5% China 1-yr deposit rate proxy
TRADING_DAYS = 252

# Tencent Finance symbol → metadata
INDICES = {
    "sh000300": {"zh": "沪深300", "en": "CSI 300",  "tx": "sh000300"},
    "sh000016": {"zh": "上证50",  "en": "SSE 50",   "tx": "sh000016"},
    "sz399006": {"zh": "创业板",  "en": "ChiNext",  "tx": "sz399006"},
}

# In-process cache: {tx_symbol: (dates_list, log_returns_array)}
_INDEX_CACHE: dict = {}


def _load_index(tx_symbol: str):
    """Fetch full index history via Tencent Finance (no py_mini_racer).
    Result is cached for the lifetime of the process."""
    if tx_symbol in _INDEX_CACHE:
        return _INDEX_CACHE[tx_symbol]
    try:
        print(f"[factor] Loading index {tx_symbol} via Tencent Finance (first call)…")
        df = ak.stock_zh_index_daily_tx(symbol=tx_symbol)
        df["date"] = df["date"].astype(str)
        df = df.sort_values("date")
        closes = df["close"].values.astype(float)
        dates = df["date"].tolist()
        log_rets = np.diff(np.log(np.where(closes > 0, closes, np.nan)))
        result = (dates[1:], log_rets)
        _INDEX_CACHE[tx_symbol] = result
        return result
    except Exception as e:
        print(f"[factor] Index load failed for {tx_symbol}: {e}")
        return None, None


def _fetch_index_returns(tx_symbol: str, start_date_dash: str, end_date_dash: str):
    """Return (dates_list, log_returns_array) sliced to the requested window."""
    all_dates, all_rets = _load_index(tx_symbol)
    if all_dates is None:
        return None, None
    # Filter to window
    pairs = [(d, r) for d, r in zip(all_dates, all_rets)
             if start_date_dash <= d <= end_date_dash]
    if len(pairs) < 10:
        return None, None
    dates, rets = zip(*pairs)
    return list(dates), np.array(rets)


# ── Core CAPM ──────────────────────────────────────────────────────────────────

def _capm(stock_rets: np.ndarray, market_rets: np.ndarray):
    """OLS regression of stock returns on market returns."""
    slope, intercept, r_value, p_value, std_err = stats.linregress(market_rets, stock_rets)
    return {
        "beta": round(float(slope), 4),
        "alpha_daily": float(intercept),          # daily Jensen alpha
        "r_squared": round(float(r_value ** 2), 4),
        "p_value": round(float(p_value), 4),
        "beta_se": round(float(std_err), 4),
    }


def _rolling_beta(stock_rets: np.ndarray, market_rets: np.ndarray,
                   dates: list, window: int = 60):
    """Compute rolling beta series."""
    n = len(stock_rets)
    betas = []
    for i in range(n):
        if i < window - 1:
            betas.append(None)
            continue
        s = stock_rets[i - window + 1: i + 1]
        m = market_rets[i - window + 1: i + 1]
        if np.std(m) == 0:
            betas.append(None)
            continue
        b, _, _, _, _ = stats.linregress(m, s)
        betas.append(round(float(b), 4))
    return [{"date": d, "beta": b} for d, b in zip(dates, betas)]


# ── Main ───────────────────────────────────────────────────────────────────────

def analyze_factors(df: pd.DataFrame) -> dict:
    """
    CAPM factor analysis for a single stock.
    Uses 沪深300 as the primary market proxy.
    Also computes correlations against SSE 50 and ChiNext.
    """
    closes = np.array(df["close"].tolist(), dtype=float)
    dates = df["date"].tolist()
    n = len(closes)

    if n < 30:
        return {"error": "Insufficient data for factor analysis"}

    stock_log_rets = np.diff(np.log(closes))

    # Dates from stock df may be "YYYYMMDD" or "YYYY-MM-DD"; normalise to "YYYY-MM-DD"
    def _to_dash(d):
        d = str(d).replace("-", "")
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"

    stock_dates = [_to_dash(d) for d in dates[1:]]  # aligned with log_rets
    start_date_dash = _to_dash(dates[0])
    end_date_dash   = _to_dash(dates[-1])

    # ── Primary market proxy: CSI 300 ─────────────────────────────────────────
    mkt_dates, mkt_rets = _fetch_index_returns(INDICES["sh000300"]["tx"], start_date_dash, end_date_dash)
    if mkt_rets is None or len(mkt_rets) < 20:
        return {"error": "Could not fetch market index data for factor analysis"}

    # Align by date
    stock_date_set = dict(zip(stock_dates, stock_log_rets))
    common_dates = [d for d in mkt_dates if d in stock_date_set]
    if len(common_dates) < 20:
        return {"error": "Insufficient overlapping trading days with market index"}

    mkt_date_set = dict(zip(mkt_dates, mkt_rets))
    mkt_aligned  = np.array([mkt_date_set[d] for d in common_dates])
    stk_aligned  = np.array([stock_date_set[d] for d in common_dates])

    capm = _capm(stk_aligned, mkt_aligned)
    beta  = capm["beta"]
    alpha_daily = capm["alpha_daily"]

    # Annualise alpha
    alpha_annual = round(float(alpha_daily * TRADING_DAYS * 100), 4)  # in %

    # Performance metrics
    stk_ann_ret  = float(np.mean(stk_aligned) * TRADING_DAYS)
    stk_ann_vol  = float(np.std(stk_aligned) * np.sqrt(TRADING_DAYS))
    mkt_ann_ret  = float(np.mean(mkt_aligned) * TRADING_DAYS)
    rf_daily     = RISK_FREE_ANNUAL / TRADING_DAYS

    treynor = round((stk_ann_ret - RISK_FREE_ANNUAL) / beta, 4) if beta != 0 else None
    tracking_error = float(np.std(stk_aligned - mkt_aligned) * np.sqrt(TRADING_DAYS))
    info_ratio = round(alpha_daily * TRADING_DAYS / tracking_error, 4) \
                 if tracking_error > 0 else None

    # Systematic vs idiosyncratic variance decomposition
    residuals = stk_aligned - (alpha_daily + beta * mkt_aligned)
    var_total = float(np.var(stk_aligned))
    var_systematic   = float(beta ** 2 * np.var(mkt_aligned))
    var_idiosyncratic = float(np.var(residuals))
    pct_systematic   = round(var_systematic / var_total * 100, 1) if var_total > 0 else 0
    pct_idiosyncratic = round(var_idiosyncratic / var_total * 100, 1) if var_total > 0 else 0

    # ── Rolling beta (60-day) ──────────────────────────────────────────────────
    rolling = _rolling_beta(stk_aligned, mkt_aligned, common_dates, window=60)

    # ── Correlations with other indices ───────────────────────────────────────
    correlations = {}
    for idx_sym, idx_names in INDICES.items():
        idates, irets = _fetch_index_returns(idx_names["tx"], start_date_dash, end_date_dash)
        if irets is None:
            correlations[idx_sym] = {"zh": idx_names["zh"], "en": idx_names["en"],
                                     "correlation": None, "beta": None}
            continue
        common = [d for d in idates if d in stock_date_set]
        if len(common) < 20:
            correlations[idx_sym] = {"zh": idx_names["zh"], "en": idx_names["en"],
                                     "correlation": None, "beta": None}
            continue
        idate_set = dict(zip(idates, irets))
        ialigned = np.array([idate_set[d] for d in common])
        saligned = np.array([stock_date_set[d] for d in common])
        corr = float(np.corrcoef(saligned, ialigned)[0, 1])
        b, _, _, _, _ = stats.linregress(ialigned, saligned)
        correlations[idx_sym] = {
            "zh": idx_names["zh"],
            "en": idx_names["en"],
            "correlation": round(corr, 4),
            "beta": round(float(b), 4),
        }

    # ── Interpretation ────────────────────────────────────────────────────────
    interpretation = _generate_interpretation(
        beta, alpha_annual, capm["r_squared"], treynor, info_ratio,
        pct_systematic, stk_ann_ret, mkt_ann_ret
    )

    return {
        "beta": capm["beta"],
        "alpha_annual_pct": alpha_annual,
        "r_squared": capm["r_squared"],
        "beta_se": capm["beta_se"],
        "treynor_ratio": treynor,
        "information_ratio": info_ratio,
        "tracking_error_pct": round(tracking_error * 100, 4),
        "ann_return_pct": round(stk_ann_ret * 100, 2),
        "mkt_ann_return_pct": round(mkt_ann_ret * 100, 2),
        "ann_vol_pct": round(stk_ann_vol * 100, 2),
        "pct_systematic": pct_systematic,
        "pct_idiosyncratic": pct_idiosyncratic,
        "rolling_beta": rolling,
        "correlations": correlations,
        "interpretation": interpretation,
        "sample_days": len(common_dates),
    }


def _generate_interpretation(beta, alpha_ann, r2, treynor, ir,
                               pct_sys, stk_ret, mkt_ret) -> dict:
    zh_lines = []
    en_lines = []

    # Beta commentary
    if beta < 0.5:
        beta_zh = f"Beta **{beta:.2f}** 偏低，该股票相对大盘走势较为独立，系统性风险较小。"
        beta_en = f"Beta **{beta:.2f}** is low — this stock moves relatively independently from the market, implying lower systematic risk."
    elif beta < 1.0:
        beta_zh = f"Beta **{beta:.2f}** 小于1，股票波动幅度低于大盘，防御性较强。"
        beta_en = f"Beta **{beta:.2f}** < 1 — the stock is less volatile than the market, with a defensive character."
    elif beta < 1.5:
        beta_zh = f"Beta **{beta:.2f}** 略高于1，股票与大盘同向波动，进攻性适中。"
        beta_en = f"Beta **{beta:.2f}** slightly above 1 — the stock amplifies market moves moderately."
    else:
        beta_zh = f"Beta **{beta:.2f}** 明显高于1，该股票对市场波动高度敏感，风险较高。"
        beta_en = f"Beta **{beta:.2f}** is significantly above 1 — the stock is highly sensitive to market swings."
    zh_lines.append(beta_zh)
    en_lines.append(beta_en)

    # Alpha commentary
    if alpha_ann > 5:
        alpha_zh = f"年化Alpha **{alpha_ann:+.2f}%**，在剔除市场因子后，股票仍有显著的超额收益。"
        alpha_en = f"Annualized alpha **{alpha_ann:+.2f}%** — significant excess return above market risk after adjusting for beta."
    elif alpha_ann > 0:
        alpha_zh = f"年化Alpha **{alpha_ann:+.2f}%**，存在小幅正向超额收益。"
        alpha_en = f"Annualized alpha **{alpha_ann:+.2f}%** — modest positive excess return."
    else:
        alpha_zh = f"年化Alpha **{alpha_ann:+.2f}%**，在风险调整后未能跑赢市场。"
        alpha_en = f"Annualized alpha **{alpha_ann:+.2f}%** — underperformed on a risk-adjusted basis."
    zh_lines.append(alpha_zh)
    en_lines.append(alpha_en)

    # R² commentary
    if r2 > 0.7:
        r2_zh = f"R² = **{r2:.2f}**，股价走势与大盘高度相关，主要由系统性因素驱动。"
        r2_en = f"R² = **{r2:.2f}** — price moves are highly explained by the market factor; stock is largely market-driven."
    elif r2 > 0.4:
        r2_zh = f"R² = **{r2:.2f}**，股价与大盘中度相关，兼具系统性与个股特质。"
        r2_en = f"R² = **{r2:.2f}** — moderate market correlation; both systematic and idiosyncratic factors are at play."
    else:
        r2_zh = f"R² = **{r2:.2f}**，股价走势与大盘相关性较低，个股特质因素主导。"
        r2_en = f"R² = **{r2:.2f}** — low market correlation; stock behaviour is mostly driven by company-specific factors."
    zh_lines.append(r2_zh)
    en_lines.append(r2_en)

    # Excess return vs market
    excess = stk_ret * 100 - mkt_ret * 100
    if excess > 5:
        exc_zh = f"区间内股票年化收益较沪深300超出 **{excess:+.1f}%**，表现优于大盘。"
        exc_en = f"The stock outperformed CSI 300 by **{excess:+.1f}%** annualised over the period."
    elif excess < -5:
        exc_zh = f"区间内股票年化收益较沪深300落后 **{excess:+.1f}%**，跑输大盘。"
        exc_en = f"The stock underperformed CSI 300 by **{abs(excess):.1f}%** annualised over the period."
    else:
        exc_zh = f"股票年化收益与沪深300基本持平（差距 {excess:+.1f}%）。"
        exc_en = f"Stock return was broadly in line with CSI 300 ({excess:+.1f}% annualised difference)."
    zh_lines.append(exc_zh)
    en_lines.append(exc_en)

    return {"zh": "\n\n".join(zh_lines), "en": "\n\n".join(en_lines)}
