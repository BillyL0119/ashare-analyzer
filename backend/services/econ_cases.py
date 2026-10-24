"""
Essay-example library: real news turned into economics case studies for students.

Every couple of hours the newest economics-related articles from the site's news feeds (headline
plus the source's short lead, which never leaves the server) go to DeepSeek, which picks the
syllabus concepts they illustrate (services/econ_concepts.py) and writes, in Chinese and English:
what happened, the economics angle, an evaluation point and an exam-style question, plus the
figures from the article worth quoting.

Guardrails: the model may only use facts in the headline and lead. Any figure in what it writes
must appear in the source text; a quotable figure that does not is dropped, and a case whose
explanation carries an unknown figure is rejected. Each case links to the original article.
Cases accumulate on disk (data/econ_cases.json), so the library grows every day.
"""
import hashlib
import json
import logging
import os
import re
import threading
import time
from datetime import datetime

from services.econ_concepts import CONCEPTS

logger = logging.getLogger("econ_cases")

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "econ_cases.json")
_EVERY = 90 * 60            # seconds between runs
_PER_RUN = 25               # articles sent to the model per run
_DAILY_CAP = 150            # model calls per day
_KEEP_REJECTED = 30 * 86400
_KEEP_CASES = 730 * 86400

_lock = threading.Lock()
_db: dict = {}              # id -> case (or {"rejected": True, "ts": ...})
_calls = {"day": "", "n": 0}
_status = {"last_run": None, "added": 0}

_KEYWORDS = re.compile(
    r"inflation|cpi|ppi|interest rate|rate cut|rate hike|central bank|federal reserve|\bfed\b|ecb|bank of england|"
    r"boj|pboc|gdp|recession|unemployment|jobless|payroll|wage|tariff|trade war|export|import|trade deficit|"
    r"currency|yuan|dollar|yen|euro|sterling|exchange rate|budget|deficit|debt|tax|subsid|price cap|minimum wage|"
    r"antitrust|monopoly|competition|merger|regulator|oil price|opec|energy price|gas price|food price|supply chain|"
    r"shortage|carbon|emission|climate|housing|mortgage|bond yield|stimulus|bailout|strike|labor|labour|"
    r"通胀|通缩|物价|利率|降息|加息|降准|央行|美联储|欧洲央行|国内生产总值|GDP|经济增长|衰退|失业|就业|工资|关税|贸易|出口|进口|"
    r"顺差|逆差|汇率|人民币|美元|日元|财政|预算|赤字|国债|债务|税|补贴|限价|反垄断|垄断|竞争|并购|监管|油价|欧佩克|能源|"
    r"粮价|供应链|短缺|碳|排放|气候|房地产|房价|房贷|收益率|刺激|救助|罢工|消费|零售|PMI|CPI|PPI",
    re.I)
_NUM = re.compile(r"\d+(?:[.,]\d+)*")
_FREE_NUMBERS = {str(n) for n in range(0, 11)} | {"12", "15", "20", "25", "30"}   # "two reasons", "15 marks"


def _id(title: str) -> str:
    return hashlib.md5(title.strip().encode("utf-8", "ignore")).hexdigest()[:12]


_CALENDAR = re.compile(r"\d{1,2}月|\d{4}年|\d{1,2}日")   # "8月" for "August": a date word, not a figure


_MONTHS = r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
_DATES = re.compile(rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+{_MONTHS}\b|\b{_MONTHS}\s+\d{{1,2}}\b|\b(?:19|20)\d{{2}}\b|\d{{1,2}}月|\d{{4}}年|\d{{1,2}}日")
_CJK = re.compile(r"[\u4e00-\u9fff]")


def _numbers(text: str) -> set:
    return {n.replace(",", "").rstrip(".") for n in _NUM.findall(_CALENDAR.sub(" ", text or ""))}


def _is_figure(text: str) -> bool:
    """A quotable figure is a quantity (amount, percentage, price), not just a date."""
    return bool(_NUM.search(_DATES.sub(" ", text)))


def _right_language(lang: str, text: str) -> bool:
    return bool(_CJK.search(text)) if lang == "zh" else not _CJK.search(text)


def _valid_stored(c: dict) -> bool:
    if c.get("rejected"):
        return True
    return all(_right_language(lang, str((c.get(lang) or {}).get(k) or ""))
               for lang in ("zh", "en") for k in ("what", "angle", "evaluate", "question"))


def _load() -> None:
    global _db
    try:
        with open(_PATH, encoding="utf-8") as f:
            data = json.load(f)
        now = time.time()
        # A case written in the wrong language is dropped (not marked rejected), so it is written again
        _db = {k: v for k, v in data.items()
               if now - v.get("ts", 0) < (_KEEP_REJECTED if v.get("rejected") else _KEEP_CASES) and _valid_stored(v)}
    except Exception:
        _db = {}


def _save() -> None:
    with _lock:
        snapshot = dict(_db)
    tmp = _PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False)
    os.replace(tmp, _PATH)


def cases() -> list:
    """Accepted cases, newest article first."""
    with _lock:
        out = [v for v in _db.values() if not v.get("rejected")]
    return sorted(out, key=lambda c: c.get("published_at") or "", reverse=True)


def status() -> dict:
    return {**_status, "cases": len(cases())}


# ── Candidates ────────────────────────────────────────────────────────────────

def _candidates() -> list:
    """Newest economics-looking articles from the news feeds that have a usable lead."""
    from routers import news
    pools = []
    for cache, key, build in ((news._daily_cache, "daily", lambda: news.get_daily_market_news(lang="all", category="all", ui=None)),
                              (news._global_cache, "global", lambda: news.get_global_news(lang="all", category="all"))):
        if key not in cache:
            try:
                build()                       # fills the feed's own cache
            except Exception as e:
                logger.warning("case candidates: %s feed failed: %s", key, e)
        if key in cache:
            pools.extend(cache[key][1]["items"])
    seen, out = set(), []
    for it in sorted(pools, key=lambda i: i.get("published_at") or "", reverse=True):
        title = (it.get("title") or "").strip()
        lead = (it.get("summary") or "").strip()
        cid = _id(title)
        if not title or cid in seen or len(lead) < 60 or not it.get("url"):
            continue
        seen.add(cid)
        with _lock:
            if cid in _db:
                continue
        if not _KEYWORDS.search(title + " " + lead):
            continue
        out.append({**it, "id": cid})
    return out


# ── Model ─────────────────────────────────────────────────────────────────────

def _prompt() -> str:
    concept_list = "\n".join(f"- {cid}: {v[1]}" for cid, v in CONCEPTS.items())
    return (
        "You help secondary-school economics students (IB, A-Level, AP, IGCSE) find real-world examples for "
        "essays. You get one news article (headline and the source's short lead). Decide whether it is a clear, "
        "useful example of one or more of these concepts:\n" + concept_list + "\n\n"
        "Rules: use only facts stated in the headline and lead; never add numbers, names, dates or events that "
        "are not there; textbook reasoning is fine but must not introduce new facts. Never infer a person's job "
        "title or role: give a role only when the source states it for that same person, otherwise use the name "
        "alone. Write in your own words, "
        "do not copy sentences from the source. No investment advice.\n"
        "Return JSON only:\n"
        '{"useful": true|false, "concepts": ["concept_id", ...] (1 to 3, most relevant first), '
        '"zh": {"what": "...", "angle": "...", "evaluate": "...", "question": "...", "data": ["..."]}, '
        '"en": {same keys}}\n'
        "what: 1-2 sentences on what happened. angle: 2-3 sentences explaining how it illustrates the concept "
        "(the mechanism a student would draw or explain). evaluate: 1-2 sentences giving one evaluation point "
        "(another factor, a limitation, short run vs long run, who wins and who loses). question: one exam-style "
        "question that uses this example. data: up to 3 short phrases with quantities from the article (amounts, "
        "percentages, prices; not dates), keeping every number exactly as written in the source (Arabic "
        "numerals); empty if it has none.\n"
        "Every field of zh, including the question, is written in Simplified Chinese; every field of en in "
        "English. If the article is not a useful economics example "
        '(celebrity, crime, sport, a single stock tip, too vague), return {"useful": false}.'
    )


def _ask(item: dict) -> dict | None:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=90, max_retries=0)
    resp = client.chat.completions.create(
        model="deepseek-chat", max_tokens=1200, temperature=0.3, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": _prompt()},
                  {"role": "user", "content": f"Source: {item.get('source')}\nDate: {(item.get('published_at') or '')[:10]}\n"
                                              f"Headline: {item['title']}\nLead: {item['summary'][:700]}"}],
    )
    return json.loads(resp.choices[0].message.content or "{}")


def _check(item: dict, out: dict) -> dict | None:
    """Keep the model's answer only if it stays inside the article. Returns the case or None."""
    if not isinstance(out, dict) or not out.get("useful"):
        return None
    concepts = [c for c in (out.get("concepts") or []) if c in CONCEPTS][:3]
    if not concepts:
        return None
    sourced = _numbers(item["title"] + " " + item["summary"]) | _numbers(item.get("published_at") or "")
    allowed = sourced | _FREE_NUMBERS               # explanations may say "two reasons" or "15 marks"
    case = {"id": item["id"], "title": item["title"], "url": item["url"], "source": item.get("source"),
            "source_lang": item.get("lang"), "published_at": item.get("published_at"), "concepts": concepts,
            "ts": time.time()}
    for lang in ("zh", "en"):
        part = out.get(lang) or {}
        texts = {k: str(part.get(k) or "").strip() for k in ("what", "angle", "evaluate", "question")}
        if not texts["what"] or not texts["angle"] or not texts["question"]:
            return None
        for k, v in texts.items():
            if not _right_language(lang, v):
                logger.info("case %s rejected: %s/%s is in the wrong language", item["id"], lang, k)
                return None
            if _numbers(v) - allowed:
                logger.info("case %s rejected: %s/%s has figures not in the source", item["id"], lang, k)
                return None
        data = [str(d).strip() for d in (part.get("data") or []) if str(d).strip()][:3]
        data = [d for d in data if _is_figure(d) and not (_numbers(d) - sourced)]   # quotable figures: only the article's
        case[lang] = {**{k: v[:600] for k, v in texts.items()}, "data": [d[:200] for d in data]}
    return case


def run_once(limit: int = _PER_RUN) -> int:
    """One pass: send new candidates to the model and store the results. Returns cases added."""
    today = time.strftime("%Y-%m-%d")
    added = 0
    for item in _candidates()[:limit]:
        with _lock:
            if _calls["day"] != today:
                _calls.update(day=today, n=0)
            if _calls["n"] >= _DAILY_CAP:
                break
            _calls["n"] += 1
        try:
            out = _ask(item)
        except Exception as e:
            logger.warning("case generation failed: %s", e)
            continue
        if out is None:
            break                              # no API key
        case = _check(item, out)
        with _lock:
            _db[item["id"]] = case or {"rejected": True, "ts": time.time()}
        added += bool(case)
    if added or _db:
        try:
            _save()
        except Exception as e:
            logger.warning("case library write failed: %s", e)
    _status.update(last_run=datetime.utcnow().isoformat() + "Z", added=added)
    logger.info("case library: %d new cases (%d calls today)", added, _calls["n"])
    return added


def _loop() -> None:
    time.sleep(120)                            # let the news feeds warm up after a restart
    while True:
        try:
            run_once()
        except Exception as e:
            logger.warning("case library run failed: %s", e)
        time.sleep(_EVERY)


def start() -> None:
    threading.Thread(target=_loop, daemon=True, name="econ-cases").start()


_load()
