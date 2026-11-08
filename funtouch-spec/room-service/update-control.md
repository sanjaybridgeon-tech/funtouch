# Room Service - Update Remote Control

Grants or revokes interactive remote control permission for a specified guest. When granted, re-issues a LiveKit token with data publishing enabled.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| POST | `/api/rooms/{roomId}/control` | Yes | Host (`X-Host-Token`) | No |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Validates host authentication via the `X-Host-Token` header.
- Enforces consent check: verifying that the guest is in `APPROVED` state.
- **Grant Action (`action: "grant"`):**
  - Updates guest `controlState` to `GRANTED`.
  - Generates a new LiveKit JWT token with `canPublishData=true`, allowing the guest to send WebRTC data channel click/scroll packets.
  - Broadcasts a `CONTROL_GRANTED` WebSocket event to `/topic/room/{roomId}`.
  - Returns `200 OK` with the new control token.
- **Revoke Action (`action: "revoke"`):**
  - Updates guest `controlState` to `REVOKED`.
  - Broadcasts a `CONTROL_REVOKED` WebSocket event to `/topic/room/{roomId}` to instantly instruct the extension and UI to reject guest events.
  - Returns `200 OK`.

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
  "guestId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
  "action": "grant"
}
```

#### Field Specifications:
- `guestId` (string, required): Unique UUID of the guest participant.
- `action` (string, required): Action to perform. Must match regular expression `grant|revoke`.

---

## 4. Response

### 4.1 Success Response: `200 OK` (Grant)
```json
{
  "controlState": "GRANTED",
  "controlToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCb2IiLCJpc3MiOiJkZXZrZXkiLCJ2aWRlbyI6eylyb29tIjoiMmViOGE4Iiwicm9vbUpvaW4iOnRydWUsImNhblB1Ymxpc2giOmZhbHNlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlfX0...",
  "message": "Control granted"
}
```

### 4.2 Success Response: `200 OK` (Revoke)
```json
{
  "controlState": "REVOKED",
  "message": "Control revoked"
}
```

#### Side Effects:
Dispatches to `/topic/room/{roomId}` on Grant:
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

Dispatches to `/topic/room/{roomId}` on Revoke:
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

---

### 4.3 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **400 Bad Request** | Missing `guestId` or `action` not matching `grant\|revoke` | `{"status":400,"error":"Validation Failed","fieldErrors":{"action":"Action must be 'grant' or 'revoke'"},"timestamp":"2026-11-08T08:00:00Z"}` |
| **403 Forbidden** | Missing or invalid `X-Host-Token` header | `{"status":403,"error":"Forbidden","message":"Invalid host token for room: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **404 Not Found** | Room or Guest ID not found in the room | `{"status":404,"error":"Not Found","message":"Guest 56f3f3ce-... not found in room 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **409 Conflict** | Guest is not approved prior to granting control | `{"status":409,"error":"Conflict","message":"Guest must be APPROVED before granting control","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

