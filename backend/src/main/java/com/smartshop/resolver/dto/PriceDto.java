package com.smartshop.resolver.dto;

import java.math.BigDecimal;

public record PriceDto(BigDecimal amount, String currency) {}
