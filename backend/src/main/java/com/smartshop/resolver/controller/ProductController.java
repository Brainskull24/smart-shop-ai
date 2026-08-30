package com.smartshop.resolver.controller;

import com.smartshop.resolver.dto.ResolveRequest;
import com.smartshop.resolver.dto.ResolveResponse;
import com.smartshop.resolver.service.ProductResolverService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for product resolution.
 *
 *   POST /api/products/resolve   — accept a URL, return READY or PROCESSING
 *   GET  /api/products/{asin}    — poll for result
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductResolverService resolverService;

    public ProductController(ProductResolverService resolverService) {
        this.resolverService = resolverService;
    }

    /**
     * Submit an Amazon product URL for resolution.
     *
     * 200 OK       — product already cached and fresh
     * 202 Accepted — scrape job created or already running
     * 400 Bad Request — invalid URL or ASIN
     */
    @PostMapping("/resolve")
    public ResponseEntity<ResolveResponse> resolve(@Valid @RequestBody ResolveRequest request) {
        log.info("POST /api/products/resolve url={}", request.amazonUrl());
        ResolveResponse response = resolverService.resolve(request.amazonUrl());

        HttpStatus status = "READY".equals(response.status())
                ? HttpStatus.OK
                : HttpStatus.ACCEPTED;

        return ResponseEntity.status(status).body(response);
    }

    /**
     * Poll the result for a previously submitted ASIN.
     *
     * 200 OK — returns READY (with product), PROCESSING, or FAILED
     * 400    — invalid ASIN or no job found
     */
    @GetMapping("/{asin}")
    public ResponseEntity<ResolveResponse> getProduct(@PathVariable String asin) {
        log.info("GET /api/products/{}", asin);
        ResolveResponse response = resolverService.poll(asin.toUpperCase());
        return ResponseEntity.ok(response);
    }
}
