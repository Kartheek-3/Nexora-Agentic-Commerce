FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .

RUN python -m pip install --upgrade pip wheel \
    && python -m pip install "setuptools==80.9.0" \
    && python -m pip install --no-cache-dir -r requirements.txt

# IMPORTANT:
# Fail the Docker build immediately if Razorpay cannot be imported.
RUN python -c "import razorpay; import pkg_resources; print('razorpay import OK')"

COPY . ./backend

ENV PYTHONPATH=/app

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "--timeout", "120", "backend.app:app"]
