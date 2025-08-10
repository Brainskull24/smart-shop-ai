"use client";
import { useState, useEffect } from "react";
import { usePuter } from "@/store/puter";

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) => {
  if (
    !value ||
    value === "Not found" ||
    value.trim() === "" ||
    value === "Not specified"
  )
    return null;
  return (
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="font-semibold text-gray-200">{value}</p>
    </div>
  );
};

const RatingsChart = ({ breakdown }: { breakdown: Record<string, string> }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  return (
    <div className="space-y-1">
      {Object.entries(breakdown).map(([stars, percentage]) => (
        <div key={stars} className="flex items-center gap-2 text-sm">
          <span className="w-12 text-gray-400">{stars}</span>
          <div className="w-4/5 bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-yellow-400 h-2.5 rounded-full"
              style={{ width: `${percentage}` }}
            ></div>
          </div>
          <span className="w-10 text-right text-gray-400">{percentage}</span>
        </div>
      ))}
    </div>
  );
};

const ReviewComment = ({ comment }: { comment: string }) => (
  <blockquote className="border-l-4 border-purple-500 pl-4 text-sm text-gray-300 italic">
    "{comment}"
  </blockquote>
);

const EmptyState = () => (
  <div className="text-center p-10 border-2 border-dashed border-gray-700 rounded-2xl mt-8">
    <h2 className="text-xl font-semibold text-gray-300">
      Welcome to Smart Product Summary
    </h2>
    <p className="text-gray-500 mt-2">
      Sign in to begin, then paste an Amazon.in product link.
    </p>
    <p className="text-purple-400 text-3xl mt-4">🛍️</p>
  </div>
);

const AuthComponent = () => {
  const { isAuthenticated, user, signIn, signOut } = usePuter();
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-full">
        <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-black font-bold">
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-200 font-semibold">
            Welcome, {user.username}
          </p>
        </div>
        <button
          onClick={signOut}
          className="bg-gray-700 hover:bg-purple-600 text-white font-bold p-2 rounded-full transition-colors"
          title="Sign Out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={signIn}
      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
    >
      Sign In
    </button>
  );
};

const HistoryComponent = ({
  onSelectHistory,
}: {
  onSelectHistory: (item: any) => void;
}) => {
  const { history, isAuthenticated, fetchHistory } = usePuter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch history when component mounts if authenticated
  useEffect(() => {
    if (isAuthenticated && window.puter) {
      fetchHistory();
    }
  }, [isAuthenticated, fetchHistory]);

  // Re-fetch history when tab becomes visible (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && window.puter) {
        fetchHistory();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, fetchHistory]);

  if (!isAuthenticated) {
    return (
      <div className="w-full md:w-72 flex-shrink-0 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
        <h3 className="font-semibold text-gray-200 mb-3">Search History</h3>
        <p className="text-sm text-gray-500">
          Sign in to view your search history.
        </p>
      </div>
    );
  }

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchHistory();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-200">Search History</h3>
        <button
          onClick={handleRefresh}
          className={`text-xs text-purple-400 hover:text-purple-300 p-1 rounded transition-all ${
            isRefreshing ? "animate-spin" : ""
          }`}
          disabled={isRefreshing}
          title="Refresh history from cloud storage"
        >
          ↻
        </button>
      </div>

      <div className="mb-2 text-xs text-gray-500">
        Stored in Puter Cloud • {history.length} items
      </div>

      {history.length > 0 ? (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((item, index) => (
            <li key={`${item.scrapedAt}-${index}`}>
              <button
                onClick={() => onSelectHistory(item)}
                className="text-left text-sm text-purple-300 hover:underline w-full p-2 rounded-md hover:bg-gray-700/50 transition-colors group"
              >
                <div className="space-y-1">
                  <p className="font-semibold truncate group-hover:text-purple-200">
                    {item.refinedData?.title || "Untitled Product"}
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                      {item.refinedData?.price || "No price"}
                    </span>
                    <span className="text-gray-500">
                      {item.scrapedAt
                        ? new Date(item.scrapedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })
                        : "No date"}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : isRefreshing ? (
        <div className="flex items-center justify-center p-4 text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
          Loading...
        </div>
      ) : (
        <div className="space-y-2 text-center text-gray-500">
          <p className="text-sm">Your past searches will appear here.</p>
          <p className="text-xs">Data is stored securely in Puter Cloud</p>
        </div>
      )}
    </div>
  );
};

const ProductCard = ({
  data,
  sourceUrl,
  scrapedAt,
}: {
  data: any;
  sourceUrl: string;
  scrapedAt: string;
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {data.imageUrl && (
          <div className="md:w-1/3 flex-shrink-0 p-4 flex items-center justify-center bg-gray-800/20">
            <img
              src={data.imageUrl}
              alt={data.title || "Product Image"}
              className="object-contain w-full h-auto max-h-[400px] md:max-h-[500px] rounded-lg"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        )}
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
          {data.keyFeatures && data.keyFeatures.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg text-gray-200 mb-3">
                Key Features
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                {data.keyFeatures.map((feature: string, i: number) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="p-6 md:p-8 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold text-lg text-gray-200 mb-3">
            What Users Say
          </h3>
          <p className="text-gray-300 text-sm">
            {data.reviewSummary || "No review summary available."}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-200 mb-3">
            Ratings Breakdown
          </h3>
          <RatingsChart breakdown={data.ratingsBreakdown} />
        </div>
      </div>
      {data.topReviews && data.topReviews.length > 0 && (
        <div className="p-6 md:p-8 border-t border-gray-700">
          <h3 className="font-semibold text-lg text-gray-200 mb-4">
            Top User Comments
          </h3>
          <div className="space-y-4">
            {data.topReviews.map((comment: string, i: number) => (
              <ReviewComment key={i} comment={comment} />
            ))}
          </div>
        </div>
      )}
      <div className="p-6 md:p-8 border-t border-gray-700">
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
      <div className="px-6 py-3 bg-gray-900/50 text-center text-xs text-gray-500">
        Data from{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {new URL(sourceUrl).hostname}
        </a>
        , fetched on {new Date(scrapedAt).toLocaleString("en-IN")}.
      </div>
    </div>
  );
};

export default function App() {
  const { init, isAuthenticated, ai, addToHistory, isLoading, fetchHistory } =
    usePuter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  // Handle page visibility changes to refresh history
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && window.puter) {
        fetchHistory();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated, fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      setError("Please sign in to use the app.");
      return;
    }
    if (!url.startsWith("https://www.amazon.in")) {
      setError("Invalid URL. Please use a valid link from amazon.in.");
      return;
    }

    setLoading(true);
    setActiveProduct(null);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape.");
      }

      const scrapedData = await response.json();

      const requiredFields = [
        "title",
        "priceBlockText",
        "topReviews",
        "reviewsMedleyText",
        "fullDescription",
        "serviceInfoText",
        "featureBullets",
        "technicalDetails",
      ];

      const dataForAI = requiredFields.reduce(
        (acc, field) => {
          if (scrapedData[field]) acc[field] = scrapedData[field];
          return acc;
        },
        { ...scrapedData, scrapedAt: new Date().toISOString() }
      );

      const prompt = `You are a data processing expert. Your only job is to populate a JSON object based on the provided raw data.
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

      const aiResponse = await ai.chat(prompt, { model: "gpt-4o-mini" });
      if (!aiResponse) throw new Error("AI did not return any response.");

      let responseText = "";
      if (typeof aiResponse === "string") responseText = aiResponse;
      else if (typeof aiResponse === "object" && aiResponse !== null)
        responseText =
          aiResponse.message?.content || JSON.stringify(aiResponse);
      else throw new Error("AI returned an unexpected data format.");

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");

      const refinedJson = JSON.parse(jsonMatch[0]);
      const finalData = { ...scrapedData, ...refinedJson };

      const productData = {
        refinedData: finalData,
        sourceUrl: url,
        scrapedAt: dataForAI.scrapedAt,
      };

      setActiveProduct(productData);

      // Add to Puter KV storage (this will also update local state)
      await addToHistory(productData);

      // Clear the URL input after successful processing
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="text-left">
            <h1 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Smart Product Summary
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Your AI-powered research assistant.
            </p>
          </div>
          <AuthComponent />
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <HistoryComponent onSelectHistory={setActiveProduct} />
          <main className="flex-grow">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <div className="relative flex-grow">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    isAuthenticated
                      ? "https://www.amazon.in/product-url"
                      : "Please sign in to start"
                  }
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors disabled:cursor-not-allowed"
                  disabled={!isAuthenticated || loading}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!isAuthenticated || loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                {loading ? "Analyzing..." : "Get Summary"}
              </button>
            </form>

            {loading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">Fetching and refining...</p>
              </div>
            )}

            {error && (
              <div
                className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6"
                role="alert"
              >
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {!loading && !activeProduct && !error && <EmptyState />}

            {activeProduct && (
              <div className="mt-8">
                <ProductCard
                  data={activeProduct.refinedData}
                  sourceUrl={activeProduct.sourceUrl}
                  scrapedAt={activeProduct.scrapedAt}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    puter: any;
  }
}
