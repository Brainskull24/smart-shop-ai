"""
Amazon.in product page parser.

Extraction strategy (in priority order):
  Layer 1 — JSON-LD structured data  (<script type="application/ld+json">)
  Layer 2 — Embedded page data       (window.__INITIAL_STATE__, dataLayer, etc.)
  Layer 3 — DOM selectors            (CSS selectors for every remaining field)

All three layers are attempted; later layers fill in fields that earlier ones missed.
"""

import json
import re
import logging
from typing import Any

from playwright.sync_api import Page

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Price helpers
# ---------------------------------------------------------------------------

def _parse_price(raw: str | None) -> float | None:
    """Normalize an Amazon price string to a float."""
    if not raw:
        return None
    # Remove currency symbols, commas, whitespace
    cleaned = re.sub(r"[₹$£€,\s]", "", raw.strip())
    # Handle "1299.00" or "1299"
    m = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def _parse_rating(raw: str | None) -> float | None:
    """Normalize '4.3 out of 5 stars' → 4.3"""
    if not raw:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", raw.strip())
    if m:
        try:
            val = float(m.group(1))
            if 0 <= val <= 5:
                return val
        except ValueError:
            pass
    return None


def _parse_review_count(raw: str | None) -> int | None:
    """Normalize '1,234 ratings' → 1234"""
    if not raw:
        return None
    digits = re.sub(r"[^\d]", "", raw)
    if digits:
        try:
            return int(digits)
        except ValueError:
            pass
    return None


_AVAILABILITY_MAP = {
    "in stock": "IN_STOCK",
    "in_stock": "IN_STOCK",
    "instock": "IN_STOCK",
    "available": "IN_STOCK",
    "out of stock": "OUT_OF_STOCK",
    "out_of_stock": "OUT_OF_STOCK",
    "outofstock": "OUT_OF_STOCK",
    "unavailable": "UNAVAILABLE",
    "currently unavailable": "UNAVAILABLE",
}


def _normalize_availability(raw: str | None) -> str:
    """Map raw availability text to a canonical enum value."""
    if not raw:
        return "UNKNOWN"
    key = raw.strip().lower()
    for pattern, value in _AVAILABILITY_MAP.items():
        if pattern in key:
            return value
    return "UNKNOWN"


# ---------------------------------------------------------------------------
# Layer 1 — JSON-LD
# ---------------------------------------------------------------------------

def _extract_jsonld(page: Page) -> dict[str, Any]:
    """Parse all JSON-LD blocks on the page and return a merged dict."""
    result: dict[str, Any] = {}
    try:
        scripts = page.query_selector_all('script[type="application/ld+json"]')
        for script in scripts:
            try:
                raw = script.inner_text()
                data = json.loads(raw)
                # JSON-LD can be a list or a single object
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            result.update(item)
                elif isinstance(data, dict):
                    result.update(data)
            except (json.JSONDecodeError, Exception):
                continue
    except Exception as e:
        logger.debug("JSON-LD extraction failed: %s", e)
    return result


def _fields_from_jsonld(data: dict[str, Any]) -> dict[str, Any]:
    """Map JSON-LD fields to our canonical field names."""
    out: dict[str, Any] = {}
    if not data:
        return out

    # Title
    out["title"] = data.get("name") or data.get("headline")

    # Brand
    brand = data.get("brand")
    if isinstance(brand, dict):
        out["brand"] = brand.get("name")
    elif isinstance(brand, str):
        out["brand"] = brand

    # Price / currency
    offers = data.get("offers") or data.get("Offers")
    if isinstance(offers, list) and offers:
        offers = offers[0]
    if isinstance(offers, dict):
        price_raw = offers.get("price") or offers.get("lowPrice")
        if price_raw is not None:
            try:
                out["price_amount"] = float(price_raw)
            except (ValueError, TypeError):
                out["price_amount"] = _parse_price(str(price_raw))
        out["currency"] = offers.get("priceCurrency", "INR")
        avail_raw = offers.get("availability", "")
        if avail_raw:
            # schema.org uses "http://schema.org/InStock" etc.
            avail_key = avail_raw.split("/")[-1].lower()
            out["availability"] = _normalize_availability(avail_key)

    # Rating
    agg = data.get("aggregateRating")
    if isinstance(agg, dict):
        out["rating"] = _parse_rating(str(agg.get("ratingValue", "")))
        out["review_count"] = _parse_review_count(str(agg.get("reviewCount", "") or agg.get("ratingCount", "")))

    # Images
    img = data.get("image")
    if isinstance(img, list):
        out["images"] = [i for i in img if isinstance(i, str)]
    elif isinstance(img, str):
        out["images"] = [img]

    # Description
    out["description"] = data.get("description")

    return {k: v for k, v in out.items() if v is not None and v != "" and v != []}


# ---------------------------------------------------------------------------
# Layer 2 — Embedded page data
# ---------------------------------------------------------------------------

def _extract_embedded(page: Page) -> dict[str, Any]:
    """
    Try to pull structured product data embedded in inline <script> blocks.
    Amazon sometimes includes price/ASIN data in dataLayer or window variables.
    This is best-effort — missing data here is expected.
    """
    out: dict[str, Any] = {}
    try:
        result = page.evaluate("""
        () => {
            const data = {};

            // Try dataLayer (Google Tag Manager)
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                for (const entry of window.dataLayer) {
                    if (entry && (entry.asin || entry.ASIN)) {
                        data.asin = entry.asin || entry.ASIN;
                    }
                    if (entry && entry.priceAmount) {
                        data.price_amount = parseFloat(entry.priceAmount);
                    }
                }
            }

            // Try P.when / jQuery-style embedded data (Amazon-specific)
            try {
                const priceEl = document.querySelector('#corePrice_desktop .a-offscreen') ||
                                document.querySelector('#corePrice_feature_div .a-offscreen') ||
                                document.querySelector('.a-price .a-offscreen');
                if (priceEl) {
                    data.price_raw_embedded = priceEl.textContent.trim();
                }
            } catch(e) {}

            // ASIN from hidden input or meta
            try {
                const asinInput = document.querySelector('input[name="ASIN"]') ||
                                  document.querySelector('#ASIN');
                if (asinInput) data.asin = asinInput.value;
            } catch(e) {}

            try {
                const asinMeta = document.querySelector('input#ASIN');
                if (asinMeta) data.asin = asinMeta.getAttribute('value');
            } catch(e) {}

            return data;
        }
        """)
        if result and isinstance(result, dict):
            out.update(result)
    except Exception as e:
        logger.debug("Embedded data extraction failed: %s", e)
    return out


# ---------------------------------------------------------------------------
# Layer 3 — DOM selectors
# ---------------------------------------------------------------------------

# Each field maps to a list of selectors tried in order.
DOM_SELECTORS: dict[str, list[str]] = {
    "title": [
        "span#productTitle",
        "h1.a-size-large",
        'meta[name="title"]',
    ],
    "brand": [
        "#bylineInfo",
        "#brand",
        'a#bylineInfo',
        ".po-brand .po-break-word",
    ],
    "price_text": [
        "span#corePrice_feature_div .a-offscreen",
        ".priceToPay .a-offscreen",
        "#corePrice_desktop .a-offscreen",
        ".a-price .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price-whole",
    ],
    "original_price_text": [
        "span.basisPrice .a-offscreen",
        ".basisPrice .a-offscreen",
        ".a-price.a-text-price .a-offscreen",
        "#priceblock_listprice",
    ],
    "rating_text": [
        "#acrPopover .a-icon-alt",
        "#averageCustomerReviews .a-icon-alt",
        'span[data-hook="rating-out-of-text"]',
    ],
    "review_count_text": [
        "#acrCustomerReviewText",
        'span[data-hook="total-review-count"]',
    ],
    "availability_text": [
        "#availability span",
        "#availability",
        "#outOfStock .a-color-price",
    ],
    "primary_image": [
        "img#landingImage",
        "img#imgBlkFront",
        'meta[property="og:image"]',
    ],
    "description": [
        "#productDescription p",
        "#productDescription",
    ],
    "category": [
        "#wayfinding-breadcrumbs_feature_div ul li:first-child a",
        "#wayfinding-breadcrumbs_feature_div ul li:last-child a",
    ],
    "delivery_time": [
        "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
        "#deliveryBlockMessage",
    ],
    "service_info": [
        "#icon-farm-container",
        "#product-support-information",
    ],
    "discount_text": [
        "span.basisPrice .a-offscreen",
        ".priceBlockStrikePriceString",
    ],
}

# Feature bullets
FEATURE_BULLET_SELECTOR = "#feature-bullets ul li:not(.aok-hidden)"

# Specification table rows
SPEC_ROW_SELECTOR = "#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr"

REVIEW_CARD_SELECTOR = '[data-hook="review"]'
REVIEW_HISTOGRAM_SELECTOR = '#reviewsMedley #histogramTable, #histogramTable'

# Additional images (thumbnail list)
ADDITIONAL_IMAGE_SCRIPT = """
() => {
    const imgs = [];
    // Try the image block thumbnails
    document.querySelectorAll('#altImages ul li img').forEach(img => {
        const src = img.getAttribute('src') || '';
        // Convert thumbnail URL to full-size by replacing size token
        const full = src.replace(/\\._(.*?)_\\./, '._SL500_.');
        if (full && !full.includes('play-button') && !full.includes('video')) {
            imgs.push(full);
        }
    });
    return imgs;
}
"""


def _get_text(page: Page, selectors: list[str]) -> str | None:
    """Try each selector in order, return first non-empty text."""
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                # For meta tags use content attribute
                if sel.startswith("meta"):
                    val = el.get_attribute("content")
                else:
                    val = el.inner_text()
                if val and val.strip():
                    return val.strip()
        except Exception:
            continue
    return None


def _get_attr(page: Page, selectors: list[str], attr: str) -> str | None:
    """Try each selector, return the attribute value."""
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                val = el.get_attribute(attr)
                if val and val.strip():
                    return val.strip()
        except Exception:
            continue
    return None


def _extract_dom(page: Page) -> dict[str, Any]:
    out: dict[str, Any] = {}

    # Scalar text fields
    out["title"] = _get_text(page, DOM_SELECTORS["title"])
    out["brand"] = _get_text(page, DOM_SELECTORS["brand"])
    price_text = _get_text(page, DOM_SELECTORS["price_text"])
    if price_text:
        out["price_amount"] = _parse_price(price_text)
        out["price_text"] = price_text
    orig_price_text = _get_text(page, DOM_SELECTORS["original_price_text"])
    if orig_price_text:
        out["original_price"] = _parse_price(orig_price_text)
    rating_text = _get_text(page, DOM_SELECTORS["rating_text"])
    out["rating"] = _parse_rating(rating_text)
    review_text = _get_text(page, DOM_SELECTORS["review_count_text"])
    out["review_count"] = _parse_review_count(review_text)
    avail_text = _get_text(page, DOM_SELECTORS["availability_text"])
    out["availability"] = _normalize_availability(avail_text)
    out["availability_raw"] = avail_text
    out["description"] = _get_text(page, DOM_SELECTORS["description"])
    out["category"] = _get_text(page, DOM_SELECTORS["category"])
    out["delivery_time"] = _get_text(page, DOM_SELECTORS["delivery_time"])
    out["service_info"] = _get_text(page, DOM_SELECTORS["service_info"])
    discount_text = _get_text(page, DOM_SELECTORS["discount_text"])
    if discount_text:
        out["discount_text"] = discount_text

    # Review evidence: retain the review title, rating, verification label, and body
    # so the AI can distinguish repeated feedback from a single anecdote.
    try:
        reviews: list[dict[str, Any]] = []
        for card in page.query_selector_all(REVIEW_CARD_SELECTOR)[:20]:
            body = _get_text(card, ['[data-hook="review-body"]'])
            title = _get_text(card, ['[data-hook="review-title"]'])
            rating = _get_text(card, ['[data-hook="review-star-rating"]', '[data-hook="cmps-review-star-rating"]'])
            verified = _get_text(card, ['[data-hook="avp-badge"]'])
            if body:
                reviews.append({
                    "title": title,
                    "rating": _parse_rating(rating),
                    "verified_purchase": bool(verified),
                    "text": body,
                })
        if reviews:
            out["top_reviews"] = reviews
    except Exception as e:
        logger.debug("Review extraction failed: %s", e)

    histogram = _get_text(page, [REVIEW_HISTOGRAM_SELECTOR])
    if histogram:
        out["rating_breakdown_text"] = histogram

    # Primary image
    img_src = _get_attr(page, ["img#landingImage", "img#imgBlkFront"], "src")
    if not img_src:
        # Try data-old-hires for high-res
        img_src = _get_attr(page, ["img#landingImage"], "data-old-hires")
    if not img_src:
        img_src = _get_attr(page, ['meta[property="og:image"]'], "content")
    if img_src:
        out["primary_image"] = img_src

    # Feature bullets
    try:
        bullet_els = page.query_selector_all(FEATURE_BULLET_SELECTOR)
        bullets = []
        for el in bullet_els:
            text = el.inner_text().strip()
            if text:
                bullets.append(text)
        if bullets:
            out["features"] = bullets
    except Exception as e:
        logger.debug("Feature bullets extraction failed: %s", e)

    # Specification table
    try:
        rows = page.query_selector_all(SPEC_ROW_SELECTOR)
        specs: dict[str, str] = {}
        for row in rows:
            th = row.query_selector("th")
            td = row.query_selector("td")
            if th and td:
                key = th.inner_text().strip()
                val = td.inner_text().strip()
                if key and val:
                    specs[key] = val
        if specs:
            out["specifications"] = specs
    except Exception as e:
        logger.debug("Specifications extraction failed: %s", e)

    # Additional images
    try:
        imgs = page.evaluate(ADDITIONAL_IMAGE_SCRIPT)
        if imgs and isinstance(imgs, list) and len(imgs) > 0:
            out["additional_images"] = imgs[:10]
    except Exception as e:
        logger.debug("Additional images extraction failed: %s", e)

    return {k: v for k, v in out.items() if v is not None}


# ---------------------------------------------------------------------------
# Merge layers
# ---------------------------------------------------------------------------

def extract_product_data(page: Page, asin: str) -> dict[str, Any]:
    """
    Run all three extraction layers and merge the results.
    Layer 1 (JSON-LD) has highest priority; Layer 3 (DOM) fills gaps.
    """
    logger.info("Layer 1: extracting JSON-LD")
    jsonld_raw = _extract_jsonld(page)
    jsonld = _fields_from_jsonld(jsonld_raw)
    logger.debug("JSON-LD fields: %s", list(jsonld.keys()))

    logger.info("Layer 2: extracting embedded page data")
    embedded = _extract_embedded(page)
    logger.debug("Embedded fields: %s", list(embedded.keys()))

    logger.info("Layer 3: extracting DOM selectors")
    dom = _extract_dom(page)
    logger.debug("DOM fields: %s", list(dom.keys()))

    # Merge: DOM is the base, embedded overlays, JSON-LD has final priority
    merged: dict[str, Any] = {}
    merged.update(dom)

    # Embedded ASIN overrides if DOM didn't find it
    if embedded.get("asin"):
        merged["asin_from_page"] = embedded["asin"]
    if embedded.get("price_amount") and not merged.get("price_amount"):
        merged["price_amount"] = embedded["price_amount"]
    if embedded.get("price_raw_embedded") and not merged.get("price_amount"):
        merged["price_amount"] = _parse_price(embedded["price_raw_embedded"])

    # JSON-LD overrides where it has authoritative data
    for field in ("title", "brand", "price_amount", "currency", "rating", "review_count",
                  "availability", "images", "description"):
        if jsonld.get(field) is not None:
            merged[field] = jsonld[field]

    # Merge images: JSON-LD images + primary_image from DOM
    if not merged.get("images"):
        if merged.get("primary_image"):
            merged["images"] = [merged["primary_image"]]
    elif merged.get("primary_image") and merged["primary_image"] not in merged.get("images", []):
        merged.setdefault("images", []).insert(0, merged["primary_image"])

    # Set canonical ASIN
    merged["asin"] = asin
    merged["source"] = "AMAZON_IN"

    return merged
