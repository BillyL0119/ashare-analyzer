"""
From factor scores to a portfolio an individual could hold, tested walk-forward (2005-2026, large-cap universe).

Run from backend/:  .venv/bin/python -m research.portfolio_study

Each step is added on top of the previous one and every step is reported (picking only the best-looking variant
would be overfitting again):
  A  baseline       factors chosen each January (IC t >= 2 on earlier data), equal-weight mean of percentile ranks,
                    top fifth (~200 names), monthly
  B  + sector       ranks taken within each sector, so value does not just mean "own banks and energy"
  C  + IC weights   factors weighted by their average IC on earlier data instead of equally
  D  + quarterly    rebalance every 3 months and keep a holding while it stays in the top 30% (cuts trading)
  E  + 50 names     hold the best 50 instead of ~200 (what a person can actually manage)
  F  + trend rule   hold cash in any month that starts with the large-cap index below its 10-month average
                    (a fixed textbook rule, not fitted here; cash earns 0, so this is conservative)
Benchmarks: equal-weight large universe and market-cap-weighted large universe (about the S&P 500).
"""
import json
import math
import os
import sys

import numpy as np

from research.factor_study import COST, annual, max_drawdown, rank_pct, run, tstat
from research.sharadar_data import COMPACT

FIRST_YEAR = 2005


def choose(books, universe, year, threshold=2.0):
    """Factors whose IC t-stat on months before `year` clears the threshold, with their mean IC (weights)."""
    out = {}
    for f in [f for (u, f) in books if u == universe]:
        b = books[(universe, f)]
        ics = [ic for ic, m in zip(b.ic, b.month) if m < year * 10000]
        t = tstat(ics)
        if t is not None and t >= threshold:
            out[f] = max(float(np.nanmean(ics)), 1e-6)
    return out


def composite(signed, elig, factors, sector_codes, sector_neutral, ic_weights):
    acc = np.zeros(len(elig))
    wsum = np.zeros(len(elig))
    for f, ic in factors.items():
        s = np.where(elig, signed[f], np.nan)
        if sector_neutral:
            r = np.full(len(s), np.nan)
            for code in np.unique(sector_codes[elig]):
                m = elig & (sector_codes == code)
                if m.sum() >= 5:
                    r[m] = rank_pct(s[m])
        else:
            r = rank_pct(s)
        w = ic if ic_weights else 1.0
        ok = np.isfinite(r)
        acc[ok] += w * r[ok]
        wsum[ok] += w
    total = sum(factors.values()) if ic_weights else len(factors)
    score = np.where(wsum >= 0.5 * total, acc / np.maximum(wsum, 1e-12), np.nan)   # needs half the evidence
    return score


def market_returns(months):
    """Cap-weighted large-cap return of every month in `months` (no start-year cut)."""
    out = []
    for month, liquid, large, signed, later in months:
        mc = np.exp(-signed["size"])
        w = np.where(large & np.isfinite(mc), mc, 0.0)
        out.append(float(np.nansum(w * np.nan_to_num(later)) / w.sum()))
    return out


def simulate(books, months, sector_codes, *, sector_neutral, ic_weights, every, keep_pct, n_names, trend, cash_flags,
             weighting="equal", sector_cap=None, vol_target=None, mkt=None, rf=None, cost_rate=None):
    """weighting "inv_vol": weights proportional to 1 / 12-month volatility, set at each rebalance.
    sector_cap: at most this share of the names from one sector. vol_target (annual, e.g. 0.15): when the market's
    volatility over the previous 6 months is above it, hold only target/realised of the portfolio, rest in cash.
    rf: cash return of each month (aligned with `months`); cash earns nothing when it is None.
    cost_rate: cost per one-way trade (default COST, 10 bp)."""
    cost_rate = COST if cost_rate is None else cost_rate
    held, out, turns, chosen_log = set(), [], [], {}
    weights = {}
    since_reb = None
    for k, (month, liquid, large, signed, later) in enumerate(months):
        y = month // 10000
        if y < FIRST_YEAR:
            continue
        if y not in chosen_log:
            chosen_log[y] = choose(books, "large", y)
        elig = large
        held = {h for h in held if np.isfinite(later[h])}            # stopped trading before: already counted
        if since_reb is None or since_reb >= every:
            score = composite(signed, elig, chosen_log[y], sector_codes, sector_neutral, ic_weights)
            idx = np.where(elig & np.isfinite(score))[0]
            order = idx[np.argsort(-score[idx], kind="stable")]
            n = n_names or max(1, int(round(len(idx) * 0.2)))
            keep_cut = set(order[: max(n, int(len(idx) * keep_pct))].tolist()) if keep_pct else set()
            cap = int(np.ceil(n * sector_cap)) if sector_cap else n
            per = {}
            new = []

            def take(h):
                c = sector_codes[h]
                if per.get(c, 0) >= cap:
                    return
                per[c] = per.get(c, 0) + 1
                new.append(int(h))
            for h in [h for h in order if h in held and h in keep_cut]:
                if len(new) < n:
                    take(h)
            for h in order:
                if len(new) >= n:
                    break
                if h not in new:
                    take(h)
            new = set(new)
            if weighting == "inv_vol":
                vol = -signed["low_vol"]
                med = np.nanmedian(vol[list(new)]) if new else np.nan
                raw_w = {h: 1.0 / (vol[h] if np.isfinite(vol[h]) and vol[h] > 0 else med) for h in new}
            else:
                raw_w = {h: 1.0 for h in new}
            weights = raw_w
            sold = len(held - new) / len(held) if held else 0.0
            bought = len(new - held) / len(new) if new else 0.0
            cost = (sold + bought) * cost_rate
            turns.append((sold + bought) / 2)
            held, since_reb = new, 0
        else:
            cost = 0.0
        since_reb += 1
        if held:
            w = np.array([weights.get(h, 0.0) for h in held])
            w = w / w.sum() if w.sum() > 0 else np.full(len(held), 1.0 / len(held))
            r = float(np.dot(w, later[list(held)]))
        else:
            r = 0.0
        exposure = 1.0
        if vol_target and mkt is not None and k >= 6:
            realised = float(np.std(mkt[k - 6:k], ddof=1) * np.sqrt(12))
            exposure = min(1.0, vol_target / realised) if realised > 0 else 1.0
        if trend and cash_flags[k]:
            exposure = 0.0
        cash = rf[k] if rf is not None else 0.0
        r = exposure * r + (1 - exposure) * cash - cost
        out.append((month, r))
    return out, turns


def stats(series, bench_ew, bench_cw):
    m = np.array([r for _, r in series])
    ew = np.array(bench_ew)
    cw = np.array(bench_cw)
    ex_cw = m - cw
    vol = float(np.std(m, ddof=1) * math.sqrt(12)) * 100
    years = {}
    for (month, r), c in zip(series, cw):
        years.setdefault(month // 10000, [[], []])
        years[month // 10000][0].append(r)
        years[month // 10000][1].append(c)
    behind = sum(1 for a, b in years.values() if np.prod(1 + np.array(a)) < np.prod(1 + np.array(b)))
    return {"cagr": annual(m), "vol": round(vol, 1), "max_drawdown": max_drawdown(m),
            "return_per_risk": round(annual(m) / vol, 2),
            "vs_equal_weight": round(annual(m) - annual(ew), 2),
            "vs_cap_weight": round(annual(m) - annual(cw), 2), "t_vs_cap_weight": tstat(ex_cw),
            "years_behind_cap_weight": f"{behind}/{len(years)}"}


STEPS = [
    ("A baseline", dict(sector_neutral=False, ic_weights=False, every=1, keep_pct=0, n_names=None, trend=False)),
    ("B +sector-neutral", dict(sector_neutral=True, ic_weights=False, every=1, keep_pct=0, n_names=None, trend=False)),
    ("C +IC weights", dict(sector_neutral=True, ic_weights=True, every=1, keep_pct=0, n_names=None, trend=False)),
    ("D +quarterly, keep top30%", dict(sector_neutral=True, ic_weights=True, every=3, keep_pct=0.3, n_names=None, trend=False)),
    ("E +50 names", dict(sector_neutral=True, ic_weights=True, every=3, keep_pct=0.3, n_names=50, trend=False)),
    ("F +trend rule (cash)", dict(sector_neutral=True, ic_weights=True, every=3, keep_pct=0.3, n_names=50, trend=True)),
]


def sector_codes_of(panel):
    names = panel.sec.sector.fillna("Unknown").values
    labels, codes = np.unique(names, return_inverse=True)
    return labels, codes


def benchmarks(months):
    """Equal- and cap-weighted large universe from FIRST_YEAR, the cap-weighted index level for every month, and
    the trend flag (index below its 10-month average) known at the START of each month."""
    ew, cw = [], []
    level, levels, flags, dates = 1.0, [], [], []
    for month, liquid, large, signed, later in months:
        mc = np.exp(-signed["size"])                                   # size score is -log(market cap)
        w = np.where(large & np.isfinite(mc), mc, 0.0)
        c = float(np.nansum(w * np.nan_to_num(later)) / w.sum())
        flags.append(len(levels) >= 10 and levels[-1] < np.mean(levels[-10:]))
        level *= 1 + c
        levels.append(level)
        dates.append(month)
        if month // 10000 >= FIRST_YEAR:
            ew.append(float(np.mean(later[large])))
            cw.append(c)
    return ew, cw, flags, levels, dates


def index_trend(months, flags, mkt, rf, since=FIRST_YEAR * 10000):
    """The index, or cash at the T-bill rate in months that start below the 10-month average."""
    return [(m[0], (rf[i] if rf is not None else 0.0) if flags[i] else mkt[i])
            for i, m in enumerate(months) if m[0] >= since]


def yearly(series, bench):
    out = {}
    for (month, r), b in zip(series, bench):
        y = out.setdefault(int(month // 10000), [1.0, 1.0])
        y[0] *= 1 + r
        y[1] *= 1 + b
    return {y: {"strategy": round((a - 1) * 100, 1), "index": round((b - 1) * 100, 1),
                "difference": round((a - b) * 100, 1)} for y, (a, b) in out.items()}


def evaluate(books, months, sector_codes, rf=None):
    ew, cw, flags, levels, dates = benchmarks(months)
    report = {"first_year": FIRST_YEAR,
              "benchmarks": {"equal_weight": {"cagr": annual(ew), "max_drawdown": max_drawdown(ew)},
                             "cap_weight": {"cagr": annual(cw), "max_drawdown": max_drawdown(cw),
                                            "vol": round(float(np.std(cw, ddof=1) * math.sqrt(12)) * 100, 1)}},
              "steps": {}, "by_year": {}}
    for name, kw in STEPS:
        series, turns = simulate(books, months, sector_codes, cash_flags=flags, rf=rf, **kw)
        st = stats(series, ew, cw)
        st["turnover_per_rebalance"] = round(float(np.mean(turns)) * 100, 1)
        st["rebalances_per_year"] = 12 // kw["every"]
        report["steps"][name] = st
        if name.startswith(("E", "F")):
            report["by_year"][name] = yearly(series, cw)
    return report, {"levels": levels, "dates": dates, "flags": flags}


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _ = run()
    from research.sharadar_data import Panel
    _, sector_codes = sector_codes_of(Panel())
    report, _ = evaluate(books, months, sector_codes)
    b = report["benchmarks"]
    print(f"\nlarge-cap universe, walk-forward {FIRST_YEAR}-2026, after 10 bp per one-way trade")
    print(f"benchmarks: equal-weight {b['equal_weight']['cagr']:.1f}%/yr (max DD {b['equal_weight']['max_drawdown']}%), "
          f"cap-weight {b['cap_weight']['cagr']:.1f}%/yr (max DD {b['cap_weight']['max_drawdown']}%)\n")
    print(f"{'step':28} {'CAGR':>6} {'vol':>6} {'maxDD':>7} {'ret/risk':>8} {'vs EW':>6} {'vs CW':>6} {'t':>5} "
          f"{'yrs behind CW':>13} {'turnover':>8}")
    for name, s in report["steps"].items():
        print(f"{name:28} {s['cagr']:6.1f} {s['vol']:6.1f} {s['max_drawdown']:7.1f} {s['return_per_risk']:8.2f} "
              f"{s['vs_equal_weight']:+6.1f} {s['vs_cap_weight']:+6.1f} {s['t_vs_cap_weight']:5.2f} "
              f"{s['years_behind_cap_weight']:>13} {s['turnover_per_rebalance']:7.1f}%")
    path = os.path.join(COMPACT, "..", "reports")
    with open(os.path.join(path, "portfolio_study.json"), "w") as fh:
        json.dump(report, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())
