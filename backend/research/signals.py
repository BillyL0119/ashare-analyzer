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
SHORT_HIGH_PCT = 10        # short interest at or above this share of shares outstanding is flagged as high
KEEP_PCT = 0.3


def r(x, digits=2):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return round(v, digits) if np.isfinite(v) else None


REPORTS = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "reports")
CANDIDATES = ["index", "index + trend rule", "model (step E)", "model + inv-vol + sector + trend"]


def validation():
    """Development-period and one-time hold-out results of the four ways to use the desk (fixed numbers from
    improve_study --risk, the dev index+trend trial and holdout_test; not recomputed weekly)."""
    def load(name):
        try:
            with open(os.path.join(REPORTS, name)) as fh:
                return json.load(fh)
        except (OSError, ValueError):
            return None
    # the T-bill-cash versions when present (same candidates, cash months earn the 3-month T-bill rate)
    risk, trials = load("risk_study.json"), load("trials.json") or []
    hold = load("holdout_test_cash.json") or load("holdout_test.json")
    if not risk or not hold:
        return None
    idx_trend = risk.get("index + trend rule") or next(
        (t["result"] for t in reversed(trials) if t["name"] == "dev index + trend rule"), None)
    dev = {"index": risk.get("index"), "index + trend rule": idx_trend, "model (step E)": risk.get("E (current)"),
           "model + inv-vol + sector + trend": risk.get("+ inv-vol + sector + trend")}
    out = {"dev_period": "2005-01 .. 2020-10", "holdout_period": hold["period"], "holdout_ran_at": hold["ran_at"],
           "cash": hold.get("cash", "0"),
           "trials": len(trials), "factors_tested": len(FACTORS), "candidates": CANDIDATES, "dev": dev, "holdout": hold["results"]}
    # The audit (research/audit_study.py, 2026-11-24) re-measured the SAME four candidates more realistically: fixed
    # dollar volume, shares held between rebalances, trades the day after the signal, extra loss on bankrupt
    # delistings. Its numbers replace the first ones; the first hold-out figures are kept to show the change.
    audit, timing = load("audit_study.json"), load("trend_timing.json")
    step = (audit or {}).get("steps", {}).get("4 + delistings")
    if step:
        out["before_audit"] = {"dev": dev, "holdout": hold["results"]}
        out["dev"], out["holdout"] = step["dev"], step["holdout"]
        out["audited_at"] = audit["ran_at"][:10]
        x2 = audit["steps"].get("5 + costs x2") or {}
        out["costs_x2_holdout"] = {c: (x2.get("holdout") or {}).get(c, {}).get("cagr") for c in CANDIDATES}
    if timing:
        days = list(timing.values())
        out["trend_by_check_day"] = {
            p: {"cagr": [min(d[p]["trend"]["cagr"] for d in days), max(d[p]["trend"]["cagr"] for d in days)],
                "max_drawdown": [min(d[p]["trend"]["max_drawdown"] for d in days), max(d[p]["trend"]["max_drawdown"] for d in days)],
                "index_max_drawdown": days[0][p]["index"]["max_drawdown"]}
            for p in ("dev", "holdout")}
    return out


def chinese_names(tickers):
    """Chinese company names from Tencent's public quote service (the site already uses it), cached in
    data/quant/names_zh.json; only names that are really Chinese are kept."""
    import re
    import requests
    path = os.path.join(OUT, "names_zh.json")
    try:
        with open(path) as fh:
            cache = json.load(fh)
    except (OSError, ValueError):
        cache = {}
    todo = [t for t in tickers if t not in cache]
    for i in range(0, len(todo), 60):
        chunk = todo[i:i + 60]
        try:
            r = requests.get("https://qt.gtimg.cn/q=" + ",".join("us" + t.replace(".", ".") for t in chunk), timeout=10)
            text = r.content.decode("gbk", errors="ignore")
        except Exception:
            continue
        for line in text.split(";"):
            key, _, val = line.partition("=")
            f = val.strip().strip('"').split("~")
            t = key.strip().replace("v_us", "")
            if t in chunk and len(f) > 2:
                cache[t] = f[1] if re.search(r"[\u4e00-\u9fff]", f[1] or "") else ""
        for t in chunk:
            cache.setdefault(t, "")
    os.makedirs(OUT, exist_ok=True)
    with open(path, "w") as fh:
        json.dump(cache, fh, ensure_ascii=False)
    return cache


def build():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, months, _, latest = run(return_latest=True)
    P = latest["panel"]
    labels, codes = sector_codes_of(P)
    from research.rates import monthly_cash_returns, tbill_annual
    report, trend = evaluate(books, months, codes, rf=monthly_cash_returns([m[0] for m in months]))

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
    # short interest (FINRA, public): share of shares outstanding and days to cover, shown as a risk column only
    from research.extra_signals import latest_short_settlement, short_interest_matrices
    sm = short_interest_matrices(P.dates[ends], P.tickers)
    with np.errstate(all="ignore"):
        short_pct = sm["short_qty"][-1] / (latest["mc"] / latest["close_unadj"]) * 100
    days_cover = sm["days_to_cover"][-1]
    as_of_str = f"{str(latest['date'])[:4]}-{str(latest['date'])[4:6]}-{str(latest['date'])[6:]}"
    short_date = latest_short_settlement(as_of_str)
    names_zh = chinese_names([str(P.tickers[j]) for j in order[:150]])
    rows = []
    for rank, j in enumerate(order, 1):
        ey = raw["earnings_yield"][j]
        sec = P.sec.iloc[j]
        rows.append({
            "rank": rank, "ticker": str(P.tickers[j]), "name": str(sec["name"]).title() if isinstance(sec["name"], str) else None,
            "name_zh": names_zh.get(str(P.tickers[j])) or None,
            "sector": str(labels[codes[j]]), "industry": sec["industry"] if isinstance(sec["industry"], str) else None,
            "mcap_bn": r(latest["mc"][j] / 1e9, 1), "score": r((n - rank) / max(n - 1, 1) * 100, 1),
            "top": rank <= TOP_N, "keep": rank <= max(TOP_N, int(n * KEEP_PCT)),
            "factors": {f: r(pct[f][j], 0) for f in chosen},
            "metrics": {"pe": r(1 / ey, 1) if ey and ey > 0 else None,
                        "fcf_yield": r(raw["fcf_yield"][j] * 100, 1), "roe": r(raw["roe"][j] * 100, 1),
                        "share_change": r(raw["share_issuance"][j] * 100, 1),
                        "gross_profit": r(raw["gross_profit"][j] * 100, 1), "return_1y": r(ret_1y[j] * 100, 1),
                        "short_pct": r(short_pct[j], 1) if 0 <= short_pct[j] < 200 else None,
                        "days_to_cover": r(days_cover[j], 1)},
        })

    lv, dates = np.array(trend["levels"]), trend["dates"]
    hist = []
    for k in range(len(lv)):
        ma = float(np.mean(lv[max(0, k - 9): k + 1])) if k >= 9 else None
        hist.append({"month": str(dates[k])[:6], "level": r(lv[k] * 100, 1), "ma10": r(ma * 100, 1) if ma else None})
    now_ma = float(np.mean(lv[-10:]))
    as_of = f"{str(latest['date'])[:4]}-{str(latest['date'])[4:6]}-{str(latest['date'])[6:]}"
    from research.live_track import update as live_update
    live = live_update(as_of, rows, P, list(lv), dates, tbill_annual(), top_n=TOP_N,
                       keep_n=sum(1 for x in rows if x["keep"]))
    factor_rec = {}
    for f in chosen:
        b = books[("large", f)]
        factor_rec[f] = {"family": FACTORS[f][1], "description": FACTORS[f][2], "weight_ic": r(chosen[f], 4),
                         "all": b.summary(), "2000_2012": b.summary(until=20130101), "2013_now": b.summary(since=20130101)}

    return {
        "as_of": as_of,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "universe": {"name": "large", "size": int(n), "rule": "US common stock, price >= $5, 60-day average dollar "
                     "volume >= $5M, the 1000 largest by market cap"},
        "config": {"step": "E +50 names", "top_n": TOP_N, "keep_pct": KEEP_PCT, "rebalance": "quarterly",
                   "chosen_factors": list(chosen)},
        "trend": {"above": bool(lv[-1] >= now_ma), "gap_pct": r((lv[-1] / now_ma - 1) * 100, 1),
                  # the reading above uses the month so far; the rule acts on month-end closes only
                  "provisional": live["this_month_invested"] is not None,
                  "this_month_invested": live["this_month_invested"],
                  "rule": "hold cash in a month that starts with the cap-weighted large-cap index below its "
                          "10-month average", "history": hist[-132:]},
        "ranking": rows,
        "factors": factor_rec,
        "portfolio": report,
        "validation": validation(),
        "live": live,
        "short_interest": {"settlement_date": short_date, "high_pct": SHORT_HIGH_PCT,
                           "source": "FINRA equity short interest (public), counted 14 days after settlement"},
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
