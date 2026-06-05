"""
Strategy backtesting API — /api/stock/backtest/{symbol}

Query params:
  strategy : ma | rsi | macd | boll
  period   : 1y | 2y | 3y | 5y

Returns equity curve, trades list, and key metrics.
A-share: T+1 rule applied; fees buy 0.03% sell 0.13%.
US stock: no T+1; fees 0.1% each side.
Cache: 1 hour per (symbol, strategy, period).
"""

from fastapi import APIRouter, HTTPException, Query
import numpy as np
import time
import logging

router = APIRouter()
logger = logging.getLogger("backtest")

_cache: dict = {}
_CACHE_TTL = 3600


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_cn(symbol: str) -> bool:
    return symbol.isdigit()


def _to_sina(symbol: str) -> str:
    return ("sh" if symbol.startswith(("6", "5")) else "sz") + symbol


def _ema(data: list, span: int) -> list:
    k = 2 / (span + 1)
    out = [data[0]]
    for x in data[1:]:
        out.append(x * k + out[-1] * (1 - k))
    return out


def _rsi_at(arr: np.ndarray, idx: int, period: int = 14) -> float:
    if idx < period:
        return 50.0
    delta = np.diff(arr[idx - period: idx + 1])
    ag = np.where(delta > 0, delta, 0.0).mean()
    al = np.where(delta < 0, -delta, 0.0).mean()
    return 100.0 if al == 0 else float(100 - 100 / (1 + ag / al))


# ── Signal generators (return array of +1 buy / -1 sell / 0 hold) ────────────

def _sig_ma(closes: list) -> list:
    n = len(closes)
    out = [0] * n
    for i in range(20, n):
        ma5 = np.mean(closes[i - 4: i + 1])
        ma20 = np.mean(closes[i - 19: i + 1])
        ma5p = np.mean(closes[i - 5: i])
        ma20p = np.mean(closes[i - 20: i])
        if ma5 > ma20 and ma5p <= ma20p:
            out[i] = 1
        elif ma5 < ma20 and ma5p >= ma20p:
            out[i] = -1
    return out


def _sig_rsi(closes: list) -> list:
    n = len(closes)
    arr = np.array(closes, dtype=float)
    out = [0] * n
    for i in range(16, n):
        r = _rsi_at(arr, i)
        rp = _rsi_at(arr, i - 1)
        if r < 30 and rp >= 30:
            out[i] = 1
        elif r > 70 and rp <= 70:
            out[i] = -1
    return out


def _sig_macd(closes: list) -> list:
    n = len(closes)
    if n < 35:
        return [0] * n
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd = [a - b for a, b in zip(ema12, ema26)]
    sig = _ema(macd, 9)
    out = [0] * n
    for i in range(1, n):
        if macd[i] > sig[i] and macd[i - 1] <= sig[i - 1]:
            out[i] = 1
        elif macd[i] < sig[i] and macd[i - 1] >= sig[i - 1]:
            out[i] = -1
    return out


def _sig_boll(closes: list, period: int = 20, k: float = 2.0) -> list:
    n = len(closes)
    out = [0] * n
    for i in range(period, n):
        win = closes[i - period: i + 1]
        mid = np.mean(win)
        std = np.std(win)
        if closes[i] <= mid - k * std:
            out[i] = 1
        elif closes[i] >= mid + k * std:
            out[i] = -1
    return out


# ── Backtest engine ───────────────────────────────────────────────────────────

def _run(dates, closes, signals, is_cn: bool) -> dict:
    n = len(closes)
    INIT = 1_000_000.0
    cash, shares = INIT, 0
    fee_buy = 0.0003 if is_cn else 0.001
    fee_sell = 0.0013 if is_cn else 0.001
    in_pos = False
    buy_price, buy_date, buy_idx = 0.0, "", 0
    just_bought = False         # for T+1
    trades = []
    equity = [0.0] * n

    for i in range(n):
        price = closes[i]
        sig = signals[i]

        # Reset T+1 flag day after buy
        if just_bought and i > buy_idx:
            just_bought = False

        if sig == 1 and not in_pos and cash > price:
            max_sh = int(cash / (price * (1 + fee_buy)))
            if max_sh > 0:
                cash -= max_sh * price * (1 + fee_buy)
                shares = max_sh
                in_pos = True
                buy_price, buy_date, buy_idx = price, dates[i], i
                just_bought = is_cn  # T+1 lock for CN

        elif sig == -1 and in_pos and shares > 0:
            if just_bought:
                pass  # T+1: can't sell same day
            else:
                proceeds = shares * price * (1 - fee_sell)
                pnl = proceeds - shares * buy_price * (1 + fee_buy)
                cash += proceeds
                trades.append({
                    "buy_date": buy_date,
                    "buy_price": round(buy_price, 4),
                    "sell_date": dates[i],
                    "sell_price": round(price, 4),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round((price - buy_price) / buy_price * 100, 2),
                    "win": pnl > 0,
                })
                shares = 0
                in_pos = False

        equity[i] = cash + shares * price

    # Metrics
    final = equity[-1]
    total_ret = (final - INIT) / INIT * 100
    n_years = n / 252
    cagr = ((final / INIT) ** (1 / n_years) - 1) * 100 if n_years > 0 else 0

    eq_arr = np.array(equity, dtype=float)
    peak, max_dd = eq_arr[0], 0.0
    for v in eq_arr:
        if v > peak: peak = v
        dd = (peak - v) / peak
        if dd > max_dd: max_dd = dd

    daily_rets = np.diff(eq_arr) / eq_arr[:-1]
    std = float(np.std(daily_rets))
    sharpe = float(np.mean(daily_rets) / std * np.sqrt(252)) if std > 0 else 0.0

    wins = [t for t in trades if t["win"]]
    win_rate = len(wins) / len(trades) * 100 if trades else 0.0

    return {
        "equity": [round(v, 2) for v in equity],
        "trades": trades,
        "total_return": round(total_ret, 2),
        "cagr": round(cagr, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "sharpe": round(sharpe, 2),
        "win_rate": round(win_rate, 2),
        "total_trades": len(trades),
    }


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def backtest(
    symbol: str,
    strategy: str = Query("ma"),
    period:   str = Query("1y"),
):
    if strategy not in ("ma", "rsi", "macd", "boll"):
        raise HTTPException(status_code=400, detail="strategy must be one of: ma rsi macd boll")
    if period not in ("1y", "2y", "3y", "5y"):
        raise HTTPException(status_code=400, detail="period must be one of: 1y 2y 3y 5y")

    key = f"{symbol}_{strategy}_{period}"
    now = time.time()
    if key in _cache:
        ts, data = _cache[key]
        if now - ts < _CACHE_TTL:
            return data

    is_cn = _is_cn(symbol)
    period_map = {"1y": 252, "2y": 504, "3y": 756, "5y": 1260}
    limit = period_map[period]

    try:
        # ── Price data ───────────────────────────────────────────────────────
        dates, closes = [], []
        if is_cn:
            import akshare as ak
            df = ak.stock_zh_a_daily(symbol=_to_sina(symbol), adjust="qfq")
            df = df.sort_index().tail(limit)
            dates = [str(d)[:10] for d in df.index.tolist()]
            closes = df["close"].dropna().tolist()
        else:
            import yfinance as yf
            yf_period = {"1y": "1y", "2y": "2y", "3y": "3y", "5y": "5y"}[period]
            hist = yf.Ticker(symbol).history(period=yf_period).sort_index()
            dates = [str(d)[:10] for d in hist.index.tolist()]
            closes = hist["Close"].dropna().tolist()

        if len(closes) < 30:
            raise HTTPException(status_code=400, detail="Insufficient price data for backtest")

        # ── Signals ──────────────────────────────────────────────────────────
        sig_fn = {"ma": _sig_ma, "rsi": _sig_rsi, "macd": _sig_macd, "boll": _sig_boll}[strategy]
        signals = sig_fn(closes)

        result = _run(dates, closes, signals, is_cn)

        # ── Benchmark ────────────────────────────────────────────────────────
        bm_closes = []
        bm_name_zh, bm_name_en = ("沪深300", "CSI 300") if is_cn else ("标普500", "S&P 500")
        try:
            if is_cn:
                import akshare as ak
                bm_df = ak.stock_zh_index_daily(symbol="sh000300").sort_index().tail(limit)
                bm_closes = bm_df["close"].dropna().tolist()
            else:
                import yfinance as yf
                yf_period = {"1y": "1y", "2y": "2y", "3y": "3y", "5y": "5y"}[period]
                bm_hist = yf.Ticker("^GSPC").history(period=yf_period).sort_index()
                bm_closes = bm_hist["Close"].dropna().tolist()
        except Exception as e:
            logger.warning("Benchmark data failed: %s", e)

        if len(bm_closes) >= len(closes) * 0.8:
            bm = bm_closes[-len(closes):]
            bm_eq = [1_000_000.0 * v / bm[0] for v in bm]
            result["benchmark_equity"] = [round(v, 2) for v in bm_eq]
            result["benchmark_return"] = round((bm[-1] - bm[0]) / bm[0] * 100, 2)
        else:
            result["benchmark_equity"] = []
            result["benchmark_return"] = None

        result.update({
            "dates": dates,
            "symbol": symbol,
            "strategy": strategy,
            "period": period,
            "is_cn": is_cn,
            "benchmark_name": bm_name_zh,
            "benchmark_name_en": bm_name_en,
        })

        _cache[key] = (now, result)
        logger.info("Backtest %s strategy=%s period=%s → %.1f%% %d trades",
                    symbol, strategy, period, result["total_return"], result["total_trades"])
        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Backtest error %s", symbol)
        raise HTTPException(status_code=500, detail=str(exc))
