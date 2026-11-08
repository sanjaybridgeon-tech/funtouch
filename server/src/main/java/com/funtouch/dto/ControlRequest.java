package com.funtouch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for POST /api/rooms/{id}/control — host grants or revokes control.
 */
public record ControlRequest(

        @NotBlank(message = "Guest ID must not be blank")
        String guestId,

        @NotBlank(message = "Action must not be blank")
        @Pattern(regexp = "grant|revoke", message = "Action must be 'grant' or 'revoke'")
        String action

) {}

