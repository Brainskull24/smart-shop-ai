FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY scraper/requirements.txt /app/scraper/requirements.txt
RUN pip install --no-cache-dir -r /app/scraper/requirements.txt \
    && playwright install --with-deps chromium

COPY scraper /app/scraper

EXPOSE 8000

CMD ["uvicorn", "scraper.app.api:app", "--host", "0.0.0.0", "--port", "8000"]
