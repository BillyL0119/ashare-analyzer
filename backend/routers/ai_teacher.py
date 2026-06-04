"""
AI Teacher — /api/ai/chat
Streaming chat powered by Google Gemini 1.5 Flash.
Rate limit: 10 requests / device / minute.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from collections import defaultdict
import asyncio
import threading
import json
import time
import logging
import os

router = APIRouter()
logger = logging.getLogger("ai_teacher")

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCf1zskn9rqw5c8hmIMy_EuhViUudgMHvc")

SYSTEM_PROMPT = (
    "你是 BestFriendStock 的 AI 老师，专为学生设计。你擅长：\n"
    "1. 股票技术分析（K线、MACD、RSI、均线等指标解读）\n"
    "2. 基本面分析（PE、PB、财务报表解读）\n"
    "3. A-Level Economics (9708) / AP Macro / AP Micro / IB Economics 考点讲解\n"
    "4. 用真实市场案例解释经济学概念（AD-AS、货币政策、汇率等）\n"
    "根据用户提问语言自动用中文或英文回答，回答简洁清晰，适合学生理解。"
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
_rate_store: dict = defaultdict(list)  # device_id → [timestamps]


def _check_rate(device_id: str, limit: int = 10) -> bool:
    now = time.time()
    ts = _rate_store[device_id]
    ts[:] = [t for t in ts if now - t < 60]
    if len(ts) >= limit:
        return False
    ts.append(now)
    return True


# ── Request schema ────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str      # "user" | "assistant"
    content: str


class ChatBody(BaseModel):
    message: str
    history: list[ChatMessage] = []
    device_id: Optional[str] = "anon"


# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.post("/chat")
async def ai_chat(body: ChatBody):
    device_id = body.device_id or "anon"
    if not _check_rate(device_id):
        raise HTTPException(status_code=429, detail="Rate limit: 10 requests/minute per device.")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Empty message.")

    async def event_stream():
        q: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def _run():
            try:
                from google import genai as google_genai
                from google.genai import types as genai_types

                client = google_genai.Client(api_key=GEMINI_KEY)

                # Build full contents list: history + new message
                contents = []
                for m in body.history:
                    if not m.content.strip():
                        continue
                    role = "model" if m.role == "assistant" else "user"
                    contents.append(
                        genai_types.Content(
                            role=role,
                            parts=[genai_types.Part(text=m.content)],
                        )
                    )
                contents.append(
                    genai_types.Content(
                        role="user",
                        parts=[genai_types.Part(text=body.message)],
                    )
                )

                cfg = genai_types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=800,
                )

                for chunk in client.models.generate_content_stream(
                    model="gemini-2.0-flash-lite",
                    contents=contents,
                    config=cfg,
                ):
                    try:
                        txt = chunk.text
                        if txt:
                            asyncio.run_coroutine_threadsafe(
                                q.put({"text": txt}), loop
                            )
                    except Exception:
                        pass
            except Exception as exc:
                asyncio.run_coroutine_threadsafe(
                    q.put({"error": str(exc)}), loop
                )
            finally:
                asyncio.run_coroutine_threadsafe(q.put(None), loop)

        threading.Thread(target=_run, daemon=True).start()

        while True:
            item = await q.get()
            if item is None:
                yield 'data: {"done":true}\n\n'
                break
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
