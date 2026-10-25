"""
Why did it move? — /api/moves

The biggest daily moves of a US stock or A-share over the last year, each with the facts on record
for that day (market and sector moves, SEC filings, Fed decision days, headlines, cninfo
announcements); an AI explanation from those facts alone is written when a student asks for it.
"""
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services import move_reasons as M

router = APIRouter()
_SYM = {"us": re.compile(r"[A-Z][A-Z.\-]{0,9}"), "cn": re.compile(r"\d{6}")}


def _check(market: str, symbol: str) -> str:
    sym = symbol.upper().replace("-", ".") if market == "us" else symbol
    if market not in _SYM or not _SYM[market].fullmatch(sym):
        raise HTTPException(400, "US ticker or 6-digit A-share code required")
    return sym


@router.get("/{market}/{symbol}")
def moves(market: str, symbol: str, lang: Optional[str] = Query(None)):
    sym = _check(market, symbol)
    try:
        data = M.big_moves(market, sym)
    except Exception:
        raise HTTPException(503, "Price history is not available right now")
    part = "zh" if lang == "zh" else "en"
    days = []
    for d in data["days"]:
        ex = M.cached_explanation(market, sym, d["date"])
        f = d["facts"]
        days.append({**d, "facts": {**f, "filings": [{**x, "labels": [M._ITEMS[i][0 if part == "zh" else 1] for i in x["items"]]
                                                      or ([M._FORMS[x["form"]][0 if part == "zh" else 1]] if x["form"] in M._FORMS else [])}
                                                     for x in f["filings"]]},
                     "explanation": ex.get(part) if ex else None})
    return {**data, "days": days}


class ExplainBody(BaseModel):
    date: str
    lang: Optional[str] = None


@router.post("/{market}/{symbol}/explain")
def explain(market: str, symbol: str, body: ExplainBody):
    sym = _check(market, symbol)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", body.date):
        raise HTTPException(400, "date: YYYY-MM-DD")
    res = M.explain(market, sym, body.date)
    if not res:
        raise HTTPException(503, "No explanation available for this day right now")
    return {"date": body.date, "text": res["zh" if body.lang == "zh" else "en"]}
