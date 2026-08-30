"""
Playwright browser lifecycle management.

Conservative settings:
  - Single browser instance reused across jobs (worker manages lifecycle)
  - Standard desktop viewport and User-Agent
  - Blocks heavyweight assets (images, fonts, media) for speed
  - No stealth plugins in V1; treat challenge pages as failure conditions
"""

import logging
import random
from contextlib import contextmanager

from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, Playwright

logger = logging.getLogger(__name__)

# Production-focused timeouts tuned for faster scrapes without timing out
PAGE_TIMEOUT_MS = 20_000
NAV_TIMEOUT_MS = 20_000

# Block only the heaviest resource types; keep CSS enabled so page structure loads faster
BLOCKED_RESOURCE_TYPES = {"image", "font", "media"}

# Domains to block regardless of resource type
BLOCKED_DOMAINS = [
    "google-analytics.com",
    "googletagmanager.com",
    "facebook.net",
    "doubleclick.net",
    "amazon-adsystem.com",
    "adservice.google.com",
    "fls-na.amazon.in",
    "aax-us-iad.amazon.com",
    "unagi.amazon.in",
]

USER_AGENTS = [
    # Chrome on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    # Chrome on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    # Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
]


def _is_blocked_request(url: str, resource_type: str) -> bool:
    if resource_type in BLOCKED_RESOURCE_TYPES:
        return True
    for domain in BLOCKED_DOMAINS:
        if domain in url:
            return True
    return False


@contextmanager
def create_browser():
    """
    Context manager that starts a Playwright browser and yields it.
    Closes the browser (and Playwright) on exit.

    Usage:
        with create_browser() as browser:
            page = browser.new_page()
            ...
    """
    pw: Playwright | None = None
    browser: Browser | None = None
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-blink-features=AutomationControlled",
                "--disable-background-networking",
                "--disable-renderer-backgrounding",
                "--disable-background-timer-throttling",
                "--disable-ipc-flooding-protection",
            ],
        )
        logger.info("Browser launched")
        yield browser
    finally:
        if browser:
            try:
                browser.close()
                logger.info("Browser closed")
            except Exception as e:
                logger.warning("Error closing browser: %s", e)
        if pw:
            try:
                pw.stop()
            except Exception:
                pass


def new_context(browser: Browser) -> BrowserContext:
    """Create a fresh browser context with randomised UA and sensible viewport."""
    user_agent = random.choice(USER_AGENTS)
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent=user_agent,
        locale="en-IN",
        timezone_id="Asia/Kolkata",
        extra_http_headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IN,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
        },
    )
    return context


def open_product_page(browser: Browser, url: str) -> Page:
    """
    Open a product URL in a new context/page.

    Blocks unnecessary resources for faster load.
    Returns the Page object; caller is responsible for closing the context.

    Raises:
        RuntimeError: if navigation fails or times out.
    """
    context = new_context(browser)
    page = context.new_page()
    page.set_default_timeout(PAGE_TIMEOUT_MS)

    # Block heavyweight/tracking resources
    def handle_route(route, request):
        if _is_blocked_request(request.url, request.resource_type):
            route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)

    try:
        logger.info("Navigating to: %s", url)
        response = page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
        if response is None:
            raise RuntimeError("Navigation returned no response")
        # 404 means the product page is genuinely gone — no point retrying
        if response.status == 404:
            raise RuntimeError(f"HTTP 404 — product page not found: {url}")
        # Other 4xx/5xx are potentially transient
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status} for {url}")
        logger.info("Page loaded (status=%d)", response.status)
        return page
    except Exception as e:
        # Clean up on failure
        try:
            context.close()
        except Exception:
            pass
        raise RuntimeError(f"Failed to load page: {e}") from e


def is_challenge_page(page: Page) -> bool:
    """
    Detect Amazon robot/CAPTCHA challenge pages.
    Returns True if the page appears to be a challenge; False otherwise.
    """
    CHALLENGE_SIGNALS = [
        "To discuss automated access to Amazon data please contact",
        "Sorry, we just need to make sure you're not a robot",
        "Enter the characters you see below",
        "Robot Check",
        "Type the characters you see in this image",
    ]
    try:
        body_text = page.inner_text("body") or ""
        for signal in CHALLENGE_SIGNALS:
            if signal.lower() in body_text.lower():
                return True
    except Exception:
        pass
    return False
