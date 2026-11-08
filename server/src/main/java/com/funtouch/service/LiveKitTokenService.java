package com.funtouch.service;

import com.funtouch.config.LiveKitProperties;
import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanPublishData;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Generates LiveKit JWT access tokens for hosts and guests.
 *
 * <p>Host token: canPublish + canSubscribe + canPublishData (screen share + data messages)
 * <p>Guest token: canSubscribe only by default; canPublishData is added only
 * when the host explicitly grants remote control ({@code canControl=true}).
 */
@Service
public class LiveKitTokenService implements TokenService {

    private static final Logger log = LoggerFactory.getLogger(LiveKitTokenService.class);

    // Token TTL: 6 hours (a reasonable call session limit)
    private static final long TOKEN_TTL_SECONDS = 6 * 60 * 60;

    private final LiveKitProperties props;

    public LiveKitTokenService(LiveKitProperties props) {
        this.props = props;
    }

    /**
     * Generate a LiveKit JWT for the room host.
     *
     * @param roomId   the LiveKit room name
     * @param hostName the host's display identity in LiveKit
     * @return signed JWT string
     */
    public String generateHostToken(String roomId, String hostName) {
        log.debug("Generating host token for room={} identity={}", roomId, hostName);

        return buildToken(hostName, roomId,
                new RoomJoin(true),
                new RoomName(roomId),
                new CanPublish(true),
                new CanSubscribe(true),
                new CanPublishData(true)
        );
    }

    /**
     * Generate a LiveKit JWT for a guest.
     *
     * @param roomId     the LiveKit room name
     * @param guestName  the guest's display identity in LiveKit
     * @param canControl if true, the guest can send LiveKit data messages (remote control)
     * @return signed JWT string
     */
    public String generateGuestToken(String roomId, String guestName, boolean canControl) {
        log.debug("Generating guest token for room={} identity={} canControl={}",
                roomId, guestName, canControl);

        return buildToken(guestName, roomId,
                new RoomJoin(true),
                new RoomName(roomId),
                new CanPublish(false),
                new CanSubscribe(true),
                new CanPublishData(canControl)
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private String buildToken(String identity, String roomId, io.livekit.server.VideoGrant... grants) {
        try {
            AccessToken token = new AccessToken(props.apiKey(), props.apiSecret());
            token.setIdentity(identity);
            token.setName(identity);
            token.setTtl(TOKEN_TTL_SECONDS);
            token.addGrants(grants);
            String jwt = token.toJwt();
            log.debug("Token generated for identity={}", identity);
            return jwt;
        } catch (Exception e) {
            log.error("Failed to generate LiveKit token for identity={}", identity, e);
            throw new RuntimeException("Token generation failed", e);
        }
    }
}

