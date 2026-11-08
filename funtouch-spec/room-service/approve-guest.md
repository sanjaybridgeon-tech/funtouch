# Room Service - Approve Guest

Approves a pending guest's join request, transitions their status to `APPROVED`, issues a subscriber LiveKit JWT token, and delivers it both via the API response and real-time WebSocket.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| POST | `/api/rooms/{roomId}/approve` | Yes | Host (`X-Host-Token`) | No |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Validates host authentication via the `X-Host-Token` header.
- Verifies that the guest exists in the specified room and is currently in `PENDING` state.
- Updates guest state to `APPROVED`.
- Generates a LiveKit JWT token for the guest with `canSubscribe=true`, `canPublish=false`, and `canPublishData=false` (view-only until control is granted).
- Dispatches a `GUEST_APPROVED` WebSocket event containing the token to `/topic/room/{roomId}` so the guest's browser automatically connects to the LiveKit room.
- Returns `200 OK` with the generated guest token.

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
| `X-Host-Token` | Yes | Secret host session token | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| Content-Type | Yes | Payload media type | `application/json` |

### 3.4 Body
```json
{
  "guestId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db"
}
```

#### Field Specifications:
- `guestId` (string, required): Unique UUID of the guest participant to approve.

---

## 4. Response

### 4.1 Success Response: `200 OK`
```json
{
  "guestToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IiLCJpc3MiOiJkZXZrZXkiLCJ2aWRlbyI6eylyb29tIjoiMmViOGE4Iiwicm9vbUpvaW4iOnRydWUsImNhblB1Ymxpc2giOmZhbHNlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjpmYWxzZX19...",
  "message": "Guest approved"
}
```

#### Side Effects:
Dispatches to `/topic/room/{roomId}`:
```json
{
  "eventType": "GUEST_APPROVED",
  "roomId": "2eb8a8",
  "participantId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "participantName": "Bob",
  "guestToken": "eyJhbGciOiJIUzI1Ni...",
  "controlState": null,
  "roomStatus": null,
  "message": "You have been approved to join"
}
```

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **400 Bad Request** | Missing `guestId` parameter | `{"status":400,"error":"Validation Failed","fieldErrors":{"guestId":"Guest ID must not be blank"},"timestamp":"2026-11-08T08:00:00Z"}` |
| **403 Forbidden** | Missing or invalid `X-Host-Token` header | `{"status":403,"error":"Forbidden","message":"Invalid host token for room: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **404 Not Found** | Room or Guest ID not found in the room | `{"status":404,"error":"Not Found","message":"Guest 56f3f3ce-... not found in room 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **409 Conflict** | Guest is not in `PENDING` state (e.g., already approved) | `{"status":409,"error":"Conflict","message":"Guest 56f3f3ce-... is not in PENDING state","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

