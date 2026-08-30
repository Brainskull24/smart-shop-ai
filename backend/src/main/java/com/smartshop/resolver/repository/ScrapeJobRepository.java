package com.smartshop.resolver.repository;

import com.smartshop.resolver.entity.ScrapeJob;
import com.smartshop.resolver.entity.ScrapeJob.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScrapeJobRepository extends JpaRepository<ScrapeJob, Long> {

    /**
     * Find the most recent job for an ASIN regardless of status.
     */
    Optional<ScrapeJob> findTopByAsinOrderByCreatedAtDesc(String asin);

    /**
     * Find any active (PENDING or PROCESSING) job for an ASIN.
     * Used to prevent duplicate job creation.
     */
    @Query("SELECT j FROM ScrapeJob j WHERE j.asin = :asin AND j.status IN :statuses")
    Optional<ScrapeJob> findActiveJobByAsin(
            @Param("asin") String asin,
            @Param("statuses") List<Status> statuses
    );

    /**
     * Claim one PENDING job using pessimistic locking.
     * SKIP LOCKED ensures multiple workers don't pick the same job.
     * Native query required because JPQL does not support SKIP LOCKED.
     */
    @Query(value = """
            SELECT * FROM scrape_jobs
            WHERE status = 'PENDING'
            ORDER BY created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<ScrapeJob> claimNextPendingJob();
}
