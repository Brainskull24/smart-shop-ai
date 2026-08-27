import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export interface WishlistItem {
  id: string;
  productUrl: string;
  productTitle: string;
  currentPrice: number;
  originalPrice: number;
  currency: string;
  imageUrl?: string;
  rating?: string;
  addedAt: string;
  lastChecked?: string;
  priceDropped?: boolean;
}

// GET - Fetch user's wishlist
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const wishlistKey = `wishlist:${email}`;
    const wishlist = await kv.get<WishlistItem[]>(wishlistKey);

    return NextResponse.json({ 
      wishlist: wishlist || [],
      totalItems: wishlist?.length || 0
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl, productTitle, currentPrice, currency, imageUrl, rating, email } = body;

    if (!productUrl || !productTitle || !currentPrice || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const wishlistKey = `wishlist:${email}`;
    const existingWishlist = await kv.get<WishlistItem[]>(wishlistKey) || [];

    // Check if item already exists
    const existingItem = existingWishlist.find(item => item.productUrl === productUrl);
    if (existingItem) {
      return NextResponse.json(
        { error: "Product already in wishlist" },
        { status: 409 }
      );
    }

    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: WishlistItem = {
      id: itemId,
      productUrl,
      productTitle,
      currentPrice,
      originalPrice: currentPrice,
      currency: currency || "₹",
      imageUrl,
      rating,
      addedAt: new Date().toISOString(),
      priceDropped: false,
    };

    const updatedWishlist = [...existingWishlist, newItem];
    await kv.set(wishlistKey, updatedWishlist, { ex: 60 * 60 * 24 * 365 }); // 1 year expiry

    return NextResponse.json({ 
      success: true,
      item: newItem,
      message: "Product added to wishlist"
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return NextResponse.json(
      { error: "Failed to add product to wishlist" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    const itemId = request.nextUrl.searchParams.get("itemId");

    if (!email || !itemId) {
      return NextResponse.json(
        { error: "Email and itemId parameters are required" },
        { status: 400 }
      );
    }

    const wishlistKey = `wishlist:${email}`;
    const wishlist = await kv.get<WishlistItem[]>(wishlistKey) || [];
    
    const updatedWishlist = wishlist.filter(item => item.id !== itemId);
    
    if (wishlist.length === updatedWishlist.length) {
      return NextResponse.json(
        { error: "Item not found in wishlist" },
        { status: 404 }
      );
    }

    await kv.set(wishlistKey, updatedWishlist, { ex: 60 * 60 * 24 * 365 });

    return NextResponse.json({ 
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return NextResponse.json(
      { error: "Failed to remove product from wishlist" },
      { status: 500 }
    );
  }
}

// PATCH - Update wishlist item price (for background price checking)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, itemId, newPrice } = body;

    if (!email || !itemId || newPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const wishlistKey = `wishlist:${email}`;
    const wishlist = await kv.get<WishlistItem[]>(wishlistKey) || [];
    
    const itemIndex = wishlist.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Item not found in wishlist" },
        { status: 404 }
      );
    }

    const item = wishlist[itemIndex];
    const priceDropped = newPrice < item.currentPrice;
    
    wishlist[itemIndex] = {
      ...item,
      currentPrice: newPrice,
      lastChecked: new Date().toISOString(),
      priceDropped,
    };

    await kv.set(wishlistKey, wishlist, { ex: 60 * 60 * 24 * 365 });

    return NextResponse.json({ 
      success: true,
      priceDropped,
      oldPrice: item.currentPrice,
      newPrice,
    });
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    return NextResponse.json(
      { error: "Failed to update wishlist item" },
      { status: 500 }
    );
  }
}
