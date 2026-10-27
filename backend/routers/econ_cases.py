"""
Essay-example library — /api/cases

Real news articles turned into economics case studies (services/econ_cases.py), filterable by
exam board, concept and keyword. Read-only; the library grows in the background.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services import econ_cases
from services.econ_concepts import BOARDS, CONCEPTS, concept_view
from services.econ_diagrams import diagram_view

router = APIRouter()
_LANGS = ("zh", "en", "ja", "ko", "fr")


def _lang(lang: Optional[str]) -> str:
    return lang if lang in _LANGS else "zh"


def _view(c: dict, lang: str) -> dict:
    part = c.get("zh" if lang == "zh" else "en") or c.get("en") or {}
    return {
        "id": c["id"], "date": (c.get("published_at") or "")[:10], "source": c.get("source"), "url": c["url"],
        "title": c["title"], "source_lang": c.get("source_lang"),
        "concepts": [{"id": k, "name": concept_view(k, lang)["name"]} for k in c["concepts"] if k in CONCEPTS],
        "what": part.get("what"), "angle": part.get("angle"), "evaluate": part.get("evaluate"),
        "question": part.get("question"), "data": part.get("data") or [],
        "diagram": diagram_view(c),
    }


def _on_board(c: dict, board: str) -> bool:
    return any(board in CONCEPTS[k][4] for k in c["concepts"] if k in CONCEPTS)


@router.get("")
def list_cases(lang: Optional[str] = Query(None), concept: Optional[str] = Query(None),
               board: Optional[str] = Query(None), q: Optional[str] = Query(None, max_length=60),
               diagram: Optional[str] = Query(None, max_length=20),
               limit: int = Query(20, ge=1, le=50), offset: int = Query(0, ge=0, le=5000)):
    lang = _lang(lang)
    items = econ_cases.cases()
    if diagram:
        # Cases whose stored preset draws on this diagram (the lab's "in the news" list)
        items = [c for c in items if (v := diagram_view(c)) and v["id"] == diagram and v["preset"]]
    if board in BOARDS:
        items = [c for c in items if _on_board(c, board)]
    counts: dict = {}
    for c in items:
        for k in c["concepts"]:
            counts[k] = counts.get(k, 0) + 1
    if concept in CONCEPTS:
        items = [c for c in items if concept in c["concepts"]]
    if q and q.strip():
        needle = q.strip().lower()
        part = "zh" if lang == "zh" else "en"
        items = [c for c in items if needle in " ".join([c["title"], *(str(v) for v in (c.get(part) or {}).values())]).lower()]
    return {"cases": [_view(c, lang) for c in items[offset:offset + limit]], "total": len(items),
            "counts": counts, "status": econ_cases.status()}


@router.get("/concepts")
def concepts(lang: Optional[str] = Query(None)):
    lang = _lang(lang)
    counts: dict = {}
    for c in econ_cases.cases():
        for k in c["concepts"]:
            counts[k] = counts.get(k, 0) + 1
    return {"concepts": [{**concept_view(k, lang), "count": counts.get(k, 0)} for k in CONCEPTS], "boards": list(BOARDS)}


@router.get("/item/{case_id}")
def one_case(case_id: str, lang: Optional[str] = Query(None)):
    c = next((c for c in econ_cases.cases() if c["id"] == case_id), None)
    if not c:
        raise HTTPException(404, "Case not found")
    out = _view(c, _lang(lang))
    out["concept_details"] = [concept_view(k, _lang(lang)) for k in c["concepts"] if k in CONCEPTS]
    return out
