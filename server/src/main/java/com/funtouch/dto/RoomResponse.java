package com.funtouch.dto;

import com.funtouch.model.ControlState;
import com.funtouch.model.Room;
import com.funtouch.model.RoomStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Response body for room-related endpoints.
 *
 * <p>{@code token} is populated only when a token is relevant to the caller
 * (e.g. host token on creation, guest token on approval).
 * {@code hostToken} is NEVER included in responses — it stays server-side.
 */
public record RoomResponse(
        String roomId,
        String roomName,
        String roomUrl,
        RoomStatus status,
        String hostName,
        List<GuestInfo> guests,
        String token,       // LiveKit JWT for the caller (nullable)
        Instant createdAt
) {
    /**
     * Nested summary of a guest participant included in room responses.
     */
    public record GuestInfo(
            String guestId,
            String displayName,
            String guestStatus,
            String controlState
    ) {}

    /** Build a RoomResponse from a Room, optionally attaching a LiveKit token. */
    public static RoomResponse from(Room room, String baseUrl, String token) {
        List<GuestInfo> guestInfos = room.getGuests().values().stream()
                .map(g -> new GuestInfo(
                        g.id(),
                        g.displayName(),
                        g.guestStatus() != null ? g.guestStatus().name() : null,
                        g.controlState() != null ? g.controlState().name() : null
                ))
                .toList();

        return new RoomResponse(
                room.getId(),
                room.getName(),
                baseUrl + "/room/" + room.getId(),
                room.getStatus(),
                room.getHost().displayName(),
                guestInfos,
                token,
                room.getCreatedAt()
        );
    }
}

