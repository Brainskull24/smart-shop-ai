package com.smartshop.resolver;

import com.smartshop.resolver.config.AppProperties;
import com.smartshop.resolver.service.AsinService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AsinServiceTest {

    private AsinService service;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        // default allowedDomain = amazon.in
        service = new AsinService(props);
    }

    // --- extractAsin ---

    @Test
    void extractAsin_standardDpUrl() {
        assertThat(service.extractAsin(
                "https://www.amazon.in/Some-Product/dp/B0GNSCKZTH/"))
                .isEqualTo("B0GNSCKZTH");
    }

    @Test
    void extractAsin_dpUrlNoSlug() {
        assertThat(service.extractAsin("https://www.amazon.in/dp/B0GNSCKZTH"))
                .isEqualTo("B0GNSCKZTH");
    }

    @Test
    void extractAsin_gpProductUrl() {
        assertThat(service.extractAsin(
                "https://www.amazon.in/gp/product/B0GNSCKZTH"))
                .isEqualTo("B0GNSCKZTH");
    }

    @Test
    void extractAsin_withTrackingParams() {
        assertThat(service.extractAsin(
                "https://www.amazon.in/dp/B0GNSCKZTH?pd_rd_w=abc&tag=xyz"))
                .isEqualTo("B0GNSCKZTH");
    }

    @Test
    void extractAsin_withRefSuffix() {
        assertThat(service.extractAsin(
                "https://www.amazon.in/Some-Product/dp/B09WN3SK23/ref=sr_1_1"))
                .isEqualTo("B09WN3SK23");
    }

    @Test
    void extractAsin_numericAsin() {
        assertThat(service.extractAsin("https://www.amazon.in/dp/8172234074"))
                .isEqualTo("8172234074");
    }

    @Test
    void extractAsin_noAsinReturnsNull() {
        assertThat(service.extractAsin("https://www.amazon.in/s?k=headphones")).isNull();
        assertThat(service.extractAsin("https://www.amazon.in/")).isNull();
    }

    @Test
    void extractAsin_nullReturnsNull() {
        assertThat(service.extractAsin(null)).isNull();
    }

    // --- isValidAsin ---

    @Test
    void isValidAsin_validBPrefix() {
        assertThat(service.isValidAsin("B0GNSCKZTH")).isTrue();
    }

    @Test
    void isValidAsin_validNumeric() {
        assertThat(service.isValidAsin("8172234074")).isTrue();
    }

    @Test
    void isValidAsin_tooShort() {
        assertThat(service.isValidAsin("B0GNS")).isFalse();
    }

    @Test
    void isValidAsin_lowercase() {
        assertThat(service.isValidAsin("b0gnsckzth")).isFalse();
    }

    @Test
    void isValidAsin_null() {
        assertThat(service.isValidAsin(null)).isFalse();
    }

    // --- isAllowedUrl ---

    @Test
    void isAllowedUrl_amazonIn() {
        assertThat(service.isAllowedUrl("https://www.amazon.in/dp/B0GNSCKZTH")).isTrue();
    }

    @Test
    void isAllowedUrl_amazonInNoWww() {
        assertThat(service.isAllowedUrl("https://amazon.in/dp/B0GNSCKZTH")).isTrue();
    }

    @Test
    void isAllowedUrl_amazonCom_rejected() {
        assertThat(service.isAllowedUrl("https://www.amazon.com/dp/B0GNSCKZTH")).isFalse();
    }

    @Test
    void isAllowedUrl_localhost_rejected() {
        assertThat(service.isAllowedUrl("http://localhost/admin")).isFalse();
    }

    @Test
    void isAllowedUrl_ipAddress_rejected() {
        assertThat(service.isAllowedUrl("http://127.0.0.1/")).isFalse();
    }

    @Test
    void isAllowedUrl_awsMetadata_rejected() {
        assertThat(service.isAllowedUrl("http://169.254.169.254/latest/meta-data")).isFalse();
    }

    @Test
    void isAllowedUrl_google_rejected() {
        assertThat(service.isAllowedUrl("https://www.google.com/")).isFalse();
    }
}
