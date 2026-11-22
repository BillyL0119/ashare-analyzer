"""
Factor lab: rank stocks by a rule ("a factor") and test the rule on ten years of real prices.

Only numpy, so the unit tests run in the small CI environment. Everything here is a pure function of price
bars; routers/factors.py supplies the bars and the universe.

What is tested (and what is not):
  - momentum  = return from 12 months ago to 1 month ago (the latest month is skipped on purpose: it tends to
                reverse), known on the rebalance day, so the test never uses the future.
  - low_vol   = minus the standard deviation of daily returns over the last 12 months.
  - value     = earnings yield (1 / P/E). It needs the P/E of each past date, which free sources do not give,
                so it is only ranked as of today and never back-tested.
The back-test buys the top fraction of the universe on the last trading day of each month, equal weight, holds one
month, pays a cost on every share traded, and compares with the bottom fraction, all stocks equal weight and
the S&P 500 fund.

Known weaknesses, shown to the reader: the universe is today's S&P 500 (companies that fell out of it or were
delisted are missing: survivorship bias flatters every result), prices are not dividend-adjusted, and the
cost is a flat assumption.
"""

import math

import numpy as np

LOOKBACK = 252          # trading days in the momentum / volatility window
SKIP = 21               # the most recent month is left out of momentum
MIN_BARS = 260          # a stock needs this many bars to be ranked
FACTORS = ("momentum", "low_vol")


def build_matrix(histories: dict, calendar_sym: str = "SPY"):
    """({sym: [{"date", "close"}, ...]}) -> (dates, symbols, closes[dates x symbols]) on the calendar of
    `calendar_sym` (every US trading day). A date a stock has no bar for stays NaN; stocks with too few bars
    are left out."""
    cal = histories.get(calendar_sym) or []
    dates = [b["date"] for b in cal]
    if not dates:
        return [], [], np.zeros((0, 0))
    pos = {d: i for i, d in enumerate(dates)}
    syms = [s for s, bars in histories.items() if s != calendar_sym and len(bars) >= MIN_BARS]
    syms = sorted(syms)
    closes = np.full((len(dates), len(syms) + 1), np.nan)
    for j, s in enumerate([calendar_sym] + syms):
        for b in histories[s]:
            i = pos.get(b["date"])
            if i is not None and b.get("close"):
                closes[i, j] = float(b["close"])
    return dates, [calendar_sym] + syms, closes


def month_ends(dates: list) -> list:
    """Index of the last trading day of each calendar month (the rebalance days), oldest first."""
    out = []
    for i, d in enumerate(dates):
        if i + 1 == len(dates) or dates[i + 1][:7] != d[:7]:
            out.append(i)
    return out


def signal(closes: np.ndarray, i: int, factor: str) -> np.ndarray:
    """The factor value of every column at row i (NaN where it cannot be computed). Higher is better."""
    n = closes.shape[1]
    out = np.full(n, np.nan)
    if i < LOOKBACK:
        return out
    if factor == "momentum":
        a, b = closes[i - LOOKBACK], closes[i - SKIP]
        with np.errstate(invalid="ignore", divide="ignore"):
            out = b / a - 1.0
        out[~np.isfinite(out)] = np.nan
    elif factor == "low_vol":
        window = closes[i - LOOKBACK:i + 1]
        with np.errstate(invalid="ignore", divide="ignore"):
            rets = window[1:] / window[:-1] - 1.0
        rets[~np.isfinite(rets)] = np.nan
        valid = np.sum(~np.isnan(rets), axis=0)
        sd = np.full(n, np.nan)
        ok = valid >= 200
        if ok.any():
            sd[ok] = np.nanstd(rets[:, ok], axis=0, ddof=1)
        out = -sd
    else:
        raise ValueError(f"unknown factor {factor}")
    return out


def _pick(sig: np.ndarray, eligible: np.ndarray, frac: float, top: bool) -> np.ndarray:
    idx = np.where(eligible & ~np.isnan(sig))[0]
    if len(idx) == 0:
        return idx
    k = max(1, int(round(len(idx) * frac)))
    order = idx[np.argsort(sig[idx])]            # ascending
    return order[-k:] if top else order[:k]


def _stats(rets: np.ndarray, turnover: np.ndarray = None) -> dict:
    """Monthly returns -> headline numbers."""
    n = len(rets)
    if n == 0:
        return {}
    curve = np.cumprod(1 + rets)
    years = n / 12.0
    cagr = curve[-1] ** (1 / years) - 1 if curve[-1] > 0 else -1.0
    vol = float(np.std(rets, ddof=1) * math.sqrt(12)) if n > 1 else None
    peak = np.maximum.accumulate(np.concatenate([[1.0], curve]))[1:]
    max_dd = float(np.min(curve / peak - 1))
    out = {"cagr": round(float(cagr) * 100, 2), "vol": round(vol * 100, 2) if vol is not None else None,
           "max_drawdown": round(max_dd * 100, 2),
           "return_per_risk": round(cagr / vol, 2) if vol else None,
           "total_return": round(float(curve[-1] - 1) * 100, 1)}
    if turnover is not None:
        out["turnover"] = round(float(np.mean(turnover)) * 100, 1)
    return out


def backtest(dates: list, symbols: list, closes: np.ndarray, factor: str, frac: float = 0.2,
             cost_bps: float = 10.0) -> dict:
    """Monthly rebalanced, equal-weight top (and bottom) `frac` of the universe by `factor`.

    Returns the monthly dates, growth of 100 for each line, headline numbers, a luck check and the two halves
    of the period. `cost_bps` is charged on each one-way trade (a share sold, a share bought)."""
    if factor not in FACTORS:
        raise ValueError(f"unknown factor {factor}")
    ends = month_ends(dates)
    stock_cols = np.array([j for j, s in enumerate(symbols) if s != "SPY"])
    spy_col = symbols.index("SPY") if "SPY" in symbols else None
    cost = cost_bps / 10_000.0
    months, top_r, bot_r, all_r, spy_r, turn, held, counts = [], [], [], [], [], [], [], []
    prev_top, prev_bot = set(), set()
    for k in range(len(ends) - 1):
        i, j = ends[k], ends[k + 1]
        sig = np.full(closes.shape[1], np.nan)
        s = signal(closes, i, factor)
        sig[stock_cols] = s[stock_cols]
        later = closes[j] / closes[i] - 1.0
        eligible = np.zeros(closes.shape[1], dtype=bool)
        eligible[stock_cols] = True
        eligible &= ~np.isnan(later)
        if eligible.sum() < 30 or np.isnan(sig[eligible]).all():
            continue
        top_idx = _pick(sig, eligible, frac, True)
        bot_idx = _pick(sig, eligible, frac, False)
        if len(top_idx) == 0:
            continue
        top_set, bot_set = set(top_idx.tolist()), set(bot_idx.tolist())

        def trade(prev, now):
            sold = len(prev - now) / len(prev) if prev else 0.0
            bought = len(now - prev) / len(now) if now else 0.0
            return sold, bought
        sold, bought = trade(prev_top, top_set)
        top_r.append(float(np.mean(later[top_idx])) - (sold + bought) * cost)
        bs, bb = trade(prev_bot, bot_set)
        bot_r.append(float(np.mean(later[bot_idx])) - (bs + bb) * cost)
        all_r.append(float(np.mean(later[eligible])))
        spy_r.append(float(later[spy_col]) if spy_col is not None and not np.isnan(later[spy_col]) else float("nan"))
        turn.append((sold + bought) / 2)
        held.append(len(top_idx))
        counts.append(int(eligible.sum()))
        months.append(dates[j])
        prev_top, prev_bot = top_set, bot_set
    n = len(months)
    if n < 24:
        return {"factor": factor, "months": n, "error": "not enough history"}
    top_a, bot_a, all_a = np.array(top_r), np.array(bot_r), np.array(all_r)
    spy_a = np.array(spy_r)
    spy_a = np.where(np.isnan(spy_a), 0.0, spy_a)
    excess = top_a - all_a
    t_stat = float(np.mean(excess) / (np.std(excess, ddof=1) / math.sqrt(n))) if np.std(excess, ddof=1) > 0 else None
    half = n // 2

    def ann(x):
        return round(float((np.prod(1 + x) ** (12 / len(x)) - 1) * 100), 2)

    return {
        "factor": factor, "frac": frac, "cost_bps": cost_bps,
        "start": months[0], "end": months[-1], "months": n,
        "dates": months,
        "curves": {k: [round(float(v) * 100, 2) for v in np.cumprod(1 + a)]
                   for k, a in (("top", top_a), ("bottom", bot_a), ("all", all_a), ("spy", spy_a))},
        "stats": {"top": _stats(top_a, np.array(turn)), "bottom": _stats(bot_a), "all": _stats(all_a),
                  "spy": _stats(spy_a)},
        "luck": {"t_stat": round(t_stat, 2) if t_stat is not None else None,
                 "months_beating_all": round(float(np.mean(excess > 0)) * 100, 1),
                 "avg_monthly_excess": round(float(np.mean(excess)) * 100, 3)},
        "halves": {"first": {"from": months[0], "to": months[half - 1], "excess_annual": ann(top_a[:half]) - ann(all_a[:half])},
                   "second": {"from": months[half], "to": months[-1], "excess_annual": ann(top_a[half:]) - ann(all_a[half:])}},
        "avg_names_held": round(float(np.mean(held)), 1), "avg_universe": round(float(np.mean(counts)), 1),
    }


def percentile_rank(values: np.ndarray) -> np.ndarray:
    """0-100 rank of each value among the finite ones (100 = best), NaN stays NaN."""
    out = np.full(len(values), np.nan)
    ok = ~np.isnan(values)
    if ok.sum() == 0:
        return out
    order = np.argsort(np.argsort(values[ok]))
    out[ok] = order / max(1, ok.sum() - 1) * 100.0
    return out


def rank_today(dates: list, symbols: list, closes: np.ndarray, weights: dict, extra: dict, limit: int = 25) -> list:
    """The best-scoring stocks as of the latest bar. `weights` {factor: weight}; factors are 'momentum',
    'low_vol' and 'value'; `extra` {"value": {sym: earnings_yield}} supplies what prices cannot. A stock needs a
    value for every chosen factor. Score = weighted mean of the percentile ranks (0-100)."""
    i = len(dates) - 1
    cols = [j for j, s in enumerate(symbols) if s != "SPY"]
    per = {}
    raw = {}
    for f, w in weights.items():
        if w <= 0:
            continue
        if f in FACTORS:
            v = signal(closes, i, f)[cols]
        else:
            v = np.array([extra.get(f, {}).get(symbols[j], np.nan) for j in cols], dtype=float)
        raw[f] = v
        per[f] = percentile_rank(v)
    if not per:
        return []
    total = sum(weights[f] for f in per)
    score = sum(per[f] * weights[f] for f in per) / total
    ok = np.ones(len(cols), dtype=bool)
    for f in per:
        ok &= ~np.isnan(per[f])
    idx = np.where(ok)[0]
    idx = idx[np.argsort(-score[idx])][:limit]
    out = []
    for r, k in enumerate(idx, 1):
        j = cols[k]
        out.append({"rank": r, "symbol": symbols[j], "score": round(float(score[k]), 1),
                    "price": round(float(closes[i, j]), 2) if not np.isnan(closes[i, j]) else None,
                    "factors": {f: {"value": round(float(raw[f][k]), 4), "pct": round(float(per[f][k]), 0)} for f in per}})
    return out
