"""
Does adding the candidate signals (factor_study.EXTRA_FACTORS) improve the method?  DEVELOPMENT PERIOD ONLY.

    .venv/bin/python -m research.improve_study          (from backend/)

Discipline: every comparison here uses months before DEV_END (Nov 2020). The six years after it are kept for one
final test once the method is settled (research/holdout_test.py), so nothing below may be tuned on them.
Trials are counted in TRIALS so the final report can say how many variants were tried.
"""
import json
import os
import sys

from research.factor_study import ALL_FACTORS, EXTRA_FACTORS, FACTORS, run
from research.portfolio_study import STEPS, benchmarks, sector_codes_of, simulate, stats
from research.sharadar_data import COMPACT

DEV_END = 20201101
TRIALS_LOG = os.path.join(COMPACT, "..", "reports", "trials.json")


def log_trial(name, result):
    trials = json.load(open(TRIALS_LOG)) if os.path.exists(TRIALS_LOG) else []
    trials.append({"name": name, "result": result})
    with open(TRIALS_LOG, "w") as fh:
        json.dump(trials, fh, indent=1)


def subset(books, names):
    return {k: v for k, v in books.items() if k[1] in names}


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _ = run(extra=True)
    dev = [m for m in months if m[0] < DEV_END]
    from research.sharadar_data import Panel
    _, codes = sector_codes_of(Panel())
    report = {"dev_end": DEV_END, "factors": {}, "walk_forward": {}}

    for u in ("large", "liquid"):
        print(f"\n== {u} universe, DEVELOPMENT 2000-01 .. 2020-10 ==")
        print(f"{'factor':19} {'family':9} {'new':>3} {'IC':>7} {'IC t':>6} {'top ex':>7} {'t':>6} {'IC 00-10':>8} {'IC 10-20':>8}")
        rows = []
        for f, (_, fam, _) in ALL_FACTORS.items():
            b = books[(u, f)]
            s = b.summary(until=DEV_END)
            a, z = b.summary(until=20100701), b.summary(since=20100701, until=DEV_END)
            if not s:
                continue
            report["factors"][f"{u}|{f}"] = {"dev": s, "dev_first": a, "dev_second": z, "new": f in EXTRA_FACTORS}
            rows.append((s["ic_t"] or 0, f, fam, s, a, z))
        for _, f, fam, s, a, z in sorted(rows, reverse=True):
            print(f"{f:19} {fam:9} {'*' if f in EXTRA_FACTORS else '':>3} {s['ic_mean']:7.3f} {s['ic_t'] or 0:6.2f} "
                  f"{s['top_excess_annual']:7.1f} {s['top_excess_t'] or 0:6.2f} "
                  f"{(a or {}).get('ic_mean', float('nan')):8.3f} {(z or {}).get('ic_mean', float('nan')):8.3f}")

    # walk-forward on the development period, large caps: old factor set vs old + new
    ew, cw, flags, _, _ = benchmarks(dev)
    print("\nwalk-forward, large caps, 2005 .. 2020-10 (factors re-chosen each January from earlier data)")
    print(f"benchmarks: cap-weight {stats([(m[0], c) for m, c in zip([x for x in dev if x[0] // 10000 >= 2005], cw)], ew, cw)['cagr']}%/yr")
    print(f"{'set':10} {'step':28} {'CAGR':>6} {'maxDD':>7} {'vs CW':>6} {'t':>5} {'yrs behind':>10}")
    for set_name, names in (("old 16", set(FACTORS)), ("old + new", set(ALL_FACTORS))):
        bk = subset(books, names)
        for step in ("A baseline", "E +50 names"):
            series, turns = simulate(bk, dev, codes, cash_flags=flags, **dict(STEPS)[step])
            st = stats(series, ew, cw)
            report["walk_forward"][f"{set_name}|{step}"] = st
            log_trial(f"dev walk-forward {set_name} {step}", st)
            print(f"{set_name:10} {step:28} {st['cagr']:6.1f} {st['max_drawdown']:7.1f} {st['vs_cap_weight']:+6.1f} "
                  f"{st['t_vs_cap_weight']:5.2f} {st['years_behind_cap_weight']:>10}")
    path = os.path.join(COMPACT, "..", "reports", "improve_study.json")
    with open(path, "w") as fh:
        json.dump(report, fh, indent=1)




def risk_study():
    """Step 2: risk layer on the current model (step E), development period only."""
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    from research.portfolio_study import market_returns
    books, months, _ = run()
    dev = [m for m in months if m[0] < DEV_END]
    from research.sharadar_data import Panel
    _, codes = sector_codes_of(Panel())
    ew, cw, flags, _, _ = benchmarks(dev)
    mkt = market_returns(dev)
    from research.rates import monthly_cash_returns
    from research.portfolio_study import index_trend
    rf = monthly_cash_returns([m[0] for m in dev])
    base = dict(STEPS)["E +50 names"]
    variants = [
        ("E (current)", {}),
        ("+ inverse-vol weights", {"weighting": "inv_vol"}),
        ("+ sector cap 25%", {"sector_cap": 0.25}),
        ("+ vol target 15%", {"vol_target": 0.15}),
        ("+ trend rule", {"trend": True}),
        ("+ inv-vol + sector cap", {"weighting": "inv_vol", "sector_cap": 0.25}),
        ("+ inv-vol + sector + trend", {"weighting": "inv_vol", "sector_cap": 0.25, "trend": True}),
        ("+ inv-vol + sector + vol target", {"weighting": "inv_vol", "sector_cap": 0.25, "vol_target": 0.15}),
    ]
    cws = stats([(m[0], c) for m, c in zip([x for x in dev if x[0] // 10000 >= 2005], cw)], ew, cw)
    print("\nrisk layer on step E, large caps, DEVELOPMENT 2005 .. 2020-10")
    print(f"index (cap-weight): {cws['cagr']}%/yr, vol {cws['vol']}%, max drawdown {cws['max_drawdown']}%, return/risk {cws['return_per_risk']}")
    print(f"{'variant':34} {'CAGR':>6} {'vol':>6} {'maxDD':>7} {'ret/risk':>8} {'vs CW':>6} {'t':>5} {'behind':>7}")
    out = {"index": cws, "cash": "3-month T-bill (FRED TB3MS)"}
    it = stats(index_trend(dev, flags, mkt, rf), ew, cw)
    out["index + trend rule"] = it
    log_trial("dev index + trend rule (T-bill cash)", it)
    print(f"{'index + trend rule':34} {it['cagr']:6.1f} {it['vol']:6.1f} {it['max_drawdown']:7.1f} {it['return_per_risk']:8.2f} "
          f"{it['vs_cap_weight']:+6.1f} {it['t_vs_cap_weight']:5.2f} {it['years_behind_cap_weight']:>7}")
    for name, kw in variants:
        series, _ = simulate(books, dev, codes, cash_flags=flags, mkt=mkt, rf=rf, **{**base, **kw})
        st = stats(series, ew, cw)
        out[name] = st
        log_trial(f"dev risk {name}", st)
        print(f"{name:34} {st['cagr']:6.1f} {st['vol']:6.1f} {st['max_drawdown']:7.1f} {st['return_per_risk']:8.2f} "
              f"{st['vs_cap_weight']:+6.1f} {st['t_vs_cap_weight']:5.2f} {st['years_behind_cap_weight']:>7}")
    with open(os.path.join(COMPACT, "..", "reports", "risk_study.json"), "w") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    sys.exit(risk_study() if "--risk" in sys.argv else main())
