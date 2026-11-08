# Room Service - Reject Guest

Declines a guest's join request, removes them from the room participant list, and pushes a notification via WebSocket.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| POST | `/api/rooms/{roomId}/reject` | Yes | Host (`X-Host-Token`) | No |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Validates host authentication using the `X-Host-Token` header.
- Verifies that the guest exists in the specified room.
- Removes the guest participant from memory.
- Dispatches a `GUEST_REJECTED` WebSocket event to `/topic/room/{roomId}` so the guest's UI updates to a polite rejection message.
- Returns `200 OK`.

---

## 3. Request

### 3.1 Path Parameters
| Name | Type | Required | Description | Example |
|:---- |:---- |:-------- |:----------- |:------- |
| `roomId` | String | Yes | Unique 6-character room code | `2eb8a8` |

### 3.2 Query Parameters
| Name | Type | Required | Description | Example |
|:---- |:---- |:-------- |:----------- |:------- |
| `guestId` | String | Yes | Unique UUID of the guest participant to reject | `56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db` |

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
  "message": "Guest rejected"
}
```

#### Side Effects:
Dispatches to `/topic/room/{roomId}`:
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

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **400 Bad Request** | Missing required `guestId` query parameter | `{"status":400,"error":"Bad Request","message":"Required parameter 'guestId' is not present","timestamp":"2026-11-08T08:00:00Z"}` |
| **403 Forbidden** | Missing or invalid `X-Host-Token` header | `{"status":403,"error":"Forbidden","message":"Invalid host token for room: 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **404 Not Found** | Room or Guest ID not found in the room | `{"status":404,"error":"Not Found","message":"Guest 56f3f3ce-... not found in room 2eb8a8","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

