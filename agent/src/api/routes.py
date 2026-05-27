"""Agent API routes — consult (SSE streaming) + followup."""

import json
import uuid

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.agents.pipeline import run_consultation, stream_consultation

router = APIRouter()

# In-memory conversation store (Phase A — single instance, no persistence needed)
_conversations: dict[str, dict] = {}


class ConsultRequest(BaseModel):
    member_id: str
    member_profile: dict | None = None
    recent_sessions: list[dict] | None = None
    coach_question: str | None = None
    stream: bool = True


class FollowupRequest(BaseModel):
    conversation_id: str
    message: str
    stream: bool = True


@router.post("/consult")
async def consult(req: ConsultRequest, request: Request):
    if req.stream:
        return EventSourceResponse(_stream_consult(req, request))

    result = await run_consultation(
        member_profile=req.member_profile,
        recent_sessions=req.recent_sessions,
        question=req.coach_question,
    )
    conv_id = _save_conversation(req, result)
    return {"code": 0, "data": {**result, "conversation_id": conv_id}}


@router.post("/followup")
async def followup(req: FollowupRequest):
    conv = _conversations.get(req.conversation_id)
    if not conv:
        return {"code": 1, "message": "会话不存在或已过期"}

    # For followup, run judge-only with prior context + new question
    from src.agents.judge import run_judge

    result = await run_judge(
        school_opinions=conv["school_opinions"],
        member_profile=conv.get("member_profile"),
        question=req.message,
    )
    conv["followups"].append({"question": req.message, "answer": result})
    return {"code": 0, "data": {"answer": result, "conversation_id": req.conversation_id}}


async def _stream_consult(req: ConsultRequest, request: Request):
    async for event in stream_consultation(
        member_profile=req.member_profile,
        recent_sessions=req.recent_sessions,
        question=req.coach_question,
    ):
        if await request.is_disconnected():
            break
        yield {"event": event["type"], "data": json.dumps(event, ensure_ascii=False)}


def _save_conversation(req: ConsultRequest, result: dict) -> str:
    conv_id = str(uuid.uuid4())[:8]
    _conversations[conv_id] = {
        "member_id": req.member_id,
        "member_profile": req.member_profile,
        "school_opinions": {k: v["opinion"] for k, v in result["schools"].items()},
        "synthesis": result["synthesis"],
        "followups": [],
    }
    # Keep max 50 conversations in memory
    if len(_conversations) > 50:
        oldest = next(iter(_conversations))
        del _conversations[oldest]
    return conv_id
