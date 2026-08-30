package com.smartshop.resolver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/products/resolve
 */
public record ResolveRequest(
        @NotBlank(message = "amazonUrl must not be blank")
        @Size(max = 2048, message = "amazonUrl must not exceed 2048 characters")
        String amazonUrl
) {}
