# FunTouch: Build Plan (Java Backend)

> **FunTouch** — *Video calls where you can touch the screen.*

---

## Overview

An interactive video meeting application where the host shares a browser tab, and the guest can click, scroll, and type on the host's shared tab in real time.

**Timeline:** 11–13 weeks solo, 7–9 weeks for a small team.

---

## Tech Stack

| Part | Choice | Why |
|------|--------|-----|
| Frontend | React + Vite | Required for the browser side |
| Video/Screen share | LiveKit (cloud free tier or self-hosted) | Handles WebRTC, TURN, and scaling |
| Control events | LiveKit data messages (or a raw WebRTC data channel) | Low latency |
| Backend | Java 21 + Spring Boot 3 | Your choice |
| Backend libraries | `spring-boot-starter-web`, `spring-boot-starter-websocket`, `livekit-server`, `spring-boot-starter-validation` | Rooms, tokens, lobby notifications |
| Database | In-memory at first, PostgreSQL later | Keep the MVP simple |
| Extension | Chrome Manifest V3, named "FunTouch" | Required |
| Hosting | Vercel/Netlify (frontend), Render/Railway/AWS (Spring Boot) | Spring Boot needs ~512 MB RAM |

---

## Project Structure

```
funtouch/
  web/            (React frontend)
  server/         (Spring Boot, package: com.funtouch)
  extension/      (FunTouch Chrome extension)
```

---

## Phase 0: Preparation & Branding (Week 1)

- [ ] Learn the basics of WebRTC, `getDisplayMedia`, and Manifest V3.
- [ ] Check that "FunTouch" is available before you invest more:
  - **Domains:** `funtouch.com`, `funtouch.app`, `funtouch.io`, or `getfuntouch.com` as a backup
  - **Chrome Web Store, App Store, and Play Store** search for similar names
  - **Trademark search** (USPTO, WIPO, or your country's registry)
  - **Social handles** (Instagram, X, YouTube, LinkedIn)

> [!WARNING]
> Vivo's Android skin is called "Funtouch OS". Verify there's no trademark conflict in your category (video calling / communication software) before committing. Consider variations like **FunTouch Call** or **FunTouch.app** if needed.

- [x] Create a simple logo, color palette, and favicon. Logo added in `/logo/funtouch-logo.png`.
- [ ] Create the Git repo and a LiveKit Cloud account. Keep API keys in environment variables, never in the frontend.
- [x] Write a one-page spec: *"Host shares a tab, guest clicks, the click happens on the host's tab."* Spec created in [`funtouch-spec/funtouch-spec.md`](../funtouch-spec/funtouch-spec.md).

---

## Phase 1: Java Backend Foundation (Weeks 2–3)

> **Detailed Implementation Guide:** See [phase-1-backend-plan.md](file:///Users/sanjaya/Documents/funtouch/funtouch-plan/phase-1-backend-plan.md) for the full 9-step technical blueprint and file map.

**Goal:** Rooms and tokens work.

### Step-by-Step Implementation Breakdown:
- [x] **Step 1: Scaffold Spring Boot Project** — Java 21+ (OpenJDK 25), Spring Boot 3.4.x, Maven, dependencies (`web`, `websocket`, `validation`, `livekit-server:0.10.1`), package `com.funtouch`.
- [x] **Step 2: Domain Model & DTOs** — `Room`, `Participant`, `RoomStatus`, `ControlState`, and request/response DTOs.
- [x] **Step 3: In-Memory `RoomService`** — `ConcurrentHashMap<String, Room>` room management, join request/approval lifecycle, exception handling.
- [x] **Step 4: LiveKit Token Generation** — `LiveKitTokenService` with `canPublish`, `canSubscribe`, and conditional `canPublishData` permissions.
- [x] **Step 5: REST Controllers** — `/api/rooms` CRUD, join, approve, reject, and remote control endpoints.
- [x] **Step 6: WebSocket for Live Events** — STOMP over SockJS (`/ws`, `/topic/room/{id}`) for real-time join/approval/control notifications.
- [x] **Step 7: CORS & Security** — Allow frontend `http://localhost:5173`, `X-Host-Token` validation interceptor for host-only actions.
- [x] **Step 8: Logging & Observability** — SLF4J/Logback structured logging for room and click event pipelines.
- [x] **Step 9: Automated Tests** — JUnit 5 and Mockito unit tests (`RoomServiceTest`, `LiveKitTokenServiceTest`) and `@SpringBootTest` integration tests (`RoomControllerTest`). All 18 tests passing.

### API Endpoints

```
POST /api/rooms                  → create room, return roomId + host token
POST /api/rooms/{id}/join        → guest requests to join
POST /api/rooms/{id}/approve     → host approves guest, guest gets token
POST /api/rooms/{id}/reject      → host rejects guest
POST /api/rooms/{id}/control     → host grants or revokes control
GET  /api/rooms/{id}              → get room info & status
DELETE /api/rooms/{id}           → end room
WS   /ws/rooms/{id}              → live status events (STOMP: /topic/room/{id})
```

Room links look like `funtouch.app/room/abc123`.

> **Milestone:** The API returns a working room link and valid tokens. All verified by automated tests.

---

## Phase 2: Video Call & Screen Share (Weeks 3–4)

> **Detailed Implementation Guide:** See [phase-2-frontend-plan.md](file:///Users/sanjaya/Documents/funtouch/funtouch-plan/phase-2-frontend-plan.md) for the full frontend architecture and file map.

- [x] Build the landing page with the FunTouch logo, tagline, and a "Start a call" button.
- [x] Build the room page: camera, mic, screen share, with the shared screen large and small video tiles beside it.
- [x] Add the join-approval flow over WebSocket.

> **Milestone:** You can share a YouTube tab with a friend on another laptop. *(Completed & verified with React + LiveKit + STOMP)*

---

## Phase 3: Guest Cursor & Click Capture (Week 5)

> **Detailed Implementation Guide:** See [phase-3-interaction-plan.md](file:///Users/sanjaya/Documents/funtouch/funtouch-plan/phase-3-interaction-plan.md) for data channel schemas and overlay architecture.

- [x] Capture mouse position and clicks on the shared video.
- [x] Convert to relative coordinates, e.g. `{type:"click", x:0.45, y:0.30}`.
- [x] Throttle cursor moves to ~30 per second (33ms window via `performance.now`).
- [x] Show the guest's colored cursor on the host's side with a name label and click ripple animations.

> **Milestone:** The host sees the guest's cursor and the clicks are logged. *(Completed & verified)*

---

## Phase 4: The FunTouch Chrome Extension (Weeks 6–8)

> **Detailed Implementation Guide:** See [phase-4-extension-plan.md](file:///Users/sanjaya/Documents/funtouch/funtouch-plan/phase-4-extension-plan.md) for extension architecture and Chrome loading guide.

### Extension Structure

```
extension/
  manifest.json     (name: "FunTouch", MV3, activeTab, scripting, externally_connectable)
  background.js     (service worker: receives events from website and routes to tab)
  content.js        (runs in shared tab: elementFromPoint click/scroll execution & banner)
  host-bridge.js    (bridges website postMessage to chrome.runtime.sendMessage)
  popup.html        (FunTouch branding, Link Current Tab & Stop control buttons)
  popup.js          (controller for extension popup)
  icons/            (16, 48, 128 px logo generated with sips)
```

### Message Flow

```
Guest browser → LiveKit data message → Host website → host-bridge.js → background.js
→ content.js in shared tab → click/scroll on real page + visible pulse ripple
```

### Steps

- [x] Manifest with `activeTab`, `scripting`, and `externally_connectable` limited to FunTouch domains.
- [x] The website forwards control events to the extension via `host-bridge.js`.
- [x] `content.js` converts x%/y% to pixels, uses `document.elementFromPoint()`, and dispatches full pointer/mouse/click event chains.
- [x] Add scroll and typing support (for YouTube search, form inputs, and video toggles).
- [x] `debugger` optional permission declared in manifest for sites that ignore scripted clicks.
- [x] Show floating banner in controlled tab: *"FunTouch: guest is controlling this tab"* with Stop button and `Esc` key shortcut.

> **Milestone:** The guest clicks a thumbnail and the video opens on the host's screen. *(Completed & verified)*

---

## Phase 5: Safety & Consent (Week 9)

- [ ] The host must click "Allow control" each session, and the Spring Boot API records the state.
- [ ] Server-side enforcement: only issue data-send tokens to approved guests.
- [ ] Control is limited to the one shared tab and ends when the call ends or the guest disconnects.
- [ ] Add an instant stop button and keyboard shortcut.
- [ ] Add API rate limiting (Bucket4j) and room expiry after inactivity.

---

## Phase 6: Polish & Testing (Weeks 10–11)

- [ ] Test screen sizes, zoom levels, scrolling, and fullscreen.
- [ ] Test slow connections.
- [ ] Write JUnit 5 tests for `RoomService` and integration tests for the controllers.
- [ ] Add an onboarding screen: *"Install FunTouch extension → Share tab → Allow control."*
- [ ] Test with 10–20 real users.

---

## Phase 7: Deployment & Launch (Weeks 12–13)

- [ ] Package the backend as a Docker image and deploy with the LiveKit key and secret as environment variables.
- [ ] Point your FunTouch domain to the frontend and backend, with HTTPS.
- [ ] Write a privacy policy and terms page under the FunTouch name, and justify each extension permission.
- [ ] Prepare the Chrome Web Store listing: name **"FunTouch"**, short description, screenshots, a demo video, and the privacy policy link.
- [ ] Submit for review (days to weeks), then launch to a small audience first.

---

## Estimated Costs (Early Stage)

| Item | Cost |
|------|------|
| Chrome Web Store fee | $5 one-time |
| Domain | ~$10–$15/year |
| Backend hosting | $0–$10/month at first |
| LiveKit free tier | $0, then usage-based |
| Trademark registration (optional, later) | Varies by country |

---

## Main Risks

| Risk | Mitigation |
|------|------------|
| Name overlap with Vivo "Funtouch OS" | Verify trademark in your category; have a backup name ready |
| Sites ignore scripted clicks | `chrome.debugger` fallback |
| Chrome Web Store rejection | Minimal permissions, clear consent, privacy policy |
| Laggy control | Test LiveKit data messages, fall back to a direct WebRTC data channel |
| Scam misuse | Per-session consent, visible banner, server-enforced permissions |

---

## Additional Considerations

| Area | Details |
|------|---------|
| **Auth/Identity** | Add at minimum a session token so only the room creator is the host |
| **Multi-guest support** | Clarify if 1:1 only or multiple guests — affects cursor colors, turn-taking, and control delegation |
| **Mobile support** | Extension is Chrome-only; define the guest experience on mobile (view-only?) |
| **Reconnection handling** | LiveKit handles media reconnection, but room state and control grants need reconnection logic too |
| **Logging/Observability** | Add structured logging (SLF4J + Logback) from Phase 1 for debugging the full click pipeline |
| **Coordinate mapping edge cases** | Account for scroll position, zoom level, lazy-loaded content, iframes, and CSS transforms |

---

## First 3 Steps This Week

1. **Check availability** of "FunTouch" (domain, Chrome Web Store, trademark — especially vs Vivo).
2. [x] **Generate the Spring Boot project** and create `/api/rooms` returning a LiveKit token. *(Completed: Spring Boot 3.4 API with WebSocket and tests)*
3. **Build a basic `getDisplayMedia` page** and a "Hello World" extension that clicks a button.

---

*Plan created: November 2026*
*Product: FunTouch — Video calls where you can touch the screen.*
