"""
Build the price files for the time-machine scenarios (services/time_machine_scenarios.py).

    python3 tools/build_time_machine.py            # all scenarios
    python3 tools/build_time_machine.py gfc_2008   # one

Writes data/time_machine/<id>.json: the trading days of the scenario's benchmark (60 days of
lead-in before the start, so charts have context on day one) and each instrument's real closing
price on those days. History does not change, so this runs once and the files are committed.

Sources (free, public):
  US stocks and ETFs: Sina daily history via akshare (stock_us_daily, unadjusted: the price people
    actually saw that day); days Sina lacks (Meta before its 2022 ticker change, a few gaps) come
    from Tencent's daily K-line, used only when the two agree on the days both have. Scenario
    windows are chosen without stock splits; any overnight move over ±45% is printed for a check.
  A-shares and ETFs: Tencent daily K-line, unadjusted. Its ex-rights rows carry the payout text
    ("10派43.74元送1股"), parsed into cash per share and bonus shares per share for the game to
    pay holders. A missing day is a trading suspension (null: cannot trade).
Run it where both sources answer (the production server reaches Tencent's K-line, a home network
may be blocked).
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
os.environ.setdefault("TQDM_DISABLE", "1")

from services.time_machine_scenarios import SCENARIOS  # noqa: E402

OUT = os.path.join(HERE, "..", "data", "time_machine")
LEAD_DAYS = 60


def us_history(sym: str, end: str) -> dict:
    import akshare as ak
    df = ak.stock_us_daily(symbol=sym, adjust="")
    out = {d.strftime("%Y-%m-%d"): round(float(c), 4) for d, c in zip(df["date"], df["close"]) if c == c}
    tc = {}
    for suffix in (".N", ".OQ", ".AM"):
        tc = {d: c for d, c, _ in tencent_rows("us" + sym + suffix, end)}
        if tc:
            break
    both = [d for d in tc if d in out]
    if tc and both and all(abs(tc[d] / out[d] - 1) < 0.01 for d in both[-60:]):
        added = [d for d in tc if d not in out]
        out.update({d: tc[d] for d in added})
        if added:
            print(f"  {sym}: {len(added)} days from Tencent", flush=True)
    elif tc and not both:
        out.update(tc)
        print(f"  {sym}: Tencent only", flush=True)
    return out


def tencent_rows(code: str, end: str) -> list:
    """[(date, close, payout text or None)] for the 800 trading days up to `end`, unadjusted."""
    r = requests.get("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
                     params={"param": f"{code},day,2000-01-01,{end},800,"}, timeout=20)
    data = (r.json().get("data") or {})
    if not isinstance(data, dict) or code not in data:
        return []
    rows = data[code].get("day") or []
    return [(row[0], float(row[2]), (row[6].get("FHcontent") if len(row) > 6 and isinstance(row[6], dict) else None))
            for row in rows]


def cn_code(sym: str) -> str:
    return ("sh" if sym.startswith(("6", "5", "9")) else "sz") + sym


def parse_payout(text: str) -> dict:
    """'10派43.74元送1股' -> {'cash': 4.374, 'shares': 0.1} (per share, cash before tax)."""
    def per10(pattern):
        m = re.search(pattern, text)
        return float(m.group(1)) / 10 if m else 0.0
    cash = per10(r"派(\d+(?:\.\d+)?)元")
    shares = per10(r"送(\d+(?:\.\d+)?)股") + per10(r"转(?:增)?(\d+(?:\.\d+)?)股")
    return {"cash": round(cash, 6), "shares": round(shares, 6), "text": text}


def cn_history(sym: str, end: str) -> tuple[dict, dict]:
    rows = tencent_rows(cn_code(sym), end)
    closes = {d: c for d, c, _ in rows}
    actions = {d: parse_payout(t) for d, _, t in rows if t}
    return closes, actions


def build(sc: dict) -> dict:
    start, end = sc["start"], sc["end"]
    lead_from = (datetime.strptime(start, "%Y-%m-%d") - timedelta(days=LEAD_DAYS * 2)).strftime("%Y-%m-%d")
    syms = [i[0] for i in sc["instruments"]]
    raw: dict = {}
    actions: dict = {}
    for s in syms:
        if sc["market"] == "us":
            raw[s] = us_history(s, end)
        else:
            raw[s], actions[s] = cn_history(s, end)
        print(f"  {s}: {sum(1 for d in raw[s] if lead_from <= d <= end)} days", flush=True)

    bench = raw[sc["benchmark"]]
    days = sorted(d for d in bench if lead_from <= d <= end)
    first = next(i for i, d in enumerate(days) if d >= start)
    lead = max(0, first - LEAD_DAYS)
    days = days[lead:]
    start_index = first - lead

    closes, adjust = {}, {}
    for s in syms:
        closes[s] = [raw[s].get(d) for d in days]
        prev = None
        for d, c in zip(days, closes[s]):
            if c is not None and prev is not None and not (0.55 < c / prev < 1.45):
                print(f"  CHECK {s} {d}: {prev} -> {c} ({c / prev - 1:+.0%})", flush=True)
            if c is not None:
                prev = c
        acts = {d: a for d, a in (actions.get(s) or {}).items() if days[start_index] <= d <= days[-1]}
        if acts:
            adjust[s] = acts
            print(f"  {s} corporate actions: {acts}", flush=True)
        if closes[s][start_index] is None:
            print(f"  WARNING {s} has no price on the start day", flush=True)

    return {"id": sc["id"], "built": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "Sina (US daily, unadjusted)" if sc["market"] == "us" else "Tencent (daily K-line)",
            "dates": days, "start_index": start_index, "closes": closes, "adjust": adjust}


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    wanted = set(sys.argv[1:])
    for sc in SCENARIOS:
        if wanted and sc["id"] not in wanted:
            continue
        print(sc["id"], flush=True)
        data = build(sc)
        with open(os.path.join(OUT, f"{sc['id']}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  -> {len(data['dates'])} days ({data['start_index']} lead-in)", flush=True)
