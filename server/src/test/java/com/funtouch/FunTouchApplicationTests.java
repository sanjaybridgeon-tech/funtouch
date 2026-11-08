package com.funtouch;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "livekit.api-key=test-key",
    "livekit.api-secret=test-secret-that-is-long-enough",
    "livekit.url=wss://test.livekit.cloud"
})
class FunTouchApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring application context starts up successfully
    }
}

