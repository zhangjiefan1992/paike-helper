"""Load distilled wiki.md content for each school agent's system prompt."""

from pathlib import Path

from src.config import KNOWLEDGE_DIR, SCHOOLS

_cache: dict[str, str] = {}


def load_school_wiki(school: str) -> str:
    if school in _cache:
        return _cache[school]

    path = KNOWLEDGE_DIR / f"{school}.md"
    if not path.exists():
        raise FileNotFoundError(f"Knowledge file not found: {path}")

    content = path.read_text(encoding="utf-8")
    _cache[school] = content
    return content


def load_all() -> dict[str, str]:
    return {school: load_school_wiki(school) for school in SCHOOLS}


def clear_cache():
    _cache.clear()
