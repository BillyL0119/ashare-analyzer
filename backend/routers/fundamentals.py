"""
US company fundamentals — /api/us/fundamentals/{symbol}

One normalised payload for the stock page: company profile, key stats, annual + quarterly
income statement / cash flow / balance sheet highlights, EPS vs estimates, analyst consensus
and price targets, next earnings date, institutional ownership.

Source: api.nasdaq.com public JSON endpoints (reachable from the server), fetched in parallel
and cached 6h per symbol (disk). Statement figures arrive in thousands of USD and are returned
in plain USD. Sections that fail (e.g. ETFs have no statements) are returned as null, never 500.
"""

import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import requests
from fastapi import APIRouter, HTTPException

from routers.us_stocks import read_cache, write_cache

router = APIRouter()
logger = logging.getLogger("fundamentals")

_BASE = "https://api.nasdaq.com/api"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126 Safari/537.36",
    "Accept": "application/json",
}
_pool = ThreadPoolExecutor(max_workers=16, thread_name_prefix="fundamentals")
_CACHE_HOURS = 6
_SYM_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")


def _get(path: str, timeout: float = 8):
    try:
        r = requests.get(f"{_BASE}/{path}", headers=_HEADERS, timeout=timeout)
        j = r.json()
        return j.get("data") if isinstance(j, dict) else None
    except Exception as exc:
        logger.debug("nasdaq %s failed: %s", path, exc)
        return None


def _num(v):
    """'$1,234' / '-$5' / '12.5%' / '--' -> float or None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", "").replace("$", "").replace("%", "")
    if s in ("", "--", "N/A", "NA", "null"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _val(d, key):
    x = (d or {}).get(key) or {}
    v = x.get("value") if isinstance(x, dict) else None
    return None if isinstance(v, str) and v.strip() in ("", "N/A", "NA", "--") else v


def _date(s):
    for fmt in ("%m/%d/%Y", "%b %d, %Y"):
        try:
            return datetime.strptime(s.strip(), fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return None


# ── Statements ────────────────────────────────────────────────────────────────

def _table(data, name):
    """{row label: [v2, v3, v4, v5]} and the period headers, values in USD (from thousands)."""
    tb = (data or {}).get(name) or {}
    headers = tb.get("headers") or {}
    periods = [headers.get(f"value{i}") for i in range(2, 6)]
    rows = {}
    for r in tb.get("rows") or []:
        label = (r.get("value1") or "").strip()
        vals = [_num(r.get(f"value{i}")) for i in range(2, 6)]
        rows[label] = [v * 1000 if v is not None else None for v in vals]
    return periods, rows


def _statements(data, quarterly: bool):
    if not data:
        return None
    periods, inc = _table(data, "incomeStatementTable")
    _, bal = _table(data, "balanceSheetTable")
    _, cf = _table(data, "cashFlowTable")
    if not inc.get("Total Revenue"):
        return None

    def row(tbl, *names):
        for n in names:
            if n in tbl:
                return tbl[n]
        return [None] * 4

    rev = row(inc, "Total Revenue")
    gross = row(inc, "Gross Profit")
    op = row(inc, "Operating Income")
    net = row(inc, "Net Income")
    ocf = row(cf, "Net Cash Flow-Operating")
    capex = row(cf, "Capital Expenditures")
    buyback = row(cf, "Sale and Purchase of Stock")
    cash = row(bal, "Cash and Cash Equivalents")
    sti = row(bal, "Short-Term Investments")
    std = row(bal, "Short-Term Debt / Current Portion of Long-Term Debt")
    ltd = row(bal, "Long-Term Debt")
    equity = row(bal, "Total Equity")
    assets = row(bal, "Total Assets")

    def ratio(a, b):
        return [round(x / y * 100, 2) if x is not None and y else None for x, y in zip(a, b)]

    def add(a, b):
        return [(x or 0) + (y or 0) if (x is not None or y is not None) else None for x, y in zip(a, b)]

    labels = []
    for p in periods:
        d = _date(p or "") if p else None
        if not d:
            labels.append(p)
        elif quarterly:
            dt = datetime.strptime(d, "%Y-%m-%d")
            labels.append(f"{dt:%b} {dt:%Y}")
        else:
            labels.append(f"FY{d[:4]}")

    out = {
        # oldest -> newest so charts read left to right
        "periods": labels[::-1],
        "period_end": [(_date(p) if p else None) for p in periods][::-1],
        "revenue": rev[::-1],
        "gross_profit": gross[::-1],
        "operating_income": op[::-1],
        "net_income": net[::-1],
        "gross_margin": ratio(gross, rev)[::-1],
        "operating_margin": ratio(op, rev)[::-1],
        "net_margin": ratio(net, rev)[::-1],
        "operating_cash_flow": ocf[::-1],
        "capex": capex[::-1],
        "free_cash_flow": [o + c if o is not None and c is not None else None for o, c in zip(ocf, capex)][::-1],
        "buybacks": buyback[::-1],
        "cash_and_investments": add(cash, sti)[::-1],
        "total_debt": add(std, ltd)[::-1],
        "total_equity": equity[::-1],
        "total_assets": assets[::-1],
    }
    return out


# ── Other sections ────────────────────────────────────────────────────────────

def _profile(summary, prof):
    s = (summary or {}).get("summaryData") or {}
    desc = _val(prof, "CompanyDescription")
    return {
        "name": _val(prof, "CompanyName"),
        "sector": _val(prof, "Sector") or _val(s, "Sector"),
        "industry": _val(prof, "Industry") or _val(s, "Industry"),
        "exchange": _val(s, "Exchange"),
        "website": _val(prof, "CompanyUrl"),
        "description": desc.strip() if isinstance(desc, str) else None,
    }


def _stats(summary, divs):
    s = (summary or {}).get("summaryData") or {}
    hi = lo = None
    rng = _val(s, "FiftTwoWeekHighLow")
    if isinstance(rng, str) and "/" in rng:
        a, b = rng.split("/", 1)
        hi, lo = _num(a), _num(b)
    ex = _val(s, "ExDividendDate")
    return {
        "market_cap": _num(_val(s, "MarketCap")),
        "week52_high": hi,
        "week52_low": lo,
        "avg_volume": _num(_val(s, "AverageVolume")),
        "one_year_target": _num(_val(s, "OneYrTarget")),
        "annual_dividend": _num((divs or {}).get("annualizedDividend")) or _num(_val(s, "AnnualizedDividend")),
        "dividend_yield": _num((divs or {}).get("yield")) or _num(_val(s, "Yield")),
        "ex_dividend_date": _date(ex) if isinstance(ex, str) else None,
    }


def _earnings(surprise):
    rows = (((surprise or {}).get("earningsSurpriseTable") or {}).get("rows")) or []
    out = []
    for r in rows:
        out.append({
            "quarter": r.get("fiscalQtrEnd"),
            "reported": _date(r.get("dateReported") or ""),
            "eps": _num(r.get("eps")),
            "estimate": _num(r.get("consensusForecast")),
            "surprise_pct": _num(r.get("percentageSurprise")),
        })
    return out[::-1]   # oldest -> newest


def _next_earnings(ed):
    text = (ed or {}).get("announcement") or ""
    m = re.search(r"([A-Z][a-z]{2} \d{1,2}, \d{4})", text)
    report = (ed or {}).get("reportText") or ""
    est = re.search(r"consensus EPS forecast for the quarter is \$(-?\d+(?:\.\d+)?)", report)
    timing = "after_close" if "after market close" in report else "before_open" if "before market open" in report else None
    if not m:
        return None
    return {"date": _date(m.group(1)), "eps_estimate": float(est.group(1)) if est else None, "timing": timing}


def _analysts(tp):
    c = (tp or {}).get("consensusOverview") or {}
    buy, hold, sell = c.get("buy"), c.get("hold"), c.get("sell")
    if not any(isinstance(x, (int, float)) for x in (buy, hold, sell)) and not c.get("priceTarget"):
        return None
    return {
        "buy": buy or 0, "hold": hold or 0, "sell": sell or 0,
        "target": _num(c.get("priceTarget")),
        "target_low": _num(c.get("lowPriceTarget")),
        "target_high": _num(c.get("highPriceTarget")),
    }


def _holders(h):
    if not h:
        return None
    own = h.get("ownershipSummary") or {}
    rows = (((h.get("holdingsTransactions") or {}).get("table")) or {}).get("rows") or []
    return {
        "institutional_pct": _num(_val(own, "SharesOutstandingPCT")),
        "shares_outstanding": (_num(_val(own, "ShareoutstandingTotal")) or 0) * 1e6 or None,
        "top": [
            {
                "name": r.get("ownerName"),
                "shares": _num(r.get("sharesHeld")),
                "value": (_num(r.get("marketValue")) or 0) * 1000 or None,
                "change_pct": _num(r.get("sharesChangePCT")),
                "as_of": _date(r.get("date") or ""),
            }
            for r in rows[:10]
        ],
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def get_fundamentals(symbol: str):
    sym = symbol.upper().replace("-", ".")
    if not _SYM_RE.match(sym):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    key = f"{sym}_fundamentals_v1"
    cached = read_cache(key, max_age_hours=_CACHE_HOURS)
    if cached:
        return cached

    s = sym   # Nasdaq takes share classes as-is (BRK.B)
    jobs = {
        "summary": f"quote/{s}/summary?assetclass=stocks",
        "profile": f"company/{s}/company-profile",
        "annual": f"company/{s}/financials?frequency=1",
        "quarterly": f"company/{s}/financials?frequency=2",
        "surprise": f"company/{s}/earnings-surprise",
        "targets": f"analyst/{s}/targetprice",
        "edate": f"analyst/{s}/earnings-date",
        "holders": f"company/{s}/institutional-holdings?limit=10&type=TOTAL&sortColumn=marketValue",
        "divs": f"quote/{s}/dividends?assetclass=stocks",
    }
    t0 = time.time()
    futs = {k: _pool.submit(_get, p) for k, p in jobs.items()}
    raw = {k: f.result() for k, f in futs.items()}
    if not raw["summary"]:
        # ETFs only answer with their own asset class (and have no statements)
        raw["summary"] = _get(f"quote/{s}/summary?assetclass=etf")

    out = {
        "symbol": sym,
        "profile": _profile(raw["summary"], raw["profile"]),
        "stats": _stats(raw["summary"], raw["divs"]),
        "annual": _statements(raw["annual"], quarterly=False),
        "quarterly": _statements(raw["quarterly"], quarterly=True),
        "earnings": _earnings(raw["surprise"]),
        "next_earnings": _next_earnings(raw["edate"]),
        "analysts": _analysts(raw["targets"]),
        "holders": _holders(raw["holders"]),
        "source": "Nasdaq",
        "as_of": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    logger.info("fundamentals %s built in %.1fs", sym, time.time() - t0)
    if not (out["profile"].get("name") or out["annual"] or out["stats"].get("market_cap")):
        raise HTTPException(status_code=404, detail=f"No fundamentals for {sym}")
    write_cache(key, out)   # ETFs too (stats only), so they don't re-fetch every visit
    return out
