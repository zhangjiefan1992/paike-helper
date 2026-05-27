"""School agent — one per pilates school (Romana, Stott, Polestar, BASI)."""

from collections.abc import AsyncGenerator

from src.config import SCHOOL_NAMES
from src.services.knowledge import load_school_wiki
from src.services.llm import call_llm, stream_llm

SCHOOL_SYSTEM_TEMPLATE = """你是一位资深的{school_name}流派普拉提教练顾问。

## 你的知识库

{wiki_content}

## 你的角色

根据提供的会员信息和教练的问题，从{school_name}流派的视角给出专业建议。

## 输出要求

1. 用中文回答
2. 结构化分点输出
3. 如有安全风险或超出本流派范围，明确标注
4. 控制在 300 字以内
"""


def build_system_prompt(school: str) -> str:
    wiki = load_school_wiki(school)
    return SCHOOL_SYSTEM_TEMPLATE.format(
        school_name=SCHOOL_NAMES[school],
        wiki_content=wiki,
    )


def build_user_prompt(member_profile: dict | None, recent_sessions: list[dict] | None, question: str | None) -> str:
    parts = []
    if member_profile:
        parts.append(f"## 会员档案\n{_format_profile(member_profile)}")
    if recent_sessions:
        parts.append(f"## 近期课程\n{_format_sessions(recent_sessions)}")
    if question:
        parts.append(f"## 教练提问\n{question}")
    if not parts:
        parts.append("请根据会员信息给出训练建议。")
    return "\n\n".join(parts)


async def run_school_agent(school: str, member_profile: dict | None, recent_sessions: list[dict] | None, question: str | None) -> str:
    messages = [
        {"role": "system", "content": build_system_prompt(school)},
        {"role": "user", "content": build_user_prompt(member_profile, recent_sessions, question)},
    ]
    return await call_llm(messages)


async def stream_school_agent(school: str, member_profile: dict | None, recent_sessions: list[dict] | None, question: str | None) -> AsyncGenerator[str, None]:
    messages = [
        {"role": "system", "content": build_system_prompt(school)},
        {"role": "user", "content": build_user_prompt(member_profile, recent_sessions, question)},
    ]
    async for chunk in stream_llm(messages):
        yield chunk


def _format_profile(profile: dict) -> str:
    lines = []
    for k, v in profile.items():
        if v:
            lines.append(f"- {k}: {v}")
    return "\n".join(lines) if lines else "（无详细档案）"


def _format_sessions(sessions: list[dict]) -> str:
    lines = []
    for s in sessions[-5:]:
        date = s.get("date", "?")
        items = s.get("trainingItems", s.get("notes", ""))
        if isinstance(items, list):
            items = "、".join(items)
        lines.append(f"- {date}: {items}")
    return "\n".join(lines) if lines else "（无近期记录）"
