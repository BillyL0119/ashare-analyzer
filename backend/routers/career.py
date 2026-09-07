"""
Career Guide — /api/career/
- POST /mock-interview  → DeepSeek streaming mock interview
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import threading
import json
import time
import logging
import os
from collections import defaultdict

router = APIRouter()
logger = logging.getLogger("career")

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

# ── Rate limiting ──────────────────────────────────────────────────────────────
_rate_store: dict = defaultdict(list)


def _check_rate(device_id: str, limit: int = 6) -> bool:
    now = time.time()
    ts = _rate_store[device_id]
    ts[:] = [t for t in ts if now - t < 60]
    if len(ts) >= limit:
        return False
    ts.append(now)
    return True


# ── Schemas ───────────────────────────────────────────────────────────────────
class MockInterviewBody(BaseModel):
    role: str           # "IBD" | "EquityResearch" | "ST" | "AM" | "PE" | "Quant" | "CorpFinance" | "Risk"
    interview_type: str # "technical" | "behavioral" | "comprehensive"
    history: list[dict] = []
    device_id: Optional[str] = "anon"
    lang: Optional[str] = "zh"


# ── Prompt builder ────────────────────────────────────────────────────────────
ROLE_ZH = {
    "IBD":           "投资银行部（IBD）",
    "EquityResearch": "股票研究（Equity Research）",
    "ST":            "销售与交易（Sales & Trading）",
    "AM":            "资产管理（Asset Management）",
    "PE":            "私募股权（Private Equity）",
    "Quant":         "量化金融（Quant Research / Quant Trading）",
    "CorpFinance":   "企业财务（Corporate Finance / FP&A）",
    "Risk":          "风险管理与合规（Risk & Compliance）",
}

ROLE_EN = {
    "IBD":           "Investment Banking (IBD)",
    "EquityResearch": "Equity Research",
    "ST":            "Sales & Trading",
    "AM":            "Asset Management",
    "PE":            "Private Equity",
    "Quant":         "Quantitative Finance (Quant Research / Quant Trading)",
    "CorpFinance":   "Corporate Finance / FP&A",
    "Risk":          "Risk Management & Compliance",
}

TYPE_ZH = {
    "technical":    "技术面试（财务建模、估值方法、专业概念）",
    "behavioral":   "行为面试（过往经历、职业动机、团队合作）",
    "comprehensive":"综合面试（技术面+行为面混合）",
}

TYPE_EN = {
    "technical":    "Technical Interview (financial modeling, valuation, domain knowledge)",
    "behavioral":   "Behavioral Interview (past experiences, motivation, teamwork)",
    "comprehensive":"Comprehensive Interview (technical + behavioral combined)",
}


def _build_system_prompt(role: str, interview_type: str, lang: str) -> str:
    is_zh = lang != "en"
    role_label = ROLE_ZH.get(role, role) if is_zh else ROLE_EN.get(role, role)
    type_label = TYPE_ZH.get(interview_type, interview_type) if is_zh else TYPE_EN.get(interview_type, interview_type)

    if is_zh:
        return (
            f"你是一位在顶级投行/基金工作超过10年的资深面试官，正在对一名申请{role_label}职位的候选人进行{type_label}。\n\n"
            "面试规则（必须严格遵守）：\n"
            "1. 每次只问一个问题，等候选人回答后再继续。\n"
            "2. 对候选人的回答给出1-2句简短的过渡性点评（不评分，不说\"很好\"这样空洞的话），然后顺势提出下一个问题。\n"
            "3. 进行4-5轮问答后，当你认为评估已充分，输出标记 [FEEDBACK_START] 然后给出完整的面试反馈。\n"
            "4. 反馈格式（使用**加粗**标题）：\n"
            "   **总体评分**：X / 10\n"
            "   **突出优势**：（2-3条具体的表现亮点）\n"
            "   **待改进之处**：（2-3条具体的薄弱点）\n"
            "   **针对性建议**：（如何提升薄弱点，越具体越好）\n"
            "5. 语气：专业、直接，但有建设性，像一位真正希望候选人成长的前辈。\n"
            "6. 不主动给出\"标准答案\"，通过追问引导候选人展示更深的理解。\n\n"
            "现在开始：先用一句话介绍你自己和本次面试的背景，然后提第一个问题。"
        )
    else:
        return (
            f"You are a senior finance professional with 10+ years at a top-tier investment bank or fund, "
            f"conducting a {type_label} for a candidate applying for a {role_label} position.\n\n"
            "Interview rules (strictly follow):\n"
            "1. Ask only ONE question at a time. Wait for the candidate's answer before continuing.\n"
            "2. Give a brief 1-2 sentence transitional comment on the answer (constructive, not hollow praise), "
            "then naturally ask the next question.\n"
            "3. After 4-5 Q&A rounds, when you feel the evaluation is sufficient, output [FEEDBACK_START] "
            "then provide complete interview feedback.\n"
            "4. Feedback format (use **bold** headers):\n"
            "   **Overall Score**: X / 10\n"
            "   **Key Strengths**: (2-3 specific highlights)\n"
            "   **Areas for Improvement**: (2-3 specific weaknesses)\n"
            "   **Targeted Advice**: (specific steps to improve weak areas)\n"
            "5. Tone: professional and direct, but constructive — like a senior who genuinely wants you to succeed.\n"
            "6. Don't volunteer the 'model answer'; use follow-up questions to draw out deeper understanding.\n\n"
            "Begin now: introduce yourself and the interview context in one sentence, then ask your first question."
        )


# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.post("/mock-interview")
async def mock_interview(body: MockInterviewBody):
    device_id = body.device_id or "anon"
    if not _check_rate(device_id):
        raise HTTPException(status_code=429, detail="Rate limit: 6 requests/minute per device.")

    if not DEEPSEEK_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured.")

    async def event_stream():
        q: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def _run():
            try:
                from openai import OpenAI
                client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com")

                system_prompt = _build_system_prompt(body.role, body.interview_type, body.lang or "zh")
                messages = [{"role": "system", "content": system_prompt}]

                for m in body.history:
                    role = m.get("role", "user")
                    content = m.get("content", "")
                    if content.strip() and role in ("user", "assistant"):
                        messages.append({"role": role, "content": content})

                stream = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=messages,
                    max_tokens=700,
                    stream=True,
                )

                for chunk in stream:
                    txt = chunk.choices[0].delta.content
                    if txt:
                        asyncio.run_coroutine_threadsafe(q.put({"text": txt}), loop)
            except Exception as exc:
                asyncio.run_coroutine_threadsafe(q.put({"error": str(exc)}), loop)
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
