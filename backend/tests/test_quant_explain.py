"""AI reading of the quant desk: facts come only from the file; answers with new numbers or promises are dropped."""
import json
from types import SimpleNamespace

from services import quant_explain as qe

SIG = {
    "as_of": "2026-11-20", "generated_at": "x", "universe": {"size": 984},
    "trend": {"above": False, "gap_pct": -5.5},
    "config": {"chosen_factors": ["fcf_yield", "roe"], "top_n": 50, "keep_pct": 0.3},
    "ranking": [{"rank": 1, "ticker": "THC", "name": "Tenet Healthcare Corp", "sector": "Healthcare", "top": True},
                {"rank": 2, "ticker": "VST", "name": "Vistra Corp", "sector": "Utilities", "top": True}],
    "validation": {"dev_period": "2005-01 .. 2020-10", "candidates": ["index", "model (step E)"],
                   "dev": {"index": {"cagr": 8.97, "max_drawdown": -49.8},
                           "model (step E)": {"cagr": 9.39, "max_drawdown": -57.7}},
                   "holdout": {"index": {"cagr": 13.65, "max_drawdown": -25.2},
                               "model (step E)": {"cagr": 18.54, "max_drawdown": -22.3, "vs_cap_weight": 4.89,
                                                  "t_vs_cap_weight": 1.13}}},
}


def _sections(lang_cjk, extra=""):
    t = "大盘" if lang_cjk else "Market"
    body = ("指数在均线下方 5.5%，按趋势规则下个月持有现金。" if lang_cjk
            else "The index is 5.5% below its average; the trend rule says hold cash.") + extra
    return [{"title": t, "body": body}] * 5


def _client(payload):
    msg = SimpleNamespace(content=json.dumps(payload))
    resp = SimpleNamespace(choices=[SimpleNamespace(message=msg)])
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=lambda **kw: resp)))


def test_facts_hold_only_file_data():
    f = qe.facts(SIG)
    assert "5.5% below" in f and "hold cash" in f and "THC (Tenet Healthcare Corp" in f
    assert "18.5% a year" in f and "t-statistic 1.1" in f and "would also hold cash" in f


def test_good_answer_passes():
    out = qe.generate(SIG, client=_client({"zh": _sections(True), "en": _sections(False)}))
    assert out and len(out["zh"]) == 5 and out["as_of"] == "2026-11-20"


def test_invented_number_is_rejected():
    assert qe.generate(SIG, client=_client({"zh": _sections(True, "预计明年上涨 37%。"), "en": _sections(False)})) is None


def test_promise_is_rejected():
    assert qe.generate(SIG, client=_client({"zh": _sections(True, "买这些稳赚。"), "en": _sections(False)})) is None
    assert qe.generate(SIG, client=_client({"zh": _sections(True), "en": _sections(False, " We guarantee gains.")})) is None


def test_wrong_language_is_rejected():
    assert qe.generate(SIG, client=_client({"zh": _sections(False), "en": _sections(False)})) is None
