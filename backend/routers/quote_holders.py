"""
Quote pages, Holders and Analysts tabs: /api/us/quote/{symbol}/holders and /analysts

Everything comes from Nasdaq's public API through services/nasdaq.py. Missing sections are null (never
guessed); an unknown symbol is a 404. Units: shares are whole shares, money is USD (Nasdaq sends some
institutional figures in thousands or millions, converted here), percents are percent numbers, dates ISO.
"""

import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from services import nasdaq as nq

router = APIRouter()
_pool = ThreadPoolExecutor(max_workers=8)

_HOLDERS_TTL = 12 * 3600
_ANALYSTS_TTL = 6 * 3600


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _rows(table):
    return ((table or {}).get("rows")) or []


def _int(v):
    n = nq.num(v)
    return int(round(n)) if n is not None else None


def _scaled(v, factor):
    n = nq.num(v)
    return n * factor if n is not None else None


# ── Holders ───────────────────────────────────────────────────────────────────

def _position(rows, label):
    for r in rows:
        if (r.get("positions") or "").strip().lower().startswith(label):
            return {"holders": _int(r.get("holders")), "shares": _int(r.get("shares"))}
    return None


def parse_ownership(h):
    """institutional-holdings -> (ownership dict, top institutions list); (None, []) without data."""
    if not h:
        return None, []
    own = h.get("ownershipSummary") or {}
    active = _rows(h.get("activePositions"))
    changes = _rows(h.get("newSoldOutPositions"))
    tx = h.get("holdingsTransactions") or {}
    total_row = _position(active, "total institutional")
    shares_text = tx.get("sharesHeld") or ""           # "11,164,389,806 Total Shares Held"
    inst_shares = (total_row or {}).get("shares") or _int(shares_text.split(" ")[0] if shares_text else None)
    holders_text = tx.get("institutionalHolders") or ""    # "6,519 Institutional Holders"
    count = _int(holders_text.split(" ")[0]) if holders_text else None
    count = count or (total_row or {}).get("holders") or _int(tx.get("totalRecords"))
    positions = {
        "increased": _position(active, "increased"), "decreased": _position(active, "decreased"),
        "held": _position(active, "held"), "new": _position(changes, "new"),
        "sold_out": _position(changes, "sold out"),
    }
    ownership = {
        "institutional_pct": nq.num(nq.val(own, "SharesOutstandingPCT")),
        "institutional_shares": inst_shares,
        "institutions_count": count,
        # both are in millions in Nasdaq's answer
        "shares_outstanding": _scaled(nq.val(own, "ShareoutstandingTotal"), 1e6),
        "total_value": _scaled(nq.val(own, "TotalHoldingsValue"), 1e6),
        "positions": positions,
    }
    if ownership["institutional_pct"] is None and not inst_shares and not any(positions.values()):
        ownership = None
    top = []
    for r in _rows(tx.get("table"))[:10]:
        top.append({
            "name": r.get("ownerName"), "shares": _int(r.get("sharesHeld")),
            "value": _scaled(r.get("marketValue"), 1000),        # column is "Value (In 1,000s)"
            "change_pct": nq.num(r.get("sharesChangePCT")), "as_of": nq.parse_date(r.get("date")),
        })
    return ownership, top


def _insider_summary(d):
    def pick(table, label, col):
        for r in _rows(table):
            if (r.get("insiderTrade") or "").strip().lower() == label:
                return _int(r.get(col))
        return None
    t, s = d.get("numberOfTrades"), d.get("numberOfSharesTraded")
    return {
        "buys_3m": pick(t, "number of open market buys", "months3"),
        "sells_3m": pick(t, "number of sells", "months3"),
        "buys_12m": pick(t, "number of open market buys", "months12"),
        "sells_12m": pick(t, "number of sells", "months12"),
        "shares_bought_3m": pick(s, "number of shares bought", "months3"),
        "shares_sold_3m": pick(s, "number of shares sold", "months3"),
        "shares_bought_12m": pick(s, "number of shares bought", "months12"),
        "shares_sold_12m": pick(s, "number of shares sold", "months12"),
    }


def parse_insiders(d):
    if not d:
        return None
    txs = []
    for r in _rows((d.get("transactionTable") or {}).get("table"))[:25]:
        shares, price = _int(r.get("sharesTraded")), nq.num(r.get("lastPrice"))
        kind = (r.get("transactionType") or "").strip()
        own = (r.get("ownType") or "").strip().lower()
        txs.append({
            "name": (r.get("insider") or "").strip(), "relation": r.get("relation"),
            "date": nq.parse_date(r.get("lastDate")), "type": kind, "shares": shares, "price": price,
            "value": round(shares * price, 2) if shares is not None and price else None,
            "shares_held": _int(r.get("sharesHeld")),
            "direct": (own == "direct") if own else None,
            # "Automatic Sell/Buy" are plans filed in advance under SEC Rule 10b5-1
            "planned": kind.lower().startswith("automatic"),
        })
    summary = _insider_summary(d)
    if not txs and all(v is None for v in summary.values()):
        return None       # zeros are an answer ("no trades"); only a missing table is not
    return {"summary": summary, "transactions": txs}


def parse_short_interest(d, shares_outstanding=None):
    rows = []
    for r in _rows((d or {}).get("shortInterestTable")):
        day, shares = nq.parse_date(r.get("settlementDate")), _int(r.get("interest"))
        if not day or shares is None:
            continue
        rows.append({"settlement_date": day, "shares_short": shares,
                     "avg_daily_volume": _int(r.get("avgDailyShareVolume")),
                     "days_to_cover": nq.num(r.get("daysToCover"))})
    rows.sort(key=lambda x: x["settlement_date"])
    rows = rows[-24:]
    if not rows:
        return None
    pct = round(rows[-1]["shares_short"] / shares_outstanding * 100, 2) if shares_outstanding else None
    return {"rows": rows, "latest_pct_of_shares": pct}


def build_holders(sym, ac):
    jobs = {
        "inst": f"company/{sym}/institutional-holdings?limit=10&type=TOTAL&sortColumn=marketValue",
        "insider": f"company/{sym}/insider-trades?limit=25&type=ALL&sortColumn=lastDate&sortOrder=DESC",
        "short": f"quote/{sym}/short-interest?assetClass={ac}",
    }
    futs = {k: _pool.submit(nq.get, p, None, 12) for k, p in jobs.items()}
    raw = {k: f.result() for k, f in futs.items()}
    ownership, top = parse_ownership(raw["inst"])
    out = {
        "symbol": sym, "asset_class": ac, "as_of": _now(),
        "ownership": ownership, "top_institutions": top,
        # Nasdaq answers for funds too, with zeros: insiders do not exist there
        "insiders": parse_insiders(raw["insider"]) if ac != "etf" else None,
        "short_interest": parse_short_interest(raw["short"], (ownership or {}).get("shares_outstanding")),
        "source": "Nasdaq",
    }
    # an all-empty answer is probably a failed fetch: do not let the cache keep it
    return out if ownership or top or out["insiders"] or out["short_interest"] else None


# ── Analysts ──────────────────────────────────────────────────────────────────

def parse_rating(ratings, target):
    c = (target or {}).get("consensusOverview") or {}
    buy, hold, sell = (_int(c.get(k)) for k in ("buy", "hold", "sell"))
    counts = [x for x in (buy, hold, sell) if x is not None]
    if not counts or not sum(counts):
        return None
    m = re.search(r"Based on (\d+) analysts", (ratings or {}).get("ratingsSummary") or "")
    mean = ((ratings or {}).get("meanRatingType") or "").strip() or None
    return {"mean": mean, "analysts": int(m.group(1)) if m else sum(counts), "buy": buy, "hold": hold,
            "sell": sell}


def parse_targets(target):
    c = (target or {}).get("consensusOverview") or {}
    low, avg, high = (nq.num(c.get(k)) for k in ("lowPriceTarget", "priceTarget", "highPriceTarget"))
    if not any((low, avg, high)):
        return None
    return {"low": low, "average": avg, "high": high}


def parse_history(target):
    out = []
    for p in (target or {}).get("historicalConsensus") or []:
        z = p.get("z") or {}
        day = nq.parse_date(z.get("date"))
        if not day:
            continue
        out.append({"date": day, "buy": _int(z.get("buy")), "hold": _int(z.get("hold")),
                    "sell": _int(z.get("sell")), "consensus": z.get("consensus"), "price": nq.num(p.get("y"))})
    out.sort(key=lambda x: x["date"])
    return out


_MONTHS = {m: i for i, m in enumerate(
    ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1)}


def _fiscal_end(text):
    """'Dec 2026' -> '2026-12' (a month, not a day: Nasdaq gives no day)."""
    m = re.match(r"([A-Z][a-z]{2}) (\d{4})$", (text or "").strip())
    return f"{m.group(2)}-{_MONTHS[m.group(1)]:02d}" if m and m.group(1) in _MONTHS else None


def _forecast_rows(block):
    out = []
    for r in _rows(block):
        end = _fiscal_end(r.get("fiscalEnd"))
        if not end:
            continue
        out.append({"fiscal_end": end, "consensus": nq.num(r.get("consensusEPSForecast")),
                    "high": nq.num(r.get("highEPSForecast")), "low": nq.num(r.get("lowEPSForecast")),
                    "estimates": _int(r.get("noOfEstimates")), "up": _int(r.get("up")),
                    "down": _int(r.get("down"))})
    return out


def parse_forecasts(f):
    q, y = _forecast_rows((f or {}).get("quarterlyForecast")), _forecast_rows((f or {}).get("yearlyForecast"))
    return {"quarterly": q, "yearly": y} if q or y else None


def parse_peg(p):
    v = nq.num(((p or {}).get("pegr") or {}).get("pegValue"))
    return {"value": v} if v else None       # Nasdaq sends 0.0 when there is no growth forecast


def build_analysts(sym):
    jobs = {"ratings": f"analyst/{sym}/ratings", "target": f"analyst/{sym}/targetprice",
            "forecast": f"analyst/{sym}/earnings-forecast", "peg": f"analyst/{sym}/peg-ratio"}
    futs = {k: _pool.submit(nq.get, p, None, 12) for k, p in jobs.items()}
    raw = {k: f.result() for k, f in futs.items()}
    out = {
        "symbol": sym, "as_of": _now(),
        "rating": parse_rating(raw["ratings"], raw["target"]),
        "targets": parse_targets(raw["target"]),
        "history": parse_history(raw["target"]),
        "forecasts": parse_forecasts(raw["forecast"]),
        "peg": parse_peg(raw["peg"]),
        "source": "Nasdaq",
    }
    return out if out["rating"] or out["targets"] or out["history"] or out["forecasts"] or out["peg"] else None


def _live_price(sym):
    d = nq.info(sym) or {}
    return nq.num((d.get("primaryData") or {}).get("lastSalePrice"))


def _symbol_and_class(symbol):
    sym = nq.clean_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    ac = nq.asset_class(sym)
    if not ac:
        raise HTTPException(status_code=404, detail="Unknown symbol")
    return sym, ac


@router.get("/{symbol}/holders")
def holders(symbol: str):
    sym, ac = _symbol_and_class(symbol)
    got = nq.cached(f"qholders_{sym}", _HOLDERS_TTL, lambda: build_holders(sym, ac), disk=True)
    return got or {"symbol": sym, "asset_class": ac, "as_of": _now(), "ownership": None,
                   "top_institutions": [], "insiders": None, "short_interest": None, "source": "Nasdaq"}


@router.get("/{symbol}/analysts")
def analysts(symbol: str):
    sym, ac = _symbol_and_class(symbol)
    got = nq.cached(f"qanalysts_{sym}", _ANALYSTS_TTL, lambda: build_analysts(sym), disk=True)
    out = dict(got or {"symbol": sym, "as_of": _now(), "rating": None, "targets": None, "history": [],
                       "forecasts": None, "peg": None, "source": "Nasdaq"})
    out["asset_class"] = ac
    if out.get("targets"):
        out["targets"] = {**out["targets"], "current": _live_price(sym)}
    return out
