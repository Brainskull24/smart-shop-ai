import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { getSiteConfig, SiteConfig } from "@/lib/scraperConfig";
import { ScrapedData } from "@/types/product";

// Serverless function configuration
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// User agents for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
];

// Domains to block for performance
const BLOCKED_DOMAINS = [
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "facebook.com",
  "doubleclick.net",
  "amazon-adsystem.com",
  "adservice.google.com",
];

/**
 * Resolve shortened URLs to their final destination
 * For now, just return the URL as-is since we're not dealing with shortened URLs
 */
async function resolveFinalUrl(shortUrl: string): Promise<string> {
  // Simply return the URL - Puppeteer will handle redirects
  return shortUrl;
}

/**
 * Get Puppeteer launch options based on environment
 */
async function getLaunchOptions() {
  // Check if we're in Vercel production environment
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  const isProduction = process.env.NODE_ENV === "production";

  console.log("Environment detection:", {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    isVercelProduction,
    isProduction,
  });

  // Only use @sparticuz/chromium in Vercel production
  if (isVercelProduction) {
    // Production: Use @sparticuz/chromium for Vercel
    console.log("Using @sparticuz/chromium for Vercel production");
    return {
      args: [
        ...chromium.args,
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath('/tmp'),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    };
  } else {
    // Development: Try to find local Chrome/Chromium
    const fs = await import("fs");
    const { execSync } = await import("child_process");
    
    // First check if CHROME_EXECUTABLE_PATH is set
    if (process.env.CHROME_EXECUTABLE_PATH) {
      if (fs.existsSync(process.env.CHROME_EXECUTABLE_PATH)) {
        console.log("Using Chrome from CHROME_EXECUTABLE_PATH:", process.env.CHROME_EXECUTABLE_PATH);
        return {
          executablePath: process.env.CHROME_EXECUTABLE_PATH,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--disable-blink-features=AutomationControlled",
          ],
          defaultViewport: { width: 1280, height: 720 },
        };
      }
    }

    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
      "/usr/bin/google-chrome-stable", // Linux
      "/usr/bin/google-chrome", // Linux
      "/usr/bin/chromium-browser", // Linux Chromium
      "/usr/bin/chromium", // Linux Chromium alt
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", // Windows 32-bit
    ];

    // Try to find Chrome using system commands
    let executablePath = "";
    
    // Try common paths first
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log("Found Chrome at:", path);
        break;
      }
    }

    // If not found, try using 'which' command on Unix-like systems
    if (!executablePath && process.platform !== "win32") {
      try {
        const whichResult = execSync("which google-chrome || which chromium || which chromium-browser", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        if (whichResult && fs.existsSync(whichResult)) {
          executablePath = whichResult;
          console.log("Found Chrome using 'which':", whichResult);
        }
      } catch {
        // Command failed, continue
      }
    }

    // On Windows, try registry lookup
    if (!executablePath && process.platform === "win32") {
      try {
        const regResult = execSync(
          'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
          { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
        );
        const match = regResult.match(/REG_SZ\s+(.+)/);
        if (match && match[1] && fs.existsSync(match[1].trim())) {
          executablePath = match[1].trim();
          console.log("Found Chrome using Windows registry:", executablePath);
        }
      } catch {
        // Registry query failed, continue
      }
    }

    if (!executablePath) {
      console.error("Chrome not found. Checked paths:", possiblePaths);
      throw new Error(
        "Chrome/Chromium not found. Please install Chrome or set CHROME_EXECUTABLE_PATH environment variable."
      );
    }

    return {
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--disable-blink-features=AutomationControlled",
      ],
      defaultViewport: { width: 1280, height: 720 },
    };
  }
}

/**
 * Navigate to URL with retry logic
 */
async function safeGoto(page: Page, url: string, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      return;
    } catch {
      if (attempt === retries) {
        throw new Error(`Failed to navigate to ${url} after ${retries + 1} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Check if page is blocked by anti-bot measures
 */
async function isPageBlocked(page: Page): Promise<boolean> {
  try {
    return await Promise.race([
      page.evaluate(() => {
        const blockedTexts = [
          "To discuss automated access to Amazon data please contact",
          "Sorry, we just need to make sure you're not a robot",
          "Enter the characters you see below",
          "Robot Check",
        ];
        const pageText = document.body.textContent || "";
        return blockedTexts.some((text) => pageText.includes(text));
      }),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
    ]);
  } catch {
    return false;
  }
}

/**
 * Expand review sections for better data extraction
 */
async function expandReviews(page: Page): Promise<void> {
  try {
    await Promise.race([
      page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const amazonReadMore = document.querySelectorAll('[data-hook="review-expand-link"]');
          const flipkartReadMore = document.querySelectorAll(
            ".QqFHMw._4FgsLt, .QqFHMw.ik7Tlh, ._1EPkAk"
          );

          const allLinks = [...amazonReadMore, ...flipkartReadMore];
          const firstSixLinks = Array.from(allLinks).slice(0, 6);

          firstSixLinks.forEach((link, index) => {
            setTimeout(() => {
              (link as HTMLElement).click();
            }, index * 100);
          });

          setTimeout(resolve, 1000);
        });
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (error) {
    console.warn("Failed to expand reviews:", error);
  }
}

/**
 * Extract product data from page
 */
async function extractProductData(
  page: Page,
  siteConfig: SiteConfig,
  marketplace: string
): Promise<Record<string, unknown>> {
  return await page.evaluate(
    (config: SiteConfig, market: string) => {
      const s = config.selectors;

      const getText = (selectors: string[]): string | null => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }
        return null;
      };

      const getAttr = (selectors: string[], attr: string): string | null => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          const value = element?.getAttribute(attr)?.trim();
          if (value) return value;
        }
        return null;
      };

      const truncateText = (text: string, maxLen: number): string => {
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen).trimEnd() + "...";
      };

      const extractedData: Record<string, unknown> = {};

      // Basic product info
      extractedData.title = getText(s.title);
      extractedData.priceBlockText = getText(s.priceBlockText);
      extractedData.discount = getText(s.discount);
      extractedData.imageUrl = getAttr(s.imageUrl, "src") || getAttr(s.imageUrl, "content");
      extractedData.rating = getText(s.rating);
      extractedData.totalRatings = getText(
        Array.isArray(s.totalRatings) ? s.totalRatings : [s.totalRatings]
      );
      extractedData.totalReviews = getText(
        Array.isArray(s.totalReviews) ? s.totalReviews : [s.totalReviews]
      );
      extractedData.availability = getText(s.availability);
      extractedData.brand = getText(s.brand);
      extractedData.fullDescription = getText(s.fullDescription);

      // Optional fields
      extractedData.deliveryTime = s.deliveryTime ? getText(s.deliveryTime) : "Not specified";
      extractedData.reviewsMedleyText = s.reviewsMedleyText ? getText(s.reviewsMedleyText) : null;
      extractedData.serviceInfoText = s.serviceInfoText ? getText(s.serviceInfoText) : "Not specified";
      extractedData.category = s.category ? getText(s.category) : "Not specified";
      extractedData.subcategory = s.subcategory ? getText(s.subcategory) : "Not specified";

      // Top reviews
      const maxReviewLength = 600;
      const topReviews = Array.from(
        document.querySelectorAll(s.topReviews.reviewContainer)
      )
        .slice(0, 20)
        .map((el) => {
          const reviewText = el
            .querySelector(s.topReviews.reviewText)
            ?.textContent?.replace(/Read more/gi, "")
            .trim() || "";
          return truncateText(reviewText, maxReviewLength);
        })
        .filter(Boolean);
      extractedData.topReviews = topReviews;

      // Specifications
      let specs: Record<string, string> | { html: string; text: string } = {};
      if (market === "flipkart") {
        const container = document.querySelector(s.specs.container);
        if (container) {
          specs = {
            html: container.innerHTML,
            text: (container as HTMLElement).innerText.trim(),
          };
        }
      } else {
        document.querySelectorAll(s.specs.container).forEach((el) => {
          const key = el.querySelector(s.specs.key!)?.textContent?.trim();
          const value = el.querySelector(s.specs.value!)?.textContent?.trim();
          if (key && value) {
            (specs as Record<string, string>)[key] = value;
          }
        });
      }
      extractedData.specifications = specs;

      // Feature bullets
      extractedData.featureBullets = [];
      if (s.detailBullets) {
        extractedData.featureBullets = Array.from(
          document.querySelectorAll(s.detailBullets)
        )
          .map((el) => el.textContent?.trim())
          .filter(Boolean);
      }

      console.log(extractedData);

      return extractedData;
    },
    JSON.parse(JSON.stringify(siteConfig)),
    marketplace
  );
}

/**
 * Main scraping function
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  let browser: Browser | null = null;

  try {
    console.log("Starting scrape for URL:", url);
    
    // Validate URL
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL provided");
    }

    // Determine marketplace
    const marketplace = url.includes("flipkart.com") ? "flipkart" : "amazon";
    console.log("Marketplace:", marketplace);

    // Resolve shortened URLs
    const expandedUrl = await resolveFinalUrl(url);
    console.log("Expanded URL:", expandedUrl);

    // Get site configuration
    const siteConfig = getSiteConfig(expandedUrl);
    if (!siteConfig) {
      throw new Error("Unsupported website. Only Amazon and Flipkart are supported.");
    }

    // Launch browser
    console.log("Getting launch options...");
    const launchOptions = await getLaunchOptions();
    console.log("Launching browser with options:", { 
      executablePath: launchOptions.executablePath,
      headless: launchOptions.headless 
    });
    browser = await puppeteer.launch(launchOptions);
    console.log("Browser launched successfully");

    const page = await browser.newPage();

    // Set random user agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(userAgent);

    // Set timeout
    page.setDefaultTimeout(20000);

    // Set extra headers
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Ch-Ua": '"Google Chrome";v="120", "Chromium";v="120", "Not A Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    });

    // Enable request interception for performance
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      const reqUrl = req.url();

      if (
        BLOCKED_DOMAINS.some((domain) => reqUrl.includes(domain)) ||
        ["image", "stylesheet", "font", "media"].includes(resourceType)
      ) {
        req.abort().catch(() => {
          // Ignore abort errors - request may already be handled
        });
      } else {
        req.continue().catch(() => {
          // Ignore continue errors - request may already be handled
        });
      }
    });

    // Navigate to page
    await safeGoto(page, expandedUrl);

    // Wait for key elements based on marketplace
    if (marketplace === "amazon") {
      try {
        await page.waitForSelector("#add-to-cart-button, #buy-now-button, #availability", {
          timeout: 10000,
        });
      } catch {
        // Continue even if selector not found
      }
    } else {
      const firstSelector = siteConfig.selectors.title[0];
      if (firstSelector) {
        try {
          await page.waitForSelector(firstSelector, { timeout: 15000 });
        } catch {
          // Continue even if selector not found
        }
      }
    }

    // Check if blocked
    const blocked = await isPageBlocked(page);
    if (blocked) {
      console.warn("Page blocked, retrying with new user agent...");
      const newUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setUserAgent(newUserAgent);
      await safeGoto(page, expandedUrl);
    }

    // Expand reviews
    await expandReviews(page);

    // Small delay for content to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Extract data
    const data = await extractProductData(page, siteConfig, marketplace);

    // Validate required fields
    if (!data.title || typeof data.title !== "string") {
      throw new Error(
        "Failed to extract product title. The page may have changed or is blocked."
      );
    }

    return data as unknown as ScrapedData;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Scraping error:", error);
    
    // Re-throw with more context
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    // Always close browser
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }
  }
}
