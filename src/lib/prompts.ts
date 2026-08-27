import { ScrapedData } from "@/types/product";
type AiInputData = Partial<ScrapedData>;

export const createProductSummaryPrompt = (dataForAI: AiInputData): string => {
  const hasReviews = dataForAI.topReviews && dataForAI.topReviews.length > 0;
  
  if (hasReviews) {
    return createPromptWithReviews(dataForAI);
  } else {
    return createPromptWithoutReviews(dataForAI);
  }
};

// Prompt when we have reviews - includes review analysis
const createPromptWithReviews = (dataForAI: AiInputData): string => {
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
      "warranty": "1 year warranty",
      "replacementinfo": "Replacement available within 7 days"
    }`;
};

// Simplified prompt when we have NO reviews - faster AI processing
const createPromptWithoutReviews = (dataForAI: AiInputData): string => {
  return `You are a data processing expert for e-commerce data. Your only job is to populate a JSON object based on the provided product data.
    **Instructions:**
      1.  Your entire response **MUST** be a single, valid JSON object.
      2.  **Title:** From the raw 'title', create a short, crisp, and clean title.
      3.  **Price & Discount:** Analyze 'priceBlockText' for the main 'price'. The price may be in any currency (e.g., ₹, $, £). Preserve the currency symbol. Use the 'discount' field if it exists.
      4.  **Ratings Breakdown:** If 'reviewsMedleyText' is available, analyze it and extract the percentage for each star rating. If not available, use empty object.
      5.  **Important Specs:** From the 'specifications' object, 'featureBullets' and 'fullDescription', identify the 4-6 most important technical specifications for 
            the product category (e.g., for a phone: RAM, Storage, Camera; for headphones: Connectivity, Battery Life). Add these key-value pairs to a 'specs' object.
            **Always try to get at least 3-4 specs but only if present in specified fields**.
      6.  **Analyze Description for Pros & Cons:** From 'fullDescription' and 'featureBullets', identify the 3 most notable product features into a 'pros' array and 3 potential limitations into a 'cons' array. Be realistic and balanced.
      7.  **Determine Target Audience:** Based on the product description and features, write a short "bestFor" string describing the ideal user (e.g., "Best for professionals seeking premium audio quality.").
      8.  **Sentiment Score:** Based on the overall product rating if available, provide a 'sentimentScore' from 1-10. If no rating available, estimate based on product quality indicators.
      9.  **Return/Warranty/Replacement:** Analyze 'serviceInfoText' to find 'returnPolicy', 'replacementinfo' and 'warranty'. If not found, set value to "".
      10. For 'reviewSummary', set to empty string since no individual reviews are available.
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
      "reviewSummary": "",
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
        "Premium build quality with aluminum frame",
        "Latest generation processor",
        "High-capacity battery"
      ],
      "cons": [
        "Higher price point",
        "May be too feature-rich for basic users",
        "Requires compatible accessories"
      ],
      "bestFor": "Best for professionals seeking premium features and build quality.",
      "sentimentScore": 7,
      "returnPolicy": "30 days return policy",
      "warranty": "1 year warranty",
      "replacementinfo": "Replacement available within 7 days"
    }`;
};