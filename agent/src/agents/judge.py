"""Judge agent — synthesizes 4 school opinions into actionable recommendation."""

from src.config import SCHOOL_NAMES
from src.services.llm import call_llm, stream_llm
from collections.abc import AsyncGenerator

JUDGE_SYSTEM_PROMPT = """你是一位资深的普拉提教学总监，熟悉所有主流流派。

## 你的任务

综合 4 位流派顾问的意见，给出一份实用的训练建议方案。

## 输出格式（严格遵循）

### 训练重点
（1-2 句话概括本次课程重点方向）

### 推荐动作
（有序列表，每项包含动作名 + 简短说明）

### 注意事项
（安全提醒、禁忌、需关注的问题）

### 建议强度
（百分比 0-100 + 时长建议）

### 课程总结要点
（教练可直接用于课后记录的 2-3 条要点）

## 要求
1. 中文回答
2. 当流派间意见冲突时，以安全为先（北极星视角优先）
3. 输出必须是教练可直接"应用到课程"的具体内容，不是泛泛的描述
4. 控制在 500 字以内
"""


def build_judge_user_prompt(
    school_opinions: dict[str, str],
    member_profile: dict | None,
    question: str | None,
) -> str:
    parts = []
    if member_profile:
        parts.append(f"## 会员概况\n{_brief_profile(member_profile)}")
    if question:
        parts.append(f"## 教练关注\n{question}")

    parts.append("## 各流派意见")
    for school, opinion in school_opinions.items():
        name = SCHOOL_NAMES.get(school, school)
        parts.append(f"### {name}\n{opinion}")

    return "\n\n".join(parts)


async def run_judge(
    school_opinions: dict[str, str],
    member_profile: dict | None = None,
    question: str | None = None,
) -> str:
    messages = [
        {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
        {"role": "user", "content": build_judge_user_prompt(school_opinions, member_profile, question)},
    ]
    return await call_llm(messages, max_tokens=2500)


async def stream_judge(
    school_opinions: dict[str, str],
    member_profile: dict | None = None,
    question: str | None = None,
) -> AsyncGenerator[str, None]:
    messages = [
        {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
        {"role": "user", "content": build_judge_user_prompt(school_opinions, member_profile, question)},
    ]
    async for chunk in stream_llm(messages, max_tokens=2500):
        yield chunk


def _brief_profile(profile: dict) -> str:
    keys = ["name", "age", "conditions", "goals", "notes"]
    lines = [f"- {k}: {profile[k]}" for k in keys if profile.get(k)]
    return "\n".join(lines) if lines else "（无）"
