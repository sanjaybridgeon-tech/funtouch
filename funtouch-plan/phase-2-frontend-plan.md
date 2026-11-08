# Phase 2: Video Call & Screen Share — Frontend Implementation

> **Status: COMPLETED & VERIFIED (Production Build Passing)** ✅
> **Goal:** Interactive video conferencing UI where host can share screen/camera/mic, manage guest admissions via real-time WebSocket signaling, and initiate remote control sessions.

---

## Architecture & Technology Stack

| Layer | Technology | Role |
|---|---|---|
| **Framework** | React 18 + Vite + TypeScript | High-performance SPA with instant HMR and strict type safety |
| **Media Streaming** | LiveKit WebRTC (`@livekit/components-react`, `livekit-client`) | Sub-50ms video/audio streaming, screen sharing via `getDisplayMedia`, WebRTC data messaging |
| **Signaling** | `@stomp/stompjs` + `sockjs-client` | Real-time WebSocket connection to Spring Boot broker at `/ws` |
| **Styling** | Tailwind CSS + `@livekit/components-styles` | Modern dark-mode interface matching the FunTouch brand palette (orange to blue gradient) |
| **Icons** | `lucide-react` | Video, mic, touch cursor, screen share, and session status indicators |

---

## File Tree (`funtouch/web/`)

```
funtouch/web/
├── package.json               # Dependencies and scripts (dev, build, preview)
├── tsconfig.json              # TypeScript compiler configuration (bundler resolution)
├── vite.config.ts             # Vite server config with /api and /ws proxy to Spring Boot (port 8080)
├── tailwind.config.js         # Custom brand colors (funtouch orange, amber, blue)
├── index.html                 # HTML shell with logo favicon and SEO metadata
├── public/
│   └── logo.png              # FunTouch branded icon
└── src/
    ├── main.tsx               # React root entry point
    ├── App.tsx                # Central coordinator: room state, STOMP event dispatch, LiveKitRoom wrapper
    ├── index.css              # Global styles & LiveKit component style integration
    ├── vite-env.d.ts          # Vite client and asset declarations
    ├── types/
    │   └── index.ts           # Type definitions (RoomResponse, WebSocketEvent, ControlState, etc.)
    ├── api/
    │   └── roomApi.ts         # REST client for all 7 backend endpoints with X-Host-Token management
    ├── websocket/
    │   └── wsClient.ts        # STOMP over SockJS client subscribing to /topic/room/{roomId}
    ├── components/
    │   ├── LandingPage.tsx    # Logo, tagline, "Start Call" (Host) & "Join with Code" (Guest)
    │   ├── LobbyModal.tsx     # Guest waiting animation & Host floating incoming request popups
    │   ├── VideoStage.tsx     # Large screen-share stage with PIP webcam strip and click listener
    │   └── ControlBar.tsx     # Mic, camera, screen share, touch control toggle, copy link, and end call
    └── assets/
        └── logo.png           # Bundled vector/PNG asset
```

---

## Verification & Build

```bash
cd funtouch/web
npm run build
```
Output:
```
vite v5.4.21 building for production...
✓ 1724 modules transformed.
dist/index.html                   0.74 kB │ gzip:   0.44 kB
dist/assets/logo-BY1VK6U5.png   988.49 kB
dist/assets/index-C7mokNhG.css   44.41 kB │ gzip:   8.98 kB
dist/assets/index-DsW-1S3e.js   868.52 kB │ gzip: 242.30 kB
✓ built in 1.73s
```

---

## Running the Complete System (Backend + Frontend)

1. **Start the Java Backend:**
   ```bash
   cd funtouch/server
   mvn spring-boot:run
   ```
   (Starts on `http://localhost:8080`)

2. **Start the React Frontend:**
   ```bash
   cd funtouch/web
   npm run dev
   ```
   (Starts on `http://localhost:5173`)

