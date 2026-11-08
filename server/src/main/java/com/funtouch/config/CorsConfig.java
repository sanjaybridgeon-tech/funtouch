package com.funtouch.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.List;

/**
 * CORS configuration — allows any localhost/127.0.0.1 port (e.g. 5173, 5174, 5175)
 * and production origins to communicate with the FunTouch API and WebSocket.
 */
@Configuration
@EnableConfigurationProperties({LiveKitProperties.class, FunTouchCorsProperties.class})
public class CorsConfig {

    private final FunTouchCorsProperties corsProperties;

    public CorsConfig(FunTouchCorsProperties corsProperties) {
        this.corsProperties = corsProperties;
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> patterns = new ArrayList<>();
        // Allow any port on localhost / 127.0.0.1 for seamless dev experience
        patterns.add("http://localhost:*");
        patterns.add("http://127.0.0.1:*");
        patterns.add("https://*.funtouch.app");
        patterns.add("https://funtouch.app");
        patterns.add("https://*.vercel.app");
        patterns.add("https://*.netlify.app");
        patterns.add("https://*.onrender.com");

        if (corsProperties.allowedOrigins() != null) {
            patterns.addAll(corsProperties.allowedOrigins());
        }

        config.setAllowedOriginPatterns(patterns);
        config.setAllowedMethods(List.of("GET", "POST", "DELETE", "OPTIONS", "PUT", "PATCH"));
        config.setAllowedHeaders(List.of(
                "Content-Type",
                "Authorization",
                "X-Host-Token",
                "Accept",
                "Origin",
                "X-Requested-With"
        ));
        config.setExposedHeaders(List.of("X-Host-Token"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
