// import { NextRequest, NextResponse } from "next/server";
// import puppeteer from "puppeteer-core";
// import chromium from "@sparticuz/chromium";

// const getLaunchOptions = async () => {
//   if (process.env.VERCEL_ENV === "production") {
//     return {
//       args: chromium.args,
//       executablePath: await chromium.executablePath(),
//       headless: "new",
//     };
//   } else {
//     const localChromePath =
//       "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
//     return {
//       args: [],
//       executablePath: localChromePath,
//       headless: "new",
//     };
//   }
// };

// export async function POST(req: NextRequest) {
//   try {
//     const { url } = await req.json();
//     if (!url) {
//       return NextResponse.json({ error: "URL is required" }, { status: 400 });
//     }

//     if (!url.startsWith("https://www.amazon.in")) {
//       return NextResponse.json(
//         { error: "Only amazon.in links are supported." },
//         { status: 400 }
//       );
//     }
//     const options = await getLaunchOptions();
//     const browser = await puppeteer.launch(options as any);

//     const page = await browser.newPage();
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
//     );
//     await page.setRequestInterception(true);
//     page.setDefaultTimeout(20000);

//     page.on("request", (req) => {
//       if (
//         ["image", "stylesheet", "font", "media"].includes(req.resourceType())
//       ) {
//         req.abort();
//       } else {
//         req.continue();
//       }
//     });

//     await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

//     await page.evaluate(() => {
//       const readMoreLinks = document.querySelectorAll(
//         '[data-hook="review-expand-link"]'
//       );
//       readMoreLinks.forEach((link) => (link as HTMLElement).click());
//     });
//     await new Promise((resolve) => setTimeout(resolve, 200));

//     const data = await page.evaluate(() => {
//       const getText = (s: string) =>
//         document.querySelector(s)?.textContent?.trim() || null;
//       const getAttr = (s: string, attr: string) =>
//         document.querySelector(s)?.getAttribute(attr)?.trim() || null;

//       const selectors = {
//         title: ["span#productTitle"],
//         rating: ["#acrPopover a > span", "#acrPopover"],
//         totalReviews: ["#acrCustomerReviewText"],
//         imageUrl: ["img#landingImage", 'meta[property="og:image"]'],
//         fullDescription: ["#productDescription", "#feature-bullets > ul"],
//         category: ["#wayfinding-breadcrumbs_feature_div ul > li:first-child a"],
//         subcategory: [
//           "#wayfinding-breadcrumbs_feature_div ul > li:last-child a",
//         ],
//         availability: ["#availability span"],
//         deliveryTime: [
//           "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
//           "[data-cy=delivery-recipe]",
//         ],
//         serviceInfoText: [
//           "#icon-farm-container",
//           "#product-support-information",
//         ],
//         reviewsMedleyText: ["#reviewsMedley"],
//         priceBlockText: [
//           "span#corePrice_feature_div .a-offscreen",
//           "span.priceToPay",
//           ".a-price > .a-offscreen",
//           ".a-price-whole",
//           ".a-price-fraction",
//         ],
//         discount: [
//           "span.basisPrice .a-offscreen",
//           ".priceBlockStrikePriceString",
//           ".aok-inline-block > .a-price > .a-offscreen",
//         ],
//         featureBullets: ["#feature-bullets ul > li"],
//         technicalDetails: ["#productDetails_techSpec_section_1 tr"],
//         brand: ["#bylineInfo"],
//       };

//       const extractedData: Record<string, unknown> = {};

//       for (const [key, potentialSelectors] of Object.entries(selectors)) {
//         for (const selector of potentialSelectors) {
//           let result = null;
//           if (key === "imageUrl") {
//             result = getAttr(selector, "src") || getAttr(selector, "content");
//           } else {
//             result = getText(selector);
//           }
//           if (result) {
//             extractedData[key] = result;
//             break;
//           }
//         }
//       }

//       const maxLength = 600;

//       function truncateWithEllipsis(text: string, maxLen: number) {
//         if (text.length <= maxLen) return text;
//         return text.slice(0, maxLen).trimEnd() + "...";
//       }

//       const topReviews = Array.from(
//         document.querySelectorAll('[data-hook="review-body"]')
//       )
//         .slice(1, 5)
//         .map((el) =>
//           truncateWithEllipsis(
//             el.textContent?.replace("Read more", "").trim() || "",
//             maxLength
//           )
//         )
//         .filter(Boolean);

//       extractedData.topReviews = topReviews;

//       // const specs: Record<string, string> = {};
//       // document
//       //   .querySelectorAll(
//       //     "#productDetails_techSpec_section_1 tr, #detail-bullets_feature_div .a-list-item"
//       //   )
//       //   .forEach((el) => {
//       //     const text = el.textContent?.trim();
//       //     if (text && text.includes(":")) {
//       //       const [key, ...valueParts] = text.split(":");
//       //       specs[key.trim()] = valueParts.join(":").trim();
//       //     } else {
//       //       const key = el.querySelector("th")?.textContent?.trim();
//       //       const value = el.querySelector("td")?.textContent?.trim();
//       //       if (key && value) specs[key] = value;
//       //     }
//       //   });
//       // extractedData.specifications = specs;

//       return extractedData;
//     });

//     await browser.close();

//     if (!data.title) {
//       throw new Error("Could not extract product title.");
//     }

//     data.scrapedAt = new Date().toISOString();

//     return NextResponse.json(data);
//   } catch (error: any) {
//     console.error("Scraping error:", error);
//     let errorMessage = "An unknown error occurred during scraping.";
//     if (error.name === "TimeoutError") {
//       errorMessage =
//         "The request timed out. The website may be slow to respond or is blocking the request.";
//     } else if (error.message) {
//       errorMessage = error.message;
//     }
//     return NextResponse.json({ error: errorMessage }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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
        "--single-process", // Important for Vercel
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

export async function POST(req: NextRequest) {
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

    // Enhanced headers to appear more like a real browser
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

    // Increase timeout for Vercel
    page.setDefaultTimeout(30000);

    page.on("request", (req) => {
      if (
        ["image", "stylesheet", "font", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log("Navigating to:", url);

    // Navigate with longer timeout and different wait strategy
    await page.goto(url, {
      waitUntil: "domcontentloaded", // Changed from networkidle2
      timeout: 30000,
    });

    // Add delay to let page load completely
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if we got blocked by Amazon
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
      console.log("Request was blocked by Amazon");
      return NextResponse.json(
        { error: "Request blocked by Amazon. Try again later." },
        { status: 429 }
      );
    }

    // Expand reviews
    await page.evaluate(() => {
      const readMoreLinks = document.querySelectorAll(
        '[data-hook="review-expand-link"]'
      );
      readMoreLinks.forEach((link) => (link as HTMLElement).click());
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const data = await page.evaluate(() => {
      const getText = (s: string) =>
        document.querySelector(s)?.textContent?.trim() || null;
      const getAttr = (s: string, attr: string) =>
        document.querySelector(s)?.getAttribute(attr)?.trim() || null;

      // More comprehensive selectors
      const selectors = {
        title: [
          "span#productTitle",
          "h1#title span",
          ".product-title",
          "[data-automation-id='product-title']",
        ],
        rating: [
          "#acrPopover a > span",
          "#acrPopover",
          ".a-icon-alt",
          "[data-hook='rating-out-of-text']",
        ],
        totalReviews: [
          "#acrCustomerReviewText",
          "[data-hook='total-review-count']",
          ".a-link-normal span",
        ],
        imageUrl: [
          "img#landingImage",
          'meta[property="og:image"]',
          ".a-dynamic-image",
          "#main-image",
        ],
        fullDescription: [
          "#productDescription",
          "#feature-bullets > ul",
          ".a-unordered-list.a-nostyle.a-vertical.a-spacing-none.detail-bullet-list",
          "#aplus",
        ],
        category: [
          "#wayfinding-breadcrumbs_feature_div ul > li:first-child a",
          ".a-breadcrumb li:first-child a",
        ],
        subcategory: [
          "#wayfinding-breadcrumbs_feature_div ul > li:last-child a",
          ".a-breadcrumb li:last-child a",
        ],
        availability: [
          "#availability span",
          "#availability .a-color-success",
          "#availability .a-color-state",
        ],
        deliveryTime: [
          "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
          "[data-cy=delivery-recipe]",
          ".a-text-bold",
        ],
        priceBlockText: [
          "span#corePrice_feature_div .a-offscreen",
          "span.priceToPay",
          ".a-price > .a-offscreen",
          ".a-price-whole",
          ".a-price-fraction",
          ".a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen",
        ],
        discount: [
          "span.basisPrice .a-offscreen",
          ".priceBlockStrikePriceString",
          ".aok-inline-block > .a-price > .a-offscreen",
        ],
        brand: ["#bylineInfo", ".a-row .a-size-small span", "a#bylineInfo"],
      };

      const extractedData: Record<string, unknown> = {};

      for (const [key, potentialSelectors] of Object.entries(selectors)) {
        for (const selector of potentialSelectors) {
          let result = null;
          try {
            if (key === "imageUrl") {
              result =
                getAttr(selector, "src") ||
                getAttr(selector, "data-src") ||
                getAttr(selector, "content");
            } else {
              result = getText(selector);
            }
            if (result) {
              extractedData[key] = result;
              break;
            }
          } catch (e) {
            // Continue trying other selectors
            continue;
          }
        }
      }

      // Enhanced review extraction
      const maxLength = 600;
      function truncateWithEllipsis(text: string, maxLen: number) {
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen).trimEnd() + "...";
      }

      const reviewSelectors = [
        '[data-hook="review-body"]',
        ".review-text",
        ".cr-original-review-text",
      ];

      let topReviews: string[] = [];
      for (const selector of reviewSelectors) {
        const reviews = Array.from(document.querySelectorAll(selector))
          .slice(1, 5) // Get first 5 reviews
          .map((el) =>
            truncateWithEllipsis(
              el.textContent?.replace("Read more", "").trim() || "",
              maxLength
            )
          )
          .filter(Boolean);

        if (reviews.length > 0) {
          topReviews = reviews;
          break;
        }
      }

      extractedData.topReviews = topReviews;

      return extractedData;
    });

    await browser.close();

    // Debug logging
    console.log("Extracted data:", {
      title: data.title ? "Found" : "Not found",
      rating: data.rating ? "Found" : "Not found",
      price: data.priceBlockText ? "Found" : "Not found",
    });

    if (!data.title) {
      // Try to get page content for debugging
      const pageTitle = await page.title().catch(() => "Unknown");
      console.log("Page title:", pageTitle);

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
