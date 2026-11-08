# Phase 3: Guest Cursor & Click Capture — Implementation

> **Status: COMPLETED & VERIFIED (Production Build Passing)** ✅
> **Goal:** Sub-50ms interactive pointer and click streaming over LiveKit WebRTC Data Channels with relative coordinate normalization, ~30 fps throttling, colorful multi-guest cursor overlays, and click ripple pulse animations.

---

## Architecture & Data Flow

```
┌──────────────────────────────────────────────┐
│                  Guest Browser               │
│                                              │
│  Moves / clicks on <VideoTrack> container    │
│  1. Relative Coordinates:                    │
│     x = (clientX - rect.left) / rect.width   │
│     y = (clientY - rect.top) / rect.height   │
│  2. Throttled to ~30 fps (33ms window)       │
│  3. Encoded as UTF-8 JSON packet             │
│  4. Published via LiveKit Data Channel       │
└──────────────────────┬───────────────────────┘
                       │
                       │ WebRTC Data Message (`publishData`)
                       │ Reliable for clicks, Unreliable (fast) for cursor moves
                       ▼
┌──────────────────────────────────────────────┐
│                  Host Browser                │
│                                              │
│  1. Subscribes to `RoomEvent.DataReceived`   │
│  2. Decodes packet & identifies guest ID/name│
│  3. Updates `RemoteCursorOverlay`:           │
│     - Animated SVG cursor arrow              │
│     - Participant name badge ("Bob")         │
│     - Distinct high-contrast guest color     │
│  4. Renders animated click ripple pulse      │
│  5. Forwards to window.postMessage for the   │
│     FunTouch Chrome Extension (Phase 4)      │
└──────────────────────────────────────────────┘
```

---

## Key Files Created / Updated

| File | Role |
|---|---|
| [`src/types/interaction.ts`](file:///Users/sanjaya/Documents/funtouch/web/src/types/interaction.ts) | Data channel contracts (`RemoteCursorEvent`, `RemoteClickEvent`, `RemoteScrollEvent`, `ClickRipple`). |
| [`src/hooks/useRemoteInteraction.ts`](file:///Users/sanjaya/Documents/funtouch/web/src/hooks/useRemoteInteraction.ts) | LiveKit Data Channel hook. Handles 30 fps guest cursor throttling, reliable click publishing, host-side event consumption, stale cursor cleanup (3s TTL), and extension forwarding. |
| [`src/components/RemoteCursorOverlay.tsx`](file:///Users/sanjaya/Documents/funtouch/web/src/components/RemoteCursorOverlay.tsx) | Visual overlay component rendering smooth SVG cursor pointers, name badges, and expanding CSS ripple circles on clicks. |
| [`src/components/VideoStage.tsx`](file:///Users/sanjaya/Documents/funtouch/web/src/components/VideoStage.tsx) | Integrates cursor tracking, pointer move/down listeners, wheel scroll listeners, and cursor overlay directly on the shared tab video. |

---

## Verification

```bash
npm run build
```
```
vite v5.4.21 building for production...
✓ 1726 modules transformed.
dist/index.html                   0.74 kB │ gzip:   0.44 kB
dist/assets/logo-BY1VK6U5.png   988.49 kB
dist/assets/index-zDSzQPJW.css   45.79 kB │ gzip:   9.15 kB
dist/assets/index-CxbITS9G.js   872.91 kB │ gzip: 243.72 kB
✓ built in 1.73s
```

