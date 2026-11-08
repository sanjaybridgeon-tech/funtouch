package com.funtouch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FunTouch — Interactive Video Calls
 *
 * The main entry point for the FunTouch Spring Boot backend.
 * Handles room management, LiveKit token generation, and
 * real-time WebSocket notifications for the host/guest flow.
 */
@SpringBootApplication
public class FunTouchApplication {

    public static void main(String[] args) {
        SpringApplication.run(FunTouchApplication.class, args);
    }
}

