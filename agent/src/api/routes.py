"""Agent API routes — consult + followup."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ConsultRequest(BaseModel):
    member_id: str
    member_profile: dict | None = None
    recent_sessions: list[dict] | None = None
    coach_question: str | None = None


class FollowupRequest(BaseModel):
    conversation_id: str
    message: str


@router.post("/consult")
async def consult(req: ConsultRequest):
    # TODO: Task #33 — wire up school agents + judge
    return {"code": 0, "message": "not implemented yet"}


@router.post("/followup")
async def followup(req: FollowupRequest):
    # TODO: Task #33 — continue conversation
    return {"code": 0, "message": "not implemented yet"}
