import { PriceHistoryEntry } from "@/types/product";

export interface PricePrediction {
  predictedPrice: number;
  confidence: number; // 0-100
  trend: "increasing" | "decreasing" | "stable";
  recommendation: string;
  estimatedDaysToLowest?: number;
  analysis: string;
}

/**
 * Simple linear regression for price prediction
 */
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }

  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calculate moving average
 */
function movingAverage(prices: number[], window: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = prices.slice(start, i + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }
  
  return result;
}

/**
 * Detect price patterns (seasonal, cyclical, etc.)
 */
function detectPattern(priceHistory: PriceHistoryEntry[]): {
  hasPattern: boolean;
  patternType?: "seasonal" | "promotional" | "declining" | "stable";
  confidence: number;
} {
  if (priceHistory.length < 7) {
    return { hasPattern: false, confidence: 0 };
  }

  const prices = priceHistory.map(h => h.price);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / avgPrice) * 100;

  // Check for declining trend
  const recentPrices = prices.slice(-5);
  const isDecreasing = recentPrices.every((price, i) => i === 0 || price <= recentPrices[i - 1]);
  
  if (isDecreasing) {
    return { hasPattern: true, patternType: "declining", confidence: 85 };
  }

  // Check for promotional patterns (sharp drops followed by recovery)
  const drops = [];
  for (let i = 1; i < prices.length; i++) {
    const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
    if (change < -10) drops.push(i);
  }

  if (drops.length >= 2) {
    return { hasPattern: true, patternType: "promotional", confidence: 75 };
  }

  // Check for stability
  if (coefficientOfVariation < 5) {
    return { hasPattern: true, patternType: "stable", confidence: 90 };
  }

  return { hasPattern: false, confidence: 50 };
}

/**
 * Predict future price based on historical data
 */
export function predictPrice(
  priceHistory: PriceHistoryEntry[],
  daysAhead: number = 7
): PricePrediction {
  // Need at least 7 data points for meaningful prediction
  if (priceHistory.length < 7) {
    const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0;
    return {
      predictedPrice: currentPrice,
      confidence: 30,
      trend: "stable",
      recommendation: "Not enough historical data for accurate prediction. Monitor for more data.",
      analysis: "Insufficient data points for statistical analysis. Need at least 7 days of price history.",
    };
  }

  // Sort by timestamp
  const sortedHistory = [...priceHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Convert to regression data points
  const startTime = new Date(sortedHistory[0].timestamp).getTime();
  const dataPoints = sortedHistory.map((entry, index) => ({
    x: index,
    y: entry.price,
  }));

  // Calculate regression
  const { slope, intercept } = linearRegression(dataPoints);

  // Predict future price
  const futureX = dataPoints.length + daysAhead;
  const predictedPrice = slope * futureX + intercept;

  // Calculate trend
  const currentPrice = sortedHistory[sortedHistory.length - 1].price;
  const priceChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
  
  let trend: "increasing" | "decreasing" | "stable";
  if (Math.abs(priceChange) < 2) {
    trend = "stable";
  } else if (priceChange > 0) {
    trend = "increasing";
  } else {
    trend = "decreasing";
  }

  // Detect patterns
  const pattern = detectPattern(sortedHistory);

  // Calculate confidence based on data quality
  const prices = sortedHistory.map(h => h.price);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower variance = higher confidence
  let confidence = Math.max(40, Math.min(95, 100 - (stdDev / avgPrice) * 100));
  
  // Adjust confidence based on data size
  if (priceHistory.length < 14) confidence *= 0.8;
  if (priceHistory.length >= 30) confidence = Math.min(95, confidence * 1.1);

  // Generate recommendation
  let recommendation = "";
  let estimatedDaysToLowest: number | undefined;

  if (pattern.hasPattern && pattern.patternType === "declining") {
    recommendation = "Price is trending downward. Consider waiting a few more days for a better deal.";
    estimatedDaysToLowest = Math.round(Math.abs(slope) > 0.5 ? 3 : 7);
  } else if (pattern.hasPattern && pattern.patternType === "promotional") {
    recommendation = "Price shows promotional patterns. Watch for sales events (weekends, holidays).";
  } else if (trend === "increasing") {
    recommendation = "Price is expected to increase. Consider buying soon if you need the product.";
  } else if (trend === "decreasing") {
    recommendation = `Price may drop by ${Math.abs(priceChange).toFixed(1)}% in ${daysAhead} days. Wait for better deal.`;
    estimatedDaysToLowest = daysAhead;
  } else {
    recommendation = "Price is stable. Buy when ready, no significant changes expected.";
  }

  // Generate analysis
  const analysis = generateAnalysis(sortedHistory, trend, pattern, confidence);

  return {
    predictedPrice: Math.max(0, predictedPrice),
    confidence: Math.round(confidence),
    trend,
    recommendation,
    estimatedDaysToLowest,
    analysis,
  };
}

/**
 * Generate detailed analysis text
 */
function generateAnalysis(
  priceHistory: PriceHistoryEntry[],
  trend: string,
  pattern: { hasPattern: boolean; patternType?: string; confidence: number },
  confidence: number
): string {
  const prices = priceHistory.map(h => h.price);
  const currentPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  const analysisPoints: string[] = [];

  // Current position
  const pricePosition = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
  if (pricePosition < 30) {
    analysisPoints.push("Currently near the lowest recorded price");
  } else if (pricePosition > 70) {
    analysisPoints.push("Currently near the highest recorded price");
  } else {
    analysisPoints.push("Currently at a mid-range price point");
  }

  // Volatility
  const volatility = ((maxPrice - minPrice) / avgPrice) * 100;
  if (volatility > 20) {
    analysisPoints.push("High price volatility detected - prices fluctuate significantly");
  } else if (volatility < 10) {
    analysisPoints.push("Low price volatility - prices are stable");
  }

  // Pattern info
  if (pattern.hasPattern && pattern.patternType) {
    const patternMessages: Record<string, string> = {
      declining: "Consistent downward price trend observed",
      promotional: "Promotional pricing patterns detected",
      seasonal: "Seasonal price variations identified",
      stable: "Very stable pricing with minimal changes",
    };
    analysisPoints.push(patternMessages[pattern.patternType]);
  }

  // Confidence note
  if (confidence >= 75) {
    analysisPoints.push("High confidence prediction based on solid data");
  } else if (confidence < 60) {
    analysisPoints.push("Moderate confidence - consider monitoring for a few more days");
  }

  return analysisPoints.join(". ") + ".";
}

/**
 * Calculate best time to buy based on historical patterns
 */
export function calculateBestTimeToBuy(priceHistory: PriceHistoryEntry[]): {
  buyNow: boolean;
  waitDays?: number;
  reason: string;
} {
  if (priceHistory.length < 7) {
    return {
      buyNow: true,
      reason: "Insufficient data to determine optimal timing",
    };
  }

  const prediction = predictPrice(priceHistory, 7);
  const currentPrice = priceHistory[priceHistory.length - 1].price;
  const prices = priceHistory.map(h => h.price);
  const minPrice = Math.min(...prices);

  // If current price is at or near historical minimum
  if (currentPrice <= minPrice * 1.05) {
    return {
      buyNow: true,
      reason: "Current price is at or near historical low",
    };
  }

  // If price is predicted to increase
  if (prediction.trend === "increasing" && prediction.confidence >= 70) {
    return {
      buyNow: true,
      reason: "Price is expected to increase soon",
    };
  }

  // If price is predicted to decrease significantly
  if (prediction.trend === "decreasing" && prediction.confidence >= 70) {
    return {
      buyNow: false,
      waitDays: prediction.estimatedDaysToLowest || 7,
      reason: `Price may drop further. Expected savings: ${Math.abs(((prediction.predictedPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`,
    };
  }

  // Default - price is stable
  return {
    buyNow: true,
    reason: "Price is stable, buy when convenient",
  };
}
