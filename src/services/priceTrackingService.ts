import { kv } from "@vercel/kv";

export interface PriceHistoryEntry {
  price: number;
  currency: string;
  timestamp: string;
  discount?: number;
}

export interface DealScore {
  score: number; // 0-100
  label: string; // "Excellent Deal", "Good Deal", "Fair Price", "Overpriced"
  reasons: string[];
  priceChange: {
    percentage: number;
    direction: "up" | "down" | "stable";
  };
}

/**
 * Extract numeric price from price string
 */
export function extractNumericPrice(priceString: string): { value: number; currency: string } | null {
  if (!priceString) return null;
  
  // Match currency symbols and numbers
  const match = priceString.match(/([₹$£€])?\s*([0-9,]+(?:\.[0-9]{2})?)/);
  if (!match) return null;
  
  const currency = match[1] || "₹";
  const value = parseFloat(match[2].replace(/,/g, ""));
  
  return { value, currency };
}

/**
 * Save price to history
 */
export async function savePriceHistory(
  productUrl: string,
  priceString: string,
  discountString?: string
): Promise<void> {
  try {
    const priceData = extractNumericPrice(priceString);
    if (!priceData) return;

    const discountData = discountString ? extractNumericPrice(discountString) : null;
    
    const entry: PriceHistoryEntry = {
      price: priceData.value,
      currency: priceData.currency,
      timestamp: new Date().toISOString(),
      discount: discountData?.value,
    };

    const key = `price_history:${btoa(productUrl)}`;
    
    // Get existing history
    const existingHistory = await kv.get<PriceHistoryEntry[]>(key) || [];
    
    // Add new entry
    const updatedHistory = [...existingHistory, entry];
    
    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredHistory = updatedHistory.filter(
      (item) => new Date(item.timestamp) > thirtyDaysAgo
    );
    
    // Save to KV store with 90 day expiry
    await kv.set(key, filteredHistory, { ex: 60 * 60 * 24 * 90 });
  } catch (error) {
    console.error("Failed to save price history:", error);
  }
}

/**
 * Get price history for a product
 */
export async function getPriceHistory(productUrl: string): Promise<PriceHistoryEntry[]> {
  try {
    const key = `price_history:${btoa(productUrl)}`;
    const history = await kv.get<PriceHistoryEntry[]>(key);
    return history || [];
  } catch (error) {
    console.error("Failed to get price history:", error);
    return [];
  }
}

/**
 * Calculate deal score based on price history and other factors
 */
export function calculateDealScore(
  currentPrice: number,
  priceHistory: PriceHistoryEntry[],
  rating?: string,
  totalRatings?: string,
  discount?: number
): DealScore {
  const reasons: string[] = [];
  let score = 50; // Start with neutral score

  // Factor 1: Price trend (40 points)
  if (priceHistory.length >= 2) {
    const prices = priceHistory.map((h) => h.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const priceRange = maxPrice - minPrice;
    const pricePosition = (currentPrice - minPrice) / priceRange;
    
    if (currentPrice <= minPrice) {
      score += 40;
      reasons.push("Lowest price in 30 days");
    } else if (pricePosition < 0.3) {
      score += 30;
      reasons.push("Near lowest price");
    } else if (pricePosition < 0.5) {
      score += 20;
      reasons.push("Below average price");
    } else if (pricePosition > 0.8) {
      score -= 20;
      reasons.push("Higher than usual");
    }
    
    // Recent trend
    const recentPrices = prices.slice(-7);
    if (recentPrices.length >= 2) {
      const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      if (currentPrice < recentAvg * 0.95) {
        score += 10;
        reasons.push("Price dropping");
      }
    }
  }

  // Factor 2: Discount percentage (20 points)
  if (discount && discount > 0) {
    const discountPercent = ((discount - currentPrice) / discount) * 100;
    if (discountPercent >= 50) {
      score += 20;
      reasons.push(`${Math.round(discountPercent)}% discount`);
    } else if (discountPercent >= 30) {
      score += 15;
      reasons.push(`${Math.round(discountPercent)}% discount`);
    } else if (discountPercent >= 15) {
      score += 10;
      reasons.push(`${Math.round(discountPercent)}% discount`);
    }
  }

  // Factor 3: Rating quality (20 points)
  if (rating) {
    const ratingValue = parseFloat(rating);
    if (!isNaN(ratingValue)) {
      if (ratingValue >= 4.5) {
        score += 20;
        reasons.push("Excellent ratings");
      } else if (ratingValue >= 4.0) {
        score += 15;
        reasons.push("Good ratings");
      } else if (ratingValue >= 3.5) {
        score += 10;
      } else if (ratingValue < 3.0) {
        score -= 10;
        reasons.push("Low ratings");
      }
    }
  }

  // Factor 4: Review volume (10 points)
  if (totalRatings) {
    const ratingsCount = parseInt(totalRatings.replace(/[^0-9]/g, ""));
    if (!isNaN(ratingsCount)) {
      if (ratingsCount >= 1000) {
        score += 10;
        reasons.push("Well-reviewed product");
      } else if (ratingsCount >= 100) {
        score += 5;
      } else if (ratingsCount < 10) {
        score -= 5;
        reasons.push("Limited reviews");
      }
    }
  }

  // Factor 5: Availability bonus (10 points)
  score += 10; // If we got here, product is available

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine label
  let label: string;
  if (score >= 80) label = "Excellent Deal";
  else if (score >= 65) label = "Good Deal";
  else if (score >= 45) label = "Fair Price";
  else label = "Consider Waiting";

  // Calculate price change
  let priceChange: { percentage: number; direction: "up" | "down" | "stable" } = { 
    percentage: 0, 
    direction: "stable" 
  };
  if (priceHistory.length >= 2) {
    const oldPrice = priceHistory[priceHistory.length - 2].price;
    const change = ((currentPrice - oldPrice) / oldPrice) * 100;
    priceChange = {
      percentage: Math.abs(change),
      direction: change > 1 ? "up" : change < -1 ? "down" : "stable",
    };
  }

  return { score, label, reasons, priceChange };
}

/**
 * Get price alert status
 */
export async function checkPriceAlert(
  productUrl: string,
  targetPrice: number
): Promise<boolean> {
  const history = await getPriceHistory(productUrl);
  if (history.length === 0) return false;
  
  const latestPrice = history[history.length - 1].price;
  return latestPrice <= targetPrice;
}
