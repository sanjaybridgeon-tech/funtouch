package com.funtouch.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code livekit.*} properties from application.yml.
 *
 * <p>Values are injected from environment variables via the placeholder syntax
 * in application.yml — the actual keys/secrets are never hardcoded.
 */
@ConfigurationProperties(prefix = "livekit")
public record LiveKitProperties(
        String apiKey,
        String apiSecret,
        String url
) {}

