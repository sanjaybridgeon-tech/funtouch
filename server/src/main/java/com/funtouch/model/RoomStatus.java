package com.funtouch.model;

/**
 * The lifecycle status of a FunTouch room.
 */
public enum RoomStatus {
    /** Room created, waiting for guest to join */
    WAITING,
    /** At least one guest is connected and the call is live */
    ACTIVE,
    /** Room has been closed by the host or expired */
    ENDED
}

