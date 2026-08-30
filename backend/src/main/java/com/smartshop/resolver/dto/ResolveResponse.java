package com.smartshop.resolver.dto;

/**
 * Response for POST /api/products/resolve and GET /api/products/{asin}
 *
 * status = READY       → product is populated, HTTP 200
 * status = PROCESSING  → job queued or running, HTTP 202
 * status = FAILED      → all retries exhausted, HTTP 200 (body explains failure)
 */
public record ResolveResponse(
        String status,   // READY | PROCESSING | FAILED
        String asin,
        ProductDto product  // null when status != READY
) {
    public static ResolveResponse ready(ProductDto product) {
        return new ResolveResponse("READY", product.asin(), product);
    }

    public static ResolveResponse processing(String asin) {
        return new ResolveResponse("PROCESSING", asin, null);
    }

    public static ResolveResponse failed(String asin) {
        return new ResolveResponse("FAILED", asin, null);
    }
}
