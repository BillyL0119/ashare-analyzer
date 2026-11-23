"""
How much does survivorship bias flatter a factor back-test?

Same data, same rules, two stock universes:
  ALL        every liquid US common stock that existed at the time, delisted ones included
  SURVIVORS  only stocks that are still listed today (what a free "current members" list gives you)
Factors: momentum (12-1 months) and low volatility (12 months), as in the site's /factors lab.
Top and bottom fifth, equal weight, monthly rebalance, 10 bp per one-way trade, returns from split+dividend
adjusted prices. A stock that delists during the holding month earns its return up to its last traded price.

    backend/.venv/bin/python -m research.bias_study            (run from backend/)
"""
import json
import math
import os
import sys
import time

import numpy as np

from research.sharadar_data import Panel
from services.factors import LOOKBACK, SKIP, _pick, _stats

MIN_DVOL = 5e6          # trailing 60-day average dollar volume to be tradable at all
COST = 10 / 10_000
FRAC = 0.2
FACTORS = ("momentum", "low_vol")
WINDOWS = {"1999-2026": 19990101, "2016-2026": 20160101}


def signals(adj, ret, i):
    mom = adj[i - SKIP] / adj[i - LOOKBACK] - 1.0
    win = ret[i - LOOKBACK + 1: i + 1]
    ok = np.isfinite(win).sum(0) >= 200
    vol = np.full(adj.shape[1], np.nan, dtype=np.float32)
    vol[ok] = np.nanstd(win[:, ok], axis=0, ddof=1)
    mom[~np.isfinite(mom)] = np.nan
    return {"momentum": mom, "low_vol": -vol}


def holding_return(adj, i, j):
    """Return from day i to the last traded price on or before day j (0 if it never trades again)."""
    seg = adj[i + 1: j + 1]
    fin = np.isfinite(seg)
    last = np.where(fin, np.arange(len(seg))[:, None], -1).max(0)
    p1 = np.where(last >= 0, seg[np.maximum(last, 0), np.arange(seg.shape[1])], np.nan)
    r = p1 / adj[i] - 1.0
    r[(last < 0) & np.isfinite(adj[i])] = 0.0
    return r


def run():
    t0 = time.time()
    P = Panel()
    adj = P.adj
    with np.errstate(invalid="ignore", divide="ignore"):
        ret = adj[1:] / adj[:-1] - 1.0
    ret = np.vstack([np.full((1, adj.shape[1]), np.nan, dtype=np.float32), ret])
    ret[~np.isfinite(ret)] = np.nan
    ends = P.month_ends()
    rec = {u: {f: {"top": [], "bot": [], "all": [], "n": [], "date": []} for f in FACTORS} for u in ("ALL", "SURVIVORS")}
    prev = {(u, f, s): set() for u in rec for f in FACTORS for s in ("top", "bot")}
    turn = {(u, f): [] for u in rec for f in FACTORS}
    for k in range(len(ends) - 1):
        i, j = ends[k], ends[k + 1]
        if i < LOOKBACK + 5:
            continue
        with np.errstate(invalid="ignore", divide="ignore"):
            later = holding_return(adj, i, j)
            sig = signals(adj, ret, i)
        tradable = np.isfinite(adj[i]) & np.isfinite(adj[i - LOOKBACK]) & (P.avg_dollar_volume(i) >= MIN_DVOL) & np.isfinite(later)
        for u, elig in (("ALL", tradable), ("SURVIVORS", tradable & ~P.delisted)):
            if elig.sum() < 100:
                continue
            for f in FACTORS:
                s = sig[f]
                top, bot = _pick(s, elig, FRAC, True), _pick(s, elig, FRAC, False)
                if len(top) == 0:
                    continue
                ts, bs = set(top.tolist()), set(bot.tolist())
                p_t, p_b = prev[(u, f, "top")], prev[(u, f, "bot")]
                sold = len(p_t - ts) / len(p_t) if p_t else 0.0
                bought = len(ts - p_t) / len(ts)
                bsold = len(p_b - bs) / len(p_b) if p_b else 0.0
                bbought = len(bs - p_b) / len(bs)
                d = rec[u][f]
                d["top"].append(float(np.mean(later[top])) - (sold + bought) * COST)
                d["bot"].append(float(np.mean(later[bot])) - (bsold + bbought) * COST)
                d["all"].append(float(np.mean(later[elig])))
                d["n"].append(int(elig.sum()))
                d["date"].append(int(P.dates[j]))
                turn[(u, f)].append((sold + bought) / 2)
                prev[(u, f, "top")], prev[(u, f, "bot")] = ts, bs
    out = {}
    for u in rec:
        for f in FACTORS:
            d = rec[u][f]
            dates = np.array(d["date"])
            for wname, start in WINDOWS.items():
                m = dates >= start
                if m.sum() < 36:
                    continue
                top, bot, al = (np.array(d[x])[m] for x in ("top", "bot", "all"))
                ex = top - al
                sd = np.std(ex, ddof=1)
                st = _stats(top), _stats(bot), _stats(al)
                out[f"{u}|{f}|{wname}"] = {
                    "months": int(m.sum()), "avg_names": float(np.mean(np.array(d["n"])[m])),
                    "top_cagr": st[0]["cagr"], "bottom_cagr": st[1]["cagr"], "universe_cagr": st[2]["cagr"],
                    "top_maxdd": st[0]["max_drawdown"], "top_vol": st[0]["vol"],
                    "excess_cagr": round(st[0]["cagr"] - st[2]["cagr"], 2),
                    "t_stat": round(float(np.mean(ex) / (sd / math.sqrt(len(ex)))), 2) if sd > 0 else None,
                    "months_beating": round(float(np.mean(ex > 0)) * 100, 1),
                    "turnover": round(float(np.mean(np.array(turn[(u, f)])[-int(m.sum()):])) * 100, 1),
                }
    return out, time.time() - t0


def main():
    out, secs = run()
    path = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "reports")
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, "bias_study.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(f"done in {secs:.0f}s\n")
    for w in WINDOWS:
        print(f"== {w} ==  (annual %, monthly rebalance, after 10bp costs)")
        print(f"{'factor':9} {'universe':10} {'names':>6} {'top':>7} {'bottom':>7} {'all':>7} {'excess':>7} {'t':>6} {'beat%':>6} {'maxDD':>7}")
        for f in FACTORS:
            for u in ("ALL", "SURVIVORS"):
                r = out.get(f"{u}|{f}|{w}")
                if r:
                    print(f"{f:9} {u:10} {r['avg_names']:6.0f} {r['top_cagr']:7.1f} {r['bottom_cagr']:7.1f} {r['universe_cagr']:7.1f} "
                          f"{r['excess_cagr']:7.1f} {r['t_stat']:6.2f} {r['months_beating']:6.1f} {r['top_maxdd']:7.1f}")
        print()


if __name__ == "__main__":
    sys.exit(main())
