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

async function runPythonWorker(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);

  try {
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

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.detail === "string"
        ? payload.detail
        : `Scraper service failed (${response.status})`;
      throw new Error(message);
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("Scraper service returned invalid JSON");
    }
    return payload as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Scraper service timed out");
    }
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

  return {
    title: (raw.title as string) ?? "",
    priceBlockText,
    imageUrl: Array.isArray(raw.images) && raw.images.length > 0
      ? (raw.images[0] as string)
      : undefined,
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
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    if (!isValidAmazonInUrl(url)) {
      return NextResponse.json(
        { error: "Only Amazon.in product URLs are supported." },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(url);

    // Run the Python scraper
    const workerOutput = await runPythonWorker(normalizedUrl);

    const scrapedData = mapToScrapedData(workerOutput);

    return NextResponse.json(
      { ...scrapedData, scrapedAt: new Date().toISOString(), sourceUrl: normalizedUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Scrape route error:", error);

    const msg = error instanceof Error ? error.message : String(error);
    let statusCode = 500;

    if (msg.includes("404")) statusCode = 404;
    else if (msg.includes("timeout") || msg.includes("Timeout")) statusCode = 504;
    else if (msg.includes("robot") || msg.includes("challenge")) statusCode = 503;
    else if (msg.includes("Validation failed") || msg.includes("ASIN")) statusCode = 422;

    return NextResponse.json(
      { error: msg, timestamp: new Date().toISOString() },
      { status: statusCode }
    );
  }
}
