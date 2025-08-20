export interface ScrapedData {
  title: string;
  priceBlockText: string;
  discount?: string;
  topReviews?: string[];
  reviewsMedleyText?: string;
  fullDescription: string;
  serviceInfoText: string;
  featureBullets?: string[];
  technicalDetails?: Record<string, string>;
  imageUrl?: string;
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
  specifications?: Record<string, string>;
}

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
  specs: Record<string, string>;
}

export type ProductData = ScrapedData & RefinedData;

export interface HistoryItem {
  refinedData: ProductData;
  sourceUrl: string;
  scrapedAt: string;
}
