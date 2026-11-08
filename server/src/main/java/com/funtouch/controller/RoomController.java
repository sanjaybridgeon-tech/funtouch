package com.funtouch.controller;

import com.funtouch.dto.*;
import com.funtouch.model.Room;
import com.funtouch.model.Participant;
import com.funtouch.service.RoomService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for FunTouch room management.
 *
 * <p>All host-only endpoints (approve, reject, control, delete) are protected by
 * {@link com.funtouch.config.HostAuthInterceptor} which validates {@code X-Host-Token}.
 *
 * <p>Room URLs take the form: {@code https://funtouch.app/room/{roomId}}
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    private final RoomService roomService;

    @Value("${funtouch.cors.allowed-origins[0]:http://localhost:5173}")
    private String baseUrl;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    // ── POST /api/rooms — Create a room ───────────────────────────────────

    /**
     * Creates a new FunTouch room. Returns the room URL, LiveKit host token,
     * and the {@code X-Host-Token} header for subsequent host-only operations.
     */
    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        log.info("Creating room for host='{}'", request.hostName());

        Room room = roomService.createRoom(request.hostName(), request.roomName());
        String liveKitToken = roomService.generateHostToken(room.getId());

        RoomResponse body = RoomResponse.from(room, baseUrl, liveKitToken);

        // Return the host session token in a response header — keep it safe!
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Host-Token", room.getHostToken());

        return ResponseEntity.status(HttpStatus.CREATED).headers(headers).body(body);
    }

    // ── GET /api/rooms/{id} — Get room info ───────────────────────────────

    /**
     * Returns current room state (status, guests, etc.) without any tokens.
     */
    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String roomId) {
        Room room = roomService.getRoom(roomId);
        return ResponseEntity.ok(RoomResponse.from(room, baseUrl, null));
    }

    // ── POST /api/rooms/{id}/join — Guest requests to join ────────────────

    /**
     * A guest requests to join. Notifies the host over WebSocket.
     * Returns the guest's provisional ID so they can subscribe to WebSocket events.
     */
    @PostMapping("/{roomId}/join")
    public ResponseEntity<Map<String, String>> joinRoom(
            @PathVariable String roomId,
            @Valid @RequestBody JoinRoomRequest request) {

        log.info("Join request: room={} guest='{}'", roomId, request.guestName());
        Participant guest = roomService.requestJoin(roomId, request.guestName());

        return ResponseEntity.ok(Map.of(
                "guestId", guest.id(),
                "message", "Join request sent — waiting for host approval",
                "roomId", roomId
        ));
    }

    // ── POST /api/rooms/{id}/approve — Host approves a guest ─────────────

    /**
     * Host approves a pending guest. Returns the guest's LiveKit token,
     * which is also delivered via WebSocket so the guest's browser can connect.
     */
    @PostMapping("/{roomId}/approve")
    public ResponseEntity<Map<String, String>> approveGuest(
            @PathVariable String roomId,
            @Valid @RequestBody ApproveGuestRequest request) {

        log.info("Approving guest: room={} guestId={}", roomId, request.guestId());
        String guestToken = roomService.approveGuest(roomId, request.guestId());

        return ResponseEntity.ok(Map.of(
                "guestToken", guestToken,
                "message", "Guest approved"
        ));
    }

    // ── POST /api/rooms/{id}/reject — Host rejects a guest ───────────────

    @PostMapping("/{roomId}/reject")
    public ResponseEntity<Map<String, String>> rejectGuest(
            @PathVariable String roomId,
            @RequestParam String guestId) {

        log.info("Rejecting guest: room={} guestId={}", roomId, guestId);
        roomService.rejectGuest(roomId, guestId);

        return ResponseEntity.ok(Map.of("message", "Guest rejected"));
    }

    // ── POST /api/rooms/{id}/control — Grant or revoke control ───────────

    /**
     * Host grants or revokes remote control for a specific guest.
     * On "grant": returns a new LiveKit token with canPublishData=true.
     * On "revoke": returns a confirmation message.
     */
    @PostMapping("/{roomId}/control")
    public ResponseEntity<Map<String, String>> updateControl(
            @PathVariable String roomId,
            @Valid @RequestBody ControlRequest request) {

        log.info("Control update: room={} guestId={} action={}",
                roomId, request.guestId(), request.action());

        return switch (request.action()) {
            case "grant" -> {
                String controlToken = roomService.grantControl(roomId, request.guestId());
                yield ResponseEntity.ok(Map.of(
                        "controlState", "GRANTED",
                        "controlToken", controlToken,
                        "message", "Control granted"
                ));
            }
            case "revoke" -> {
                roomService.revokeControl(roomId, request.guestId());
                yield ResponseEntity.ok(Map.of(
                        "controlState", "REVOKED",
                        "message", "Control revoked"
                ));
            }
            default -> ResponseEntity.badRequest().body(Map.of("error", "Unknown action"));
        };
    }

    // ── DELETE /api/rooms/{id} — End the room ─────────────────────────────

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Map<String, String>> endRoom(@PathVariable String roomId) {
        log.info("Ending room: id={}", roomId);
        roomService.endRoom(roomId);
        return ResponseEntity.ok(Map.of("message", "Room ended", "roomId", roomId));
    }
}

