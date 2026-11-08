# Room Service - WebSocket Room Events

Defines the real-time STOMP messaging protocol over SockJS used to notify connected browser clients of room lifecycle changes, join requests, approvals, and remote control grants.

---

## 1. Connection & Subscription

| Parameter | Value | Notes |
|:--------- |:----- |:----- |
| **STOMP Endpoint** | `ws://localhost:8080/ws` | SockJS fallback enabled at `http://localhost:8080/ws` |
| **Topic Destination** | `/topic/room/{roomId}` | Client subscribes upon joining room lobby |
| **Application Prefix** | `/app` | Client-to-server destination prefix (reserved) |
| **Broker** | In-Memory Simple Broker (`/topic`) | Zero-latency pub/sub message dispatching |

---

## 2. Summary

- Clients open a STOMP connection to `/ws` when mounting the call interface.
- Each client subscribes to their specific room topic: `/topic/room/{roomId}`.
- All room mutations in `RoomService` automatically trigger an event broadcast over `SimpMessagingTemplate`.
- Client applications inspect `eventType` to update their state machine (e.g., transitioning from waiting lobby to active video grid, or opening/closing remote control listeners).

---

## 3. Event Schemas

### 3.1 Event Structure
```json
{
  "eventType": "string",
  "roomId": "string",
  "participantId": "string | null",
  "participantName": "string | null",
  "guestToken": "string | null",
  "controlState": "string | null",
  "roomStatus": "string | null",
  "message": "string"
}
```

---

### 3.2 Event Types Catalog

#### `GUEST_JOINED`
Broadcast when a guest calls `POST /api/rooms/{id}/join`.
- **Audience:** Host
- **Payload:**
```json
{
  "eventType": "GUEST_JOINED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": null,
  "controlState": null,
  "roomStatus": null,
  "message": "Bob wants to join"
}
```

#### `GUEST_APPROVED`
Broadcast when the host calls `POST /api/rooms/{id}/approve`.
- **Audience:** Guest (and Host roster update)
- **Payload:**
```json
{
  "eventType": "GUEST_APPROVED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "controlState": null,
  "roomStatus": null,
  "message": "You have been approved to join"
}
```

#### `GUEST_REJECTED`
Broadcast when the host calls `POST /api/rooms/{id}/reject`.
- **Audience:** Guest
- **Payload:**
```json
{
  "eventType": "GUEST_REJECTED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": null,
  "controlState": null,
  "roomStatus": null,
  "message": "Your join request was declined"
}
```

#### `CONTROL_GRANTED`
Broadcast when the host calls `POST /api/rooms/{id}/control` with `action: "grant"`.
- **Audience:** Guest & Chrome Extension
- **Payload:**
```json
{
  "eventType": "CONTROL_GRANTED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": null,
  "controlState": "GRANTED",
  "roomStatus": null,
  "message": "You have been granted control"
}
```

#### `CONTROL_REVOKED`
Broadcast when the host calls `POST /api/rooms/{id}/control` with `action: "revoke"`.
- **Audience:** Guest & Chrome Extension
- **Payload:**
```json
{
  "eventType": "CONTROL_REVOKED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": null,
  "controlState": "REVOKED",
  "roomStatus": null,
  "message": "Control has been revoked"
}
```

#### `ROOM_ENDED`
Broadcast when the host calls `DELETE /api/rooms/{id}`.
- **Audience:** All connected participants
- **Payload:**
```json
{
  "eventType": "ROOM_ENDED",
  "roomId": "2eb8a8",
  "participantId": null,
  "participantName": null,
  "guestToken": null,
  "controlState": null,
  "roomStatus": "ENDED",
  "message": "The room has ended"
}
```

