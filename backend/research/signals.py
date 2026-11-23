"""
Build the admin research desk file (backend/data/quant/signals.json) from the local Sharadar data.

    .venv/bin/python -m research.signals          (from backend/; tools/quant_publish.py also uploads it)

What goes in (derived numbers only, never raw Sharadar rows; the page is admin-only because of the personal licence):
  trend        cap-weighted large-cap index vs its 10-month average, month by month, and where it stands now
  ranking      the ~1000 large caps scored with the tested configuration (step E of portfolio_study: factors chosen
               on all data so far, IC-weighted, ranked within sector), with each factor's percentile and a few
               plain metrics (P/E, FCF yield, ROE, share change) to read the score against
  credibility  walk-forward results of every construction step, year by year, and each chosen factor's record
"""
import json
import os
import sys
import time

import numpy as np

from research.factor_study import ALL_FACTORS as FACTORS, run
from research.portfolio_study import STEPS, choose, composite, evaluate, sector_codes_of

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "quant")
TOP_N = 50
KEEP_PCT = 0.3


def r(x, digits=2):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return round(v, digits) if np.isfinite(v) else None


def build():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _, latest = run(return_latest=True)
    P = latest["panel"]
    labels, codes = sector_codes_of(P)
    report, trend = evaluate(books, months, codes)

    year = latest["date"] // 10000
    chosen = choose(books, "large", year + 1)                       # every month up to now
    cfg = dict(STEPS)["E +50 names"]
    large = latest["large"]
    score = composite(latest["signed"], large, chosen, codes, cfg["sector_neutral"], cfg["ic_weights"])
    idx = np.where(large & np.isfinite(score))[0]
    order = idx[np.argsort(-score[idx], kind="stable")]
    n = len(order)

    # each chosen factor's percentile within sector (what the composite actually used), 0-100
    pct = {}
    for f in chosen:
        s = np.where(large, latest["signed"][f], np.nan)
        out = np.full(len(s), np.nan)
        for c in np.unique(codes[large]):
            m = large & (codes == c) & np.isfinite(s)
            if m.sum() >= 5:
                out[m] = (np.argsort(np.argsort(s[m])) / (m.sum() - 1)) * 100
        pct[f] = out

    raw = latest["raw"]
    adj, ends = latest["adj"], latest["ends"]
    i = ends[-1]
    ret_1y = adj[i] / adj[max(0, i - 252)] - 1
    rows = []
    for rank, j in enumerate(order, 1):
        ey = raw["earnings_yield"][j]
        sec = P.sec.iloc[j]
        rows.append({
            "rank": rank, "ticker": str(P.tickers[j]), "name": str(sec["name"]).title() if isinstance(sec["name"], str) else None,
            "sector": str(labels[codes[j]]), "industry": sec["industry"] if isinstance(sec["industry"], str) else None,
            "mcap_bn": r(latest["mc"][j] / 1e9, 1), "score": r((n - rank) / max(n - 1, 1) * 100, 1),
            "top": rank <= TOP_N, "keep": rank <= max(TOP_N, int(n * KEEP_PCT)),
            "factors": {f: r(pct[f][j], 0) for f in chosen},
            "metrics": {"pe": r(1 / ey, 1) if ey and ey > 0 else None,
                        "fcf_yield": r(raw["fcf_yield"][j] * 100, 1), "roe": r(raw["roe"][j] * 100, 1),
                        "share_change": r(raw["share_issuance"][j] * 100, 1),
                        "gross_profit": r(raw["gross_profit"][j] * 100, 1), "return_1y": r(ret_1y[j] * 100, 1)},
        })

    lv, dates = np.array(trend["levels"]), trend["dates"]
    hist = []
    for k in range(len(lv)):
        ma = float(np.mean(lv[max(0, k - 9): k + 1])) if k >= 9 else None
        hist.append({"month": str(dates[k])[:6], "level": r(lv[k] * 100, 1), "ma10": r(ma * 100, 1) if ma else None})
    now_ma = float(np.mean(lv[-10:]))
    factor_rec = {}
    for f in chosen:
        b = books[("large", f)]
        factor_rec[f] = {"family": FACTORS[f][1], "description": FACTORS[f][2], "weight_ic": r(chosen[f], 4),
                         "all": b.summary(), "2000_2012": b.summary(until=20130101), "2013_now": b.summary(since=20130101)}

    return {
        "as_of": f"{str(latest['date'])[:4]}-{str(latest['date'])[4:6]}-{str(latest['date'])[6:]}",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "universe": {"name": "large", "size": int(n), "rule": "US common stock, price >= $5, 60-day average dollar "
                     "volume >= $5M, the 1000 largest by market cap"},
        "config": {"step": "E +50 names", "top_n": TOP_N, "keep_pct": KEEP_PCT, "rebalance": "quarterly",
                   "chosen_factors": list(chosen)},
        "trend": {"above": bool(lv[-1] >= now_ma), "gap_pct": r((lv[-1] / now_ma - 1) * 100, 1),
                  "rule": "hold cash in a month that starts with the cap-weighted large-cap index below its "
                          "10-month average", "history": hist[-132:]},
        "ranking": rows,
        "factors": factor_rec,
        "portfolio": report,
    }


def main():
    t0 = time.time()
    data = build()
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "signals.json")
    tmp = path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(data, fh, separators=(",", ":"))
    os.replace(tmp, path)
    top = ", ".join(x["ticker"] for x in data["ranking"][:10])
    print(f"signals.json: {os.path.getsize(path) / 1e3:.0f} KB, as of {data['as_of']}, {len(data['ranking'])} stocks, "
          f"trend {'above' if data['trend']['above'] else 'below'} ({data['trend']['gap_pct']:+.1f}%), "
          f"factors {data['config']['chosen_factors']}, first 10: {top}  ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    sys.exit(main())
