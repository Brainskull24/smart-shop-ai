-- V1: Create products table
-- Stores normalized Amazon product data keyed by ASIN.
-- JSON/JSONB used for multi-value fields (images, features, specifications).

CREATE TABLE IF NOT EXISTS products (
    asin                VARCHAR(10)     PRIMARY KEY,
    title               TEXT            NOT NULL,
    brand               VARCHAR(500),
    description         TEXT,
    price_amount        NUMERIC(12, 2),
    currency            VARCHAR(3)      NOT NULL DEFAULT 'INR',
    rating              NUMERIC(3, 1),
    review_count        INTEGER,
    -- Canonical availability enum: IN_STOCK | OUT_OF_STOCK | UNAVAILABLE | UNKNOWN
    availability        VARCHAR(20)     NOT NULL DEFAULT 'UNKNOWN',
    primary_image       TEXT,
    -- JSONB arrays / objects for multi-value fields
    images              JSONB           NOT NULL DEFAULT '[]',
    features            JSONB           NOT NULL DEFAULT '[]',
    specifications      JSONB           NOT NULL DEFAULT '{}',
    quality_score       SMALLINT        NOT NULL DEFAULT 0,
    source              VARCHAR(20)     NOT NULL DEFAULT 'AMAZON_IN',
    scraped_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index for freshness checks (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_products_scraped_at ON products (scraped_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products (updated_at);
