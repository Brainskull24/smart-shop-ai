# SmartShop AI 🚀

An intelligent web application that analyzes e-commerce products from Amazon, Flipkart, and Myntra using AI. Get comprehensive insights, price history, deal scores, and smart recommendations - all in one place.

<!-- ![SmartShop AI Demo](./demo.gif) -->
<!-- Add a GIF of the app in action here! -->

---

## ✨ Key Features

### 🎯 **Multi-Platform Support**
- **Amazon** (India & Global)
- **Flipkart** (India's #1 e-commerce)
- **Myntra** (Fashion & Lifestyle)
- Single interface for all platforms

### 🎲 **Intelligent Deal Score Algorithm**
Our proprietary algorithm calculates a comprehensive deal score (0-100) based on:
- Price history analysis (30-day tracking)
- Discount percentage evaluation
- Product ratings and review quality
- Review volume and popularity
- Real-time availability

**Score Interpretation:**
- 80-100: **Excellent Deal** 🟢 - Best time to buy
- 65-79: **Good Deal** 🔵 - Worth purchasing
- 45-64: **Fair Price** 🟡 - Average market price
- 0-44: **Consider Waiting** ⚪ - Price may drop soon

### 📊 **Price History Tracking**
- Automatic price tracking for every product
- 30-day historical data storage
- Visual price trend indicators (↑↓→)
- Percentage change calculations
- Identify historical lows and highs

### 🤖 **AI-Powered Analysis**
- **Review Summarization**: Condenses hundreds of reviews into key insights
- **Pros & Cons Extraction**: Top 3 strengths and weaknesses
- **Target Audience Identification**: "Best for..." recommendations
- **Sentiment Scoring**: 1-10 scale based on review analysis
- **Smart Specifications**: Category-aware spec extraction

### ⚡ **Real-Time Web Scraping**
- Headless browser (Puppeteer) for JavaScript-heavy sites
- Optimized resource blocking for 3x faster scraping
- Anti-bot detection evasion
- Automatic retry logic for reliability

### 🎨 **Minimal Professional UI**
- Clean, distraction-free interface
- Glass morphism design
- Mobile-responsive layout
- Focus on actionable insights

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (React 19)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Web Scraping**: [Puppeteer](https://pptr.dev/) with [@sparticuz/chromium](https://github.com/Sparticuz/chromium)
-   **AI Integration**: [Puter.js](https://puter.com/) (GPT-4 powered)
-   **Database**: [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis)
-   **Rate Limiting**: [@upstash/ratelimit](https://github.com/upstash/ratelimit)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Deployment**: [Vercel](https://vercel.com/) (Serverless)

---

## ⚙️ Setup and Installation

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18.x or later)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   Chrome/Chromium browser (for local development)

### 1. Clone the repository

```bash
git clone https://github.com/Brainskull24/smart-shop-ai.git
cd smart-shop-ai
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Vercel KV (Redis) - Required for caching and rate limiting
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token

# Chrome executable path (optional for local development)
CHROME_EXECUTABLE_PATH=/path/to/chrome

# Environment
NODE_ENV=development
```

**Get Vercel KV credentials:**
1. Create a [Vercel account](https://vercel.com)
2. Create a new KV database in your project
3. Copy the REST API URL and Token

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 How It Works

### 1. **URL Submission**
User enters a product URL from Amazon, Flipkart, or Myntra

### 2. **Smart Scraping**
- API endpoint launches headless Puppeteer browser
- Navigates to product page with anti-bot evasion
- Extracts comprehensive product data (title, price, specs, reviews)
- Blocks unnecessary resources for faster scraping

### 3. **Price History Check**
- Fetches 30-day price history from Vercel KV
- Calculates price trends and changes
- Stores current price for future tracking

### 4. **AI Analysis**
- Sends raw data to Puter.js AI (GPT-4)
- AI processes and structures the data
- Extracts pros, cons, and recommendations
- Generates review summary and sentiment score

### 5. **Deal Score Calculation**
- Proprietary algorithm analyzes multiple factors
- Combines price history, ratings, and discounts
- Generates actionable deal score (0-100)
- Provides transparent reasoning

### 6. **Display Results**
- Renders polished ProductCard with all insights
- Shows deal score badge with color coding
- Displays price trends and history
- Presents AI-generated recommendations

---

## 🔌 API Endpoints

### POST `/api/scrape`
Scrapes product data from provided URL

**Request:**
```json
{
  "url": "https://www.amazon.in/product/..."
}
```

**Response:**
```json
{
  "title": "Product Title",
  "priceBlockText": "₹1,999",
  "discount": "₹2,999",
  "rating": "4.5",
  "totalRatings": "1,234",
  "specifications": {...},
  "topReviews": [...],
  "scrapedAt": "2025-01-15T10:30:00Z",
  "sourceUrl": "https://..."
}
```

### GET `/api/price-history?url=<product_url>`
Fetches price history for a product

**Response:**
```json
{
  "history": [
    {
      "price": 1999,
      "currency": "₹",
      "timestamp": "2025-01-15T10:30:00Z",
      "discount": 2999
    }
  ],
  "count": 15
}
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Select your repository
- Add environment variables (KV credentials)
- Deploy!

3. **Automatic Deployments**
- Every push to `main` triggers a new deployment
- Preview deployments for pull requests

### Environment Variables for Production

```env
KV_REST_API_URL=your_production_kv_url
KV_REST_API_TOKEN=your_production_kv_token
NODE_ENV=production
VERCEL_ENV=production
```

**Note**: Chrome executable is automatically handled by @sparticuz/chromium in production.

---

## 📊 Features Comparison

| Feature | SmartShop AI | Competitors |
|---------|--------------|-------------|
| Multi-platform | ✅ 3 platforms | ❌ Usually 1 |
| Deal Score | ✅ Proprietary | ❌ None |
| Price History | ✅ 30 days | ⚠️ Limited |
| AI Analysis | ✅ GPT-4 | ⚠️ Basic |
| Production Ready | ✅ Serverless | ❌ Local only |
| Real-time Scraping | ✅ Puppeteer | ⚠️ API-based |

---

## 🎯 Use Cases

- **Smart Shoppers**: Find the best deals before buying
- **Price Conscious Buyers**: Track price history to buy at the right time
- **Research-Oriented**: Get comprehensive insights quickly
- **Comparison Shoppers**: Analyze products across platforms
- **Gift Buyers**: Make informed decisions for others

---

## 🔮 Roadmap

- [ ] Price drop email/SMS alerts
- [ ] Product comparison (side-by-side)
- [ ] Browser extension
- [ ] Wishlist management
- [ ] Price prediction (ML-based)
- [ ] Similar product recommendations
- [ ] Export reports (PDF/CSV)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Puter.js](https://puter.com/) for AI integration
- [Puppeteer](https://pptr.dev/) for web scraping
- [Vercel](https://vercel.com/) for hosting and KV storage
- [Upstash](https://upstash.com/) for rate limiting

---

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ for smart online shoppers**