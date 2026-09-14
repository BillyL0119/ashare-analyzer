"""
University Guide API — /api/universities/*
Global business school directory with QS ranking data.
Also provides mock interview + admission assessment via DeepSeek.
"""

import json
import os
import time
import threading
import asyncio
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'universities.json')
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

# ── Rate limiter (shared across interview endpoints) ───────────────────────────
_iv_rate: dict = defaultdict(list)

def _iv_rate_ok(device_id: str, limit: int = 8) -> bool:
    now = time.time()
    ts = _iv_rate[device_id]
    ts[:] = [t for t in ts if now - t < 60]
    if len(ts) >= limit:
        return False
    ts.append(now)
    return True


# ── Pydantic models ────────────────────────────────────────────────────────────
class IvProfile(BaseModel):
    school: str
    program: str = ""
    gpa: str = ""
    test_type: str = ""
    test_score: str = ""
    subjects: str = ""
    activities: str = ""
    lang: str = "zh"        # "zh" | "en"

class IvMsg(BaseModel):
    role: str               # "user" | "assistant"
    content: str

class IvChatBody(BaseModel):
    profile: IvProfile
    history: List[IvMsg] = []
    device_id: str = "anon"

class IvReportBody(BaseModel):
    profile: IvProfile
    history: List[IvMsg] = []
    device_id: str = "anon"


# ── System prompts ─────────────────────────────────────────────────────────────
def _interviewer_system(p: IvProfile) -> str:
    ln = "中文" if p.lang == "zh" else "English"
    return (
        f"你是{p.school}的招生面试官，请全程用{ln}进行面试。\n\n"
        "申请人资料（仅供参考——通过提问去了解和验证，不要直接报出）：\n"
        f"• 申请项目：{p.program or '商学院项目'}\n"
        f"• GPA：{p.gpa or '未提供'}\n"
        f"• 标化考试：{p.test_type} {p.test_score}\n"
        f"• 科目成绩：{p.subjects or '未提供'}\n"
        f"• 课外活动：{p.activities or '未提供'}\n\n"
        "面试规则：\n"
        "1. 每次只问1-2个问题，等对方回答后再继续，保持对话流程自然\n"
        "2. 若候选人回答笼统（如"我参加了商赛"），必须追问：具体做了什么、"
        "你的角色是什么、量化结果如何、你学到了什么\n"
        f"3. 覆盖话题：申请动机（Why {p.school}? Why this programme?）、"
        "学术深度、课外活动影响力、未来规划\n"
        "4. 语气严格专业——不无脑夸奖，但也不打击学生；不认可时礼貌追问而非赞扬\n"
        "5. 经过4-5轮对话后，做简短收尾：说一个深刻印象 + 一个仍存在的疑虑\n\n"
        "现在开始：简短自我介绍（面试官身份），然后提第一个问题。"
    )

def _report_system(p: IvProfile) -> str:
    ln = "中文" if p.lang == "zh" else "English"
    return (
        f"你是一位资深商学院申请顾问，请用{ln}生成结构化评估报告。\n\n"
        f"申请人：{p.school} — {p.program} | GPA: {p.gpa or 'N/A'} | "
        f"{p.test_type} {p.test_score} | 活动: {p.activities or 'N/A'}\n\n"
        "请严格按以下格式输出，不要省略任何一节：\n\n"
        "## 📊 录取概率粗略参考\n"
        "**区间：XX%–XX%**（必须用区间，绝不能精确到单个数字）\n"
        f"2-3句话说明依据（对照{p.school}公开录取率和典型录取学生背景进行对比）。\n\n"
        "⚠️ **免责声明：** 此评估基于公开录取数据的一般规律与AI分析，不代表官方立场，"
        "不构成录取保证，仅供申请策略参考。实际录取受文书质量、推荐信、面试表现、"
        "当年竞争激烈程度等AI无法评估的因素影响。\n\n"
        "---\n\n"
        "## ✅ 申请优势\n"
        "列出3-4个具体优势，每条带简短说明。\n\n"
        "---\n\n"
        "## 📈 待改进项与建议\n"
        "列出2-3个短板，每个配具体可执行的改进建议"
        "（例："目标院校重视量化背景，建议修读统计学AP课程或参加数据分析竞赛"）。\n\n"
        "---\n\n"
        "## 🎙️ 面试表现反馈\n"
        "基于模拟面试记录：\n"
        "- **亮点：** 哪些回答有说服力、展示了真实深度\n"
        "- **待改进：** 哪些回答过于笼统或细节不足\n"
        "- **备考建议：** 2-3条针对真实面试的准备建议\n\n"
        "---\n\n"
        "## 🚦 AI无法评估的关键因素\n"
        "明确列出并说明：文书/个人陈述质量、推荐信内容、真实面试发挥、"
        "当年申请竞争情况、招生官主观判断——这些因素可能比成绩本身更影响最终结果。"
    )


# ── Shared SSE streamer ────────────────────────────────────────────────────────
def _stream_deepseek(system_prompt: str, messages: list) -> StreamingResponse:
    async def gen():
        q: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def _run():
            try:
                from openai import OpenAI
                client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com")
                stream = client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[{"role": "system", "content": system_prompt}] + messages,
                    stream=True,
                    max_tokens=1800,
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

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── Interview endpoints ────────────────────────────────────────────────────────
@router.post("/interview/chat")
async def interview_chat(body: IvChatBody):
    """Streaming mock interview — each call appends candidate reply and returns next interviewer turn."""
    if not _iv_rate_ok(body.device_id):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍候再试。")
    if not DEEPSEEK_KEY:
        raise HTTPException(status_code=503, detail="AI服务未配置。")
    msgs = [{"role": m.role, "content": m.content} for m in body.history]
    return _stream_deepseek(_interviewer_system(body.profile), msgs)


@router.post("/interview/report")
async def interview_report(body: IvReportBody):
    """Generate the final admission assessment report after the mock interview."""
    if not _iv_rate_ok(body.device_id):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍候再试。")
    if not DEEPSEEK_KEY:
        raise HTTPException(status_code=503, detail="AI服务未配置。")
    transcript = "\n\n".join(
        f"{'【面试官】' if m.role == 'assistant' else '【申请人】'}: {m.content}"
        for m in body.history
    )
    user_msg = f"以下是完整的模拟面试记录：\n\n{transcript}\n\n请生成评估报告。"
    return _stream_deepseek(_report_system(body.profile), [{"role": "user", "content": user_msg}])

def load_universities():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get('')
def list_universities(
    region:    Optional[str] = Query(None, description='north_america / uk / europe / asia / oceania'),
    specialty: Optional[str] = Query(None, description='Finance / Accounting / Economics / Consulting / Tech'),
    language:  Optional[str] = Query(None, description='english / bilingual'),
    search:    Optional[str] = Query(None, description='Search in name / university / city'),
):
    unis = load_universities()

    if region:
        unis = [u for u in unis if u.get('region') == region.lower()]

    if language:
        unis = [u for u in unis if u.get('language') == language.lower()]

    if specialty:
        kw = specialty.lower()
        unis = [
            u for u in unis
            if any(kw in s.lower() for s in u.get('specialties', []))
            or any(kw in t.lower() for t in u.get('tags', []))
        ]

    if search:
        kw = search.lower()
        unis = [
            u for u in unis
            if kw in u.get('name', '').lower()
            or kw in u.get('university', '').lower()
            or kw in u.get('city', '').lower()
            or kw in u.get('country', '').lower()
        ]

    return unis


@router.get('/stats')
def get_stats():
    unis = load_universities()
    countries = list({u['country'] for u in unis})
    languages = list({u.get('language', 'english') for u in unis})
    return {
        'total': len(unis),
        'countries': len(countries),
        'languages': len(languages),
        'country_list': sorted(countries),
    }


@router.get('/{uni_id}')
def get_university(uni_id: str):
    unis = load_universities()
    match = next((u for u in unis if u['id'] == uni_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f'University {uni_id!r} not found')
    return match
