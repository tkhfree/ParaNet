# 仅针对 backend/app 新后端，与 editor-backend-dev 分开构建与运行
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py .
COPY app/ ./app/

ENV PARANET_API_HOST=0.0.0.0
ENV PARANET_API_PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
