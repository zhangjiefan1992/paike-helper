FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
COPY src/ src/

RUN pip install --no-cache-dir .

COPY knowledge/ knowledge/

ENV KNOWLEDGE_DIR=/app/knowledge
ENV PORT=9000

EXPOSE 9000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "9000", "--timeout-keep-alive", "300"]
