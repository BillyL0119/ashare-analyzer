"""The static page each economics case gets at /cases/<id> (services/case_pages.py). No network: the
template is the source frontend/index.html, which has the same head and body layout as the built one."""
import json
import pathlib
import re
from datetime import datetime, timezone

import pytest

from services import case_pages as cp
from services import econ_cases

INDEX = (pathlib.Path(__file__).resolve().parents[2] / "frontend" / "index.html").read_text(encoding="utf-8")


def make_case(cid="0123456789ab", source_lang="en", **extra):
    return {
        "id": cid, "title": "Opec+ agrees deepest oil output cut since 2020", "url": "https://example.org/opec",
        "source": "Test Wire", "source_lang": source_lang, "published_at": "2026-10-30T08:00:00Z",
        "concepts": ["supply_shock", "cost_push_inflation"], "ts": datetime(2026, 10, 31, 6, tzinfo=timezone.utc).timestamp(),
        "en": {"what": "Opec+ agreed to cut oil output by 2 million barrels a day.",
               "angle": "Supply shifts left, so the price of oil rises.",
               "evaluate": "Spare capacity elsewhere may soften the effect.",
               "question": "Evaluate the effect of the cut on inflation.", "data": ["2 million barrels a day"]},
        "zh": {"what": "欧佩克+同意每天减产200万桶。", "angle": "供给曲线左移，油价上升。",
               "evaluate": "其他地区的闲置产能可能削弱影响。", "question": "评价减产对通胀的影响。", "data": ["每天减产200万桶"]},
        **extra,
    }


@pytest.fixture(autouse=True)
def topics(monkeypatch):
    # Syllabus names come from routers/study.py, which needs FastAPI: use a fixed table
    monkeypatch.setattr(cp, "_topic_cache", {"ib": {"ib_2": "Demand, Supply and Elasticity", "ib_5": "Aggregate Demand and Supply"}})


def render(case, near=()):
    base = cp._prepare(INDEX)
    assert base is not None, "index.html no longer has the layout case_pages expects"
    return cp.render(case, base, list(near))


def ld_json(page):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
    assert len(blocks) == 1                                   # the site-wide blocks are replaced
    return json.loads(blocks[0])


def test_english_source_gives_an_english_page():
    page = render(make_case())
    url = "https://bestfriendstock.com/cases/0123456789ab"
    assert '<html lang="en"' in page
    assert "<title>Opec+ agrees deepest oil output cut since 2020 – Supply shocks example | BestFriendStock</title>" in page
    assert f'<link rel="canonical" href="{url}" />' in page
    assert f'<meta property="og:url" content="{url}" />' in page
    assert '<meta property="og:type" content="article" />' in page
    assert page.count("<title>") == 1 and page.count('<meta name="description"') == 1 and page.count('<link rel="canonical"') == 1
    body = page[page.index("<body>"):]
    for text in ("Opec+ agreed to cut oil output", "Supply shifts left", "Spare capacity elsewhere",
                 "Evaluate the effect of the cut", "2 million barrels a day", "欧佩克+同意每天减产200万桶", "中文版",
                 'href="https://example.org/opec"', "IB Economics", 'href="/study/ib?topic=ib_2"'):
        assert text in body, text
    article = ld_json(page)["@graph"][0]
    assert article["headline"] == "Opec+ agrees deepest oil output cut since 2020"
    assert article["inLanguage"] == "en" and article["isBasedOn"]["url"] == "https://example.org/opec"


def test_chinese_source_gives_a_chinese_page():
    page = render(make_case(source_lang="cn"))
    assert '<html lang="zh-CN"' in page
    assert "<title>Opec+ agrees deepest oil output cut since 2020 - 供给冲击案例 | BestFriendStock</title>" in page
    body = page[page.index("<body>"):]
    assert body.index("欧佩克+同意") < body.index("English version") < body.index("Opec+ agreed")


def test_site_wide_crawler_text_is_dropped_and_the_app_still_loads():
    page = render(make_case())
    assert "seo-content" not in page and "<noscript>" not in page
    assert '<div id="root"><style>' in page                  # the case sits where React mounts
    assert '<script type="module" src="/src/main.jsx"></script>' in page
    # The inline head script is untouched, so the CSP hash vite.config.js computed still matches
    assert re.findall(r"<script>[\s\S]*?</script>", page) == re.findall(r"<script>[\s\S]*?</script>", INDEX)


def test_case_text_is_escaped():
    case = make_case(title="Cut <script>alert(1)</script>")
    case["en"]["angle"] = "Prices rise </script><b>fast</b> & far"
    page = render(case)
    assert "<script>alert" not in page and "</script><b>" not in page
    assert "Cut &lt;script&gt;alert(1)&lt;/script&gt;" in page
    assert ld_json(page)["@graph"][0]["headline"] == "Cut <script>alert(1)</script>"


def test_unsafe_source_url_is_not_linked():
    page = render(make_case(url="javascript:alert(1)", ts=None))
    assert "javascript:" not in page and "isBasedOn" not in page
    assert ld_json(page)["@graph"][0]["datePublished"] == "2026-10-30"   # no ts: the news date


def test_nearby_cases_surround_the_case():
    same = [{"id": str(i)} for i in range(20)]

    def ids(i):
        return [c["id"] for c in cp._nearby(same[i], same, i)]
    assert ids(0) == ["1", "2", "3", "4", "5", "6"]
    assert ids(10) == ["7", "8", "9", "11", "12", "13"]
    assert ids(19) == ["13", "14", "15", "16", "17", "18"]
    assert [c["id"] for c in cp._nearby(same[1], same[:3], 1)] == ["0", "2"]


def test_related_links_are_rendered():
    near = [make_case(cid="aaaaaaaaaaaa", title="Brent tops $90")]
    page = render(make_case(), near)
    assert '<a href="/cases/aaaaaaaaaaaa">Brent tops $90</a>' in page
    assert "More cases on supply shocks" in page


@pytest.fixture
def site(tmp_path, monkeypatch):
    """A fake frontend build and library: (write the build's index.html, set the library's cases)."""
    library = []
    monkeypatch.setattr(cp, "_DIST", str(tmp_path))
    monkeypatch.setattr(cp, "_OUT", str(tmp_path / "cases"))
    monkeypatch.setattr(cp, "_written", {})
    monkeypatch.setattr(cp, "_built", None)
    monkeypatch.setattr(econ_cases, "cases", lambda: list(library))
    (tmp_path / "index.html").write_text(INDEX, encoding="utf-8")
    return tmp_path, library


def test_refresh_writes_rewrites_and_removes_pages(site):
    dist, library = site
    library += [make_case(cid="aaaaaaaaaaaa"), make_case(cid="bbbbbbbbbbbb", source_lang="cn")]
    assert cp.refresh() == 2
    assert sorted(p.name for p in (dist / "cases").iterdir()) == ["aaaaaaaaaaaa.html", "bbbbbbbbbbbb.html"]
    assert cp.refresh() == 0                                  # nothing changed
    (dist / "index.html").write_text(INDEX.replace("</body>", "<!-- new build --></body>"), encoding="utf-8")
    assert cp.refresh() == 2                                  # a new build: every page again
    library.pop()
    cp.refresh()
    assert [p.name for p in (dist / "cases").iterdir()] == ["aaaaaaaaaaaa.html"]   # left the library


def test_half_written_index_html_is_left_alone(site):
    dist, library = site
    library.append(make_case())
    (dist / "index.html").write_text(INDEX[:2000], encoding="utf-8")
    assert cp.refresh() == 0 and not (dist / "cases").exists()


def test_sitemap_entries(site):
    _, library = site
    library += [make_case(cid="aaaaaaaaaaaa"), make_case(cid="bad id/../x"), make_case(cid="bbbbbbbbbbbb", ts=None)]
    assert cp.sitemap_entries() == [("https://bestfriendstock.com/cases/aaaaaaaaaaaa", "2026-10-31"),
                                    ("https://bestfriendstock.com/cases/bbbbbbbbbbbb", "2026-10-30")]
