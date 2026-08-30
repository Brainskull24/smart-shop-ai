"""Unit tests for the product data validator."""

import pytest
from scraper.app.validators import validate_product


BASE_PRODUCT = {
    "asin": "B0GNSCKZTH",
    "title": "Example Product Title",
    "price_amount": 499.0,
    "currency": "INR",
    "rating": 4.1,
    "review_count": 1234,
    "images": ["https://example.com/image.jpg"],
    "features": ["Feature one", "Feature two"],
    "availability": "IN_STOCK",
}


class TestValidateProduct:
    def test_fully_populated_passes(self):
        result = validate_product(BASE_PRODUCT, "B0GNSCKZTH")
        assert result.passed is True
        assert result.errors == []
        assert result.quality_score == 100

    def test_asin_missing_fails(self):
        data = {**BASE_PRODUCT, "asin": None}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False
        assert any("ASIN is missing" in e for e in result.errors)

    def test_asin_mismatch_fails(self):
        data = {**BASE_PRODUCT, "asin": "B000000000"}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False
        assert any("mismatch" in e.lower() for e in result.errors)

    def test_title_missing_fails(self):
        data = {**BASE_PRODUCT, "title": ""}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False
        assert any("title" in e.lower() for e in result.errors)

    def test_negative_price_fails(self):
        data = {**BASE_PRODUCT, "price_amount": -1.0}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False
        assert any("price" in e.lower() for e in result.errors)

    def test_zero_price_fails(self):
        data = {**BASE_PRODUCT, "price_amount": 0}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False

    def test_missing_price_is_warning_not_error(self):
        data = {**BASE_PRODUCT}
        del data["price_amount"]
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is True
        assert any("price" in w.lower() for w in result.warnings)

    def test_rating_over_5_fails(self):
        data = {**BASE_PRODUCT, "rating": 5.1}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False

    def test_rating_below_0_fails(self):
        data = {**BASE_PRODUCT, "rating": -0.1}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False

    def test_negative_review_count_fails(self):
        data = {**BASE_PRODUCT, "review_count": -5}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is False

    def test_missing_rating_is_warning(self):
        data = {**BASE_PRODUCT}
        del data["rating"]
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is True
        assert any("rating" in w.lower() for w in result.warnings)

    def test_missing_images_is_warning(self):
        data = {**BASE_PRODUCT, "images": []}
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is True
        assert any("image" in w.lower() for w in result.warnings)

    def test_quality_score_partial(self):
        # ASIN + title + price only → score should be 60
        data = {
            "asin": "B0GNSCKZTH",
            "title": "Some Product",
            "price_amount": 199.0,
        }
        result = validate_product(data, "B0GNSCKZTH")
        assert result.passed is True
        assert result.quality_score == 60

    def test_asin_case_insensitive_match(self):
        # ASIN matching should be case-insensitive
        data = {**BASE_PRODUCT, "asin": "b0gnsckzth"}
        result = validate_product(data, "B0GNSCKZTH")
        # lowercase ASIN fails validate_asin but matching is case-insensitive
        assert result.passed is True
