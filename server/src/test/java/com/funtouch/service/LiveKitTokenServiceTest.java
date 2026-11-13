package com.funtouch.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.funtouch.config.LiveKitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LiveKitTokenService Unit Tests")
class LiveKitTokenServiceTest {

    private LiveKitTokenService tokenService;

    @BeforeEach
    void setUp() {
        LiveKitProperties props = new LiveKitProperties(
                "devkey",
                "secret_key_which_is_sufficiently_long_for_signing",
                "wss://test.livekit.cloud"
        );
        tokenService = new LiveKitTokenService(props);
    }

    @Test
    @DisplayName("generateHostToken produces valid JWT with publish and subscribe grants")
    void generateHostToken_createsValidToken() {
        String token = tokenService.generateHostToken("test-room", "host-alice");

        assertThat(token).isNotBlank();

        DecodedJWT jwt = JWT.decode(token);
        assertThat(jwt.getSubject()).isEqualTo("host-alice");
        assertThat(jwt.getIssuer()).isEqualTo("devkey");

        Map<String, Object> videoGrant = jwt.getClaim("video").asMap();
        assertThat(videoGrant).isNotNull();
        assertThat(videoGrant.get("room")).isEqualTo("test-room");
        assertThat(videoGrant.get("roomJoin")).isEqualTo(true);
        assertThat(videoGrant.get("canPublish")).isEqualTo(true);
        assertThat(videoGrant.get("canSubscribe")).isEqualTo(true);
        assertThat(videoGrant.get("canPublishData")).isEqualTo(true);
    }

    @Test
    @DisplayName("generateGuestToken produces token with canPublish and canSubscribe for 2-way call")
    void generateGuestToken_withoutControl() {
        String token = tokenService.generateGuestToken("test-room", "guest-bob", false);

        assertThat(token).isNotBlank();

        DecodedJWT jwt = JWT.decode(token);
        assertThat(jwt.getSubject()).isEqualTo("guest-bob");

        Map<String, Object> videoGrant = jwt.getClaim("video").asMap();
        assertThat(videoGrant).isNotNull();
        assertThat(videoGrant.get("room")).isEqualTo("test-room");
        assertThat(videoGrant.get("roomJoin")).isEqualTo(true);
        assertThat(videoGrant.get("canPublish")).isEqualTo(true);
        assertThat(videoGrant.get("canSubscribe")).isEqualTo(true);
        assertThat(videoGrant.get("canPublishData")).isEqualTo(true);
    }

    @Test
    @DisplayName("generateGuestToken with control produces token with canPublishData=true")
    void generateGuestToken_withControl() {
        String token = tokenService.generateGuestToken("test-room", "guest-bob", true);

        assertThat(token).isNotBlank();

        DecodedJWT jwt = JWT.decode(token);
        assertThat(jwt.getSubject()).isEqualTo("guest-bob");

        Map<String, Object> videoGrant = jwt.getClaim("video").asMap();
        assertThat(videoGrant).isNotNull();
        assertThat(videoGrant.get("canPublishData")).isEqualTo(true);
    }
}

