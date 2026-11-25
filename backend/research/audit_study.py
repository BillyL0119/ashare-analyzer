"""
Audit of the back-test itself (2026-11-24): the model's rules stay exactly as they were; only the way the past is
measured is made more realistic, one correction at a time, so each one's effect is visible.

    .venv/bin/python -m research.audit_study        (from backend/; ~15 min, four full factor passes)

Corrections:
  data fix        dollar volume = split-adjusted close x split-adjusted volume (it used the unadjusted close, which
                  overstated the liquidity of stocks that later split: a look-ahead). Already in the compact files
                  when this runs (tools/sharadar_build.py).
  drift           hold the shares between quarterly rebalances (weights drift) and pay for the real traded value,
                  instead of resetting to equal weights every month for free
  next-day trade  scores from the month-end close, trades at the NEXT day's close (you cannot trade on a close you
                  have not seen yet)
  delistings      a stock that stops trading for good under $2 loses another 30% beyond its last price
  costs x2        20 bp per one-way trade instead of 10
Every line reports the development period (2005-01 .. 2020-10) and the hold-out (2020-11 .. 2026-11).
Nothing here is used to pick a model: it only says how far the earlier numbers were too kind.
"""
import json
import os
import sys
import time

from research.factor_study import run
from research.improve_study import DEV_END
from research.portfolio_study import STEPS, benchmarks, market_returns, sector_codes_of, simulate, stats
from research.rates import monthly_cash_returns
from research.sharadar_data import COMPACT, Panel

REPORTS = os.path.join(COMPACT, "..", "reports")
CANDIDATES = {
    "index": None,
    "index + trend rule": None,
    "model (step E)": {},
    "model + inv-vol + sector + trend": {"weighting": "inv_vol", "sector_cap": 0.25, "trend": True},
}


def evaluate(books, months, codes, drift, cost_rate=None):
    rf = monthly_cash_returns([m[0] for m in months])
    _, _, flags, _, _ = benchmarks(months)
    mkt = market_returns(months)
    base = dict(STEPS)["E +50 names"]
    series = {
        "index": [(m[0], mkt[i]) for i, m in enumerate(months)],
        "index + trend rule": [(m[0], rf[i] if flags[i] else mkt[i]) for i, m in enumerate(months)],
    }
    for name, kw in CANDIDATES.items():
        if kw is not None:
            s, _ = simulate(books, months, codes, cash_flags=flags, mkt=mkt, rf=rf, drift=drift, cost_rate=cost_rate,
                            **{**base, **kw})
            series[name] = s
    out = {}
    for period, sel in (("dev", lambda m: 20050101 <= m < DEV_END), ("holdout", lambda m: m >= DEV_END)):
        idx = [i for i, m in enumerate(months) if sel(m[0])]
        keep = {months[i][0] for i in idx}
        cw = [mkt[i] for i in idx]
        ew = [float(months[i][4][months[i][2]].mean()) for i in idx]
        out[period] = {name: stats([x for x in s if x[0] in keep], ew, cw) for name, s in series.items()}
    return out


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    _, codes = sector_codes_of(Panel())
    report = {"ran_at": time.strftime("%Y-%m-%d %H:%M"), "dev_period": "2005-01 .. 2020-10",
              "holdout_period": "2020-11 .. 2026-11", "steps": {}}
    plan = [
        ("1 data fix", dict(lag=0, delist_penalty=0.0), dict(drift=False)),
        ("2 + drift", dict(lag=0, delist_penalty=0.0), dict(drift=True)),
        ("3 + next-day trade", dict(lag=1, delist_penalty=0.0), dict(drift=True)),
        ("4 + delistings", dict(lag=1, delist_penalty=0.3), dict(drift=True)),
        ("5 + costs x2", dict(lag=1, delist_penalty=0.3), dict(drift=True, cost_rate=20 / 10_000)),
    ]
    cache = {}
    for name, run_kw, sim_kw in plan:
        key = tuple(sorted(run_kw.items()))
        if key not in cache:
            print(f"factor pass {run_kw} ...", flush=True)
            books, months, secs = run(**run_kw)
            cache = {key: (books, months)}                 # keep one pass in memory at a time
        books, months = cache[key]
        report["steps"][name] = evaluate(books, months, codes, **sim_kw)
        print(f"\n== {name} ==")
        for period in ("dev", "holdout"):
            for cand, st in report["steps"][name][period].items():
                print(f"  {period:8} {cand:34} {st['cagr']:6.1f}%/yr  DD {st['max_drawdown']:6.1f}  "
                      f"vs index {st['vs_cap_weight']:+5.1f} (t {st['t_vs_cap_weight']})  behind {st['years_behind_cap_weight']}",
                      flush=True)
    with open(os.path.join(REPORTS, "audit_study.json"), "w") as fh:
        json.dump(report, fh, indent=1)
    print("saved data/sharadar/reports/audit_study.json")


if __name__ == "__main__":
    sys.exit(main())
