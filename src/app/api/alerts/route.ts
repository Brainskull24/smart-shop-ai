import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export interface PriceAlert {
  id: string;
  productUrl: string;
  productTitle: string;
  targetPrice: number;
  currentPrice: number;
  currency: string;
  email: string;
  createdAt: string;
  notified: boolean;
}

// GET - Fetch all alerts for a user
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const alertsKey = `alerts:${email}`;
    const alerts = await kv.get<PriceAlert[]>(alertsKey);

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alerts" },
      { status: 500 }
    );
  }
}

// POST - Create a new price alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl, productTitle, targetPrice, currentPrice, currency, email } = body;

    // Validate required fields
    if (!productUrl || !productTitle || !targetPrice || !currentPrice || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate target price
    if (targetPrice >= currentPrice) {
      return NextResponse.json(
        { error: "Target price must be lower than current price" },
        { status: 400 }
      );
    }

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert: PriceAlert = {
      id: alertId,
      productUrl,
      productTitle,
      targetPrice,
      currentPrice,
      currency: currency || "₹",
      email,
      createdAt: new Date().toISOString(),
      notified: false,
    };

    // Save to user's alerts list
    const alertsKey = `alerts:${email}`;
    const existingAlerts = await kv.get<PriceAlert[]>(alertsKey) || [];
    
    // Check if alert already exists for this product
    const existingAlert = existingAlerts.find(a => a.productUrl === productUrl);
    if (existingAlert) {
      return NextResponse.json(
        { error: "Price alert already exists for this product" },
        { status: 409 }
      );
    }

    const updatedAlerts = [...existingAlerts, alert];
    await kv.set(alertsKey, updatedAlerts, { ex: 60 * 60 * 24 * 90 }); // 90 days expiry

    // Also add to global alerts list for background checking
    const globalAlertsKey = "alerts:global";
    const globalAlerts = await kv.get<string[]>(globalAlertsKey) || [];
    if (!globalAlerts.includes(email)) {
      await kv.set(globalAlertsKey, [...globalAlerts, email]);
    }

    return NextResponse.json({ 
      success: true, 
      alert,
      message: "Price alert created successfully" 
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create price alert" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a price alert
export async function DELETE(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    const alertId = request.nextUrl.searchParams.get("alertId");

    if (!email || !alertId) {
      return NextResponse.json(
        { error: "Email and alertId parameters are required" },
        { status: 400 }
      );
    }

    const alertsKey = `alerts:${email}`;
    const alerts = await kv.get<PriceAlert[]>(alertsKey) || [];
    
    const updatedAlerts = alerts.filter(a => a.id !== alertId);
    
    if (alerts.length === updatedAlerts.length) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    await kv.set(alertsKey, updatedAlerts, { ex: 60 * 60 * 24 * 90 });

    return NextResponse.json({ 
      success: true,
      message: "Price alert deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete price alert" },
      { status: 500 }
    );
  }
}
