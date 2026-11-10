"""services/total_return.py: reading Tencent's dividend, split and rights notes and adjusting unadjusted
prices by ratio. The note texts are real ones from the feed. No network."""
import math

import pytest

from services import total_return as tr


@pytest.mark.parametrize("text, market, expected", [
    ("每股分配0.485美元", "us", 0.485),
    ("末期息1.2港元", "hk", 1.2),
    ("末期息0.07港元;", "hk", 0.07),
    ("中期息0.62港元;中期特别息0.09港元;", "hk", 0.71),
    ("末期息0.25港元,特别股息0.10港元", "hk", 0.35),
    ("末期息1.404港元;相当于1.238人民币;", "hk", 1.404),                    # the restated amount is not added
    ("末期息0.389人民币;相当于0.4219867港元;", "hk", 0.4219867),              # the stated Hong Kong dollar amount wins
    ("第一季度息0.1美元;相当于0.780688港元;第一季度特别息0.21美元;相当于1.639445港元;", "hk", 0.780688 + 1.639445),
    ("第二次股息0.1美元;相当于0.779073港元;相当于0.075817英镑;", "hk", 0.779073),
    ("中期息0.08美元", "hk", 0.08 * 7.8),                                   # no equivalent stated: the peg
    ("末期息美元0.1元,可以股代息", "hk", 0.78),
    ("末期股息每10股人民币1.65元", "hk", 0.165 * 1.15),                       # per 10 shares
    ("中期息港币1.417元", "hk", 1.417),
    ("末期息$1.58", "hk", 1.58),
    ("实物分派:每1股长江和记实业有限公司股份分派1股长江实业地产有限公司股份", "hk", 0.0),
    ("", "us", 0.0),
])
def test_dividend_notes(text, market, expected):
    assert tr.dividend(text, market) == pytest.approx(expected, rel=1e-6)


def test_split_notes():
    assert tr.split_ratio("每1股拆分成10股") == 10
    assert tr.split_ratio("每8股合成1股") == pytest.approx(0.125)
    assert tr.split_ratio("每10股送1股") == pytest.approx(1.1)
    assert tr.split_ratio("") is None and tr.split_ratio(None) is None


def row(date, close, notes=None, open_=None):
    o = open_ if open_ is not None else close
    return [date, o, close, max(o, close), min(o, close), notes or {}]


def returns(candles):
    return [math.log(b["close"] / a["close"]) for a, b in zip(candles, candles[1:])]


def test_dividend_day_is_not_a_loss():
    rows = [row("d1", 100.0), row("d2", 97.0, {"FHcontent": "末期息3港元"}), row("d3", 97.0)]
    out = tr.adjust(rows, "hk")
    assert out[-1]["close"] == 97.0                       # the latest prices are unchanged
    assert returns(out)[0] == pytest.approx(0.0, abs=1e-12)
    assert out[0]["close"] == pytest.approx(97.0)


def test_marked_split_and_unmarked_whole_number_split():
    marked = tr.adjust([row("d1", 500.0), row("d2", 126.0, {"hgcgContent": "每1股拆分成4股"}, open_=125.5), row("d3", 127.0)], "us")
    assert returns(marked)[0] == pytest.approx(math.log(126 * 4 / 500))
    unmarked = tr.adjust([row("d1", 645.57), row("d2", 93.70, open_=92.70), row("d3", 94.0)], "us")   # Apple, June 2014
    assert returns(unmarked)[0] == pytest.approx(math.log(93.70 * 7 / 645.57))


def test_big_fall_without_a_note_is_real():
    out = tr.adjust([row("d1", 100.0), row("d2", 64.0, open_=70.0), row("d3", 63.0)], "hk")
    assert returns(out)[0] == pytest.approx(math.log(0.64))


def test_rights_issue():
    rows = [row("d1", 38.45), row("d2", 36.2, {"ggContent": "供股 12股供5股,每股28.000元"}), row("d3", 38.25)]
    terp = (12 * 38.45 + 5 * 28) / 17
    assert returns(tr.adjust(rows, "hk"))[0] == pytest.approx(math.log(36.2 / terp))


def test_spin_off_paid_in_shares_gets_a_zero_return():
    rows = [row("d1", 165.1), row("d2", 118.2, {"FHcontent": "实物分派:每1股长江和记实业有限公司股份分派1股长江实业地产有限公司股份"}), row("d3", 121.0)]
    r = returns(tr.adjust(rows, "hk"))
    assert r[0] == pytest.approx(0.0, abs=1e-12) and r[1] == pytest.approx(math.log(121.0 / 118.2))


def test_wrong_dividend_amount_is_not_believed():
    # a note worth 39% of the price on a day the price fell 4%: the amount is wrong, the day keeps its real return
    rows = [row("d1", 4.80), row("d2", 4.62, {"FHcontent": "末期息1.65人民币"}), row("d3", 4.81)]
    assert returns(tr.adjust(rows, "hk"))[0] == pytest.approx(math.log(4.62 / 4.80))


def test_one_day_bad_price_is_dropped():
    rows = [row("d1", 41.56), row("d2", 28.5, open_=28.19), row("d3", 41.39), row("d4", 40.89)]
    out = tr.adjust(rows, "us")
    assert [c["date"] for c in out] == ["d1", "d3", "d4"]
    assert returns(out)[0] == pytest.approx(math.log(41.39 / 41.56))
