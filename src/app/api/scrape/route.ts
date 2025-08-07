import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        ["image", "stylesheet", "font", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const data = await page.evaluate(() => {
      const getText = (s: string) =>
        document.querySelector(s)?.textContent?.trim() || null;
      const getAttr = (s: string, attr: string) =>
        document.querySelector(s)?.getAttribute(attr)?.trim() || null;

      const selectors = {
        title: ["#productTitle", "h1"],
        price: [
          ".a-price .a-offscreen",
          ".price",
          ".a-price-whole",
          'span[data-csa-c-content-id="price"]',
        ],
        discount: [".basisPrice .a-offscreen", ".discount-price"],
        rating: ["#acrPopover .a-size-base.a-color-base", ".rating-value"],
        totalReviews: ["#acrCustomerReviewText", ".total-reviews"],
        category: [
          "#wayfinding-breadcrumbs_feature_div ul > li:first-child a",
          ".breadcrumb li:first-child a",
        ],
        subcategory: [
          "#wayfinding-breadcrumbs_feature_div ul > li:last-child a",
          ".breadcrumb li:last-child a",
        ],
        availability: ["#availability span", ".stock-status"],
        deliveryTime: [
          "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
          ".delivery-date",
        ],
        returnPolicy: [
          "#returns-policy",
          '[data-csa-c-content-id="returns"]',
          'a[href*="return"]',
          "#RETURNS_POLICY span .a-text-normal",
        ],
        warranty: [
          "#warranty_feature_div",
          'a[href*="warranty"]',
          "#WARRANTY .a-text-normal",
        ],
        shippingCost: [
          "#shipping-message .a-color-secondary",
          ".shipping-cost",
        ],
        imageUrl: [
          "#landingImage",
          "#main-image-container img",
          'meta[property="og:image"]',
        ],
        fullDescription: ["#feature-bullets", "#productDescription"],
      };

      const extractedData: Record<string, any> = {};

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

      // Extract specifications from tables or lists
      const specs: Record<string, string> = {};
      document
        .querySelectorAll(
          "#productDetails_techSpec_section_1 tr, #detail-bullets_feature_div .a-list-item"
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
      throw new Error(
        "Could not extract product title. The page might not be a valid product page."
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred during scraping." },
      { status: 500 }
    );
  }
}
