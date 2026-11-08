package com.funtouch.model;

/**
 * The role of a participant in a FunTouch room.
 */
public enum ParticipantRole {
    /** Created the room; can share screen and grant/revoke control */
    HOST,
    /** Joined the room; can view the stream and potentially control the tab */
    GUEST
}

