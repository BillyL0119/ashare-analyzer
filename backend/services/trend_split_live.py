"""
Live reading of the split trend rule (research/trend_split.py) between the weekly desk files.

The desk file gives each part's next check day and its threshold as a ratio to the index on the file's data date.
Here the threshold becomes an SPY price (ratio x SPY's close on that date), and once SPY has closed on a check day
the part's decision is read off it: stocks if SPY closed at or above the threshold, cash if below, traded at the
next trading day's close. SPY stands in for the cap-weighted large-cap index (they move almost together over a few
weeks), so a close within a few tenths of a percent of the threshold is flagged as too close to call.
"""
from services import us_calendar as uc

CLOSE_CALL_PCT = 0.5


def _close_on_or_before(bars, day):
    best = None
    for b in bars:
        if b["date"] <= day:
            best = b
        else:
            break
    return best


def live_status(split: dict, spy_bars: list) -> dict:
    """split: signals.json trend.split; spy_bars: [{"date", "close"}] oldest first (split-adjusted closes)."""
    if not split or not spy_bars:
        return {}
    anchor = _close_on_or_before(spy_bars, split["anchor_date"])
    if not anchor:
        return {}
    latest = spy_bars[-1]
    parts = []
    for p in split["parts"]:
        row = {"part": p["part"], "next_check": p["next_check"], "last_invested": p["last_invested"]}
        if p.get("threshold_ratio"):
            thr = p["threshold_ratio"] * anchor["close"]
            row["threshold_spy"] = round(thr, 2)
            row["gap_pct"] = round((latest["close"] / thr - 1) * 100, 2)
            bar = next((b for b in spy_bars if b["date"] == p["next_check"]), None)
            if bar:
                row["checked_close"] = bar["close"]
                row["invested"] = bar["close"] >= thr
                row["close_call"] = abs(bar["close"] / thr - 1) * 100 < CLOSE_CALL_PCT
                row["trade_on"] = uc.next_trading_day(p["next_check"]).isoformat()
                row["changes"] = row["invested"] != p["last_invested"]
        parts.append(row)
    return {"spy_anchor": {"date": anchor["date"], "close": anchor["close"]},
            "spy_latest": {"date": latest["date"], "close": latest["close"]}, "parts": parts}
