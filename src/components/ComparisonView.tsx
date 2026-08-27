"use client";
import React from "react";
import { ProductData } from "@/types/product";

interface ComparisonViewProps {
  products: ProductData[];
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ products, onClose }) => {
  if (products.length === 0) return null;

  const extractPrice = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const match = priceStr.match(/[\d,]+/);
    return match ? parseFloat(match[0].replace(/,/g, "")) : 0;
  };

  const specs = Array.from(
    new Set(products.flatMap(p => Object.keys(p.specs || {})))
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Product Comparison</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4 text-left text-gray-400 font-semibold sticky left-0 bg-gray-900">
                    Feature
                  </th>
                  {products.map((product, idx) => (
                    <th key={idx} className="p-4 text-center border-l border-white/10">
                      <div className="text-white font-semibold text-sm mb-2">
                        Product {idx + 1}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Images */}
                <tr className="border-t border-white/10">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Image
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-center">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-32 h-32 object-contain mx-auto"
                        />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Title */}
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Title
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-gray-200 text-sm">
                      {product.title}
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr className="border-t border-white/10">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Price
                  </td>
                  {products.map((product, idx) => {
                    const price = extractPrice(product.priceBlockText);
                    const allPrices = products.map(p => extractPrice(p.priceBlockText));
                    const minPrice = Math.min(...allPrices);
                    const isLowest = price === minPrice;

                    return (
                      <td key={idx} className="p-4 border-l border-white/10 text-center">
                        <div className={`text-xl font-bold ${isLowest ? 'text-green-400' : 'text-white'}`}>
                          {product.priceBlockText}
                        </div>
                        {isLowest && (
                          <span className="text-xs text-green-400 mt-1 inline-block">
                            ✓ Best Price
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Deal Score */}
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Deal Score
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-center">
                      {product.dealScore ? (
                        <div>
                          <div className={`text-2xl font-bold ${
                            product.dealScore.score >= 80 ? 'text-green-400' :
                            product.dealScore.score >= 65 ? 'text-blue-400' :
                            product.dealScore.score >= 45 ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {product.dealScore.score}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {product.dealScore.label}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="border-t border-white/10">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Rating
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-center">
                      <div className="text-white">⭐ {product.rating || "N/A"}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {product.totalRatings || "No ratings"}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Brand */}
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Brand
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-center text-gray-200">
                      {product.brand || "N/A"}
                    </td>
                  ))}
                </tr>

                {/* Pros */}
                <tr className="border-t border-white/10">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Pros
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-sm">
                      <ul className="text-green-400 space-y-1 text-left">
                        {product.pros?.slice(0, 3).map((pro, i) => (
                          <li key={i}>• {pro}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Cons */}
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                    Cons
                  </td>
                  {products.map((product, idx) => (
                    <td key={idx} className="p-4 border-l border-white/10 text-sm">
                      <ul className="text-red-400 space-y-1 text-left">
                        {product.cons?.slice(0, 3).map((con, i) => (
                          <li key={i}>• {con}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Specifications */}
                {specs.slice(0, 5).map((spec, specIdx) => (
                  <tr key={spec} className={`border-t border-white/10 ${specIdx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="p-4 font-medium text-gray-400 sticky left-0 bg-gray-900">
                      {spec}
                    </td>
                    {products.map((product, idx) => (
                      <td key={idx} className="p-4 border-l border-white/10 text-center text-gray-200 text-sm">
                        {product.specs?.[spec] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-6 bg-white/5 border-t border-white/10 text-center">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
