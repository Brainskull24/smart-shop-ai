"""
Amazon Product Scraper — Phase 1 POC worker.

Usage:
    python -m scraper.app.worker <amazon_url>
    python -m scraper.app.worker https://www.amazon.in/dp/B0GNSCKZTH

The worker accepts a single Amazon.in product URL, scrapes the page using
Playwright, validates the result, and prints the structured JSON to stdout.

Exit codes:
    0 — success (valid product JSON printed)
    1 — validation failure or scraping error
    2 — bad arguments / invalid URL
"""

import json
import logging
import sys
import time
from datetime import datetime, timezone

from .asin import extract_asin, is_allowed_domain, canonical_product_url, validate_asin
from .browser import create_browser, open_product_page, is_challenge_page
from .amazon_parser import extract_product_data
from .validators import validate_product

# Configure logging to stderr so stdout stays clean JSON
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

# Production profile: keep retries limited so a single slow page doesn't stretch the request
MAX_ATTEMPTS = 2
RETRY_BASE_SECONDS = 3


def scrape_product(url: str) -> dict:
    """
    End-to-end scrape of a single Amazon.in product URL.

    Returns a validated product dict or raises an exception.
    """
    # --- URL validation ---
    if not is_allowed_domain(url):
        raise ValueError(
            f"Domain not allowed. Only amazon.in / www.amazon.in are supported in V1. Got: {url}"
        )

    asin = extract_asin(url)
    if not asin or not validate_asin(asin):
        raise ValueError(f"Could not extract a valid ASIN from URL: {url}")

    logger.info("ASIN: %s", asin)
    canonical = canonical_product_url(asin)
    logger.info("Canonical URL: %s", canonical)

    last_error: Exception | None = None
    total_start = time.time()

    with create_browser() as browser:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            logger.info("Attempt %d/%d", attempt, MAX_ATTEMPTS)
            page = None
            attempt_start = time.time()
            try:
                page = open_product_page(browser, canonical)
                page_load_elapsed = round(time.time() - attempt_start, 2)
                logger.info("Page load + navigation elapsed: %.2fs", page_load_elapsed)

                # Check for challenge/interstitial
                if is_challenge_page(page):
                    raise RuntimeError(
                        "Amazon returned a robot-check page. "
                        "Treat as a scrape failure (V1 does not defeat challenges)."
                    )

                # Extract data using all three layers
                data = extract_product_data(page, asin)
                extraction_elapsed = round(time.time() - attempt_start, 2)
                logger.info("Extraction and parsing elapsed: %.2fs", extraction_elapsed)

                # Validate
                result = validate_product(data, asin)
                validation_elapsed = round(time.time() - attempt_start, 2)
                logger.info("Validation elapsed: %.2fs", validation_elapsed)

                if not result.passed:
                    raise RuntimeError(
                        f"Validation failed: {'; '.join(result.errors)}"
                    )

                # Attach metadata
                data["quality_score"] = result.quality_score
                data["warnings"] = result.warnings
                data["scraped_at"] = datetime.now(timezone.utc).isoformat()
                data["scrape_duration_seconds"] = round(time.time() - total_start, 2)
                logger.info(
                    "Attempt metrics: page=%.2fs extraction=%.2fs validation=%.2fs total=%.2fs",
                    page_load_elapsed,
                    extraction_elapsed,
                    validation_elapsed,
                    data["scrape_duration_seconds"],
                )

                return data

            except Exception as e:
                last_error = e
                elapsed = round(time.time() - attempt_start, 2)
                logger.warning("Attempt %d failed after %.2fs: %s", attempt, elapsed, e)
                # 404 is not transient — no retry
                if "404" in str(e):
                    break
                if attempt < MAX_ATTEMPTS:
                    wait = RETRY_BASE_SECONDS * (2 ** (attempt - 1))
                    logger.info("Retrying in %ds...", wait)
                    time.sleep(wait)
            finally:
                if page:
                    try:
                        page.context.close()
                    except Exception:
                        pass

    raise RuntimeError(
        f"All {MAX_ATTEMPTS} attempts failed for ASIN {asin}. "
        f"Last error: {last_error}"
    )


def _serialize(data: dict) -> dict:
    """Convert the raw merged dict into the canonical V1 output shape."""
    images = data.get("images") or []
    if not images and data.get("primary_image"):
        images = [data["primary_image"]]

    return {
        "asin": data.get("asin"),
        "title": data.get("title"),
        "brand": data.get("brand"),
        "price": {
            "amount": data.get("price_amount"),
            "currency": data.get("currency", "INR"),
        },
        "rating": data.get("rating"),
        "review_count": data.get("review_count"),
        "rating_breakdown_text": data.get("rating_breakdown_text"),
        "top_reviews": data.get("top_reviews") or [],
        "category": data.get("category"),
        "delivery_time": data.get("delivery_time"),
        "service_info": data.get("service_info"),
        "discount_text": data.get("discount_text"),
        "availability": data.get("availability", "UNKNOWN"),
        "images": images[:10],
        "features": data.get("features") or [],
        "description": data.get("description"),
        "specifications": data.get("specifications") or {},
        "source": data.get("source", "AMAZON_IN"),
        "scraped_at": data.get("scraped_at"),
        "scrape_duration_seconds": data.get("scrape_duration_seconds"),
        "quality_score": data.get("quality_score", 0),
        "warnings": data.get("warnings") or [],
    }


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: python -m scraper.app.worker <amazon_url>",
            file=sys.stderr,
        )
        sys.exit(2)

    url = sys.argv[1].strip()
    logger.info("Starting scrape for: %s", url)

    try:
        raw = scrape_product(url)
        output = _serialize(raw)
        print(json.dumps(output, indent=2, ensure_ascii=False))
        sys.exit(0)
    except ValueError as e:
        logger.error("Invalid input: %s", e)
        sys.exit(2)
    except Exception as e:
        logger.error("Scrape failed: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
