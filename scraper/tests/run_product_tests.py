"""
Bulk product test runner for the Phase 1 POC.

Tests a list of Amazon.in URLs across categories, records success/failure,
missing fields, error types, and scrape duration. Saves results to
scraper/results/test_run_<timestamp>.json

Usage:
    python -m scraper.tests.run_product_tests
    python -m scraper.tests.run_product_tests --urls-file my_urls.txt
    python -m scraper.tests.run_product_tests --limit 10

The default URL list covers Electronics, Clothing, Home, Beauty, Books,
Sports, Grocery, and Accessories — add your own ASINs to TEST_URLS below.
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add scraper root to path when run directly
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scraper.app.worker import scrape_product, _serialize

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stderr,
)

# ---------------------------------------------------------------------------
# Default test URLs — one per Amazon.in category
# Replace/expand these with real ASINs you want to validate
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Default test URLs — loaded from producturls.txt at the workspace root.
# Add new lines to that file to expand the test set.
# Format: one URL per line, comments start with #
# Optionally annotate with a category comment on the same line:
#   https://...  # Electronics
# ---------------------------------------------------------------------------
def _load_urls_from_file() -> list[dict]:
    urls_file = Path(__file__).parent.parent.parent / "producturls.txt"
    if not urls_file.exists():
        return []
    entries = []
    for line in urls_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Support inline category annotation:  <url>  # Category
        category = "Unknown"
        if "  #" in line or "\t#" in line:
            parts = line.rsplit("#", 1)
            line = parts[0].strip()
            category = parts[1].strip()
        entries.append({"category": category, "url": line})
    return entries


TEST_URLS: list[dict] = _load_urls_from_file()

REQUIRED_FIELDS = ["asin", "title", "price", "rating", "review_count", "images", "availability"]


def _check_missing_fields(product: dict) -> list[str]:
    missing = []
    for field in REQUIRED_FIELDS:
        val = product.get(field)
        if field == "price":
            if not val or val.get("amount") is None:
                missing.append(field)
        elif field == "images":
            if not val:
                missing.append(field)
        elif val is None or val == "" or val == "UNKNOWN":
            missing.append(field)
    return missing


def run_tests(urls: list[dict], output_dir: Path) -> None:
    results = []
    passed = 0
    failed = 0

    print(f"\nTesting {len(urls)} Amazon.in product URLs\n" + "=" * 60, file=sys.stderr)

    for i, entry in enumerate(urls, 1):
        url = entry["url"]
        category = entry.get("category", "Unknown")
        print(f"\n[{i}/{len(urls)}] {category}: {url}", file=sys.stderr)

        record: dict = {
            "index": i,
            "category": category,
            "url": url,
            "status": None,
            "asin": None,
            "title": None,
            "missing_fields": [],
            "error": None,
            "error_type": None,
            "duration_seconds": None,
            "quality_score": None,
            "warnings": [],
        }

        start = time.time()
        try:
            raw = scrape_product(url)
            product = _serialize(raw)
            elapsed = round(time.time() - start, 2)

            record["status"] = "SUCCESS"
            record["asin"] = product.get("asin")
            record["title"] = product.get("title", "")[:80]
            record["missing_fields"] = _check_missing_fields(product)
            record["duration_seconds"] = elapsed
            record["quality_score"] = product.get("quality_score")
            record["warnings"] = product.get("warnings", [])

            passed += 1
            missing_label = f" (missing: {record['missing_fields']})" if record["missing_fields"] else ""
            print(
                f"  ✓ {product.get('asin')} | {product.get('title', '')[:50]} | "
                f"score={product.get('quality_score')}/100 | {elapsed}s{missing_label}",
                file=sys.stderr,
            )

        except Exception as e:
            elapsed = round(time.time() - start, 2)
            error_type = type(e).__name__
            record["status"] = "FAILED"
            record["error"] = str(e)[:200]
            record["error_type"] = error_type
            record["duration_seconds"] = elapsed
            failed += 1
            print(f"  ✗ {error_type}: {str(e)[:80]}", file=sys.stderr)

        results.append(record)
        # Small courtesy delay between requests
        if i < len(urls):
            time.sleep(2)

    # Summary
    total = len(results)
    success_rate = round(passed / total * 100, 1) if total else 0
    avg_duration = round(
        sum(r["duration_seconds"] or 0 for r in results) / total, 2
    ) if total else 0

    summary = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "success_rate_pct": success_rate,
        "avg_duration_seconds": avg_duration,
        "results": results,
    }

    # Save to file
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    outfile = output_dir / f"test_run_{ts}.json"
    outfile.write_text(json.dumps(summary, indent=2, ensure_ascii=False))

    print(f"\n{'=' * 60}", file=sys.stderr)
    print(f"Results: {passed}/{total} passed ({success_rate}%)", file=sys.stderr)
    print(f"Average scrape time: {avg_duration}s", file=sys.stderr)
    print(f"Saved to: {outfile}", file=sys.stderr)

    # Also print summary JSON to stdout
    print(json.dumps({
        "total": total,
        "passed": passed,
        "failed": failed,
        "success_rate_pct": success_rate,
        "avg_duration_seconds": avg_duration,
        "output_file": str(outfile),
    }, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Bulk Amazon.in product test runner")
    parser.add_argument(
        "--urls-file",
        help="Path to a text file with one URL per line (overrides built-in list)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit the number of URLs to test",
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).parent.parent / "results"),
        help="Directory to save results JSON (default: scraper/results/)",
    )
    args = parser.parse_args()

    urls = TEST_URLS

    if args.urls_file:
        path = Path(args.urls_file)
        if not path.exists():
            print(f"URLs file not found: {path}", file=sys.stderr)
            sys.exit(2)
        raw_lines = path.read_text().splitlines()
        urls = [
            {"category": "Custom", "url": line.strip()}
            for line in raw_lines
            if line.strip() and not line.startswith("#")
        ]

    if args.limit:
        urls = urls[: args.limit]

    run_tests(urls, Path(args.output_dir))


if __name__ == "__main__":
    main()
