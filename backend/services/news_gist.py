"""
"AI 速读": a one-sentence summary of a news item, written by DeepSeek in the reader's language
from the headline and the source's short lead (the lead itself is never shown: republishing it
was the reason scraped summaries were taken off the site).

Each (language, headline) pair is generated once, in the background, and kept on disk, so a page
never waits for the model: the first request queues the missing items and they appear on the
next load. A daily cap bounds the cost.
"""

import hashlib
import json
import logging
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

LANGS = ("zh", "en", "ja", "ko", "fr")
_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "news_gist.cache.json")
_MAX_AGE = 14 * 86400                 # news older than two weeks is never shown again
_DAILY_CAP = 3000                     # model calls per day across every language
_PER_REQUEST = 60                     # newest items queued per page load

_LANG_NAME = {"zh": "简体中文", "en": "English", "ja": "日本語", "ko": "한국어", "fr": "français"}
_LIMIT = {"zh": "不超过 40 个汉字", "en": "at most 25 words", "ja": "60 文字以内", "ko": "60자 이내", "fr": "25 mots maximum"}
_CJK = re.compile(r"[一-鿿]")
_KANA = re.compile(r"[぀-ヿ]")
_HANGUL = re.compile(r"[가-힯]")

_cache: dict = {}                     # "lang:md5(title)" -> {"t": text or "", "ts": epoch}
_lock = threading.Lock()
_pending: set = set()
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="news-gist")
_dirty = False
_calls = {"day": "", "n": 0}


def _key(lang: str, title: str) -> str:
    return f"{lang}:{hashlib.md5(title.encode('utf-8', 'ignore')).hexdigest()}"


def _load() -> None:
    global _cache
    try:
        with open(_PATH, encoding="utf-8") as f:
            data = json.load(f)
        now = time.time()
        _cache = {k: v for k, v in data.items() if now - v.get("ts", 0) < _MAX_AGE}
    except Exception:
        _cache = {}


def _save_soon() -> None:
    """Write the cache at most every 30s (generation happens in bursts)."""
    global _dirty
    with _lock:
        if _dirty:
            return
        _dirty = True

    def write():
        global _dirty
        time.sleep(30)
        with _lock:
            snapshot = dict(_cache)
            _dirty = False
        try:
            tmp = _PATH + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False)
            os.replace(tmp, _PATH)
        except Exception as e:
            logger.warning("news gist cache write failed: %s", e)

    threading.Thread(target=write, daemon=True).start()


def _right_language(text: str, lang: str) -> bool:
    if lang == "zh":
        return bool(_CJK.search(text))
    if lang == "ja":
        return bool(_KANA.search(text))
    if lang == "ko":
        return bool(_HANGUL.search(text))
    return not _CJK.search(text) and not _KANA.search(text) and not _HANGUL.search(text)


def _worth_it(title: str, lead: str, lang: str) -> bool:
    """Skip items where a summary would only repeat a headline the reader can already read."""
    lead = (lead or "").strip()
    if len(lead) >= 40:
        return True
    return not _right_language(title, lang)          # a foreign-language headline: say it in theirs


def _generate(key: str, title: str, lead: str, lang: str, banks: list) -> None:
    try:
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        today = time.strftime("%Y-%m-%d")
        with _lock:
            if _calls["day"] != today:
                _calls.update(day=today, n=0)
            if not api_key or _calls["n"] >= _DAILY_CAP:
                return
            _calls["n"] += 1
        focus = (f"Focus on what {', '.join(banks[:3])} said or did and the reason they gave. " if banks else
                 "Say what happened, and why it matters only if the headline or lead says so. ")
        system = (
            f"You write one-sentence news summaries for students learning about markets. "
            f"Write in {_LANG_NAME[lang]} only, {_LIMIT[lang]}. {focus}"
            "Use only facts in the headline and lead; do not add numbers, names, opinions or guesses about "
            "consequences that are not there, "
            "and never give investment advice. Use your own words, do not copy phrases from the source. "
            "Output the sentence only, with no prefix or quotation marks."
        )
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=60, max_retries=0)
        resp = client.chat.completions.create(
            model="deepseek-chat", max_tokens=120, temperature=0.3,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": f"Headline: {title}\nLead: {(lead or '')[:400]}"}],
        )
        text = (resp.choices[0].message.content or "").strip().strip('"“”「」\'')
        if not text or not _right_language(text, lang) or text == title:
            text = ""                                 # remembered as "nothing to show", not retried
        with _lock:
            _cache[key] = {"t": text[:300], "ts": time.time()}
        _save_soon()
    except Exception as e:
        logger.warning("news gist failed (%s): %s", lang, e)
    finally:
        with _lock:
            _pending.discard(key)


def attach(items: list, lang: str | None, bank: bool = False) -> int:
    """Set item['ai_summary'] from the cache for `lang` and queue the newest missing ones.
    Returns how many are still being written (the client can look again shortly)."""
    if lang not in LANGS:
        return 0
    queued = 0
    for i, it in enumerate(items):
        title = (it.get("title") or "").strip()
        if not title:
            continue
        key = _key(lang, title)
        with _lock:
            hit = _cache.get(key)
            busy = key in _pending
        if hit is not None:
            it["ai_summary"] = hit["t"] or None
            continue
        it["ai_summary"] = None
        if i >= _PER_REQUEST or not _worth_it(title, it.get("summary", ""), lang):
            continue
        if busy:
            queued += 1
            continue
        with _lock:
            _pending.add(key)
        _pool.submit(_generate, key, title, it.get("summary", ""), lang, it.get("banks") or [])
        queued += 1
    return queued


_load()
