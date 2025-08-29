import { ScrapedData } from "@/types/product";
type AiInputData = Partial<ScrapedData>;

export const createProductSummaryPrompt = (dataForAI: AiInputData): string => {
  return `You are a data processing expert for e-commerce data. Your only job is to populate a JSON object based on the provided raw data scraped from a site like Amazon, Flipkart, or Myntra.
    **Instructions:**
      1.  Your entire response **MUST** be a single, valid JSON object.
      2.  **Title:** From the raw 'title', create a short, crisp, and clean title.
      3.  **Price & Discount:** Analyze 'priceBlockText' for the main 'price'. The price may be in any currency (e.g., ₹, $, £). Preserve the currency symbol. Use the 'discount' field if it exists.
      4.  **Review Summary:** Analyze 'topReviews' to create a one-paragraph summary of common themes.
      5.  **Important Specs:** From the 'specifications' object, 'featureBullets' and 'fullDescription', identify the 4-6 most important technical specifications for 
            respective product category (e.g., for a phone: RAM, Storage, Camera; for headphones: Connectivity, Battery Life). You can use "category"
            and "subcategory" to help determine the product type. Add these key-value pairs to a 'specs' object. If no specs are found, omit the key. 
            **Always try to get at least 3-4 specs but only if present in specified fields**.
      6.  **Ratings Breakdown:** Analyze 'reviewsMedleyText' and extract the percentage for each star rating.
      7.  **Analyze Reviews for Pros & Cons:** From 'topReviews' and 'reviewsMedleyText', extract the 3 most common praises into a 'pros' array and the 3 most common complaints into a 'cons' array. These should be concise and impactful.
      8.  **Determine Target Audience:** Based on all data, write a short "bestFor" string describing the ideal user (e.g., "Best for students and casual users on a budget.").
      9.  **Calculate Sentiment Score:** Based on the review ratings and text, provide a 'sentimentScore' from 1 (overwhelmingly negative) to 10 (overwhelmingly positive).
      10. **Return/Warranty/Replacement:** Analyze 'serviceInfoText' to find 'returnPolicy', 'replacementinfo' and 'warranty'. If not found, set value to "".
      11. For all other fields, extract them directly. If a field isn't present, omit its key from the final JSON.
    
    --------------------

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
      "specs": {
        "Brand": "Sony",
        "Model Name": "WH-1000XM5",
        "Form Factor": "Over Ear",
        "Connectivity Technology": "Wireless"
      },
      "pros": [
        "Vibrant and smooth display",
        "Excellent battery life, lasts all day",
        "Camera performs well in good lighting"
      ],
      "cons": [
        "Pre-installed bloatware is excessive",
        "Low-light camera performance is average",
        "Plastic build feels less premium"
      ],
      "bestFor": "Best for students and casual users looking for a reliable daily driver.",
      "sentimentScore": 8,
      "returnPolicy": "30 days return policy",
      "warranty": "1 year warranty"
      "replacementinfo": "Replacement available within 7 days"
    }`;
};