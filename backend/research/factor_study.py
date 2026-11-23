"""
Which stock-ranking rules ("factors") have actually worked in US stocks since 2000, on survivorship-free data?

Local research only (Sharadar, personal licence). Run from backend/:
    .venv/bin/python -m research.factor_study

Every month-end, each factor ranks the stocks in a universe using only what was public that day:
  prices up to that day, DAILY valuation for that day (computed by Sharadar from filed numbers only), and as-reported
  quarterly fundamentals whose filing date (datekey) is strictly before the month-end.
For each factor it measures, on the next month's returns:
  IC          rank correlation between the score and the next month's return (the cleanest "does it predict" number)
  top excess  equal-weight top fifth minus the universe average, after 10 bp per one-way trade, per year
  long-short  top fifth minus bottom fifth, per year (not tradeable for most individuals, shows the raw spread)
and the t-statistic of each monthly series. With ~16 factors tried, |t| needs to be well above 2 (about 3) before a
result is more than luck.

Then the honest test of the whole process, walk-forward: at the start of each year, using only earlier months, keep
the factors whose IC t-stat clears 2, combine them, and hold that combination for the next 12 months. Only those
next-12-month results count.

Universes:  liquid  price >= $5, 60-day average dollar volume >= $5M, market cap known
            large   the 1000 largest of those by market cap (roughly the Russell 1000: what an individual can trade
                    without moving prices)
"""
import json
import math
import os
import sys
import time

import numpy as np
import pandas as pd

from research.bias_study import holding_return
from research.sharadar_data import COMPACT, Panel
from services.factors import LOOKBACK, SKIP

START = 20000101
COST = 10 / 10_000
FRAC = 0.2
FUND_MAX_AGE_DAYS = 400           # a filing older than this is treated as missing

# name: (direction, family, description). direction +1: higher is better; -1: lower is better
FACTORS = {
    "earnings_yield": (+1, "value", "trailing-12-month net income / market cap"),
    "book_to_market": (+1, "value", "book equity / market cap"),
    "sales_yield":    (+1, "value", "trailing-12-month revenue / market cap"),
    "fcf_yield":      (+1, "value", "trailing-12-month free cash flow / market cap"),
    "ebitda_ev":      (+1, "value", "EBITDA / enterprise value"),
    "gross_profit":   (+1, "quality", "trailing-12-month gross profit / total assets"),
    "roe":            (+1, "quality", "trailing-12-month net income / book equity"),
    "accruals":       (-1, "quality", "(net income - operating cash flow) / assets"),
    "leverage":       (-1, "quality", "debt / assets"),
    "earnings_surprise": (+1, "growth", "latest quarter EPS minus a year earlier, scaled by its own history"),
    "asset_growth":   (-1, "growth", "total assets vs a year earlier"),
    "share_issuance": (-1, "growth", "weighted shares vs a year earlier"),
    "size":           (-1, "size", "market cap (smaller ranks higher)"),
    "momentum":       (+1, "price", "return from 12 to 1 month ago"),
    "low_vol":        (-1, "price", "volatility of daily returns over 12 months"),
    "reversal":       (-1, "price", "last month's return (losers rank higher)"),
}


# Candidates under test (research/improve_study.py); run(extra=True) adds them. Not used by the live desk until adopted.
EXTRA_FACTORS = {
    "high_52w":          (+1, "price", "price / highest price of the last 12 months"),
    "industry_mom":      (+1, "price", "the stock's industry: average 12-1 month return"),
    "resid_mom":         (+1, "price", "12-1 month return left after the market's share, per unit of its noise"),
    "insider_buyers":    (+1, "insider", "officers and directors who bought on the open market, last 6 months"),
    "insider_net_value": (+1, "insider", "insider buys minus sells, last 6 months, / market cap"),
    "inst_breadth":      (+1, "ownership", "change in the number of institutions holding it, last reported quarter"),
    "shareholder_yield": (+1, "value", "trailing-12-month dividends + net buybacks / market cap"),
    "earnings_stability": (+1, "quality", "steadiness of quarterly return on assets over 3 years"),
    "earnings_reaction": (+1, "growth", "stock minus market over the 3 days around the last earnings release"),
    "short_interest":    (-1, "short", "shares sold short / shares outstanding (FINRA, from 2018)"),
    "days_to_cover":     (-1, "short", "shares sold short / average daily volume (FINRA, from 2018)"),
}
ALL_FACTORS = {**FACTORS, **EXTRA_FACTORS}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ── fundamentals: one (months x tickers) matrix per metric, known strictly before each month-end ─────────────
def fundamental_matrices(month_dates, tickers):
    f = pd.read_csv(os.path.join(COMPACT, "fundamentals.csv.gz"))
    f = f[f.ticker.isin(set(tickers))].copy()
    f["datekey"] = pd.to_datetime(f.datekey)
    f["reportperiod"] = pd.to_datetime(f.reportperiod)
    f = f.sort_values(["ticker", "reportperiod", "datekey"]).drop_duplicates(["ticker", "reportperiod"], keep="first")
    g = f.groupby("ticker", sort=False)
    span3 = (f.reportperiod - g.reportperiod.shift(3)).dt.days            # 4 consecutive quarters span ~273 days
    ok4 = span3.between(250, 300)
    for c in ("revenue", "gp", "netinc", "ncfo", "fcf", "ncfdiv", "ncfcommon"):
        f[c + "_ttm"] = g[c].transform(lambda s: s.rolling(4, min_periods=4).sum()).where(ok4)
    lag = (f.reportperiod - g.reportperiod.shift(4)).dt.days.between(340, 390)   # same quarter a year earlier
    for c in ("assets", "shareswa", "eps"):
        f[c + "_y"] = g[c].shift(4).where(lag)
    f["eps_d"] = f.eps - f.eps_y
    f["eps_d_sd"] = f.groupby("ticker", sort=False).eps_d.transform(lambda s: s.shift(1).rolling(8, min_periods=4).std())
    with np.errstate(all="ignore"):
        eq = f.equity.where(f.equity > 0)
        ast = f.assets.where(f.assets > 0)
        f["m_gross_profit"] = f.gp_ttm / ast
        f["m_roe"] = f.netinc_ttm / eq
        f["m_accruals"] = (f.netinc_ttm - f.ncfo_ttm) / ast
        f["m_leverage"] = f.debt / ast
        f["m_earnings_surprise"] = (f.eps_d / f.eps_d_sd.where(f.eps_d_sd > 0)).clip(-10, 10)
        f["m_asset_growth"] = f.assets / f.assets_y.where(f.assets_y > 0) - 1
        f["m_share_issuance"] = f.shareswa / f.shareswa_y.where(f.shareswa_y > 0) - 1
        f["payout_ttm"] = -(f.ncfdiv_ttm.fillna(0) + f.ncfcommon_ttm.fillna(0)).where(f.ncfdiv_ttm.notna() | f.ncfcommon_ttm.notna())
        f["roa_q"] = f.netinc / ast
        f["m_stability"] = -f.groupby("ticker", sort=False).roa_q.transform(lambda x: x.rolling(12, min_periods=8).std())
    keep = ["netinc_ttm", "revenue_ttm", "fcf_ttm", "equity", "payout_ttm"] + [c for c in f.columns if c.startswith("m_")]
    right = f[["ticker", "datekey"] + keep].sort_values("datekey")

    grid = pd.DataFrame({
        "date": np.repeat(pd.to_datetime(month_dates.astype(str)), len(tickers)),
        "ticker": np.tile(tickers, len(month_dates)),
        "r": np.repeat(np.arange(len(month_dates)), len(tickers)),
        "c": np.tile(np.arange(len(tickers)), len(month_dates)),
    })
    m = pd.merge_asof(grid.sort_values("date"), right, left_on="date", right_on="datekey", by="ticker",
                      direction="backward", allow_exact_matches=False,      # filed ON the month-end: not yet usable
                      tolerance=pd.Timedelta(days=FUND_MAX_AGE_DAYS))
    out = {}
    for c in keep:
        a = np.full((len(month_dates), len(tickers)), np.nan, dtype=np.float32)
        a[m.r.values, m.c.values] = m[c].values.astype(np.float32)
        out[c] = a
    return out


# ── evaluation helpers ───────────────────────────────────────────────────────────────────────────────────────
def rank_pct(x):
    """0..1 ranks of the finite values (ties averaged), NaN stays NaN."""
    out = np.full(x.shape, np.nan)
    ok = np.isfinite(x)
    if ok.sum() > 1:
        out[ok] = pd.Series(x[ok]).rank(pct=True).values
    return out


def spearman(a, b):
    ok = np.isfinite(a) & np.isfinite(b)
    if ok.sum() < 30:
        return np.nan
    ra, rb = pd.Series(a[ok]).rank().values, pd.Series(b[ok]).rank().values
    return float(np.corrcoef(ra, rb)[0, 1])


def tstat(x):
    x = np.asarray(x, dtype=float)
    x = x[np.isfinite(x)]
    if len(x) < 12 or np.std(x, ddof=1) == 0:
        return None
    return round(float(np.mean(x) / (np.std(x, ddof=1) / math.sqrt(len(x)))), 2)


def annual(monthly):
    m = np.asarray(monthly, dtype=float)
    m = m[np.isfinite(m)]
    return round(float((np.prod(1 + m) ** (12 / len(m)) - 1) * 100), 2) if len(m) else None


class Book:
    """Top / bottom fifth of one score in one universe, month by month, with turnover cost on the top fifth."""

    def __init__(self):
        self.prev_top, self.prev_bot = set(), set()
        self.top, self.bot, self.all, self.ic, self.month = [], [], [], [], []

    def add(self, score, elig, later, month):
        idx = np.where(elig & np.isfinite(score))[0]
        if len(idx) < 50:
            return
        k = max(1, int(round(len(idx) * FRAC)))
        order = idx[np.argsort(score[idx], kind="stable")]
        top, bot = set(order[-k:].tolist()), set(order[:k].tolist())

        def cost(prev, now):
            return ((len(prev - now) / len(prev) if prev else 0) + len(now - prev) / len(now)) * COST
        self.top.append(float(np.mean(later[list(top)])) - cost(self.prev_top, top))
        self.bot.append(float(np.mean(later[list(bot)])) - cost(self.prev_bot, bot))
        self.all.append(float(np.mean(later[elig])))
        self.ic.append(spearman(score[idx], later[idx]))
        self.month.append(month)
        self.prev_top, self.prev_bot = top, bot

    def summary(self, since=None, until=None):
        mo = np.array(self.month)
        sel = np.ones(len(mo), bool)
        if since:
            sel &= mo >= since
        if until:
            sel &= mo < until
        if sel.sum() < 24:
            return None
        top, bot, al, ic = (np.array(x)[sel] for x in (self.top, self.bot, self.all, self.ic))
        ex = top - al
        return {"months": int(sel.sum()), "ic_mean": round(float(np.nanmean(ic)), 4), "ic_t": tstat(ic),
                "top_annual": annual(top), "universe_annual": annual(al),
                "top_excess_annual": round(annual(top) - annual(al), 2), "top_excess_t": tstat(ex),
                "long_short_annual": round(annual(top) - annual(bot), 2), "long_short_t": tstat(top - bot),
                "months_beating": round(float(np.mean(ex > 0)) * 100, 1)}


# ── main loop ────────────────────────────────────────────────────────────────────────────────────────────────
def run(return_latest=False, extra=False):
    t0 = time.time()
    P = Panel()
    raw = np.load(os.path.join(COMPACT, "prices.npz"))["closeunadj"]
    val = np.load(os.path.join(COMPACT, "valuation_monthly.npz"))
    ends = P.month_ends()
    assert np.array_equal(P.dates[ends], val["dates"]), "valuation month-ends do not line up with prices"
    log("building fundamentals by month (point in time)...")
    fm = fundamental_matrices(val["dates"], P.tickers)
    active = ALL_FACTORS if extra else FACTORS
    xm = {}
    if extra:
        from research.extra_signals import (earnings_reaction_matrix, insider_matrices, institution_matrices,
                                            short_interest_matrices)
        log("insider and institution signals...")
        xm.update(insider_matrices(val["dates"], P.tickers))
        xm.update(institution_matrices(val["dates"], P.tickers))
        log("earnings reactions...")
        xm["earnings_reaction"] = earnings_reaction_matrix(P, val["dates"])
        log("short interest...")
        xm.update(short_interest_matrices(val["dates"], P.tickers))
        ind = P.sec.industry.fillna("?").values
        _, ind_codes = np.unique(ind, return_inverse=True)
        with np.errstate(all="ignore"):
            mret = P.adj[ends[1:]] / P.adj[ends[:-1]] - 1.0
        mret = np.vstack([np.full((1, P.adj.shape[1]), np.nan, dtype=np.float32), mret])
        mret[~np.isfinite(mret)] = np.nan
        mret[np.abs(mret) > 5] = np.nan                       # obvious data errors only
        mkt = np.nanmean(mret, axis=1)
    log(f"ready in {time.time() - t0:.0f}s, running {len(ends) - 1} months")

    def resid_mom(k):
        """Blitz-style residual momentum from 36 monthly returns ending at month k."""
        if k < 36:
            return np.full(adj.shape[1], np.nan)
        X = mret[k - 35: k + 1].astype(float)
        M = np.where(np.isfinite(X), mkt[k - 35: k + 1, None], np.nan)
        mx, mm = np.nanmean(X, 0), np.nanmean(M, 0)
        cov = np.nanmean((X - mx) * (M - mm), 0)
        var = np.nanmean((M - mm) ** 2, 0)
        beta = cov / np.where(var > 0, var, np.nan)
        e = (X - mx) - beta * (M - mm)
        ok = np.isfinite(X).sum(0) >= 24
        out = np.nansum(e[-12:-1], 0) / np.nanstd(e, 0)
        return np.where(ok, out, np.nan)
    adj = P.adj
    with np.errstate(invalid="ignore", divide="ignore"):
        dret = adj[1:] / adj[:-1] - 1.0
    dret = np.vstack([np.full((1, adj.shape[1]), np.nan, dtype=np.float32), dret])
    dret[~np.isfinite(dret)] = np.nan

    def inputs(k, later):
        """Universe masks, signed factor scores and raw values at month-end k (later=None: the latest day,
        where the next month is not known yet)."""
        i = ends[k]
        mc = val["marketcap"][k] * 1e6                       # $
        with np.errstate(all="ignore"):
            liquid = (np.isfinite(adj[i]) & (raw[i] >= 5) & (P.avg_dollar_volume(i) >= 5e6) & (mc > 0))
            if later is not None:
                liquid &= np.isfinite(later)
            cut = np.sort(mc[liquid])[-1000] if liquid.sum() > 1000 else 0
            large = liquid & (mc >= cut)
            win = dret[i - LOOKBACK + 1: i + 1]
            enough = np.isfinite(win).sum(0) >= 200
            vol = np.full(adj.shape[1], np.nan, dtype=np.float32)
            vol[enough] = np.nanstd(win[:, enough], axis=0, ddof=1)
            ev = val["evebitda"][k]
            raw_f = {
                "earnings_yield": fm["netinc_ttm"][k] / mc,
                "book_to_market": fm["equity"][k] / mc,
                "sales_yield": fm["revenue_ttm"][k] / mc,
                "fcf_yield": fm["fcf_ttm"][k] / mc,
                "ebitda_ev": np.where(ev > 0, 1.0 / ev, np.nan),
                "gross_profit": fm["m_gross_profit"][k], "roe": fm["m_roe"][k], "accruals": fm["m_accruals"][k],
                "leverage": fm["m_leverage"][k], "earnings_surprise": fm["m_earnings_surprise"][k],
                "asset_growth": fm["m_asset_growth"][k], "share_issuance": fm["m_share_issuance"][k],
                "size": np.log(np.where(mc > 0, mc, np.nan)),
                "momentum": adj[i - SKIP] / adj[i - LOOKBACK] - 1.0,
                "low_vol": vol,
                "reversal": adj[i] / adj[i - SKIP] - 1.0,
            }
        if extra:
            with np.errstate(all="ignore"):
                mom = raw_f["momentum"]
                im = np.full(len(mom), np.nan)
                ok = liquid & np.isfinite(mom)
                sums = np.bincount(ind_codes[ok], weights=mom[ok], minlength=ind_codes.max() + 1)
                cnts = np.bincount(ind_codes[ok], minlength=ind_codes.max() + 1)
                avg = np.where(cnts >= 3, sums / np.maximum(cnts, 1), np.nan)
                im = avg[ind_codes]
                raw_f.update({
                    "high_52w": adj[i] / np.nanmax(adj[i - LOOKBACK + 1: i + 1], axis=0),
                    "industry_mom": im,
                    "resid_mom": resid_mom(k),
                    "insider_buyers": xm["insider_buyers"][k],
                    "insider_net_value": xm["insider_net_value"][k] / mc,
                    "inst_breadth": xm["inst_breadth"][k],
                    "shareholder_yield": fm["payout_ttm"][k] / mc,
                    "earnings_stability": fm["m_stability"][k],
                    "earnings_reaction": xm["earnings_reaction"][k],
                    "short_interest": xm["short_qty"][k] / (mc / raw[i]),      # shares out = market cap / price
                    "days_to_cover": xm["days_to_cover"][k],
                })
        signed = {}
        for f, (d, _, _) in active.items():
            s = np.asarray(raw_f[f], dtype=float) * d
            s[~np.isfinite(s)] = np.nan
            signed[f] = s
        return liquid, large, signed, raw_f, mc

    books = {(u, f): Book() for u in ("liquid", "large") for f in active}
    month_scores = []          # (month, universe masks, {factor: signed score}, later) kept for the walk-forward
    for k in range(len(ends) - 1):
        i, j = ends[k], ends[k + 1]
        if P.dates[j] < START or i < LOOKBACK + 5:
            continue
        with np.errstate(all="ignore"):
            later = holding_return(adj, i, j)
        liquid, large, signed, _, _ = inputs(k, later)
        for f in active:
            books[("liquid", f)].add(signed[f], liquid, later, int(P.dates[j]))
            books[("large", f)].add(signed[f], large, later, int(P.dates[j]))
        month_scores.append((int(P.dates[j]), liquid, large, signed, later))
    log(f"factor pass done in {time.time() - t0:.0f}s")
    if return_latest:
        k = len(ends) - 1
        liquid, large, signed, raw_f, mc = inputs(k, None)
        latest = {"date": int(P.dates[ends[k]]), "large": large, "signed": signed, "raw": raw_f, "mc": mc,
                  "panel": P, "adj": adj, "ends": ends}
        return books, month_scores, time.time() - t0, latest
    return books, month_scores, time.time() - t0


def by_year(book):
    """Calendar-year return of the top fifth and of the universe, and the difference (percentage points)."""
    out = {}
    mo = np.array(book.month)
    for y in sorted(set(mo // 10000)):
        sel = (mo // 10000) == y
        top = float(np.prod(1 + np.array(book.top)[sel]) - 1) * 100
        al = float(np.prod(1 + np.array(book.all)[sel]) - 1) * 100
        out[int(y)] = {"top": round(top, 1), "universe": round(al, 1), "excess": round(top - al, 1)}
    return out


def max_drawdown(monthly):
    curve = np.cumprod(1 + np.asarray(monthly, dtype=float))
    peak = np.maximum.accumulate(np.concatenate([[1.0], curve]))[1:]
    return round(float(np.min(curve / peak - 1)) * 100, 1)


def walk_forward(books, month_scores, universe, first_year=2005, threshold=2.0):
    """Each January, keep factors whose IC t-stat on all earlier months clears `threshold`; score = mean of their
    percentile ranks; hold for 12 months. Also the same combination of ALL factors (no selection) as a check."""
    wf, eq = Book(), Book()
    chosen_by_year = {}
    for month, liquid, large, signed, later in month_scores:
        y = month // 10000
        if y < first_year:
            continue
        if y not in chosen_by_year:
            pick = []
            for f in sorted({f for (_, f) in books}, key=list(ALL_FACTORS).index):
                b = books[(universe, f)]
                ics = [ic for ic, m in zip(b.ic, b.month) if m < y * 10000]
                t = tstat(ics)
                if t is not None and t >= threshold:
                    pick.append(f)
            chosen_by_year[y] = pick
        elig = liquid if universe == "liquid" else large
        names = chosen_by_year[y]
        if names:
            ranks = np.nanmean(np.vstack([rank_pct(np.where(elig, signed[f], np.nan)) for f in names]), axis=0)
            wf.add(ranks, elig, later, month)
        allr = np.nanmean(np.vstack([rank_pct(np.where(elig, signed[f], np.nan)) for f in signed]), axis=0)
        eq.add(allr, elig, later, month)
    return wf, eq, chosen_by_year


def main():
    import warnings
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    books, month_scores, secs = run()
    report = {"factors": {}, "walk_forward": {}}
    for u in ("liquid", "large"):
        print(f"\n== {u} universe, 2000-2026 (per year after costs; t = t-statistic) ==")
        print(f"{'factor':18} {'family':8} {'IC':>7} {'IC t':>6} {'top ex':>7} {'t':>6} {'L-S':>7} {'t':>6} "
              f"{'IC 00-12':>8} {'IC 13-26':>8}")
        rows = []
        for f, (_, fam, desc) in FACTORS.items():
            b = books[(u, f)]
            s, a, z = b.summary(), b.summary(until=20130101), b.summary(since=20130101)
            if not s:
                continue
            report["factors"][f"{u}|{f}"] = {"family": fam, "description": desc, "all": s, "2000_2012": a, "2013_2026": z}
            rows.append((s["ic_t"] or 0, f, fam, s, a, z))
        for _, f, fam, s, a, z in sorted(rows, reverse=True):
            print(f"{f:18} {fam:8} {s['ic_mean']:7.3f} {s['ic_t']:6.2f} {s['top_excess_annual']:7.1f} "
                  f"{s['top_excess_t']:6.2f} {s['long_short_annual']:7.1f} {s['long_short_t']:6.2f} "
                  f"{(a or {}).get('ic_mean', float('nan')):8.3f} {(z or {}).get('ic_mean', float('nan')):8.3f}")
        wf, eq, chosen = walk_forward(books, month_scores, u)
        ws, es = wf.summary(), eq.summary()
        report["walk_forward"][u] = {"selected": ws, "all_factors_equal": es,
                                     "chosen_by_year": {str(k): v for k, v in chosen.items()}}
        print(f"\nwalk-forward {u} 2005-2026 (factors chosen each January from earlier data only):")
        for name, s in (("selected (IC t>=2)", ws), ("all 16, equal", es)):
            if s:
                print(f"  {name:20} top {s['top_annual']:5.1f}%/yr vs universe {s['universe_annual']:5.1f}%  "
                      f"excess {s['top_excess_annual']:+5.1f} (t {s['top_excess_t']}), IC {s['ic_mean']:.3f} "
                      f"(t {s['ic_t']}), beats universe {s['months_beating']}% of months")
        last = max(chosen)
        print(f"  chosen for {last}: {', '.join(chosen[last]) or 'none'}")
        years = by_year(wf)
        report["walk_forward"][u]["by_year"] = years
        dd = max_drawdown(wf.top)
        report["walk_forward"][u]["selected"]["top_max_drawdown"] = dd
        lost = [y for y, v in years.items() if v["excess"] < 0]
        print(f"  max drawdown of the top fifth: {dd}%; years behind the universe: {len(lost)} of {len(years)}")
        print("  " + "  ".join(f"{y}:{v['excess']:+.1f}" for y, v in years.items()))
    path = os.path.join(COMPACT, "..", "reports")
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, "factor_study.json"), "w") as fh:
        json.dump(report, fh, indent=1)
    print(f"\ntotal {secs:.0f}s; report saved to data/sharadar/reports/factor_study.json")


if __name__ == "__main__":
    sys.exit(main())
