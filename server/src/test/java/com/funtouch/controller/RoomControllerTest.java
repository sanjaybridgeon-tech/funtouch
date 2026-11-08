package com.funtouch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.funtouch.dto.ApproveGuestRequest;
import com.funtouch.dto.ControlRequest;
import com.funtouch.dto.CreateRoomRequest;
import com.funtouch.dto.JoinRoomRequest;
import com.funtouch.service.TokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "livekit.api-key=test-key",
    "livekit.api-secret=test-secret-that-is-long-enough",
    "livekit.url=wss://test.livekit.cloud"
})
@DisplayName("RoomController Integration Tests")
class RoomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TokenService tokenService;

    @Test
    @DisplayName("Full Room Flow: Create -> Join -> Approve -> Control -> End")
    void fullRoomLifecycleFlow() throws Exception {
        when(tokenService.generateHostToken(anyString(), anyString())).thenReturn("mock-host-token");
        when(tokenService.generateGuestToken(anyString(), anyString(), anyBoolean())).thenReturn("mock-guest-token");

        // 1. Create Room (POST /api/rooms)
        CreateRoomRequest createReq = new CreateRoomRequest("HostAlice", "Alice's Studio");
        MvcResult createResult = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("X-Host-Token"))
                .andExpect(jsonPath("$.roomId").isNotEmpty())
                .andExpect(jsonPath("$.hostName").value("HostAlice"))
                .andExpect(jsonPath("$.token").value("mock-host-token"))
                .andReturn();

        String hostToken = createResult.getResponse().getHeader("X-Host-Token");
        String roomId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("roomId").asText();

        // 2. Get Room Info (GET /api/rooms/{id})
        mockMvc.perform(get("/api/rooms/" + roomId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomId").value(roomId))
                .andExpect(jsonPath("$.status").value("WAITING"));

        // 3. Guest Join (POST /api/rooms/{id}/join)
        JoinRoomRequest joinReq = new JoinRoomRequest("GuestBob");
        MvcResult joinResult = mockMvc.perform(post("/api/rooms/" + roomId + "/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(joinReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guestId").isNotEmpty())
                .andReturn();

        String guestId = objectMapper.readTree(joinResult.getResponse().getContentAsString()).get("guestId").asText();

        // 4. Host Approve without X-Host-Token header -> Expect 403 Forbidden
        ApproveGuestRequest approveReq = new ApproveGuestRequest(guestId);
        mockMvc.perform(post("/api/rooms/" + roomId + "/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isForbidden());

        // 5. Host Approve with valid X-Host-Token header -> Expect 200 OK
        mockMvc.perform(post("/api/rooms/" + roomId + "/approve")
                        .header("X-Host-Token", hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guestToken").value("mock-guest-token"));

        // 6. Host Grants Control (POST /api/rooms/{id}/control)
        ControlRequest controlReq = new ControlRequest(guestId, "grant");
        mockMvc.perform(post("/api/rooms/" + roomId + "/control")
                        .header("X-Host-Token", hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(controlReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.controlState").value("GRANTED"))
                .andExpect(jsonPath("$.controlToken").value("mock-guest-token"));

        // 7. Host Revokes Control (POST /api/rooms/{id}/control)
        ControlRequest revokeReq = new ControlRequest(guestId, "revoke");
        mockMvc.perform(post("/api/rooms/" + roomId + "/control")
                        .header("X-Host-Token", hostToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(revokeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.controlState").value("REVOKED"));

        // 8. End Room (DELETE /api/rooms/{id})
        mockMvc.perform(delete("/api/rooms/" + roomId)
                        .header("X-Host-Token", hostToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Room ended"));

        // Verify status is now ENDED
        mockMvc.perform(get("/api/rooms/" + roomId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENDED"));
    }

    @Test
    @DisplayName("Validation failure returns HTTP 400")
    void validationError_returnsBadRequest() throws Exception {
        CreateRoomRequest invalidReq = new CreateRoomRequest("", "Room"); // Blank host name
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.hostName").isNotEmpty());
    }

    @Test
    @DisplayName("Non-existent room returns HTTP 404")
    void nonExistentRoom_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/rooms/unknown99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
