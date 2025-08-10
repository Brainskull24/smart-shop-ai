# Product Insights AI 🚀

An intelligent web application that takes any e-commerce product URL, scrapes its data in real-time, and uses AI to generate a clean, refined, and data-rich summary card. This tool transforms messy product pages into structured, easy-to-digest information.

<!-- ![Product Insights AI Demo](./demo.gif) -->
<!-- Add a GIF of the app in action here! -->

---

## ✨ Key Features

-   **Real-Time Web Scraping**: Utilizes a headless browser (Puppeteer) on the backend to scrape live data from any product URL, bypassing issues with sites that rely heavily on JavaScript.
-   **AI-Powered Data Refinement**: Leverages a powerful AI model (via Puter.js) to process the raw scraped text. It intelligently shortens titles, extracts key features, and formats data into a clean JSON object.
-   **Dynamic Product Summary Card**: A sleek, modern, and responsive UI that displays the refined product information. The card only shows the data points that were successfully found and processed, ensuring a clean and relevant view every time.
-   **Optimized Performance**: The backend scraper is optimized to block unnecessary resources like images and stylesheets, significantly speeding up data extraction.
-   **Serverless-Ready**: Built with Next.js and configured to be easily deployable on serverless platforms like Vercel.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (React)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Web Scraping**: [Puppeteer](https://pptr.dev/)
-   **AI Integration**: [Puter.js](https://puter.com/) for client-side AI processing
-   **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## ⚙️ Setup and Installation

Follow these steps to get the project running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18.x or later)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Clone the repository

```bash
git clone [https://github.com/Brainskull24/smart-shop-ai.git](https://github.com/Brainskull24/smart-shop-ai.git)

2. Install dependencies
This project uses puppeteer for local development.

npm install
# or
yarn install

3. Run the development server
Start the Next.js development server on http://localhost:3000.

npm run dev
# or
yarn dev

You can now open your browser and navigate to http://localhost:3000 to see the application in action!


🔄 How It Works
URL Submission: 

The user enters an e-commerce product URL into the input field on the frontend.

API Request: 

The frontend sends a POST request to the /api/scrape backend endpoint with the URL in the request body.

Scraping with Puppeteer: 

The API endpoint launches a headless Puppeteer instance, navigates to the provided URL, and extracts raw product data (title, price, description, specs, etc.) from the page's HTML.

Raw Data Response: 

The API sends the raw, unstructured scraped data back to the frontend as a JSON object.

AI Refinement: 

The frontend constructs a detailed prompt containing the raw data and sends it to the Puter.js AI service. The prompt instructs the AI to act as a data processor and return a clean, structured JSON object.

Display Results: 

The frontend receives the refined JSON from the AI and uses it to render the final, polished ProductCard component for the user.

🔌 API Endpoint
POST /api/scrape
Description: Accepts a product URL, scrapes it, and returns the raw extracted data.

Request Body:

{
  "url": "[https://www.example-product-page.com/](https://www.example-product-page.com/)..."
}

Success Response (200 OK):

{
  "title": "A Very Long and Detailed Product Title...",
  "price": "$199.99",
  "fullDescription": "A long block of text...",
  "specifications": { "Color": "Blue", "Weight": "2 lbs" },
  // ... and other raw fields
}

Error Response (4xx/5xx):

{
  "error": "Could not extract product title. The page might not be a valid product page."
}