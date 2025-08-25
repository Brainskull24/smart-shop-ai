export interface SiteConfig {
  selectors: {
    title: string[];
    priceBlockText: string[];
    discount: string[];
    imageUrl: string[];
    rating: string[];
    totalRatings: string[];
    totalReviews: string[] | string;
    category?: string[];
    subcategory?: string[];
    deliveryTime?: string[];
    serviceInfoText?: string[];
    availability: string[];
    brand: string[];
    fullDescription: string[];
    reviewsMedleyText?: string[];
    detailBullets?: string;
    topReviews: {
      reviewContainer: string;
      reviewText: string;
    };
    specs: {
      container: string;
      key?: string;
      value?: string;
    };
  };
}

export const scraperConfig: Record<string, SiteConfig> = {
  amazon: {
    selectors: {
      title: ["span#productTitle"],
      rating: ["#acrPopover a > span", "#acrPopover"],
      totalRatings: ["#acrCustomerReviewText"],
      totalReviews: '[data-hook = "cr-filter-info-review-rating-count"]',
      imageUrl: ["img#landingImage", 'meta[property="og:image"]'],
      fullDescription: ["#productDescription", "#feature-bullets > ul"],
      category: ["#wayfinding-breadcrumbs_feature_div ul > li:first-child a"],
      subcategory: ["#wayfinding-breadcrumbs_feature_div ul > li:last-child a"],
      availability: ["#availability span"],
      deliveryTime: [
        "#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE .a-text-bold",
        "[data-cy=delivery-recipe]",
      ],
      serviceInfoText: ["#icon-farm-container", "#product-support-information"],
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
      detailBullets: "#detailBullets_feature_div ul li",
      topReviews: {
        reviewContainer: '[data-hook="review"]',
        reviewText: '[data-hook="review-body"]',
      },
      specs: {
        container: "#productDetails_techSpec_section_1 tr",
        key: "th",
        value: "td",
      },
    },
  },

  flipkart: {
    selectors: {
      title: [".VU-ZEz"],
      rating: [".XQDdHH"],
      totalRatings: [".Wphh3N > span > span:nth-of-type(1)", ".Wphh3N > span"],
      totalReviews: [".Wphh3N > span > span:nth-of-type(3)"],
      imageUrl: [".DByuf4.IZexXJ.jLEJ7H"],
      fullDescription: [
        ".cPHDOP.pqHCzB",
        ".xFVion",
        "div.DojaWF.gdgoEp > div.cPHDOP.col-12-12:nth-of-type(3)",
      ],
      availability: [".nyRpc8"],
      serviceInfoText: [".jHlbt-", ".cvCpHS"],
      reviewsMedleyText: ["._8-rIO3", ".HO1dRb"],
      category: ["._7dPnhA > div:nth-of-type(2) > a"],
      subcategory: ["._7dPnhA > div:nth-of-type(3) > a"],
      deliveryTime: [".Y8v7Fl", ".yiggsN"],
      priceBlockText: [".Nx9bqj.CxhGGd"],
      discount: [".yRaY8j"],
      brand: ["._7dPnhA > div:nth-of-type(4) > a"],
      topReviews: {
        reviewContainer: ".col.EPCmJX",
        reviewText: ".ZmyHeo",
      },
      specs: {
        container:
          "#container > div > div._39kFie.N3De93.JxFEK3._48O0EI > div.DOjaWF.YJG4Cf > div.DOjaWF.gdgoEp.col-8-12 > div.DOjaWF.gdgoEp",
      },
    },
  },
};

export const getSiteConfig = (url: string): SiteConfig | null => {
  if (url.includes("amazon")) return scraperConfig.amazon;
  if (url.includes("flipkart")) return scraperConfig.flipkart;
  return null;
};
