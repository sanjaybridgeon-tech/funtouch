package com.funtouch.model;

/**
 * The join/approval status of a guest participant.
 */
public enum GuestStatus {
    /** Request sent, host has not yet responded */
    PENDING,
    /** Host approved the guest; they can join the LiveKit room */
    APPROVED,
    /** Host rejected the guest */
    REJECTED
}

