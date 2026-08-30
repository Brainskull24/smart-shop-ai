"""Unit tests for ASIN extraction and URL validation."""

import pytest
from scraper.app.asin import extract_asin, validate_asin, is_allowed_domain, canonical_product_url


class TestExtractAsin:
    def test_standard_dp_url(self):
        url = "https://www.amazon.in/Robustt-Protection/dp/B0GNSCKZTH/"
        assert extract_asin(url) == "B0GNSCKZTH"

    def test_dp_url_no_slug(self):
        url = "https://www.amazon.in/dp/B0GNSCKZTH"
        assert extract_asin(url) == "B0GNSCKZTH"

    def test_dp_url_with_query_params(self):
        url = "https://www.amazon.in/dp/B0GNSCKZTH?pd_rd_w=abc&tag=xyz"
        assert extract_asin(url) == "B0GNSCKZTH"

    def test_gp_product_url(self):
        url = "https://www.amazon.in/gp/product/B0GNSCKZTH"
        assert extract_asin(url) == "B0GNSCKZTH"

    def test_gp_product_url_with_ref(self):
        url = "https://www.amazon.in/gp/product/B0GNSCKZTH/ref=sr_1_1"
        assert extract_asin(url) == "B0GNSCKZTH"

    def test_long_product_slug(self):
        url = (
            "https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones-Multipoint/"
            "dp/B09WN3SK23/ref=sr_1_3?keywords=headphones"
        )
        assert extract_asin(url) == "B09WN3SK23"

    def test_numeric_asin(self):
        # 10-digit numeric ISBNs are valid ASINs for books
        url = "https://www.amazon.in/dp/8172234074"
        assert extract_asin(url) == "8172234074"

    def test_no_asin_returns_none(self):
        assert extract_asin("https://www.amazon.in/") is None
        assert extract_asin("https://www.amazon.in/s?k=headphones") is None

    def test_empty_string_returns_none(self):
        assert extract_asin("") is None

    def test_none_returns_none(self):
        assert extract_asin(None) is None  # type: ignore

    def test_multiple_asins_returns_first(self):
        # The ASIN in /dp/ should win
        url = "https://www.amazon.in/dp/B0GNSCKZTH/ref=dp_B09WN3SK23"
        assert extract_asin(url) == "B0GNSCKZTH"


class TestValidateAsin:
    def test_valid_b_asin(self):
        assert validate_asin("B0GNSCKZTH") is True

    def test_valid_numeric_asin(self):
        assert validate_asin("8172234074") is True

    def test_too_short(self):
        assert validate_asin("B0GNS") is False

    def test_too_long(self):
        assert validate_asin("B0GNSCKZTHX") is False

    def test_lowercase_rejected(self):
        assert validate_asin("b0gnsckzth") is False

    def test_special_chars_rejected(self):
        assert validate_asin("B0GNSCZ-TH") is False

    def test_empty_string_rejected(self):
        assert validate_asin("") is False

    def test_none_rejected(self):
        assert validate_asin(None) is False  # type: ignore


class TestIsAllowedDomain:
    def test_amazon_in_allowed(self):
        assert is_allowed_domain("https://www.amazon.in/dp/B0GNSCKZTH") is True

    def test_amazon_in_no_www(self):
        assert is_allowed_domain("https://amazon.in/dp/B0GNSCKZTH") is True

    def test_amazon_com_rejected(self):
        # V1 supports amazon.in only
        assert is_allowed_domain("https://www.amazon.com/dp/B0GNSCKZTH") is False

    def test_google_rejected(self):
        assert is_allowed_domain("https://www.google.com/") is False

    def test_localhost_rejected(self):
        assert is_allowed_domain("http://localhost/admin") is False

    def test_ip_address_rejected(self):
        assert is_allowed_domain("http://127.0.0.1/") is False

    def test_metadata_endpoint_rejected(self):
        assert is_allowed_domain("http://169.254.169.254/latest/meta-data") is False

    def test_amzn_short_url_allowed(self):
        assert is_allowed_domain("https://amzn.in/d/B0GNSCKZTH") is True


class TestCanonicalUrl:
    def test_default_domain(self):
        assert canonical_product_url("B0GNSCKZTH") == "https://www.amazon.in/dp/B0GNSCKZTH"

    def test_custom_domain(self):
        assert canonical_product_url("B0GNSCKZTH", "amazon.in") == "https://amazon.in/dp/B0GNSCKZTH"
