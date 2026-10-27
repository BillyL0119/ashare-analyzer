"""
Why did it move? The biggest daily moves of a stock over the last year, each with the facts on
record for that day, so a student can see what moved the price and learn to tell a market-wide
move from a company-specific one.

For each big-move day (far outside the stock's usual daily range):
  - the market's move that day (S&P 500 ETF / CSI 300 ETF) and, for US stocks, its sector ETF:
    a fall that matches the market is a market-wide move, not news about the company;
  - US: filings the company made with the SEC (EDGAR), dated by their acceptance time so an
    earnings release after the close belongs to the next trading day; Federal Reserve decision
    days (read from the Fed's FOMC calendar page); dated headlines from Nasdaq when recent;
  - A-shares: the company's announcements on cninfo (the official disclosure site).
An AI explanation is written only when a student opens a day, from these facts alone, and kept.
"""
import json
import logging
import os
import re
import statistics
import threading
import time
from datetime import datetime, timedelta, timezone

import requests

logger = logging.getLogger("move_reasons")

_UA = {"User-Agent": "BestFriendStock/1.0 (bestfriendstock.com)"}
_ET = timezone(timedelta(hours=-4))          # EDGAR acceptance times are US Eastern; DST error of 1h is harmless here
_cache: dict = {}                            # key -> (ts, value)
_lock = threading.Lock()


def _cached(key: str, ttl: float, fn):
    with _lock:
        hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = fn()
    with _lock:
        if len(_cache) > 3000:
            _cache.clear()
        _cache[key] = (time.time(), val)
    return val


# ── Prices ────────────────────────────────────────────────────────────────────

def _us_closes(sym: str) -> dict:
    from routers.us_stocks import _fetch_history_candles
    rows = _fetch_history_candles(sym, 400)
    if rows:
        return {r["date"]: r["close"] for r in rows}
    try:                                      # Sina (unadjusted) when Tencent and Polygon both fail
        import akshare as ak
        from services.js_runtime import v8_call
        df = v8_call(ak.stock_us_daily, symbol=sym, adjust="")
        cut = (datetime.now() - timedelta(days=420)).strftime("%Y-%m-%d")
        return {d.strftime("%Y-%m-%d"): float(c) for d, c in zip(df["date"], df["close"]) if d.strftime("%Y-%m-%d") >= cut}
    except Exception:
        return {}


def _cn_closes(code: str) -> dict:
    """Forward-adjusted daily closes from Tencent's K-line (codes like sh600519, sh510300). When Tencent
    fails: Sina's K-line for a fund (unadjusted; a fund has no splits or bonus shares to adjust for),
    the forward-adjusted Sina history for a stock (unadjusted, a bonus issue would look like a crash)."""
    try:
        r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
                         params={"param": f"{code},day,,,300,qfq"}, timeout=10)
        node = (r.json().get("data") or {}).get(code) or {}
        rows = node.get("qfqday") or node.get("day") or []
        if rows:
            return {row[0]: float(row[2]) for row in rows}
    except Exception as e:
        logger.warning("Tencent K-line %s failed: %s", code, e)
    from services.stock_service import get_stock_history, sina_daily_closes
    if code[2:].startswith(("5", "1")):
        closes = sina_daily_closes(code, 300)
    else:
        now = datetime.now()
        df = get_stock_history(code[2:], "daily", (now - timedelta(days=450)).strftime("%Y%m%d"), now.strftime("%Y%m%d"), "qfq")
        closes = dict(zip(df["date"], df["close"].astype(float))) if df is not None else {}
    if not closes:
        raise RuntimeError(f"no price history for {code}")     # a 503, not three hours of an empty page
    return closes


def _cn_code(sym: str) -> str:
    return ("sh" if sym.startswith(("6", "5", "9")) else "sz") + sym


def _returns(closes: dict) -> dict:
    days = sorted(closes)
    return {d: (closes[d] / closes[p] - 1) * 100 for p, d in zip(days, days[1:]) if closes[p]}


# ── US facts ──────────────────────────────────────────────────────────────────

# keyed on the screener's GICS sector names (routers/screener.py us_sector)
_SECTOR_ETF = {"Technology": "XLK", "Financials": "XLF", "Health Care": "XLV", "Energy": "XLE",
               "Consumer Discretionary": "XLY", "Consumer Staples": "XLP", "Industrials": "XLI",
               "Materials": "XLB", "Utilities": "XLU", "Real Estate": "XLRE", "Communication Services": "XLC"}

# SEC Form 8-K item numbers (the SEC's own item titles, shortened)
_ITEMS = {
    "1.01": ("签订重大协议", "Material agreement"), "1.02": ("终止重大协议", "Agreement terminated"),
    "1.05": ("重大网络安全事件", "Cybersecurity incident"), "2.01": ("完成收购或出售资产", "Acquisition or sale completed"),
    "2.02": ("发布业绩（财报）", "Results of operations (earnings)"), "2.03": ("新增重大债务", "New financial obligation"),
    "2.05": ("重组或退出业务的成本", "Exit or restructuring costs"), "2.06": ("重大资产减值", "Material impairment"),
    "3.01": ("退市或上市规则通知", "Delisting notice"), "4.02": ("此前财报不可依赖", "Prior financial statements unreliable"),
    "5.02": ("董事或高管变动", "Director or officer change"), "5.07": ("股东投票结果", "Shareholder vote results"),
    "7.01": ("公开披露（FD）", "Regulation FD disclosure"), "8.01": ("其他重大事项", "Other events"),
}
_FORMS = {"10-Q": ("季度报告", "Quarterly report"), "10-K": ("年度报告", "Annual report"), "S-1": ("招股书", "IPO registration"),
          "SC 13D": ("大股东持股披露", "Large shareholder stake"), "DEF 14A": ("股东大会委托书", "Proxy statement")}


def _cik(sym: str) -> str | None:
    def look():
        r = requests.get("https://efts.sec.gov/LATEST/search-index", params={"keysTyped": sym}, headers=_UA, timeout=15)
        for h in (r.json().get("hits") or {}).get("hits") or []:
            if sym.upper() in [t.strip().upper() for t in str(h["_source"].get("tickers", "")).split(",")]:
                return h["_id"]
        return None
    return _cached(f"cik:{sym}", 30 * 86400, look)


def _filings(sym: str) -> list:
    """[(acceptance datetime ET, form, [item codes], url)] for the last ~year."""
    def fetch():
        cik = _cik(sym)
        if not cik:
            return []
        r = requests.get(f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json", headers=_UA, timeout=20)
        rec = r.json()["filings"]["recent"]
        out = []
        for i, form in enumerate(rec["form"]):
            if form not in ("8-K", *_FORMS):
                continue
            acc = rec.get("acceptanceDateTime", [None] * len(rec["form"]))[i] or rec["filingDate"][i] + "T12:00:00"
            when = datetime.fromisoformat(acc.replace("Z", "")[:19])
            items = [x for x in (rec.get("items", [""] * len(rec["form"]))[i] or "").split(",") if x in _ITEMS]
            doc = rec["primaryDocument"][i]
            url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{rec['accessionNumber'][i].replace('-', '')}/{doc}"
            out.append((when, form, items, url))
        return out
    try:
        return _cached(f"filings:{sym}", 6 * 3600, fetch)
    except Exception as e:
        logger.warning("EDGAR %s: %s", sym, e)
        return []


_FOMC_FALLBACK = ["2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18", "2025-07-30", "2025-09-17", "2025-10-29",
                  "2025-12-10", "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16",
                  "2026-10-28", "2026-12-09"]
_MONTHS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August",
                                         "September", "October", "November", "December"], 1)}


def _fomc_days() -> set:
    """Decision days (second day of each scheduled meeting) from the Fed's FOMC calendar page."""
    def fetch():
        html = requests.get("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
                            headers={"User-Agent": "Mozilla/5.0"}, timeout=20).text
        days = set()
        for year in re.findall(r"(\d{4}) FOMC Meetings", html):
            seg = html[html.find(f"{year} FOMC Meetings"):]
            nxt = seg.find("FOMC Meetings", 30)
            seg = seg[:nxt if nxt > 0 else len(seg)]
            for month, dates in re.findall(r"fomc-meeting__month[^>]*>\s*<strong>([^<]+)</strong>.*?fomc-meeting__date[^>]*>([^<]+)<", seg, re.S):
                if "notation" in dates or "unscheduled" in dates.lower():
                    continue
                last = re.findall(r"\d+", dates)
                mon = month.split("/")[-1].strip()
                if last and mon in _MONTHS:
                    days.add(f"{year}-{_MONTHS[mon]:02d}-{int(last[-1]):02d}")
        return days or set(_FOMC_FALLBACK)
    try:
        return _cached("fomc", 7 * 86400, fetch)
    except Exception:
        return set(_FOMC_FALLBACK)


def _news(sym: str) -> list:
    """[(date, title, url, publisher)] of recent Nasdaq-hosted headlines where the stock is the main subject."""
    def fetch():
        out = []
        for offset in range(0, 500, 100):
            r = requests.get("https://api.nasdaq.com/api/news/topic/articlebysymbol",
                             params={"q": f"{sym.lower()}|stocks", "offset": offset, "limit": 100, "fallback": "true"},
                             headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}, timeout=15)
            rows = ((r.json().get("data") or {}).get("rows")) or []
            for x in rows:
                if (x.get("primarysymbol") or "").upper() != sym.upper():
                    continue
                try:
                    d = datetime.strptime(x["created"], "%b %d, %Y").strftime("%Y-%m-%d")
                except Exception:
                    continue
                url = x.get("url") or ""
                out.append((d, x["title"], url if url.startswith("http") else "https://www.nasdaq.com" + url, x.get("publisher")))
            if len(rows) < 100:
                break
        return out
    try:
        return _cached(f"news:{sym}", 3 * 3600, fetch)
    except Exception:
        return []


def _announcements(sym: str) -> list:
    """[(date, title, url)] of the company's cninfo announcements over the last year."""
    def fetch():
        import akshare as ak
        end = datetime.now()
        df = ak.stock_zh_a_disclosure_report_cninfo(symbol=sym, market="沪深京", keyword="", category="",
                                                    start_date=(end - timedelta(days=370)).strftime("%Y%m%d"),
                                                    end_date=end.strftime("%Y%m%d"))
        return [(str(r["公告时间"])[:10], str(r["公告标题"]), str(r["公告链接"])) for _, r in df.iterrows()]
    try:
        return _cached(f"ann:{sym}", 6 * 3600, fetch)
    except Exception as e:
        logger.warning("cninfo %s: %s", sym, e)
        return []


# ── Big moves ─────────────────────────────────────────────────────────────────

def big_moves(market: str, sym: str, limit: int = 12) -> dict:
    return _cached(f"moves:{market}:{sym}", 3 * 3600, lambda: _build(market, sym, limit))


def _sector_of(sym: str) -> str | None:
    try:
        from routers.screener import _universe
        row = next((r for r in _universe() if r.get("symbol") == sym), None)
        return row.get("sector") if row else None
    except Exception:
        return None


def _build(market: str, sym: str, limit: int) -> dict:
    from concurrent.futures import ThreadPoolExecutor
    if market not in ("us", "cn"):
        raise ValueError("market")
    sector = _sector_of(sym) if market == "us" else None
    etf = _SECTOR_ETF.get(sector or "") if market == "us" else None
    # Everything a page needs is fetched side by side (a cold load otherwise waits on each in turn)
    with ThreadPoolExecutor(max_workers=6) as ex:
        if market == "us":
            jobs = {"closes": ex.submit(_us_closes, sym), "bench": ex.submit(_us_closes, "SPY"),
                    "sector": ex.submit(_us_closes, etf) if etf and etf != sym else None,
                    "filings": ex.submit(_filings, sym), "fomc": ex.submit(_fomc_days), "news": ex.submit(_news, sym)}
        else:
            jobs = {"closes": ex.submit(_cn_closes, _cn_code(sym)), "bench": ex.submit(_cn_closes, "sh510300"),
                    "anns": ex.submit(_announcements, sym)}
        got = {k: (f.result() if f else None) for k, f in jobs.items()}
    closes, bench = got["closes"] or {}, got["bench"] or {}
    bench_sym = "SPY" if market == "us" else "510300"
    sector_rets = _returns(got.get("sector") or {})
    rets = _returns(closes)
    cut = (datetime.now() - timedelta(days=366)).strftime("%Y-%m-%d")
    rets = {d: r for d, r in rets.items() if d >= cut}
    if len(rets) < 40:
        return {"symbol": sym, "market": market, "days": [], "threshold": None}
    sd = statistics.pstdev(rets.values())
    floor = 3.0 if market == "us" else 4.0
    threshold = max(floor, 2.2 * sd)
    ranked = sorted(rets, key=lambda d: -abs(rets[d]))
    picked = [d for d in ranked if abs(rets[d]) >= threshold][:limit]
    if len(picked) < 6:                       # a calm stock: still show its largest moves, if they are real moves
        picked = [d for d in ranked if abs(rets[d]) >= floor][:6]
    brets = _returns(bench)
    trading = sorted(closes)
    prev_of = {d: p for p, d in zip(trading, trading[1:])}

    filings, fomc = got.get("filings") or [], got.get("fomc") or set()
    news, anns = got.get("news") or [], got.get("anns") or []

    def filing_day(when: datetime) -> str:
        """The trading day whose price first reflects a filing: after 16:00 ET it is the next one."""
        d = when.strftime("%Y-%m-%d")
        if when.hour >= 16:
            return next((t for t in trading if t > d), d)
        return next((t for t in trading if t >= d), d)

    days = []
    for d in sorted(picked, reverse=True):
        r, m = rets[d], brets.get(d)
        s = sector_rets.get(d)
        if m is not None and m * r > 0 and abs(m) >= 0.6 * abs(r):
            kind = "market"
        elif s is not None and s * r > 0 and abs(s) >= 0.6 * abs(r):
            kind = "sector"
        else:
            kind = "stock"
        prev = prev_of.get(d, d)
        facts = {
            "filings": [{"form": f, "items": items, "time": w.strftime("%Y-%m-%d %H:%M"), "url": u}
                        for w, f, items, u in filings if filing_day(w) == d],
            "fomc": d in fomc,
            "news": [{"date": nd, "title": t, "url": u, "publisher": p} for nd, t, u, p in news if prev <= nd <= d][:5],
            "announcements": [{"date": ad, "title": t, "url": u} for ad, t, u in anns if prev <= ad <= d][:6],
        }
        days.append({"date": d, "change_pct": round(r, 2), "market_pct": round(m, 2) if m is not None else None,
                     "sector_pct": round(s, 2) if s is not None else None, "sector": sector, "sector_etf": etf,
                     "benchmark": bench_sym, "kind": kind, "facts": facts})
    return {"symbol": sym, "market": market, "threshold": round(threshold, 2), "days": days,
            "news_from": min((n[0] for n in news), default=None)}


# ── AI explanation (on demand, kept for good) ─────────────────────────────────

_EXPLAIN_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "move_reasons.json")
_explained: dict = {}
_calls = {"day": "", "n": 0}
_DAILY_CAP = 400
_NUM = re.compile(r"\d+(?:[.,]\d+)*")
_CJK = re.compile(r"[一-鿿]")


def _load():
    global _explained
    try:
        with open(_EXPLAIN_PATH, encoding="utf-8") as f:
            _explained = json.load(f)
    except Exception:
        _explained = {}


_V = "v2"   # bump when the facts or the prompt change, so older explanations are written again


def cached_explanation(market: str, sym: str, date: str) -> dict | None:
    return _explained.get(f"{_V}:{market}:{sym}:{date}")


def _fact_text(sym: str, day: dict) -> str:
    f = day["facts"]
    lines = [f"Stock {sym} closed {day['change_pct']:+.2f}% on {day['date']}."]
    if day.get("market_pct") is not None:
        lines.append(f"The market benchmark ({day['benchmark']}) moved {day['market_pct']:+.2f}% that day.")
    if day.get("sector_pct") is not None:
        lines.append(f"Its sector ETF ({day['sector_etf']}, {day['sector']}) moved {day['sector_pct']:+.2f}%.")
    lines.append({
        "market": "Classification: market-wide move (the market moved the same way by a similar amount).",
        "sector": "Classification: sector-wide move (its sector moved the same way by a similar amount).",
        "stock": "Classification: company-specific move (much larger than both the market's and the sector's move).",
    }[day["kind"]])
    for x in f["filings"]:
        names = "; ".join(_ITEMS[i][1] for i in x["items"]) or _FORMS.get(x["form"], ("", x["form"]))[1]
        lines.append(f"SEC filing {x['form']} accepted {x['time']} ET: {names}.")
    if f["fomc"]:
        lines.append("It was a Federal Reserve interest-rate decision day (FOMC).")
    for n in f["news"]:
        lines.append(f"Headline ({n['date']}, {n.get('publisher') or 'news'}): {n['title']}")
    for a in f["announcements"]:
        lines.append(f"Company announcement ({a['date']}): {a['title']}")
    return "\n".join(lines)


def explain(market: str, sym: str, date: str) -> dict | None:
    key = f"{_V}:{market}:{sym}:{date}"
    if key in _explained:
        return _explained[key]
    day = next((d for d in big_moves(market, sym)["days"] if d["date"] == date), None)
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not day or not api_key:
        return None
    today = time.strftime("%Y-%m-%d")
    with _lock:
        if _calls["day"] != today:
            _calls.update(day=today, n=0)
        if _calls["n"] >= _DAILY_CAP:
            return None
        _calls["n"] += 1
    facts = _fact_text(sym, day)
    system = (
        "You explain a stock's big one-day move to secondary-school students learning economics and investing. "
        "Use ONLY the facts given; do not add events, numbers, names or causes that are not in them. If the facts "
        "show a filing or headline but not its content, say the move coincided with it rather than claiming it caused "
        "it. If the market or sector moved the same way, explain that it was largely a market-wide or sector-wide "
        "move. Follow the classification line when describing how much was market, sector or company. If no company fact is given, say the records here do not show a company-specific reason. "
        "Then add one sentence on the economics or investing idea a student can learn from it (for example how "
        "earnings surprises move prices, systematic vs unsystematic risk, or interest rates and valuations). "
        "Keep every number exactly as in the facts. No investment advice. "
        'Return JSON only: {"zh": "<3-4 sentences in Simplified Chinese>", "en": "<3-4 sentences in English>"}'
    )
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=60, max_retries=0)
        resp = client.chat.completions.create(
            model="deepseek-chat", max_tokens=700, temperature=0.2, response_format={"type": "json_object"},
            messages=[{"role": "system", "content": system}, {"role": "user", "content": facts}])
        out = json.loads(resp.choices[0].message.content or "{}")
    except Exception as e:
        logger.warning("move explanation failed: %s", e)
        return None
    allowed = {n.replace(",", "") for n in _NUM.findall(facts)} | {str(i) for i in range(0, 11)}
    zh, en = str(out.get("zh") or "").strip(), str(out.get("en") or "").strip()
    for text in (zh, en):
        if not text or {n.replace(",", "") for n in _NUM.findall(text)} - allowed:
            logger.info("move explanation for %s rejected (figures not in facts)", key)
            return None
    if not _CJK.search(zh) or _CJK.search(en):
        return None
    res = {"zh": zh[:800], "en": en[:800], "ts": time.time()}
    with _lock:
        _explained[key] = res
        snapshot = dict(_explained)
    try:
        tmp = _EXPLAIN_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False)
        os.replace(tmp, _EXPLAIN_PATH)
    except Exception as e:
        logger.warning("move explanation write failed: %s", e)
    return res


_load()
