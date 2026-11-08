package com.funtouch.model;

/**
 * Tracks whether a guest has been granted remote control of the shared tab.
 */
public enum ControlState {
    /** No control has been requested or granted */
    NONE,
    /** Guest has requested control, waiting for host approval */
    REQUESTED,
    /** Host has granted control to the guest */
    GRANTED,
    /** Host has revoked previously granted control */
    REVOKED
}

