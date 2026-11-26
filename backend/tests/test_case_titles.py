"""Case headlines in the reader's language (services/econ_cases.py): stored translations, outlet names, backfill."""
import sys

import pytest

import stubs

stubs.stub()
from services import econ_cases as ec  # noqa: E402


def case(**kw):
    base = {"id": "c1", "title": "美国提出新关税措施后，韩国称将继续磋商", "url": "https://x", "source": "新浪财经要闻",
            "source_lang": "cn", "concepts": ["trade_protectionism"], "published_at": "2026-11-26",
            "zh": {"what": "美国宣布新关税，涉及 25 个国家", "angle": "a", "evaluate": "b", "question": "c"},
            "en": {"what": "The US announced new tariffs", "angle": "a", "evaluate": "b", "question": "c"}}
    base.update(kw)
    return base


def test_headline_follows_the_reader_with_the_original_as_fallback():
    c = case(titles={"zh": "美国提出新关税", "en": "South Korea to keep talking after new US tariffs"})
    assert ec.title_in(c, "zh") == "美国提出新关税"
    for lang in ("en", "ja", "ko", "fr"):
        assert ec.title_in(c, lang) == "South Korea to keep talking after new US tariffs"
    assert ec.title_in(case(), "en") == case()["title"]                   # nothing stored yet: the original


def test_outlet_names_are_translated_for_the_other_language_only():
    assert ec.source_name("新浪财经要闻", "en") == "Sina Finance" and ec.source_name("新浪财经要闻", "zh") == "新浪财经要闻"
    assert ec.source_name("Guardian Business", "zh") == "卫报商业" and ec.source_name("Guardian Business", "en") == "Guardian Business"
    assert ec.source_name("CNBC", "zh") == "CNBC" and ec.source_name(None, "en") == ""


def test_a_translated_headline_must_be_in_the_right_language_and_invent_no_figure():
    src = "Poundland collapses, putting more than 10,000 jobs at risk"
    assert ec._title_ok("zh", "Poundland 倒闭，超过 10,000 个工作岗位面临风险", src)
    assert not ec._title_ok("zh", "Poundland collapses", src)                         # not Chinese
    assert not ec._title_ok("en", "英镑店倒闭", src)                                    # not English
    assert not ec._title_ok("zh", "Poundland 倒闭，超过 20,000 个工作岗位面临风险", src)  # an invented figure


def test_backfill_translates_missing_titles_keeps_good_ones_and_drops_bad(monkeypatch):
    ok = case(id="a", title="Poundland collapses, putting 10,000 jobs at risk", source="Guardian Business", source_lang="en",
              en={"what": "Poundland collapsed", "angle": "a", "evaluate": "b", "question": "c"},
              zh={"what": "英镑店倒闭", "angle": "a", "evaluate": "b", "question": "c"})
    bad = case(id="b", title="Gold rebounds from a one-year low")
    done = case(id="d", titles={"zh": "已有", "en": "Done already"})
    monkeypatch.setattr(ec, "_db", {"a": ok, "b": bad, "d": done})
    asked = []

    def fake(batch):
        asked.extend(c["id"] for c in batch)
        return {"a": {"zh": "Poundland 倒闭，1 万个岗位面临风险", "en": "Poundland collapses, putting 10,000 jobs at risk"},
                "b": {"zh": "黄金", "en": "Gold rebounds from a 99 week low"}}          # b: wrong language and an invented figure
    monkeypatch.setattr(ec, "_ask_titles", fake)
    monkeypatch.setitem(ec._title_calls, "n", 0)
    n = ec.backfill_titles()
    assert sorted(asked) == ["a", "b"] and n >= 1                                    # the complete one is not sent
    assert ec._db["a"]["titles"]["en"] == "Poundland collapses, putting 10,000 jobs at risk"
    assert "titles" not in ec._db["b"] or "en" not in ec._db["b"]["titles"]
    assert ec._db["d"]["titles"] == {"zh": "已有", "en": "Done already"}


def test_backfill_stops_at_the_daily_cap(monkeypatch):
    monkeypatch.setattr(ec, "_db", {"a": case(id="a")})
    monkeypatch.setattr(ec, "_ask_titles", lambda batch: pytest.fail("no call expected"))
    monkeypatch.setitem(ec._title_calls, "day", __import__("time").strftime("%Y-%m-%d"))
    monkeypatch.setitem(ec._title_calls, "n", ec._TITLE_CAP)
    assert ec.backfill_titles() == 0


def test_a_headline_the_model_never_translates_is_given_up_on(monkeypatch):
    monkeypatch.setattr(ec, "_db", {"b": case(id="b", title="Gold rebounds from a one-year low")})
    monkeypatch.setattr(ec, "_ask_titles", lambda batch: {})                    # the model returns nothing usable
    monkeypatch.setitem(ec._title_calls, "n", 0)
    calls = [ec.backfill_titles() for _ in range(6)]
    assert calls == [0] * 6 and ec._db["b"]["title_tries"] == ec._TITLE_TRIES      # tried three times, then left alone
