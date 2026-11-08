# Room Service - End Room

Terminates an ongoing call session, updates room status to `ENDED`, and broadcasts a termination notice to all participants.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| DELETE | `/api/rooms/{roomId}` | Yes | Host (`X-Host-Token`) | Yes |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Validates host authentication via the `X-Host-Token` header.
- Transitions room status to `ENDED`.
- Broadcasts a `ROOM_ENDED` WebSocket event to `/topic/room/{roomId}` instructing all connected host and guest browser clients to disconnect their media streams and return to the home screen.
- Retains the session briefly for websocket delivery before automatic eviction.
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

### 3.4 Body
NIL

---

## 4. Response

### 4.1 Success Response: `200 OK`
```json
{
  "message": "Room ended",
  "roomId": "2eb8a8"
}
```

#### Side Effects:
Dispatches to `/topic/room/{roomId}`:
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

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **403 Forbidden** | Missing or invalid `X-Host-Token` header | `{"status":403,"error":"Forbidden","message":"Invalid host token for room: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **404 Not Found** | Room ID does not exist | `{"status":404,"error":"Not Found","message":"Room not found: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

