package com.funtouch.model;

import java.time.Instant;

/**
 * Represents a participant (host or guest) in a FunTouch room.
 *
 * <p>Uses Java records for concise, immutable data holding.
 * {@code guestStatus} is only meaningful for GUEST role participants.
 * {@code controlState} tracks whether this guest has remote-control permission.
 */
public record Participant(
        String id,
        String displayName,
        ParticipantRole role,
        GuestStatus guestStatus,
        ControlState controlState,
        Instant joinedAt
) {
    /**
     * Factory — create a Host participant.
     */
    public static Participant newHost(String id, String displayName) {
        return new Participant(id, displayName, ParticipantRole.HOST,
                null, ControlState.NONE, Instant.now());
    }

    /**
     * Factory — create a Guest participant with PENDING approval status.
     */
    public static Participant newGuest(String id, String displayName) {
        return new Participant(id, displayName, ParticipantRole.GUEST,
                GuestStatus.PENDING, ControlState.NONE, Instant.now());
    }

    /** Return a copy of this participant with an updated guest status. */
    public Participant withGuestStatus(GuestStatus status) {
        return new Participant(id, displayName, role, status, controlState, joinedAt);
    }

    /** Return a copy of this participant with an updated control state. */
    public Participant withControlState(ControlState state) {
        return new Participant(id, displayName, role, guestStatus, state, joinedAt);
    }
}

