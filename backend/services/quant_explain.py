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


def cache_key(sig: dict) -> str:
    return f"v1:{sig.get('as_of')}:{sig.get('generated_at')}"


def facts(sig: dict) -> str:
    t = sig["trend"]
    v = sig.get("validation") or {}
    lines = [
        f"Data as of {sig['as_of']}. Universe: the {sig['universe']['size']} largest US stocks.",
        f"Trend: the cap-weighted large-cap index is {abs(t['gap_pct'])}% {'above' if t['above'] else 'below'} its "
        f"10-month average. The trend rule says: {'stay invested next month' if t['above'] else 'hold cash next month'}.",
        "The stock model ranks stocks by: " + ", ".join(sig["config"]["chosen_factors"]).replace("_", " ")
        + " (value and quality measures), compared within each sector.",
        f"The model rule holds the top {sig['config']['top_n']} names, equal weight, reviewed every quarter; a stock "
        f"already held may stay while it is in the top {int(sig['config']['keep_pct'] * 100)}%.",
    ]
    top = [r for r in sig["ranking"] if r.get("top")]
    sectors = {}
    for r in top:
        sectors[r["sector"]] = sectors.get(r["sector"], 0) + 1
    lines.append("Sectors among the model's top 50: "
                 + ", ".join(f"{k} {n}" for k, n in sorted(sectors.items(), key=lambda x: -x[1])) + ".")
    lines.append(f"The first {TOP_LISTED} by the model rule: "
                 + "; ".join(f"#{r['rank']} {r['ticker']} ({r['name']}, {r['sector']})" for r in top[:TOP_LISTED]) + ".")
    if v:
        lines.append(f"Tested results (after trading costs, cash earns 0). Development period {v['dev_period']} and the "
                     f"last six years, tested once:")
        for c in v.get("candidates", []):
            a, b = v["dev"].get(c) or {}, v["holdout"].get(c) or {}
            if not a or not b:
                continue
            lines.append(f"- {CAND_LABEL.get(c, c)}: development {a['cagr']}% a year, worst drawdown "
                         f"{a['max_drawdown']}%; last six years {b['cagr']}% a year, worst drawdown {b['max_drawdown']}%"
                         + ("" if c == "index" else f", {b['vs_cap_weight']:+} points a year versus the index "
                                                    f"(t-statistic {b['t_vs_cap_weight']})") + ".")
        lines.append("A t-statistic below 2 means the difference could be luck. In the development period the stock "
                     "model trailed the index in 7 of 16 years.")
    return "\n".join(lines)


SYSTEM = (
    "You explain an investing research screen to its owner, a beginner who is about to start investing his own "
    "money. Use ONLY the facts given: no other numbers, stocks, news, forecasts or reasons. You are not a licensed "
    "adviser and you do not give advice: never say what he should buy or sell, how much to put in, or that anything "
    "will make money. Describe what the trend rule and the model rule say now, as rules (\"the model rule picks ...\", "
    "\"under the trend rule ...\"), what each way of using them did in the tests, their worst losses, and that the "
    "stock model's edge was small and could be luck. Plain words, short sentences, no jargon left unexplained. "
    "Write 5 short sections, in this order: the market now; what the model rule picks now (list the first tickers "
    "given, with their company names); how the rules are used; what this did in the tests and the risks; questions "
    "he should answer for himself before investing (how big a fall he can stand, how long he can wait, how much he "
    "can afford to lose). Keep every number exactly as in the facts. "
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
