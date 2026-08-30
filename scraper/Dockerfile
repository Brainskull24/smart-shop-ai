FROM python:3.12-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libnss3 \
        libnspr4 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libxshmfence1 \
        libasound2 \
        libxkbcommon0 \
        libpango-1.0-0 \
        libx11-6 \
        libxext6 \
        libxrender1 \
        libx11-xcb1 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY scraper/requirements.txt /app/scraper/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/scraper/requirements.txt \
    && python -m playwright install --with-deps chromium

COPY scraper /app/scraper

EXPOSE 8000

CMD ["uvicorn", "scraper.app.api:app", "--host", "0.0.0.0", "--port", "8000"]
