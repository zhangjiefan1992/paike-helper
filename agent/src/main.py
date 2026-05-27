"""Paike Agent — FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.config import LOG_LEVEL

app = FastAPI(title="Paike Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1/agent")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "paike-agent"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8100, log_level=LOG_LEVEL, reload=True)
