"""
"我的投资记录": an investing journal for the admin's own real account (US stocks).

Pure functions, so the maths is tested without the network; routers/journal.py stores the entries and fetches prices.

Entry types
  buy / sell        ticker, shares (fractions allowed), price per share, fee, reason (required: the point of a journal
                    is to write down why), tag ("model" = from the desk's rule, "own" = own pick, "index" = index fund)
  deposit/withdraw  amount of cash moved into / out of the account (outside money: not part of the return)
  dividend          cash dividend received (part of the return)
Methods
  cost basis        average cost per share; fees are part of the cost of a buy and reduce the proceeds of a sell
  splits            every trade is restated in today's shares (shares x later split ratios, price / the same), so it
                    lines up with split-adjusted closing prices
  return            time-weighted: each day's change in value minus that day's deposits/withdrawals, chained, so
                    moving money in or out does not count as gain or loss
  benchmark         SPY with its dividends reinvested, over the same days
"""
import math
import re
import uuid
from datetime import date

TYPES = ("buy", "sell", "deposit", "withdraw", "dividend")
TAGS = ("model", "own", "index", "other")
_TICKER = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")
EPS = 1e-9


class JournalError(ValueError):
    """A message meant for the person entering the trade."""


NEEDS_REASON = "（导入的记录，待补写理由）"      # placeholder reason of an imported trade (needs_reason: True)


def clean_entry(raw: dict, today: str = None, imported: bool = False) -> dict:
    """Validate one entry from the form; returns the stored shape (without id / created_at). Only an import may keep
    the NEEDS_REASON placeholder: an edit has to write the real reason."""
    today = today or date.today().isoformat()
    t = str(raw.get("type") or "").lower()
    if t not in TYPES:
        raise JournalError("type must be buy, sell, deposit, withdraw or dividend")
    day = str(raw.get("date") or "")
    try:
        date.fromisoformat(day)
    except ValueError:
        raise JournalError("date must look like 2027-01-15") from None
    if day > today:
        raise JournalError("the date cannot be in the future")
    out = {"type": t, "date": day}

    def number(key, minimum=0.0, allow_zero=False):
        try:
            v = float(raw.get(key))
        except (TypeError, ValueError):
            raise JournalError(f"{key} must be a number") from None
        if not math.isfinite(v) or v < minimum or (v == 0 and not allow_zero):
            raise JournalError(f"{key} must be greater than 0" if not allow_zero else f"{key} cannot be negative")
        return round(v, 6)

    if t in ("buy", "sell", "dividend"):
        sym = str(raw.get("ticker") or "").strip().upper()
        if not _TICKER.match(sym):
            raise JournalError("ticker looks wrong (use the US symbol, e.g. AAPL)")
        out["ticker"] = sym
    if t in ("buy", "sell"):
        out["shares"] = number("shares")
        out["price"] = number("price")
        out["fee"] = number("fee", allow_zero=True) if raw.get("fee") not in (None, "") else 0.0
        reason = str(raw.get("reason") or "").strip()
        if len(reason) < 2 or (reason == NEEDS_REASON and not imported):
            raise JournalError("write down why (the reason is what you will learn from later)")
        out["reason"] = reason[:1000]
        tag = str(raw.get("tag") or "own")
        out["tag"] = tag if tag in TAGS else "other"
    else:
        out["amount"] = number("amount")
        note = str(raw.get("reason") or "").strip()
        if note:
            out["reason"] = note[:1000]
    return out


def new_entry(raw: dict, today: str = None) -> dict:
    e = clean_entry(raw, today)
    e["id"] = uuid.uuid4().hex[:12]
    return e


def _same(e) -> tuple:
    """What makes two entries the same trade (for skipping rows already in the journal)."""
    return (e["date"], e["type"], e.get("ticker"), round(e.get("shares", 0), 4), round(e.get("price", 0), 4),
            round(e.get("amount", 0), 2))


def plan_import(existing: list, rows: list, today: str = None) -> tuple:
    """Rows from a broker's CSV (already mapped to the form's fields in the browser) -> (entries to add, a report per
    row: ok / duplicate / error with the message). A buy or sell without a reason gets the NEEDS_REASON placeholder and
    needs_reason: True, so the page can ask for it later. Rows equal to an entry already there are skipped."""
    seen = {_same(e) for e in existing}
    add, report = [], []
    for i, raw in enumerate(rows[:5000]):
        raw = dict(raw or {})
        placeholder = raw.get("type") in ("buy", "sell") and len(str(raw.get("reason") or "").strip()) < 2
        if placeholder:
            raw["reason"] = NEEDS_REASON
        if raw.get("type") in ("buy", "sell") and not raw.get("tag"):
            raw["tag"] = "other"            # a broker file does not say whose idea it was; set when writing the reason
        try:
            e = clean_entry(raw, today, imported=True)
        except JournalError as err:
            report.append({"row": i, "status": "error", "message": str(err)})
            continue
        e["id"] = uuid.uuid4().hex[:12]
        e["imported"] = True
        if placeholder:
            e["needs_reason"] = True
        if _same(e) in seen:
            report.append({"row": i, "status": "duplicate"})
            continue
        seen.add(_same(e))
        add.append(e)
        report.append({"row": i, "status": "ok"})
    return add, report


def _sorted(entries):
    order = {"deposit": 0, "dividend": 1, "sell": 2, "buy": 3, "withdraw": 4}   # same day: cash in before buys
    return sorted(entries, key=lambda e: (e["date"], order[e["type"]], e.get("created_at", ""), e.get("id", "")))


def ledger(entries, split_factor=lambda sym, day: 1.0):
    """Replay the entries. Returns positions {sym: {shares, cost}} in today's shares, cash, realised trades.
    Raises JournalError when a sell exceeds the shares held or cash would have to go below zero by more than
    rounding (the trade list is then inconsistent)."""
    pos, cash, realised, flows = {}, 0.0, [], []
    for e in _sorted(entries):
        t = e["type"]
        if t == "deposit":
            cash += e["amount"]
            flows.append((e["date"], e["amount"]))
        elif t == "withdraw":
            cash -= e["amount"]
            flows.append((e["date"], -e["amount"]))
        elif t == "dividend":
            cash += e["amount"]
        else:
            f = split_factor(e["ticker"], e["date"])
            sh, px = e["shares"] * f, e["price"] / f
            p = pos.setdefault(e["ticker"], {"shares": 0.0, "cost": 0.0, "first_buy": e["date"], "reasons": []})
            if t == "buy":
                if p["shares"] <= EPS:
                    p["first_buy"], p["reasons"] = e["date"], []
                p["shares"] += sh
                p["cost"] += sh * px + e["fee"]
                p["reasons"].append({"date": e["date"], "reason": e["reason"], "tag": e.get("tag")})
                cash -= sh * px + e["fee"]
            else:
                if sh > p["shares"] + 1e-6:
                    raise JournalError(f"{e['date']}: selling {e['shares']} {e['ticker']} but only "
                                       f"{round(p['shares'] / f, 6)} held then")
                avg = p["cost"] / p["shares"] if p["shares"] > EPS else 0.0
                proceeds = sh * px - e["fee"]
                gain = proceeds - avg * sh
                realised.append({"id": e.get("id"), "date": e["date"], "ticker": e["ticker"], "shares": e["shares"],
                                 "price": e["price"], "gain": round(gain, 2),
                                 "gain_pct": round(gain / (avg * sh) * 100, 2) if avg * sh > 0 else None,
                                 "held_days": (date.fromisoformat(e["date"]) - date.fromisoformat(p["first_buy"])).days,
                                 "buy_reasons": list(p["reasons"]), "sell_reason": e["reason"], "tag": e.get("tag")})
                p["cost"] -= avg * sh
                p["shares"] -= sh
                cash += proceeds
                if p["shares"] <= 1e-6:
                    p["shares"], p["cost"] = 0.0, 0.0
    if cash < -0.01:
        raise JournalError(f"cash would be {cash:.2f}: add the deposit that paid for these buys")
    return {"positions": {s: p for s, p in pos.items() if p["shares"] > 1e-6}, "cash": cash,
            "realised": realised, "flows": flows}


def _close(rows, day):
    """Last close on or before `day` from [{date, close}] oldest first."""
    lo, hi = 0, len(rows)
    while lo < hi:
        mid = (lo + hi) // 2
        if rows[mid]["date"] <= day:
            lo = mid + 1
        else:
            hi = mid
    return rows[lo - 1]["close"] if lo else None


def daily_values(entries, days, closes, split_factor=lambda sym, day: 1.0):
    """Account value at each day's close: cash + shares x close (split-adjusted closes, today's shares)."""
    out = []
    ents = _sorted(entries)
    for d in days:
        upto = [e for e in ents if e["date"] <= d]
        lg = ledger(upto, split_factor)
        v = lg["cash"]
        for sym, p in lg["positions"].items():
            c = _close(closes.get(sym, []), d)
            v += p["shares"] * (c if c is not None else p["cost"] / p["shares"])
        flow = sum(a for day, a in lg["flows"] if day == d)
        out.append({"date": d, "value": v, "flow": flow})
    return out


def time_weighted(values):
    """Chain each day's return net of that day's outside money. Returns the growth curve (starts at 1)."""
    curve, g = [], 1.0
    prev = None
    for row in values:
        if prev is not None and prev > EPS:
            g *= (row["value"] - row["flow"]) / prev
        curve.append(g)
        prev = row["value"]
    return curve


def total_return_index(rows, divs, days):
    """SPY with dividends reinvested on the given days (split-adjusted closes, per-share dividends by ex-date)."""
    curve, g, prev = [], 1.0, None
    by_ex = {}
    for dv in divs:
        by_ex[dv["ex_date"]] = by_ex.get(dv["ex_date"], 0.0) + dv["amount"]
    last_day = None
    for d in days:
        c = _close(rows, d)
        if prev is not None and c is not None:
            paid = sum(a for ex, a in by_ex.items() if last_day < ex <= d)
            g *= (c + paid) / prev
        curve.append(g)
        if c is not None:
            prev, last_day = c, d
    return curve


def max_drawdown(curve):
    peak, worst = -math.inf, 0.0
    for x in curve:
        peak = max(peak, x)
        if peak > 0:
            worst = min(worst, x / peak - 1)
    return worst


def warnings_for(holdings, total, sectors, drawdown, trades_30d):
    """Plain-language risk notes (codes + numbers; the page words them)."""
    out = []
    if total <= 0:
        return out
    for h in holdings:
        if h["weight"] >= 20 and h["sector"] != "ETF / fund":          # an index fund is already spread out
            out.append({"code": "big_position", "ticker": h["ticker"], "pct": round(h["weight"], 1)})
    for name, w in sectors.items():
        if name not in ("cash", "ETF / fund", "Other") and w >= 40:
            out.append({"code": "big_sector", "sector": name, "pct": round(w, 1)})
    stocks = [h for h in holdings if h["sector"] != "ETF / fund"]
    if 0 < len(stocks) < 5 and not any(h["sector"] == "ETF / fund" for h in holdings):
        out.append({"code": "few_names", "n": len(stocks)})
    if drawdown <= -15:
        out.append({"code": "drawdown", "pct": round(drawdown, 1)})
    if trades_30d >= 10:
        out.append({"code": "many_trades", "n": trades_30d})
    return out
