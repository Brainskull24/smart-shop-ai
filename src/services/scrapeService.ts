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
        "--disable-web-security", // Add this
        "--disable-features=VizDisplayCompositor", // Add this
        "--disable-blink-features=AutomationControlled", // Add this
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

    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    ];
    await page.setUserAgent(
      userAgents[Math.floor(Math.random() * userAgents.length)]
    );

    await page.setRequestInterception(true);
    page.setDefaultTimeout(30000);

    await page.setExtraHTTPHeaders({
      // Accept:
      //   "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      // "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      // "Accept-Encoding": "gzip, deflate, br",
      // DNT: "1",
      // Connection: "keep-alive",
      // "Upgrade-Insecure-Requests": "1",
      // "Sec-Fetch-Dest": "document",
      // "Sec-Fetch-Mode": "navigate",
      // "Sec-Fetch-Site": "none",
      // "Sec-Fetch-User": "?1",
      // "Cache-Control": "max-age=0",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Ch-Ua":
        '"Google Chrome";v="120", "Chromium";v="120", "Not A Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    });

    page.on("request", (req) => {
      if (
        blockedDomains.some((domain) => req.url().includes(domain)) ||
        ["image", "stylesheet", "font", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    async function safeGoto(page: any, url: any, retries = 2) {
      for (let i = 0; i <= retries; i++) {
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          return;
        } catch (err) {
          if (i === retries) throw err;
          await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
        }
      }
    }

    await safeGoto(page, expandedUrl);

    if (marketplace === "amazon") {
      await page.waitForSelector(
        "#add-to-cart-button, #buy-now-button, #availability",
        { timeout: 15000 }
      );
    } else {
      const firstSelector = siteConfig.selectors.title[0];
      if (firstSelector) {
        await page.waitForSelector(firstSelector, { timeout: 45000 });
      }
    }

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
      console.warn("Blocked once, retrying with new user agent...");
      await page.setUserAgent(
        userAgents[Math.floor(Math.random() * userAgents.length)]
      );
      await safeGoto(page, expandedUrl);
    }

    // await page.evaluate(() => {
    //   const allReadMoreLinks = document.querySelectorAll(
    //     '[data-hook="review-expand-link"], .QqFHMw._4FgsLt, .QqFHMw.ik7Tlh'
    //   );
    //   const firstSixLinks = Array.from(allReadMoreLinks).slice(0, 6);
    //   firstSixLinks.forEach((link) => (link as HTMLElement).click());
    // });

    await page.evaluate(() => {
      return new Promise((resolve) => {
        const expandReviews = () => {
          // Amazon selectors
          const amazonReadMore = document.querySelectorAll(
            '[data-hook="review-expand-link"]'
          );
          // Flipkart selectors
          const flipkartReadMore = document.querySelectorAll(
            ".QqFHMw._4FgsLt, .QqFHMw.ik7Tlh, ._1EPkAk"
          );

          const allLinks = [...amazonReadMore, ...flipkartReadMore];
          const firstSixLinks = Array.from(allLinks).slice(0, 6);

          firstSixLinks.forEach((link, index) => {
            setTimeout(() => {
              (link as HTMLElement).click();
            }, index * 100); // Stagger clicks
          });
        };

        expandReviews();
        setTimeout(resolve, 1000); // Wait for expansion
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

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

        const topReviews = Array.from(
          document.querySelectorAll(s.topReviews.reviewContainer)
        )
          .slice(0, 20)
          .map((el) =>
            truncateWithEllipsis(
              el
                .querySelector(s.topReviews.reviewText)
                ?.textContent?.replace("Read more", "")
                .replace("READ MORE", "")
                .trim() || "",
              maxLength
            )
          )
          .filter(Boolean);
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
