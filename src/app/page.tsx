"use client";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Search,
  Zap,
  ShieldCheck,
  BarChart,
  Cpu,
  Users,
  Clock,
  Sparkles,
  Box,
} from "lucide-react";
import { usePuter } from "../store/puter";
import {
  HistoryItem,
  ProductData,
  RefinedData,
  ScrapedData,
} from "../types/product";
import { createProductSummaryPrompt } from "../lib/prompts";
import { SIGN_IN_PROMPT } from "../lib/constants";

const SAMPLE_PRODUCT_DATA: HistoryItem = {
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

const formatRelativeTime = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 60) return `just now`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return new Date(isoDate).toLocaleString("en-IN");
};

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) => {
  if (value === "__LOADING__") {
    return (
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <SkeletonLoader className="h-6 w-24 mt-1" />
      </div>
    );
  }

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

const ProsConsList = ({
  title,
  items,
  isPros,
}: {
  title: string;
  items: string[];
  isPros: boolean;
}) => {
  if (items.length === 0) return null;

  if (items[0] === "__LOADING__") {
    return (
      <div>
        <h4
          className={`font-semibold text-md mb-2 ${
            isPros ? "text-green-400" : "text-red-400"
          }`}
        >
          {title}
        </h4>
        <div className="space-y-2">
          <SkeletonLoader className="h-4 w-full" />
          <SkeletonLoader className="h-4 w-11/12" />
          <SkeletonLoader className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4
        className={`font-semibold text-md mb-2 ${
          isPros ? "text-green-400" : "text-red-400"
        }`}
      >
        {title}
      </h4>
      <ul className="space-y-3 text-sm text-gray-300">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                isPros
                  ? "bg-green-400 shadow-[0_0_6px_1px_rgba(74,222,128,0.7)]"
                  : "bg-red-400 shadow-[0_0_6px_1px_rgba(248,113,113,0.7)]"
              }`}
            ></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

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
    <Button
      onClick={signIn}
      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
    >
      Sign In
    </Button>
  );
};

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
          {data.title === "__LOADING__" ? (
            <ParagraphSkeleton />
          ) : (
            <h2 className="text-2xl font-bold text-purple-300 mb-2">
              {data.title}
            </h2>
          )}
          <div className="flex items-center gap-4 mb-4">
            <DetailItem label="Brand" value={data.brand} />
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
                ⭐ {data.rating} (
                {data.totalRatings?.toLowerCase().includes("rating")
                  ? data.totalRatings
                  : `${data.totalRatings || "0"} ratings`}
                )
              </span>
            )}
            {data.availability && (
              <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded-md">
                {data.availability}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg text-gray-200 mb-3">
            Product Specifications
          </h3>
          {(data.specs as any)?.isLoading === "true" ? (
            <SpecsSkeleton />
          ) : data.specs && Object.keys(data.specs).length > 0 ? (
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
          ) : (
            <p className="text-gray-500 text-sm">
              <i>No specifications available.</i>
            </p>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 border-t border-gray-700 bg-gradient-to-br from-gray-900/50 to-purple-900/20">
        <div className="text-center mb-8">
          <h3 className="font-semibold text-xl text-white mb-2 inline-flex items-center gap-2">
            <Sparkles className="text-purple-400" />
            AI Recommendation
          </h3>
          {data.bestFor === "__LOADING__" ? (
            <SkeletonLoader className="h-5 w-3/4 mx-auto mt-2" />
          ) : (
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              &quot;{data.bestFor}&quot;
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <ProsConsList title="Pros" items={data.pros} isPros={true} />
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <ProsConsList title="Cons" items={data.cons} isPros={false} />
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold text-lg text-gray-200 mb-3">
            What Users Say
          </h3>
          {data.reviewSummary === "__LOADING__" ? (
            <ParagraphSkeleton />
          ) : (
            data.reviewSummary && (
              <p className="text-gray-300 text-sm">{data.reviewSummary}</p>
            )
          )}
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
          <DetailItem label="Warranty" value={data.warranty} />
          <DetailItem label="Return Policy" value={data.returnPolicy} />
          <DetailItem label="Delivery Time" value={data.deliveryTime} />
          <DetailItem
            label="Replacement Information"
            value={data.replacementinfo}
          />
        </div>
      </div>
      <div className="p-6 md:p-8 border-t border-gray-700">
        <h3 className="font-semibold text-lg text-gray-200 mb-4">
          Top User Comments
        </h3>
        {data.topReviews && data.topReviews.length > 0 ? (
          <div className="space-y-4">
            {data.topReviews.slice(1, 6).map((comment: string, i: number) => (
              <blockquote
                key={i}
                className="border-l-4 border-purple-500 pl-4 text-sm text-gray-300 italic"
              >
                &quot;{comment}&quot;
              </blockquote>
            ))}
          </div>
        ) : (
          <i className="text-gray-500 text-sm">No Reviews Available.</i>
        )}
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
        , fetched {formatRelativeTime(scrapedAt)}.
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

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={`bg-gray-700 rounded-md animate-pulse ${className}`} />
);

const SpecsSkeleton = () => (
  <div className="space-y-2">
    <SkeletonLoader className="h-4 w-full" />
    <SkeletonLoader className="h-4 w-full" />
    <SkeletonLoader className="h-4 w-4/5" />
    <SkeletonLoader className="h-4 w-2/3" />
  </div>
);

const ParagraphSkeleton = () => (
  <div className="space-y-2">
    <SkeletonLoader className="h-4 w-full" />
    <SkeletonLoader className="h-4 w-full" />
    <SkeletonLoader className="h-4 w-11/12" />
  </div>
);

const FeatureCard = ({ icon, title, children }: any) => (
  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
    <div className="text-purple-400 mb-3">{icon}</div>
    <h3 className="font-semibold text-lg text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400">{children}</p>
  </div>
);

const StatCard = ({ icon, value, label, sublabel }: any) => (
  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 text-center">
    <div className="text-purple-400 mx-auto mb-3 w-10 h-10 flex items-center justify-center">
      {icon}
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    <p className="text-sm text-gray-300 font-semibold">{label}</p>
    <p className="text-xs text-gray-500">{sublabel}</p>
  </div>
);

export default function App() {
  const {
    init,
    isAuthenticated,
    ai,
    addToHistory,
    isLoading,
    kv,
    fetchHistory,
  } = usePuter();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<HistoryItem | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Extracting Data...");
  const analysisSectionRef = useRef<HTMLDivElement>(null);
  const [isNavStuck, setIsNavStuck] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (activeProduct || error) {
      analysisSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [activeProduct, error]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsNavStuck(true);
      } else {
        setIsNavStuck(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrapeAndAnalyze = async (
    productUrl: string,
    options: { bypassCache?: boolean } = {}
  ) => {
    setError(null);
    setIsSubmitting(true);
    setActiveProduct(null);

    try {
      const cacheKey = `cache_${btoa(productUrl)}`;

      if (!options.bypassCache) {
        const cachedData = await kv.get(cacheKey);
        const oneHour = 60 * 60 * 1000;
        if (
          cachedData &&
          new Date().getTime() - new Date(cachedData.scrapedAt).getTime() <
            oneHour
        ) {
          setActiveProduct(cachedData);
          setIsSubmitting(false);
          setUrl("");
          return;
        }
      }

      setLoadingMessage("Extracting data from source...");
      const route = "/api/scrape";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape.");
      }

      setLoadingMessage("Analyzing with AI...");
      const scrapedData: ScrapedData = await response.json();

      const initialProductState: HistoryItem = {
        refinedData: {
          ...scrapedData,
          title: "__LOADING__",
          price: scrapedData.priceBlockText || "__LOADING__",
          reviewSummary: "__LOADING__",
          ratingsBreakdown: {},
          keyFeatures: [],
          returnPolicy: "__LOADING__",
          warranty: "__LOADING__",
          replacementinfo: "__LOADING__",
          specs: { isLoading: "true" },
          pros: ["__LOADING__"],
          cons: ["__LOADING__"],
          bestFor: "__LOADING__",
          sentimentScore: 0,
        },
        sourceUrl: productUrl,
        scrapedAt: new Date().toISOString(),
      };
      setActiveProduct(initialProductState);

      const sanitizeForAI = (
        text: string | undefined,
        maxLength: number
      ): string | undefined => {
        if (!text) return undefined;
        return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
      };

      let specificationsForAI;
      if (productUrl.includes("flipkart.com")) {
        specificationsForAI =
          typeof scrapedData.specifications === "object" &&
          scrapedData.specifications !== null
            ? scrapedData.specifications["text"]
            : undefined;
      } else {
        specificationsForAI = scrapedData.specifications;
      }

      const dataForAI = {
        title: scrapedData.title,
        priceBlockText: scrapedData.priceBlockText,
        discount: scrapedData.discount,
        fullDescription: sanitizeForAI(scrapedData.fullDescription, 1500),
        serviceInfoText: sanitizeForAI(scrapedData.serviceInfoText, 500),
        specifications: specificationsForAI,
        featureBullets: scrapedData.featureBullets,
        reviewsMedleyText: sanitizeForAI(scrapedData.reviewsMedleyText, 2000),
        topReviews: scrapedData.topReviews,
      };


      const prompt = createProductSummaryPrompt(dataForAI);


      const aiReader = await ai.chat(prompt, {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        stream: true,
      });

      let aiResponseJsonString = "";
      for await (const chunk of aiReader) {
        aiResponseJsonString += chunk?.text || "";
      }

      const jsonMatch = aiResponseJsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
      }
      const refinedJson: RefinedData = JSON.parse(jsonMatch[0]);

      const productData: HistoryItem = {
        refinedData: { ...scrapedData, ...refinedJson },
        sourceUrl: productUrl,
        scrapedAt: new Date().toISOString(),
      };

      setActiveProduct(productData);
      setUrl("");

      await Promise.all([
        kv.set(cacheKey, productData),
        addToHistory(productData),
      ]);
      fetchHistory();
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return setError(SIGN_IN_PROMPT);
    const supportedDomainsRegex =
      /^(https?:\/\/(www\.)?(amazon\.(in|com)|amzn\.in|flipkart\.com))\//;
    if (!supportedDomainsRegex.test(url)) {
      return setError("Please paste a valid link from Amazon or Flipkart.");
    }
    handleScrapeAndAnalyze(url);
  };

  const handleRefresh = () => {
    if (!activeProduct) return;
    handleScrapeAndAnalyze(activeProduct.sourceUrl, { bypassCache: true });
  };

  // --- 2. NEW HANDLER for Sample Analysis ---
  const handleViewSample = () => {
    // if (!isAuthenticated) {
    //     setError(SIGN_IN_PROMPT);
    //     // We can also trigger the sign-in flow directly if desired
    //     // signIn();
    //     return;
    // }
    setError(null);
    setIsSubmitting(false);
    setActiveProduct(SAMPLE_PRODUCT_DATA);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isNavStuck
            ? "bg-gray-900/80 backdrop-blur-lg border-b border-gray-800"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400" />
              <span className="text-xl font-bold text-white">SmartShop AI</span>
            </div>
            <div>
              <AuthComponent />
            </div>
          </div>
        </div>
      </nav>

      <div className="relative overflow-hidden -mt-20 pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-gray-900"></div>
        <div className="relative container mx-auto px-4 sm:px-8 py-20 text-center">
          <div className="inline-block bg-gray-800/50 border border-gray-700 rounded-full px-3 py-1 text-xs text-purple-300 mb-4">
            Powered by Advanced AI Models
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300">
            Smart Product Analysis
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Get AI-powered insights on any product from Amazon or Flipkart. Make
            informed purchasing decisions with comprehensive analysis.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg"
              onClick={() => {
                const inputSection = document.getElementById("input-url");
                inputSection?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Start Analyzing Products
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-gray-800 text-white font-bold text-lg"
              onClick={handleViewSample}
            >
              View Sample Analysis
            </Button>
          </div>
          <div className="mt-6 text-sm text-gray-500 flex justify-center items-center gap-4">
            <span>● Real-time Analysis</span>
            <span>● AI-Powered Insights</span>
            <span>● Trusted by 500+ Users</span>
          </div>
        </div>
        <div className="relative container mx-auto px-4 sm:px-8 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon={<Cpu size={24} />} title="AI-Powered Analysis">
            Advanced algorithms analyze products for comprehensive insights.
          </FeatureCard>
          <FeatureCard icon={<BarChart size={24} />} title="Market Insights">
            Real-time pricing trends and market analysis.
          </FeatureCard>
          <FeatureCard
            icon={<ShieldCheck size={24} />}
            title="Trust & Security"
          >
            Verified data sources and secure analysis.
          </FeatureCard>
          <FeatureCard icon={<Zap size={24} />} title="Lightning Fast">
            Get detailed analysis in seconds, not minutes.
          </FeatureCard>
        </div>
      </div>

      <div className="bg-gray-900 py-5">
        <div className="container mx-auto px-4 sm:px-8">
          <div
            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6"
            id="input-url"
          >
            <div className="flex items-center gap-2 mb-2">
              <Search className="text-purple-400" size={20} />
              <h2 className="text-xl font-semibold text-white">
                Product URL Analyzer
              </h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Enter an Amazon or Flipkart product URL to get AI-powered insights
            </p>
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative w-full">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.amazon.in/product-url or https://flipkart.com/product-url"
                  className="h-12 text-lg pr-10 selection:bg-purple-300 selection:text-black"
                  disabled={!isAuthenticated || isSubmitting}
                />

                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 text-md bg-purple-500 hover:bg-purple-600"
                disabled={!isAuthenticated || isSubmitting || !url}
              >
                {isSubmitting ? "Analyzing..." : "Get Summary"}
              </Button>
              {activeProduct && !isSubmitting && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Re-fetch fresh data for the current product"
                  className="bg-gray-700 hover:bg-purple-600 text-white font-bold p-3 rounded-lg transition-colors h-[50px] w-[50px] flex items-center justify-center"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h5M20 20v-5h-5m5-5V4h-5m-5 16H4v-5m12-2a4 4 0 11-8 0 4 4 0 018 0z"
                    ></path>
                  </svg>
                </button>
              )}
            </form>
          </div>

          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold text-white">
              Trusted by Smart Shoppers
            </h2>
            <p className="mt-2 text-gray-400 max-w-xl mx-auto">
              Join thousands of users who make better purchasing decisions with
              our AI-powered analysis.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={<Box size={32} />}
              value="1000+"
              label="Products Analyzed"
            />
            <StatCard
              icon={<Clock size={32} />}
              value="< 15 sec"
              label="Average Analysis Time"
            />
            <StatCard icon={<Users size={32} />} value="500+" label="Users" />
          </div>
        </div>
      </div>

      <div
        ref={analysisSectionRef}
        className="container mx-auto px-4 sm:px-8 py-5"
      >
        {isSubmitting && (
          <div className="text-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">{loadingMessage}</p>
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

        {activeProduct && (
          <div className="mt-8">
            <ProductCard
              data={activeProduct.refinedData}
              sourceUrl={activeProduct.sourceUrl}
              scrapedAt={activeProduct.scrapedAt}
            />
          </div>
        )}
      </div>

      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-8 text-center text-gray-500 text-sm">
          <p>
            © 2025 SmartShop AI. Powered by AI for smarter shopping decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}

declare global {
  interface Window {
    puter: any;
  }
}
