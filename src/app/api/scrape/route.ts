import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { scrapeUrl } from "@/services/scrapeService";
import { ScrapedData } from "@/types/product";
import { savePriceHistory } from "@/services/priceTrackingService";

// Validate environment variables
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error(
    "Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN must be set for rate limiting and caching to work."
  );
}

// Initialize rate limiter with more reasonable limits
// 10 requests per minute per IP
let ratelimit: Ratelimit | null = null;

try {
  ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:scrape",
  });
} catch (error) {
  console.error("Failed to initialize rate limiter:", error);
}

// Serverless function configuration
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Normalize URL for consistent caching
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove tracking parameters
    const paramsToRemove = [
      "ref",
      "ref_",
      "tag",
      "psc",
      "qid",
      "sr",
      "keywords",
    ];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

    // Sort remaining params for consistency
    urlObj.searchParams.sort();

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Validate product URL
 */
function isValidProductUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if it's Amazon, Flipkart, or Myntra
    const isAmazon = hostname.includes("amazon.") || hostname.includes("amzn.");
    const isFlipkart = hostname.includes("flipkart.com");
    const isMyntra = hostname.includes("myntra.com");

    if (!isAmazon && !isFlipkart && !isMyntra) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Apply rate limiting (skip if rate limiter failed to initialize)
    let limit = 10;
    let remaining = 10;
    let reset = Date.now();

    if (ratelimit) {
      try {
        const rateLimitResult = await ratelimit.limit(ip);
        limit = rateLimitResult.limit;
        remaining = rateLimitResult.remaining;
        reset = rateLimitResult.reset;

        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              error: "Too many requests. Please try again later.",
              limit,
              remaining,
              reset: new Date(reset).toISOString(),
            },
            {
              status: 429,
              headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
              },
            }
          );
        }
      } catch (rateLimitError) {
        console.warn(
          "Rate limiting failed, continuing without rate limit:",
          rateLimitError
        );
        // Continue without rate limiting if it fails
      }
    } else {
      console.warn("Rate limiter not initialized, skipping rate limiting");
    }

    // Parse and validate request body
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate URL format and domain
    if (!isValidProductUrl(url)) {
      return NextResponse.json(
        {
          error:
            "Invalid product URL. Please provide a valid Amazon, Flipkart, or Myntra product link.",
        },
        { status: 400 }
      );
    }

    // Normalize URL for caching
    const normalizedUrl = normalizeUrl(url);

    // Scrape the product
    const data: ScrapedData = await scrapeUrl(normalizedUrl);

    // Save price history (don't block on this)
    if (data.priceBlockText) {
      savePriceHistory(normalizedUrl, data.priceBlockText, data.discount).catch((err) =>
        console.error("Failed to save price history:", err)
      );
    }

    // Add metadata
    const response = {
      ...data,
      scrapedAt: new Date().toISOString(),
      sourceUrl: normalizedUrl,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
      },
    });
  } catch (error) {
    console.error("Scraping error in API route:", error);

    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Determine error type and message
    let errorMessage = "An unexpected error occurred during scraping.";
    let statusCode = 500;

    if (error instanceof Error) {
      // Handle ETXTBSY error (Chromium binary locked - concurrent access issue)
      if (
        error.message.includes("ETXTBSY") ||
        error.message.includes("spawn ETXTBSY")
      ) {
        errorMessage =
          "Server is busy processing another request. Please try again in a few seconds.";
        statusCode = 503; // Service Unavailable
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("Timeout")
      ) {
        errorMessage =
          "Request timed out. The site may be slow or blocking requests.";
        statusCode = 504;
      } else if (
        error.message.includes("navigation") ||
        error.message.includes("navigate")
      ) {
        errorMessage =
          "Failed to load the product page. Please check the URL and try again.";
        statusCode = 502;
      } else if (error.message.includes("Unsupported website")) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes("extract product title")) {
        errorMessage =
          "Could not extract product data. The page format may have changed.";
        statusCode = 422;
      } else if (
        error.message.includes("Chrome") ||
        error.message.includes("chrome")
      ) {
        errorMessage = "Browser initialization failed. " + error.message;
        statusCode = 500;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
