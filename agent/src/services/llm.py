"""DashScope LLM wrapper — streaming and non-streaming calls."""

from collections.abc import AsyncGenerator

import dashscope
from dashscope import Generation

from src.config import DASHSCOPE_API_KEY, LLM_MAX_TOKENS, LLM_MODEL, LLM_TEMPERATURE

dashscope.api_key = DASHSCOPE_API_KEY


async def call_llm(
    messages: list[dict],
    *,
    model: str = LLM_MODEL,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> str:
    response = Generation.call(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        result_format="message",
    )
    if response.status_code != 200:
        raise RuntimeError(f"LLM error {response.status_code}: {response.message}")
    return response.output.choices[0].message.content


async def stream_llm(
    messages: list[dict],
    *,
    model: str = LLM_MODEL,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> AsyncGenerator[str, None]:
    responses = Generation.call(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        result_format="message",
        stream=True,
        incremental_output=True,
    )
    for response in responses:
        if response.status_code != 200:
            raise RuntimeError(f"LLM stream error {response.status_code}: {response.message}")
        chunk = response.output.choices[0].message.content
        if chunk:
            yield chunk
