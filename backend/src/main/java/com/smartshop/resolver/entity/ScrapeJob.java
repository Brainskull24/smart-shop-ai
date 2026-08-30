package com.smartshop.resolver.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A scrape job record that acts as the PostgreSQL-based work queue entry.
 *
 * Lifecycle:  PENDING → PROCESSING → SUCCESS
 *                                  → FAILED  (retryable → back to PENDING)
 */
@Entity
@Table(name = "scrape_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScrapeJob {

    public enum Status {
        PENDING, PROCESSING, SUCCESS, FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asin", length = 10, nullable = false)
    private String asin;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private Short attempts = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
