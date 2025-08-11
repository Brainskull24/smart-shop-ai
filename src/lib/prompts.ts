import { ScrapedData } from "@/types/product";
type AiInputData = Partial<ScrapedData> & { scrapedAt: string };

export const createProductSummaryPrompt = (dataForAI: AiInputData): string => {
  return `You are a data processing expert. Your only job is to populate a JSON object based on the provided raw data.
**Instructions:**
  1.  Your entire response **MUST** be a single, valid JSON object.
  2.  **Title:** From the raw 'title', create a short, crisp, and clean title.
  3.  **Price & Discount:** Analyze the 'priceBlockText' blob to find the main 'price'. Use the directly provided 'discount' field if it exists.
  4.  **Review Summary:** Analyze the 'topReviews' array, which contains full user comments, and create a concise, one-paragraph summary of the common themes.
  5.  **Ratings Breakdown:** Analyze the 'reviewsMedleyText' blob and extract the percentage for each star rating into a JSON object.
  6.  **Key Features:** Analyze the 'fullDescription' and create an array of 3-5 short, concise features (4-6 words each).
  7.  **Return/Warranty:** Analyze the 'serviceInfoText' to find 'returnPolicy' and 'warranty'. If not found, set the value to "Not specified".
  8.  **Replacement:** Analyze the 'serviceInfoText' to find 'replacementinfo'. If not found, set the value to "Not specified".
  9.  For all other fields, extract them from the provided data. If a field is not present, omit its key from the final JSON.
---
**Raw Data to Process:**
${JSON.stringify(dataForAI, null, 2)}

--------------------

**JSON Response Format:**
{
  "title": "Your processed title here",
  "price": "₹1234",
  "discount": "₹200",
  "reviewSummary": "A concise summary of user reviews.",
  "ratingsBreakdown": {
    "5 stars": "80%",
    "4 stars": "10%",
    "3 stars": "5%",
    "2 stars": "3%",
    "1 star": "2%"
  },
  "keyFeatures": ["Feature 1", "Feature 2", ...],
  "returnPolicy": "30 days return policy",
  "warranty": "1 year warranty",
  "replacementinfo": "Not specified"
}`;
};
