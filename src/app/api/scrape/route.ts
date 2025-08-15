import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
});

const getLaunchOptions = async () => {
  if (process.env.VERCEL_ENV === "production") {
    return {
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
      executablePath: await chromium.executablePath(),
      headless: "new",
      defaultViewport: { width: 1280, height: 720 },
    };
  } else {
    const localChromePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return {
      args: [],
      executablePath: localChromePath,
      headless: "new",
      defaultViewport: { width: 1280, height: 720 },
    };
  }
};

const blockedDomains = [
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "facebook.com",
  "doubleclick.net",
  "amazon-adsystem.com",
  "adservice.google.com",
];

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  console.log(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let browser;

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!url.startsWith("https://www.amazon.in")) {
      return NextResponse.json(
        { error: "Only amazon.in links are supported." },
        { status: 400 }
      );
    }

    const options = await getLaunchOptions();
    browser = await puppeteer.launch(options as any);

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    });

    await page.setRequestInterception(true);

    page.setDefaultTimeout(30000);

    page.on("request", (req) => {
      if (
        blockedDomains.some((domain) => url.includes(domain)) ||
        ["image", "stylesheet", "font", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForSelector("span#productTitle", { timeout: 30000 });

    const isBlocked = await page.evaluate(() => {
      const blockedTexts = [
        "To discuss automated access to Amazon data please contact",
        "Sorry, we just need to make sure you're not a robot",
        "Enter the characters you see below",
      ];
      const pageText = document.body.textContent || "";
      return blockedTexts.some((text) => pageText.includes(text));
    });

    if (isBlocked) {
      return NextResponse.json(
        { error: "Request blocked by Amazon. Try again later." },
        { status: 429 }
      );
    }

    await page.evaluate(() => {
      const readMoreLinks = document.querySelectorAll(
        '[data-hook="review-expand-link"]'
      );
      readMoreLinks.forEach((link) => (link as HTMLElement).click());
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const data = await page.evaluate(() => {
      const getText = (s: string) =>
        document.querySelector(s)?.textContent?.trim() || null;
      const getAttr = (s: string, attr: string) =>
        document.querySelector(s)?.getAttribute(attr)?.trim() || null;

      const selectors = {
        title: ["span#productTitle"],
        rating: ["#acrPopover a > span", "#acrPopover"],
        totalReviews: ["#acrCustomerReviewText"],
        imageUrl: ["img#landingImage", 'meta[property="og:image"]'],
        fullDescription: ["#productDescription", "#feature-bullets > ul"],
        category: ["#wayfinding-breadcrumbs_feature_div ul > li:first-child a"],
        subcategory: [
          "#wayfinding-breadcrumbs_feature_div ul > li:last-child a",
        ],
        availability: ["#availability span"],
        deliveryTime: [
          "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
          "[data-cy=delivery-recipe]",
        ],
        serviceInfoText: [
          "#icon-farm-container",
          "#product-support-information",
        ],
        priceBlockText: [
          "span#corePrice_feature_div .a-offscreen",
          "span.priceToPay",
          ".a-price > .a-offscreen",
          ".a-price-whole",
          ".a-price-fraction",
        ],
        discount: [
          "span.basisPrice .a-offscreen",
          ".priceBlockStrikePriceString",
          ".aok-inline-block > .a-price > .a-offscreen",
        ],
        reviewsMedleyText: ["#reviewsMedley #histogramTable"],
        brand: ["#bylineInfo"],
      };

      const extractedData: Record<string, unknown> = {};

      for (const [key, potentialSelectors] of Object.entries(selectors)) {
        for (const selector of potentialSelectors) {
          let result = null;
          if (key === "imageUrl") {
            result = getAttr(selector, "src") || getAttr(selector, "content");
          } else {
            result = getText(selector);
          }
          if (result) {
            extractedData[key] = result;
            break;
          }
        }
      }

      const maxLength = 600;

      function truncateWithEllipsis(text: string, maxLen: number) {
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen).trimEnd() + "...";
      }

      const topReviews = Array.from(
        document.querySelectorAll('[data-hook="review-body"]')
      )
        .slice(1, 6)
        .map((el) =>
          truncateWithEllipsis(
            el.textContent?.replace("Read more", "").trim() || "",
            maxLength
          )
        )
        .filter(Boolean);

      extractedData.topReviews = topReviews;

      const specs: Record<string, string> = {};
      document
        .querySelectorAll(
          "#productDetails_techSpec_section_1 tr, #detail-bullets_feature_div .a-list-item, #detailBullets_feature_div .a-list-item"
        )
        .forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.includes(":")) {
            const [key, ...valueParts] = text.split(":");
            specs[key.trim()] = valueParts.join(":").trim();
          } else {
            const key = el.querySelector("th")?.textContent?.trim();
            const value = el.querySelector("td")?.textContent?.trim();
            if (key && value) specs[key] = value;
          }
        });
      extractedData.specifications = specs;

      return extractedData;
    });

    await browser.close();

    if (!data.title) {
      const pageTitle = await page.title().catch(() => "Unknown");

      throw new Error(
        `Could not extract product title. Page title: ${pageTitle}`
      );
    }

    data.scrapedAt = new Date().toISOString();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Scraping error:", error);

    if (browser) {
      await browser.close().catch(() => {});
    }

    let errorMessage = "An unknown error occurred during scraping.";
    if (error.name === "TimeoutError") {
      errorMessage =
        "The request timed out. Amazon may be slow to respond or blocking requests.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
