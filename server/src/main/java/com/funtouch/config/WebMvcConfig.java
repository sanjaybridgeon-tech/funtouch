package com.funtouch.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the HostAuthInterceptor on host-only endpoints.
 *
 * <p>Protected paths require a valid {@code X-Host-Token} header.
 * Public paths (create room, join request, GET room info) are excluded.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final HostAuthInterceptor hostAuthInterceptor;

    public WebMvcConfig(HostAuthInterceptor hostAuthInterceptor) {
        this.hostAuthInterceptor = hostAuthInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(hostAuthInterceptor)
                .addPathPatterns(
                        "/api/rooms/*/approve",
                        "/api/rooms/*/reject",
                        "/api/rooms/*/control",
                        "/api/rooms/*"          // catches DELETE — POST /join is excluded below
                )
                .excludePathPatterns(
                        "/api/rooms",           // POST create room (public)
                        "/api/rooms/*/join"     // POST join request (public)
                );
    }
}

