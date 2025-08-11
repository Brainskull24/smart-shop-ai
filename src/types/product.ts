export interface ScrapedData {
  title: string;
  priceBlockText: string;
  topReviews: string[];
  reviewsMedleyText: string;
  fullDescription: string;
  serviceInfoText: string;
  featureBullets: string[];
  technicalDetails: Record<string, string>;
  imageUrl?: string;
  brand?: string;
  modelNumber?: string;
  discount?: string;
  rating?: string;
  totalReviews?: string;
  availability?: string;
  category?: string;
  subcategory?: string;
  color?: string;
  material?: string;
  size?: string;
  weight?: string;
  dimensions?: string;
  powerSource?: string;
  batteryLife?: string;
  compatibility?: string;
  warranty?: string;
  returnPolicy?: string;
  shippingCost?: string;
  deliveryTime?: string;
}

// Data refined by the AI model
export interface RefinedData {
  title: string;
  price: string;
  discount?: string;
  reviewSummary: string;
  ratingsBreakdown: Record<string, string>;
  keyFeatures: string[];
  returnPolicy: string;
  warranty: string;
  replacementinfo: string;
}

export type ProductData = ScrapedData & RefinedData;

export interface HistoryItem {
  refinedData: ProductData;
  sourceUrl: string;
  scrapedAt: string;
}
