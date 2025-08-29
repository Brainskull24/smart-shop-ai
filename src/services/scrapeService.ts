import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { getSiteConfig, SiteConfig } from "@/lib/scraperConfig";
import fetch from "node-fetch";

async function resolveFinalUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch(shortUrl, {
      method: "GET",
      redirect: "follow",
    });
    return res.url;
  } catch (err) {
    console.error("Failed to resolve short URL:", err);
    return shortUrl;
  }
}

const getLaunchOptions = async () => {
  if (process.env.VERCEL_ENV === "production") {
    return {
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
      executablePath: await chromium.executablePath(),
      headless: "new",
      defaultViewport: { width: 1280, height: 720 },
      timeout: 8000,
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

export async function scrapeUrl(url: string) {
  let browser;

  try {
    const marketplace = url.includes("flipkart.com") ? "flipkart" : "amazon";

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const expandedUrl = await resolveFinalUrl(url);

    const siteConfig = getSiteConfig(expandedUrl);

    if (!siteConfig) {
      return NextResponse.json(
        { error: "This website is not supported." },
        { status: 400 }
      );
    }

    const options = await getLaunchOptions();
    browser = await puppeteer.launch(options as any);

    const page = await browser.newPage();

    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    if (marketplace === "flipkart") {
      await page.setUserAgent(
        "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      );
    } else {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
    }

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
      ...(marketplace === "flipkart"
        ? { Referer: "https://www.google.com/" }
        : {}),
    });

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const reqUrl = req.url();
      const type = req.resourceType();

      if (
        blockedDomains.some((domain) => reqUrl.includes(domain)) ||
        ["image", "media", "font"].includes(type)
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(expandedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    if (marketplace === "amazon") {
      const selectors = [
        "#add-to-cart-button",
        "#buy-now-button",
        "#availability",
        "[data-hook='review-body']", // Reviews
        "#feature-bullets", // Feature bullets
      ];

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
        } catch (e) {
          console.log(`Selector ${selector} not found, continuing...`);
        }
      }
    } else {
      // Flipkart specific waiting
      const selectors = [
        ".VU-ZEz", // Title
        "._7dPnhA > div:nth-of-type(2) > a", // Category
      ];

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
        } catch (e) {
          console.log(`Selector ${selector} not found, continuing...`);
        }
      }
    }

    await page.evaluate(async () => {
      for (let i = 0; i < 6; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 400));
      }
    });

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
      throw new Error(
        "Request blocked by Amazon. Try again later or use a different link."
      );
    }

    await page.evaluate(() => {
      const allReadMoreLinks = document.querySelectorAll(
        '[data-hook="review-expand-link"], .QqFHMw._4FgsLt, .QqFHMw.ik7Tlh'
      );
      const firstSixLinks = Array.from(allReadMoreLinks).slice(0, 6);
      firstSixLinks.forEach((link) => (link as HTMLElement).click());
    });
    await new Promise((resolve) => setTimeout(resolve, 800));

    const data = await page.evaluate(
      (config: SiteConfig, marketplace: string) => {
        const s = config.selectors;

        const getText = (selectors: string[]) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element.textContent?.trim() || null;
          }
          return null;
        };

        const getAttr = (selectors: string[], attr: string) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element.getAttribute(attr)?.trim() || null;
          }
          return null;
        };

        const extractedData: Record<string, any> = {};
        extractedData.title = getText(s.title);
        extractedData.priceBlockText = getText(s.priceBlockText);
        extractedData.discount = getText(s.discount);
        extractedData.imageUrl =
          getAttr(s.imageUrl, "src") || getAttr(s.imageUrl, "content");
        extractedData.rating = getText(s.rating);
        extractedData.totalRatings = getText(
          Array.isArray(s.totalRatings) ? s.totalRatings : [s.totalRatings]
        );
        extractedData.totalReviews = getText(
          Array.isArray(s.totalReviews) ? s.totalReviews : [s.totalReviews]
        );
        extractedData.availability = getText(s.availability);
        extractedData.deliveryTime = s.deliveryTime
          ? getText(s.deliveryTime)
          : "Not specified";
        extractedData.reviewsMedleyText = s.reviewsMedleyText
          ? getText(s.reviewsMedleyText)
          : null;
        extractedData.serviceInfoText = s.serviceInfoText
          ? getText(s.serviceInfoText)
          : "Not specified";
        extractedData.category = s.category
          ? getText(s.category)
          : "Not specified";
        extractedData.subcategory = s.subcategory
          ? getText(s.subcategory)
          : "Not specified";
        extractedData.brand = getText(s.brand);
        extractedData.fullDescription = getText(s.fullDescription);

        const maxLength = 600;

        function truncateWithEllipsis(text: string, maxLen: number) {
          if (text.length <= maxLen) return text;
          return text.slice(0, maxLen).trimEnd() + "...";
        }

        let topReviews: string[] = [];
        if (s.topReviews?.reviewContainer && s.topReviews?.reviewText) {
          topReviews = Array.from(
            document.querySelectorAll(s.topReviews.reviewContainer)
          )
            .slice(0, 20)
            .map((el) => {
              const raw =
                el
                  .querySelector(s.topReviews.reviewText)
                  ?.textContent?.replace(/Read more|READ MORE/gi, "")
                  .trim() || "";
              return truncateWithEllipsis(raw, maxLength);
            })
            .filter((t) => Boolean(t));
        }
        extractedData.topReviews = topReviews;

        let specs: any = {};
        if (marketplace === "flipkart") {
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
              specs[key] = value;
            }
          });
        }
        extractedData.specifications = specs;

        extractedData.featureBullets = [];
        if (s.detailBullets) {
          extractedData.featureBullets = Array.from(
            document.querySelectorAll(s.detailBullets)
          )
            .map((el) => el.textContent?.trim())
            .filter(Boolean);
        }

        return extractedData;
      },
      JSON.parse(JSON.stringify(siteConfig)),
      marketplace
    );

    if (!data.title) {
      throw new Error(
        `Failed to scrape the product title. The page structure may have changed or the content is blocked.`
      );
    }
    return data;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
