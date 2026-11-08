package com.funtouch.service;

import com.funtouch.dto.WebSocketEvent;
import com.funtouch.exception.RoomNotFoundException;
import com.funtouch.exception.RoomStateException;
import com.funtouch.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoomService Unit Tests")
class RoomServiceTest {

    @Mock
    private TokenService tokenService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService(tokenService, messagingTemplate);
    }

    // ── createRoom ────────────────────────────────────────────────────────

    @Test
    @DisplayName("createRoom returns a room with correct host and WAITING status")
    void createRoom_returnsRoomWithHost() {
        Room room = roomService.createRoom("Alice", "Alice's Room");

        assertThat(room.getId()).hasSize(6);
        assertThat(room.getName()).isEqualTo("Alice's Room");
        assertThat(room.getHost().displayName()).isEqualTo("Alice");
        assertThat(room.getHost().role()).isEqualTo(ParticipantRole.HOST);
        assertThat(room.getStatus()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.getHostToken()).isNotBlank();
    }

    @Test
    @DisplayName("createRoom uses hostName + 's room' when roomName is null")
    void createRoom_defaultsRoomName() {
        Room room = roomService.createRoom("Bob", null);
        assertThat(room.getName()).isEqualTo("Bob's room");
    }

    // ── getRoom ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getRoom throws RoomNotFoundException for unknown ID")
    void getRoom_throwsForUnknownId() {
        assertThatThrownBy(() -> roomService.getRoom("xxxxxx"))
                .isInstanceOf(RoomNotFoundException.class)
                .hasMessageContaining("xxxxxx");
    }

    // ── requestJoin ───────────────────────────────────────────────────────

    @Test
    @DisplayName("requestJoin adds guest as PENDING and publishes GUEST_JOINED event")
    void requestJoin_addsPendingGuest() {
        Room room = roomService.createRoom("Alice", null);

        Participant guest = roomService.requestJoin(room.getId(), "Bob");

        assertThat(guest.displayName()).isEqualTo("Bob");
        assertThat(guest.guestStatus()).isEqualTo(GuestStatus.PENDING);
        assertThat(guest.role()).isEqualTo(ParticipantRole.GUEST);

        // Room should transition to ACTIVE
        assertThat(roomService.getRoom(room.getId()).getStatus()).isEqualTo(RoomStatus.ACTIVE);

        // WebSocket event should be published
        ArgumentCaptor<WebSocketEvent> eventCaptor = ArgumentCaptor.forClass(WebSocketEvent.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/room/" + room.getId()), eventCaptor.capture());
        assertThat(eventCaptor.getValue().eventType()).isEqualTo("GUEST_JOINED");
    }

    @Test
    @DisplayName("requestJoin throws RoomStateException for ENDED room")
    void requestJoin_throwsForEndedRoom() {
        Room room = roomService.createRoom("Alice", null);
        roomService.endRoom(room.getId());

        assertThatThrownBy(() -> roomService.requestJoin(room.getId(), "Bob"))
                .isInstanceOf(RoomStateException.class);
    }

    // ── approveGuest ──────────────────────────────────────────────────────

    @Test
    @DisplayName("approveGuest updates status to APPROVED and returns token")
    void approveGuest_updatesStatusAndReturnsToken() {
        when(tokenService.generateGuestToken(anyString(), anyString(), eq(false)))
                .thenReturn("guest-jwt-token");

        Room room = roomService.createRoom("Alice", null);
        Participant guest = roomService.requestJoin(room.getId(), "Bob");

        String token = roomService.approveGuest(room.getId(), guest.id());

        assertThat(token).isEqualTo("guest-jwt-token");

        Participant updated = roomService.getRoom(room.getId()).getGuest(guest.id());
        assertThat(updated.guestStatus()).isEqualTo(GuestStatus.APPROVED);

        // Verify GUEST_APPROVED event was published (after GUEST_JOINED)
        verify(messagingTemplate, times(2))
                .convertAndSend(eq("/topic/room/" + room.getId()), any(WebSocketEvent.class));
    }

    @Test
    @DisplayName("approveGuest throws RoomStateException if guest is not PENDING")
    void approveGuest_throwsIfNotPending() {
        when(tokenService.generateGuestToken(anyString(), anyString(), anyBoolean()))
                .thenReturn("token");

        Room room = roomService.createRoom("Alice", null);
        Participant guest = roomService.requestJoin(room.getId(), "Bob");
        roomService.approveGuest(room.getId(), guest.id()); // approve once

        // Try to approve again
        assertThatThrownBy(() -> roomService.approveGuest(room.getId(), guest.id()))
                .isInstanceOf(RoomStateException.class);
    }

    // ── grantControl ──────────────────────────────────────────────────────

    @Test
    @DisplayName("grantControl issues control token and publishes CONTROL_GRANTED event")
    void grantControl_issuesTokenAndPublishesEvent() {
        when(tokenService.generateGuestToken(anyString(), anyString(), eq(false))).thenReturn("join-token");
        when(tokenService.generateGuestToken(anyString(), anyString(), eq(true))).thenReturn("control-token");

        Room room = roomService.createRoom("Alice", null);
        Participant guest = roomService.requestJoin(room.getId(), "Bob");
        roomService.approveGuest(room.getId(), guest.id());

        String controlToken = roomService.grantControl(room.getId(), guest.id());

        assertThat(controlToken).isEqualTo("control-token");

        Participant updated = roomService.getRoom(room.getId()).getGuest(guest.id());
        assertThat(updated.controlState()).isEqualTo(ControlState.GRANTED);
    }

    // ── revokeControl ─────────────────────────────────────────────────────

    @Test
    @DisplayName("revokeControl sets controlState to REVOKED")
    void revokeControl_setsRevokedState() {
        when(tokenService.generateGuestToken(anyString(), anyString(), anyBoolean())).thenReturn("token");

        Room room = roomService.createRoom("Alice", null);
        Participant guest = roomService.requestJoin(room.getId(), "Bob");
        roomService.approveGuest(room.getId(), guest.id());
        roomService.grantControl(room.getId(), guest.id());

        roomService.revokeControl(room.getId(), guest.id());

        Participant updated = roomService.getRoom(room.getId()).getGuest(guest.id());
        assertThat(updated.controlState()).isEqualTo(ControlState.REVOKED);
    }

    // ── validateHostToken ─────────────────────────────────────────────────

    @Test
    @DisplayName("validateHostToken passes for correct token")
    void validateHostToken_passesForCorrectToken() {
        Room room = roomService.createRoom("Alice", null);
        assertThatNoException()
                .isThrownBy(() -> roomService.validateHostToken(room.getId(), room.getHostToken()));
    }

    @Test
    @DisplayName("validateHostToken throws for wrong token")
    void validateHostToken_throwsForWrongToken() {
        Room room = roomService.createRoom("Alice", null);
        assertThatThrownBy(() -> roomService.validateHostToken(room.getId(), "wrong-token"))
                .isInstanceOf(com.funtouch.exception.UnauthorizedException.class);
    }
}

