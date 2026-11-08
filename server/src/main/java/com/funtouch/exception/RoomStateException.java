package com.funtouch.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a business rule is violated (e.g., trying to approve a guest
 * who is not in PENDING state, or joining an ENDED room).
 * Maps to HTTP 409 Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class RoomStateException extends RuntimeException {

    public RoomStateException(String message) {
        super(message);
    }
}

