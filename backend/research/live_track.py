"""
Live (forward) tracking of the desk's rules from the day it went live: the only test nobody could have fitted.

State: backend/data/quant/live_state.json (append-only history; also copied to the server as a backup by
tools/quant_publish.py). Each weekly publish calls update():
  - the stock model holds the top 50 (equal weight) chosen at the start; every ~quarter (91+ days since the last
    review) it is reviewed with that week's ranking: names still in the top 30% stay, the rest are replaced from the
    top. Holdings are recorded when decided and never recomputed.
  - the trend rule is decided once a month from the cap-weighted large-cap index at the previous month's end (a month
    is closed only when the data has a day in the next month), exactly as in the back-tests.
Values are computed from closing prices including dividends: model = equal weight at each review, drifting between
reviews, 10 bp per one-way trade; index = SPY (Sharadar fund prices); cash earns the 3-month T-bill rate.
"""
import json
import os
import time

import numpy as np
import pandas as pd

STATE = os.path.join(os.path.dirname(__file__), "..", "data", "quant", "live_state.json")
SPY_CACHE = os.path.join(os.path.dirname(__file__), "..", "data", "sharadar", "spy.csv")
REVIEW_DAYS = 91
COST = 10 / 10_000


def _load():
    try:
        with open(STATE) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _save(state):
    tmp = STATE + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(state, fh, indent=1)
    os.replace(tmp, STATE)


def spy_prices(start: str) -> pd.Series:
    """SPY total-return closes (closeadj) from Sharadar fund prices, cached and refreshed on each call."""
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
        from services import sharadar
        rows = sharadar.fetch("SHARADAR/SFP", {"ticker": "SPY", "date.gte": "2024-01-01"}, ["date", "closeadj"])
        if rows:
            pd.DataFrame(rows).sort_values("date").to_csv(SPY_CACHE, index=False)
    except Exception:
        if not os.path.exists(SPY_CACHE):
            raise
    s = pd.read_csv(SPY_CACHE).set_index("date").closeadj
    return s[s.index >= start]


def _ymd(d):
    s = str(d)
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if "-" not in s else s


def trend_decisions(levels, level_dates, as_of):
    """{YYYY-MM: True (invested) / False (cash)} for every month whose previous month is complete."""
    complete = [(d, lv) for d, lv in zip(level_dates, levels) if str(d)[:6] < as_of.replace("-", "")[:6]]
    out = {}
    for k in range(9, len(complete)):
        d = str(complete[k][0])
        window = [lv for _, lv in complete[k - 9: k + 1]]
        nxt = (pd.Timestamp(f"{d[:4]}-{d[4:6]}-01") + pd.offsets.MonthBegin(1)).strftime("%Y-%m")
        out[nxt] = bool(complete[k][1] >= np.mean(window))
    return out


def update(as_of: str, ranking: list, panel, levels, level_dates, cash_annual: dict, top_n=50, keep_n=None,
           invested_by_day=None):
    """Advance the live record to `as_of` and return the summary for signals.json. invested_by_day {date: share}:
    the split trend rule's invested share per day (research/trend_split.py); without it, the monthly rule."""
    state = _load()
    top = [r["ticker"] for r in ranking[:top_n]]
    if state is None:
        state = {"started": as_of, "holdings": top, "last_review": as_of,
                 "reviews": [{"date": as_of, "holdings": top, "bought": top, "sold": []}], "snapshots": []}
    elif (pd.Timestamp(as_of) - pd.Timestamp(state["last_review"])).days >= REVIEW_DAYS:
        keep_set = {r["ticker"] for r in ranking[: keep_n or top_n]}
        kept = [t for t in state["holdings"] if t in keep_set]
        new = kept + [t for t in top if t not in kept][: top_n - len(kept)]
        sold = [t for t in state["holdings"] if t not in new]
        bought = [t for t in new if t not in state["holdings"]]
        state["reviews"].append({"date": as_of, "holdings": new, "bought": bought, "sold": sold})
        state["holdings"], state["last_review"] = new, as_of
    snap = {"date": as_of, "top50": top}
    state["snapshots"] = [s for s in state["snapshots"] if s["date"] != as_of] + [snap]
    state["trend"] = trend_decisions(levels, level_dates, as_of)
    state["updated_at"] = time.strftime("%Y-%m-%d %H:%M")
    _save(state)
    return summarize(state, as_of, panel, cash_annual, invested_by_day)


def summarize(state, as_of, panel, cash_annual, invested_by_day=None):
    dates = pd.to_datetime(pd.Series(panel.dates.astype(str)), format="%Y%m%d").dt.strftime("%Y-%m-%d").values
    start = state["started"]
    idx = np.where((dates >= start) & (dates <= as_of))[0]
    col = {t: i for i, t in enumerate(panel.tickers)}
    days = dates[idx]
    # stock model: equal weight at each review, drifting between reviews
    model = np.ones(len(idx))
    value = 1.0
    reviews = state["reviews"]
    prev = set()
    for n, rv in enumerate(reviews):
        a = np.searchsorted(days, rv["date"])
        b = np.searchsorted(days, reviews[n + 1]["date"]) if n + 1 < len(reviews) else len(days) - 1
        if a >= len(days):
            break
        names = [t for t in rv["holdings"] if t in col]
        now = set(names)
        turn = (len(prev - now) / len(prev) if prev else 0) + len(now - prev) / max(len(now), 1)
        value *= 1 - turn * COST
        px = pd.DataFrame(panel.adj[idx[a]: idx[b] + 1, [col[t] for t in names]]).ffill().values
        rel = np.nanmean(px / px[0], axis=1)
        model[a: b + 1] = value * rel
        value = model[b]
        prev = now
    spy = spy_prices(start).reindex(days).ffill().values
    index = spy / spy[0] if len(spy) and np.isfinite(spy[0]) else np.full(len(days), np.nan)

    def with_trend(curve):
        out = np.ones(len(curve))
        out[0] = curve[0] if len(curve) else 1.0
        for t in range(1, len(curve)):
            if invested_by_day is not None:
                share = invested_by_day.get(days[t], 1.0)
            else:
                share = 1.0 if state["trend"].get(days[t][:7], True) else 0.0
            cash = (1 + cash_annual.get(int(days[t][:7].replace("-", "")), cash_annual[max(cash_annual)]) / 100) ** (1 / 252) - 1
            r = share * (curve[t] / curve[t - 1] - 1) + (1 - share) * cash
            out[t] = out[t - 1] * (1 + r)
        return out
    curves = {"model": model, "index": index, "index_trend": with_trend(index), "model_trend": with_trend(model)}
    weekly = [i for i in range(len(days)) if i == 0 or i == len(days) - 1 or pd.Timestamp(days[i]).dayofweek == 4]
    return {
        "started": start, "as_of": as_of, "trading_days": int(max(len(days) - 1, 0)),
        "returns": {k: round(float(v[-1] - 1) * 100, 2) if len(v) else None for k, v in curves.items()},
        "series": [{"date": days[i], **{k: round(float(v[i]) * 100, 2) for k, v in curves.items()}} for i in weekly],
        "holdings": state["holdings"], "last_review": state["last_review"],
        "next_review_after": (pd.Timestamp(state["last_review"]) + pd.Timedelta(days=REVIEW_DAYS)).strftime("%Y-%m-%d"),
        "reviews": [{k: rv[k] for k in ("date", "bought", "sold")} for rv in reviews],
        "trend_months": {m: v for m, v in sorted(state["trend"].items()) if m >= start[:7]},
        "this_month_invested": state["trend"].get(as_of[:7]),
    }
