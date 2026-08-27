import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

interface RecommendationRequest {
  category?: string;
  priceRange?: { min: number; max: number };
  minRating?: number;
  keywords?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RecommendationRequest;
    const { category, priceRange, minRating, keywords } = body;

    // In a production environment, this would query a database or use Amazon API
    // For now, we'll generate recommendations based on category and filters
    const recommendations = await generateRecommendations({
      category,
      priceRange,
      minRating,
      keywords,
    });

    return NextResponse.json({ 
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

async function generateRecommendations(filters: RecommendationRequest) {
  // This is a placeholder implementation
  // In production, you would:
  // 1. Query your database of previously scraped products
  // 2. Use Amazon Product Advertising API
  // 3. Use AI to analyze similar products
  
  const { category, priceRange, minRating = 4.0 } = filters;

  // Get recently analyzed products from cache
  const recentProductsKey = "recent_products";
  const recentProducts = await kv.get<Array<{
    title: string;
    price: number;
    rating: number;
    url: string;
    category?: string;
    imageUrl?: string;
  }>>(recentProductsKey) || [];

  // Filter based on criteria
  const filtered = recentProducts.filter(product => {
    if (minRating && product.rating < minRating) return false;
    if (priceRange) {
      if (product.price < priceRange.min || product.price > priceRange.max) return false;
    }
    if (category && product.category !== category) return false;
    return true;
  });

  // Sort by rating and return top 5
  filtered.sort((a, b) => b.rating - a.rating);
  
  return filtered.slice(0, 5).map(product => ({
    title: product.title,
    price: product.price,
    rating: product.rating,
    url: product.url,
    imageUrl: product.imageUrl,
    category: product.category,
    recommendationReason: generateReason(product, filters),
  }));
}

function generateReason(
  product: { rating: number; price: number },
  filters: RecommendationRequest
): string {
  const reasons: string[] = [];
  
  if (product.rating >= 4.5) {
    reasons.push("Highly rated");
  }
  
  if (filters.priceRange) {
    const midPrice = (filters.priceRange.min + filters.priceRange.max) / 2;
    if (product.price < midPrice) {
      reasons.push("Great value");
    }
  }
  
  return reasons.join(" • ") || "Popular choice";
}

// Helper endpoint to save product for recommendations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, price, rating, url, category, imageUrl } = body;

    const recentProductsKey = "recent_products";
    const recentProducts = await kv.get<Array<any>>(recentProductsKey) || [];

    // Add new product and keep only last 100
    const updated = [
      { title, price, rating, url, category, imageUrl, addedAt: new Date().toISOString() },
      ...recentProducts
    ].slice(0, 100);

    await kv.set(recentProductsKey, updated, { ex: 60 * 60 * 24 * 30 }); // 30 days

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving product:", error);
    return NextResponse.json(
      { error: "Failed to save product" },
      { status: 500 }
    );
  }
}
