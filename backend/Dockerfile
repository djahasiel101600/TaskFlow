# TaskFlow backend image (Django, Daphne, Celery).
# Used by docker-compose for celery and celery-beat; can run the web app too.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system deps for psycopg2 and Pillow if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default: run Celery worker (override in compose for beat or web)
CMD ["celery", "-A", "config", "worker", "-l", "info"]
