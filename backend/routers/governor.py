"""
"Be the Fed chair" — /api/governor

A student sets the US policy rate one quarter at a time through a real episode
(services/governor_scenarios.py). The economy is the real history plus the effect of the
difference between the student's rates and the real Fed's (services/governor_model.py), so copying
the Fed reproduces exactly what happened. Only quarters already played are ever sent, with the real
Fed's decision for a quarter revealed after the student has made theirs, so the future cannot be
read from the page.

At the end the result is scored by how far inflation and unemployment were from the Fed's two
goals (2% inflation, unemployment at its natural rate), against the real Fed over the same quarters.

Players are the paper-trading accounts (same device id / signed-in user and ownership check); each
keeps one run per scenario.
"""
import json
import os
import threading
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routers.paper_trading import _capture_auth, _owner, _safe_id, _lock, _load_account, _write_json
from services import governor_model as gm
from services.governor_scenarios import SCENARIOS, BY_ID

router = APIRouter(dependencies=[Depends(_capture_auth)])

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "governor")
_RUN_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "governor_runs")
os.makedirs(_RUN_DIR, exist_ok=True)
_board_lock = threading.Lock()
_LANGS = ("zh", "en", "ja", "ko", "fr")
_MAX_RATE = 25.0


def _t(d: dict, lang: str) -> str:
    """Scenario text in the reader's language: Chinese for zh, English otherwise."""
    return d.get("zh" if lang == "zh" else "en") or d.get("en") or ""


_data: dict = {}


def _scenario(sid: str) -> tuple[dict, dict]:
    sc = BY_ID.get(sid)
    if not sc:
        raise HTTPException(404, "Unknown scenario")
    if sid not in _data:
        with open(os.path.join(_DATA_DIR, f"{sid}.json"), encoding="utf-8") as f:
            _data[sid] = json.load(f)
    return sc, _data[sid]


def _n_decisions(d: dict) -> int:
    """One decision per quarter from the start to the quarter before the end; the end quarter
    shows the effect of the last one."""
    return len(d["quarters"]) - d["lead"] - 1


# ── Runs ──────────────────────────────────────────────────────────────────────

def _runs_path(device_id: str) -> str:
    return os.path.join(_RUN_DIR, f"{_safe_id(device_id)}.json")


def _load_runs(device_id: str) -> dict:
    try:
        with open(_runs_path(device_id), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


# ── Scoring ───────────────────────────────────────────────────────────────────

def _summary(path: list, rates: list) -> dict:
    return {
        "miss": round(gm.miss(path), 2),
        "avg_pce4": round(sum(p["pce4"] for p in path) / len(path), 2),
        "avg_u": round(sum(p["u"] for p in path) / len(path), 2),
        "peak_pce4": max(p["pce4"] for p in path), "peak_u": max(p["u"] for p in path),
        "end_pce4": path[-1]["pce4"], "end_u": path[-1]["u"], "end_exp": path[-1]["exp"],
        "avg_rate": round(sum(rates) / len(rates), 2), "peak_rate": max(rates),
    }


def _result(d: dict, run: dict) -> dict:
    s, rows = d["lead"], d["quarters"]
    rates = run["rates"]
    mine = gm.simulate(rows, s, rates)
    real = [{"pce4": r["pce4"], "u": r["u"], "un": r["un"], "exp": r["exp"]} for r in rows[s: s + len(mine)]]
    fed_rates = [r["ff"] for r in rows[s: s + len(rates)]]
    # Scored from the second quarter: the first one happened before any decision could act
    me, fed = _summary(mine[1:], rates), _summary(real[1:], fed_rates)
    diff = me["miss"] - fed["miss"]
    verdict = "better" if diff <= -0.1 else "worse" if diff >= 0.1 else "same"
    lessons = []
    if me["avg_rate"] > fed["avg_rate"] + 0.5:
        lessons.append("tighter")
    elif me["avg_rate"] < fed["avg_rate"] - 0.5:
        lessons.append("looser")
    else:
        lessons.append("close")
    if me["end_exp"] > fed["end_exp"] + 0.25:
        lessons.append("expectations_up")
    elif me["end_exp"] < fed["end_exp"] - 0.25:
        lessons.append("expectations_down")
    # The zero lower bound mattered if a simple rule called for a negative rate while the student was at 0
    seen = [rows[s - 1]] + mine[:-1]
    if any(rates[k] == 0 and gm.taylor(seen[k]["pce4"], seen[k]["gap"]) < 0 for k in range(len(rates))):
        lessons.append("zero_bound")
    lessons.append("lags")
    return {"me": me, "fed": fed, "verdict": verdict, "lessons": lessons,
            "finished_at": datetime.utcnow().isoformat() + "Z"}


# ── Views ─────────────────────────────────────────────────────────────────────

def _meta(sc: dict, d: dict, lang: str) -> dict:
    return {"id": sc["id"], "title": _t(sc["title"], lang), "tagline": _t(sc["tagline"], lang),
            "chair": _t(sc["chair"], lang), "start": sc["start"], "end": sc["end"],
            "n_decisions": _n_decisions(d), "study": sc.get("study", [])}


def _row(r: dict) -> dict:
    return {k: r[k] for k in ("q", "u", "un", "pce4", "cpi4", "exp", "gap", "ff")}


def _view(sc: dict, d: dict, run: dict, lang: str) -> dict:
    s, rows = d["lead"], d["quarters"]
    rates = run["rates"]
    j, n = len(rates), _n_decisions(d)
    finished = j >= n
    shown = n + 1 if finished else j                 # quarters played so far (the end one once finished)
    sim = gm.simulate(rows, s, rates)[:shown]
    played = []
    for k, p in enumerate(sim):
        a = rows[s + k]
        played.append({"q": p["q"], "rate": rates[k] if k < j else None, "u": p["u"], "pce4": p["pce4"],
                       "exp": p["exp"], "gap": p["gap"], "un": p["un"],
                       "real": {"ff": a["ff"], "u": a["u"], "pce4": a["pce4"], "cpi4": a["cpi4"], "exp": a["exp"]}})
    last_q = rows[s + shown - 1]["q"] if shown else rows[s - 1]["q"]
    events = [{"q": q, "source": src, "text": zh if lang == "zh" else en, "new": shown > 0 and q == last_q}
              for q, src, zh, en in sc["events"] if q <= last_q]
    out = {
        "scenario": _meta(sc, d, lang),
        "history": [_row(r) for r in rows[:s]],
        "played": played, "decision": j, "finished": finished,
        "events": events[::-1],
    }
    if not finished:
        latest = played[-1] if played else {**_row(rows[s - 1]), "rate": rows[s - 1]["ff"]}
        prev_rate = rates[-1] if rates else round(rows[s - 1]["ff"] * 4) / 4   # the Fed moves in quarter points
        out["now"] = {"q": rows[s + j]["q"], "data_q": latest["q"], "rate": prev_rate,
                      "taylor": round(gm.taylor(latest["pce4"], latest["gap"]), 2)}
    if finished and run.get("result"):
        out["result"] = {**run["result"], "epilogue": _t(sc["epilogue"], lang)}
    return out


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
        _, d = _scenario(sc["id"])
        start = d["quarters"][d["lead"]]
        item = {**_meta(sc, d, lang), "start_rate": d["quarters"][d["lead"] - 1]["ff"],
                "start_pce4": d["quarters"][d["lead"] - 1]["pce4"], "start_u": d["quarters"][d["lead"] - 1]["u"],
                "start_q": start["q"]}
        run = mine.get(sc["id"])
        if run:
            item["progress"] = {"decision": len(run["rates"]), "finished": len(run["rates"]) >= _n_decisions(d),
                                "best": run.get("best")}
        out.append(item)
    return {"scenarios": out}


class RunBody(BaseModel):
    device_id: str
    scenario: str
    lang: Optional[str] = None


class DecideBody(RunBody):
    rate: float


def _lang(body) -> str:
    return body.lang if body.lang in _LANGS else "zh"


@router.post("/state")
def state(body: RunBody):
    _owner(body.device_id)
    sc, d = _scenario(body.scenario)
    run = _load_runs(body.device_id).get(sc["id"])
    return {"run": _view(sc, d, run, _lang(body)) if run else None, "scenario": _meta(sc, d, _lang(body))}


@router.post("/start")
def start(body: RunBody):
    _owner(body.device_id)
    sc, d = _scenario(body.scenario)
    with _lock(body.device_id):
        runs = _load_runs(body.device_id)
        best = (runs.get(sc["id"]) or {}).get("best")
        run = {"scenario": sc["id"], "rates": [], "started": datetime.utcnow().isoformat() + "Z"}
        if best is not None:
            run["best"] = best
        runs[sc["id"]] = run
        _write_json(_runs_path(body.device_id), runs)
    return {"run": _view(sc, d, run, _lang(body))}


@router.post("/decide")
def decide(body: DecideBody):
    _owner(body.device_id)
    sc, d = _scenario(body.scenario)
    zh = _lang(body) == "zh"
    rate = round(body.rate * 4) / 4                  # quarter-point steps, like the real Fed
    if not 0 <= rate <= _MAX_RATE:
        raise HTTPException(400, "利率须在 0% 到 25% 之间" if zh else "The rate must be between 0% and 25%")
    with _lock(body.device_id):
        runs = _load_runs(body.device_id)
        run = runs.get(sc["id"])
        if not run:
            raise HTTPException(400, "Start the scenario first")
        n = _n_decisions(d)
        if len(run["rates"]) >= n:
            raise HTTPException(400, "这段历史已经结束" if zh else "This scenario has ended")
        run["rates"].append(rate)
        if len(run["rates"]) >= n:
            run["result"] = _result(d, run)
            miss = run["result"]["me"]["miss"]
            run["best"] = miss if run.get("best") is None else min(run["best"], miss)
            _record_score(sc["id"], body.device_id, run["result"])
        _write_json(_runs_path(body.device_id), runs)
    return {"run": _view(sc, d, run, _lang(body))}


# ── Leaderboard (smallest miss first) ─────────────────────────────────────────

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
        if prev is None or res["me"]["miss"] < prev["miss"]:
            board[device_id] = {"miss": res["me"]["miss"], "fed_miss": res["fed"]["miss"], "at": res["finished_at"]}
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
    rows = sorted(board.items(), key=lambda kv: kv[1]["miss"])
    out = []
    for rank, (dev, r) in enumerate(rows, 1):
        if rank > 20 and dev != device_id:
            continue
        acc = _load_account(dev) or {}
        out.append({"rank": rank, "nickname": acc.get("nickname") or None, "miss": r["miss"],
                    "fed_miss": r["fed_miss"], "is_me": dev == device_id})
    return {"rows": out, "players": len(rows)}
