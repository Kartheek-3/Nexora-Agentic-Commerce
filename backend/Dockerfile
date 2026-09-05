FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./backend
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--timeout", "120", "backend.app:app"]
