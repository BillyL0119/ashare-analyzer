"""
Quote pages, Statistics tab: /api/us/quote/{symbol}/stats

About 60 figures in the groups Yahoo Finance uses (valuation, profitability, income, balance sheet, cash
flow, price history, share statistics, dividends), computed from Nasdaq's public statements and the shared
price series. A figure that cannot be computed honestly is null (the page shows a dash): a negative EPS has
no P/E, a company with negative equity has no P/B or ROE, a missing quarter makes the TTM figures null.

Two layers, so the figures move with the price without refetching statements:
  * `_gather` collects every price-independent ingredient (statements, forecast, short interest, ...)
    and is cached for an hour;
  * `compute` turns ingredients + the live price into the payload. It is pure, so tests feed it saved
    Nasdaq answers.

EPS, P/E, beta and average volume come from services/nasdaq so the Summary tab always agrees.
Statements arrive in thousands of dollars and are converted to dollars here.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from services import nasdaq as nq

router = APIRouter()
log = logging.getLogger("quote_stats")

_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="quote_stats")
_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}

GROUPS = [
    ("valuation", ["market_cap", "enterprise_value", "pe_ttm", "pe_forward", "peg_forward", "price_sales_ttm",
                   "price_book_mrq", "ev_revenue_ttm", "ev_ebitda_ttm"]),
    ("fiscal", ["fiscal_year_end", "most_recent_quarter"]),
    ("profitability", ["profit_margin_ttm", "operating_margin_ttm", "gross_margin_ttm"]),
    ("management", ["roa_ttm", "roe_ttm"]),
    ("income", ["revenue_ttm", "revenue_per_share_ttm", "quarterly_revenue_growth_yoy", "gross_profit_ttm",
                "ebitda_ttm", "net_income_ttm", "eps_ttm", "quarterly_eps_growth_yoy"]),
    ("balance", ["total_cash_mrq", "cash_per_share_mrq", "total_debt_mrq", "debt_equity_mrq", "current_ratio_mrq",
                 "quick_ratio_mrq", "book_value_per_share_mrq"]),
    ("cashflow", ["operating_cash_flow_ttm", "capex_ttm", "free_cash_flow_ttm"]),
    ("price_history", ["beta_5y_monthly", "change_52w", "sp500_change_52w", "week52_high", "week52_low",
                       "ma_50", "ma_200"]),
    ("shares", ["avg_volume_3m", "avg_volume_10d", "shares_outstanding", "institutional_pct", "shares_short",
                "short_ratio", "short_pct_shares_out", "shares_short_prior"]),
    ("dividends", ["forward_dividend_rate", "forward_dividend_yield", "trailing_dividend_rate",
                   "trailing_dividend_yield", "payout_ratio", "dividend_date", "ex_dividend_date"]),
]

# key -> (fmt, period tag). The tag says what time span the figure covers.
META = {
    "market_cap": ("money", None), "enterprise_value": ("money", None), "pe_ttm": ("ratio", "ttm"),
    "pe_forward": ("ratio", None), "peg_forward": ("ratio", None), "price_sales_ttm": ("ratio", "ttm"),
    "price_book_mrq": ("ratio", "mrq"), "ev_revenue_ttm": ("ratio", "ttm"), "ev_ebitda_ttm": ("ratio", "ttm"),
    "fiscal_year_end": ("date", "fy"), "most_recent_quarter": ("date", "mrq"),
    "profit_margin_ttm": ("pct", "ttm"), "operating_margin_ttm": ("pct", "ttm"), "gross_margin_ttm": ("pct", "ttm"),
    "roa_ttm": ("pct", "ttm"), "roe_ttm": ("pct", "ttm"),
    "revenue_ttm": ("money", "ttm"), "revenue_per_share_ttm": ("price", "ttm"),
    "quarterly_revenue_growth_yoy": ("signed_pct", "mrq"), "gross_profit_ttm": ("money", "ttm"),
    "ebitda_ttm": ("money", "ttm"), "net_income_ttm": ("money", "ttm"), "eps_ttm": ("price", "ttm"),
    "quarterly_eps_growth_yoy": ("signed_pct", "mrq"),
    "total_cash_mrq": ("money", "mrq"), "cash_per_share_mrq": ("price", "mrq"), "total_debt_mrq": ("money", "mrq"),
    "debt_equity_mrq": ("pct", "mrq"), "current_ratio_mrq": ("ratio", "mrq"), "quick_ratio_mrq": ("ratio", "mrq"),
    "book_value_per_share_mrq": ("price", "mrq"),
    "operating_cash_flow_ttm": ("money", "ttm"), "capex_ttm": ("money", "ttm"), "free_cash_flow_ttm": ("money", "ttm"),
    "beta_5y_monthly": ("ratio", None), "change_52w": ("signed_pct", None), "sp500_change_52w": ("signed_pct", None),
    "week52_high": ("price", None), "week52_low": ("price", None), "ma_50": ("price", None), "ma_200": ("price", None),
    "avg_volume_3m": ("compact", None), "avg_volume_10d": ("compact", None), "shares_outstanding": ("compact", None),
    "institutional_pct": ("pct", None), "shares_short": ("compact", None), "short_ratio": ("ratio", None),
    "short_pct_shares_out": ("pct", None), "shares_short_prior": ("compact", None),
    "forward_dividend_rate": ("price", None), "forward_dividend_yield": ("pct", None),
    "trailing_dividend_rate": ("price", "ttm"), "trailing_dividend_yield": ("pct", "ttm"),
    "payout_ratio": ("pct", "ttm"), "dividend_date": ("date", None), "ex_dividend_date": ("date", None),
}


# ── Statement parsing ─────────────────────────────────────────────────────────

def _table(data, name, scale=1000.0):
    """Nasdaq statement table -> (period end dates newest first, {row label: [4 values]}).
    Statement rows come in thousands of dollars: scale=1000 gives dollars; ratios use scale=1."""
    tb = (data or {}).get(name) or {}
    headers = tb.get("headers") or {}
    periods = [nq.parse_date(headers.get(f"value{i}") or "") for i in range(2, 6)]
    rows = {}
    for r in tb.get("rows") or []:
        label = (r.get("value1") or "").strip()
        if not label:
            continue
        vals = [nq.num(r.get(f"value{i}")) for i in range(2, 6)]
        rows[label] = [v * scale if v is not None else None for v in vals]
    return periods, rows


def parse_statements(data):
    """company/{sym}/financials answer -> {"periods", "inc", "bal", "cf", "ratios"} or None."""
    if not data:
        return None
    periods, inc = _table(data, "incomeStatementTable")
    _, bal = _table(data, "balanceSheetTable")
    _, cf = _table(data, "cashFlowTable")
    _, ratios = _table(data, "financialRatiosTable", scale=1)
    if not inc.get("Total Revenue") or not periods[0]:
        return None
    return {"periods": periods, "inc": inc, "bal": bal, "cf": cf, "ratios": ratios}


def _consecutive(periods) -> bool:
    """The four columns are four consecutive quarters (three quarter-gaps is 250-300 days)."""
    if len(periods) < 4 or not periods[0] or not periods[3]:
        return False
    span = (date.fromisoformat(periods[0]) - date.fromisoformat(periods[3])).days
    return 250 <= span <= 300


def _ttm(q, table, label):
    """Sum of the last four quarters of one statement line; None if a quarter is missing."""
    if not q or not _consecutive(q["periods"]):
        return None
    vals = (q[table].get(label) or [None] * 4)[:4]
    return sum(vals) if all(v is not None for v in vals) else None


def _mrq(q, table, label):
    vals = (q[table].get(label) if q else None) or [None]
    return vals[0]


# ── Small calculations ────────────────────────────────────────────────────────

def _div(a, b, digits=2):
    return round(a / b, digits) if a is not None and b else None


def _pct(a, b):
    return round(a / b * 100, 2) if a is not None and b else None


def _first_forecast_year_eps(forecast_rows, last_fy_end):
    """Consensus EPS of the first fiscal year that ends after the last reported fiscal year."""
    if not last_fy_end:
        return None
    last = (int(last_fy_end[:4]), int(last_fy_end[5:7]))
    best = None
    for r in forecast_rows or []:
        parts = str(r.get("fiscalEnd") or "").split()
        if len(parts) != 2 or parts[0] not in _MONTHS or not parts[1].isdigit():
            continue
        key = (int(parts[1]), _MONTHS[parts[0]])
        if key > last and (best is None or key < best[0]):
            best = (key, nq.num(r.get("consensusEPSForecast")))
    return best[1] if best else None


def _year_ago(day: str) -> str:
    d = date.fromisoformat(day)
    try:
        return d.replace(year=d.year - 1).isoformat()
    except ValueError:                       # Feb 29
        return d.replace(year=d.year - 1, day=28).isoformat()


def _change_52w(rows):
    if not rows:
        return None
    last = rows[-1]
    old = nq.close_on_or_before(rows, _year_ago(last["date"]))
    # a stock younger than a year has no 52-week change: the base bar must be a real session near that date
    if not old or (date.fromisoformat(_year_ago(last["date"])) - date.fromisoformat(old["date"])).days > 7:
        return None
    return nq.pct_change(last["close"], old["close"])


def _ma(rows, n):
    closes = [r["close"] for r in rows[-n:]]
    return round(sum(closes) / n, 2) if len(closes) == n else None


def _yoy(items, field):
    """Latest quarter vs the quarter 350-380 days earlier (items oldest first with "period_end")."""
    items = [x for x in items if x.get(field) is not None]
    if not items:
        return None, None
    new = items[-1]
    end = date.fromisoformat(new["period_end"])
    for old in reversed(items[:-1]):
        gap = (end - date.fromisoformat(old["period_end"])).days
        if 350 <= gap <= 380:
            return new[field], old[field]
    return None, None


def _split_range(v):
    """'$360.83/$243.42' -> (high, low)"""
    if isinstance(v, str) and "/" in v:
        a, b = v.split("/", 1)
        return nq.num(a), nq.num(b)
    return None, None


# ── Compute (pure) ────────────────────────────────────────────────────────────

def compute(ctx, price, summ, today=None):
    """Ingredients (`_gather`), live price and Nasdaq summaryData -> {key: (value, extra)} per row key.
    `extra` is a dict of additional row fields (the short-interest settlement date)."""
    today = today or datetime.now(nq.ET).date()
    q = ctx.get("quarterly")
    out = {}

    def put(key, v, **extra):
        out[key] = (v, extra)

    mc = nq.num(nq.val(summ, "MarketCap"))
    hi, lo = _split_range(nq.val(summ, "FiftTwoWeekHighLow"))
    shares = ctx.get("shares_outstanding") or (mc / price if mc and price else None)

    # statement ingredients (dollars)
    revenue = _ttm(q, "inc", "Total Revenue")
    gross = _ttm(q, "inc", "Gross Profit")
    op_inc = _ttm(q, "inc", "Operating Income")
    net = _ttm(q, "inc", "Net Income")
    ebit = _ttm(q, "inc", "Earnings Before Interest and Tax")
    dep = _ttm(q, "cf", "Depreciation")
    ebitda = ebit + dep if ebit is not None and dep is not None else None
    ocf = _ttm(q, "cf", "Net Cash Flow-Operating")
    capex = _ttm(q, "cf", "Capital Expenditures")
    fcf = ocf + capex if ocf is not None and capex is not None else None

    cash_c = _mrq(q, "bal", "Cash and Cash Equivalents")
    sti = _mrq(q, "bal", "Short-Term Investments")
    cash = cash_c + (sti or 0) if cash_c is not None else None
    std, ltd = _mrq(q, "bal", "Short-Term Debt / Current Portion of Long-Term Debt"), _mrq(q, "bal", "Long-Term Debt")
    has_bs = _mrq(q, "bal", "Total Assets") is not None
    debt = (std or 0) + (ltd or 0) if has_bs else None     # an absent debt line means no such debt
    equity = _mrq(q, "bal", "Total Equity")
    assets = _mrq(q, "bal", "Total Assets")
    cur_a, cur_l = _mrq(q, "bal", "Total Current Assets"), _mrq(q, "bal", "Total Current Liabilities")
    pos_equity = equity if equity and equity > 0 else None    # P/B, ROE, debt/equity mean nothing otherwise

    # valuation
    ev = mc + debt - cash if mc is not None and debt is not None and cash is not None else None
    eps = ctx.get("eps_ttm")
    fwd_eps = _first_forecast_year_eps(ctx.get("forecast"), ctx.get("last_fy_end"))
    put("market_cap", mc)
    put("enterprise_value", round(ev) if ev is not None else None)
    put("pe_ttm", nq.pe_ttm(price, eps))
    put("pe_forward", _div(price, fwd_eps) if fwd_eps and fwd_eps > 0 else None)
    put("peg_forward", ctx.get("peg"))
    put("price_sales_ttm", _div(mc, revenue))
    put("price_book_mrq", _div(mc, pos_equity))
    put("ev_revenue_ttm", _div(ev, revenue))
    put("ev_ebitda_ttm", _div(ev, ebitda) if ebitda and ebitda > 0 else None)

    # fiscal
    put("fiscal_year_end", ctx.get("last_fy_end"))
    put("most_recent_quarter", q["periods"][0] if q else None)

    # margins and returns
    put("profit_margin_ttm", _pct(net, revenue))
    put("operating_margin_ttm", _pct(op_inc, revenue))
    put("gross_margin_ttm", _pct(gross, revenue))
    put("roa_ttm", _pct(net, assets))
    put("roe_ttm", _pct(net, pos_equity))

    # income statement
    rev_new, rev_old = _yoy(ctx.get("qres") or [], "revenue")
    eps_new, eps_old = _yoy(ctx.get("qres") or [], "eps")
    put("revenue_ttm", round(revenue) if revenue is not None else None)
    put("revenue_per_share_ttm", _div(revenue, shares))
    put("quarterly_revenue_growth_yoy", nq.pct_change(rev_new, rev_old) if rev_old and rev_old > 0 else None)
    put("gross_profit_ttm", round(gross) if gross is not None else None)
    put("ebitda_ttm", round(ebitda) if ebitda is not None else None)
    put("net_income_ttm", round(net) if net is not None else None)
    put("eps_ttm", eps)
    put("quarterly_eps_growth_yoy", nq.pct_change(eps_new, eps_old) if eps_old and eps_old > 0 else None)

    # balance sheet
    qr = (q["ratios"].get("Quick Ratio") if q else None) or [None]
    put("total_cash_mrq", round(cash) if cash is not None else None)
    put("cash_per_share_mrq", _div(cash, shares))
    put("total_debt_mrq", round(debt) if debt is not None else None)
    put("debt_equity_mrq", _pct(debt, pos_equity))
    put("current_ratio_mrq", _div(cur_a, cur_l))
    put("quick_ratio_mrq", round(qr[0] / 100, 2) if qr[0] is not None else None)     # Nasdaq prints it as a percent
    put("book_value_per_share_mrq", _div(equity, shares))

    # cash flow
    put("operating_cash_flow_ttm", round(ocf) if ocf is not None else None)
    put("capex_ttm", round(capex) if capex is not None else None)
    put("free_cash_flow_ttm", round(fcf) if fcf is not None else None)

    # price history
    hist, spy = ctx.get("hist") or [], ctx.get("spy") or []
    put("beta_5y_monthly", ctx.get("beta"))
    put("change_52w", _change_52w(hist))
    put("sp500_change_52w", _change_52w(spy))
    put("week52_high", hi)
    put("week52_low", lo)
    put("ma_50", _ma(hist, 50))
    put("ma_200", _ma(hist, 200))

    # share statistics
    si = ctx.get("short") or []
    cur, prior = (si[0] if si else None), (si[1] if len(si) > 1 else None)
    put("avg_volume_3m", ctx.get("avg_volume_3m"))
    put("avg_volume_10d", ctx.get("avg_volume_10d"))
    put("shares_outstanding", round(shares) if shares else None)
    put("institutional_pct", ctx.get("institutional_pct"))
    put("shares_short", cur["shares"] if cur else None, as_of=cur["date"] if cur else None)
    put("short_ratio", round(cur["days"], 2) if cur and cur["days"] is not None else None, as_of=cur["date"] if cur else None)
    put("short_pct_shares_out", _pct(cur["shares"], shares) if cur else None, as_of=cur["date"] if cur else None)
    put("shares_short_prior", prior["shares"] if prior else None, as_of=prior["date"] if prior else None)

    # dividends
    divs = [d for d in ctx.get("dividends") or [] if d.get("type") in (None, "Cash")]
    since = (today - timedelta(days=365)).isoformat()
    paid = [d["amount"] for d in divs if since < d["ex_date"] <= today.isoformat()]
    trailing = round(sum(paid), 4) if paid else None
    pay_dates = [d["pay_date"] for d in divs if d.get("pay_date")]
    ex_text = nq.val(summ, "ExDividendDate")
    put("forward_dividend_rate", nq.num(nq.val(summ, "AnnualizedDividend")))
    put("forward_dividend_yield", nq.num(nq.val(summ, "Yield")))
    put("trailing_dividend_rate", trailing)
    put("trailing_dividend_yield", _pct(trailing, price))
    put("payout_ratio", _pct(trailing, eps) if eps and eps > 0 else None)
    put("dividend_date", max(pay_dates) if pay_dates else nq.parse_date(nq.val(summ, "DividendPaymentDate")))
    put("ex_dividend_date", nq.parse_date(ex_text) if isinstance(ex_text, str) else None)
    return out


def build_payload(sym, ctx, price, summ, now=None, today=None):
    vals = compute(ctx, price, summ, today)
    groups = []
    for gkey, keys in GROUPS:
        rows = []
        for k in keys:
            v, extra = vals[k]
            fmt, period = META[k]
            row = {"key": k, "value": v, "fmt": fmt, "period": period}
            row.update(extra)
            rows.append(row)
        groups.append({"key": gkey, "rows": rows})
    fy = vals["fiscal_year_end"][0]
    return {
        "symbol": sym,
        "as_of": (now or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "price": price,
        "currency": "USD",
        "fiscal": {"fy_end_month": int(fy[5:7]) if fy else None, "mrq": vals["most_recent_quarter"][0]},
        "groups": groups,
        "summary": {"beta_5y_monthly": ctx.get("beta"), "eps_ttm": ctx.get("eps_ttm"),
                    "pe_ttm": vals["pe_ttm"][0]},
        "source": "Nasdaq",
    }


# ── Fetching ──────────────────────────────────────────────────────────────────

def _short_rows(d):
    rows = (((d or {}).get("shortInterestTable") or {}).get("rows")) or []
    out = []
    for r in rows:                          # newest first, as Nasdaq sends them
        n, day = nq.num(r.get("interest")), nq.parse_date(r.get("settlementDate") or "")
        if n is not None and day:
            out.append({"date": day, "shares": n, "days": nq.num(r.get("daysToCover"))})
    out.sort(key=lambda x: x["date"], reverse=True)
    return out[:2]


def _gather(sym, ac):
    """Every ingredient that does not depend on the live price."""
    jobs = {
        "q": lambda: nq.get(f"company/{sym}/financials", {"frequency": 2}),
        "a": lambda: nq.get(f"company/{sym}/financials", {"frequency": 1}),
        "forecast": lambda: nq.get(f"analyst/{sym}/earnings-forecast"),
        "peg": lambda: nq.get(f"analyst/{sym}/peg-ratio"),
        "short": lambda: nq.get(f"quote/{sym}/short-interest", {"assetClass": ac}),
        "holders": lambda: nq.get(f"company/{sym}/institutional-holdings",
                                  {"limit": 10, "type": "TOTAL", "sortColumn": "marketValue"}),
        "qres": lambda: nq.quarterly_results(sym),
        "eps": lambda: nq.eps_ttm(sym),
        "beta": lambda: nq.beta_5y_monthly(sym),
        "v63": lambda: nq.avg_volume(sym, 63),
        "v10": lambda: nq.avg_volume(sym, 10),
        "hist": lambda: nq.daily_history(sym),
        "spy": lambda: nq.daily_history(nq.BENCHMARK),
        "divs": lambda: nq.dividends(sym),
    }
    futs = {k: _pool.submit(fn) for k, fn in jobs.items()}
    raw = {}
    for k, f in futs.items():
        try:
            raw[k] = f.result()
        except Exception as exc:            # a failed ingredient only blanks its own rows
            log.warning("stats %s: %s failed: %s", sym, k, exc)
            raw[k] = None
    q, a = parse_statements(raw["q"]), parse_statements(raw["a"])
    own = ((raw["holders"] or {}).get("ownershipSummary")) or {}
    shares_m = nq.num(nq.val(own, "ShareoutstandingTotal"))
    peg = nq.num((((raw["peg"] or {}).get("pegr")) or {}).get("pegValue"))
    return {
        "quarterly": q, "annual": a,
        "last_fy_end": a["periods"][0] if a else None,
        "forecast": (((raw["forecast"] or {}).get("yearlyForecast")) or {}).get("rows") or [],
        "peg": peg if peg and peg > 0 else None,
        "short": _short_rows(raw["short"]),
        "shares_outstanding": shares_m * 1e6 if shares_m else None,
        "institutional_pct": nq.num(nq.val(own, "SharesOutstandingPCT")),
        "qres": raw["qres"] or [], "eps_ttm": raw["eps"], "beta": raw["beta"],
        "avg_volume_3m": raw["v63"], "avg_volume_10d": raw["v10"],
        "hist": raw["hist"] or [], "spy": raw["spy"] or [], "dividends": raw["divs"] or [],
        "complete": ac == "etf" or bool(q and a),
    }


def _context(sym, ac):
    # An incomplete answer (Nasdaq hiccup) is served once but never cached.
    held = {}

    def build():
        held["c"] = _gather(sym, ac)
        return held["c"] if held["c"]["complete"] else None
    return nq.cached(f"stats_ctx_{sym}", 3600, build) or held.get("c") or _gather(sym, ac)


def _live_price(sym):
    i = nq.info(sym) or {}
    return nq.num((i.get("primaryData") or {}).get("lastSalePrice"))


@router.get("/{symbol}/stats")
def stats(symbol: str):
    sym = nq.clean_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    ac = nq.asset_class(sym)
    if not ac:
        raise HTTPException(status_code=404, detail=f"Unknown symbol {sym}")
    ctx = _context(sym, ac)
    price = _live_price(sym)
    summ = nq.summary(sym) or {}
    return build_payload(sym, ctx, price, summ)
