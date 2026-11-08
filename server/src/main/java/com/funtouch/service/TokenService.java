package com.funtouch.service;

/**
 * Contract for generating LiveKit JWT access tokens.
 * Extracted as an interface to allow easy mocking in tests.
 */
public interface TokenService {

    /**
     * Generate a LiveKit JWT for the room host.
     */
    String generateHostToken(String roomId, String hostName);

    /**
     * Generate a LiveKit JWT for a guest.
     *
     * @param canControl if true, the token includes canPublishData permission
     */
    String generateGuestToken(String roomId, String guestName, boolean canControl);
}

