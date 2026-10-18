"""
Paper trading engine: market rules, trading sessions, quotes, and one `Book` type for every
portfolio (an account's US / A-share / Hong Kong / Japan side, or a competition portfolio).

Order types
  market        fills at the last price while the exchange is open; placed while it is closed,
                it waits and fills at the first price after the open
  limit         buy/cover at or below the limit, sell/short at or above it
  stop          becomes a market order once the price reaches the stop (buy/cover: rises to it,
                sell/short: falls to it)
  stop_limit    once the stop is reached, works as a limit order
  trailing_stop sell/cover only: the stop follows the best price since the order was placed by
                a fixed percentage
Durations: "day" (expires at that trading day's close) or "gtc" (good until cancelled, 90 days).

Short selling (US only): proceeds are credited to cash and 150% of the short value is set aside,
so opening a short uses half of its value in buying power (a Reg T style initial margin).
Exchange holidays and half days follow each exchange's published calendar (HOLIDAYS / HALF_DAYS
below); a year that is not listed yet trades every weekday.
"""
from __future__ import annotations

import math
import secrets
import time
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException

MARKETS = ("us", "cn", "hk", "jp")
INITIAL = {"cn": 1_000_000.0, "us": 100_000.0, "hk": 1_000_000.0, "jp": 10_000_000.0}
CURRENCY = {"cn": "¥", "us": "$", "hk": "HK$", "jp": "¥"}
PREFIX = {"cn": "", "us": "us_", "hk": "hk_", "jp": "jp_"}
SHORT_MARKETS = ("us",)
SHORT_RESERVE = 1.5           # cash set aside per unit of short value
MIN_SHORT_PRICE = 1.0
GTC_DAYS = 90
ORDER_TYPES = ("market", "limit", "stop", "stop_limit", "trailing_stop")
SIDES = ("buy", "sell", "short", "cover")
BEIJING = timezone(timedelta(hours=8))

# Regular sessions, minutes after local midnight
SESSIONS = {
    "us": ("America/New_York", [(570, 960)]),
    "cn": ("Asia/Shanghai", [(570, 690), (780, 900)]),
    "hk": ("Asia/Hong_Kong", [(570, 720), (780, 960)]),
    "jp": ("Asia/Tokyo", [(540, 690), (750, 930)]),
}

# Weekday closures, from each exchange's own calendar. Refresh every year:
#   us  NYSE holidays (nyse.com/markets/hours-calendars)
#   cn  State Council holiday notice; matches the SSE/SZSE trading calendar (2027 not yet published)
#   hk  Hong Kong general holidays (gov.hk/en/about/abouthk/holiday), which HKEX follows
#   jp  JPX market holidays (jpx.co.jp/english/corporate/about-jpx/calendar)
HOLIDAYS = {
    "us": {
        "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03",
        "2026-09-07", "2026-11-26", "2026-12-25",
        "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05",
        "2027-09-06", "2027-11-25", "2027-12-24",
    },
    "cn": {
        "2026-01-01", "2026-01-02", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20",
        "2026-02-23", "2026-04-06", "2026-05-01", "2026-05-04", "2026-05-05", "2026-06-19", "2026-09-25",
        "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07",
    },
    "hk": {
        "2026-01-01", "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-03", "2026-04-06", "2026-04-07",
        "2026-05-01", "2026-05-25", "2026-06-19", "2026-07-01", "2026-10-01", "2026-10-19", "2026-12-25",
        "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-03-29", "2027-04-05", "2027-05-13",
        "2027-06-09", "2027-07-01", "2027-09-16", "2027-10-01", "2027-10-08", "2027-12-27",
    },
    "jp": {
        "2026-01-01", "2026-01-02", "2026-01-12", "2026-02-11", "2026-02-23", "2026-03-20", "2026-04-29",
        "2026-05-04", "2026-05-05", "2026-05-06", "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22",
        "2026-09-23", "2026-10-12", "2026-11-03", "2026-11-23", "2026-12-31",
        "2027-01-01", "2027-01-11", "2027-02-11", "2027-02-23", "2027-03-22", "2027-04-29", "2027-05-03",
        "2027-05-04", "2027-05-05", "2027-07-19", "2027-08-11", "2027-09-20", "2027-09-23", "2027-10-11",
        "2027-11-03", "2027-11-23", "2027-12-31",
    },
}
# Early closes (local minutes): NYSE 1:00 p.m.; HKEX morning only on the eves of Christmas,
# New Year and Lunar New Year
HALF_DAYS = {
    "us": {"2026-11-27": 780, "2026-12-24": 780, "2027-11-26": 780},
    "hk": {"2026-02-16": 720, "2026-12-24": 720, "2026-12-31": 720,
           "2027-02-05": 720, "2027-12-24": 720, "2027-12-31": 720},
}


def beijing_today() -> str:
    return datetime.now(BEIJING).strftime("%Y-%m-%d")


def rnd(market: str, v: float) -> float:
    return round(v, 4 if market == "us" else 2)


# ── Fees ─────────────────────────────────────────────────────────────────────

def fee(market: str, side: str, amount: float, shares: int) -> float:
    """A-shares: 0.03% to buy / 0.13% to sell (incl. stamp duty), minimum ¥5. US: SEC fee on sales.
    Hong Kong: 0.1% stamp duty (whole dollars, rounded up) + exchange levies. Japan: none."""
    if amount <= 0:
        return 0.0
    selling = side in ("sell", "short")
    if market == "cn":
        return round(max(5.0, amount * (0.0013 if selling else 0.0003)), 2)
    if market == "us":
        return round(shares * 0.000008, 6) if selling else 0.0
    if market == "hk":
        return round(math.ceil(amount * 0.001) + amount * 0.000085, 2)
    return 0.0


# ── Sessions ─────────────────────────────────────────────────────────────────

def _local(market: str, now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)).astimezone(ZoneInfo(SESSIONS[market][0]))


def sessions_on(market: str, day: date) -> list:
    """That local day's trading sessions as (start, end) minutes; [] on weekends and holidays."""
    key = day.isoformat()
    if day.weekday() >= 5 or key in HOLIDAYS[market]:
        return []
    half = HALF_DAYS.get(market, {}).get(key)
    if half is None:
        return list(SESSIONS[market][1])
    return [(a, min(b, half)) for a, b in SESSIONS[market][1] if a < half]


def is_open(market: str, now: Optional[datetime] = None) -> bool:
    t = _local(market, now)
    m = t.hour * 60 + t.minute
    return any(a <= m < b for a, b in sessions_on(market, t.date()))


def is_holiday(market: str, now: Optional[datetime] = None) -> bool:
    t = _local(market, now)
    return t.weekday() < 5 and t.date().isoformat() in HOLIDAYS[market]


def in_trading_day(market: str, now: Optional[datetime] = None) -> bool:
    """Between today's open and close (lunch break included): today's quote describes today."""
    t = _local(market, now)
    ss = sessions_on(market, t.date())
    m = t.hour * 60 + t.minute
    return bool(ss) and ss[0][0] <= m < ss[-1][1]


def check_price_band(market: str, q: dict, prices: list, now: Optional[datetime] = None) -> None:
    """A-shares: order prices must sit inside the day's limit-up / limit-down band, as on the exchange.
    Only checked during the trading day; outside it the feed still shows the previous day's band."""
    if market != "cn" or not in_trading_day(market, now):
        return
    up, down = q.get("limit_up"), q.get("limit_down")
    if not up or not down:
        return
    for p in prices:
        if p and not (down - 1e-9 <= p <= up + 1e-9):
            raise HTTPException(400, f"Price outside today's limit band ¥{down:,.2f}–¥{up:,.2f}")


def _at(day: datetime, minutes: int) -> datetime:
    return day.replace(hour=minutes // 60, minute=minutes % 60, second=0, microsecond=0)


def next_open(market: str, now: Optional[datetime] = None) -> datetime:
    t = _local(market, now)
    for d in range(0, 21):          # long enough for Golden Week and Lunar New Year
        day = t + timedelta(days=d)
        for a, _ in sessions_on(market, day.date()):
            start = _at(day, a)
            if start > t:
                return start
    return t + timedelta(days=1)


def day_close(market: str, now: Optional[datetime] = None) -> datetime:
    """End of the trading day an order placed now belongs to (today if a session is still ahead
    or running, else the next trading day)."""
    t = _local(market, now)
    today = sessions_on(market, t.date())
    if today and t.hour * 60 + t.minute < today[-1][1]:
        return _at(t, today[-1][1])
    nxt = next_open(market, now)
    return _at(nxt, sessions_on(market, nxt.date())[-1][1])


def session(market: str) -> dict:
    t = _local(market)
    open_ = is_open(market)
    return {
        "market": market, "open": open_, "local_time": t.strftime("%H:%M"), "tz": SESSIONS[market][0],
        "holiday": is_holiday(market),
        "next_open": None if open_ else next_open(market).isoformat(),
        "closes_at": day_close(market).isoformat() if open_ else None,
    }


# ── Quotes ───────────────────────────────────────────────────────────────────

_qcache: dict = {}            # (market, symbol) -> (ts, quote)
_QTTL = 15


def norm_symbol(market: str, symbol: str) -> str:
    s = (symbol or "").strip().upper()
    if market == "us":
        s = s.replace("-", ".")
        if not s or len(s) > 10 or not all(c.isalnum() or c == "." for c in s):
            raise HTTPException(400, "Invalid symbol")
        return s
    if market == "cn":
        s = s[-6:] if s[:2] in ("SH", "SZ", "BJ") else s
        if not (s.isdigit() and len(s) <= 6):
            raise HTTPException(400, "Invalid symbol")
        return s.zfill(6)
    from routers.global_stocks import normalize_code
    try:
        return normalize_code(market, s)
    except HTTPException:
        raise HTTPException(400, f"Unknown symbol {symbol}")


def _fetch(market: str, symbols: list) -> dict:
    """{symbol: {price, prev_close, name, lot}} straight from the quote feeds (no cache)."""
    out = {}
    if not symbols:
        return out
    try:
        if market == "us":
            from routers.us_market import us_quotes
            for s, q in us_quotes(symbols).items():
                p = float(q.get("price") or 0)
                if p > 0:
                    ch = q.get("change")
                    out[s] = {"price": p, "prev_close": (p - ch) if ch is not None else None,
                              "name": q.get("name") or s, "lot": 1}
        elif market == "cn":
            from services.stock_service import tencent_quotes
            for s, q in tencent_quotes(symbols, timeout=5).items():
                if q.get("price"):
                    out[s] = {"price": float(q["price"]), "prev_close": q.get("prev_close"), "name": q.get("name") or s, "lot": 100,
                              "limit_up": q.get("limit_up"), "limit_down": q.get("limit_down")}
        else:
            from routers.global_stocks import tencent_quotes as intl_quotes, _find, _display_name
            for s, q in intl_quotes(market, symbols, timeout=5).items():
                if q.get("price"):
                    row = _find(market, s)
                    lot = (q.get("lot") or row.get("lot") or 100) if market == "hk" else (1 if row.get("etf") else 100)
                    out[s] = {"price": float(q["price"]), "prev_close": q.get("prev_close"),
                              "name": _display_name(market, row, q) or s, "lot": int(lot)}
    except Exception:
        pass
    return out


def quotes(market: str, symbols) -> dict:
    now = time.time()
    symbols = [s for s in dict.fromkeys(symbols) if s]
    out, missing = {}, []
    for s in symbols:
        hit = _qcache.get((market, s))
        if hit and now - hit[0] < _QTTL:
            out[s] = hit[1]
        else:
            missing.append(s)
    if missing:
        got = _fetch(market, missing)
        for s, q in got.items():
            _qcache[(market, s)] = (now, q)
            out[s] = q
    return out


def quote_one(market: str, symbol: str) -> dict:
    for _ in range(2):
        q = quotes(market, [symbol]).get(symbol)
        if q:
            return q
        _qcache.pop((market, symbol), None)
    if market == "cn":          # the single-stock feed as a last resort
        try:
            from services.stock_service import get_realtime_quote
            q = get_realtime_quote(symbol)
            if q and q.get("price"):
                return {"price": float(q["price"]), "prev_close": q.get("prev_close"), "name": q.get("name") or symbol, "lot": 100}
        except Exception:
            pass
    raise HTTPException(503, f"Cannot fetch a price for {symbol}. Try again later.")


# ── Book ─────────────────────────────────────────────────────────────────────

class Book:
    """One portfolio stored inside an account dict, under a key prefix ("", "us_", "hk_", "jp_")
    or in its own dict (a competition)."""

    def __init__(self, store: dict, prefix: str, market: str, initial: float, short_ok: bool, kind: str = "market"):
        self.s, self.p, self.market, self.initial, self.short_ok, self.kind = store, prefix, market, initial, short_ok, kind
        store.setdefault(prefix + "cash", initial)
        for k, v in (("portfolio", {}), ("transactions", []), ("orders", []), ("shorts", {}), ("total_commission_paid", 0.0)):
            store.setdefault(prefix + k, v)

    def k(self, name: str) -> str:
        return self.p + name

    @property
    def cash(self) -> float:
        return self.s[self.k("cash")]

    @cash.setter
    def cash(self, v: float):
        self.s[self.k("cash")] = rnd(self.market, v)

    @property
    def portfolio(self) -> dict:
        return self.s[self.k("portfolio")]

    @property
    def shorts(self) -> dict:
        return self.s[self.k("shorts")]

    @property
    def transactions(self) -> list:
        return self.s[self.k("transactions")]

    @property
    def orders(self) -> list:
        return self.s[self.k("orders")]

    def open_orders(self) -> list:
        return [o for o in self.orders if o.get("status") == "open"]

    def add_fee(self, f: float):
        key = self.k("total_commission_paid")
        self.s[key] = round(self.s.get(key, 0) + f, 6)

    # quantities
    def available(self, symbol: str, today: str) -> int:
        """Shares that can be sold now: A-shares bought today are locked until tomorrow (T+1)."""
        pos = self.portfolio.get(symbol)
        if not pos:
            return 0
        n = int(pos["shares"])
        if self.market == "cn":
            if "lock_date" in pos:
                return n - (int(pos.get("lock_shares", 0)) if pos["lock_date"] == today else 0)
            return n if pos.get("buy_date", "") < today else 0
        return n

    def pending(self, side: str, symbol: str) -> int:
        return sum(int(o["shares"]) for o in self.open_orders() if o["side"] == side and o["symbol"] == symbol)

    def reserved(self) -> float:
        return sum(float(o.get("reserve") or 0) for o in self.open_orders())

    def short_value(self, prices: dict) -> float:
        return sum(int(p["shares"]) * prices.get(s, p["avg_price"]) for s, p in self.shorts.items())

    def long_value(self, prices: dict) -> float:
        return sum(int(p["shares"]) * prices.get(s, p["avg_cost"]) for s, p in self.portfolio.items())

    def value(self, prices: dict) -> float:
        return self.cash + self.long_value(prices) - self.short_value(prices)

    def buying_power(self, prices: dict) -> float:
        return self.cash - self.reserved() - SHORT_RESERVE * self.short_value(prices)

    def symbols(self) -> set:
        return set(self.portfolio) | set(self.shorts) | {o["symbol"] for o in self.open_orders()}


# ── Fills ────────────────────────────────────────────────────────────────────

def execute(book: Book, side: str, symbol: str, shares: int, price: float, name: str, lot: int,
            today: str, order_id: Optional[str] = None, check_cash: bool = True) -> dict:
    """Apply one fill to the book. Raises HTTPException(400) if the book cannot afford or does not hold it."""
    m = book.market
    amount = rnd(m, price * shares)
    f = fee(m, side, amount, shares)
    tx = {"date": today, "time": datetime.now(BEIJING).strftime("%H:%M"), "type": side, "symbol": symbol, "name": name,
          "shares": shares, "price": price, "amount": amount, "commission": f, "market": m}
    if order_id:
        tx["order_id"] = order_id
    cur = CURRENCY[m]

    if side == "buy":
        total = amount + f
        if check_cash and book.cash + 1e-9 < total:
            raise HTTPException(400, f"Insufficient funds. Need {cur}{total:,.2f}, available {cur}{book.cash:,.2f}")
        book.cash = book.cash - total
        pos = book.portfolio.get(symbol)
        if pos:
            n = int(pos["shares"]) + shares
            pos.update(shares=n, avg_cost=round((pos["avg_cost"] * pos["shares"] + amount) / n, 4), name=pos.get("name") or name)
        else:
            pos = {"shares": shares, "avg_cost": round(price, 4), "buy_date": today, "name": name, "lot": lot}
            book.portfolio[symbol] = pos
        if m == "cn":       # T+1: today's purchases are locked until tomorrow
            if pos.get("lock_date") == today:
                pos["lock_shares"] = int(pos.get("lock_shares", 0)) + shares
            else:
                pos["lock_date"], pos["lock_shares"] = today, shares
        if m == "us":
            pos.setdefault("available_date", today)
        tx["available_date"] = (datetime.strptime(today, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d") if m == "cn" else today
        result = {"total_cost": rnd(m, total)}

    elif side == "sell":
        pos = book.portfolio.get(symbol)
        if not pos:
            raise HTTPException(400, f"You don't hold any {symbol}")
        if shares > book.available(symbol, today):
            raise HTTPException(400, "T+1: shares bought today can be sold tomorrow" if m == "cn"
                                else f"Insufficient shares. Hold {pos['shares']}, tried to sell {shares}")
        net = amount - f
        cost = pos["avg_cost"] * shares
        pl = rnd(m, net - cost)
        book.cash = book.cash + net
        left = int(pos["shares"]) - shares
        if left <= 0:
            del book.portfolio[symbol]
        else:
            pos["shares"] = left
            if pos.get("lock_date") == today:
                pos["lock_shares"] = min(int(pos.get("lock_shares", 0)), left)
        tx["profit_loss"] = pl
        result = {"net_proceeds": rnd(m, net), "profit_loss": pl,
                  "profit_loss_pct": round(pl / cost * 100 if cost else 0, 2)}

    elif side == "short":
        if not book.short_ok:
            raise HTTPException(400, "Short selling is not available for this portfolio")
        if price < MIN_SHORT_PRICE:
            raise HTTPException(400, f"Shares under {cur}{MIN_SHORT_PRICE:.0f} cannot be sold short")
        net = amount - f
        book.cash = book.cash + net
        sp = book.shorts.get(symbol)
        if sp:
            n = int(sp["shares"]) + shares
            sp.update(shares=n, avg_price=round((sp["avg_price"] * sp["shares"] + amount) / n, 4))
        else:
            book.shorts[symbol] = {"shares": shares, "avg_price": round(price, 4), "open_date": today, "name": name}
        result = {"net_proceeds": rnd(m, net)}

    elif side == "cover":
        sp = book.shorts.get(symbol)
        if not sp or int(sp["shares"]) < shares:
            raise HTTPException(400, f"You are not short {shares} shares of {symbol}")
        total = amount + f
        pl = rnd(m, sp["avg_price"] * shares - total)
        book.cash = book.cash - total
        left = int(sp["shares"]) - shares
        if left <= 0:
            del book.shorts[symbol]
        else:
            sp["shares"] = left
        tx["profit_loss"] = pl
        result = {"total_cost": rnd(m, total), "profit_loss": pl,
                  "profit_loss_pct": round(pl / (sp["avg_price"] * shares) * 100 if sp["avg_price"] else 0, 2)}
    else:
        raise HTTPException(400, "Unknown side")

    book.add_fee(f)
    book.transactions.append(tx)
    return {"price": price, "commission": f, "cash_remaining": book.cash, **result}


# ── Corporate actions ────────────────────────────────────────────────────────

CORP_TYPES = ("dividend", "split", "bonus")


def apply_action(book: Book, a: dict, today: str) -> list:
    """Apply one corporate action (see services/corporate_actions) to the book, once.
    Dividends: holders receive cash per share, short sellers pay it. Splits and bonus shares:
    shares scale by the ratio with the cost basis kept; a fraction left over is paid out in cash
    at the pre-action price (cash in lieu); open orders on the stock are rescaled.
    `a["price"]` is the last price before the action (needed for cash in lieu).
    Returns the transactions written."""
    applied = book.s.setdefault(book.k("corp_actions"), [])
    key = f"{a['type']}:{a['symbol']}:{a['date']}"
    if key in applied:
        return []
    m, sym = book.market, a["symbol"]
    pos, sp = book.portfolio.get(sym), book.shorts.get(sym)
    now = datetime.now(BEIJING).strftime("%H:%M")
    base = {"date": today, "time": now, "symbol": sym, "market": m, "commission": 0.0, "ex_date": a["date"]}
    txs = []

    if a["type"] == "dividend":
        cash = float(a["cash"])
        if pos:
            n = int(pos["shares"])
            amt = rnd(m, n * cash)
            book.cash = book.cash + amt
            txs.append({**base, "type": "dividend", "name": pos.get("name", ""), "shares": n, "price": cash, "amount": amt})
        if sp:
            n = int(sp["shares"])
            amt = rnd(m, n * cash)
            book.cash = book.cash - amt                      # the short seller owes the dividend to the lender
            txs.append({**base, "type": "dividend", "name": sp.get("name", ""), "shares": -n, "price": cash, "amount": -amt})

    elif a["type"] in ("split", "bonus"):
        if a["type"] == "split":
            r, label = a["new"] / a["old"], f"{a['new']}:{a['old']}"
        else:
            r, label = 1 + float(a["bonus"]), f"+{round(float(a['bonus']) * 10, 4):g}/10"
        px = float(a.get("price") or 0)
        for held, sign, cost_key in ((pos, 1, "avg_cost"), (sp, -1, "avg_price")):
            if not held:
                continue
            old = int(held["shares"])
            exact = old * r
            new = int(exact + 1e-9)
            lieu = rnd(m, (exact - new) * px / r) if px else 0.0
            book.cash = book.cash + sign * lieu
            if new <= 0:
                (book.portfolio if sign > 0 else book.shorts).pop(sym, None)
            else:
                held["shares"] = new
                held[cost_key] = round(held[cost_key] * old / exact, 4)
                if "lock_shares" in held:
                    held["lock_shares"] = min(new, int(int(held["lock_shares"]) * r + 1e-9))
            txs.append({**base, "type": a["type"], "name": held.get("name", ""), "shares": sign * (new - old),
                        "price": 0.0, "amount": sign * lieu, "ratio": label})
        for o in book.open_orders():
            if o["symbol"] != sym:
                continue
            o["shares"] = int(int(o["shares"]) * r + 1e-9)
            for f in ("limit_price", "stop_price", "watermark", "ref_price"):
                if o.get(f):
                    o[f] = round(o[f] / r, 4)
            if o["shares"] <= 0:
                o.update(status="cancelled", reason="Cancelled by a share consolidation", closed_at=datetime.now(timezone.utc).isoformat())

    book.transactions.extend(txs)
    applied.append(key)
    del applied[:-500]
    return txs


# ── Orders ───────────────────────────────────────────────────────────────────

def new_order_id() -> str:
    return "o" + secrets.token_hex(5)


def triggered(o: dict, p: float) -> bool:
    """Has a stop (or stop-limit trigger) been reached at price p?"""
    up = o["side"] in ("buy", "cover")
    return p >= o["stop_price"] if up else p <= o["stop_price"]


def limit_ok(o: dict, p: float) -> bool:
    up = o["side"] in ("buy", "cover")
    return p <= o["limit_price"] if up else p >= o["limit_price"]


def should_fill(o: dict, p: float) -> bool:
    """Decide whether an open order fills at price p (the exchange is open). Updates trailing
    watermarks and the stop-limit trigger flag in place."""
    t = o["type"]
    if t == "market":
        return True
    if t == "limit":
        return limit_ok(o, p)
    if t == "stop":
        return triggered(o, p)
    if t == "stop_limit":
        if not o.get("triggered") and triggered(o, p):
            o["triggered"] = True
        return bool(o.get("triggered")) and limit_ok(o, p)
    if t == "trailing_stop":
        pct = float(o["trail_pct"]) / 100
        if o["side"] == "sell":
            o["watermark"] = max(float(o.get("watermark") or p), p)
            o["stop_price"] = round(o["watermark"] * (1 - pct), 4)
            return p <= o["stop_price"]
        o["watermark"] = min(float(o.get("watermark") or p), p)
        o["stop_price"] = round(o["watermark"] * (1 + pct), 4)
        return p >= o["stop_price"]
    return False


def reserve_for(market: str, side: str, shares: int, ref_price: float, o: dict) -> float:
    """Buying power set aside while the order is open."""
    if side == "buy":
        px = o.get("limit_price") if o["type"] in ("limit", "stop_limit") else max(ref_price, o.get("stop_price") or 0)
        px = float(px or ref_price) * (1 if o["type"] in ("limit", "stop_limit") else 1.02)   # market/stop: 2% slippage room
        amount = px * shares
        return rnd(market, amount + fee(market, "buy", amount, shares))
    if side == "short":
        px = float(o.get("limit_price") or o.get("stop_price") or ref_price)
        return rnd(market, (SHORT_RESERVE - 1) * px * shares)
    return 0.0


# ── Views ────────────────────────────────────────────────────────────────────

def book_view(book: Book, q: dict, today: str, tx_limit: int = 50) -> dict:
    """Everything a client shows for one portfolio. `q` maps symbol -> quote for this market."""
    prices = {s: v["price"] for s, v in q.items()}
    m = book.market
    port, day_change, unreal = {}, 0.0, 0.0
    for s, pos in book.portfolio.items():
        n = int(pos["shares"])
        price = prices.get(s, pos["avg_cost"])
        mv, cb = rnd(m, price * n), rnd(m, pos["avg_cost"] * n)
        prev = (q.get(s) or {}).get("prev_close")
        dc = (price - prev) * n if prev and pos.get("buy_date", "") < today else (price - pos["avg_cost"]) * n
        day_change += dc
        unreal += mv - cb
        port[s] = {
            "shares": n, "avg_cost": pos["avg_cost"], "current_price": price, "market_value": mv,
            "profit_loss": rnd(m, mv - cb), "profit_loss_pct": round((mv - cb) / cb * 100 if cb else 0, 2),
            "available_shares": book.available(s, today), "buy_date": pos.get("buy_date", ""),
            "available_date": pos.get("available_date", ""), "name": pos.get("name") or (q.get(s) or {}).get("name", ""),
            "lot": pos.get("lot") or (q.get(s) or {}).get("lot"), "day_change": rnd(m, dc),
        }
    shorts = {}
    for s, sp in book.shorts.items():
        n = int(sp["shares"])
        price = prices.get(s, sp["avg_price"])
        mv = rnd(m, price * n)
        pl = rnd(m, (sp["avg_price"] - price) * n)
        prev = (q.get(s) or {}).get("prev_close")
        dc = -(price - prev) * n if prev and sp.get("open_date", "") < today else pl
        day_change += dc
        unreal += pl
        shorts[s] = {"shares": n, "avg_price": sp["avg_price"], "current_price": price, "market_value": mv,
                     "profit_loss": pl, "profit_loss_pct": round(pl / (sp["avg_price"] * n) * 100 if sp["avg_price"] else 0, 2),
                     "open_date": sp.get("open_date", ""), "name": sp.get("name", ""), "day_change": rnd(m, dc)}
    total = rnd(m, book.value(prices))
    closed = [t for t in book.transactions if t.get("type") in ("sell", "cover") and t.get("profit_loss") is not None]
    wins = [t for t in closed if t["profit_loss"] > 0]
    best = max(closed, key=lambda t: t["profit_loss"], default=None)
    worst = min(closed, key=lambda t: t["profit_loss"], default=None)
    start_value = total - day_change
    slim = lambda t: t and {k: t.get(k) for k in ("symbol", "name", "profit_loss", "date")}
    orders = [o for o in book.orders if o.get("status") == "open"] + \
             [o for o in reversed(book.orders) if o.get("status") != "open"][:20]
    return {
        "market": m, "currency": CURRENCY[m], "initial": book.initial,
        "cash": rnd(m, book.cash), "buying_power": rnd(m, max(book.buying_power(prices), 0)),
        "reserved": rnd(m, book.reserved()), "total_value": total,
        "return_pct": round((total - book.initial) / book.initial * 100, 4),
        "commission_paid": book.s.get(book.k("total_commission_paid"), 0),
        "portfolio": port, "shorts": shorts, "short_ok": book.short_ok,
        "orders": orders, "transactions": book.transactions[-tx_limit:],
        "analytics": {
            "day_change": rnd(m, day_change), "day_change_pct": round(day_change / start_value * 100 if start_value else 0, 2),
            "unrealized_pl": rnd(m, unreal), "realized_pl": rnd(m, sum(t["profit_loss"] for t in closed)),
            "trades": sum(1 for t in book.transactions if t.get("type") in SIDES), "closed_trades": len(closed),
            "win_rate": round(len(wins) / len(closed) * 100, 1) if closed else None,
            "best_trade": slim(best), "worst_trade": slim(worst),
            "fees_paid": book.s.get(book.k("total_commission_paid"), 0),
        },
        "session": session(m),
    }
