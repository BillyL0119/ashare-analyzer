"""
The one final test on the held-out months (Nov 2020 .. Nov 2026). Run it once; do not change a candidate after
seeing this and run it again (that turns the hold-out into more development data).

    .venv/bin/python -m research.holdout_test          (from backend/)

Candidates were fixed on the development period (research/improve_study.py, risk_study) before this was run:
  index                          cap-weighted large caps (about the S&P 500)
  index + trend rule             cash in a month that starts with the index below its 10-month average
  model (step E)                 50 names, factors re-chosen each January from earlier data, quarterly with buffer
  model + inv-vol + sector + trend   the same with 1/volatility weights, max 25% per sector and the trend rule
Factor selection inside the hold-out still only uses months before each January (walk-forward), as before.
"""
import json
import os
import sys
import time

from research.factor_study import run
from research.improve_study import DEV_END, TRIALS_LOG
from research.portfolio_study import STEPS, benchmarks, market_returns, sector_codes_of, simulate, stats
from research.sharadar_data import COMPACT


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _ = run()
    from research.sharadar_data import Panel
    _, codes = sector_codes_of(Panel())
    ew_all, cw_all, flags_all, _, _ = benchmarks(months)
    mkt = market_returns(months)
    hold = [i for i, m in enumerate(months) if m[0] >= DEV_END]
    first = hold[0]
    sub = lambda seq: [seq[i] for i in hold]                       # noqa: E731
    cw = sub(mkt)
    ew = [float(sum(m[4][m[2]]) / m[2].sum()) for m in sub(months)]
    base = dict(STEPS)["E +50 names"]
    out = {"period": f"{months[first][0]} .. {months[-1][0]}", "months": len(hold), "ran_at": time.strftime("%Y-%m-%d %H:%M"),
           "trials_before": len(json.load(open(TRIALS_LOG))) if os.path.exists(TRIALS_LOG) else None, "results": {}}
    rows = {
        "index": [(months[i][0], mkt[i]) for i in hold],
        "index + trend rule": [(months[i][0], 0.0 if flags_all[i] else mkt[i]) for i in hold],
    }
    # the model needs its history (held names, previous rebalance) so it runs from 2005 and is cut to the hold-out
    for name, kw in (("model (step E)", {}),
                     ("model + inv-vol + sector + trend", {"weighting": "inv_vol", "sector_cap": 0.25, "trend": True})):
        series, _ = simulate(books, months, codes, cash_flags=flags_all, mkt=mkt, **{**base, **kw})
        rows[name] = [s for s in series if s[0] >= DEV_END]
    print(f"HOLD-OUT {out['period']} ({len(hold)} months), large caps, after trading costs; cash earns 0")
    print(f"{'candidate':34} {'CAGR':>6} {'vol':>6} {'maxDD':>7} {'ret/risk':>8} {'vs index':>8} {'t':>6} {'yrs behind':>10}")
    for name, series in rows.items():
        st = stats(series, ew, cw)
        out["results"][name] = st
        print(f"{name:34} {st['cagr']:6.1f} {st['vol']:6.1f} {st['max_drawdown']:7.1f} {st['return_per_risk']:8.2f} "
              f"{st['vs_cap_weight']:+8.1f} {st['t_vs_cap_weight'] if st['t_vs_cap_weight'] is not None else float('nan'):6.2f} "
              f"{st['years_behind_cap_weight']:>10}")
    path = os.path.join(COMPACT, "..", "reports", "holdout_test.json")
    if os.path.exists(path):
        print("\nNOTE: a hold-out result already existed; this run was saved separately and should not be used to pick.")
        path = path.replace(".json", f"_rerun_{time.strftime('%Y%m%d%H%M')}.json")
    with open(path, "w") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())
