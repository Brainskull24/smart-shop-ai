"""HTTP API for the synchronous Playwright scraper service."""

import hmac
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl

from .worker import scrape_product, _serialize

app = FastAPI(title="SmartShop scraper", version="1.0.0")


class ScrapeRequest(BaseModel):
    url: HttpUrl


def _check_token(provided_token: str | None) -> None:
    """Require the shared service token when configured for deployment."""
    expected_token = os.getenv("SCRAPER_API_TOKEN")
    if expected_token and not hmac.compare_digest(provided_token or "", expected_token):
        raise HTTPException(status_code=401, detail="Invalid scraper service token")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scrape")
def scrape(request: ScrapeRequest, x_scraper_token: str | None = Header(default=None)) -> dict[str, Any]:
    _check_token(x_scraper_token)
    url = str(request.url)
    try:
        return _serialize(scrape_product(url))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        message = str(error)
        status_code = 503 if "robot" in message.lower() or "challenge" in message.lower() else 502
        raise HTTPException(status_code=status_code, detail=message) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Unexpected scraper failure") from error
