package com.smartshop.resolver.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Normalized Amazon product record, keyed by ASIN.
 * Multi-value fields (images, features, specifications) are stored as JSONB.
 */
@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @Column(name = "asin", length = 10, nullable = false)
    private String asin;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "brand", length = 500)
    private String brand;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "currency", length = 3, nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "rating", precision = 3, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Column(name = "availability", length = 20, nullable = false)
    @Builder.Default
    private String availability = "UNKNOWN";

    @Column(name = "primary_image", columnDefinition = "TEXT")
    private String primaryImage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "images", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> images = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "features", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> features = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specifications", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> specifications = Map.of();

    @Column(name = "quality_score", nullable = false)
    @Builder.Default
    private Short qualityScore = 0;

    @Column(name = "source", length = 20, nullable = false)
    @Builder.Default
    private String source = "AMAZON_IN";

    @Column(name = "scraped_at")
    private Instant scrapedAt;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    @PrePersist
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
