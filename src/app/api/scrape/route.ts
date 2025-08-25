import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { scrapeUrl } from "@/services/scrapeService";

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error(
    "KV_REST_API_URL and KV_REST_API_TOKEN environment variables are not set."
  );
}

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const data: Record<string, any> = await scrapeUrl(url);
    data.scrapedAt = new Date().toISOString();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Scraping error in API route:", error);
    let errorMessage = "An unknown error occurred during scraping.";
    if (error.name === "TimeoutError") {
      errorMessage =
        "The request timed out. The site may be slow or blocking requests.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
