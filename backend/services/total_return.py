"""
Total-return daily prices from Tencent's unadjusted K-line.

Why: the Monte Carlo model (services/monte_carlo.py) learns from daily returns, so the returns must
be what a holder really earned. Tencent's forward-adjusted Hong Kong series subtracts every later
dividend from old prices, which shrinks them and inflates past returns: for the high-dividend
stocks three years of it overstates volatility by 10–20% (HSBC, China Mobile, the banks). The
unadjusted series is exact on ordinary days, and its rows carry a note on each ex-date ("末期息
0.36港元", "每1股拆分成5股", "供股 12股供5股,每股28.000元"), enough to adjust the price before it
by ratio:

    cash dividend D        previous close counts as (close - D)
    split, 1 share -> k    previous close counts as close / k
    rights, b new per a held at price S    previous close counts as (a*close + b*S) / (a + b)

A day whose note cannot be valued (a spin-off paid in shares) is given a zero return when the move is
large, instead of counting as a crash; a jump with no note that lands on a whole-number ratio is
taken as a split; a one-day bad price that snaps back the next day is dropped.

(Tencent's forward-adjusted US series is already by ratio and also covers spin-offs, so US stocks
keep using it.)
"""
import re
import time

RAW_URL = "https://web.ifzq.gtimg.cn/appstock/app/kline/kline"

_NUM = r"(\d+(?:\.\d+)?)"
_SPLIT = re.compile(rf"每{_NUM}股(?:拆分成|拆细为|拆细成|分拆成|分拆为|拆为|拆成){_NUM}股")
_MERGE = re.compile(rf"每{_NUM}股(?:合成|合并成|合并为|并为){_NUM}股")
_BONUS = re.compile(rf"每?{_NUM}股?送{_NUM}股")
_RIGHTS = re.compile(rf"供股\s*{_NUM}股供{_NUM}股,每股{_NUM}元")
_AMOUNT_THEN_CUR = re.compile(rf"{_NUM}\s*元?\s*(港元|港币|美元|人民币|英镑)")
_CUR_THEN_AMOUNT = re.compile(rf"(港币|港元|美元|人民币|英镑)\s*{_NUM}\s*元?")
_DOLLAR = re.compile(rf"\$\s*{_NUM}")
_PER_SHARES = re.compile(r"每(\d+)股")
_CUR = {"港元": "HKD", "港币": "HKD", "美元": "USD", "人民币": "CNY", "英镑": "GBP"}
# Rough rates for a dividend declared in another currency with no stated equivalent. A dividend is a
# few percent of the price, so a rate that is 10% off moves one day's return by a few tenths of a percent.
_FX = {"hk": {"HKD": 1.0, "USD": 7.8, "CNY": 1.15, "GBP": 10.0}, "us": {"USD": 1.0}}
_HOME = {"hk": "HKD", "us": "USD"}
_WHOLE_RATIOS = (2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 28, 50, 100)


def _amount(segment: str, home: str):
    m = _AMOUNT_THEN_CUR.search(segment)
    if m:
        value, cur = float(m.group(1)), _CUR[m.group(2)]
    else:
        m = _CUR_THEN_AMOUNT.search(segment)
        if m:
            value, cur = float(m.group(2)), _CUR[m.group(1)]
        else:
            m = _DOLLAR.search(segment)
            if not m:
                return None
            value, cur = float(m.group(1)), home
    per = _PER_SHARES.search(segment)                    # "每10股人民币1.65元"
    if per and int(per.group(1)) > 0:
        value /= int(per.group(1))
    return value, cur


def dividend(text: str, market: str) -> float:
    """Cash paid per share on this ex-date, in the trading currency; 0 when nothing parses."""
    home, fx = _HOME[market], _FX[market]
    total, last = 0.0, None
    for segment in re.split(r"[;；,，]", text or ""):
        a = _amount(segment, home)
        if not a:
            continue
        if segment.strip().startswith("相当于"):          # the amount before it, restated in another currency
            if last is not None and a[1] == home and last[1] != home:
                total += a[0] - last[0] * fx.get(last[1], 0.0)
                last = (a[0], home)
            continue
        total += a[0] * fx.get(a[1], 0.0)
        last = a
    return total


def split_ratio(text: str):
    """New shares for each old one (2 for a 2-for-1 split, 0.125 for a 1-for-8 consolidation), or None."""
    for pattern in (_SPLIT, _MERGE):
        m = pattern.search(text or "")
        if m and float(m.group(1)) > 0:
            return float(m.group(2)) / float(m.group(1))
    m = _BONUS.search(text or "")
    if m and float(m.group(1)) > 0:
        return (float(m.group(1)) + float(m.group(2))) / float(m.group(1))
    return None


def _unmarked_split(prev_close: float, open_: float, close: float):
    """A jump with no note that lands on a whole-number split ratio at both the open and the close."""
    for k in _WHOLE_RATIOS:
        for ratio in (k, 1 / k):
            if abs(prev_close / ratio / close - 1) < 0.12 and abs(prev_close / ratio / open_ - 1) < 0.08:
                return ratio
    return None


def adjust(rows: list, market: str) -> list:
    """rows, oldest first: [date, open, close, high, low, notes] with notes a dict that may hold
    FHcontent (dividend), hgcgContent (split) and ggContent (rights). Returns candles {date, open,
    high, low, close} scaled so that day-to-day changes are total returns; the latest prices are
    unchanged. Days with a bad price are left out."""
    n = len(rows)
    out = [None] * n
    factor = 1.0
    skip = set()
    for i in range(1, n - 1):                           # a price that jumps and is back the next day
        pc, c, nc = rows[i - 1][2], rows[i][2], rows[i + 1][2]
        if pc > 0 and c > 0 and not 0.75 < c / pc < 1.33 and 0.93 < nc / pc < 1.07 and not rows[i][5]:
            skip.add(i)
    for i in range(n - 1, -1, -1):
        date, o, c, h, low, notes = rows[i]
        if i not in skip and c > 0:
            out[i] = {"date": date, "open": o * factor, "high": h * factor, "low": low * factor, "close": c * factor}
        j = i - 1
        while j in skip:
            j -= 1
        if j < 0 or i in skip:
            continue
        pc = rows[j][2]
        if pc <= 0 or c <= 0:
            continue
        g = 1.0
        notes = notes or {}
        k = split_ratio(notes.get("hgcgContent"))
        big = not 0.69 < c / pc < 1.45
        if k is None and big and o > 0:
            k = _unmarked_split(pc, o, c)
        if k:
            g /= k
        div = dividend(notes.get("FHcontent"), market)
        # believed when it is a normal size, or when the price really fell by something like it
        if div > 0 and (div <= 0.12 * pc or c <= pc - 0.4 * div) and div < 0.6 * pc:
            g *= (pc - div) / pc
        m = _RIGHTS.search(notes.get("ggContent") or "")
        if m:
            a, b, s = float(m.group(1)), float(m.group(2)), float(m.group(3))
            if a > 0 and 0 < s < pc:
                g *= (a * pc + b * s) / ((a + b) * pc)
        # A note that could not be valued (a spin-off paid in shares), or one that leaves a huge jump
        # unexplained (an unlisted bonus issue): the day gets a zero return rather than a fake crash.
        # A big move with no note at all is taken as real.
        if notes and ((g == 1.0 and abs(c / pc - 1) > 0.08) or not 0.6 < c / (pc * g) < 1.6):
            g = c / pc
        factor *= g
    return [x for x in out if x]


def tencent_raw_rows(code: str, n: int, timeout: float = 10) -> list:
    """The last n unadjusted daily rows for a Tencent code ("hk00700"), oldest first, as adjust() takes
    them. One request returns up to 2000 rows."""
    import requests
    last = None
    for attempt in range(2):
        try:
            r = requests.get(RAW_URL, params={"param": f"{code},day,,,{min(int(n), 2000)}"}, timeout=timeout)
            node = (r.json().get("data") or {}).get(code) or {}
            rows = []
            for x in node.get("day") or []:
                notes = x[6] if len(x) > 6 and isinstance(x[6], dict) else {}
                rows.append([x[0], float(x[1]), float(x[2]), float(x[3]), float(x[4]),
                             {k: v for k, v in notes.items() if v and k in ("FHcontent", "hgcgContent", "ggContent")}])
            return rows
        except Exception as e:
            last = e
            time.sleep(0.5 * (attempt + 1))
    raise last


def hk_candles(code: str, n: int = 800) -> list:
    """Total-return daily candles for a Hong Kong stock (5-digit code), oldest first."""
    return adjust(tencent_raw_rows(f"hk{code}", n), "hk")
