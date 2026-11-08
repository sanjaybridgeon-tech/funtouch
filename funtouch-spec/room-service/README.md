# FunTouch — Room Service API Specifications

Complete individual endpoint specifications for the FunTouch Room Service backend.

---

## REST Endpoints

| Method | Endpoint | Description | Spec File |
|:------ |:-------- |:----------- |:--------- |
| `POST` | `/api/rooms` | Create a new room & issue host session token | [create-room.md](create-room.md) |
| `GET` | `/api/rooms/{roomId}` | Fetch room details, status, & participant roster | [get-room.md](get-room.md) |
| `POST` | `/api/rooms/{roomId}/join` | Guest submits a join request | [join-room.md](join-room.md) |
| `POST` | `/api/rooms/{roomId}/approve` | Host approves guest & generates LiveKit token | [approve-guest.md](approve-guest.md) |
| `POST` | `/api/rooms/{roomId}/reject` | Host rejects guest request | [reject-guest.md](reject-guest.md) |
| `POST` | `/api/rooms/{roomId}/control` | Host grants or revokes remote control | [update-control.md](update-control.md) |
| `DELETE` | `/api/rooms/{roomId}` | Terminate room session | [end-room.md](end-room.md) |

---

## Real-Time Messaging

| Protocol | Endpoint / Topic | Description | Spec File |
|:-------- |:---------------- |:----------- |:--------- |
| `STOMP` | `/ws` → `/topic/room/{roomId}` | Real-time events (join requests, approvals, control grants, termination) | [websocket-room-events.md](websocket-room-events.md) |

