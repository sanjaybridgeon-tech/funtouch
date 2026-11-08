# Room Service - Guest Join Request

Submits a guest request to enter the room lobby, assigns a provisional participant ID, and broadcasts a real-time notification to the host via WebSocket.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| POST | `/api/rooms/{roomId}/join` | No | Public | No |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Validates that the room exists and is not in `ENDED` status.
- Generates a UUID `guestId` representing the guest.
- Adds the participant to the room's guest map with `guestStatus = PENDING` and `controlState = NONE`.
- If the room was `WAITING`, updates room status to `ACTIVE`.
- Dispatches a real-time `GUEST_JOINED` STOMP message to `/topic/room/{roomId}` so the host UI displays the join approval modal.
- Returns `200 OK` with the provisional `guestId` so the guest client can listen on WebSocket for approval.

---

## 3. Request

### 3.1 Path Parameters
| Name | Type | Required | Description | Example |
|:---- |:---- |:-------- |:----------- |:------- |
| `roomId` | String | Yes | Unique 6-character room code | `2eb8a8` |

### 3.2 Query Parameters
NIL

### 3.3 Headers
| Name | Required | Description | Example |
|:---- |:-------- |:----------- |:------- |
| Content-Type | Yes | Payload media type | `application/json` |

### 3.4 Body
```json
{
  "guestName": "Bob"
}
```

#### Field Specifications:
- `guestName` (string, required): Display name chosen by the guest (min 2, max 50 characters).

---

## 4. Response

### 4.1 Success Response: `200 OK`
```json
{
  "guestId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "roomId": "2eb8a8",
  "message": "Join request sent — waiting for host approval"
}
```

#### Side Effects:
Broadcasts to WebSocket destination `/topic/room/{roomId}`:
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

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **400 Bad Request** | Missing or invalid `guestName` (< 2 / > 50 characters) | `{"status":400,"error":"Validation Failed","fieldErrors":{"guestName":"Display name must be 2–50 characters"},"timestamp":"2026-11-08T08:00:00Z"}` |
| **404 Not Found** | Room ID does not exist | `{"status":404,"error":"Not Found","message":"Room not found: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **409 Conflict** | The room has already ended | `{"status":409,"error":"Conflict","message":"Room 2eb8a8 has ended","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

