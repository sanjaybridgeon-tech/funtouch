package com.funtouch.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/rooms/{id}/approve — host approves a pending guest.
 */
public record ApproveGuestRequest(

        @NotBlank(message = "Guest ID must not be blank")
        String guestId

) {}

