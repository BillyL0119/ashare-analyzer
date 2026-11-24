"""
Wall Street style portfolio construction: risk model + optimiser, walk-forward on the DEVELOPMENT period.

    .venv/bin/python -m research.optimizer_study          (from backend/; ~10-20 min)

Each month (from 2005): factors chosen from earlier data only (as in portfolio_study), composite score within
sector, turned into an expected excess return per stock with the standard rule  alpha = IC x residual risk x score
(IC = the chosen factors' average past IC). Then two optimised portfolios, both long-only and fully invested, with
trading cost (10 bp per one-way trade) inside the objective:
  enhanced      benchmark = cap-weighted large caps (about the S&P 500); each stock within +-2% of its index weight,
                each sector within +-3%, beta within +-0.1, predicted tracking error <= 4% a year
  concentrated  only the 100 best scores may be held, at most 5% each; sectors within +-10%, beta within +-0.2,
                predicted tracking error <= 8% a year
The limits are the usual industry ranges, set before running; they are not tuned on the results. The last six years
were already used for the one-time final test, so only the development period is reported (the live record will
show how these do from now on).
"""
import json
import math
import os
import sys
import time

import cvxpy as cp
import numpy as np

from research.factor_study import run, tstat, annual, max_drawdown
from research.improve_study import DEV_END, log_trial
from research.portfolio_study import choose, composite, market_returns, sector_codes_of
from research.risk_model import STYLES, RiskModel, beta_matrix
from research.sharadar_data import COMPACT

TC = 10 / 10_000
CONFIGS = {
    "enhanced": dict(asset_cap=0.02, relative=True, sector_cap=0.03, beta_cap=0.10, te=0.04, cand=None, max_w=None),
    "concentrated": dict(asset_cap=None, relative=False, sector_cap=0.10, beta_cap=0.20, te=0.08, cand=100, max_w=0.05),
}


def optimise(cfg, alpha, X, L, D, b, w_prev, sec, n_sec, beta_col, score):
    n = len(b)
    w = cp.Variable(n)
    a = w - b
    cons = [w >= 0, cp.sum(w) == 1]
    if cfg["relative"]:
        cons += [cp.abs(a) <= cfg["asset_cap"]]
    if cfg["cand"]:
        order = np.argsort(-np.nan_to_num(score, nan=-1e9))
        allowed = np.zeros(n)
        allowed[order[: cfg["cand"]]] = cfg["max_w"]
        cons += [w <= allowed]
    S = np.zeros((n_sec, n))
    S[sec, np.arange(n)] = 1.0
    cons += [cp.abs(S @ a) <= cfg["sector_cap"], cp.abs(X[:, beta_col] @ a) <= cfg["beta_cap"]]
    risk = cp.sum_squares(L.T @ (X.T @ a)) + cp.sum(cp.multiply(D, cp.square(a)))
    te_m = cfg["te"] / math.sqrt(12)
    obj = cp.Maximize(alpha @ a - TC * cp.norm1(w - w_prev))
    prob = cp.Problem(obj, cons + [risk <= te_m ** 2])
    try:
        prob.solve(solver=cp.CLARABEL)
    except cp.SolverError:
        pass
    relaxed = False
    if prob.status not in ("optimal", "optimal_inaccurate") or w.value is None:
        # tracking-error limit out of reach (e.g. too few allowed names): penalise risk instead of capping it
        prob = cp.Problem(cp.Maximize(alpha @ a - TC * cp.norm1(w - w_prev) - 50 * risk), cons)
        prob.solve(solver=cp.CLARABEL)
        relaxed = True
    wv = np.clip(np.asarray(w.value).ravel(), 0, None)
    wv /= wv.sum()
    av = wv - b
    pred = float(np.sum((L.T @ (X.T @ av)) ** 2) + np.sum(D * av ** 2))
    return wv, math.sqrt(max(pred, 0) * 12), relaxed


def run_study(until=DEV_END, keep_last=False, alpha_mode="model", since=20050101):
    """alpha_mode "zero" (should track the index) and "oracle" (next month's actual returns: should win big) are
    checks of the machinery only."""
    books, months, _ = run()
    from research.sharadar_data import Panel
    labels, codes = sector_codes_of(Panel())
    n_sec = len(labels)
    rm = RiskModel(codes, n_sec)
    mkt = market_returns(months)
    beta_col = n_sec + STYLES.index("beta")
    hist = []
    state = {c: {"w": {}, "rows": []} for c in CONFIGS}
    t0 = time.time()
    last = None
    for t, (month, liquid, large, signed, later) in enumerate(months):
        if month >= until:
            break
        mc = np.exp(-signed["size"])
        beta = beta_matrix(np.vstack(hist[-36:]), mkt[max(0, t - 36):t]) if len(hist) >= 24 else np.full(len(mc), np.nan)
        idx = np.where(large & np.isfinite(mc) & np.isfinite(later))[0]
        X = rm.exposures(idx, signed, beta, mc)
        F = rm.factor_cov()
        y = month // 10000
        if month >= since and F is not None:
            chosen = choose(books, "large", y)
            score_full = composite(signed, large, chosen, codes, True, True)
            sc = score_full[idx]
            ok = np.isfinite(sc)
            z = np.zeros(len(idx))
            z[ok] = (sc[ok] - sc[ok].mean()) / (sc[ok].std() or 1)
            D = rm.specific_var(idx, t)
            ic = float(np.mean(list(chosen.values()))) if chosen else 0.0
            alpha = ic * np.sqrt(D) * z
            if alpha_mode == "zero":
                alpha = np.zeros(len(idx))
            elif alpha_mode == "oracle":
                alpha = np.nan_to_num(later[idx]) * 0.05
            b = mc[idx] / mc[idx].sum()
            L = np.linalg.cholesky(F)
            idx_set = set(idx.tolist())
            for name, cfg in CONFIGS.items():
                st = state[name]
                # the first month starts from the index itself, not from cash
                w_prev = np.array([st["w"].get(int(j), 0.0) for j in idx]) if st["w"] else b.copy()
                gone = sum(v for j, v in st["w"].items() if j not in idx_set)
                w, pred_te, relaxed = optimise(cfg, alpha, X, L, D, b, w_prev, codes[idx], n_sec, beta_col, sc)
                turn = float(np.abs(w - w_prev).sum() + gone)
                r = float(w @ later[idx]) - TC * turn
                rb = float(b @ later[idx])
                st["rows"].append({"month": int(month), "r": r, "bench": rb, "pred_te": pred_te, "turnover": turn,
                                   "names": int((w > 1e-3).sum()), "active_share": float(0.5 * np.abs(w - b).sum()),
                                   "relaxed": relaxed})
                grown = w * (1 + np.nan_to_num(later[idx]))
                st["w"] = {int(j): float(v) for j, v in zip(idx, grown / grown.sum()) if v > 1e-6}
                if keep_last:
                    last = (idx, codes, labels, X)
                    st["last_w"] = {int(j): float(v) for j, v in zip(idx, w) if v > 1e-4}
                    st["last_alpha"], st["last_b"] = alpha, b
            if len(state["enhanced"]["rows"]) % 24 == 0:
                print(f"[{time.strftime('%H:%M:%S')}] {month} ({time.time() - t0:.0f}s)", flush=True)
        rm.learn(t, idx, X, later[idx], mc)
        hist.append(later)
    return state, last


def summary(rows):
    r = np.array([x["r"] for x in rows])
    bch = np.array([x["bench"] for x in rows])
    act = r - bch
    te = float(np.std(act, ddof=1) * math.sqrt(12))
    years = {}
    for x in rows:
        y = years.setdefault(x["month"] // 10000, [1.0, 1.0])
        y[0] *= 1 + x["r"]
        y[1] *= 1 + x["bench"]
    rel = np.cumprod(1 + r) / np.cumprod(1 + bch)
    return {"cagr": annual(r), "index_cagr": annual(bch), "active": round(annual(r) - annual(bch), 2),
            "vol": round(float(np.std(r, ddof=1) * math.sqrt(12)) * 100, 1), "max_drawdown": max_drawdown(r),
            "tracking_error": round(te * 100, 2), "predicted_te": round(float(np.mean([x["pred_te"] for x in rows])) * 100, 2),
            "information_ratio": round((annual(r) - annual(bch)) / 100 / te, 2) if te > 0 else None, "t": tstat(act),
            "worst_relative_drawdown": round(float(np.min(rel / np.maximum.accumulate(rel)) - 1) * 100, 1),
            "years_behind": f"{sum(1 for a, b in years.values() if a < b)}/{len(years)}",
            "turnover_per_year": round(float(np.mean([x["turnover"] for x in rows])) * 12 * 100, 0),
            "avg_names": round(float(np.mean([x["names"] for x in rows])), 0),
            "active_share": round(float(np.mean([x["active_share"] for x in rows])) * 100, 0),
            "months_relaxed": sum(1 for x in rows if x["relaxed"]), "months": len(rows)}


def current_model_rows(until=DEV_END):
    """The current desk model (step E, equal weight 50) in the same format, for comparison."""
    from research.portfolio_study import STEPS, benchmarks, simulate
    books, months, _ = run()
    from research.sharadar_data import Panel
    _, codes = sector_codes_of(Panel())
    dev = [m for m in months if m[0] < until]
    _, _, flags, _, _ = benchmarks(dev)
    mk = market_returns(dev)
    series, turns = simulate(books, dev, codes, cash_flags=flags, **dict(STEPS)["E +50 names"])
    bench = {m[0]: c for m, c in zip(dev, mk)}
    return [{"month": m, "r": r, "bench": bench[m], "pred_te": float("nan"), "turnover": 0.0, "names": 50,
             "active_share": float("nan"), "relaxed": False} for m, r in series if m >= 20050101]


def main():
    import warnings
    warnings.filterwarnings("ignore")
    state, _ = run_study()
    out = {}
    s = summary(current_model_rows())
    out["current model (equal-weight 50)"] = s
    print(f"current model: {s['cagr']}%/yr active {s['active']:+.1f} TE {s['tracking_error']}% IR {s['information_ratio']} "
          f"t {s['t']} max DD {s['max_drawdown']}% worst vs index {s['worst_relative_drawdown']}% behind {s['years_behind']}")
    print("\nDEVELOPMENT 2005-01 .. 2020-10, large caps, after trading costs; index = cap-weighted large caps")
    for name in CONFIGS:
        s = summary(state[name]["rows"])
        out[name] = s
        log_trial(f"dev optimiser {name}", s)
        print(f"{name:13} {s['cagr']:5.1f}%/yr (index {s['index_cagr']}%)  active {s['active']:+.1f}  TE {s['tracking_error']}% "
              f"(predicted {s['predicted_te']}%)  IR {s['information_ratio']}  t {s['t']}  max DD {s['max_drawdown']}%  "
              f"worst vs index {s['worst_relative_drawdown']}%  behind {s['years_behind']}  names {s['avg_names']:.0f}  "
              f"active share {s['active_share']:.0f}%  turnover {s['turnover_per_year']:.0f}%/yr  relaxed {s['months_relaxed']}")
    with open(os.path.join(COMPACT, "..", "reports", "optimizer_study.json"), "w") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    sys.exit(main())
