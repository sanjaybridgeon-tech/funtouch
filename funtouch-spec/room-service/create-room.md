# Room Service - Create Room

Creates a new video session room, initializes in-memory state, generates a LiveKit JWT token for the host, and returns the secret `X-Host-Token` session credential in the response headers.

---

## 1. Endpoint

| Method | URL | Auth Required | Permission/Scope | Idempotent |
|:------ |:--- |:------------- |:---------------- |:-----------|
| POST | `/api/rooms` | No | Public | No |

**Base URL:** `http://localhost:8080` (Development) or `https://api.funtouch.app` (Production)

---

## 2. Summary

- Generates a unique 6-character alphanumeric room identifier (e.g., `2eb8a8`).
- Creates a host participant record with `HOST` role.
- Generates a cryptographically random UUID `hostToken` stored server-side to authenticate subsequent host-only actions.
- Issues a signed LiveKit JWT token with `canPublish=true`, `canSubscribe=true`, and `canPublishData=true` (enabling screen sharing and remote data channels).
- Exposes `X-Host-Token` in the response header so the client application can store it in session storage.
- Sets initial room status to `WAITING`.
- Returns `201 Created` with the room details, shareable link, and host LiveKit token.

---

## 3. Request

### 3.1 Path Parameters
NIL

### 3.2 Query Parameters
NIL

### 3.3 Headers
| Name | Required | Description | Example |
|:---- |:-------- |:----------- |:------- |
| Content-Type | Yes | Payload media type | `application/json` |

### 3.4 Body
```json
{
  "hostName": "Alice",
  "roomName": "Design Review"
}
```

#### Field Specifications:
- `hostName` (string, required): Display name of the host creating the room (min 2, max 50 characters).
- `roomName` (string, optional): Title/topic of the room (max 100 characters). If omitted or blank, defaults to `"{hostName}'s room"`.

---

## 4. Response

### 4.1 Success Response: `201 Created`

#### Response Headers:
| Name | Value Example | Description |
|:---- |:------------- |:----------- |
| `X-Host-Token` | `f47ac10b-58cc-4372-a567-0e02b2c3d479` | Secret host session token required for `/approve`, `/reject`, `/control`, and room deletion |

#### Response Body:
```json
{
  "roomId": "2eb8a8",
  "roomName": "Design Review",
  "roomUrl": "http://localhost:5173/room/2eb8a8",
  "status": "WAITING",
  "hostName": "Alice",
  "guests": [],
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJBbGljZSIsImlzcyI6ImRldmtleSIsInZpZGVvIjp7InJvb20iOiIyZWI4YTgiLCJyb29tSm9pbiI6dHJ1ZSwiY2FuUHVibGlzaCI6dHJ1ZSwiY2FuU3Vic2NyaWJlIjp0cnVlLCJjYW5QdWJsaXNoRGF0YSI6dHJ1ZX19...",
  "createdAt": "2026-11-08T08:00:00Z"
}
```

#### Notes:
- `token` is the LiveKit WebRTC access token enabling immediate connection to the media server.
- The secret `hostToken` is never included in the JSON body; it is only returned once in the `X-Host-Token` response header.

---

### 4.2 Error Responses

| Status Code | Reason / Condition | Error Response Payload Example |
|:----------- |:------------------ |:------------------------------ |
| **400 Bad Request** | Blank `hostName` or display name < 2 / > 50 characters | `{"status":400,"error":"Validation Failed","fieldErrors":{"hostName":"Host display name must not be blank"},"timestamp":"2026-11-08T08:00:00Z"}` |
| **500 Internal Error** | Token generation error or internal server exception | `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred","timestamp":"2026-11-08T08:00:00Z"}` |

