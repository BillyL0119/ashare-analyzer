"""
"AI 解读" for the admin quant desk: a plain-language reading of what the desk shows right now.

It explains; it does not advise. The model is given only facts taken from signals.json (trend state, the model
rule's current picks, the tested results) and must not promise returns or tell the reader what to buy. Checks
before anything is shown or cached:
  - every number in the text must appear in the facts (small integers allowed)
  - phrases that promise gains ("保证", "稳赚", "一定会涨", "guarantee", ...) reject the answer
  - Chinese text in zh, none in en
One explanation per published signals file (as_of + generated_at), kept on disk; at most DAILY_CAP calls a day.
Raw Sharadar figures (prices, P/E, ...) are not sent, only ranks, sectors and the tested statistics.
"""
import json
import logging
import os
import re
import threading
import time

logger = logging.getLogger(__name__)

DAILY_CAP = 20
TOP_LISTED = 10
_NUM = re.compile(r"\d+(?:[.,]\d+)*")
_CJK = re.compile(r"[一-鿿]")
BANNED = ("保证", "稳赚", "一定会涨", "必涨", "肯定赚", "包赚", "无风险", "guarantee", "risk-free", "sure to rise",
          "will definitely")
_lock = threading.Lock()
_calls = {"day": "", "n": 0}

CAND_LABEL = {"index": "hold the index (cap-weighted large caps, about the S&P 500)",
              "index + trend rule": "hold the index, but cash in months that start below its 10-month average",
              "model (step E)": "the stock model: the top 50 of the ranking, equal weight, reviewed quarterly",
              "model + inv-vol + sector + trend": "the stock model with volatility weights, max 25% per sector "
                                                  "and the trend rule"}


FACTOR_PLAIN = {
    "earnings_yield": "cheap relative to profits", "sales_yield": "cheap relative to sales",
    "fcf_yield": "cheap relative to the cash it generates", "ebitda_ev": "cheap relative to operating profit",
    "gross_profit": "high gross profit for its assets", "roe": "high return on shareholders' equity",
    "share_issuance": "few new shares issued (buybacks rather than dilution)", "book_to_market": "cheap relative to book value",
    "earnings_surprise": "earnings beating last year's", "low_vol": "steady share price",
}


def cache_key(sig: dict) -> str:
    return f"v6:{sig.get('as_of')}:{sig.get('generated_at')}"


def facts(sig: dict) -> str:
    t = sig["trend"]
    v = sig.get("validation") or {}
    lines = [
        f"Data as of {sig['as_of']}. Universe: the {sig['universe']['size']} largest US stocks.",
        f"Trend: the cap-weighted large-cap index is {abs(t['gap_pct']):.1f}% {'above' if t['above'] else 'below'} its "
        f"10-month average." + (
            f" This reading uses the month so far; the trend rule acts only on month-end closes. For this month the "
            f"rule is {'invested' if t.get('this_month_invested') else 'in cash'} (decided at last month's close); next "
            f"month is decided at this month's close: if the index is still {'above' if t['above'] else 'below'} its "
            f"average then, the rule will {'stay invested' if t['above'] else 'hold cash'} next month."
            if t.get("provisional") else
            f" The trend rule says: {'stay invested next month' if t['above'] else 'hold cash next month'}."),
        "The stock model ranks stocks by: " + "; ".join(FACTOR_PLAIN.get(f, f.replace("_", " "))
                                                         for f in sig["config"]["chosen_factors"])
        + ". Each is compared with other companies in the same sector.",
        f"The model rule holds the top {sig['config']['top_n']} names, equal weight, reviewed every quarter; a stock "
        f"already held may stay while it is in the top {int(sig['config']['keep_pct'] * 100)}%.",
    ]
    top = [r for r in sig["ranking"] if r.get("top")]
    sectors = {}
    for r in top:
        sectors[r["sector"]] = sectors.get(r["sector"], 0) + 1
    lines.append("Sectors among the model's top 50: "
                 + ", ".join(f"{k} {n}" for k, n in sorted(sectors.items(), key=lambda x: -x[1])) + ".")
    si = sig.get("short_interest") or {}
    high = [r["ticker"] for r in top if (r.get("metrics") or {}).get("short_pct") is not None
            and r["metrics"]["short_pct"] >= si.get("high_pct", 10)]
    if si.get("settlement_date"):
        lines.append(f"Short interest (public FINRA data, {si['settlement_date']}): {len(high)} of the model's top 50 have "
                     f"{si.get('high_pct', 10)}% or more of their shares sold short"
                     + (f" ({', '.join(high[:5])})" if high else "")
                     + "; heavily shorted stocks tend to swing more. It was tested as a signal and not added to the model.")
    lines.append(f"The first {TOP_LISTED} by the model rule: "
                 + "; ".join(f"#{r['rank']} {r['ticker']} ({r['name']}, {r['sector']})" for r in top[:TOP_LISTED]) + ".")
    if v:
        cash = "cash earns the 3-month Treasury bill rate" if "T-bill" in str(v.get("cash")) else "cash earns 0"
        lines.append(f"Tested results (after trading costs, {cash}). Development period {v['dev_period']} and the "
                     f"last six years, tested once:")
        for c in v.get("candidates", []):
            a, b = v["dev"].get(c) or {}, v["holdout"].get(c) or {}
            if not a or not b:
                continue
            lines.append(f"- {CAND_LABEL.get(c, c)}: development {a['cagr']:.1f}% a year, worst drawdown "
                         f"{a['max_drawdown']:.1f}%; last six years {b['cagr']:.1f}% a year, worst drawdown "
                         f"{b['max_drawdown']:.1f}%"
                         + ("" if c == "index" else f", {b['vs_cap_weight']:+.1f} points a year versus the index "
                                                    f"(t-statistic {b['t_vs_cap_weight']:.1f})") + ".")
        behind = ((v["dev"].get("model (step E)") or {}).get("years_behind_cap_weight") or "").split("/")
        lines.append("A t-statistic below 2 means the difference could be luck."
                     + (f" In the development period the stock model trailed the index in {behind[0]} of {behind[1]} years."
                        if len(behind) == 2 else ""))
        if v.get("audited_at"):
            lines.append(f"These numbers come from an audit on {v['audited_at']} that measured the same rules more "
                         "realistically (trading the day after the signal, holding shares between reviews, an extra "
                         "loss on bankrupt companies, a data fix); they are lower than the first published figures.")
        tb = (v.get("trend_by_check_day") or {}).get("dev")
        if tb:
            lines.append(f"The trend rule depends on the day it is checked: checked on one of the first five trading days "
                         f"after month-end, its 2005-2020 worst drawdown ranged from {tb['max_drawdown'][0]:.0f}% to "
                         f"{tb['max_drawdown'][1]:.0f}% (the index's was {tb['index_max_drawdown']:.0f}%), and its yearly "
                         f"return from {tb['cagr'][0]:.1f}% to {tb['cagr'][1]:.1f}%.")
    if t.get("provisional"):
        now = "hold stocks" if t.get("this_month_invested") else "are in cash where the trend rule applies"
        lines.append(f"So right now: this month all the ways {now}. "
                     + ("If the index is still below its average at this month's close, the trend rule and the combined "
                        "way will hold cash next month while the stock model alone keeps its top 50."
                        if not t["above"] else "If the index stays above its average, all the ways stay invested."))
    else:
        lines.append("So right now: the trend rule alone says hold cash; the stock model alone holds its top 50; the way "
                     "that combines the stock model with the trend rule would also hold cash next month."
                     if not t["above"] else
                     "So right now: the trend rule says stay invested, so both the stock model and the combined way "
                     "hold stocks next month.")
    live = sig.get("live")
    if live:
        lines.append(f"Live tracking of these rules started on {live['started']}; results need one to three years "
                     "before they mean anything.")
    lines.append("Worst drawdown means the biggest fall from a high point to a later low.")
    return "\n".join(lines)


SYSTEM = (
    "You explain an investing research screen to its owner, a beginner who is about to start investing his own "
    "money. Use ONLY the facts given: no other numbers, stocks, news, forecasts or reasons. You are not a licensed "
    "adviser and you do not give advice: never say what he should buy or sell, how much to put in, or that anything "
    "will make money. Describe what the trend rule and the model rule say now, as rules (\"the model rule picks ...\", "
    "\"under the trend rule ...\"), what each way of using them did in the tests, their worst losses, and that the "
    "stock model's edge was small and could be luck. Plain words, short sentences, no jargon left unexplained. "
    "Write 5 short sections, in this order: (1) the market now and what the trend rule says; (2) what the model rule "
    "picks now: name the first tickers given with their company names and say in one sentence what the ranking "
    "favours, and if a short-interest fact is given, one sentence on how many picks are heavily shorted and what that "
    "means for risk; (3) the ways to use them and what each says right now (use the 'So right now' fact); (4) what the "
    "tests showed: for each way give only the last-six-years return per year and worst drawdown, one line each, then "
    "one sentence that the stock model's edge could be luck and one that the trend rule mainly cuts big falls; "
    "(5) questions he should answer for himself before investing (how big a fall he can stand, how long he can "
    "wait, how much he can afford to lose). Each section at most 4 sentences. Keep every number exactly as in the "
    "facts. "
    'Return JSON only: {"zh": [{"title": "...", "body": "..."}, ...5 items in Simplified Chinese], '
    '"en": [{"title": "...", "body": "..."}, ...the same 5 in English]}'
)


def _clean(sections, cjk: bool, allowed: set):
    if not isinstance(sections, list) or not 3 <= len(sections) <= 7:
        return None
    out = []
    for s in sections:
        if not isinstance(s, dict):
            return None
        title, body = str(s.get("title") or "").strip(), str(s.get("body") or "").strip()
        if not title or not body:
            return None
        text = title + " " + body
        if any(b in text.lower() for b in BANNED):
            return None
        if bool(_CJK.search(text)) != cjk:
            return None
        if {n.replace(",", "") for n in _NUM.findall(text)} - allowed:
            return None
        out.append({"title": title[:60], "body": body[:900]})
    return out


def validate(raw: dict, fact_text: str):
    """The model's JSON -> {"zh": [...], "en": [...]} or None when any check fails."""
    allowed = {n.replace(",", "") for n in _NUM.findall(fact_text)} | {str(i) for i in range(0, 11)}
    allowed |= {n.lstrip("+-") for n in allowed}
    zh = _clean(raw.get("zh"), True, allowed)
    en = _clean(raw.get("en"), False, allowed)
    if not zh or not en:
        return None
    return {"zh": zh, "en": en}


def generate(sig: dict, client=None):
    """Call the model once; None when the key is missing, the daily cap is reached or the answer fails a check."""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if client is None and not api_key:
        return None
    today = time.strftime("%Y-%m-%d")
    with _lock:
        if _calls["day"] != today:
            _calls.update(day=today, n=0)
        if _calls["n"] >= DAILY_CAP:
            return None
        _calls["n"] += 1
    text = facts(sig)
    try:
        if client is None:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=90, max_retries=0)
        resp = client.chat.completions.create(
            model="deepseek-chat", max_tokens=2200, temperature=0.2, response_format={"type": "json_object"},
            messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": text}])
        raw = json.loads(resp.choices[0].message.content or "{}")
    except Exception as e:
        logger.warning("quant explanation failed: %s", type(e).__name__)
        return None
    res = validate(raw, text)
    if res is None:
        logger.info("quant explanation rejected by the checks")
        return None
    return {**res, "as_of": sig.get("as_of"), "ts": time.time()}
