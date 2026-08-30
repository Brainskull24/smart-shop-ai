package com.smartshop.resolver.repository;

import com.smartshop.resolver.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    /**
     * Find a product that was scraped after the given threshold (i.e., still fresh).
     */
    @Query("SELECT p FROM Product p WHERE p.asin = :asin AND p.scrapedAt >= :threshold")
    Optional<Product> findFreshByAsin(@Param("asin") String asin, @Param("threshold") Instant threshold);
}
