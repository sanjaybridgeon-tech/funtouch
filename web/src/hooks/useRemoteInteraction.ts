import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import {
  InteractionMessage,
  RemoteCursorEvent,
  RemoteClickEvent,
  RemoteScrollEvent,
  ClickRipple,
} from '../types/interaction';
import { getGuestColor } from '../components/RemoteCursorOverlay';

interface UseRemoteInteractionProps {
  isHost: boolean;
  canControl: boolean;
  participantId?: string;
  participantName?: string;
  roomId?: string;
}

export function useRemoteInteraction({
  isHost,
  canControl,
  participantId = 'guest',
  participantName = 'Guest',
  roomId = 'default',
}: UseRemoteInteractionProps) {
  const room = useRoomContext();
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursorEvent>>(new Map());
  const [clickRipples, setClickRipples] = useState<ClickRipple[]>([]);

  // Throttling ref for guest cursor moves (target ~30 fps = 33ms)
  const lastCursorSendRef = useRef<number>(0);
  const cursorCleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // BroadcastChannel for instant local testing without hosting / cloud server
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Central packet processor on the Host
  const processHostInteraction = useCallback((message: InteractionMessage, senderId?: string, senderName?: string) => {
    const guestId = message.guestId || senderId || 'unknown';
    const guestName = message.guestName || senderName || 'Guest';

    if (message.type === 'cursor') {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(guestId, {
          ...message,
          guestId,
          guestName,
          color: getGuestColor(guestId),
        });
        return next;
      });

      // Auto-remove cursor if inactive for 3 seconds
      if (cursorCleanupTimeoutsRef.current.has(guestId)) {
        clearTimeout(cursorCleanupTimeoutsRef.current.get(guestId)!);
      }
      const timeout = setTimeout(() => {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.delete(guestId);
          return next;
        });
      }, 3000);
      cursorCleanupTimeoutsRef.current.set(guestId, timeout);
    } else if (message.type === 'click') {
      // 1. Trigger visual click ripple on Host video stage
      const rippleId = `${guestId}-${Date.now()}-${Math.random()}`;
      const color = getGuestColor(guestId);

      setClickRipples((prev) => [
        ...prev,
        { id: rippleId, x: message.x, y: message.y, color },
      ]);

      setTimeout(() => {
        setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 800);

      // 2. Forward to Chrome Extension via window.postMessage
      console.log('[FunTouch Interaction] Forwarding click to Extension:', message);
      window.postMessage(
        {
          source: 'FUNTOUCH_HOST_INTERACTION',
          detail: message,
        },
        '*'
      );
    } else if (message.type === 'scroll') {
      // Forward scroll to Chrome Extension
      console.log('[FunTouch Interaction] Forwarding scroll to Extension:', message);
      window.postMessage(
        {
          source: 'FUNTOUCH_HOST_INTERACTION',
          detail: message,
        },
        '*'
      );
    }
  }, []);

  // ── Setup BroadcastChannel for Local Testing ────────────────────────
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channelName = `funtouch-room-${roomId}`;
    const bc = new BroadcastChannel(channelName);
    broadcastChannelRef.current = bc;

    if (isHost) {
      bc.onmessage = (event) => {
        if (event.data && event.data.type) {
          processHostInteraction(event.data);
        }
      };
    }

    return () => {
      bc.close();
      broadcastChannelRef.current = null;
    };
  }, [isHost, roomId, processHostInteraction]);

  // ── Host: Listen for LiveKit WebRTC data messages ────────────────────
  useEffect(() => {
    if (!isHost || !room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const message: InteractionMessage = JSON.parse(text);
        processHostInteraction(message, participant?.identity, participant?.name);
      } catch (err) {
        console.error('[FunTouch Interaction] Error parsing data packet:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      cursorCleanupTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      cursorCleanupTimeoutsRef.current.clear();
    };
  }, [isHost, room, processHostInteraction]);

  // ── Guest: Send cursor position (~30 fps) ───────────────────────────
  const sendCursor = useCallback(
    (x: number, y: number) => {
      if (isHost || !canControl) return;

      const now = performance.now();
      if (now - lastCursorSendRef.current < 33) {
        return; // Throttle to 30 fps
      }
      lastCursorSendRef.current = now;

      const event: RemoteCursorEvent = {
        type: 'cursor',
        x,
        y,
        guestId: participantId,
        guestName: participantName,
        timestamp: Date.now(),
      };

      // 1. BroadcastChannel (local tabs testing)
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(event);
      }

      // 2. LiveKit Data Channel (WebRTC)
      if (room && room.state === 'connected') {
        try {
          const payload = new TextEncoder().encode(JSON.stringify(event));
          room.localParticipant.publishData(payload, { reliable: false });
        } catch (err) {
          // Silent fallback to local channel
        }
      }
    },
    [isHost, canControl, room, participantId, participantName]
  );

  // ── Guest: Send click event (reliable) ───────────────────────────────
  const sendClick = useCallback(
    (x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
      if (isHost || !canControl) return;

      const event: RemoteClickEvent = {
        type: 'click',
        x,
        y,
        button,
        guestId: participantId,
        guestName: participantName,
        timestamp: Date.now(),
      };

      // 1. BroadcastChannel (local tabs testing)
      if (broadcastChannelRef.current) {
        console.log('[FunTouch Interaction] Sending click via local BroadcastChannel:', event);
        broadcastChannelRef.current.postMessage(event);
      }

      // 2. LiveKit Data Channel (WebRTC)
      if (room && room.state === 'connected') {
        try {
          const payload = new TextEncoder().encode(JSON.stringify(event));
          room.localParticipant.publishData(payload, { reliable: true });
        } catch (err) {
          // Fallback handled
        }
      }
    },
    [isHost, canControl, room, participantId, participantName]
  );

  // ── Guest: Send scroll event ─────────────────────────────────────────
  const sendScroll = useCallback(
    (x: number, y: number, deltaX: number, deltaY: number) => {
      if (isHost || !canControl) return;

      const event: RemoteScrollEvent = {
        type: 'scroll',
        x,
        y,
        deltaX,
        deltaY,
        guestId: participantId,
        guestName: participantName,
        timestamp: Date.now(),
      };

      // 1. BroadcastChannel (local tabs testing)
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(event);
      }

      // 2. LiveKit Data Channel (WebRTC)
      if (room && room.state === 'connected') {
        try {
          const payload = new TextEncoder().encode(JSON.stringify(event));
          room.localParticipant.publishData(payload, { reliable: false });
        } catch (err) {
          // Fallback handled
        }
      }
    },
    [isHost, canControl, room, participantId, participantName]
  );

  return {
    remoteCursors,
    clickRipples,
    sendCursor,
    sendClick,
    sendScroll,
  };
}
