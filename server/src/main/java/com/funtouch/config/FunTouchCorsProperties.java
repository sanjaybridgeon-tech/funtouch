package com.funtouch.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Binds {@code funtouch.cors.*} properties from application.yml.
 */
@ConfigurationProperties(prefix = "funtouch.cors")
public record FunTouchCorsProperties(
        List<String> allowedOrigins
) {}

