import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/services/priceTrackingService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const history = await getPriceHistory(url);

    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (error) {
    console.error("Price history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
