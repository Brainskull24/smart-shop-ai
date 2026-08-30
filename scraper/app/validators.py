"""
Validation and quality scoring for extracted Amazon product data.

Validation rules:
  - ASIN must exist and match the requested ASIN
  - Title must be present and non-trivial
  - If price is present, it must be positive
  - If currency is present, it must be a 3-letter code
  - Rating must be 0–5
  - Review count must be >= 0
  - Image URLs must look valid (http/https)

Quality score (0–100):
  ASIN       +20
  Title      +20
  Price      +20
  Rating     +10
  Reviews    +10
  Image      +10
  Features   +10
"""

import re
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    passed: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    quality_score: int = 0


def _is_valid_url(url: str) -> bool:
    return bool(re.match(r"^https?://", url or ""))


def validate_product(data: dict, requested_asin: str) -> ValidationResult:
    """
    Validate extracted product data against the requested ASIN.

    Returns a ValidationResult with pass/fail status, error list,
    warning list, and a numeric quality score.
    """
    errors: list[str] = []
    warnings: list[str] = []
    score = 0

    # --- ASIN ---
    extracted_asin = data.get("asin")
    if not extracted_asin:
        errors.append("ASIN is missing from extracted data")
    elif extracted_asin.upper() != requested_asin.upper():
        errors.append(
            f"ASIN mismatch: requested={requested_asin}, extracted={extracted_asin}"
        )
    else:
        score += 20
        logger.info("✓ ASIN: %s", extracted_asin)

    # --- Title ---
    title = data.get("title")
    if not title or not isinstance(title, str) or len(title.strip()) < 3:
        errors.append("Title is missing or too short")
    else:
        score += 20
        logger.info("✓ Title: %s", title[:80])

    # --- Price ---
    price = data.get("price_amount")
    if price is None:
        warnings.append("Price is missing")
    elif not isinstance(price, (int, float)) or price <= 0:
        errors.append(f"Price is invalid: {price}")
    else:
        score += 20
        logger.info("✓ Price: %.2f %s", price, data.get("currency", "INR"))

    # --- Currency ---
    currency = data.get("currency")
    if currency and not re.match(r"^[A-Z]{3}$", currency):
        warnings.append(f"Currency looks malformed: {currency}")

    # --- Rating ---
    rating = data.get("rating")
    if rating is None:
        warnings.append("Rating is missing")
    elif not isinstance(rating, (int, float)) or not (0 <= rating <= 5):
        errors.append(f"Rating out of range: {rating}")
    else:
        score += 10
        logger.info("✓ Rating: %.1f", rating)

    # --- Review count ---
    review_count = data.get("review_count")
    if review_count is None:
        warnings.append("Review count is missing")
    elif not isinstance(review_count, int) or review_count < 0:
        errors.append(f"Review count invalid: {review_count}")
    else:
        score += 10
        logger.info("✓ Review count: %d", review_count)

    # --- Images ---
    images = data.get("images") or (
        [data["primary_image"]] if data.get("primary_image") else []
    )
    if not images:
        warnings.append("No images found")
    else:
        bad = [img for img in images if not _is_valid_url(img)]
        if bad:
            warnings.append(f"Some image URLs look invalid: {bad[:3]}")
        else:
            score += 10
            logger.info("✓ Images: %d found", len(images))

    # --- Features ---
    features = data.get("features")
    if not features or len(features) == 0:
        warnings.append("Feature bullets are missing")
    else:
        score += 10
        logger.info("✓ Features: %d bullet(s)", len(features))

    # --- Availability ---
    avail = data.get("availability")
    if not avail or avail == "UNKNOWN":
        warnings.append("Availability is unknown")

    passed = len(errors) == 0

    result = ValidationResult(
        passed=passed,
        errors=errors,
        warnings=warnings,
        quality_score=score,
    )

    if passed:
        logger.info(
            "Validation PASSED (score=%d/100, warnings=%d)",
            score,
            len(warnings),
        )
    else:
        logger.warning(
            "Validation FAILED (score=%d/100, errors=%s)",
            score,
            errors,
        )

    return result
