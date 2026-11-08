package com.funtouch.model;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core domain model representing a FunTouch room session.
 *
 * <p>Rooms are stored in-memory via {@code RoomService}. Each room has one host
 * and zero or more guests. The host token is issued at creation; guest tokens
 * are issued only after the host approves the guest's join request.
 *
 * <p>Thread safety: individual field mutations are done by replacing immutable
 * records (Participant) inside a ConcurrentHashMap, coordinated by RoomService.
 */
public class Room {

    private final String id;
    private final String name;
    private final Participant host;
    private final String hostToken;         // X-Host-Token for host-only endpoints
    private final Map<String, Participant> guests; // guestId → Participant
    private volatile RoomStatus status;
    private final Instant createdAt;
    private volatile Instant lastActivityAt;

    public Room(String id, String name, Participant host, String hostToken) {
        this.id = id;
        this.name = name;
        this.host = host;
        this.hostToken = hostToken;
        this.guests = new ConcurrentHashMap<>();
        this.status = RoomStatus.WAITING;
        this.createdAt = Instant.now();
        this.lastActivityAt = Instant.now();
    }

    // ── Getters ────────────────────────────────────────────────────────────

    public String getId() { return id; }

    public String getName() { return name; }

    public Participant getHost() { return host; }

    public String getHostToken() { return hostToken; }

    public Map<String, Participant> getGuests() {
        return Collections.unmodifiableMap(guests);
    }

    public RoomStatus getStatus() { return status; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastActivityAt() { return lastActivityAt; }

    // ── Mutations (called only from RoomService) ───────────────────────────

    /** Add or replace a guest participant entry. */
    public void putGuest(Participant guest) {
        guests.put(guest.id(), guest);
        touch();
    }

    /** Remove a guest from the room. */
    public void removeGuest(String guestId) {
        guests.remove(guestId);
        touch();
    }

    /** Update the room status (WAITING → ACTIVE → ENDED). */
    public void setStatus(RoomStatus status) {
        this.status = status;
        touch();
    }

    /** Update a specific guest's record (e.g. after approval or control grant). */
    public void updateGuest(Participant updated) {
        guests.put(updated.id(), updated);
        touch();
    }

    /** Retrieve a guest by ID, or null if not found. */
    public Participant getGuest(String guestId) {
        return guests.get(guestId);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private void touch() {
        this.lastActivityAt = Instant.now();
    }

    @Override
    public String toString() {
        return "Room{id='%s', name='%s', status=%s, guests=%d}"
                .formatted(id, name, status, guests.size());
    }
}

