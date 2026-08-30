package com.smartshop.resolver.dto;

import com.smartshop.resolver.entity.Product;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * The canonical V1 product response shape — matches the spec's example output.
 */
public record ProductDto(
        String asin,
        String title,
        String brand,
        PriceDto price,
        Double rating,
        Integer reviewCount,
        String availability,
        List<String> images,
        List<String> features,
        String description,
        Map<String, String> specifications,
        String source,
        Instant scrapedAt
) {
    /** Map a Product entity to its DTO. */
    public static ProductDto from(Product p) {
        return new ProductDto(
                p.getAsin(),
                p.getTitle(),
                p.getBrand(),
                new PriceDto(p.getPriceAmount(), p.getCurrency()),
                p.getRating() != null ? p.getRating().doubleValue() : null,
                p.getReviewCount(),
                p.getAvailability(),
                p.getImages(),
                p.getFeatures(),
                p.getDescription(),
                p.getSpecifications(),
                p.getSource(),
                p.getScrapedAt()
        );
    }
}
