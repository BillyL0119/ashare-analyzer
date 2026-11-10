"""
Backtest the Monte Carlo price ranges (services/monte_carlo.py): how often did the real price end up
inside the bands the model drew?

    python3 tools/backtest_monte_carlo.py fetch /tmp/mc_hist.json     # run where the price feeds answer (server)
    python3 tools/backtest_monte_carlo.py fetch /tmp/part.json F,hk00005,600519    # only these symbols
    python3 tools/backtest_monte_carlo.py eval  /tmp/mc_hist.json     # anywhere; prints the BACKTEST dict
    python3 tools/backtest_monte_carlo.py eval  /tmp/mc_hist.json --compare    # also scores the old model

Data: about 20 years of daily total-return prices for 111 series, from the same sources the site uses:
  US, 46 stocks and index funds: Tencent's forward-adjusted K-line (adjusted by ratio). Where that
    series is broken (a price at or below zero: Ford), the unadjusted rows and their notes instead.
  Hong Kong, 20: Tencent's unadjusted K-line, adjusted with services/total_return.py (the
    forward-adjusted Hong Kong series subtracts dividends and distorts old returns).
  A-shares, 40 stocks and 5 indices: Sina, back-adjusted by ratio.
The stocks are today's large companies, so their returns flatter the drift (survivorship); the index
funds do not have that problem. Volatility, which sets the width of the bands, is much less affected.

Method: a start date every 21 trading days; the model sees only the 756 trading days before it, like
production; outcomes 5, 21, 63, 126 and 252 trading days later. For each, the share of outcomes inside
the P25–P75, P10–P90 and P5–P95 bands (ideal 50%, 80%, 90%), the average pinball loss over the seven
percentiles (a proper score: lower is better) and the Brier score of the predicted chance of a gain.
`--compare` scores the model used before November 2026 (one volatility from 3 years, normal shocks,
drift toward 8% US / 6% elsewhere) on the same dates.
"""
import json
import os
import sys
import time
from math import erf
from multiprocessing import Pool
from typing import Optional

import numpy as np

sys.path.insert(0, __file__.rsplit("/tools/", 1)[0])
from services import monte_carlo as mc  # noqa: E402
from services import total_return as tr  # noqa: E402

W, STEP, HORIZONS, NPATH = 756, 21, [5, 21, 63, 126, 252], 1000
TAUS = np.array(mc.PERCENTILES) / 100
Z = np.array([-1.6448536, -1.2815516, -0.6744898, 0.0, 0.6744898, 1.2815516, 1.6448536])
OLD_PRIOR = {"us": 0.08, "cn": 0.06, "hk": 0.06}

US = ["SPY", "QQQ", "DIA", "IWM", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "TSLA", "JPM", "BAC", "WFC",
      "XOM", "CVX", "JNJ", "PFE", "MRK", "KO", "PEP", "WMT", "COST", "HD", "MCD", "DIS", "NFLX", "INTC", "AMD",
      "CSCO", "ORCL", "IBM", "BA", "CAT", "GE", "NKE", "V", "MA", "UNH", "PG", "T", "VZ", "F", "SBUX", "ADBE", "CRM"]
HK = ["00700", "00005", "00939", "01299", "00941", "02318", "00388", "01398", "00883", "00016", "00001",
      "00027", "01211", "02800", "00011", "00002", "00003", "00066", "00857", "02628"]
CN = ["600519", "000858", "601318", "600036", "000001", "600030", "601166", "000333", "000651", "600276",
      "601012", "300750", "002594", "600900", "601398", "601288", "601857", "600028", "000002", "600585",
      "600309", "002415", "000725", "600887", "601888", "603259", "300059", "002475", "600031", "601899",
      "000063", "600050", "600104", "601668", "600048", "000568", "600809", "002304", "300015", "688981"]
CN_INDEX = ["sh000300", "sh000001", "sz399001", "sz399006", "sh000905"]
SPANS = [("2003-01-01", "2010-12-31"), ("2011-01-01", "2018-12-31"), ("2019-01-01", "2030-12-31")]


# ── Data ──────────────────────────────────────────────────────────────────────

def _get(url: str, param: str) -> dict:
    import requests
    for attempt in range(3):
        try:
            r = requests.get(url, params={"param": param}, timeout=20).json()
            return next(iter((r.get("data") or {}).values()), {}) or {}
        except Exception:
            time.sleep(1 + attempt)
    return {}


def _tencent_adjusted(code: str) -> dict:
    """Forward-adjusted daily OHLC. A request returns at most the ~600 rows before its end date."""
    rows = {}
    for y in range(2004, 2030, 2):
        node = _get("https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get", f"{code},day,{y}-01-01,{y + 1}-12-31,600,qfq")
        for x in node.get("qfqday") or node.get("day") or []:
            rows[x[0]] = {"date": x[0], "open": float(x[1]), "high": float(x[3]), "low": float(x[4]), "close": float(x[2])}
        time.sleep(0.25)
    return rows


def _tencent_unadjusted(code: str) -> list:
    """Unadjusted daily rows with their dividend and split notes, as total_return.adjust() takes them."""
    rows = {}
    for a, b in SPANS:
        for x in _get(tr.RAW_URL, f"{code},day,{a},{b},2000").get("day") or []:
            notes = x[6] if len(x) > 6 and isinstance(x[6], dict) else {}
            rows[x[0]] = [x[0], float(x[1]), float(x[2]), float(x[3]), float(x[4]),
                          {k: v for k, v in notes.items() if v and k in ("FHcontent", "hgcgContent", "ggContent")}]
        time.sleep(0.25)
    return [rows[d] for d in sorted(rows)]


def _series(market: str, candles: list) -> dict:
    return {"market": market, "dates": [c["date"] for c in candles],
            **{k: [c[k] for c in candles] for k in ("open", "high", "low", "close")}}


def fetch(path: str, only: Optional[set] = None) -> None:
    """Download every series (or just the symbols in `only`) into `path`, saving after each one; a rerun
    continues where it stopped."""
    import requests
    import akshare as ak

    # akshare passes no timeout, and requests then blocks for ever on a feed that stops answering
    # (a socket default timeout does not apply: requests sets the socket's timeout to None itself)
    send = requests.adapters.HTTPAdapter.send

    def send_with_timeout(self, request, **kw):
        if kw.get("timeout") is None:
            kw["timeout"] = 25
        return send(self, request, **kw)
    requests.adapters.HTTPAdapter.send = send_with_timeout

    try:
        out = json.load(open(path))
    except Exception:
        out = {}

    def save(sym, series):
        if series and len(series["dates"]) > 800:
            out[sym] = series
            json.dump(out, open(path + ".tmp", "w"))
            os.replace(path + ".tmp", path)
            print(sym, len(series["dates"]), series["dates"][0], series["dates"][-1], flush=True)
        else:
            print(sym, "skipped (too short or failed)", flush=True)

    suffix = {"SPY": ".AM", "QQQ": ".OQ", "DIA": ".AM", "IWM": ".AM"}
    wanted = lambda s: only is None or s in only  # noqa: E731
    for sym in US:
        if sym in out or not wanted(sym):
            continue
        for suf in ([suffix[sym]] if sym in suffix else [".OQ", ".N", ".AM"]):
            rows = _tencent_adjusted(f"us{sym}{suf}")
            if len(rows) > 500:
                candles = [rows[d] for d in sorted(rows)]
                if min(c["close"] for c in candles) <= 0:          # a broken adjusted series
                    candles = tr.adjust(_tencent_unadjusted(f"us{sym}{suf}"), "us")
                save(sym, _series("us", candles))
                break
    for code in HK:
        if "hk" + code not in out and wanted("hk" + code):
            save("hk" + code, _series("hk", tr.adjust(_tencent_unadjusted(f"hk{code}"), "hk")))

    def frame(df):
        df = df[df["date"].astype(str) >= "2004-01-01"]
        return {"market": "cn", "dates": [str(d)[:10] for d in df["date"]],
                **{k: [float(x) for x in df[k]] for k in ("open", "high", "low", "close")}}

    for code in CN + CN_INDEX:
        if code in out or not wanted(code):
            continue
        series = None
        for attempt in range(3):
            try:
                if code in CN_INDEX:
                    series = frame(ak.stock_zh_index_daily(symbol=code))
                else:
                    sym = ("sh" if code.startswith(("6", "9")) else "sz") + code
                    series = frame(ak.stock_zh_a_daily(symbol=sym, start_date="20040101", end_date="20991231", adjust="hfq"))
                break
            except Exception as e:
                print("  retry", code, type(e).__name__, flush=True)
                time.sleep(3 + 3 * attempt)
        save(code, series)
        time.sleep(1.5)
    print("saved", len(out), "series to", path)


# ── Scoring ───────────────────────────────────────────────────────────────────

def _score(qs, y, p_up):
    inside = lambda lo, hi: float(qs[lo] <= y <= qs[hi])  # noqa: E731
    pin = np.mean([max(t * (y - q), (t - 1) * (y - q)) for t, q in zip(TAUS, qs)])
    return [inside(2, 4), inside(1, 5), inside(0, 6), pin, (p_up - float(y > 0)) ** 2]


def _old_model(r, market):
    """The model before November 2026: one volatility from 3 years, normal shocks, drift toward 8% / 6%."""
    var = r.var()
    mu = mc.HIST_WEIGHT * float(r.mean()) + (1 - mc.HIST_WEIGHT) * (OLD_PRIOR.get(market, 0.06) / 252 - var / 2)
    out = {}
    for h in HORIZONS:
        sd = np.sqrt(var * h)
        out[h] = (mu * h + Z * sd, 0.5 * (1 + erf(mu * h / sd / np.sqrt(2))) if sd > 0 else 0.5)
    return out


def _run_series(args):
    sym, d, compare = args
    hmax = max(HORIZONS)
    r = mc.log_returns(d["close"])
    code = sym if sym.isdigit() else ""
    rows = []
    for o in range(W, len(r) - hmax, STEP):
        win = r[o - W:o]
        fut = np.cumsum(r[o:o + hmax])
        sim = mc.simulate(win, hmax, NPATH, d["market"], code, seed=o)
        models = {"new": {h: (sim["pct"][h - 1], float(sim["up"][h - 1])) for h in HORIZONS}}
        if compare:
            models["old"] = _old_model(win, d["market"])
        for name, fc in models.items():
            for h in HORIZONS:
                rows.append((name, h, _score(fc[h][0], fut[h - 1], fc[h][1])))
    # years covered: the first and last start dates (returns are one shorter than the cleaned closes)
    dates = d["dates"]
    span = (str(dates[min(W + 1, len(dates) - 1)])[:4], str(dates[max(0, len(dates) - hmax - 1)])[:4])
    return sym, d["market"], rows, span


def evaluate(path: str, compare: bool) -> None:
    data = json.load(open(path))
    jobs = [(sym, d, compare) for sym, d in data.items()]
    with Pool(max(1, (os.cpu_count() or 2) - 1)) as pool:
        results = pool.map(_run_series, jobs, chunksize=1)
    acc, spans, count = {}, {}, {}
    for sym, market, rows, span in results:
        if not rows:
            continue
        count[market] = count.get(market, 0) + 1
        for scope in ("all", market):
            lo, hi = spans.get(scope, ("9999", "0000"))
            spans[scope] = (min(lo, span[0]), max(hi, span[1]))
        for name, h, sc in rows:
            for key in (name, f"{name}:{market}"):
                acc.setdefault(key, {}).setdefault(h, []).append(sc)

    print(f"\n{'model':10s} {'h':>4s} {'P25-P75':>8s} {'P10-P90':>8s} {'P5-P95':>7s} {'pinball':>8s} {'brier':>6s}      n")
    for key in sorted(acc):
        for h in HORIZONS:
            c50, c80, c90, pin, br = np.array(acc[key][h]).mean(axis=0)
            print(f"{key:10s} {h:4d} {c50 * 100:8.1f} {c80 * 100:8.1f} {c90 * 100:7.1f} {pin * 100:8.3f} {br:6.3f} {len(acc[key][h]):6d}")
        print()

    result = {}
    for scope in ["all"] + sorted(count):
        key = "new" if scope == "all" else f"new:{scope}"
        result[scope] = {"stocks": sum(count.values()) if scope == "all" else count[scope],
                         "years": f"{spans[scope][0]}–{spans[scope][1]}",
                         "h": {str(h): {"cov50": round(float(np.mean([x[0] for x in acc[key][h]])) * 100),
                                        "cov80": round(float(np.mean([x[1] for x in acc[key][h]])) * 100),
                                        "cov90": round(float(np.mean([x[2] for x in acc[key][h]])) * 100),
                                        "n": len(acc[key][h])} for h in HORIZONS}}
    print("BACKTEST =", json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("fetch", "eval"):
        sys.exit(__doc__)
    if sys.argv[1] == "fetch":
        fetch(sys.argv[2], set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None)
    else:
        evaluate(sys.argv[2], "--compare" in sys.argv)
