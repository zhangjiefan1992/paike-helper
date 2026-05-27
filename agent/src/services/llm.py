"""DeepSeek LLM wrapper — streaming and non-streaming calls via OpenAI-compatible API."""

from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from src.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, LLM_MAX_TOKENS, LLM_MODEL, LLM_TEMPERATURE

_client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


async def call_llm(
    messages: list[dict],
    *,
    model: str = LLM_MODEL,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> str:
    response = await _client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=False,
    )
    return response.choices[0].message.content


async def stream_llm(
    messages: list[dict],
    *,
    model: str = LLM_MODEL,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
) -> AsyncGenerator[str, None]:
    stream = await _client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
