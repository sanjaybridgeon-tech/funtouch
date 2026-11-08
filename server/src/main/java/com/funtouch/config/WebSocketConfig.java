package com.funtouch.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configures STOMP WebSocket messaging for real-time room events.
 *
 * <p>Clients connect to {@code /ws} and subscribe to {@code /topic/room/{roomId}}
 * to receive live notifications (guest joined, approved, control granted, etc.).
 *
 * <p>SockJS is enabled as a fallback for browsers that don't support WebSocket.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // refined by CorsFilter
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Simple in-memory broker; prefixed destinations are for server-to-client pushes
        registry.enableSimpleBroker("/topic");
        // Client-to-server messages use /app prefix (not needed for FunTouch MVP)
        registry.setApplicationDestinationPrefixes("/app");
    }
}

