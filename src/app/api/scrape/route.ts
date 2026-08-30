import { NextRequest, NextResponse } from "next/server";
import { ScrapedData } from "@/types/product";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    ["ref", "ref_", "tag", "psc", "qid", "sr", "keywords"].forEach((p) =>
      urlObj.searchParams.delete(p)
    );
    urlObj.searchParams.sort();
    return urlObj.toString();
  } catch {
    return url;
  }
}

function isValidAmazonInUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return h === "amazon.in" || h === "www.amazon.in" || h === "amzn.in";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Remote Python scraper invocation
// ---------------------------------------------------------------------------

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || "http://127.0.0.1:8000";
const SCRAPER_SERVICE_TOKEN = process.env.SCRAPER_SERVICE_TOKEN;
const SCRAPER_TIMEOUT_MS = Number(process.env.SCRAPER_TIMEOUT_MS || 120_000);

async function runPythonWorker(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    console.log("[scrape-route] starting upstream scraper", {
      url,
      timeoutMs: SCRAPER_TIMEOUT_MS,
      scraperUrl: `${SCRAPER_SERVICE_URL.replace(/\/$/, "")}/scrape`,
      tokenConfigured: Boolean(SCRAPER_SERVICE_TOKEN),
    });

    const response = await fetch(`${SCRAPER_SERVICE_URL.replace(/\/$/, "")}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SCRAPER_SERVICE_TOKEN ? { "X-Scraper-Token": SCRAPER_SERVICE_TOKEN } : {}),
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
      cache: "no-store",
    });

    const elapsedMs = Date.now() - startedAt;
    console.log("[scrape-route] upstream response received", {
      status: response.status,
      elapsedMs,
      contentType: response.headers.get("content-type"),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.detail === "string"
        ? payload.detail
        : `Scraper service failed (${response.status})`;
      console.error("[scrape-route] upstream scraper failed", {
        status: response.status,
        elapsedMs,
        error: message,
      });
      throw new Error(message);
    }
    if (!payload || typeof payload !== "object") {
      console.error("[scrape-route] invalid upstream payload", { elapsedMs, payload });
      throw new Error("Scraper service returned invalid JSON");
    }

    console.log("[scrape-route] upstream scraper succeeded", {
      elapsedMs,
      keys: Object.keys(payload),
    });
    return payload as Record<string, unknown>;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[scrape-route] upstream scraper timeout", {
        url,
        elapsedMs,
        timeoutMs: SCRAPER_TIMEOUT_MS,
      });
      throw new Error("Scraper service timed out");
    }
    console.error("[scrape-route] upstream scraper exception", {
      url,
      elapsedMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Map Python worker output → ScrapedData (what the AI prompt expects)
// ---------------------------------------------------------------------------

function mapToScrapedData(raw: Record<string, unknown>): ScrapedData {
  const specs = raw.specifications as Record<string, string> | undefined;

  // price.amount → "₹499" style string for the AI prompt
  const price = raw.price as { amount?: number; currency?: string } | undefined;
  const priceBlockText = price?.amount != null
    ? `₹${price.amount.toLocaleString("en-IN")}`
    : undefined;

  // features array → featureBullets
  const features = Array.isArray(raw.features) ? (raw.features as string[]) : [];
  const topReviews = Array.isArray(raw.top_reviews)
    ? (raw.top_reviews as Array<Record<string, unknown>>).map((review) => {
        const rating = review.rating != null ? `${review.rating}/5` : "Rating unavailable";
        const verified = review.verified_purchase ? "Verified purchase" : "Purchase not verified";
        const title = review.title ? `${review.title}: ` : "";
        return `[${rating}; ${verified}] ${title}${String(review.text ?? "")}`;
      })
    : [];
  const reviewEvidence = Array.isArray(raw.top_reviews)
    ? (raw.top_reviews as Array<Record<string, unknown>>).map((review) => ({
        title: review.title as string | undefined,
        rating: typeof review.rating === "number" ? review.rating : undefined,
        verifiedPurchase: review.verified_purchase === true,
        text: String(review.text ?? ""),
      }))
    : [];

  const images = Array.isArray(raw.images) ? raw.images.filter((item): item is string => typeof item === "string") : [];

  return {
    title: (raw.title as string) ?? "",
    priceBlockText,
    imageUrl: images.length > 0 ? images[0] : undefined,
    images: images.length > 0 ? images : undefined,
    brand: raw.brand as string | undefined,
    rating: raw.rating != null ? String(raw.rating) : undefined,
    totalRatings: raw.review_count != null
      ? `${(raw.review_count as number).toLocaleString("en-IN")} ratings`
      : undefined,
    totalReviews: raw.review_count != null
      ? `${(raw.review_count as number).toLocaleString("en-IN")} reviews`
      : undefined,
    availability: raw.availability as string | undefined,
    fullDescription: raw.description as string | undefined,
    featureBullets: features.length > 0 ? features : undefined,
    specifications: specs,
    discount: raw.discount_text as string | undefined,
    topReviews,
    reviewEvidence,
    reviewsMedleyText: raw.rating_breakdown_text as string | undefined,
    serviceInfoText: raw.service_info as string | undefined,
    deliveryTime: raw.delivery_time as string | undefined,
    category: raw.category as string | undefined,
    subcategory: undefined,
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      const metrics = { requestMs: Date.now() - requestStartedAt };
      console.warn("[scrape-route] invalid request body", { body, metrics });
      return NextResponse.json(
        { error: "url is required and must be a string", fallback: true, metrics },
        { status: 400 }
      );
    }

    if (!isValidAmazonInUrl(url)) {
      const metrics = { requestMs: Date.now() - requestStartedAt };
      console.warn("[scrape-route] unsupported domain", { url, metrics });
      return NextResponse.json(
        { error: "Only Amazon.in product URLs are supported.", fallback: true, metrics },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(url);
    console.log("[scrape-route] request accepted", {
      originalUrl: url,
      normalizedUrl,
      requestStartedAt,
      timeoutMs: SCRAPER_TIMEOUT_MS,
    });

    const workerOutput = await runPythonWorker(normalizedUrl);
    const scrapedData = mapToScrapedData(workerOutput);
    const metrics = {
      requestMs: Date.now() - requestStartedAt,
      upstreamTimeoutMs: SCRAPER_TIMEOUT_MS,
      productTitleLength: scrapedData.title?.length ?? 0,
      imageCount: (scrapedData.imageUrl ? 1 : 0) + (Array.isArray(scrapedData.images) ? scrapedData.images.length : 0),
    };

    console.log("[scrape-route] response built successfully", {
      normalizedUrl,
      metrics,
    });

    return NextResponse.json(
      {
        ...scrapedData,
        scrapedAt: new Date().toISOString(),
        sourceUrl: normalizedUrl,
        metrics,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const elapsedMs = Date.now() - requestStartedAt;
    const msg = error instanceof Error ? error.message : String(error);
    let statusCode = 500;

    if (msg.includes("404")) statusCode = 404;
    else if (msg.includes("timeout") || msg.includes("Timeout")) statusCode = 504;
    else if (msg.includes("robot") || msg.includes("challenge")) statusCode = 503;
    else if (msg.includes("Validation failed") || msg.includes("ASIN")) statusCode = 422;

    const fallbackPayload = {
      error: msg,
      fallback: true,
      timestamp: new Date().toISOString(),
      metrics: {
        requestMs: elapsedMs,
        timeoutMs: SCRAPER_TIMEOUT_MS,
      },
    };

    console.error("[scrape-route] final scrape failure", {
      statusCode,
      elapsedMs,
      error: msg,
      fallback: true,
    });

    return NextResponse.json(fallbackPayload, { status: statusCode });
  }
}
