package com.funtouch.service;

import com.funtouch.dto.WebSocketEvent;
import com.funtouch.exception.RoomNotFoundException;
import com.funtouch.exception.RoomStateException;
import com.funtouch.exception.UnauthorizedException;
import com.funtouch.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core FunTouch room lifecycle service.
 *
 * <p>All room state is held in-memory in a {@code ConcurrentHashMap}. Each room
 * operation validates state transitions and publishes WebSocket events to notify
 * connected clients in real time.
 *
 * <p>Thread safety: ConcurrentHashMap handles concurrent reads. Writes to a single
 * room are synchronized on the room object to prevent races (e.g., double-approval).
 */
@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);

    private final ConcurrentHashMap<String, Room> rooms = new ConcurrentHashMap<>();
    private final TokenService tokenService;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomService(TokenService tokenService,
                       SimpMessagingTemplate messagingTemplate) {
        this.tokenService = tokenService;
        this.messagingTemplate = messagingTemplate;
    }

    // ── Room Creation ──────────────────────────────────────────────────────

    /**
     * Create a new room with the given host.
     *
     * @param hostName    display name for the host
     * @param roomName    optional room display name (defaults to host's name + "'s room")
     * @return the newly created Room
     */
    public Room createRoom(String hostName, String roomName) {
        String roomId = generateRoomId();
        String hostId = UUID.randomUUID().toString();
        String hostToken = UUID.randomUUID().toString(); // X-Host-Token for auth

        // Derive room name if not provided
        String name = (roomName != null && !roomName.isBlank())
                ? roomName
                : hostName + "'s room";

        Participant host = Participant.newHost(hostId, hostName);
        Room room = new Room(roomId, name, host, hostToken);
        rooms.put(roomId, room);

        log.info("Room created: id={} name='{}' host='{}'", roomId, name, hostName);
        return room;
    }

    // ── Room Lookup ────────────────────────────────────────────────────────

    /**
     * Retrieve a room by ID, throwing 404 if not found.
     */
    public Room getRoom(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        return room;
    }

    // ── Guest Join Flow ────────────────────────────────────────────────────

    /**
     * A guest requests to join the room. Adds them as PENDING and notifies the host.
     *
     * @return the new guest Participant
     */
    public Participant requestJoin(String roomId, String guestName) {
        Room room = getRoom(roomId);

        if (room.getStatus() == RoomStatus.ENDED) {
            throw new RoomStateException("Room " + roomId + " has ended");
        }

        String guestId = UUID.randomUUID().toString();
        Participant guest = Participant.newGuest(guestId, guestName);

        synchronized (room) {
            room.putGuest(guest);
            if (room.getStatus() == RoomStatus.WAITING) {
                room.setStatus(RoomStatus.ACTIVE);
            }
        }

        log.info("Guest join request: room={} guestId={} name='{}'", roomId, guestId, guestName);
        pushEvent(roomId, WebSocketEvent.guestJoined(roomId, guestId, guestName));

        return guest;
    }

    /**
     * Host approves a pending guest. Issues a LiveKit guest token.
     *
     * @return the LiveKit JWT for the approved guest
     */
    public String approveGuest(String roomId, String guestId) {
        Room room = getRoom(roomId);
        Participant guest = getGuest(room, guestId);

        if (guest.guestStatus() != GuestStatus.PENDING) {
            throw new RoomStateException("Guest " + guestId + " is not in PENDING state");
        }

        String guestToken = tokenService.generateGuestToken(roomId, guest.displayName(), false);

        synchronized (room) {
            room.updateGuest(guest.withGuestStatus(GuestStatus.APPROVED));
        }

        log.info("Guest approved: room={} guestId={} name='{}'", roomId, guestId, guest.displayName());
        pushEvent(roomId, WebSocketEvent.guestApproved(roomId, guestId, guest.displayName(), guestToken));

        return guestToken;
    }

    /**
     * Host rejects a pending guest.
     */
    public void rejectGuest(String roomId, String guestId) {
        Room room = getRoom(roomId);
        Participant guest = getGuest(room, guestId);

        synchronized (room) {
            room.removeGuest(guestId);
        }

        log.info("Guest rejected: room={} guestId={} name='{}'", roomId, guestId, guest.displayName());
        pushEvent(roomId, WebSocketEvent.guestRejected(roomId, guestId, guest.displayName()));
    }

    // ── Control Flow ───────────────────────────────────────────────────────

    /**
     * Grant remote control to an approved guest.
     * Re-issues the guest token with canPublishData=true.
     *
     * @return the new LiveKit JWT with data publish permission
     */
    public String grantControl(String roomId, String guestId) {
        Room room = getRoom(roomId);
        Participant guest = getGuest(room, guestId);

        if (guest.guestStatus() != GuestStatus.APPROVED) {
            throw new RoomStateException("Guest must be APPROVED before granting control");
        }

        String controlToken = tokenService.generateGuestToken(roomId, guest.displayName(), true);

        synchronized (room) {
            room.updateGuest(guest.withControlState(ControlState.GRANTED));
        }

        log.info("Control granted: room={} guestId={} name='{}'", roomId, guestId, guest.displayName());
        pushEvent(roomId, WebSocketEvent.controlGranted(roomId, guestId, guest.displayName()));

        return controlToken;
    }

    /**
     * Revoke remote control from a guest.
     */
    public void revokeControl(String roomId, String guestId) {
        Room room = getRoom(roomId);
        Participant guest = getGuest(room, guestId);

        synchronized (room) {
            room.updateGuest(guest.withControlState(ControlState.REVOKED));
        }

        log.info("Control revoked: room={} guestId={} name='{}'", roomId, guestId, guest.displayName());
        pushEvent(roomId, WebSocketEvent.controlRevoked(roomId, guestId, guest.displayName()));
    }

    // ── Room End ───────────────────────────────────────────────────────────

    /**
     * End the room. Notifies all participants and marks status as ENDED.
     */
    public void endRoom(String roomId) {
        Room room = getRoom(roomId);

        synchronized (room) {
            room.setStatus(RoomStatus.ENDED);
        }

        log.info("Room ended: id={}", roomId);
        pushEvent(roomId, WebSocketEvent.roomEnded(roomId));
        // Note: room stays in memory for a brief period for final WS delivery.
        // A scheduled cleanup task would remove it after a TTL (Phase 5).
    }

    // ── Host Token Validation ──────────────────────────────────────────────

    /**
     * Validates the X-Host-Token against the stored room token.
     * Throws UnauthorizedException if the token doesn't match.
     */
    public void validateHostToken(String roomId, String token) {
        Room room = getRoom(roomId);
        if (!room.getHostToken().equals(token)) {
            log.warn("Invalid host token attempt for room={}", roomId);
            throw new UnauthorizedException("Invalid host token for room: " + roomId);
        }
    }

    // ── LiveKit Token Helpers ──────────────────────────────────────────────

    /**
     * Generate and return the initial host LiveKit token for a room.
     */
    public String generateHostToken(String roomId) {
        Room room = getRoom(roomId);
        return tokenService.generateHostToken(roomId, room.getHost().displayName());
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private Participant getGuest(Room room, String guestId) {
        Participant guest = room.getGuest(guestId);
        if (guest == null) {
            throw new RoomNotFoundException("Guest " + guestId + " not found in room " + room.getId());
        }
        return guest;
    }

    private void pushEvent(String roomId, WebSocketEvent event) {
        String destination = "/topic/room/" + roomId;
        messagingTemplate.convertAndSend(destination, event);
        log.debug("WebSocket event sent: type={} dest={}", event.eventType(), destination);
    }

    private String generateRoomId() {
        // 6-character alphanumeric room ID, e.g. "abc123"
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6);
    }
}

