import numpy as np

from services import factors as fx


def _bars(prices, start=(2015, 1, 1)):
    import datetime as dt
    d = dt.date(*start)
    out = []
    for p in prices:
        while d.weekday() >= 5:
            d += dt.timedelta(days=1)
        out.append({"date": d.isoformat(), "close": float(p)})
        d += dt.timedelta(days=1)
    return out


def _world(n_days=1800, n_stocks=60, seed=1, drift_persists=True):
    """SPY plus stocks whose daily drift is fixed per stock (so past winners keep winning) with noise."""
    rng = np.random.default_rng(seed)
    drifts = rng.normal(0.0004, 0.0006, n_stocks) if drift_persists else np.zeros(n_stocks)
    hist = {"SPY": _bars(100 * np.cumprod(1 + rng.normal(0.0004, 0.01, n_days)))}
    for k in range(n_stocks):
        hist[f"S{k:02d}"] = _bars(50 * np.cumprod(1 + drifts[k] + rng.normal(0, 0.015, n_days)))
    return hist, drifts


def test_matrix_and_month_ends():
    hist, _ = _world(400, 5)
    dates, syms, closes = fx.build_matrix(hist)
    assert syms[0] == "SPY" and closes.shape == (400, 6)
    ends = fx.month_ends(dates)
    assert ends[-1] == 399 and all(dates[i][:7] != dates[i + 1][:7] for i in ends[:-1])


def test_short_histories_are_left_out():
    hist, _ = _world(400, 3)
    hist["NEW"] = hist["S00"][:100]
    _, syms, _ = fx.build_matrix(hist)
    assert "NEW" not in syms


def test_signal_never_looks_ahead():
    hist, _ = _world(600, 10)
    dates, syms, closes = fx.build_matrix(hist)
    i = 400
    before = {f: fx.signal(closes, i, f) for f in fx.FACTORS}
    changed = closes.copy()
    changed[i + 1:] *= 3.0                      # the future changes completely
    for f in fx.FACTORS:
        a, b = before[f], fx.signal(changed, i, f)
        assert np.array_equal(a, b, equal_nan=True)


def test_momentum_skips_the_latest_month():
    hist, _ = _world(600, 4)
    dates, syms, closes = fx.build_matrix(hist)
    i = 500
    s = fx.signal(closes, i, "momentum")
    assert np.allclose(s, closes[i - fx.SKIP] / closes[i - fx.LOOKBACK] - 1)
    bumped = closes.copy()
    bumped[i] *= 5                               # a jump in the last month leaves the signal alone
    assert np.allclose(fx.signal(bumped, i, "momentum"), s)


def test_low_vol_prefers_the_calm_stock():
    rng = np.random.default_rng(3)
    calm = 100 * np.cumprod(1 + rng.normal(0.0003, 0.005, 400))
    wild = 100 * np.cumprod(1 + rng.normal(0.0003, 0.03, 400))
    dates, syms, closes = fx.build_matrix({"SPY": _bars(calm), "CALM": _bars(calm), "WILD": _bars(wild)})
    s = fx.signal(closes, 399, "low_vol")
    assert s[syms.index("CALM")] > s[syms.index("WILD")]


def test_backtest_finds_a_persistent_edge_and_prices_the_trades():
    hist, drifts = _world(2400, 80, seed=7)
    dates, syms, closes = fx.build_matrix(hist)
    free = fx.backtest(dates, syms, closes, "momentum", cost_bps=0)
    costly = fx.backtest(dates, syms, closes, "momentum", cost_bps=50)
    assert free["months"] > 60 and free["avg_names_held"] == 16
    assert free["stats"]["top"]["cagr"] > free["stats"]["bottom"]["cagr"]
    assert free["stats"]["top"]["cagr"] > free["stats"]["all"]["cagr"]
    assert costly["stats"]["top"]["cagr"] < free["stats"]["top"]["cagr"]
    assert 0 < free["stats"]["top"]["turnover"] < 100
    assert len(free["dates"]) == len(free["curves"]["top"]) == free["months"]
    assert set(free["halves"]) == {"first", "second"} and free["luck"]["t_stat"] is not None


def test_backtest_without_an_edge_is_not_significant():
    hist, _ = _world(2400, 80, seed=11, drift_persists=False)
    dates, syms, closes = fx.build_matrix(hist)
    r = fx.backtest(dates, syms, closes, "momentum", cost_bps=10)
    assert abs(r["luck"]["t_stat"]) < 3            # noise only: nothing to see


def test_backtest_needs_history_and_known_factor():
    hist, _ = _world(300, 40)
    dates, syms, closes = fx.build_matrix(hist)
    assert fx.backtest(dates, syms, closes, "low_vol")["error"]
    import pytest
    with pytest.raises(ValueError):
        fx.backtest(dates, syms, closes, "astrology")


def test_rank_today_blends_percentiles_and_needs_every_factor():
    hist, _ = _world(600, 30, seed=5)
    dates, syms, closes = fx.build_matrix(hist)
    value = {"S00": 0.08, "S01": 0.02, "S02": 0.05}          # only three stocks have a P/E
    only_mom = fx.rank_today(dates, syms, closes, {"momentum": 1}, {}, limit=10)
    assert len(only_mom) == 10 and only_mom[0]["score"] >= only_mom[-1]["score"] and only_mom[0]["rank"] == 1
    both = fx.rank_today(dates, syms, closes, {"momentum": 1, "value": 1}, {"value": value}, limit=10)
    assert {r["symbol"] for r in both} <= set(value) and len(both) == 3
    assert fx.rank_today(dates, syms, closes, {"momentum": 0}, {}) == []
    assert np.isnan(fx.percentile_rank(np.array([1.0, np.nan]))[1])


def test_dividends_are_reinvested_from_the_ex_date():
    hist = {"SPY": _bars([100.0] * 300), "D": _bars([50.0] * 300)}
    ex = hist["D"][100]["date"]
    dates, syms, closes = fx.build_matrix(hist, dividends={"D": [{"ex_date": ex, "amount": 1.0}]})
    col = closes[:, syms.index("D")]
    assert col[99] == 50.0 and abs(col[100] - 51.0) < 1e-9 and abs(col[-1] - 51.0) < 1e-9
    assert closes[0, 0] == closes[-1, 0] == 100.0          # no dividends listed: unchanged
    # an ex-date on a weekend counts from the next trading day
    sat = "2015-01-03"
    _, syms2, c2 = fx.build_matrix(hist, dividends={"D": [{"ex_date": sat, "amount": 0.5}]})
    d = syms2.index("D")                                   # bars: Thu 1, Fri 2, Mon 5 January
    assert c2[1, d] == 50.0 and abs(c2[2, d] - 50.5) < 1e-9


def test_membership_spans():
    spans = [["2016-01-04", "2018-06-01"], ["2020-03-02", None]]
    assert fx.is_member(spans, "2016-01-04") and fx.is_member(spans, "2018-05-31")
    assert not fx.is_member(spans, "2018-06-01") and not fx.is_member(spans, "2019-01-01")
    assert fx.is_member(spans, "2026-11-20") and not fx.is_member([], "2020-01-01")


def test_backtest_only_picks_members_of_the_day():
    hist, _ = _world(2400, 80, seed=7)
    dates, syms, closes = fx.build_matrix(hist)
    half = dates[1200]
    stocks = [s for s in syms if s != "SPY"]
    # the first 40 stocks are members throughout, the rest join half-way, one more is a member nobody has prices for
    members = {s: [[dates[0], None]] if k < 40 else [[half, None]] for k, s in enumerate(stocks)}
    members["GONE"] = [[dates[0], None]]
    r = fx.backtest(dates, syms, closes, "momentum", members=members)
    full = fx.backtest(dates, syms, closes, "momentum")
    assert r["avg_universe"] < full["avg_universe"]
    assert 90 < r["members_priced"] < 100 and r["avg_members"] > 40
    assert full["members_priced"] is None
