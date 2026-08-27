"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface PriceAlertModalProps {
  productTitle: string;
  currentPrice: number;
  currency: string;
  onClose: () => void;
  onSubmit: (email: string, targetPrice: number) => Promise<void>;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  productTitle,
  currentPrice,
  currency,
  onClose,
  onSubmit,
}) => {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !targetPrice) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const targetPriceNum = parseFloat(targetPrice);
    if (isNaN(targetPriceNum) || targetPriceNum <= 0) {
      setError("Please enter a valid target price");
      return;
    }

    if (targetPriceNum >= currentPrice) {
      setError("Target price must be lower than current price");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(email, targetPriceNum);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create price alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedPrices = [
    { label: "5% off", value: (currentPrice * 0.95).toFixed(2) },
    { label: "10% off", value: (currentPrice * 0.90).toFixed(2) },
    { label: "15% off", value: (currentPrice * 0.85).toFixed(2) },
    { label: "20% off", value: (currentPrice * 0.80).toFixed(2) },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-white/10 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Set Price Alert</h3>
            <p className="text-sm text-gray-400">Get notified when price drops</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Alert Created!</h4>
            <p className="text-gray-400 text-sm">
              We&apos;ll notify you when the price drops to your target
            </p>
          </div>
        ) : (
          <>
            {/* Product Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
              <p className="text-sm text-gray-300 mb-2 line-clamp-2">{productTitle}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-400">Current Price:</span>
                <span className="text-lg font-bold text-white">
                  {currency} {currentPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border-white/10 text-white"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price ({currency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-white/5 border-white/10 text-white"
                  disabled={isSubmitting}
                />
              </div>

              {/* Suggested Prices */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Suggested targets:</p>
                <div className="grid grid-cols-4 gap-2">
                  {suggestedPrices.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => setTargetPrice(suggestion.value)}
                      className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 transition text-gray-300"
                      disabled={isSubmitting}
                    >
                      <div className="font-semibold">{suggestion.label}</div>
                      <div className="text-gray-400 mt-1">{suggestion.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Alert"}
                </Button>
              </div>
            </form>

            {/* Info */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              You&apos;ll receive an email when the price drops to or below your target
            </p>
          </>
        )}
      </div>
    </div>
  );
};
