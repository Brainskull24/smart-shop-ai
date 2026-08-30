-- V2: Create scrape_jobs table
-- Acts as the PostgreSQL-based job queue (no Redis needed for V1).
-- Workers use SELECT ... FOR UPDATE SKIP LOCKED to claim jobs safely.

CREATE TABLE IF NOT EXISTS scrape_jobs (
    id              BIGSERIAL       PRIMARY KEY,
    asin            VARCHAR(10)     NOT NULL,
    -- Job status lifecycle: PENDING → PROCESSING → SUCCESS | FAILED
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    attempts        SMALLINT        NOT NULL DEFAULT 0,
    error_message   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

-- Unique constraint: only one active job (PENDING or PROCESSING) per ASIN at a time.
-- This prevents duplicate scrape jobs when multiple requests come in simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS uq_scrape_jobs_active_asin
    ON scrape_jobs (asin)
    WHERE status IN ('PENDING', 'PROCESSING');

-- Worker poll query index: find PENDING jobs ordered by creation time
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_created
    ON scrape_jobs (status, created_at)
    WHERE status = 'PENDING';

-- ASIN lookup index (used by API to check existing jobs)
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_asin ON scrape_jobs (asin);
