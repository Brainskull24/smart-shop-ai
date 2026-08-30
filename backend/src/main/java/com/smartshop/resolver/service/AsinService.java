package com.smartshop.resolver.service;

import com.smartshop.resolver.config.AppProperties;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ASIN extraction and Amazon URL validation.
 *
 * Mirrors the logic in scraper/app/asin.py so both components agree
 * on what constitutes a valid Amazon.in URL and a valid ASIN.
 */
@Service
public class AsinService {

    // ASIN: exactly 10 chars, starts with B or is all digits
    private static final Pattern ASIN_PATTERN =
            Pattern.compile("\\b([B][0-9A-Z]{9}|[0-9]{10})\\b");

    // Patterns for common Amazon URL structures
    private static final List<Pattern> EXTRACTION_PATTERNS = List.of(
            Pattern.compile("/dp/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$|\\?)"),
            Pattern.compile("/gp/product/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$|\\?)"),
            Pattern.compile("/exec/obidos/ASIN/([B][0-9A-Z]{9}|[0-9]{10})(?:/|$)")
    );

    // IP literal pattern for SSRF guard
    private static final Pattern IP_PATTERN =
            Pattern.compile("^\\d{1,3}(\\.\\d{1,3}){3}$");

    // AWS metadata SSRF endpoint prefix
    private static final String LINK_LOCAL_PREFIX = "169.254";

    private final AppProperties props;

    public AsinService(AppProperties props) {
        this.props = props;
    }

    /**
     * Validate that the URL belongs to the permitted Amazon domain and is not
     * an SSRF vector (localhost, IP literals, link-local).
     */
    public boolean isAllowedUrl(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) return false;
            host = host.toLowerCase();

            // Block SSRF vectors
            if (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("0.0.0.0")) {
                return false;
            }
            if (IP_PATTERN.matcher(host).matches()) return false;
            if (host.startsWith(LINK_LOCAL_PREFIX)) return false;

            // Only allow configured Amazon domain (and www. prefix of it)
            String allowed = props.getAmazon().getAllowedDomain().toLowerCase();
            return host.equals(allowed) || host.equals("www." + allowed)
                    || host.equals("amzn.in") || host.equals("www.amzn.in");
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Extract the ASIN from an Amazon product URL.
     * Returns null if no valid ASIN is found.
     */
    public String extractAsin(String url) {
        if (url == null || url.isBlank()) return null;
        try {
            URI uri = URI.create(url);
            String path = uri.getPath();

            // Try structured patterns first (most reliable)
            for (Pattern p : EXTRACTION_PATTERNS) {
                Matcher m = p.matcher(path);
                if (m.find()) return m.group(1);
            }

            // Fallback: scan the path for any ASIN-shaped token
            Matcher m = ASIN_PATTERN.matcher(path);
            if (m.find()) return m.group(1);

        } catch (IllegalArgumentException ignored) {}
        return null;
    }

    /**
     * Return true if the string is a syntactically valid ASIN.
     */
    public boolean isValidAsin(String asin) {
        if (asin == null) return false;
        return asin.matches("[B][0-9A-Z]{9}|[0-9]{10}");
    }

    /**
     * Build the canonical amazon.in product URL from an ASIN.
     */
    public String canonicalUrl(String asin) {
        return "https://www." + props.getAmazon().getAllowedDomain() + "/dp/" + asin;
    }
}
