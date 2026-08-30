export interface ScrapedData {
  title: string;
  priceBlockText?: string;
  discount?: string;
  topReviews?: string[];
  reviewEvidence?: Array<{
    title?: string;
    rating?: number;
    verifiedPurchase?: boolean;
    text: string;
  }>;
  reviewsMedleyText?: string;
  fullDescription?: string;
  serviceInfoText?: string;
  featureBullets?: string[];
  technicalDetails?: Record<string, string>;
  imageUrl?: string;
  images?: string[];
  brand?: string;
  modelNumber?: string;
  rating?: string;
  totalRatings?: string;
  totalReviews?: string;
  availability?: string;
  category?: string;
  subcategory?: string;
  warranty?: string;
  returnPolicy?: string;
  deliveryTime?: string;
  specifications?: Record<string, string> | string;
}

export interface RefinedData {
  title: string;
  price: string;
  discount?: string;
  ratingsBreakdown: Record<string, string>;
  returnPolicy: string;
  warranty: string;
  replacementinfo: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  bestFor: string;
  sentimentScore: number;
}

export type ProductData = ScrapedData & RefinedData;

export interface HistoryItem {
  refinedData: ProductData;
  sourceUrl: string;
  scrapedAt: string;
}
