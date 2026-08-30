"""
ASIN extraction and Amazon URL validation utilities.

Supported URL formats:
  https://www.amazon.in/dp/B0GNSCKZTH
  https://www.amazon.in/gp/product/B0GNSCKZTH
  https://www.amazon.in/some-product-name/dp/B0GNSCKZTH
  https://www.amazon.in/some-product-name/dp/B0GNSCKZTH/ref=...?params=...
  https://amzn.in/d/B0GNSCKZTH   (short URL — resolved before parsing)
"""

import re
from urllib.parse import urlparse

# ASINs are exactly 10 characters: digits and uppercase letters, starting with B or digit
ASIN_PATTERN = re.compile(r"\b([B][0-9A-Z]{9}|[0-9]{10})\b")

# Allowed Amazon domains for V1
ALLOWED_DOMAINS = {
    "amazon.in",
    "www.amazon.in",
    "amzn.in",
    "www.amzn.in",
}


def is_allowed_domain(url: str) -> bool:
    """Return True if the URL belongs to a permitted Amazon marketplace domain."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        # Block SSRF vectors: localhost, IP literals, internal services
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0"):
            return False
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname):
            return False
        # 169.254.x.x is the AWS metadata endpoint
        if hostname.startswith("169.254"):
            return False
        return hostname.lower() in ALLOWED_DOMAINS
    except Exception:
        return False


def extract_asin(url: str) -> str | None:
    """
    Extract the ASIN from an Amazon product URL.

    Returns the ASIN string (e.g. "B0GNSCKZTH") or None if not found.
    Tracking/query parameters are intentionally ignored.
    """
    if not url or not isinstance(url, str):
        return None

    try:
        parsed = urlparse(url)
        path = parsed.path
    except Exception:
        return None

    # Pattern 1: /dp/<ASIN>
    m = re.search(r"/dp/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$|\?)", path)
    if m:
        return m.group(1)

    # Pattern 2: /gp/product/<ASIN>
    m = re.search(r"/gp/product/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$|\?)", path)
    if m:
        return m.group(1)

    # Pattern 3: /exec/obidos/ASIN/<ASIN>  (legacy)
    m = re.search(r"/exec/obidos/ASIN/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$)", path)
    if m:
        return m.group(1)

    # Fallback: scan the full path for any ASIN-shaped token
    tokens = re.findall(r"[B][0-9A-Z]{9}|[0-9]{10}", path)
    if tokens:
        return tokens[0]

    return None


def validate_asin(asin: str) -> bool:
    """Return True if the string looks like a valid ASIN."""
    if not asin or not isinstance(asin, str):
        return False
    return bool(re.fullmatch(r"[B][0-9A-Z]{9}|[0-9]{10}", asin))


def canonical_product_url(asin: str, domain: str = "www.amazon.in") -> str:
    """Build the canonical Amazon product URL from an ASIN."""
    return f"https://{domain}/dp/{asin}"
