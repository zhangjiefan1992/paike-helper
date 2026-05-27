"""Consultation pipeline — 4 school agents in parallel → judge synthesis."""

import asyncio
from collections.abc import AsyncGenerator

from src.agents.judge import run_judge, stream_judge
from src.agents.school import run_school_agent, stream_school_agent
from src.config import SCHOOL_NAMES, SCHOOLS


async def run_consultation(
    member_profile: dict | None = None,
    recent_sessions: list[dict] | None = None,
    question: str | None = None,
) -> dict:
    """Run full consultation: 4 schools parallel → judge. Returns complete result."""
    school_opinions = await _run_all_schools(member_profile, recent_sessions, question)
    judge_result = await run_judge(school_opinions, member_profile, question)
    return {
        "schools": {k: {"name": SCHOOL_NAMES[k], "opinion": v} for k, v in school_opinions.items()},
        "synthesis": judge_result,
    }


async def stream_consultation(
    member_profile: dict | None = None,
    recent_sessions: list[dict] | None = None,
    question: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream consultation as SSE events.

    Event types:
      - school_start: { school, name }
      - school_chunk: { school, chunk }
      - school_done:  { school }
      - judge_start:  {}
      - judge_chunk:  { chunk }
      - judge_done:   {}
      - done:         {}
    """
    school_opinions = {}

    async def _stream_one_school(school: str):
        chunks = []
        yield {"type": "school_start", "school": school, "name": SCHOOL_NAMES[school]}
        async for chunk in stream_school_agent(school, member_profile, recent_sessions, question):
            chunks.append(chunk)
            yield {"type": "school_chunk", "school": school, "chunk": chunk}
        full_text = "".join(chunks)
        school_opinions[school] = full_text
        yield {"type": "school_done", "school": school}

    # Run 4 schools concurrently, interleave their stream events
    school_queues: dict[str, asyncio.Queue] = {}
    school_tasks: list[asyncio.Task] = []

    for school in SCHOOLS:
        q: asyncio.Queue = asyncio.Queue()
        school_queues[school] = q

        async def _producer(s=school, queue=q):
            async for event in _stream_one_school(s):
                await queue.put(event)
            await queue.put(None)  # sentinel

        school_tasks.append(asyncio.create_task(_producer()))

    # Merge school streams round-robin
    done_count = 0
    while done_count < len(SCHOOLS):
        for school in SCHOOLS:
            q = school_queues[school]
            if q is None:
                continue
            try:
                event = q.get_nowait()
                if event is None:
                    school_queues[school] = None  # type: ignore
                    done_count += 1
                else:
                    yield event
            except asyncio.QueueEmpty:
                pass
        if done_count < len(SCHOOLS):
            await asyncio.sleep(0.05)

    await asyncio.gather(*school_tasks)

    # Judge phase
    yield {"type": "judge_start"}
    async for chunk in stream_judge(school_opinions, member_profile, question):
        yield {"type": "judge_chunk", "chunk": chunk}
    yield {"type": "judge_done"}
    yield {"type": "done"}


async def _run_all_schools(
    member_profile: dict | None,
    recent_sessions: list[dict] | None,
    question: str | None,
) -> dict[str, str]:
    """Run 4 school agents concurrently, return all opinions."""
    tasks = {
        school: asyncio.create_task(run_school_agent(school, member_profile, recent_sessions, question))
        for school in SCHOOLS
    }
    results = {}
    for school, task in tasks.items():
        results[school] = await task
    return results
