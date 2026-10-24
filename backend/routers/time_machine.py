"""
History time machine — /api/time-machine

A student starts on the first day of a real market episode (services/time_machine_scenarios.py)
with virtual cash and moves forward a day or a week at a time. Only what was known that day is
ever sent: prices up to the current day and the events that had already happened, so the future
cannot be read from the page. Trades fill at the day's close; dividends and bonus shares are paid
on their ex-dates. At the end the result is compared with simply holding the index fund.

Players are the paper-trading accounts (same device id / signed-in user and the same ownership
check); each keeps one run per scenario.
"""
import json
import logging
import math
import os
import threading
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routers.paper_trading import _capture_auth, _owner, _safe_id, _lock, _load_account, _write_json
from services.time_machine_scenarios import SCENARIOS, BY_ID

router = APIRouter(dependencies=[Depends(_capture_auth)])
logger = logging.getLogger("time_machine")

_PRICE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "time_machine")
_RUN_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "time_machine_runs")
os.makedirs(_RUN_DIR, exist_ok=True)
_board_lock = threading.Lock()
_LANGS = ("zh", "en", "ja", "ko", "fr")


def _t(d: dict, lang: str) -> str:
    """Scenario text in the reader's language: Chinese for zh, English otherwise."""
    return d.get("zh" if lang == "zh" else "en") or d.get("en") or ""


# ── Scenario data (prices + when each event becomes visible) ──────────────────

_data: dict = {}


def _scenario(sid: str) -> tuple[dict, dict]:
    sc = BY_ID.get(sid)
    if not sc:
        raise HTTPException(404, "Unknown scenario")
    if sid not in _data:
        with open(os.path.join(_PRICE_DIR, f"{sid}.json"), encoding="utf-8") as f:
            px = json.load(f)
        dates = px["dates"]
        shown = []
        for when, after_close, source, zh, en in sc["events"]:
            # First trading day on which the news was known before the close
            idx = next((i for i, d in enumerate(dates) if d > when or (d == when and not after_close)), None)
            if idx is not None:
                shown.append({"idx": idx, "happened": when, "source": source, "zh": zh, "en": en})
        shown.sort(key=lambda e: e["idx"])
        px["events"] = shown
        _data[sid] = px
    return sc, _data[sid]


def _price(px: dict, sym: str, i: int) -> Optional[float]:
    """Close on day i, or the last close before it while a stock is suspended."""
    col = px["closes"][sym]
    for j in range(i, -1, -1):
        if col[j] is not None:
            return col[j]
    return None


# ── Runs ──────────────────────────────────────────────────────────────────────

def _runs_path(device_id: str) -> str:
    return os.path.join(_RUN_DIR, f"{_safe_id(device_id)}.json")


def _load_runs(device_id: str) -> dict:
    try:
        with open(_runs_path(device_id), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _value(px: dict, run: dict, i: int) -> float:
    return run["cash"] + sum(p["shares"] * (_price(px, s, i) or 0) for s, p in run["positions"].items())


def _new_run(sc: dict, px: dict) -> dict:
    si = px["start_index"]
    return {"scenario": sc["id"], "day": si, "cash": float(sc["cash"]), "positions": {}, "trades": [],
            "values": [float(sc["cash"])], "notes": [], "started": datetime.utcnow().isoformat() + "Z",
            "finished": False}


def _apply_actions(sc: dict, px: dict, run: dict, i: int, lang_free_notes: list) -> None:
    """Dividends and bonus shares on day i's ex-date, for what the player holds."""
    date = px["dates"][i]
    for sym, acts in (px.get("adjust") or {}).items():
        a = acts.get(date)
        pos = run["positions"].get(sym)
        if not a or not pos or pos["shares"] <= 0:
            continue
        cash = round(pos["shares"] * a["cash"], 2)
        extra = math.floor(pos["shares"] * a["shares"] + 1e-9)
        run["cash"] += cash
        if extra:
            total_cost = pos["cost"] * pos["shares"]
            pos["shares"] += extra
            pos["cost"] = total_cost / pos["shares"]
        lang_free_notes.append({"idx": i, "symbol": sym, "text": a["text"], "cash": cash, "shares": extra})


def _finish(sc: dict, px: dict, run: dict) -> dict:
    si, last = px["start_index"], len(px["dates"]) - 1
    bench = px["closes"][sc["benchmark"]]
    b0 = bench[si]
    bvals = [sc["cash"] * (_price(px, sc["benchmark"], i) or b0) / b0 for i in range(si, last + 1)]

    def mdd(vals):
        peak, worst = vals[0], 0.0
        for v in vals:
            peak = max(peak, v)
            worst = min(worst, v / peak - 1)
        return round(worst * 100, 2)

    sells = [t for t in run["trades"] if t["side"] == "sell" and t.get("pl") is not None]
    low_i = si + min(range(len(bvals)), key=lambda k: bvals[k])
    near_low = range(low_i - 5, low_i + 6)
    cash_share = sum((run["cash_hist"][k] / run["values"][k]) if run["values"][k] else 1
                     for k in range(len(run["values"]))) / len(run["values"]) if run.get("cash_hist") else None
    return {
        "return_pct": round((run["values"][-1] / sc["cash"] - 1) * 100, 2),
        "bench_return_pct": round((bvals[-1] / sc["cash"] - 1) * 100, 2),
        "max_drawdown_pct": mdd(run["values"]),
        "bench_max_drawdown_pct": mdd(bvals),
        "trades": len(run["trades"]),
        "best": max(sells, key=lambda t: t["pl"], default=None),
        "worst": min(sells, key=lambda t: t["pl"], default=None),
        "sold_near_low": any(t["side"] == "sell" and t["idx"] in near_low for t in run["trades"]),
        "bought_near_low": any(t["side"] == "buy" and t["idx"] in near_low for t in run["trades"]),
        "low_date": px["dates"][low_i],
        "avg_cash_pct": round(cash_share * 100, 1) if cash_share is not None else None,
        "finished_at": datetime.utcnow().isoformat() + "Z",
    }


_LESSONS = {
    "beat": ("你跑赢了一直持有指数基金的做法。想一想：是判断准确，还是运气？同样的操作在另一段历史里还会有效吗？",
             "You beat simply holding the index fund. Was it good judgment or luck, and would the same moves work in another period?"),
    "lag": ("你落后于一直持有指数基金。很多专业投资者长期也跑不赢指数，这正是指数基金受欢迎的原因。",
            "You trailed simply holding the index fund. Over the long run many professionals do too, which is why index funds are so popular."),
    "sold_low": ("你在市场最低点附近卖出过。恐慌时卖出往往会锁定亏损、错过反弹，这是行为金融学里常说的“损失厌恶”。",
                 "You sold close to the market's lowest point. Selling in a panic tends to lock in losses and miss the rebound, a classic case of loss aversion."),
    "bought_low": ("你在市场最低点附近买入过。别人恐惧时买入需要勇气，也需要足够的现金和耐心。",
                   "You bought close to the market's lowest point. Buying when others are fearful takes nerve, spare cash and patience."),
    "cash": ("你大部分时间都拿着现金。现金在下跌时能保护你，但也会让你错过上涨。",
             "You held mostly cash. Cash protects you in a fall but also means missing the rise."),
    "idle": ("你一次都没有交易。什么都不做也是一种选择，下一次试着用一小部分资金实践你的判断。",
             "You did not trade at all. Doing nothing is a choice too; next time try putting a small part of the money behind your view."),
}


def _lessons(res: dict, lang: str) -> list[str]:
    k = 0 if lang == "zh" else 1
    out = [_LESSONS["beat" if res["return_pct"] > res["bench_return_pct"] else "lag"][k]]
    if res["trades"] == 0:
        out.append(_LESSONS["idle"][k])
    else:
        if res["sold_near_low"]:
            out.append(_LESSONS["sold_low"][k])
        if res["bought_near_low"]:
            out.append(_LESSONS["bought_low"][k])
        if (res.get("avg_cash_pct") or 0) >= 70:
            out.append(_LESSONS["cash"][k])
    return out


# ── Views ─────────────────────────────────────────────────────────────────────

def _meta(sc: dict, px: dict, lang: str) -> dict:
    si = px["start_index"]
    return {
        "id": sc["id"], "title": _t(sc["title"], lang), "tagline": _t(sc["tagline"], lang),
        "market": sc["market"], "currency": sc["currency"], "cash": sc["cash"], "lot": sc.get("lot", 1),
        "start_date": px["dates"][si], "end_date": px["dates"][-1], "n_days": len(px["dates"]) - si,
        "benchmark": sc["benchmark"],
    }


def _view(sc: dict, px: dict, run: dict, lang: str, since: Optional[int] = None) -> dict:
    i, si = run["day"], px["start_index"]
    dates = px["dates"][: i + 1]
    names = {s: (zh if lang == "zh" else en, kind) for s, kind, zh, en in sc["instruments"]}
    instruments = []
    for s in names:
        col = px["closes"][s][: i + 1]
        price = _price(px, s, i)
        prev = _price(px, s, i - 1) if i > 0 else None
        instruments.append({
            "symbol": s, "name": names[s][0], "kind": names[s][1], "price": price,
            "change_pct": round((price / prev - 1) * 100, 2) if price and prev else None,
            "suspended": px["closes"][s][i] is None, "closes": col,
        })
    positions = []
    for s, p in run["positions"].items():
        if p["shares"] <= 0:
            continue
        price = _price(px, s, i) or 0
        positions.append({"symbol": s, "name": names[s][0], "shares": p["shares"], "cost": round(p["cost"], 4),
                          "price": price, "value": round(p["shares"] * price, 2),
                          "pl": round((price - p["cost"]) * p["shares"], 2),
                          "pl_pct": round((price / p["cost"] - 1) * 100, 2) if p["cost"] else None})
    value = _value(px, run, i)
    b0 = px["closes"][sc["benchmark"]][si]
    bench = [round(sc["cash"] * (_price(px, sc["benchmark"], k) or b0) / b0, 2) for k in range(si, i + 1)]
    lo = since if since is not None else i - 1
    events = [{"date": px["dates"][e["idx"]], "happened": e["happened"], "source": e["source"],
               "text": e["zh"] if lang == "zh" else e["en"], "new": e["idx"] > lo}
              for e in px["events"] if e["idx"] <= i]
    out = {
        "scenario": _meta(sc, px, lang),
        "day": i - si, "date": px["dates"][i], "finished": run["finished"],
        "dates": dates, "start_index": si, "instruments": instruments,
        "portfolio": {"cash": round(run["cash"], 2), "value": round(value, 2),
                      "return_pct": round((value / sc["cash"] - 1) * 100, 2),
                      "bench_return_pct": round((bench[-1] / sc["cash"] - 1) * 100, 2),
                      "positions": sorted(positions, key=lambda p: -p["value"]),
                      "values": [round(v, 2) for v in run["values"]], "bench": bench},
        "events": events[::-1],
        "notes": [{**n, "date": px["dates"][n["idx"]], "new": n["idx"] > lo} for n in run["notes"]][::-1],
        "trades": [{k: t[k] for k in ("date", "symbol", "side", "shares", "price", "pl") if k in t}
                   for t in run["trades"][-60:]][::-1],
    }
    if run["finished"] and run.get("result"):
        study = _study_event(sc.get("study_event"))
        out["result"] = {**run["result"], "epilogue": _t(sc["epilogue"], lang), "lessons": _lessons(run["result"], lang),
                         "exam_points": (study.get("exam_points_zh") if lang == "zh" and study.get("exam_points_zh")
                                         else study.get("exam_points")) or []}
    return out


def _study_event(eid: Optional[str]) -> dict:
    try:
        from routers.study import ECONOMIC_EVENTS
        return next((e for e in ECONOMIC_EVENTS if e["id"] == eid), {}) or {}
    except Exception:
        return {}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/scenarios")
def scenarios(lang: Optional[str] = Query(None), device_id: Optional[str] = Query(None)):
    lang = lang if lang in _LANGS else "zh"
    mine = {}
    if device_id:
        try:
            _owner(device_id)
            mine = _load_runs(device_id)
        except HTTPException:
            mine = {}
    out = []
    for sc in SCENARIOS:
        _, px = _scenario(sc["id"])
        run = mine.get(sc["id"])
        item = {**_meta(sc, px, lang), "instruments": len(sc["instruments"])}
        if run:
            item["progress"] = {"day": run["day"] - px["start_index"], "finished": run["finished"],
                                "return_pct": round((run["values"][-1] / sc["cash"] - 1) * 100, 2),
                                "best": run.get("best")}
        out.append(item)
    return {"scenarios": out}


class RunBody(BaseModel):
    device_id: str
    scenario: str
    lang: Optional[str] = None


class TradeBody(RunBody):
    symbol: str
    side: str          # buy | sell
    shares: float


class AdvanceBody(RunBody):
    days: int = 1      # 1 = next day, 5 = next week, a large number = to the end


def _lang(body) -> str:
    return body.lang if body.lang in _LANGS else "zh"


@router.post("/state")
def state(body: RunBody):
    _owner(body.device_id)
    sc, px = _scenario(body.scenario)
    run = _load_runs(body.device_id).get(sc["id"])
    return {"run": _view(sc, px, run, _lang(body)) if run else None, "scenario": _meta(sc, px, _lang(body))}


@router.post("/start")
def start(body: RunBody):
    _owner(body.device_id)
    sc, px = _scenario(body.scenario)
    with _lock(body.device_id):
        runs = _load_runs(body.device_id)
        best = (runs.get(sc["id"]) or {}).get("best")
        run = _new_run(sc, px)
        run["cash_hist"] = [run["cash"]]
        if best is not None:
            run["best"] = best
        runs[sc["id"]] = run
        _write_json(_runs_path(body.device_id), runs)
    return {"run": _view(sc, px, run, _lang(body), since=px["start_index"] - 1)}


@router.post("/trade")
def trade(body: TradeBody):
    _owner(body.device_id)
    sc, px = _scenario(body.scenario)
    lang = _lang(body)
    zh = lang == "zh"
    if body.side not in ("buy", "sell"):
        raise HTTPException(400, "side must be buy or sell")
    names = {s for s, *_ in sc["instruments"]}
    if body.symbol not in names:
        raise HTTPException(400, "Not tradable in this scenario")
    shares = int(body.shares)
    if shares <= 0:
        raise HTTPException(400, "股数必须大于 0" if zh else "Shares must be above 0")
    with _lock(body.device_id):
        runs = _load_runs(body.device_id)
        run = runs.get(sc["id"])
        if not run:
            raise HTTPException(400, "Start the scenario first")
        if run["finished"]:
            raise HTTPException(400, "这段历史已经结束" if zh else "This scenario has ended")
        i = run["day"]
        price = px["closes"][body.symbol][i]
        if price is None:
            raise HTTPException(400, "这只股票今天停牌，不能交易" if zh else "Trading in this stock is suspended today")
        lot = sc.get("lot", 1)
        pos = run["positions"].setdefault(body.symbol, {"shares": 0, "cost": 0.0})
        entry = {"idx": i, "date": px["dates"][i], "symbol": body.symbol, "side": body.side, "shares": shares, "price": price}
        if body.side == "buy":
            if shares % lot:
                raise HTTPException(400, f"A股买入须为 {lot} 股的整数倍" if zh else f"Buy in multiples of {lot} shares")
            cost = round(shares * price, 2)
            if cost > run["cash"] + 1e-6:
                raise HTTPException(400, "现金不足" if zh else "Not enough cash")
            run["cash"] -= cost
            pos["cost"] = (pos["cost"] * pos["shares"] + cost) / (pos["shares"] + shares)
            pos["shares"] += shares
        else:
            if shares > pos["shares"]:
                raise HTTPException(400, "持仓不足" if zh else "You do not hold that many shares")
            amount = round(shares * price, 2)
            run["cash"] += amount
            entry["pl"] = round((price - pos["cost"]) * shares, 2)
            pos["shares"] -= shares
            if pos["shares"] == 0:
                run["positions"].pop(body.symbol)
        run["trades"].append(entry)
        run["values"][-1] = _value(px, run, i)
        run.setdefault("cash_hist", [run["cash"]])[-1] = run["cash"]
        _write_json(_runs_path(body.device_id), runs)
    return {"run": _view(sc, px, run, lang, since=i)}


@router.post("/advance")
def advance(body: AdvanceBody):
    _owner(body.device_id)
    sc, px = _scenario(body.scenario)
    last = len(px["dates"]) - 1
    with _lock(body.device_id):
        runs = _load_runs(body.device_id)
        run = runs.get(sc["id"])
        if not run:
            raise HTTPException(400, "Start the scenario first")
        before = run["day"]
        if run["finished"]:
            return {"run": _view(sc, px, run, _lang(body), since=before)}
        run.setdefault("cash_hist", [run["cash"]] * len(run["values"]))
        for _ in range(max(1, min(int(body.days), last - before))):
            if run["day"] >= last:
                break
            run["day"] += 1
            _apply_actions(sc, px, run, run["day"], run["notes"])
            run["values"].append(_value(px, run, run["day"]))
            run["cash_hist"].append(run["cash"])
        if run["day"] >= last and not run["finished"]:
            run["finished"] = True
            run["result"] = _finish(sc, px, run)
            run["best"] = max(run.get("best") if run.get("best") is not None else -1e9, run["result"]["return_pct"])
            _record_score(sc["id"], body.device_id, run["result"])
        _write_json(_runs_path(body.device_id), runs)
    return {"run": _view(sc, px, run, _lang(body), since=before)}


# ── Leaderboard ───────────────────────────────────────────────────────────────

def _board_path(sid: str) -> str:
    return os.path.join(_RUN_DIR, f"_board_{sid}.json")


def _record_score(sid: str, device_id: str, res: dict) -> None:
    with _board_lock:
        try:
            with open(_board_path(sid), encoding="utf-8") as f:
                board = json.load(f)
        except Exception:
            board = {}
        prev = board.get(device_id)
        if prev is None or res["return_pct"] > prev["return_pct"]:
            board[device_id] = {"return_pct": res["return_pct"], "bench_return_pct": res["bench_return_pct"],
                                "max_drawdown_pct": res["max_drawdown_pct"], "at": res["finished_at"]}
            _write_json(_board_path(sid), board)


@router.get("/leaderboard")
def leaderboard(scenario: str = Query(...), device_id: Optional[str] = Query(None)):
    if scenario not in BY_ID:
        raise HTTPException(404, "Unknown scenario")
    try:
        with open(_board_path(scenario), encoding="utf-8") as f:
            board = json.load(f)
    except Exception:
        board = {}
    rows = sorted(board.items(), key=lambda kv: -kv[1]["return_pct"])
    out = []
    for rank, (dev, r) in enumerate(rows, 1):
        if rank > 20 and dev != device_id:
            continue
        acc = _load_account(dev) or {}
        out.append({"rank": rank, "nickname": acc.get("nickname") or None, "return_pct": r["return_pct"],
                    "bench_return_pct": r["bench_return_pct"], "is_me": dev == device_id})
    return {"rows": out, "players": len(rows)}
