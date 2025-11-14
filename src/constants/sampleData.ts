import { HistoryItem } from "@/types/product";

export const SAMPLE_PRODUCT_DATA: HistoryItem = {
  refinedData: {
    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    price: "₹29,990",
    discount: "₹34,990",
    reviewSummary:
      "Users overwhelmingly praise the WH-1000XM5 for its exceptional, industry-leading noise cancellation and comfortable design, making it ideal for travel and focused work. While the sound quality is excellent, some long-time fans note that the new design is less portable as it no longer folds.",
    ratingsBreakdown: {
      "5 stars": "78%",
      "4 stars": "15%",
      "3 stars": "4%",
      "2 stars": "1%",
      "1 star": "2%",
    },
    specs: {
      Brand: "Sony",
      "Model Name": "WH-1000XM5",
      "Form Factor": "Over Ear",
      Connectivity: "Wireless, Bluetooth 5.2",
      "Battery Life": "Up to 30 hours",
      "Special Feature": "Active Noise Cancellation",
    },
    pros: [
      "Best-in-class noise cancellation",
      "Extremely comfortable for long listening sessions",
      "Clear, detailed audio quality with powerful bass",
      "Seamless multi-device pairing",
    ],
    cons: [
      "New design does not fold, making it less compact for travel",
      "Premium price point",
      "Auto NC Optimizer can be overly sensitive for some users",
    ],
    bestFor:
      "Ideal for frequent travelers, commuters, and professionals who need to block out distractions and enjoy high-fidelity audio.",
    sentimentScore: 9,
    returnPolicy: "7 days replacement",
    warranty: "1 Year Manufacturer Warranty",
    replacementinfo: "7 days replacement",
    imageUrl: "https://m.media-amazon.com/images/I/51aXvjzcukL._SX679_.jpg",
    brand: "Sony",
    modelNumber: "WH-1000XM5",
    rating: "4.6",
    totalRatings: "8,450 ratings",
    availability: "In Stock",
  },
  sourceUrl:
    "https://www.amazon.in/Sony-WH-1000XM5-Wireless-Cancelling-Headphones/dp/B09WN3SK23/",
  scrapedAt: new Date().toISOString(),
};
