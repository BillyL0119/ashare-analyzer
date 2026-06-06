"""
Stock Comments — /api/comments/*

User comments per stock symbol, with sentiment voting and likes.
Data stored in backend/data/comments/{symbol}.json
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import json
import fcntl
import uuid
import logging
import re

router = APIRouter()
logger = logging.getLogger("comments")

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "comments")
_BEIJING_TZ = timezone(timedelta(hours=8))

# Simple sensitive word filter (basic list)
_SENSITIVE = [
    "fuck", "shit", "asshole", "bitch", "cunt",
    "草泥马", "操你", "傻逼", "煞笔", "滚蛋", "垃圾人",
]

VALID_SENTIMENTS = {"bullish", "bearish", "neutral"}
MAX_COMMENT_LEN = 500
MIN_COMMENT_LEN = 10
HOURLY_LIMIT = 5


# ── helpers ───────────────────────────────────────────────────────────────────

def _file(symbol: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9.\-]", "_", symbol.upper())
    return os.path.join(_DATA_DIR, f"{safe}.json")


def _load(symbol: str) -> list:
    path = _file(symbol)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save(symbol: str, comments: list) -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    path = _file(symbol)
    with open(path, "w", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            json.dump(comments, f, ensure_ascii=False, indent=2)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _locked_update(symbol: str, fn):
    lock_path = _file(symbol) + ".lock"
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(lock_path, "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            comments = _load(symbol)
            result = fn(comments)
            _save(symbol, comments)
            return result
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def _contains_sensitive(text: str) -> bool:
    lower = text.lower()
    return any(w in lower for w in _SENSITIVE)


def _now_str() -> str:
    return datetime.now(_BEIJING_TZ).isoformat(timespec="seconds")


def _sentiment_stats(comments: list) -> dict:
    total = len(comments)
    if total == 0:
        return {"total": 0, "bullish_pct": 0, "neutral_pct": 0, "bearish_pct": 0}
    counts = {"bullish": 0, "neutral": 0, "bearish": 0}
    for c in comments:
        counts[c.get("sentiment", "neutral")] = counts.get(c.get("sentiment", "neutral"), 0) + 1
    return {
        "total": total,
        "bullish_pct": round(counts["bullish"] / total * 100, 1),
        "neutral_pct":  round(counts["neutral"]  / total * 100, 1),
        "bearish_pct":  round(counts["bearish"]  / total * 100, 1),
    }


# ── models ────────────────────────────────────────────────────────────────────

class CommentBody(BaseModel):
    nickname: str
    content: str
    sentiment: str
    device_id: str


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{symbol}")
def get_comments(
    symbol: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    device_id: str = Query(""),
):
    comments = _load(symbol)
    # newest first
    comments_sorted = sorted(comments, key=lambda c: c["timestamp"], reverse=True)
    stats = _sentiment_stats(comments)

    start = (page - 1) * limit
    end   = start + limit
    page_items = comments_sorted[start:end]

    # Mark liked by current device
    liked_ids = set()
    if device_id:
        for c in comments:
            if device_id in c.get("liked_by", []):
                liked_ids.add(c["id"])

    out = []
    for c in page_items:
        out.append({
            "id":        c["id"],
            "nickname":  c["nickname"],
            "content":   c["content"],
            "sentiment": c["sentiment"],
            "timestamp": c["timestamp"],
            "likes":     c["likes"],
            "liked":     c["id"] in liked_ids,
        })

    return {
        "comments": out,
        "stats":    stats,
        "page":     page,
        "pages":    max(1, -(-len(comments) // limit)),  # ceiling div
    }


@router.post("/{symbol}")
def post_comment(symbol: str, body: CommentBody):
    # Validate
    nickname = body.nickname.strip()[:30] or "匿名用户"
    content  = body.content.strip()
    sentiment = body.sentiment.lower()

    if sentiment not in VALID_SENTIMENTS:
        raise HTTPException(400, "sentiment must be bullish/bearish/neutral")
    if len(content) < MIN_COMMENT_LEN:
        raise HTTPException(400, f"评论至少 {MIN_COMMENT_LEN} 字 / min {MIN_COMMENT_LEN} chars")
    if len(content) > MAX_COMMENT_LEN:
        raise HTTPException(400, f"评论最多 {MAX_COMMENT_LEN} 字 / max {MAX_COMMENT_LEN} chars")
    if _contains_sensitive(content) or _contains_sensitive(nickname):
        raise HTTPException(400, "内容包含不当词语 / Content contains inappropriate words")

    new_id = str(uuid.uuid4())
    now    = _now_str()

    def mutate(comments: list):
        # Rate limit: same device_id, last hour
        cutoff = (datetime.now(_BEIJING_TZ) - timedelta(hours=1)).isoformat(timespec="seconds")
        recent = [c for c in comments
                  if c.get("device_id") == body.device_id and c["timestamp"] >= cutoff]
        if len(recent) >= HOURLY_LIMIT:
            raise HTTPException(429, f"每小时最多 {HOURLY_LIMIT} 条评论 / max {HOURLY_LIMIT} per hour")

        comments.append({
            "id":        new_id,
            "symbol":    symbol.upper(),
            "nickname":  nickname,
            "content":   content,
            "sentiment": sentiment,
            "timestamp": now,
            "likes":     0,
            "liked_by":  [],
            "device_id": body.device_id,
        })

    _locked_update(symbol, mutate)
    return {"ok": True, "id": new_id}


@router.post("/{symbol}/{comment_id}/like")
def like_comment(symbol: str, comment_id: str, body: dict):
    device_id = body.get("device_id", "")
    if not device_id:
        raise HTTPException(400, "device_id required")

    result = {"ok": False, "likes": 0}

    def mutate(comments: list):
        for c in comments:
            if c["id"] == comment_id:
                liked_by = c.setdefault("liked_by", [])
                if device_id in liked_by:
                    # Unlike
                    liked_by.remove(device_id)
                    c["likes"] = max(0, c["likes"] - 1)
                    result["liked"] = False
                else:
                    liked_by.append(device_id)
                    c["likes"] += 1
                    result["liked"] = True
                result["ok"]    = True
                result["likes"] = c["likes"]
                break

    _locked_update(symbol, mutate)
    return result
