"""
The one mid-cap test (decided with Billy beforehand: run once on the development period, then stop optimising).

    .venv/bin/python -m research.midcap_study          (from backend/)

Rules fixed before running:
  universe   price >= $5, 60-day average dollar volume >= $5M, the 2000 largest after the 1000 large caps
             (market-cap ranks 1001-3000 among those liquid stocks)
  method     the desk's model unchanged: factors re-chosen each January from earlier mid-cap months only (IC t >= 2),
             IC-weighted within-sector composite, top 50 equal weight, quarterly, keep while in the top 30%
  cost       25 bp per one-way trade (2.5x the large-cap assumption: wider spreads)
  compared   mid-cap cap-weighted index (about the S&P 400) and the large-cap cap-weighted index (about the S&P 500)
  period     development only, 2005-01 .. 2020-10; cash earns the 3-month T-bill rate in the trend-rule variant
"""
import json
import math
import os
import sys

import numpy as np

from research.factor_study import FACTORS, Book, annual, max_drawdown, tstat
from research.improve_study import DEV_END, log_trial
from research.portfolio_study import STEPS, market_returns, sector_codes_of, simulate
from research.sharadar_data import COMPACT

MID_RANKS = (1000, 3000)
COST_MID = 25 / 10_000


def mid_mask(liquid, large, signed):
    mc = np.exp(-signed["size"])
    pool = liquid & ~large & np.isfinite(mc)
    idx = np.where(pool)[0]
    order = idx[np.argsort(-mc[idx])]
    keep = order[: MID_RANKS[1] - MID_RANKS[0]]
    m = np.zeros(len(liquid), dtype=bool)
    m[keep] = True
    return m


def cap_weighted(months, masks):
    out = []
    for (month, liquid, large, signed, later), m in zip(months, masks):
        mc = np.exp(-signed["size"])
        w = np.where(m & np.isfinite(mc), mc, 0.0)
        out.append(float(np.nansum(w * np.nan_to_num(later)) / w.sum()))
    return out


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    from research.factor_study import run
    books, months, _ = run()
    months = [m for m in months if m[0] < DEV_END]
    masks = [mid_mask(m[1], m[2], m[3]) for m in months]
    print(f"mid-cap universe: {int(np.mean([x.sum() for x in masks]))} stocks on average")

    # factor records inside the mid-cap universe (the walk-forward picks factors from these)
    mid_books = {("large", f): Book() for f in FACTORS}            # key "large" = the universe simulate() uses
    for (month, liquid, large, signed, later), m in zip(months, masks):
        for f in FACTORS:
            mid_books[("large", f)].add(signed[f], m, later, month)
    print("\nfactor IC in mid caps, development period (t >= 2 marked *)")
    rows = []
    for f in FACTORS:
        s = mid_books[("large", f)].summary(until=DEV_END)
        large_s = books[("large", f)].summary(until=DEV_END)
        if s:
            rows.append((s["ic_t"] or 0, f, s, large_s))
    for t, f, s, ls in sorted(rows, reverse=True):
        print(f"  {f:18} mid IC {s['ic_mean']:6.3f} t {t:5.2f}{' *' if t >= 2 else '  '}   (large caps: IC {ls['ic_mean']:6.3f} t {ls['ic_t']:5.2f})")

    # the model run in mid caps: swap the mid-cap mask into the slot simulate() reads as its universe
    mid_months = [(m[0], m[1], mk, m[3], m[4]) for m, mk in zip(months, masks)]
    _, codes = sector_codes_of(__import__("research.sharadar_data", fromlist=["Panel"]).Panel())
    from research.rates import monthly_cash_returns
    rf = monthly_cash_returns([m[0] for m in months])
    mid_idx = cap_weighted(months, masks)
    large_idx = market_returns(months)
    levels, flags = [], []
    level = 1.0
    for r in large_idx:                     # trend rule on the large-cap index, as on the desk
        flags.append(len(levels) >= 10 and levels[-1] < np.mean(levels[-10:]))
        level *= 1 + r
        levels.append(level)
    base = dict(STEPS)["E +50 names"]
    sel = [i for i, m in enumerate(months) if m[0] >= 20050101]
    mid_b = [mid_idx[i] for i in sel]
    large_b = [large_idx[i] for i in sel]
    ew = [float(np.mean(months[i][4][masks[i]])) for i in sel]
    out = {"universe_avg_size": int(np.mean([x.sum() for x in masks])), "cost_bp": 25, "period": "2005-01 .. 2020-10"}
    print(f"\nDEVELOPMENT 2005-01 .. 2020-10, after {COST_MID * 1e4:.0f} bp per one-way trade")
    print(f"{'':34} {'CAGR':>6} {'vol':>6} {'maxDD':>7} {'ret/risk':>8} {'vs mid idx':>10} {'t':>5} {'vs S&P-like':>11} {'t':>5}")

    def line(name, series):
        r = np.array([x[1] for x in series])
        a_mid, a_large = r - np.array(mid_b), r - np.array(large_b)
        vol = float(np.std(r, ddof=1) * math.sqrt(12)) * 100
        st = {"cagr": annual(r), "vol": round(vol, 1), "max_drawdown": max_drawdown(r),
              "return_per_risk": round(annual(r) / vol, 2),
              "vs_mid_index": round(annual(r) - annual(mid_b), 2), "t_vs_mid": tstat(a_mid),
              "vs_large_index": round(annual(r) - annual(large_b), 2), "t_vs_large": tstat(a_large)}
        out[name] = st
        print(f"{name:34} {st['cagr']:6.1f} {st['vol']:6.1f} {st['max_drawdown']:7.1f} {st['return_per_risk']:8.2f} "
              f"{st['vs_mid_index']:+10.1f} {st['t_vs_mid'] or 0:5.2f} {st['vs_large_index']:+11.1f} {st['t_vs_large'] or 0:5.2f}")
        return st

    line("mid-cap index (cap-weighted)", [(months[i][0], mid_idx[i]) for i in sel])
    line("mid-cap equal weight", [(months[i][0], e) for i, e in zip(sel, ew)])
    line("large-cap index (S&P 500-like)", [(months[i][0], large_idx[i]) for i in sel])
    series, _ = simulate(mid_books, mid_months, codes, cash_flags=flags, rf=rf, cost_rate=COST_MID, **base)
    st = line("model in mid caps (50 names)", series)
    log_trial("dev mid-cap model (one-off test)", st)
    series_t, _ = simulate(mid_books, mid_months, codes, cash_flags=flags, rf=rf, cost_rate=COST_MID,
                           **{**base, "trend": True})
    st_t = line("model in mid caps + trend rule", series_t)
    log_trial("dev mid-cap model + trend (one-off test)", st_t)
    # year by year against the large-cap index
    yrs = {}
    for (m, r), b in zip(series, large_b):
        y = yrs.setdefault(m // 10000, [1.0, 1.0])
        y[0] *= 1 + r
        y[1] *= 1 + b
    behind = sum(1 for a, b in yrs.values() if a < b)
    print(f"\nmodel in mid caps vs the S&P 500-like index: behind in {behind} of {len(yrs)} years")
    out["years_behind_large_index"] = f"{behind}/{len(yrs)}"
    with open(os.path.join(COMPACT, "..", "reports", "midcap_study.json"), "w") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())
