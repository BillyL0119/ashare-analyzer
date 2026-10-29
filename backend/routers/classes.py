"""
Classroom mode — /api/classes

A signed-in teacher creates a class and shares its join code. Students (paper-trading accounts:
signed in or a device) join with a nickname. The teacher sees each student's learning-mission
progress, trades, returns, time-machine and Fed-chair results, and sets assignments that complete on
their own (a learning mission, or finishing a time-machine or "Be the Fed chair" scenario). Students
see their classes, their assignments and a class leaderboard, and can leave at any time.

The teacher never sees a student's account key (for a guest it is the only credential of the
account): roster rows carry a one-way id instead.
"""
import hashlib
import json
import os
import re
import secrets
import threading
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routers.paper_trading import _auth_header, _capture_auth, _owner, _safe_id, _load_account, _ranked_values, _write_json, _clean_nick
from services import paper_missions
from services.paper_engine import INITIAL, MARKETS, PREFIX
from services.time_machine_scenarios import BY_ID as TM_SCENARIOS
from services.governor_scenarios import BY_ID as GOV_SCENARIOS

router = APIRouter(dependencies=[Depends(_capture_auth)])

_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "classes")
os.makedirs(_DIR, exist_ok=True)
_lock = threading.RLock()
_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"      # no 0/O, 1/I
_ID_RE = re.compile(r"[0-9a-f]{12}")
_MAX_CLASSES, _MAX_STUDENTS, _MAX_ASSIGNMENTS = 20, 200, 60
_LANGS = ("zh", "en", "ja", "ko", "fr")
_MISSIONS = {mid: text for mid, _, text in paper_missions.MISSIONS}
_TYPES = {"mission": _MISSIONS, "time_machine": TM_SCENARIOS, "governor": GOV_SCENARIOS}
_GOV_TITLE = {"zh": "当一次美联储主席：", "en": "Be the Fed chair: ", "ja": "FRB議長になってみよう：",
              "ko": "연준 의장이 되어 보자: ", "fr": "Prenez la tête de la Fed : "}


# ── Storage ───────────────────────────────────────────────────────────────────

def _path(cid: str) -> str:
    if not _ID_RE.fullmatch(cid or ""):
        raise HTTPException(404, "Class not found")
    return os.path.join(_DIR, f"{cid}.json")


def _load(cid: str) -> Optional[dict]:
    try:
        with open(_path(cid), encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _all() -> list[dict]:
    out = []
    for name in os.listdir(_DIR):
        if name.endswith(".json"):
            c = _load(name[:-5])
            if c:
                out.append(c)
    return out


def _by_code(code: str) -> Optional[dict]:
    code = (code or "").strip().upper()
    return next((c for c in _all() if c["code"] == code), None) if re.fullmatch(r"[A-Z0-9]{6}", code) else None


def _sid(key: str) -> str:
    """Roster id for a student: stable, but the account key cannot be recovered from it."""
    return hashlib.sha256(f"class-student:{key}".encode()).hexdigest()[:12]


# ── Who is asking ─────────────────────────────────────────────────────────────

def _teacher() -> str:
    from services.auth import _bearer, verify_token
    ident = verify_token(_bearer(_auth_header.get() or ""))
    if not ident or not ident.get("id"):
        raise HTTPException(401, "Sign in to manage classes")
    return ident["id"]


def _own(cid: str) -> dict:
    uid = _teacher()
    c = _load(cid)
    if not c or c["owner"] != uid:
        raise HTTPException(404, "Class not found")
    return c


# ── Progress ──────────────────────────────────────────────────────────────────

def _tm_runs(key: str) -> dict:
    try:
        from routers.time_machine import _load_runs
        return _load_runs(key)
    except Exception:
        return {}


_fed_miss: dict = {}


def _governor(key: str) -> dict:
    """Each "Be the Fed chair" scenario this account has played: how far it got and, once it has
    finished one, its best score (`miss`, smaller is better) next to the real Fed's over the same
    quarters. A restarted run keeps its best, so a finished scenario stays finished."""
    try:
        from routers.governor import _load_runs, _scenario, _n_decisions
        from services import governor_model as gm
        runs = _load_runs(key)
    except Exception:
        return {}
    out = {}
    for sid, run in runs.items():
        if sid not in GOV_SCENARIOS or not isinstance(run, dict):
            continue
        try:
            _, d = _scenario(sid)
        except Exception:
            continue
        n = _n_decisions(d)
        if sid not in _fed_miss:                 # the real Fed's record, scored as the game scores it
            s = d["lead"]
            _fed_miss[sid] = round(gm.miss(d["quarters"][s + 1: s + n + 1]), 2)
        best = run.get("best")
        out[sid] = {"finished": len(run.get("rates") or []) >= n or best is not None,
                    "decision": min(len(run.get("rates") or []), n), "of": n,
                    "miss": best, "fed_miss": _fed_miss[sid]}
    return out


def _progress(key: str, values: dict) -> dict:
    acc = _load_account(key)
    done = paper_missions.progress(acc) if acc else {}
    trades, last = 0, None
    for m in MARKETS:
        for t in (acc or {}).get(PREFIX[m] + "transactions") or []:
            if t.get("type") in paper_missions.SIDES:
                trades += 1
                last = max(last or "", t.get("date") or "")
    returns = {m: round((values[m][key] / INITIAL[m] - 1) * 100, 2) for m in MARKETS if key in values[m]}
    tm = {}
    for sid, run in _tm_runs(key).items():
        if sid in TM_SCENARIOS:
            sc_cash = TM_SCENARIOS[sid]["cash"]
            tm[sid] = {"finished": bool(run.get("finished")), "best": run.get("best"),
                       "return_pct": round((run["values"][-1] / sc_cash - 1) * 100, 2) if run.get("values") else None,
                       "bench_return_pct": (run.get("result") or {}).get("bench_return_pct")}
    return {"missions": [k for k, v in done.items() if v], "trades": trades, "last_trade": last,
            "returns": returns, "time_machine": tm, "governor": _governor(key)}


def _values() -> dict:
    """Paper account values by market for everyone who has traded there (the leaderboard's cache)."""
    return {m: {d: v for d, _, v in _ranked_values(m)} for m in MARKETS}


def _assignment_view(a: dict, lang: str) -> dict:
    zh = lang == "zh"
    if a["type"] == "mission":
        text = _MISSIONS.get(a["ref"], {})
        t = text.get(lang if lang in text else "en", ("", ""))
        title, detail = t[0], t[1]
    elif a["type"] == "governor":
        sc = GOV_SCENARIOS.get(a["ref"], {})
        name = (sc.get("title") or {}).get("zh" if zh else "en", a["ref"])
        title = _GOV_TITLE.get(lang, _GOV_TITLE["en"]) + name
        detail = (sc.get("tagline") or {}).get("zh" if zh else "en", "")
        return {"id": a["id"], "type": a["type"], "ref": a["ref"], "due": a.get("due"), "title": title, "detail": detail,
                "short": re.split(r"[：:]", name)[0].strip()}
    else:
        sc = TM_SCENARIOS.get(a["ref"], {})
        name = (sc.get("title") or {}).get("zh" if zh else "en", a["ref"])
        title = (f"完成历史穿越：{name}" if zh else f"Finish the time machine: {name}")
        detail = (sc.get("tagline") or {}).get("zh" if zh else "en", "")
    return {"id": a["id"], "type": a["type"], "ref": a["ref"], "due": a.get("due"), "title": title, "detail": detail}


def _done(a: dict, prog: dict) -> bool:
    if a["type"] == "mission":
        return a["ref"] in prog["missions"]
    if a["type"] == "governor":
        return bool((prog["governor"].get(a["ref"]) or {}).get("finished"))
    return bool((prog["time_machine"].get(a["ref"]) or {}).get("finished"))


# ── Teacher ───────────────────────────────────────────────────────────────────

class CreateBody(BaseModel):
    name: str
    teacher_name: Optional[str] = None


def _clean_name(n: Optional[str], lo: int, hi: int, what: str) -> str:
    n = re.sub(r"\s+", " ", (n or "")).strip()
    if not (lo <= len(n) <= hi) or re.search(r"[<>\x00-\x1f]", n):
        raise HTTPException(400, f"{what}: {lo}–{hi} characters")
    return n


@router.post("/create")
def create(body: CreateBody):
    uid = _teacher()
    name = _clean_name(body.name, 2, 40, "Class name")
    teacher = _clean_name(body.teacher_name, 1, 30, "Teacher name") if (body.teacher_name or "").strip() else ""
    with _lock:
        if sum(1 for c in _all() if c["owner"] == uid) >= _MAX_CLASSES:
            raise HTTPException(400, f"Up to {_MAX_CLASSES} classes per teacher")
        codes = {c["code"] for c in _all()}
        code = next(c for c in ("".join(secrets.choice(_CODE_CHARS) for _ in range(6)) for _ in range(100)) if c not in codes)
        c = {"id": secrets.token_hex(6), "code": code, "name": name, "teacher_name": teacher, "owner": uid,
             "created": datetime.utcnow().isoformat() + "Z", "students": {}, "assignments": []}
        _write_json(_path(c["id"]), c)
    return {"id": c["id"], "code": code, "name": name}


@router.get("/mine")
def mine():
    uid = _teacher()
    rows = [c for c in _all() if c["owner"] == uid]
    rows.sort(key=lambda c: c["created"], reverse=True)
    return {"classes": [{"id": c["id"], "code": c["code"], "name": c["name"], "teacher_name": c.get("teacher_name", ""),
                         "students": len(c["students"]), "assignments": len(c["assignments"]), "created": c["created"]}
                        for c in rows]}


@router.get("/{cid}/dashboard")
def dashboard(cid: str, lang: Optional[str] = Query(None)):
    c = _own(cid)
    lang = lang if lang in _LANGS else "zh"
    values = _values()
    roster = []
    for key, s in c["students"].items():
        p = _progress(key, values)
        roster.append({"sid": _sid(key), "nickname": s["nickname"], "joined": s["joined"], **p,
                       "done": [a["id"] for a in c["assignments"] if _done(a, p)]})
    roster.sort(key=lambda r: r["nickname"].lower())
    assignments = []
    for a in c["assignments"]:
        v = _assignment_view(a, lang)
        v["completed"] = sum(1 for r in roster if a["id"] in r["done"])
        assignments.append(v)
    return {"class": {k: c[k] for k in ("id", "code", "name", "created")} | {"teacher_name": c.get("teacher_name", "")},
            "students": roster, "assignments": assignments,
            "options": {"missions": [{"id": mid, "title": text.get(lang if lang in text else "en")[0]} for mid, text in _MISSIONS.items()],
                        "time_machine": [{"id": sid, "title": sc["title"]["zh" if lang == "zh" else "en"]} for sid, sc in TM_SCENARIOS.items()],
                        "governor": [{"id": sid, "title": sc["title"]["zh" if lang == "zh" else "en"]} for sid, sc in GOV_SCENARIOS.items()]}}


class AssignBody(BaseModel):
    type: str
    ref: str
    due: Optional[str] = None


@router.post("/{cid}/assign")
def assign(cid: str, body: AssignBody):
    with _lock:
        c = _own(cid)
        if body.ref not in _TYPES.get(body.type, {}):
            raise HTTPException(400, "Unknown assignment")
        if body.due and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", body.due):
            raise HTTPException(400, "Due date: YYYY-MM-DD")
        if any(a["type"] == body.type and a["ref"] == body.ref for a in c["assignments"]):
            raise HTTPException(400, "Already assigned")
        if len(c["assignments"]) >= _MAX_ASSIGNMENTS:
            raise HTTPException(400, "Too many assignments")
        c["assignments"].append({"id": secrets.token_hex(4), "type": body.type, "ref": body.ref, "due": body.due or None,
                                 "created": datetime.utcnow().isoformat() + "Z"})
        _write_json(_path(cid), c)
    return {"ok": True}


class IdBody(BaseModel):
    id: str


@router.post("/{cid}/unassign")
def unassign(cid: str, body: IdBody):
    with _lock:
        c = _own(cid)
        c["assignments"] = [a for a in c["assignments"] if a["id"] != body.id]
        _write_json(_path(cid), c)
    return {"ok": True}


@router.post("/{cid}/remove")
def remove_student(cid: str, body: IdBody):
    with _lock:
        c = _own(cid)
        c["students"] = {k: v for k, v in c["students"].items() if _sid(k) != body.id}
        _write_json(_path(cid), c)
    return {"ok": True}


class RenameBody(BaseModel):
    name: str
    teacher_name: Optional[str] = None


@router.post("/{cid}/rename")
def rename(cid: str, body: RenameBody):
    with _lock:
        c = _own(cid)
        c["name"] = _clean_name(body.name, 2, 40, "Class name")
        if body.teacher_name is not None:
            c["teacher_name"] = _clean_name(body.teacher_name, 1, 30, "Teacher name") if body.teacher_name.strip() else ""
        _write_json(_path(cid), c)
    return {"ok": True}


@router.post("/{cid}/delete")
def delete(cid: str):
    with _lock:
        _own(cid)
        os.remove(_path(cid))
    return {"ok": True}


# ── Students ──────────────────────────────────────────────────────────────────

@router.get("/info/{code}")
def info(code: str):
    c = _by_code(code)
    if not c:
        raise HTTPException(404, "No class with that code")
    return {"code": c["code"], "name": c["name"], "teacher_name": c.get("teacher_name", ""), "students": len(c["students"])}


class JoinBody(BaseModel):
    code: str
    device_id: str
    nickname: str


@router.post("/join")
def join(body: JoinBody):
    _owner(body.device_id)
    key = _safe_id(body.device_id)
    nick = _clean_nick(body.nickname)
    if not nick:
        raise HTTPException(400, "Nickname required")
    with _lock:
        c = _by_code(body.code)
        if not c:
            raise HTTPException(404, "No class with that code")
        if key not in c["students"] and len(c["students"]) >= _MAX_STUDENTS:
            raise HTTPException(400, "This class is full")
        prev = c["students"].get(key) or {}
        c["students"][key] = {"nickname": nick, "joined": prev.get("joined") or datetime.utcnow().isoformat() + "Z"}
        _write_json(_path(c["id"]), c)
    return {"id": c["id"], "name": c["name"]}


class LeaveBody(BaseModel):
    class_id: str
    device_id: str


@router.post("/leave")
def leave(body: LeaveBody):
    _owner(body.device_id)
    with _lock:
        c = _load(body.class_id)
        if c and body.device_id in c["students"]:
            c["students"].pop(body.device_id)
            _write_json(_path(c["id"]), c)
    return {"ok": True}


class StudentBody(BaseModel):
    device_id: str
    lang: Optional[str] = None


@router.post("/student")
def student(body: StudentBody):
    """The classes this account has joined, with its assignments and the class leaderboard."""
    _owner(body.device_id)
    key = _safe_id(body.device_id)
    lang = body.lang if body.lang in _LANGS else "zh"
    mine = [c for c in _all() if key in c["students"]]
    if not mine:
        return {"classes": []}
    values = _values()
    out = []
    for c in sorted(mine, key=lambda c: c["students"][key]["joined"], reverse=True):
        progs = {k: _progress(k, values) for k in c["students"]}
        me = progs[key]
        board = sorted(({"nickname": s["nickname"], "missions": len(progs[k]["missions"]),
                         "done": sum(1 for a in c["assignments"] if _done(a, progs[k])),
                         "return_pct": progs[k]["returns"].get("us", progs[k]["returns"].get("cn")), "me": k == key}
                        for k, s in c["students"].items()),
                       key=lambda r: (-r["done"], -r["missions"], -(r["return_pct"] or -1e9)))
        out.append({"id": c["id"], "code": c["code"], "name": c["name"], "teacher_name": c.get("teacher_name", ""),
                    "nickname": c["students"][key]["nickname"],
                    "assignments": [{**_assignment_view(a, lang), "done": _done(a, me),
                                     **({"result": me["governor"].get(a["ref"])} if a["type"] == "governor" else {})}
                                    for a in c["assignments"]],
                    "leaderboard": board[:50]})
    return {"classes": out}
