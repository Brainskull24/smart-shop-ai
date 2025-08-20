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
      6.  **Ratings Breakdown:** Analyze 'reviewsMedleyText' and extract the percentage for each star rating.
      7.  **Return/Warranty/Replacement:** Analyze 'serviceInfoText' to find 'returnPolicy', 'replacementinfo' and 'warranty'. If not found, set value to "".
      8.  For all other fields, extract them directly. If a field isn't present, omit its key from the final JSON.
    
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
      "returnPolicy": "30 days return policy",
      "warranty": "1 year warranty"
      "replacementinfo": "Replacement available within 7 days"
    }`;
};
