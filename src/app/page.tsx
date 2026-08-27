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
  DealScore,
  PriceHistoryEntry,
} from "../types/product";
import { createProductSummaryPrompt } from "../lib/prompts";
import { SIGN_IN_PROMPT } from "../lib/constants";
import { SAMPLE_PRODUCT_DATA } from "../constants/sampleData";
import { ProductErrorBoundary } from "../components/ProductErrorBoundary";
import { FormErrorBoundary } from "../components/FormErrorBoundary";
import { PriceAlertModal } from "../components/PriceAlertModal";
import { exportToHTML, downloadFile } from "../services/exportService";

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
          <div className="w-4/5 bg-white/10 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full"
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
              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                isPros
                  ? "bg-green-400"
                  : "bg-red-400"
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
  const { isAuthenticated, user, signIn, signOut, error, clearError } = usePuter();
  
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-sm">
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-300 font-medium">
            {user.username}
          </p>
        </div>
        <button
          onClick={signOut}
          className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium p-2 rounded-lg transition-colors border border-white/10"
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
    <div className="flex flex-col gap-2">
      <Button
        onClick={signIn}
        className="bg-white text-gray-900 hover:bg-gray-100 font-semibold"
      >
        Sign In
      </Button>
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 max-w-md">
          <button 
            onClick={clearError}
            className="float-right text-red-400 hover:text-red-300 ml-2 font-bold"
            title="Dismiss"
          >
            ×
          </button>
          <div className="pr-4">
            <strong className="block mb-1">Authentication Error:</strong>
            {error}
            {error.includes('popup') && (
              <div className="mt-2 pt-2 border-t border-red-500/20 text-xs">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                  <li>Check browser address bar for popup blocker icon</li>
                  <li>Disable ad blockers temporarily</li>
                  <li>Try in incognito/private mode</li>
                  <li>Try a different browser (Chrome/Firefox/Edge)</li>
                  <li>Check browser console for more details (F12)</li>
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
  onSetAlert,
  onAddToWishlist,
  onExport,
  enableV2Features = false,
}: {
  data: ProductData;
  sourceUrl: string;
  scrapedAt: string;
  onSetAlert?: () => void;
  onAddToWishlist?: () => void;
  onExport?: () => void;
  enableV2Features?: boolean;
}) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Deal Score Badge */}
      {data.dealScore && (
        <div className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${
                data.dealScore.score >= 80 ? 'text-green-400' :
                data.dealScore.score >= 65 ? 'text-blue-400' :
                data.dealScore.score >= 45 ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {data.dealScore.score}
              </div>
              <div>
                <div className={`text-lg font-semibold ${
                  data.dealScore.score >= 80 ? 'text-green-400' :
                  data.dealScore.score >= 65 ? 'text-blue-400' :
                  data.dealScore.score >= 45 ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {data.dealScore.label}
                </div>
                <div className="text-xs text-gray-400">Deal Score</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.dealScore.reasons.slice(0, 3).map((reason, idx) => (
                <span key={idx} className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/10 text-gray-300">
                  {reason}
                </span>
              ))}
            </div>
            {data.dealScore.priceChange.direction !== "stable" && (
              <div className={`text-sm font-medium ${
                data.dealScore.priceChange.direction === "down" ? 'text-green-400' : 'text-red-400'
              }`}>
                {data.dealScore.priceChange.direction === "down" ? '↓' : '↑'} {data.dealScore.priceChange.percentage.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Price History Chart */}
      {data.priceHistory && data.priceHistory.length > 0 && (
        <div className="bg-gradient-to-r from-white/5 to-white/[0.02] border-b border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-300">
              Price History {data.priceHistory.length === 1 ? '(Current Price)' : `(Last ${data.priceHistory.length} ${data.priceHistory.length === 1 ? 'Day' : 'Days'})`}
            </div>
            {data.priceHistory.length === 1 && (
              <div className="text-xs text-gray-500">Check back later for price trends</div>
            )}
          </div>
          <div className="flex items-end gap-2 h-24">
            {data.priceHistory.map((entry, idx) => {
              const maxPrice = Math.max(...data.priceHistory!.map(e => e.price));
              const minPrice = Math.min(...data.priceHistory!.map(e => e.price));
              const priceRange = maxPrice - minPrice || 1;
              const heightPercent = data.priceHistory!.length === 1 
                ? 100 // Full height if only one entry
                : ((entry.price - minPrice) / priceRange) * 100;
              const barHeight = Math.max(heightPercent, 10); // Minimum 10% height for visibility
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500/50 to-blue-400/30 rounded-t transition-all hover:from-blue-500/70 hover:to-blue-400/50"
                    style={{ height: `${barHeight}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-white/20">
                      {entry.currency}{entry.price}
                      {entry.discount && <div className="text-green-400">-{entry.discount}%</div>}
                      <div className="text-gray-400">{new Date(entry.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {data.priceHistory!.length === 1 
                      ? 'Today'
                      : new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  </div>
                </div>
              );
            })}
          </div>
          {data.priceHistory.length > 1 && (
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Min: {data.priceHistory[0]?.currency}{Math.min(...data.priceHistory.map(e => e.price)).toFixed(0)}</span>
              <span>Max: {data.priceHistory[0]?.currency}{Math.max(...data.priceHistory.map(e => e.price)).toFixed(0)}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row w-full justify-between">
        {data.imageUrl && (
          <div className="md:w-1/2 flex-shrink-0 p-6 flex items-center justify-center bg-white/[0.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.imageUrl}
              alt={data.title || "Product Image"}
              className="object-contain w-4/5 h-auto max-h-[400px] md:max-h-[500px] rounded-lg"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) =>
                (e.currentTarget.style.display = "none")
              }
            />
          </div>
        )}
        <div className="p-6 md:p-8 flex-grow">
          {data.title === "__LOADING__" ? (
            <ParagraphSkeleton />
          ) : (
            <h2 className="text-2xl font-bold text-white mb-2">
              {data.title}
            </h2>
          )}
          <div className="flex items-center gap-4 mb-4">
            <DetailItem label="Brand" value={data.brand} />
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-3xl font-bold text-white">{data.price}</p>
            {data.discount && (
              <p className="text-gray-400 line-through">{data.discount}</p>
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
              <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded-md border border-green-500/20">
                {data.availability}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg text-white mb-3">
            Product Specifications
          </h3>
          {(data.specs as any)?.isLoading === "true" ? (
            <SpecsSkeleton />
          ) : data.specs && Object.keys(data.specs).length > 0 ? (
            <div className="text-sm border border-white/10 rounded-lg overflow-hidden">
              {Object.entries(data.specs).map(([key, value], index) => (
                <div
                  key={key}
                  className={`flex justify-between p-3 ${
                    index !== Object.keys(data.specs).length - 1
                      ? "border-b border-white/10"
                      : ""
                  } ${index % 2 === 0 ? "bg-white/[0.02]" : ""}`}
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

      <div className="p-6 md:p-8 border-t border-white/10 bg-white/[0.02]">
        <div className="text-center mb-8">
          <h3 className="font-semibold text-xl text-white mb-2 inline-flex items-center gap-2">
            <Sparkles className="text-gray-400" size={20} />
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
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-6">
            <ProsConsList title="Pros" items={data.pros} isPros={true} />
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
            <ProsConsList title="Cons" items={data.cons} isPros={false} />
          </div>
        </div>
      </div>

      {/* What Users Say and Ratings - Only show if V2 features enabled */}
      {enableV2Features && (
        <div className="p-6 md:p-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-lg text-white mb-3">
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
            <h3 className="font-semibold text-lg text-white mb-3">
              Ratings Breakdown
            </h3>
            <RatingsChart breakdown={data.ratingsBreakdown} />
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 border-t border-white/10">
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
      
      {/* Top User Comments - Only show if V2 features enabled */}
      {enableV2Features && (
        <div className="p-6 md:p-8 border-t border-white/10">
          <h3 className="font-semibold text-lg text-white mb-4">
            Top User Comments
          </h3>
          {data.topReviews && data.topReviews.length > 0 ? (
            <div className="space-y-4">
              {data.topReviews.slice(0, 10).map((comment: string, i: number) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-white/20 pl-4 text-sm text-gray-300 italic"
                >
                  &quot;{comment}&quot;
                </blockquote>
              ))}
            </div>
          ) : (
            <i className="text-gray-500 text-sm">No Reviews Available.</i>
          )}
        </div>
      )}

      {/* Action Buttons - Only show if v2 features are enabled */}
      {(onSetAlert || onAddToWishlist || onExport) && (
        <div className="p-6 md:p-8 border-t border-white/10 bg-white/[0.02]">
          <h3 className="font-semibold text-lg text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {onSetAlert && (
              <Button
                onClick={onSetAlert}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Set Price Alert
              </Button>
            )}
            
            {onAddToWishlist && (
              <Button
                onClick={onAddToWishlist}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Add to Wishlist
              </Button>
            )}
            
            {onExport && (
              <Button
                onClick={onExport}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </Button>
            )}
            
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
        </div>
      )}

      <div className="px-6 py-3 bg-white/[0.02] text-center text-xs text-gray-500 border-t border-white/10">
        Data from{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-400"
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
    const msg = error.message.toLowerCase();

    if (msg.includes("abort") || msg.includes("timeout")) {
      return "Request timed out. The website might be slow or blocking requests. Please try again.";
    }
    if (msg.includes("failed to scrape") || msg.includes("scraping failed")) {
      return "Could not fetch data from the URL. The product might be unavailable or the link is incorrect.";
    }
    if (msg.includes("valid json") || msg.includes("ai")) {
      return "AI failed to process the product data. The page format may be unsupported. Please try another link.";
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Network error. Please check your internet connection and try again.";
    }
    if (msg.includes("puter")) {
      return "AI service is unavailable. Please refresh the page and try again.";
    }

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

const FeatureCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white/5 p-6 rounded-lg border border-white/10 backdrop-blur-sm">
    <div className="text-gray-400 mb-3">{icon}</div>
    <h3 className="font-semibold text-lg text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400">{children}</p>
  </div>
);

const StatCard = ({
  icon,
  value,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel?: string;
}) => (
  <div className="bg-white/5 p-6 rounded-lg border border-white/10 text-center backdrop-blur-sm">
    <div className="text-gray-400 mx-auto mb-3 w-10 h-10 flex items-center justify-center">
      {icon}
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    <p className="text-sm text-gray-300 font-semibold">{label}</p>
    <p className="text-xs text-gray-500">{sublabel}</p>
  </div>
);

export default function App() {
  // Feature flag for v2.0 features
  const enableV2Features = process.env.NEXT_PUBLIC_ENABLE_V2_FEATURES === 'true';
  
  const {
    init,
    isAuthenticated,
    user,
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
  
  // New state for enhanced features
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  
  // Helper function to extract price
  const extractPrice = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const match = priceStr.match(/[\d,]+/);
    return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
  };

  // Create price alert handler
  const createPriceAlert = async (email: string, targetPrice: number) => {
    if (!activeProduct) return;
    
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productUrl: activeProduct.sourceUrl,
        productTitle: activeProduct.refinedData.title,
        targetPrice,
        currentPrice: extractPrice(activeProduct.refinedData.priceBlockText),
        currency: "₹",
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create alert");
    }

    return response.json();
  };

  // Add to wishlist handler
  const handleAddToWishlist = async () => {
    if (!isAuthenticated || !user?.email) {
      setError("Please sign in to use wishlist");
      return;
    }

    if (!activeProduct) return;

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: activeProduct.sourceUrl,
          productTitle: activeProduct.refinedData.title,
          currentPrice: extractPrice(activeProduct.refinedData.priceBlockText),
          currency: "₹",
          imageUrl: activeProduct.refinedData.imageUrl,
          rating: activeProduct.refinedData.rating,
          email: user.email,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("✅ Added to wishlist!");
      } else {
        alert(data.error || "Failed to add to wishlist");
      }
    } catch {
      alert("Failed to add to wishlist");
    }
  };

  // Export report handler
  const handleExportReport = () => {
    if (!activeProduct) return;
    
    const html = exportToHTML(
      activeProduct.refinedData,
      activeProduct.sourceUrl
    );
    
    const filename = `${activeProduct.refinedData.title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}_analysis.html`;
    downloadFile(html, filename, "text/html");
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Start overall timer
    const overallStartTime = performance.now();
    console.log("🚀 Starting product analysis process...");
    
    setError(null);
    setIsSubmitting(true);
    setActiveProduct(null);

    try {
      // Normalize URL for caching
      const normalizeUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          const paramsToRemove = [
            "ref",
            "ref_",
            "tag",
            "psc",
            "qid",
            "sr",
            "keywords",
          ];
          paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));
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
          const cacheCheckEnd = performance.now();
          console.log(`⏱️  Cache check: ${(cacheCheckEnd - cacheCheckStart).toFixed(2)}ms`);
          
          const oneHour = 60 * 60 * 1000;
          if (
            cachedData &&
            typeof cachedData === "object" &&
            "scrapedAt" in cachedData &&
            new Date().getTime() -
              new Date(cachedData.scrapedAt as string).getTime() <
              oneHour
          ) {
            console.log("✅ Cache hit! Using cached data");
            const overallEndTime = performance.now();
            console.log(`🏁 Total time (cached): ${((overallEndTime - overallStartTime) / 1000).toFixed(2)}s`);
            setActiveProduct(cachedData as HistoryItem);
            setIsSubmitting(false);
            setUrl("");
            return;
          } else {
            console.log("❌ Cache miss or expired");
          }
        } catch (cacheError) {
          console.warn("Cache retrieval failed:", cacheError);
          // Continue with fresh scrape
        }
      }

      setLoadingMessage("Extracting data from source...");
      console.log("🌐 Starting web scrape...");
      const scrapeStartTime = performance.now();
      const route = "/api/scrape";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to scrape (${response.status})`
        );
      }

      setLoadingMessage("Analyzing with AI...");
      const scrapedData: ScrapedData = await response.json();
      const scrapeEndTime = performance.now();
      console.log(`⏱️  Web scraping completed: ${((scrapeEndTime - scrapeStartTime) / 1000).toFixed(2)}s`);
      console.log(`   - Title: ${scrapedData.title}`);
      console.log(`   - Reviews scraped: ${scrapedData.topReviews?.length || 0}`);
      console.log(`   - Image URL: ${scrapedData.imageUrl ? 'Found' : 'Not found'}`);

      // Show raw reviews immediately while AI processes
      const initialProductState: HistoryItem = {
        refinedData: {
          ...scrapedData,
          title: scrapedData.title || "__LOADING__",
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
          topReviews: scrapedData.topReviews || [], // Show reviews immediately
        },
        sourceUrl: productUrl,
        scrapedAt: new Date().toISOString(),
      };
      setActiveProduct(initialProductState);

      // Start fetching price history in parallel with AI processing (behind V2 feature flag)
      let priceHistoryPromise;
      if (enableV2Features) {
        console.log("📊 Starting parallel price history fetch...");
        const priceHistoryStartTime = performance.now();
        priceHistoryPromise = fetch(
          `/api/price-history?url=${encodeURIComponent(normalizedUrl)}`
        ).then(res => {
          const priceHistoryEndTime = performance.now();
          console.log(`⏱️  Price history fetch: ${((priceHistoryEndTime - priceHistoryStartTime) / 1000).toFixed(2)}s`);
          return res.ok ? res.json() : { history: [] };
        });
      } else {
        // Skip API call when feature disabled
        console.log("📊 Price history disabled (V2 features off)");
        priceHistoryPromise = Promise.resolve({ history: [] });
      }

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

      // Send only first 20 reviews to AI to reduce processing time
      const reviewsForAI = scrapedData.topReviews?.slice(0, 20) || [];
      console.log(`🤖 Preparing AI analysis with ${reviewsForAI.length} reviews...`);
      console.log(`   - Using ${reviewsForAI.length > 0 ? 'FULL' : 'SIMPLIFIED'} prompt (${reviewsForAI.length > 0 ? 'with' : 'without'} review analysis)`);

      const dataForAI = {
        title: scrapedData.title,
        priceBlockText: scrapedData.priceBlockText,
        discount: scrapedData.discount,
        fullDescription: sanitizeForAI(scrapedData.fullDescription, 1500),
        serviceInfoText: sanitizeForAI(scrapedData.serviceInfoText, 500),
        specifications: specificationsForAI,
        featureBullets: scrapedData.featureBullets,
        reviewsMedleyText: sanitizeForAI(scrapedData.reviewsMedleyText, 2000),
        topReviews: reviewsForAI, // Only send 20 reviews to AI
      };

      const prompt = createProductSummaryPrompt(dataForAI);
      console.log(`   - Prompt size: ${(prompt.length / 1024).toFixed(2)}KB`);

      console.log("🤖 Calling AI for analysis...");
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
      const aiEndTime = performance.now();
      console.log(`⏱️  AI analysis completed: ${((aiEndTime - aiStartTime) / 1000).toFixed(2)}s`);
      console.log(`   - Response size: ${(aiResponseJsonString.length / 1024).toFixed(2)}KB`);

      const jsonMatch = aiResponseJsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return a valid JSON object.");
      }
      const refinedJson: RefinedData = JSON.parse(jsonMatch[0]);

      // Wait for price history to complete (should be done by now)
      const priceHistoryWaitStart = performance.now();
      setLoadingMessage("Calculating deal score...");
      const historyData = await priceHistoryPromise;
      const priceHistoryWaitEnd = performance.now();
      if (enableV2Features) {
        console.log("⏳ Waiting for price history...");
        console.log(`⏱️  Price history wait time: ${((priceHistoryWaitEnd - priceHistoryWaitStart) / 1000).toFixed(2)}s`);
      }
      const priceHistory: PriceHistoryEntry[] = historyData.history || [];
      if (enableV2Features) {
        console.log(`   - History entries: ${priceHistory.length}`);
      }

      // Calculate deal score (behind V2 feature flag)
      let dealScore: DealScore | undefined;
      if (enableV2Features) {
        console.log("💯 Calculating deal score...");
        const dealScoreStart = performance.now();
        if (scrapedData.priceBlockText) {
          const { calculateDealScore, extractNumericPrice } = await import("@/services/priceTrackingService");
          const priceData = extractNumericPrice(scrapedData.priceBlockText);
          const discountData = scrapedData.discount ? extractNumericPrice(scrapedData.discount) : null;
          
          if (priceData) {
            dealScore = calculateDealScore(
              priceData.value,
              priceHistory,
              scrapedData.rating,
              scrapedData.totalRatings,
              discountData?.value
            );
          }
        }
        const dealScoreEnd = performance.now();
        console.log(`⏱️  Deal score calculation: ${(dealScoreEnd - dealScoreStart).toFixed(2)}ms`);
        if (dealScore) {
          console.log(`   - Score: ${dealScore.score}/100 (${dealScore.label})`);
        }
      } else {
        console.log("💯 Deal score calculation skipped (V2 features disabled)");
      }

      const productData: HistoryItem = {
        refinedData: { 
          ...scrapedData, 
          ...refinedJson,
          dealScore: enableV2Features ? dealScore : undefined,
          priceHistory: enableV2Features 
            ? (priceHistory.length > 0 
                ? priceHistory.slice(-7) // Last 7 entries for chart
                : scrapedData.priceBlockText // If no history, create current price entry
                  ? [{
                      price: parseFloat(scrapedData.priceBlockText.replace(/[^\d.]/g, '')),
                      currency: scrapedData.priceBlockText.match(/[₹$£€]/)?.[0] || '₹',
                      timestamp: new Date().toISOString(),
                      discount: scrapedData.discount ? parseFloat(scrapedData.discount.replace(/[^\d.]/g, '')) : undefined
                    }]
                  : [])
            : undefined, // No price history when V2 features disabled
          topReviews: scrapedData.topReviews || [], // Keep all 30 scraped reviews
        },
        sourceUrl: normalizedUrl,
        scrapedAt: new Date().toISOString(),
      };
      
      if (enableV2Features) {
        console.log(`📊 Price history entries for chart: ${productData.refinedData.priceHistory?.length || 0}`);
      }

      setActiveProduct(productData);
      setUrl("");

      const overallEndTime = performance.now();
      const totalTime = (overallEndTime - overallStartTime) / 1000;
      console.log(`\n🏁 TOTAL TIME: ${totalTime.toFixed(2)}s`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Save to cache and history (don't block on these)
      console.log("💾 Saving to cache and history (async)...");
      Promise.all([
        kv
          .set(cacheKey, productData)
          .catch((e) => console.error("Cache save failed:", e)),
        addToHistory(productData).catch((e) =>
          console.error("History save failed:", e)
        ),
      ]).then(() => {
        fetchHistory().catch((e) => console.error("History fetch failed:", e));
      });
    } catch (err: unknown) {
      const overallEndTime = performance.now();
      const totalTime = (overallEndTime - overallStartTime) / 1000;
      console.error(`❌ Process failed after ${totalTime.toFixed(2)}s`);
      console.error("Scrape and analyze error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setLoadingMessage("Extracting Data...");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return setError(SIGN_IN_PROMPT);
    const supportedDomainsRegex =
      /^(https?:\/\/(www\.)?(amazon\.(in|com)|amzn\.in|flipkart\.com|myntra\.com))\//;
    if (!supportedDomainsRegex.test(url)) {
      return setError("Please paste a valid link from Amazon, Flipkart, or Myntra.");
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
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen text-white font-sans">
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isNavStuck
            ? "bg-gray-950/80 backdrop-blur-lg border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="text-white" size={20} />
              <span className="text-lg font-semibold text-white">SmartShop AI</span>
            </div>
            <div>
              <AuthComponent />
            </div>
          </div>
        </div>
      </nav>

      <div className="relative overflow-hidden -mt-16 pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-950"></div>
        <div className="relative container mx-auto px-4 sm:px-8 py-20 text-center">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300 mb-6 backdrop-blur-sm">
            Powered by Advanced AI Models
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            Smart Product Analysis
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Get AI-powered insights on products from Amazon, Flipkart & Myntra. Track prices, compare deals, and make informed purchasing decisions.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold text-base px-8"
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
              className="bg-white/5 text-white font-semibold text-base border-white/10 hover:bg-white/10 px-8"
              onClick={handleViewSample}
            >
              View Sample Analysis
            </Button>
          </div>
          <div className="mt-8 text-sm text-gray-500 flex justify-center items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-500"></span>
              Real-time Analysis
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-500"></span>
              AI-Powered Insights
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-500"></span>
              Trusted by 500+ Users
            </span>
          </div>
        </div>
        <div className="relative container mx-auto px-4 sm:px-8 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon={<Cpu size={24} />} title="AI-Powered Analysis">
            Advanced algorithms analyze products for comprehensive insights and recommendations.
          </FeatureCard>
          <FeatureCard icon={<BarChart size={24} />} title="Price Tracking">
            Track price history and get notified when prices drop on your favorite products.
          </FeatureCard>
          <FeatureCard
            icon={<ShieldCheck size={24} />}
            title="Deal Score Algorithm"
          >
            Proprietary algorithm calculates deal quality based on price trends and ratings.
          </FeatureCard>
          <FeatureCard icon={<Zap size={24} />} title="Multi-Platform">
            Support for Amazon, Flipkart, and Myntra - all in one place.
          </FeatureCard>
        </div>
      </div>

      <div className="bg-gray-950 py-5">
        <div className="container mx-auto px-4 sm:px-8">
          <FormErrorBoundary>
            <div
              className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm"
              id="input-url"
            >
              <div className="flex items-center gap-2 mb-2">
                <Search className="text-gray-400" size={20} />
                <h2 className="text-xl font-semibold text-white">
                  Product URL Analyzer
                </h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Enter an Amazon, Flipkart, or Myntra product URL to get AI-powered insights
              </p>
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <div className="relative w-full">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.amazon.in/... or https://flipkart.com/... or https://myntra.com/..."
                  className="h-12 text-base pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  disabled={!isAuthenticated || isSubmitting}
                />

                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 text-base bg-white text-gray-900 hover:bg-gray-100 font-semibold"
                disabled={!isAuthenticated || isSubmitting || !url}
              >
                {isSubmitting ? "Analyzing..." : "Get Summary"}
              </Button>
              {activeProduct && !isSubmitting && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Re-fetch fresh data for the current product"
                  className="bg-white/5 hover:bg-white/10 text-white font-semibold p-3 rounded-lg transition-colors h-12 w-12 flex items-center justify-center border border-white/10"
                >
                  <svg
                    className="w-5 h-5"
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
          </FormErrorBoundary>

          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold text-white">
              Trusted by Smart Shoppers
            </h2>
            <p className="mt-2 text-gray-400 max-w-xl mx-auto">
              Join thousands of users who make better purchasing decisions with
              our AI-powered analysis.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">{loadingMessage}</p>
          </div>
        )}

        {error && (
          <div
            className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {activeProduct && (
          <ProductErrorBoundary fallbackMessage="Failed to display product information">
            <div className="mt-8">
              <ProductCard
                data={activeProduct.refinedData}
                sourceUrl={activeProduct.sourceUrl}
                scrapedAt={activeProduct.scrapedAt}
                enableV2Features={enableV2Features}
                onSetAlert={enableV2Features ? () => setShowPriceAlert(true) : undefined}
                onAddToWishlist={enableV2Features ? handleAddToWishlist : undefined}
                onExport={enableV2Features ? handleExportReport : undefined}
              />
            </div>
          </ProductErrorBoundary>
        )}
      </div>

      {/* Price Alert Modal */}
      {showPriceAlert && activeProduct && (
        <PriceAlertModal
          productTitle={activeProduct.refinedData.title}
          currentPrice={extractPrice(activeProduct.refinedData.priceBlockText)}
          currency="₹"
          onClose={() => setShowPriceAlert(false)}
          onSubmit={createPriceAlert}
        />
      )}

      <footer className="border-t border-white/10 py-8 bg-gray-950">
        <div className="container mx-auto px-4 sm:px-8 text-center text-gray-500 text-sm">
          <p>
            © 2025 SmartShop AI. Powered by AI for smarter shopping decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
