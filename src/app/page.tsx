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
  Sparkles,
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
import { SAMPLE_PRODUCT_DATA } from "../constants/sampleData";
import { ProductErrorBoundary } from "../components/ProductErrorBoundary";
import { FormErrorBoundary } from "../components/FormErrorBoundary";

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

const DetailItem = ({ label, value }: { label: string; value: string | undefined }) => {
  if (value === "__LOADING__") {
    return (
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <SkeletonLoader className="h-6 w-24 mt-1" />
      </div>
    );
  }
  if (!value || value === "Not found" || value.trim() === "" || value === "Not specified") {
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
          <div className="w-4/5 bg-white/10 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: percentage }} />
          </div>
          <span className="w-10 text-right text-gray-400">{percentage}</span>
        </div>
      ))}
    </div>
  );
};

const ProsConsList = ({ title, items, isPros }: { title: string; items: string[]; isPros: boolean }) => {
  if (items.length === 0) return null;
  if (items[0] === "__LOADING__") {
    return (
      <div>
        <h4 className={`font-semibold text-md mb-2 ${isPros ? "text-green-400" : "text-red-400"}`}>{title}</h4>
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
      <h4 className={`font-semibold text-md mb-2 ${isPros ? "text-green-400" : "text-red-400"}`}>{title}</h4>
      <ul className="space-y-3 text-sm text-gray-300">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${isPros ? "bg-green-400" : "bg-red-400"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AuthComponent = () => {
  const { isAuthenticated, user, signIn, signOut, error, clearError } = usePuter();

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-sm">
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-300 font-medium">{user.username}</p>
        </div>
        <button
          onClick={signOut}
          className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium p-2 rounded-lg transition-colors border border-white/10"
          title="Sign Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={signIn} className="bg-white text-gray-900 hover:bg-gray-100 font-semibold">
        Sign In
      </Button>
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 max-w-md">
          <button onClick={clearError} className="float-right text-red-400 hover:text-red-300 ml-2 font-bold" title="Dismiss">×</button>
          <div className="pr-4">
            <strong className="block mb-1">Authentication Error:</strong>
            {error}
            {error.includes("popup") && (
              <div className="mt-2 pt-2 border-t border-red-500/20 text-xs">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                  <li>Check browser address bar for popup blocker icon</li>
                  <li>Disable ad blockers temporarily</li>
                  <li>Try in incognito/private mode</li>
                  <li>Try a different browser (Chrome/Firefox/Edge)</li>
                </ul>
              </div>
            )}
          </div>
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
  data: ProductData;
  sourceUrl: string;
  scrapedAt: string;
}) => {
  const productImages = data.images && data.images.length > 0
    ? data.images
    : data.imageUrl
      ? [data.imageUrl]
      : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [sourceUrl, data.title]);

  const currentImage = productImages[selectedImageIndex] || productImages[0];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Product image + basic info */}
      <div className="flex flex-col md:flex-row w-full justify-between">
        {currentImage && (
          <div className="md:w-1/2 flex-shrink-0 p-6 flex flex-col items-center justify-center bg-white/[0.02]">
            <div className="relative w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt={data.title || "Product Image"}
                className="object-contain w-4/5 h-auto max-h-[400px] md:max-h-[500px] rounded-lg"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.display = "none")}
              />
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center border border-white/10"
                    aria-label="Previous product image"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center border border-white/10"
                    aria-label="Next product image"
                  >
                    →
                  </button>
                </>
              )}
            </div>
            {productImages.length > 1 && (
              <div className="mt-4 flex w-full gap-2 overflow-x-auto pb-1 px-1">
                {productImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md border overflow-hidden ${selectedImageIndex === index ? "border-white ring-2 ring-white/40" : "border-white/10"}`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${data.title || "Product"} image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="p-6 md:p-8 flex-grow">
          {data.title === "__LOADING__" ? (
            <ParagraphSkeleton />
          ) : (
            <h2 className="text-2xl font-bold text-white mb-2">{data.title}</h2>
          )}
          <div className="flex items-center gap-4 mb-4">
            <DetailItem label="Brand" value={data.brand} />
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-3xl font-bold text-white">{data.price}</p>
            {data.discount && <p className="text-gray-400 line-through">{data.discount}</p>}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
            {data.rating && (
              <span>
                ⭐ {data.rating} ({data.totalRatings?.toLowerCase().includes("rating") ? data.totalRatings : `${data.totalRatings || "0"} ratings`})
              </span>
            )}
            {data.availability && (
              <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded-md border border-green-500/20">
                {data.availability}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg text-white mb-3">Product Specifications</h3>
          {(data.specs as { isLoading?: string })?.isLoading === "true" ? (
            <SpecsSkeleton />
          ) : data.specs && Object.keys(data.specs).length > 0 ? (
            <div className="text-sm border border-white/10 rounded-lg overflow-hidden">
              {Object.entries(data.specs).map(([key, value], index) => (
                <div
                  key={key}
                  className={`flex justify-between p-3 ${index !== Object.keys(data.specs).length - 1 ? "border-b border-white/10" : ""} ${index % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                >
                  <span className="font-medium text-gray-400">{key}</span>
                  <span className="text-right text-gray-200">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm"><i>No specifications available.</i></p>
          )}
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="p-6 md:p-8 border-t border-white/10 bg-white/[0.02]">
        <div className="text-center mb-8">
          <h3 className="font-semibold text-xl text-white mb-2 inline-flex items-center gap-2">
            <Sparkles className="text-gray-400" size={20} />
            AI Recommendation
          </h3>
          {data.bestFor === "__LOADING__" ? (
            <SkeletonLoader className="h-5 w-3/4 mx-auto mt-2" />
          ) : (
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">&quot;{data.bestFor}&quot;</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6">
            <ProsConsList title="Pros" items={data.pros} isPros={true} />
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
            <ProsConsList title="Cons" items={data.cons} isPros={false} />
          </div>
        </div>
      </div>

      {/* Ratings breakdown */}
      {data.ratingsBreakdown && Object.keys(data.ratingsBreakdown).length > 0 && (
        <div className="p-6 md:p-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-lg text-white mb-3">Ratings Breakdown</h3>
            <RatingsChart breakdown={data.ratingsBreakdown} />
          </div>
        </div>
      )}

      {/* Product details */}
      <div className="p-6 md:p-8 border-t border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <DetailItem label="Category" value={data.category} />
          <DetailItem label="Subcategory" value={data.subcategory} />
          <DetailItem label="Warranty" value={data.warranty} />
          <DetailItem label="Return Policy" value={data.returnPolicy} />
          <DetailItem label="Delivery Time" value={data.deliveryTime} />
          <DetailItem label="Replacement Information" value={data.replacementinfo} />
        </div>
      </div>

      {/* View on Amazon link */}
      <div className="p-6 md:p-8 border-t border-white/10 bg-white/[0.02]">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Amazon
        </a>
      </div>

      <div className="px-6 py-3 bg-white/[0.02] text-center text-xs text-gray-500 border-t border-white/10">
        Data from{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
          {new URL(sourceUrl).hostname}
        </a>
        , fetched {formatRelativeTime(scrapedAt)}.
      </div>
    </div>
  );
};

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("abort") || msg.includes("timeout")) return "Request timed out. Please try again.";
    if (msg.includes("failed to scrape") || msg.includes("scraping failed")) return "Could not fetch data from the URL. The product might be unavailable or the link is incorrect.";
    if (msg.includes("valid json") || msg.includes("ai")) return "AI failed to process the product data. Please try another link.";
    if (msg.includes("rate limit") || msg.includes("too many")) return "Too many requests. Please wait a moment and try again.";
    if (msg.includes("network") || msg.includes("fetch")) return "Network error. Please check your internet connection and try again.";
    if (msg.includes("puter")) return "AI service is unavailable. Please refresh the page and try again.";
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
};

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={`bg-white/10 rounded-md animate-pulse ${className}`} />
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
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white/5 p-6 rounded-lg border border-white/10 backdrop-blur-sm">
    <div className="text-gray-400 mb-3">{icon}</div>
    <h3 className="font-semibold text-lg text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400">{children}</p>
  </div>
);
export default function App() {
  const { init, isAuthenticated, ai, addToHistory, isLoading, kv, fetchHistory } = usePuter();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<HistoryItem | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Extracting Data...");
  const analysisSectionRef = useRef<HTMLDivElement>(null);
  const [isNavStuck, setIsNavStuck] = useState(false);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeProduct || error) {
      analysisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeProduct, error]);

  useEffect(() => {
    const handleScroll = () => setIsNavStuck(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrapeAndAnalyze = async (productUrl: string, options: { bypassCache?: boolean } = {}) => {
    const overallStartTime = performance.now();
    console.log("🚀 Starting product analysis process...");

    setError(null);
    setIsSubmitting(true);
    setActiveProduct(null);

    try {
      const normalizeUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          ["ref", "ref_", "tag", "psc", "qid", "sr", "keywords"].forEach((p) => urlObj.searchParams.delete(p));
          urlObj.searchParams.sort();
          return urlObj.toString();
        } catch {
          return url;
        }
      };

      const normalizedUrl = normalizeUrl(productUrl);
      const cacheKey = `cache_${btoa(normalizedUrl)}`;

      if (!options.bypassCache) {
        const cacheCheckStart = performance.now();
        try {
          const cachedData = await kv.get(cacheKey);
          console.log(`⏱️  Cache check: ${(performance.now() - cacheCheckStart).toFixed(2)}ms`);
          const oneHour = 60 * 60 * 1000;
          if (cachedData && typeof cachedData === "object" && "scrapedAt" in cachedData && new Date().getTime() - new Date(cachedData.scrapedAt as string).getTime() < oneHour) {
            console.log("✅ Cache hit! Using cached data");
            console.log(`🏁 Total time (cached): ${((performance.now() - overallStartTime) / 1000).toFixed(2)}s`);
            setActiveProduct(cachedData as HistoryItem);
            setIsSubmitting(false);
            setUrl("");
            return;
          } else {
            console.log("❌ Cache miss or expired");
          }
        } catch (cacheError) {
          console.warn("Cache retrieval failed:", cacheError);
        }
      }

      setLoadingMessage("Extracting data from source...");
      console.log("🌐 Starting web scrape...");
      const scrapeStartTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      // Retry logic for 503/500 (server busy / ETXTBSY)
      let scrapeAttempts = 0;
      const maxScrapeAttempts = 3;
      let response: Response | undefined;

      while (scrapeAttempts < maxScrapeAttempts) {
        try {
          response = await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: normalizedUrl }),
            signal: controller.signal,
          });
          if (response.ok || (response.status !== 503 && response.status !== 500)) break;
          scrapeAttempts++;
          if (scrapeAttempts < maxScrapeAttempts) {
            const waitTime = 2000 * scrapeAttempts;
            console.log(`⏳ Server busy, retrying in ${waitTime / 1000}s... (attempt ${scrapeAttempts + 1}/${maxScrapeAttempts})`);
            setLoadingMessage(`Server busy, retrying in ${waitTime / 1000}s...`);
            await new Promise((r) => setTimeout(r, waitTime));
            setLoadingMessage("Extracting data from source...");
          }
        } catch (fetchError) {
          if (scrapeAttempts < maxScrapeAttempts - 1) {
            scrapeAttempts++;
            const waitTime = 2000 * scrapeAttempts;
            setLoadingMessage(`Request failed, retrying in ${waitTime / 1000}s...`);
            await new Promise((r) => setTimeout(r, waitTime));
            setLoadingMessage("Extracting data from source...");
          } else {
            throw fetchError;
          }
        }
      }

      clearTimeout(timeoutId);
      if (!response || !response.ok) {
        const errorData = await response!.json();
        throw new Error(errorData.error || `Failed to scrape (${response!.status})`);
      }

      setLoadingMessage("Analyzing with AI...");
      const scrapedData: ScrapedData = await response.json();
      console.log(`⏱️  Web scraping completed: ${((performance.now() - scrapeStartTime) / 1000).toFixed(2)}s`);
      console.log(`   - Title: ${scrapedData.title}`);
      console.log(`   - Reviews scraped: ${scrapedData.topReviews?.length || 0}`);

      // Show skeleton state immediately while AI processes
      setActiveProduct({
        refinedData: {
          ...scrapedData,
          title: scrapedData.title || "__LOADING__",
          price: scrapedData.priceBlockText || "__LOADING__",
          ratingsBreakdown: {},
          returnPolicy: "__LOADING__",
          warranty: "__LOADING__",
          replacementinfo: "__LOADING__",
          specs: { isLoading: "true" },
          pros: ["__LOADING__"],
          cons: ["__LOADING__"],
          bestFor: "__LOADING__",
          sentimentScore: 0,
          topReviews: scrapedData.topReviews || [],
        },
        sourceUrl: productUrl,
        scrapedAt: new Date().toISOString(),
      });

      const sanitizeForAI = (text: string | undefined, maxLength: number): string | undefined => {
        if (!text) return undefined;
        return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
      };

      const specificationsForAI = productUrl.includes("flipkart.com")
        ? typeof scrapedData.specifications === "object" && scrapedData.specifications !== null
          ? (scrapedData.specifications as Record<string, string>)["text"]
          : undefined
        : scrapedData.specifications;

      const reviewsForAI = scrapedData.topReviews?.slice(0, 20) || [];
      console.log(`🤖 AI analysis - ${reviewsForAI.length > 0 ? "FULL" : "SIMPLIFIED"} prompt (${reviewsForAI.length} reviews)`);

      const prompt = createProductSummaryPrompt({
        title: scrapedData.title,
        priceBlockText: scrapedData.priceBlockText,
        discount: scrapedData.discount,
        brand: scrapedData.brand,
        modelNumber: scrapedData.modelNumber,
        rating: scrapedData.rating,
        totalRatings: scrapedData.totalRatings,
        totalReviews: scrapedData.totalReviews,
        availability: scrapedData.availability,
        category: scrapedData.category,
        subcategory: scrapedData.subcategory,
        deliveryTime: scrapedData.deliveryTime,
        fullDescription: sanitizeForAI(scrapedData.fullDescription, 1500),
        serviceInfoText: sanitizeForAI(scrapedData.serviceInfoText, 500),
        specifications: specificationsForAI,
        featureBullets: scrapedData.featureBullets,
        reviewsMedleyText: sanitizeForAI(scrapedData.reviewsMedleyText, 2000),
        topReviews: reviewsForAI,
        reviewEvidence: scrapedData.reviewEvidence,
      });

      console.log(`🤖 Calling AI... (prompt: ${(prompt.length / 1024).toFixed(2)}KB)`);
      const aiStartTime = performance.now();
      const aiReader = (await ai.chat(prompt, {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        stream: true,
      })) as AsyncIterable<{ text?: string }>;

      let aiResponseJsonString = "";
      for await (const chunk of aiReader) {
        aiResponseJsonString += chunk?.text || "";
      }
      console.log(`⏱️  AI completed: ${((performance.now() - aiStartTime) / 1000).toFixed(2)}s`);

      const jsonMatch = aiResponseJsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
      const refinedJson: RefinedData = JSON.parse(jsonMatch[0]);

      const productData: HistoryItem = {
        refinedData: {
          ...scrapedData,
          ...refinedJson,
          topReviews: scrapedData.topReviews || [],
        },
        sourceUrl: normalizedUrl,
        scrapedAt: new Date().toISOString(),
      };

      setActiveProduct(productData);
      setUrl("");

      console.log(`\n🏁 TOTAL TIME: ${((performance.now() - overallStartTime) / 1000).toFixed(2)}s`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Save to cache and history async
      Promise.all([
        kv.set(cacheKey, productData).catch((e) => console.error("Cache save failed:", e)),
        addToHistory(productData).catch((e) => console.error("History save failed:", e)),
      ]).then(() => fetchHistory().catch((e) => console.error("History fetch failed:", e)));
    } catch (err: unknown) {
      console.error(`❌ Process failed after ${((performance.now() - overallStartTime) / 1000).toFixed(2)}s`, err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setLoadingMessage("Extracting Data...");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return setError(SIGN_IN_PROMPT);
    const supportedDomainsRegex = /^https?:\/\/(www\.|)amazon\.in\//;
    if (!supportedDomainsRegex.test(url)) return setError("Please paste a valid Amazon.in product link.");
    handleScrapeAndAnalyze(url);
  };

  const handleRefresh = () => {
    if (!activeProduct) return;
    handleScrapeAndAnalyze(activeProduct.sourceUrl, { bypassCache: true });
  };

  const handleViewSample = () => {
    setError(null);
    setIsSubmitting(false);
    setActiveProduct(SAMPLE_PRODUCT_DATA);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen text-white font-sans">
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${isNavStuck ? "bg-gray-950/80 backdrop-blur-lg border-b border-white/10" : "bg-transparent"}`}>
        <div className="container mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="text-white" size={20} />
              <span className="text-lg font-semibold text-white">SmartShop AI</span>
            </div>
            <AuthComponent />
          </div>
        </div>
      </nav>

      <div className="relative overflow-hidden -mt-16 pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-950" />
        <div className="relative container mx-auto px-4 sm:px-8 py-20 text-center">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300 mb-6 backdrop-blur-sm">
            Powered by Advanced AI Models
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">Smart Product Analysis</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Get AI-powered insights on Amazon.in products. Make informed purchasing decisions.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold text-base px-8"
              onClick={() => document.getElementById("input-url")?.scrollIntoView({ behavior: "smooth" })}
            >
              Start Analyzing
            </Button>
            <Button size="lg" variant="outline" className="bg-white/5 text-white font-semibold text-base border-white/10 hover:bg-white/10 px-8" onClick={handleViewSample}>
              View Sample
            </Button>
          </div>
        </div>
        <div className="relative container mx-auto px-4 sm:px-8 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon={<Cpu size={24} />} title="AI-Powered Analysis">Advanced algorithms analyze products for comprehensive insights.</FeatureCard>
          <FeatureCard icon={<BarChart size={24} />} title="Ratings Breakdown">Visual breakdown of user ratings across all star categories.</FeatureCard>
          <FeatureCard icon={<ShieldCheck size={24} />} title="Pros & Cons">AI-generated pros and cons based on product features and reviews.</FeatureCard>
          <FeatureCard icon={<Zap size={24} />} title="Amazon.in Support">Paste any Amazon.in product URL and get structured data in seconds.</FeatureCard>
        </div>
      </div>

      <div className="bg-gray-950 py-5">
        <div className="container mx-auto px-4 sm:px-8">
          <FormErrorBoundary>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm" id="input-url">
              <div className="flex items-center gap-2 mb-2">
                <Search className="text-gray-400" size={20} />
                <h2 className="text-xl font-semibold text-white">Product URL Analyzer</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">Enter an Amazon.in product URL to get AI-powered insights</p>
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <div className="relative w-full">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.amazon.in/product-name/dp/ASIN"
                    className="h-12 text-base pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    disabled={!isAuthenticated || isSubmitting}
                  />
                  {url && (
                    <button type="button" onClick={() => setUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer">✕</button>
                  )}
                </div>
                <Button type="submit" size="lg" className="h-12 text-base bg-white text-gray-900 hover:bg-gray-100 font-semibold" disabled={!isAuthenticated || isSubmitting || !url}>
                  {isSubmitting ? "Analyzing..." : "Get Summary"}
                </Button>
                {activeProduct && !isSubmitting && (
                  <button
                    type="button"
                    onClick={handleRefresh}
                    title="Re-fetch fresh data"
                    className="bg-white/5 hover:bg-white/10 text-white font-semibold p-3 rounded-lg transition-colors h-12 w-12 flex items-center justify-center border border-white/10"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5m5-5V4h-5m-5 16H4v-5m12-2a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                )}
              </form>
            </div>
          </FormErrorBoundary>

          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold text-white">Trusted by Smart Shoppers</h2>
            <p className="mt-2 text-gray-400 max-w-xl mx-auto">Join thousands of users who make better purchasing decisions with our AI-powered analysis.</p>
          </div>
        </div>
      </div>

      <div ref={analysisSectionRef} className="container mx-auto px-4 sm:px-8 py-5">
        {isSubmitting && (
          <div className="text-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
            <p className="mt-4 text-gray-400">{loadingMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {activeProduct && (
          <ProductErrorBoundary fallbackMessage="Failed to display product information">
            <div className="mt-8">
              <ProductCard data={activeProduct.refinedData} sourceUrl={activeProduct.sourceUrl} scrapedAt={activeProduct.scrapedAt} />
            </div>
          </ProductErrorBoundary>
        )}
      </div>

      <footer className="border-t border-white/10 py-8 bg-gray-950">
        <div className="container mx-auto px-4 sm:px-8 text-center text-gray-500 text-sm">
          <p>© 2025 SmartShop AI. Powered by AI for smarter shopping decisions.</p>
        </div>
      </footer>
    </div>
  );
}
