package com.smartshop.resolver.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed access to app.* properties from application.properties.
 */
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Product product = new Product();
    private final Amazon amazon = new Amazon();
    private final Scrape scrape = new Scrape();

    public Product getProduct() { return product; }
    public Amazon getAmazon()   { return amazon; }
    public Scrape getScrape()   { return scrape; }

    public static class Product {
        /** Hours before a cached product is considered stale. Default 6. */
        private int cacheTtlHours = 6;
        public int getCacheTtlHours() { return cacheTtlHours; }
        public void setCacheTtlHours(int h) { this.cacheTtlHours = h; }
    }

    public static class Amazon {
        /** Allowed Amazon marketplace domain for V1 (SSRF guard). */
        private String allowedDomain = "amazon.in";
        public String getAllowedDomain() { return allowedDomain; }
        public void setAllowedDomain(String d) { this.allowedDomain = d; }
    }

    public static class Scrape {
        /** Maximum worker retry attempts per job. */
        private int maxRetries = 3;
        public int getMaxRetries() { return maxRetries; }
        public void setMaxRetries(int r) { this.maxRetries = r; }
    }
}
