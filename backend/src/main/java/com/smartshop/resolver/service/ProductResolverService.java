package com.smartshop.resolver.service;

import com.smartshop.resolver.config.AppProperties;
import com.smartshop.resolver.dto.ProductDto;
import com.smartshop.resolver.dto.ResolveResponse;
import com.smartshop.resolver.entity.Product;
import com.smartshop.resolver.entity.ScrapeJob;
import com.smartshop.resolver.entity.ScrapeJob.Status;
import com.smartshop.resolver.repository.ProductRepository;
import com.smartshop.resolver.repository.ScrapeJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Core resolve logic:
 *
 *   1. Extract ASIN from URL
 *   2. Look up product — return immediately if fresh
 *   3. Check for an existing active scrape job
 *   4. Create a new PENDING job if none exists
 *   5. Return PROCESSING status
 */
@Service
public class ProductResolverService {

    private static final Logger log = LoggerFactory.getLogger(ProductResolverService.class);

    private final ProductRepository productRepo;
        private final ScrapeJobRepository jobRepo;
    private final AsinService asinService;
    private final AppProperties props;

    public ProductResolverService(
            ProductRepository productRepo,
            ScrapeJobRepository jobRepo,
            AsinService asinService,
            AppProperties props
    ) {
        this.productRepo = productRepo;
        this.jobRepo     = jobRepo;
        this.asinService = asinService;
        this.props       = props;
    }

    // -----------------------------------------------------------------------
    // POST /api/products/resolve
    // -----------------------------------------------------------------------

    /**
     * Resolve an Amazon product URL.
     *
     * @return ResolveResponse with status READY (200) or PROCESSING (202)
     * @throws IllegalArgumentException for invalid URL / ASIN
     */
    @Transactional
    public ResolveResponse resolve(String amazonUrl) {
        // 1. Validate URL domain (SSRF protection)
        if (!asinService.isAllowedUrl(amazonUrl)) {
            throw new IllegalArgumentException(
                    "Invalid URL. Only amazon.in product URLs are supported."
            );
        }

        // 2. Extract and validate ASIN
        String asin = asinService.extractAsin(amazonUrl);
        if (asin == null || !asinService.isValidAsin(asin)) {
            throw new IllegalArgumentException(
                    "Could not extract a valid ASIN from the URL: " + amazonUrl
            );
        }
        log.info("Resolving ASIN: {}", asin);

        // 3. Check for fresh cached product
        Instant freshThreshold = Instant.now()
                .minus(props.getProduct().getCacheTtlHours(), ChronoUnit.HOURS);
        Optional<Product> freshProduct = productRepo.findFreshByAsin(asin, freshThreshold);
        if (freshProduct.isPresent()) {
            log.info("Cache hit for ASIN: {}", asin);
            return ResolveResponse.ready(ProductDto.from(freshProduct.get()));
        }

        // 4. Check for an already-active job (deduplication)
        Optional<ScrapeJob> existingJob = jobRepo.findActiveJobByAsin(
                asin, List.of(Status.PENDING, Status.PROCESSING)
        );
        if (existingJob.isPresent()) {
            log.info("Active job already exists for ASIN: {} (id={})", asin, existingJob.get().getId());
            return ResolveResponse.processing(asin);
        }

        // 5. Create a new PENDING job
        ScrapeJob job = ScrapeJob.builder()
                .asin(asin)
                .status(Status.PENDING)
                .build();
        jobRepo.save(job);
        log.info("Created scrape job id={} for ASIN: {}", job.getId(), asin);

        return ResolveResponse.processing(asin);
    }

    // -----------------------------------------------------------------------
    // GET /api/products/{asin}
    // -----------------------------------------------------------------------

    /**
     * Poll for a product by ASIN.
     * Returns READY, PROCESSING, or FAILED depending on current state.
     */
    @Transactional(readOnly = true)
    public ResolveResponse poll(String asin) {
        if (!asinService.isValidAsin(asin)) {
            throw new IllegalArgumentException("Invalid ASIN: " + asin);
        }

        // Check if there is a completed product (any age — polling doesn't enforce TTL)
        Optional<Product> product = productRepo.findById(asin);
        if (product.isPresent()) {
            log.debug("Poll READY for ASIN: {}", asin);
            return ResolveResponse.ready(ProductDto.from(product.get()));
        }

        // Check latest job status
        Optional<ScrapeJob> latestJob = jobRepo.findTopByAsinOrderByCreatedAtDesc(asin);
        if (latestJob.isEmpty()) {
            // No product and no job — caller should POST /resolve first
            throw new IllegalArgumentException(
                    "No product or scrape job found for ASIN: " + asin
                    + ". Submit a resolve request first."
            );
        }

        ScrapeJob job = latestJob.get();
        return switch (job.getStatus()) {
            case PENDING, PROCESSING -> ResolveResponse.processing(asin);
            case FAILED              -> ResolveResponse.failed(asin);
            case SUCCESS             -> {
                // Job succeeded but product not found — data inconsistency, treat as failed
                log.warn("Job {} SUCCESS but product not found for ASIN: {}", job.getId(), asin);
                yield ResolveResponse.failed(asin);
            }
        };
    }
}
