"use client";
import { useEffect, useState } from "react";

const ProductCard = ({ data }: { data: any }) => {
  const DetailItem = ({
    label,
    value,
  }: {
    label: string;
    value: string | undefined;
  }) => {
    if (!value || value === "Not found" || value.trim() === "") return null;
    return (
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="font-semibold text-gray-200">{value}</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden flex flex-col md:flex-row">
      {data.imageUrl && (
        <div className="md:w-1/3 flex-shrink-0">
          <img
            src={data.imageUrl}
            alt={data.title || "Product Image"}
            className="object-cover w-full h-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}

      {/* Right Side: Details */}
      <div className="p-6 md:p-8 flex-grow">
        <h2 className="text-2xl font-bold text-purple-300 mb-2">
          {data.title}
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <DetailItem label="Brand" value={data.brand} />
          <DetailItem label="Model" value={data.modelNumber} />
        </div>

        <div className="flex items-baseline gap-3 mb-4">
          <p className="text-3xl font-bold text-green-400">{data.price}</p>
          {data.discount && (
            <p className="text-red-400 line-through">{data.discount}</p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
          {data.rating && (
            <span>
              ⭐ {data.rating} ({data.totalReviews} reviews)
            </span>
          )}
          {data.availability && (
            <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded-md">
              {data.availability}
            </span>
          )}
        </div>

        {data.keyFeatures && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-gray-200 mb-2">
              Key Features
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {data.keyFeatures.map((feature: string, i: number) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <DetailItem label="Category" value={data.category} />
          <DetailItem label="Subcategory" value={data.subcategory} />
          <DetailItem label="Color" value={data.color} />
          <DetailItem label="Material" value={data.material} />
          <DetailItem label="Size" value={data.size} />
          <DetailItem label="Weight" value={data.weight} />
          <DetailItem label="Dimensions" value={data.dimensions} />
          <DetailItem label="Power Source" value={data.powerSource} />
          <DetailItem label="Battery Life" value={data.batteryLife} />
          <DetailItem label="Compatibility" value={data.compatibility} />
          <DetailItem label="Warranty" value={data.warranty} />
          <DetailItem label="Return Policy" value={data.returnPolicy} />
          <DetailItem label="Shipping Cost" value={data.shippingCost} />
          <DetailItem label="Delivery Time" value={data.deliveryTime} />
        </div>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refinedData, setRefinedData] = useState<any>(null);

  // Function to handle the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError("Please enter a product URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setRefinedData(null);

    try {
      // Step 1: Call backend to get raw scraped data
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape the website.");
      }

      const scrapedData = await response.json();

      console.log("Raw Scraped Data:", scrapedData);

      if (window.puter) {
        const prompt = `
          You are a data processing expert. From the following raw scraped e-commerce data, extract and refine the information into a clean JSON object.
          
          Instructions:
          1.  Create a short, crisp title.
          2.  Extract Brand and Model Number from the title or specs if available.
          3.  Summarize the top 3-4 most important "Key Features" into a string array.
          4.  Format technical specifications cleanly.
          5.  If a field is not present in the raw data, omit it from the final JSON.
          6.  Your entire response must be ONLY the JSON object, with no other text before or after it.

          Raw Data:
          ${JSON.stringify(scrapedData)}

          JSON output format:
          {
            "title": "Short & Crisp Title",
            "brand": "Brand Name",
            "modelNumber": "Model123",
            "price": "${scrapedData.price}",
            "discount": "Original Price if available",
            "rating": "${scrapedData.rating}",
            "totalReviews": "${scrapedData.totalReviews}",
            "category": "${scrapedData.category}",
            "subcategory": "${scrapedData.subcategory}",
            "availability": "${scrapedData.availability}",
            "deliveryTime": "${scrapedData.deliveryTime}",
            "returnPolicy": "${scrapedData.returnPolicy}",
            "warranty": "${scrapedData.warranty}",
            "dimensions": "${scrapedData.dimensions}",
            "weight": "${scrapedData.weight}",
            "color": "Color",
            "material": "Material",
            "size": "Size",
            "compatibility": "Device Compatibility",
            "powerSource": "Power Source",
            "batteryLife": "Battery Life",
            "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
            "shippingCost": "${scrapedData.shippingCost}",
            "imageUrl": "${scrapedData.imageUrl}"
          }
        `;

        const aiResponse = await window.puter.ai.chat(prompt, {
          model: "gpt-4o",
        });

        let responseText = "";
        if (typeof aiResponse === "string") {
          responseText = aiResponse;
        } else if (typeof aiResponse === "object" && aiResponse !== null) {
          // Standard OpenAI format might be inside `message.content`
          responseText =
            aiResponse.message?.content || JSON.stringify(aiResponse);
        } else {
          throw new Error("AI returned an unexpected data format.");
        }

        // Find and parse the JSON from the AI response string
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("AI did not return a valid JSON object.");
        }

        const refinedJson = JSON.parse(jsonMatch[0]);
        setRefinedData(refinedJson);
      } else {
        throw new Error("Puter.js is not available.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Smart Product Summary
          </h1>
          <p className="text-gray-400 mt-2">
            Paste any product link to get an AI-refined data card.
          </p>
        </header>

        <main>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto"
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.com/product-url"
              className="flex-grow bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              {loading ? "Analyzing..." : "Get Summary"}
            </button>
          </form>

          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">
                Fetching and refining product data...
              </p>
            </div>
          )}

          {error && (
            <div
              className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg max-w-2xl mx-auto"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {refinedData && (
            <div className="mt-8">
              <ProductCard data={refinedData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    puter: any;
  }
}
