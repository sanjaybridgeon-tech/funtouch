package com.funtouch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/rooms — creates a new room.
 */
public record CreateRoomRequest(

        @NotBlank(message = "Host display name must not be blank")
        @Size(min = 2, max = 50, message = "Display name must be 2–50 characters")
        String hostName,

        @Size(max = 100, message = "Room name must be 100 characters or fewer")
        String roomName

) {}

