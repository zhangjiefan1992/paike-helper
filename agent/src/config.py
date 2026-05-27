from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
KNOWLEDGE_DIR = Path(os.getenv("KNOWLEDGE_DIR", "../knowledge/distilled")).resolve()
PORT = int(os.getenv("PORT", "8100"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

LLM_MODEL = "qwen-max"
LLM_TEMPERATURE = 0.7
LLM_MAX_TOKENS = 2000

SCHOOLS = ["romana", "stott", "polestar", "basi"]
SCHOOL_NAMES = {
    "romana": "罗马纳",
    "stott": "斯多特",
    "polestar": "北极星",
    "basi": "BASI",
}
