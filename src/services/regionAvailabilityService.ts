export interface RegionPrice {
  region: string;
  country: string;
  domain: string;
  price: number;
  currency: string;
  available: boolean;
  url: string;
  shipping?: {
    available: boolean;
    cost?: number;
    estimatedDays?: string;
  };
}

export interface RegionComparison {
  productASIN: string;
  regions: RegionPrice[];
  bestDeal: {
    region: string;
    price: number;
    currency: string;
    savings?: number;
  };
  checkedAt: string;
}

const AMAZON_REGIONS = [
  { region: "IN", country: "India", domain: "amazon.in", currency: "INR", symbol: "₹" },
  { region: "US", country: "United States", domain: "amazon.com", currency: "USD", symbol: "$" },
  { region: "UK", country: "United Kingdom", domain: "amazon.co.uk", currency: "GBP", symbol: "£" },
  { region: "DE", country: "Germany", domain: "amazon.de", currency: "EUR", symbol: "€" },
  { region: "JP", country: "Japan", domain: "amazon.co.jp", currency: "JPY", symbol: "¥" },
  { region: "CA", country: "Canada", domain: "amazon.ca", currency: "CAD", symbol: "C$" },
  { region: "FR", country: "France", domain: "amazon.fr", currency: "EUR", symbol: "€" },
  { region: "IT", country: "Italy", domain: "amazon.it", currency: "EUR", symbol: "€" },
  { region: "ES", country: "Spain", domain: "amazon.es", currency: "EUR", symbol: "€" },
  { region: "AU", country: "Australia", domain: "amazon.com.au", currency: "AUD", symbol: "A$" },
];

/**
 * Extract ASIN from Amazon URL
 */
export function extractASIN(url: string): string | null {
  // Match ASIN patterns in various Amazon URL formats
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/,
    /\/([A-Z0-9]{10})(?:\/|\?|$)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Build Amazon URL for different regions
 */
export function buildRegionalUrl(asin: string, region: string): string {
  const regionInfo = AMAZON_REGIONS.find(r => r.region === region);
  if (!regionInfo) {
    throw new Error(`Unsupported region: ${region}`);
  }

  return `https://www.${regionInfo.domain}/dp/${asin}`;
}

/**
 * Get all regional URLs for a product
 */
export function getRegionalUrls(asin: string): Array<{ region: string; url: string; country: string }> {
  return AMAZON_REGIONS.map(region => ({
    region: region.region,
    url: buildRegionalUrl(asin, region.region),
    country: region.country,
  }));
}

/**
 * Currency conversion rates (approximate, should use real-time API in production)
 */
const EXCHANGE_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.12,
  GBP: 104.85,
  EUR: 89.72,
  JPY: 0.56,
  CAD: 61.45,
  AUD: 54.21,
};

/**
 * Convert price to INR for comparison
 */
export function convertToINR(price: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency];
  if (!rate) return price;
  return price * rate;
}

/**
 * Compare prices across regions
 */
export function comparePrices(regions: RegionPrice[]): {
  bestDeal: RegionPrice;
  savings: Record<string, number>;
} {
  if (regions.length === 0) {
    throw new Error("No regions to compare");
  }

  // Convert all prices to INR
  const pricesInINR = regions.map(region => ({
    ...region,
    priceInINR: convertToINR(region.price, region.currency),
  }));

  // Find best deal
  const bestDeal = pricesInINR.reduce((best, current) => 
    current.available && current.priceInINR < best.priceInINR ? current : best
  );

  // Calculate savings
  const savings: Record<string, number> = {};
  regions.forEach(region => {
    const priceInINR = convertToINR(region.price, region.currency);
    const savingsAmount = priceInINR - bestDeal.priceInINR;
    const savingsPercent = (savingsAmount / priceInINR) * 100;
    savings[region.region] = savingsPercent;
  });

  return { bestDeal, savings };
}

/**
 * Check if product ships to specific country
 * This is a simplified version - in production, you'd need to actually check Amazon
 */
export function checkShippingAvailability(
  fromRegion: string,
  toRegion: string
): { available: boolean; estimatedDays?: string; cost?: number } {
  // Common shipping routes
  const shippingMatrix: Record<string, Record<string, { available: boolean; days: string; cost: number }>> = {
    US: {
      IN: { available: true, days: "10-15 days", cost: 15 },
      UK: { available: true, days: "7-10 days", cost: 12 },
      CA: { available: true, days: "5-7 days", cost: 8 },
      AU: { available: true, days: "12-18 days", cost: 20 },
    },
    UK: {
      IN: { available: true, days: "10-14 days", cost: 14 },
      US: { available: true, days: "8-12 days", cost: 12 },
      EU: { available: true, days: "5-7 days", cost: 8 },
    },
    IN: {
      US: { available: false, days: "", cost: 0 },
      UK: { available: false, days: "", cost: 0 },
    },
  };

  const route = shippingMatrix[fromRegion]?.[toRegion];
  if (route) {
    return {
      available: route.available,
      estimatedDays: route.days,
      cost: route.cost,
    };
  }

  // Default: assume limited availability
  return { available: false };
}

/**
 * Generate region availability report
 */
export function generateAvailabilityReport(comparison: RegionComparison): string {
  const availableRegions = comparison.regions.filter(r => r.available);
  const unavailableRegions = comparison.regions.filter(r => !r.available);

  let report = `Product ASIN: ${comparison.productASIN}\n\n`;
  report += `Available in ${availableRegions.length} out of ${comparison.regions.length} regions:\n\n`;

  if (availableRegions.length > 0) {
    report += "✓ Available Regions:\n";
    availableRegions.forEach(region => {
      report += `  • ${region.country} (${region.domain}): ${region.currency} ${region.price}\n`;
    });
  }

  if (unavailableRegions.length > 0) {
    report += "\n✗ Unavailable Regions:\n";
    unavailableRegions.forEach(region => {
      report += `  • ${region.country}\n`;
    });
  }

  report += `\n💰 Best Deal: ${comparison.bestDeal.region} - ${comparison.bestDeal.currency} ${comparison.bestDeal.price}`;
  
  if (comparison.bestDeal.savings) {
    report += ` (Save ${comparison.bestDeal.savings.toFixed(2)}%)`;
  }

  return report;
}

/**
 * Get user's preferred regions based on location
 */
export function getPreferredRegions(userCountry: string): string[] {
  const preferences: Record<string, string[]> = {
    IN: ["IN", "US", "UK"],
    US: ["US", "CA", "UK"],
    UK: ["UK", "US", "DE", "FR"],
    AU: ["AU", "US", "UK"],
    CA: ["CA", "US"],
    // Add more as needed
  };

  return preferences[userCountry] || ["US", "UK", "IN"];
}
