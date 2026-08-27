import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/services/scrapeService";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { urls } = body as { urls: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of product URLs" },
        { status: 400 }
      );
    }

    if (urls.length > 3) {
      return NextResponse.json(
        { error: "Maximum 3 products can be compared at once" },
        { status: 400 }
      );
    }

    // Validate all URLs are from Amazon
    const amazonRegex = /^https?:\/\/(www\.)?(amazon\.(in|com)|amzn\.in)\//;
    const invalidUrls = urls.filter((url) => !amazonRegex.test(url));
    
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { error: "All URLs must be from Amazon (amazon.in or amazon.com)" },
        { status: 400 }
      );
    }

    // Scrape all products in parallel
    const scrapePromises = urls.map(async (url) => {
      try {
        const data = await scrapeUrl(url);
        return { success: true, data, url };
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "Failed to scrape", 
          url 
        };
      }
    });

    const results = await Promise.allSettled(scrapePromises);

    // Process results
    const products = results.map((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        return {
          ...result.value.data,
          sourceUrl: urls[index],
          scrapedAt: new Date().toISOString(),
        };
      }
      return null;
    }).filter(Boolean);

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Failed to scrape any products. Please check URLs and try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      products,
      comparedAt: new Date().toISOString(),
      totalCompared: products.length
    });

  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compare products" },
      { status: 500 }
    );
  }
}
