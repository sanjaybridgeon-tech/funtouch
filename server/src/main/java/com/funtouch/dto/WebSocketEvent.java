package com.funtouch.dto;

import com.funtouch.model.ControlState;
import com.funtouch.model.RoomStatus;

/**
 * WebSocket event payload pushed to clients over STOMP.
 *
 * <p>Sent to the topic {@code /topic/room/{roomId}} for all room lifecycle events.
 * Clients filter on {@code eventType} to react appropriately.
 */
public record WebSocketEvent(
        String eventType,    // GUEST_JOINED, GUEST_APPROVED, GUEST_REJECTED, CONTROL_GRANTED, CONTROL_REVOKED, ROOM_ENDED
        String roomId,
        String participantId,
        String participantName,
        String guestToken,   // only present in GUEST_APPROVED events
        String controlState, // only present in CONTROL_* events
        String roomStatus,   // only present in ROOM_ENDED events
        String message
) {
    // ── Static factories for each event type ──────────────────────────────

    public static WebSocketEvent guestJoined(String roomId, String guestId, String guestName) {
        return new WebSocketEvent("GUEST_JOINED", roomId, guestId, guestName,
                null, null, null, guestName + " wants to join");
    }

    public static WebSocketEvent guestApproved(String roomId, String guestId, String guestName, String guestToken) {
        return new WebSocketEvent("GUEST_APPROVED", roomId, guestId, guestName,
                guestToken, null, null, "You have been approved to join");
    }

    public static WebSocketEvent guestRejected(String roomId, String guestId, String guestName) {
        return new WebSocketEvent("GUEST_REJECTED", roomId, guestId, guestName,
                null, null, null, "Your join request was declined");
    }

    public static WebSocketEvent controlGranted(String roomId, String guestId, String guestName) {
        return new WebSocketEvent("CONTROL_GRANTED", roomId, guestId, guestName,
                null, ControlState.GRANTED.name(), null, "You have been granted control");
    }

    public static WebSocketEvent controlRevoked(String roomId, String guestId, String guestName) {
        return new WebSocketEvent("CONTROL_REVOKED", roomId, guestId, guestName,
                null, ControlState.REVOKED.name(), null, "Control has been revoked");
    }

    public static WebSocketEvent roomEnded(String roomId) {
        return new WebSocketEvent("ROOM_ENDED", roomId, null, null,
                null, null, RoomStatus.ENDED.name(), "The room has ended");
    }
}

