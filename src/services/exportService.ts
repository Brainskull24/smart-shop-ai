import { ProductData } from "@/types/product";

/**
 * Generate CSV content from product data
 */
export function exportToCSV(products: ProductData[]): string {
  if (products.length === 0) {
    return "No data to export";
  }

  // Define CSV headers
  const headers = [
    "Title",
    "Price",
    "Original Price",
    "Discount %",
    "Rating",
    "Total Ratings",
    "Brand",
    "Category",
    "Availability",
    "Deal Score",
    "Deal Label",
    "Best For",
    "Warranty",
    "Return Policy",
    "Sentiment Score",
  ];

  // Create CSV rows
  const rows = products.map(product => {
    const discountPercent = product.discount && product.priceBlockText
      ? calculateDiscountPercent(product.priceBlockText, product.discount)
      : "";

    return [
      escapeCsvField(product.title || ""),
      escapeCsvField(product.priceBlockText || ""),
      escapeCsvField(product.discount || ""),
      discountPercent,
      escapeCsvField(product.rating || ""),
      escapeCsvField(product.totalRatings || ""),
      escapeCsvField(product.brand || ""),
      escapeCsvField(product.category || ""),
      escapeCsvField(product.availability || ""),
      product.dealScore?.score || "",
      escapeCsvField(product.dealScore?.label || ""),
      escapeCsvField(product.bestFor || ""),
      escapeCsvField(product.warranty || ""),
      escapeCsvField(product.returnPolicy || ""),
      product.sentimentScore || "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Escape CSV field (handle commas and quotes)
 */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Calculate discount percentage
 */
function calculateDiscountPercent(price: string, originalPrice: string): string {
  const priceMatch = price.match(/[\d,]+/);
  const originalMatch = originalPrice.match(/[\d,]+/);

  if (priceMatch && originalMatch) {
    const p = parseFloat(priceMatch[0].replace(/,/g, ""));
    const o = parseFloat(originalMatch[0].replace(/,/g, ""));
    const discount = ((o - p) / o) * 100;
    return discount.toFixed(1) + "%";
  }

  return "";
}

/**
 * Generate detailed HTML report
 */
export function exportToHTML(product: ProductData, sourceUrl: string): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.title} - SmartShop AI Analysis</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
      font-size: 28px;
    }
    h2 {
      color: #2d3748;
      margin: 30px 0 15px 0;
      font-size: 22px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    h3 {
      color: #4a5568;
      margin: 20px 0 10px 0;
      font-size: 18px;
    }
    .header {
      border-bottom: 3px solid #3182ce;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .meta-info {
      color: #718096;
      font-size: 14px;
      margin-top: 5px;
    }
    .price-section {
      background: #edf2f7;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .price {
      font-size: 32px;
      font-weight: bold;
      color: #2d3748;
    }
    .original-price {
      text-decoration: line-through;
      color: #a0aec0;
      font-size: 20px;
      margin-left: 10px;
    }
    .deal-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      margin: 10px 0;
      font-size: 16px;
    }
    .deal-excellent { background: #c6f6d5; color: #22543d; }
    .deal-good { background: #bee3f8; color: #2c5282; }
    .deal-fair { background: #feebc8; color: #744210; }
    .deal-wait { background: #fed7d7; color: #742a2a; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .info-item {
      padding: 12px;
      background: #f7fafc;
      border-radius: 6px;
      border-left: 3px solid #3182ce;
    }
    .info-label {
      font-size: 12px;
      color: #718096;
      text-transform: uppercase;
      font-weight: 600;
    }
    .info-value {
      font-size: 16px;
      color: #2d3748;
      margin-top: 4px;
    }
    .pros-cons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .pros, .cons {
      padding: 20px;
      border-radius: 8px;
    }
    .pros {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
    }
    .cons {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
    }
    .pros h3 { color: #065f46; }
    .cons h3 { color: #991b1b; }
    ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    li {
      margin: 8px 0;
      color: #4a5568;
    }
    .specs-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .specs-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .specs-table td:first-child {
      font-weight: 600;
      color: #4a5568;
      width: 40%;
    }
    .specs-table tr:nth-child(even) {
      background: #f7fafc;
    }
    .recommendation {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .recommendation-text {
      font-size: 18px;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #718096;
      font-size: 14px;
    }
    .link {
      color: #3182ce;
      text-decoration: none;
    }
    .link:hover {
      text-decoration: underline;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${product.title}</h1>
      <div class="meta-info">
        ${product.brand ? `Brand: ${product.brand} | ` : ""}
        ${product.category ? `Category: ${product.category}` : ""}
      </div>
      <div class="meta-info">
        Report Generated: ${new Date().toLocaleString()} | 
        Source: <a href="${sourceUrl}" class="link" target="_blank">View on Amazon</a>
      </div>
    </div>

    <div class="price-section">
      <div>
        <span class="price">${product.priceBlockText || "N/A"}</span>
        ${product.discount ? `<span class="original-price">${product.discount}</span>` : ""}
      </div>
      ${product.dealScore ? `
        <span class="deal-badge deal-${product.dealScore.label.toLowerCase().replace(' ', '-').replace('consider waiting', 'wait')}">
          ${product.dealScore.label} (${product.dealScore.score}/100)
        </span>
        <div style="margin-top: 10px; color: #4a5568;">
          ${product.dealScore.reasons.join(" • ")}
        </div>
      ` : ""}
    </div>

    ${product.bestFor ? `
      <div class="recommendation">
        <div style="font-size: 14px; margin-bottom: 8px; opacity: 0.9;">AI RECOMMENDATION</div>
        <div class="recommendation-text">"${product.bestFor}"</div>
      </div>
    ` : ""}

    <div class="info-grid">
      ${product.rating ? `
        <div class="info-item">
          <div class="info-label">Rating</div>
          <div class="info-value">⭐ ${product.rating}</div>
        </div>
      ` : ""}
      ${product.totalRatings ? `
        <div class="info-item">
          <div class="info-label">Total Ratings</div>
          <div class="info-value">${product.totalRatings}</div>
        </div>
      ` : ""}
      ${product.availability ? `
        <div class="info-item">
          <div class="info-label">Availability</div>
          <div class="info-value">${product.availability}</div>
        </div>
      ` : ""}
      ${product.deliveryTime ? `
        <div class="info-item">
          <div class="info-label">Delivery</div>
          <div class="info-value">${product.deliveryTime}</div>
        </div>
      ` : ""}
    </div>

    ${product.pros.length > 0 || product.cons.length > 0 ? `
      <h2>Pros & Cons Analysis</h2>
      <div class="pros-cons">
        ${product.pros.length > 0 ? `
          <div class="pros">
            <h3>✓ Pros</h3>
            <ul>
              ${product.pros.map(pro => `<li>${pro}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
        ${product.cons.length > 0 ? `
          <div class="cons">
            <h3>✗ Cons</h3>
            <ul>
              ${product.cons.map(con => `<li>${con}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    ` : ""}

    ${product.reviewSummary ? `
      <h2>Review Summary</h2>
      <p style="color: #4a5568; line-height: 1.8;">${product.reviewSummary}</p>
    ` : ""}

    ${product.specs && Object.keys(product.specs).length > 0 ? `
      <h2>Technical Specifications</h2>
      <table class="specs-table">
        ${Object.entries(product.specs)
          .filter(([key]) => key !== "isLoading")
          .map(([key, value]) => `
            <tr>
              <td>${key}</td>
              <td>${value}</td>
            </tr>
          `).join("")}
      </table>
    ` : ""}

    ${product.warranty || product.returnPolicy ? `
      <h2>Warranty & Returns</h2>
      <div class="info-grid">
        ${product.warranty ? `
          <div class="info-item">
            <div class="info-label">Warranty</div>
            <div class="info-value">${product.warranty}</div>
          </div>
        ` : ""}
        ${product.returnPolicy ? `
          <div class="info-item">
            <div class="info-label">Return Policy</div>
            <div class="info-value">${product.returnPolicy}</div>
          </div>
        ` : ""}
      </div>
    ` : ""}

    <div class="footer">
      <p><strong>SmartShop AI</strong> - Smart Product Analysis</p>
      <p>This report was generated automatically using AI-powered analysis.</p>
      <p style="margin-top: 10px; font-size: 12px;">
        All prices and information are accurate as of the report generation time.<br>
        Please verify current prices and details on the retailer's website.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return html;
}

/**
 * Generate price history CSV
 */
export function exportPriceHistoryToCSV(
  productTitle: string,
  priceHistory: Array<{ price: number; currency: string; timestamp: string; discount?: number }>
): string {
  const headers = ["Date", "Time", "Price", "Original Price", "Discount %", "Currency"];

  const rows = priceHistory.map(entry => {
    const date = new Date(entry.timestamp);
    const discountPercent = entry.discount
      ? (((entry.discount - entry.price) / entry.discount) * 100).toFixed(1) + "%"
      : "";

    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      entry.price,
      entry.discount || "",
      discountPercent,
      entry.currency,
    ].join(",");
  });

  const title = `Price History for: ${productTitle}\n`;
  return title + [headers.join(","), ...rows].join("\n");
}

/**
 * Download helper function for browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export comparison report
 */
export function exportComparisonToCSV(products: ProductData[]): string {
  return exportToCSV(products);
}
