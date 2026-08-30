# SmartShop AI: Current Deployment and V1 Plan

**Status date:** 2026-08-30

## Executive Decision

The application is being deployed in two phases.

### Phase A: deploy the current prototype

```text
Browser
  -> Next.js application on Vercel
  -> Python scraper service
  -> Amazon.in
  -> Scraped product JSON
  -> Puter AI summary in the frontend
```

This phase does not require the Spring Boot backend, PostgreSQL, Redis, or the database queue.

### Phase B: complete the documented V1 architecture

```text
Frontend
  -> Spring Boot API
  -> PostgreSQL products and scrape_jobs
  -> Python worker
  -> Amazon.in
```

Phase B is intentionally deferred until the direct prototype is deployed and tested with real products.

## What Is Implemented

- Amazon.in URL and ASIN validation
- SSRF protection through Amazon-domain allowlisting
- Python Playwright scraper
- Layered extraction using JSON-LD, embedded page data, and DOM selectors
- Product title, brand, price, currency, rating, review count, availability, images, features, description, and specifications
- Review evidence including review title, star rating, review body, and verified-purchase status
- Rating histogram text, discount text, delivery information, and service information
- Challenge-page detection and bounded retries
- Product validation and quality scoring
- AI product summary generation
- AI pros, cons, specs, best-for, sentiment, rating breakdown, and policy extraction
- Existing Puter KV cache and history flow
- Spring Boot resolver API skeleton
- PostgreSQL migrations for `products` and `scrape_jobs`
- PostgreSQL active-job deduplication index and `SKIP LOCKED` query
- Python unit tests for ASIN and validation behavior

## Deployment Change Made

The Next.js route previously tried to execute a local file:

```text
scraper/.venv/bin/python3
```

That cannot work on Vercel because the virtual environment is local and ignored by Git. The route now calls a remote scraper service:

```text
POST ${SCRAPER_SERVICE_URL}/scrape
```

The Python service is exposed by `scraper/app/api.py` and provides:

```text
GET  /health
POST /scrape
```

The service accepts the shared `X-Scraper-Token` header when `SCRAPER_API_TOKEN` is configured.

## Files Added or Changed for Deployment

- `scraper/app/api.py`: FastAPI HTTP wrapper around the existing scraper
- `scraper/Dockerfile`: container image with Chromium and Playwright dependencies
- `scraper/requirements.txt`: FastAPI and Uvicorn dependencies
- `src/app/api/scrape/route.ts`: calls the remote scraper service
- `.env.example`: documents service URL and token
- `.gitignore`: allows this document to be tracked

## Local Runbook

### Start the Python scraper service

From the repository root:

```bash
python3 -m venv scraper/.venv
scraper/.venv/bin/pip install -r scraper/requirements.txt
scraper/.venv/bin/playwright install chromium
SCRAPER_API_TOKEN=local-secret scraper/.venv/bin/uvicorn scraper.app.api:app --host 127.0.0.1 --port 8000
```

Check the service:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

### Start the Next.js application

In another terminal:

```bash
npm install
SCRAPER_SERVICE_URL=http://127.0.0.1:8000 \
SCRAPER_SERVICE_TOKEN=local-secret \
npm run dev
```

Then open `http://localhost:3000` and submit an Amazon.in product URL.

## Cloud Deployment Runbook

### 1. Deploy the Python service

Use a container-capable service such as Render, Railway, Fly.io, Azure Container Apps, or a small VPS.

Build from the repository root using:

```text
scraper/Dockerfile
```

The container starts with:

```text
uvicorn scraper.app.api:app --host 0.0.0.0 --port 8000
```

Set this environment variable on the Python host:

```env
SCRAPER_API_TOKEN=<long-random-secret>
```

Record the public HTTPS URL, for example:

```text
https://smartshop-scraper.example.com
```

Verify:

```bash
curl https://smartshop-scraper.example.com/health
```

Do not expose the scraper without authentication in production.

### 2. Deploy Next.js to Vercel

Configure these Vercel environment variables for Preview and Production as needed:

```env
SCRAPER_SERVICE_URL=https://smartshop-scraper.example.com
SCRAPER_SERVICE_TOKEN=<the-same-secret-as-the-python-host>
```

Keep the token server-side. It must not use the `NEXT_PUBLIC_` prefix.

Also configure the existing Puter-related authentication and storage setup used by the application.

Deploy the repository through Vercel or with the Vercel CLI. After deployment, submit a real Amazon.in product URL and inspect the browser result.

### 3. Required smoke tests

- Scraper `/health` returns `200`
- Scraper rejects an invalid token
- Scraper accepts one valid Amazon.in URL
- Vercel `/api/scrape` returns product JSON
- Frontend displays the product and AI analysis
- Invalid domains are rejected
- Invalid ASINs are rejected
- Amazon challenge pages are reported as failures
- Products without ratings or reviews do not cause fabricated AI data

## Current Limitations

- The direct flow is synchronous: the request waits for the browser scrape.
- The Vercel function has a 60-second limit; the scraper should normally complete below that.
- The Python service currently creates a browser per request through the existing worker flow. Low concurrency is recommended.
- The shared cache is currently handled by the frontend/Puter flow, not by a central product database.
- No real 20–50 product reliability run has been completed yet.
- The Spring Boot backend is not yet connected to the Python service.
- The Spring backend test command currently has a Java/Lombok compiler compatibility failure involving `com.sun.tools.javac.code.TypeTag`.

## Documented V1 Work Remaining

### A. Stabilize the deployed prototype

1. Deploy the Python container.
2. Connect it to Vercel with the two scraper environment variables.
3. Run the smoke tests above.
4. Run the bulk product test runner across representative categories.
5. Record success rate, missing fields, challenge rate, scrape duration, and review coverage.
6. Adjust selectors based on observed failures.

### B. Complete the Spring/PostgreSQL architecture

1. Fix the Java/Lombok toolchain and make backend tests pass.
2. Add a Python database client and configuration.
3. Implement job claiming with `FOR UPDATE SKIP LOCKED`.
4. Implement `PENDING -> PROCESSING -> SUCCESS/FAILED` transitions.
5. Save normalized products to PostgreSQL.
6. Add bounded retries and error messages.
7. Connect the frontend to `POST /api/products/resolve`.
8. Poll `GET /api/products/{asin}` for `READY`, `PROCESSING`, and `FAILED`.
9. Add backend integration tests with PostgreSQL.
10. Move shared caching and freshness decisions into the backend.

### C. Improve V1 quality

- Add parser fixture tests for reviews, histogram data, prices, and missing fields.
- Preserve selected product variation information where available.
- Add structured review and rating fields to persistence.
- Add operational metrics for success rate, missing fields, retries, duration, and challenge failures.
- Add deployment health checks and service logs.

## V1 Definition of Done

V1 is complete when an Amazon.in URL follows this path reliably:

```text
URL
  -> ASIN validation
  -> fresh-product lookup
  -> deduplicated scrape job
  -> Python Playwright worker
  -> layered extraction
  -> validation
  -> PostgreSQL product save
  -> frontend polling
  -> normalized product and AI summary
```

The reliability target should be chosen from the measured 20–50 product test run rather than guessed in advance.

## Architecture Principles

- Respect Amazon terms, robots/access rules, applicable law, and hosting-provider rules.
- Treat challenges and access failures as failures; do not design around bypassing access controls.
- Keep Amazon-specific selectors isolated in the scraper.
- Prefer structured data and exact evidence over inferred values.
- Keep the prototype simple until real reliability measurements justify a queue, Redis, multiple workers, or additional infrastructure.
