# Room Service - Get Room Details

Retrieves the current state, metadata, participant roster, and remote control statuses of an active room.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| GET | `/api/rooms/{roomId}` | No | Public | Yes |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Fetches room metadata using the 6-character room identifier.
- Used by guests navigating to a room link to inspect room status before submitting a join request.
- Returns participant list containing both active guests and pending join requests.
- Returns remote control state for each participant (`NONE`, `REQUESTED`, `GRANTED`, `REVOKED`).
- Does not expose secret host credentials or WebRTC tokens.

---

## 3. Request

### 3.1 Path Parameters
| Name | Type | Required | Description | Example |
|:---- |:---- |:-------- |:----------- |:------- |
| `roomId` | String | Yes | Unique 6-character room code | `2eb8a8` |

### 3.2 Query Parameters
NIL

### 3.3 Headers
NIL (Public endpoint)

### 3.4 Body
NIL

---

## 4. Response

### 4.1 Success Response: `200 OK`
```json
{
  "roomId": "2eb8a8",
  "roomName": "Design Review",
  "roomUrl": "http://localhost:5173/room/2eb8a8",
  "status": "ACTIVE",
  "hostName": "Alice",
  "guests": [
    {
      "guestId": "56f3f3ce-ee68-4d49-b30c-6f78f5c8f9db",
      "displayName": "Bob",
      "guestStatus": "APPROVED",
      "controlState": "GRANTED"
    },
    {
      "guestId": "c52ee160-e3f9-4788-bb03-d411faa81119",
      "displayName": "Charlie",
      "guestStatus": "PENDING",
      "controlState": "NONE"
    }
  ],
  "token": null,
  "createdAt": "2026-11-08T08:00:00Z"
}
```

#### Notes:
- `token` is always `null` in `GET` responses to prevent unauthorized token reuse.
- `status` reflects the current lifecycle: `WAITING` (no guests connected), `ACTIVE` (call in progress), or `ENDED`.

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **404 Not Found** | Room code does not exist in memory or has expired | `{"status":404,"error":"Not Found","message":"Room not found: unknown99","timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Unexpected server failure | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

