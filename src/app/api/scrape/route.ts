import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const getLaunchOptions = async () => {
  if (process.env.VERCEL_ENV === "production") {
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "new",
    };
  } else {
    const localChromePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return {
      args: [],
      executablePath: localChromePath,
      headless: "new",
    };
  }
};

export async function POST(req: NextRequest) {
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
    const browser = await puppeteer.launch(options as any);

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.setRequestInterception(true);
    page.setDefaultTimeout(20000);

    page.on("request", (req) => {
      if (
        ["image", "stylesheet", "font", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

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
        reviewsMedleyText: ["#reviewsMedley"],
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
        featureBullets: ["#feature-bullets ul > li"],
        technicalDetails: ["#productDetails_techSpec_section_1 tr"],
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
        .slice(1, 5)
        .map((el) =>
          truncateWithEllipsis(
            el.textContent?.replace("Read more", "").trim() || "",
            maxLength
          )
        )
        .filter(Boolean);

      extractedData.topReviews = topReviews;

      // const specs: Record<string, string> = {};
      // document
      //   .querySelectorAll(
      //     "#productDetails_techSpec_section_1 tr, #detail-bullets_feature_div .a-list-item"
      //   )
      //   .forEach((el) => {
      //     const text = el.textContent?.trim();
      //     if (text && text.includes(":")) {
      //       const [key, ...valueParts] = text.split(":");
      //       specs[key.trim()] = valueParts.join(":").trim();
      //     } else {
      //       const key = el.querySelector("th")?.textContent?.trim();
      //       const value = el.querySelector("td")?.textContent?.trim();
      //       if (key && value) specs[key] = value;
      //     }
      //   });
      // extractedData.specifications = specs;

      return extractedData;
    });

    await browser.close();

    if (!data.title) {
      throw new Error("Could not extract product title.");
    }

    data.scrapedAt = new Date().toISOString();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Scraping error:", error);
    let errorMessage = "An unknown error occurred during scraping.";
    if (error.name === "TimeoutError") {
      errorMessage =
        "The request timed out. The website may be slow to respond or is blocking the request.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
