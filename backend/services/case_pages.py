"""
Case pages that search engines can read: frontend/dist/cases/<id>.html for every case in the
library (services/econ_cases.py). nginx serves them at /cases/<id> with its existing
`try_files $uri $uri.html /index.html`, so nginx needs no change.

Each page is the built index.html, with the same scripts, so the app still starts and opens the
case. It carries:
  - the case's own <title>, description, canonical URL, Open Graph tags and JSON-LD;
  - the case itself inside #root: headline, date, source link, what happened / the economics /
    evaluation / practice question, the figures to quote, the concepts and where they sit in
    each syllabus, then the same case in the other language.
React replaces #root when it starts. A page is in the language of its news source (English
sources give English pages, Chinese ones Chinese pages), with the other language below. The app
renders crawlers in the page's language (store/langStore.js), so both views agree.

The backend writes the pages, not the build, because cases arrive every 90 minutes, between
deploys. They are written on startup, after every case run, and whenever dist/index.html changes,
since `npm run build` empties dist and changes the asset names the pages must load.

Only stored text is shown: the case's own fields, the headline, our concept definitions and the
study centre's topic names. No new figures.
"""
import hashlib
import html
import json
import logging
import os
import re
import threading
import time
from datetime import datetime, timezone
from urllib.parse import urlencode

from services import econ_cases
from services.econ_concepts import CONCEPTS
from services.econ_diagrams import diagram_view

logger = logging.getLogger("case_pages")

SITE = "https://bestfriendstock.com"
_DIST = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
_OUT = os.path.join(_DIST, "cases")
_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")    # case ids are 12 hex characters; also the file name
_WATCH_EVERY = 30                           # seconds between checks for a new build
_RELATED = 6
_SITEMAP_MAX = 45000                        # a sitemap file holds at most 50,000 URLs
_BOARDS = ("ib", "alevel", "ap_macro", "ap_micro", "igcse")
_HTML_LANG = {"en": "en", "zh": "zh-CN"}
_PUNCT = {"en": (": ", ", "), "zh": ("：", "、")}

_lock = threading.Lock()
_written: dict = {}         # case id -> hash of the page on disk, rendered from the current build
_built = None               # (mtime_ns, size) of the index.html those pages came from
_last_error = ""

_TEXT = {
    "en": {
        "library": "Economics Case Library", "version": "English version",
        "what": "What happened", "angle": "The economics", "data": "Figures to quote",
        "evaluate": "Evaluation", "question": "Practice question",
        "read": "Read the article", "draw": "Draw the diagram in the Diagram Lab",
        "for": "Real-world example for IB, A-Level, AP and IGCSE Economics essays",
        "syllabus": "Where it fits in the syllabus", "more": "More cases on {}",
        "all": "All cases in the Economics Case Library",
        "source": {"cn": "Chinese source", "en": "English source"},
        "boards": {"ib": "IB Economics", "alevel": "A-Level Economics", "ap_macro": "AP Macroeconomics",
                   "ap_micro": "AP Microeconomics", "igcse": "IGCSE Economics"},
        "note": "Cases are written by AI from the article headline and lead, using only facts from the article; "
                "every quoted figure comes from it. Read the original before citing.",
    },
    "zh": {
        "library": "经济学案例库", "version": "中文版",
        "what": "发生了什么", "angle": "经济学角度", "data": "可以引用的数据",
        "evaluate": "评估角度", "question": "练习题",
        "read": "阅读原文", "draw": "在图表实验室里画出这张图",
        "for": "可以写进 IB、A-Level、AP、IGCSE 经济学论文的真实新闻案例",
        "syllabus": "对应考纲", "more": "更多「{}」案例",
        "all": "经济学案例库里的全部案例",
        "source": {"cn": "中文来源", "en": "英文来源"},
        "boards": {"ib": "IB 经济学", "alevel": "A-Level 经济学", "ap_macro": "AP 宏观经济学",
                   "ap_micro": "AP 微观经济学", "igcse": "IGCSE 经济学"},
        "note": "案例由 AI 根据新闻标题和导语撰写，只使用原文中的事实；引用的数据都出自原文。引用前请阅读原文核实。",
    },
}

# Inside #root, so it goes when the app starts; colours follow the site's theme variables
_CSS = (
    ".case-static{max-width:780px;margin:0 auto;padding:24px 18px 56px;font-size:16px;line-height:1.7;"
    "font-family:var(--sans,system-ui,sans-serif);color:var(--text-primary,#0d1b2a)}"
    ".case-static a{color:#0ea5e9}"
    ".case-static .meta,.case-static nav,.case-static .note{color:var(--text-secondary,#475569);font-size:14px}"
    ".case-static h1{line-height:1.3;margin:.3em 0 .5em}"
    ".case-static h2{font-size:1.15em;margin:1.6em 0 .3em}"
    ".case-static h3{font-size:1em;margin:1.2em 0 .2em}"
    ".case-static p,.case-static ul{margin:.3em 0}"
    ".case-static .q{border-left:3px solid #f59e0b;padding:8px 12px;background:rgba(245,158,11,.08)}"
    ".case-static section{border-top:1px solid var(--border-primary,#d0d7de);margin-top:2em}"
)


def page_lang(case: dict) -> str:
    """A page is written in its source's language: a Chinese article gives a Chinese page."""
    return "zh" if case.get("source_lang") == "cn" else "en"


def _concepts(case: dict) -> list:
    return [k for k in case.get("concepts") or [] if k in CONCEPTS]


def _name(k: str, lang: str) -> str:
    return CONCEPTS[k][0 if lang == "zh" else 1]


def _lower(name: str) -> str:
    """'Supply shocks' -> 'supply shocks', for use mid-sentence (keeps 'GDP...' as it is)."""
    return name[:1].lower() + name[1:] if name[1:2].islower() else name


def _clip(text: str, n: int, words: bool = True) -> str:
    text = " ".join(text.split())
    if len(text) <= n:
        return text
    cut = text[:n]
    if words and " " in cut[n // 2:]:
        cut = cut[:cut.rfind(" ")]               # whole words (Chinese is cut anywhere)
    return cut.rstrip(" ,.;:，。；：、") + "…"


def _date(case: dict) -> str:
    return (case.get("published_at") or "")[:10]


def _e(text) -> str:
    return html.escape(str(text or ""), quote=True)


def _source_url(case: dict) -> str | None:
    url = str(case.get("url") or "")
    return url if url.startswith(("https://", "http://")) else None


def title(case: dict, lang: str) -> str:
    """The page title; CasesPage.jsx builds the same one in the app."""
    names = _concepts(case)
    head = case.get("title") or ""
    if not names:
        return f"{head} | BestFriendStock"
    if lang == "zh":
        return f"{head} - {_name(names[0], 'zh')}案例 | BestFriendStock"
    return f"{head} – {_name(names[0], 'en')} example | BestFriendStock"


def description(case: dict, lang: str) -> str:
    names = _concepts(case)
    what = str((case.get(lang) or {}).get("what") or "")
    if lang == "zh":
        lead = f"{_name(names[0], 'zh')}的真实新闻案例，可用于 IB、A-Level、AP、IGCSE 经济学论文：" if names else ""
        return _clip(lead + what, 120, words=False)
    lead = f"{_name(names[0], 'en')}: a real-world example for IB, A-Level, AP and IGCSE Economics. " if names else ""
    return _clip(lead + what, 165)


# ── Related cases ─────────────────────────────────────────────────────────────

def _library() -> list:
    """Accepted cases that get a page, newest article first."""
    return [c for c in econ_cases.cases() if _ID.fullmatch(str(c.get("id") or ""))]


def _nearby(case: dict, same: list, i: int) -> list:
    """Up to _RELATED cases around position i (nearest in date), so a page's links stay put as
    the library grows instead of all moving to the newest cases."""
    lo = max(0, min(i - _RELATED // 2, len(same) - _RELATED - 1))
    return [c for c in same[lo:lo + _RELATED + 1] if c["id"] != case["id"]][:_RELATED]


def related(case: dict) -> list:
    """Other cases on the case's main concept: the list its page shows (for the API)."""
    names = case.get("concepts") or []
    if not names:
        return []
    same = [c for c in _library() if names[0] in (c.get("concepts") or [])]
    i = next((j for j, c in enumerate(same) if c["id"] == case["id"]), 0)
    return _nearby(case, same, i)


# ── Rendering ─────────────────────────────────────────────────────────────────

_topic_cache: dict = {}


def _topic_titles() -> dict:
    """board -> {topic id: title}, from the study centre's curricula (English syllabus names)."""
    if not _topic_cache:
        try:
            from routers.study import ALL_CURRICULA
            for board, cur in ALL_CURRICULA.items():
                _topic_cache[board] = {t["id"]: t.get("title_en") or t["title"]
                                       for p in cur["papers"] for t in p["topics"]}
        except Exception as e:
            logger.warning("case pages: no study topic names: %s", e)
    return _topic_cache


def _diagram_href(case: dict, d: dict) -> str:
    """Same link as diagramHref() in components/diagrams/diagramNav.js."""
    q = {"d": d["id"]}
    if d.get("preset"):
        q["p"] = d["preset"]
    if d.get("currency"):
        q["cur"] = d["currency"]
    q["case"] = case["id"]
    return "/diagrams?" + urlencode(q)


def _version(case: dict, lang: str, main: bool) -> str:
    """The case in one language, in the app's order: what, the economics, figures, evaluation, question."""
    t = _TEXT[lang]
    part = case.get(lang) or {}
    h = "h2" if main else "h3"
    out = [f"<{h}>{_e(t[k])}</{h}><p>{_e(part[k])}</p>" for k in ("what", "angle") if part.get(k)]
    data = [d for d in part.get("data") or [] if d]
    if data:
        out.append(f"<{h}>{_e(t['data'])}</{h}><ul>" + "".join(f"<li>{_e(d)}</li>" for d in data) + "</ul>")
    if part.get("evaluate"):
        out.append(f"<{h}>{_e(t['evaluate'])}</{h}><p>{_e(part['evaluate'])}</p>")
    if part.get("question"):
        out.append(f'<{h}>{_e(t["question"])}</{h}><p class="q">{_e(part["question"])}</p>')
    return "".join(out)


def _topics(names: list) -> dict:
    """board -> study-centre topics (id, title) that teach these concepts, boards in the site's order."""
    titles = _topic_titles()
    out = {}
    for b in _BOARDS:
        ids = list(dict.fromkeys(tid for k in names for tid in CONCEPTS[k][4].get(b, [])))
        if ids:
            out[b] = [(tid, titles[b][tid]) for tid in ids if tid in titles.get(b, {})]
    return out


def _syllabus(case: dict, lang: str) -> str:
    """Each concept with our definition, then the study-centre topics per exam board."""
    t = _TEXT[lang]
    colon, comma = _PUNCT[lang]
    names = _concepts(case)
    out = ["<ul>" + "".join(f"<li><b>{_e(_name(k, lang))}</b>{colon}{_e(CONCEPTS[k][2 if lang == 'zh' else 3])}</li>"
                            for k in names) + "</ul>"]
    rows = []
    for b, topics in _topics(names).items():
        links = comma.join(f'<a href="/study/{b}?topic={tid}">{_e(name)}</a>' for tid, name in topics)
        rows.append(f"<li>{_e(t['boards'][b])}{colon + links if links else ''}</li>")
    if rows:
        out.append("<ul>" + "".join(rows) + "</ul>")
    return "".join(out)


def _body(case: dict, lang: str, near: list) -> str:
    t = _TEXT[lang]
    colon, comma = _PUNCT[lang]
    other = "en" if lang == "zh" else "zh"
    url = _source_url(case)
    source = _e(case.get("source"))
    src = f'<a href="{_e(url)}" target="_blank" rel="noopener noreferrer">{source}</a>' if url else source
    meta = " · ".join(x for x in (_e(_date(case)), src, _e(t["source"].get(case.get("source_lang") or "", ""))) if x)
    names = _concepts(case)
    tags = comma.join(f'<a href="/cases?concept={k}">{_e(_name(k, lang))}</a>' for k in names)
    links = [f'<a href="{_e(url)}" target="_blank" rel="noopener noreferrer">{_e(t["read"])} ↗</a>'] if url else []
    d = diagram_view(case)
    if d:
        links.append(f'<a href="{_e(_diagram_href(case, d))}">{_e(t["draw"])}</a>')
    more = ""
    if near and names:
        name = _name(names[0], lang)
        items = "".join(f'<li><a href="/cases/{c["id"]}">{_e(c.get("title"))}</a> <span class="meta">{_e(_date(c))}</span></li>'
                        for c in near)
        more = f"<h2>{_e(t['more'].format(name if lang == 'zh' else _lower(name)))}</h2><ul>{items}</ul>"
    return (
        f"<style>{_CSS}</style>"
        f'<main class="case-static">'
        f'<nav><a href="/">BestFriendStock</a> › <a href="/cases">{_e(t["library"])}</a></nav>'
        f"<article>"
        f'<p class="meta">{meta}</p>'
        f"<h1>{_e(case.get('title'))}</h1>"
        f"<p>{_e(t['for'])}{colon}{tags}</p>"
        f"{_version(case, lang, True)}"
        f"{'<p>' + ' · '.join(links) + '</p>' if links else ''}"
        f"<h2>{_e(t['syllabus'])}</h2>{_syllabus(case, lang)}"
        f"</article>"
        f'<section lang="{_HTML_LANG[other]}"><h2>{_e(_TEXT[other]["version"])}</h2>{_version(case, other, False)}</section>'
        f"{more}"
        f'<p><a href="/cases">{_e(t["all"])}</a></p>'
        f'<p class="note">{_e(t["note"])}</p>'
        f"</main>"
    )


def _json_ld(case: dict, lang: str, url: str, desc: str) -> str:
    names = _concepts(case)
    created = case.get("ts")
    published = (datetime.fromtimestamp(created, timezone.utc).isoformat(timespec="seconds")
                 if isinstance(created, (int, float)) else _date(case))
    org = {"@type": "Organization", "name": "BestFriendStock", "url": SITE + "/"}
    article = {
        "@type": ["Article", "LearningResource"],
        "@id": url + "#case",
        "headline": _clip(case.get("title") or "", 110),
        "description": desc,
        "inLanguage": _HTML_LANG[lang],
        "url": url,
        "mainEntityOfPage": url,
        "datePublished": published,
        "image": SITE + "/og-image.png",
        "author": org,
        "publisher": {**org, "logo": {"@type": "ImageObject", "url": SITE + "/apple-touch-icon.png"}},
        "isAccessibleForFree": True,
        "learningResourceType": "Case study",
        "educationalLevel": "Secondary school",
        "audience": {"@type": "EducationalAudience", "educationalRole": "student"},
        "about": [{"@type": "DefinedTerm", "name": _name(k, lang), "description": CONCEPTS[k][2 if lang == "zh" else 3]}
                  for k in names],
        "educationalAlignment": [
            {"@type": "AlignmentObject", "alignmentType": "educationalSubject", "educationalFramework": _TEXT["en"]["boards"][b],
             "targetName": name, "targetUrl": f"{SITE}/study/{b}?topic={tid}"}
            for b, topics in _topics(names).items() for tid, name in topics
        ],
    }
    if _source_url(case):
        article["isBasedOn"] = {"@type": "NewsArticle", "headline": case.get("title"), "url": case["url"],
                                "datePublished": _date(case), "publisher": {"@type": "Organization", "name": case.get("source")}}
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "BestFriendStock", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": _TEXT[lang]["library"], "item": SITE + "/cases"},
        {"@type": "ListItem", "position": 3, "name": case.get("title"), "item": url},
    ]}
    text = json.dumps({"@context": "https://schema.org", "@graph": [article, crumbs]}, ensure_ascii=False)
    return text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")   # safe inside <script>


def _head(case: dict, lang: str) -> str:
    url = f"{SITE}/cases/{case['id']}"
    ttl, desc = _e(title(case, lang)), description(case, lang)
    names = _concepts(case)
    keywords = [*(_name(k, "en") for k in names), *(_name(k, "zh") for k in names), "economics real-world example",
                "economics case study", "IB Economics", "A-Level Economics", "AP Economics", "IGCSE Economics", "经济学案例"]
    created = case.get("ts")
    tags = [f'<meta property="article:tag" content="{_e(_name(k, lang))}" />' for k in names]
    if isinstance(created, (int, float)):
        tags.insert(0, f'<meta property="article:published_time" content="{datetime.fromtimestamp(created, timezone.utc).isoformat(timespec="seconds")}" />')
    lines = [
        f"<title>{ttl}</title>",
        f'<meta name="description" content="{_e(desc)}" />',
        f'<meta name="keywords" content="{_e(", ".join(keywords))}" />',
        f'<link rel="canonical" href="{url}" />',
        '<meta property="og:type" content="article" />',
        f'<meta property="og:url" content="{url}" />',
        f'<meta property="og:title" content="{ttl}" />',
        f'<meta property="og:description" content="{_e(desc)}" />',
        f'<meta property="og:locale" content="{"zh_CN" if lang == "zh" else "en_US"}" />',
        f'<meta property="og:locale:alternate" content="{"en_US" if lang == "zh" else "zh_CN"}" />',
        *tags,
        f'<meta name="twitter:title" content="{ttl}" />',
        f'<meta name="twitter:description" content="{_e(desc)}" />',
        f'<script type="application/ld+json">{_json_ld(case, lang, url, desc)}</script>',
    ]
    return "\n    ".join(lines)


# Site-wide tags in index.html that a case page replaces with its own
_STRIP = (
    r"<title>[\s\S]*?</title>",
    r'<meta name="(?:description|keywords|twitter:title|twitter:description)" content="[^"]*"\s*/?>',
    r'<meta property="og:(?:type|url|title|description|locale)" content="[^"]*"\s*/?>',
    r'<link rel="canonical" href="[^"]*"\s*/?>',
    r'<script type="application/ld\+json">[\s\S]*?</script>',
)


def _prepare(template: str) -> str | None:
    """The built index.html without its site-wide SEO tags and crawler text, with markers where a
    case's own go. None if it does not look like a finished index.html (a build is writing it)."""
    if "<title>" not in template or '<div id="root"></div>' not in template or "</html>" not in template:
        return None
    page = template.replace("<title>", "<!--case-head--><title>", 1)
    for pattern in _STRIP:
        page = re.sub(r"[ \t]*" + pattern + r"[ \t]*\n?", "", page)
    page = re.sub(r'<html lang="[^"]*"', '<html lang="<!--case-lang-->"', page, count=1)
    # Between <body> and #root there is only the site-wide text for crawlers (.seo-content, <noscript>):
    # it would make every case page a near copy of the home page
    page = re.sub(r'<body>[\s\S]*?<div id="root"></div>', '<body>\n    <div id="root"><!--case-body--></div>', page, count=1)
    if "<!--case-head-->" not in page or "<!--case-body-->" not in page or "<!--case-lang-->" not in page:
        return None
    return page


def render(case: dict, base: str, near: list) -> str:
    lang = page_lang(case)
    return (base.replace("<!--case-lang-->", _HTML_LANG[lang], 1)
                .replace("<!--case-head-->", _head(case, lang), 1)
                .replace("<!--case-body-->", _body(case, lang, near), 1))


# ── Files ─────────────────────────────────────────────────────────────────────

def _write(path: str, page: str) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(page)
    os.chmod(tmp, 0o644)                        # nginx reads it as another user
    os.replace(tmp, path)


def _refresh() -> int:
    global _built
    index = os.path.join(_DIST, "index.html")
    try:
        st = os.stat(index)
        with open(index, encoding="utf-8") as f:
            template = f.read()
    except OSError:
        return 0                                # no frontend build on this machine
    base = _prepare(template)
    if base is None:
        return 0                                # the watcher tries again
    built = (st.st_mtime_ns, st.st_size)
    if built != _built:
        _written.clear()                        # new build, new asset names: every page changes
    os.makedirs(_OUT, exist_ok=True)
    pool = _library()
    groups: dict = {}
    for c in pool:
        for k in c.get("concepts") or []:
            groups.setdefault(k, []).append(c)
    pos = {k: {c["id"]: i for i, c in enumerate(v)} for k, v in groups.items()}
    written = 0
    for c in pool:
        k = c["concepts"][0] if c.get("concepts") else None
        page = render(c, base, _nearby(c, groups[k], pos[k][c["id"]]) if k in groups else [])
        digest = hashlib.sha1(page.encode("utf-8")).hexdigest()
        path = os.path.join(_OUT, c["id"] + ".html")
        if _written.get(c["id"]) == digest and os.path.exists(path):
            continue
        _write(path, page)
        _written[c["id"]] = digest
        written += 1
    keep = {c["id"] + ".html" for c in pool}
    for name in os.listdir(_OUT):
        if name not in keep and name.endswith((".html", ".tmp")):
            os.remove(os.path.join(_OUT, name))  # the case left the library (expired or purged)
            _written.pop(name.split(".")[0], None)
    _built = built
    return written


def refresh() -> int:
    """Bring dist/cases/ in line with the library and the current build. Returns pages written."""
    global _last_error
    with _lock:
        try:
            n = _refresh()
            _last_error = ""
        except Exception as e:
            if str(e) != _last_error:            # the watcher retries every 30 s: log a failure once
                logger.warning("case pages failed: %s", e)
            _last_error = str(e)
            return 0
    if n:
        logger.info("case pages: %d written", n)
    return n


def sitemap_entries() -> list:
    """(URL, lastmod) for every case page, newest first."""
    out = []
    for c in _library()[:_SITEMAP_MAX]:
        created = c.get("ts")
        day = (datetime.fromtimestamp(created, timezone.utc).date().isoformat()
               if isinstance(created, (int, float)) else _date(c))
        out.append((f"{SITE}/cases/{c['id']}", day))
    return out


def _watch() -> None:
    index = os.path.join(_DIST, "index.html")
    while True:
        try:
            st = os.stat(index)
            stale = (st.st_mtime_ns, st.st_size) != _built or not os.path.isdir(_OUT)
        except OSError:
            stale = False                       # no build yet
        if stale:
            refresh()
        time.sleep(_WATCH_EVERY)


def start() -> None:
    """Write the pages now, then again after every build (econ_cases refreshes them after each run)."""
    threading.Thread(target=_watch, daemon=True, name="case-pages").start()
