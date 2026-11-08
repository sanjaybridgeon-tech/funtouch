package com.funtouch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/rooms/{id}/join — a guest requests to join.
 */
public record JoinRoomRequest(

        @NotBlank(message = "Guest display name must not be blank")
        @Size(min = 2, max = 50, message = "Display name must be 2–50 characters")
        String guestName

) {}

