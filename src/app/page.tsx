"use client";
import { useState, useEffect, FormEvent } from "react";
import { usePuter } from "@/store/puter";
import {
  HistoryItem,
  RefinedData,
  ScrapedData,
  ProductData,
} from "@/types/product";
import { createProductSummaryPrompt } from "@/lib/prompts";
import {
  AMAZON_URL_PREFIX,
  INVALID_URL_ERROR,
  SIGN_IN_PROMPT,
} from "@/lib/constants";

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
  ) {
    return null;
  }
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
              style={{ width: percentage }}
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
    &quot;{comment}&quot;
  </blockquote>
);

const EmptyState = () => (
  <div className="text-center p-10 border-2 border-dashed border-gray-700 rounded-2xl mt-8">
    <h2 className="text-xl font-semibold text-gray-300">
      Welcome to SmartShop AI
    </h2>
    <p className="text-gray-500 mt-2">
      Paste an Amazon.in product link to get started!.
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

// const HistoryComponent = ({
//   onSelectHistory,
// }: {
//   onSelectHistory: (item: HistoryItem) => void;
// }) => {
//   const { history, isAuthenticated, fetchHistory } = usePuter();
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   useEffect(() => {
//     if (isAuthenticated && window.puter) {
//       fetchHistory();
//     }
//   }, [isAuthenticated, fetchHistory]);

//   useEffect(() => {
//     const handleVisibilityChange = () => {
//       if (!document.hidden && isAuthenticated && window.puter) {
//         fetchHistory();
//       }
//     };
//     document.addEventListener("visibilitychange", handleVisibilityChange);
//     return () =>
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//   }, [isAuthenticated, fetchHistory]);

//   if (!isAuthenticated) {
//     return (
//       <div className="w-full md:w-72 flex-shrink-0 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
//         <h3 className="font-semibold text-gray-200 mb-3">Search History</h3>
//         <p className="text-sm text-gray-500">
//           Sign in to view your search history.
//         </p>
//       </div>
//     );
//   }

//   const handleRefresh = async () => {
//     if (isRefreshing) return;
//     setIsRefreshing(true);
//     try {
//       await fetchHistory();
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   return (
//     <div className="w-full md:w-72 flex-shrink-0 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
//       <div className="flex justify-between items-center mb-3">
//         <h3 className="font-semibold text-gray-200">Search History</h3>
//         <button
//           onClick={handleRefresh}
//           className={`text-xs text-purple-400 hover:text-purple-300 p-1 rounded transition-all ${
//             isRefreshing ? "animate-spin" : ""
//           }`}
//           disabled={isRefreshing}
//           title="Refresh history"
//           aria-label="Refresh history"
//         >
//           ↻
//         </button>
//       </div>
//       <div className="mb-2 text-xs text-gray-500">
//         Stored in Puter Cloud • {history.length} items
//       </div>
//       {history.length > 0 ? (
//         <ul className="space-y-2 max-h-96 overflow-y-auto">
//           {history.map((item: HistoryItem, index: number) => (
//             <li key={`${item.scrapedAt}-${index}`}>
//               <button
//                 onClick={() => onSelectHistory(item)}
//                 className="text-left text-sm text-purple-300 hover:underline w-full p-2 rounded-md hover:bg-gray-700/50 transition-colors group"
//               >
//                 <div className="space-y-1">
//                   <p className="font-semibold truncate group-hover:text-purple-200">
//                     {item.refinedData?.title || "Untitled Product"}
//                   </p>
//                   <div className="flex justify-between items-center text-xs">
//                     <span className="text-gray-400">
//                       {item.refinedData?.price || "No price"}
//                     </span>
//                     <span className="text-gray-500">
//                       {item.scrapedAt
//                         ? new Date(item.scrapedAt).toLocaleDateString("en-IN", {
//                             day: "numeric",
//                             month: "short",
//                           })
//                         : "No date"}
//                     </span>
//                   </div>
//                 </div>
//               </button>
//             </li>
//           ))}
//         </ul>
//       ) : isRefreshing ? (
//         <div className="flex items-center justify-center p-4 text-gray-400">
//           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
//           Loading...
//         </div>
//       ) : (
//         <div className="space-y-2 text-center text-gray-500">
//           <p className="text-sm">Your past searches will appear here.</p>
//           <p className="text-xs">Data is stored securely in Puter Cloud</p>
//         </div>
//       )}
//     </div>
//   );
// };

const ProductCard = ({
  data,
  sourceUrl,
  scrapedAt,
}: {
  data: ProductData;
  sourceUrl: string;
  scrapedAt: string;
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row w-full justify-between">
        {data.imageUrl && (
          <div className="md:w-1/2 flex-shrink-0 p-4 flex items-center justify-center bg-gray-800/20">
            <img
              src={data.imageUrl}
              alt={data.title || "Product Image"}
              className="object-contain w-4/5 h-auto max-h-[400px] md:max-h-[500px] rounded-lg"
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
          {/* {data.keyFeatures && data.keyFeatures.length > 0 && (
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
          )} */}
          {data.specs && Object.keys(data.specs).length > 0 && (
            <div className="">
              <h3 className="font-semibold text-lg text-gray-200 mb-3">
                Technical Specifications
              </h3>
              <div className="text-sm border border-gray-700 rounded-lg">
                {Object.entries(data.specs).map(([key, value], index) => (
                  <div
                    key={key}
                    className={`flex justify-between p-3 ${
                      index !== Object.keys(data.specs).length - 1
                        ? "border-b border-gray-700"
                        : ""
                    }`}
                  >
                    <span className="font-medium text-gray-400">{key}</span>
                    <span className="text-right text-gray-200">{value}</span>
                  </div>
                ))}
              </div>
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

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes("Failed to scrape")) {
      return "Could not fetch data from the URL. The product might be unavailable or the link is incorrect.";
    }
    if (error.message.includes("valid JSON object")) {
      return "AI failed to process the product data. The page format may be unsupported. Please try another link.";
    }
    return error.message;
  }
  return "An unexpected error occurred.";
};

export default function App() {
  const { init, isAuthenticated, ai, addToHistory, isLoading, fetchHistory } =
    usePuter();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<HistoryItem | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleSelectHistory = (item: HistoryItem) => {
    setActiveProduct(item);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) return setError(SIGN_IN_PROMPT);
    if (!url.startsWith(AMAZON_URL_PREFIX)) return setError(INVALID_URL_ERROR);

    setIsSubmitting(true);
    setActiveProduct(null);

    try {
      const route = "/api/scrape";

      console.log("Time before fetch:", new Date().toISOString());

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      console.log("Time after fetch:", new Date().toISOString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape.");
      }

      const scrapedData: ScrapedData = await response.json();

      console.log("Scraped Data:", scrapedData);
      const dataForAI = { ...scrapedData, scrapedAt: new Date().toISOString() };
      const prompt = createProductSummaryPrompt(dataForAI);

      console.log("Time before AI Request:", new Date().toISOString());

      const aiResponse = await ai.chat(prompt, { model: "gpt-4o-mini" });

      console.log("Time after AI Request:", new Date().toISOString());

      if (!aiResponse?.message?.content) {
        throw new Error("AI did not return a valid response.");
      }

      const jsonMatch = aiResponse.message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
      }

      const refinedJson: RefinedData = JSON.parse(jsonMatch[0]);
      const productData: HistoryItem = {
        refinedData: { ...scrapedData, ...refinedJson },
        sourceUrl: url,
        scrapedAt: dataForAI.scrapedAt,
      };

      setActiveProduct(productData);
      await addToHistory(productData);
      setUrl("");
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-5xl mx-auto">
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
          {/* <HistoryComponent onSelectHistory={handleSelectHistory} /> */}
          <main className="flex-grow">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <div className="relative flex-grow">
                <label htmlFor="product-url" className="sr-only">
                  Product URL
                </label>
                <input
                  id="product-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    isAuthenticated
                      ? `${AMAZON_URL_PREFIX}/product-url`
                      : "Sign in to get started!"
                  }
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors disabled:cursor-not-allowed"
                  disabled={!isAuthenticated || isSubmitting}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    aria-label="Clear input"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!isAuthenticated || isSubmitting || !url}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                {isSubmitting ? "Analyzing..." : "Get Summary"}
              </button>
            </form>

            {isSubmitting && (
              <div className="text-center p-10">
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

            {!isSubmitting && !activeProduct && !error && <EmptyState />}

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
