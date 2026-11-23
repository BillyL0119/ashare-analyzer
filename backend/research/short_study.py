"""
Short interest as a signal (FINRA, from 2018). EXPLORATORY: the clean development period is only 2018-01 .. 2020-10;
the later months were already used for the one-time final test, so a good number here is a lead to watch in the live
record, not proof. The two measures were fixed before looking: short interest as a share of shares outstanding
(primary) and days to cover (secondary), both "lower is better".

    .venv/bin/python -m research.short_study          (from backend/)
"""
import json
import os
import sys

from research.factor_study import ALL_FACTORS, FACTORS, run
from research.improve_study import DEV_END, log_trial
from research.sharadar_data import COMPACT

START = 20180201


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _ = run(extra=True)
    out = {}
    print("short interest, monthly, lower is better (top fifth = least shorted)")
    print(f"{'universe':8} {'factor':15} {'period':22} {'months':>6} {'IC':>7} {'IC t':>6} {'top ex':>7} {'t':>6} {'L-S':>7} {'t':>6} {'bottom vs all':>13}")
    for u in ("large", "liquid"):
        for f in ("short_interest", "days_to_cover"):
            b = books[(u, f)]
            for label, kw in (("dev 2018-02..2020-10", dict(since=START, until=DEV_END)),
                              ("after 2020-11 (seen)", dict(since=DEV_END)),
                              ("all 2018-02..2026-11", dict(since=START))):
                s = b.summary(**kw)
                if not s:
                    continue
                bottom_gap = round(s["universe_annual"] - (s["top_annual"] - s["long_short_annual"]), 2)
                out[f"{u}|{f}|{label}"] = {**s, "universe_minus_bottom": bottom_gap}
                print(f"{u:8} {f:15} {label:22} {s['months']:6} {s['ic_mean']:7.3f} {s['ic_t'] or 0:6.2f} "
                      f"{s['top_excess_annual']:7.1f} {s['top_excess_t'] or 0:6.2f} {s['long_short_annual']:7.1f} "
                      f"{s['long_short_t'] or 0:6.2f} {bottom_gap:13.1f}")
    log_trial("short interest study (exploratory)", {k: v["ic_t"] for k, v in out.items()})
    # does it add anything to what the model already uses? correlation of its ranks with the composite's factors
    import numpy as np
    from research.factor_study import rank_pct
    corr = {}
    for f in [x for x in FACTORS if x in ("fcf_yield", "earnings_yield", "roe", "share_issuance", "low_vol", "momentum")]:
        cs = []
        for month, liquid, large, signed, later in months:
            if month < START:
                continue
            a, b2 = rank_pct(np.where(large, signed["short_interest"], np.nan)), rank_pct(np.where(large, signed[f], np.nan))
            ok = np.isfinite(a) & np.isfinite(b2)
            if ok.sum() > 50:
                cs.append(np.corrcoef(a[ok], b2[ok])[0, 1])
        corr[f] = round(float(np.mean(cs)), 2)
    print("\naverage rank correlation of 'least shorted' with existing factors (large caps):", corr)
    out["correlation_with_existing"] = corr
    out["note"] = "exploratory; " + str(len(ALL_FACTORS)) + " factors tried in total"
    with open(os.path.join(COMPACT, "..", "reports", "short_study.json"), "w") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())
