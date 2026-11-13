import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import {
  InteractionMessage,
  RemoteCursorEvent,
  RemoteClickEvent,
  RemoteScrollEvent,
  RequestControlEvent,
  ControlStateEvent,
  ClickRipple,
} from '../types/interaction';
import { getGuestColor } from '../components/RemoteCursorOverlay';

interface UseRemoteInteractionProps {
  isHost: boolean;
  canControl: boolean;
  isScreenOwner?: boolean;
  participantId?: string;
  participantName?: string;
  roomId?: string;
  onRequestControl?: (guestId: string, guestName: string) => void;
  onControlState?: (action: 'grant' | 'revoke') => void;
}

export function useRemoteInteraction({
  isHost,
  canControl,
  isScreenOwner = false,
  participantId = 'guest',
  participantName = 'Guest',
  roomId = 'default',
  onRequestControl,
  onControlState,
}: UseRemoteInteractionProps) {
  const room = useRoomContext();
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursorEvent>>(new Map());
  const [clickRipples, setClickRipples] = useState<ClickRipple[]>([]);

  // Throttling ref for cursor moves (target ~30 fps = 33ms)
  const lastCursorSendRef = useRef<number>(0);
  const cursorCleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // BroadcastChannel for instant local testing across tabs
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Central packet processor
  const handleIncomingMessage = useCallback((message: InteractionMessage, senderId?: string, senderName?: string) => {
    const guestId = (message as any).guestId || senderId || 'unknown';
    const guestName = (message as any).guestName || senderName || 'Guest';

    if (message.type === 'cursor') {
      // If we are sharing screen (or host), display the remote cursor
      if (isScreenOwner || isHost) {
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
      }
    } else if (message.type === 'click') {
      if (isScreenOwner || isHost) {
        // 1. Show click ripple
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
      }
    } else if (message.type === 'scroll') {
      if (isScreenOwner || isHost) {
        console.log('[FunTouch Interaction] Forwarding scroll to Extension:', message);
        window.postMessage(
          {
            source: 'FUNTOUCH_HOST_INTERACTION',
            detail: message,
          },
          '*'
        );
      }
    } else if (message.type === 'request_control') {
      // Screen sharer receives control request
      if (isScreenOwner || isHost) {
        console.log(`[FunTouch Interaction] ${message.guestName} requested control`);
        onRequestControl?.(message.guestId, message.guestName);
      }
    } else if (message.type === 'control_state') {
      console.log(`[FunTouch Interaction] Control state changed: ${message.action}`);
      onControlState?.(message.action);
    }
  }, [isScreenOwner, isHost, onRequestControl, onControlState]);

  // ── Setup BroadcastChannel for Local Testing ────────────────────────
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channelName = `funtouch-room-${roomId}`;
    const bc = new BroadcastChannel(channelName);
    broadcastChannelRef.current = bc;

    bc.onmessage = (event) => {
      if (event.data && event.data.type) {
        handleIncomingMessage(event.data);
      }
    };

    return () => {
      bc.close();
      broadcastChannelRef.current = null;
    };
  }, [roomId, handleIncomingMessage]);

  // ── Listen for LiveKit WebRTC data messages ─────────────────────────
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const message: InteractionMessage = JSON.parse(text);
        handleIncomingMessage(message, participant?.identity, participant?.name);
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
  }, [room, handleIncomingMessage]);

  // ── Helper to broadcast a message over both WebRTC & BroadcastChannel
  const broadcastPacket = useCallback((event: InteractionMessage, reliable: boolean = false) => {
    // 1. BroadcastChannel (local tabs)
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event);
    }

    // 2. LiveKit Data Channel (WebRTC)
    if (room && room.state === 'connected') {
      try {
        const payload = new TextEncoder().encode(JSON.stringify(event));
        room.localParticipant.publishData(payload, { reliable });
      } catch (err) {
        console.warn('[FunTouch Interaction] publishData error:', err);
      }
    }
  }, [room]);

  // ── Send cursor position (~30 fps) ──────────────────────────────────
  const sendCursor = useCallback(
    (x: number, y: number) => {
      if (!canControl) return;

      const now = performance.now();
      if (now - lastCursorSendRef.current < 33) {
        return; // Throttle to ~30 fps
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

      broadcastPacket(event, false);
    },
    [canControl, participantId, participantName, broadcastPacket]
  );

  // ── Send click event (reliable) ──────────────────────────────────────
  const sendClick = useCallback(
    (x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
      if (!canControl) return;

      const event: RemoteClickEvent = {
        type: 'click',
        x,
        y,
        button,
        guestId: participantId,
        guestName: participantName,
        timestamp: Date.now(),
      };

      console.log('[FunTouch Interaction] Sending click:', event);
      broadcastPacket(event, true);
    },
    [canControl, participantId, participantName, broadcastPacket]
  );

  // ── Send scroll event ────────────────────────────────────────────────
  const sendScroll = useCallback(
    (x: number, y: number, deltaX: number, deltaY: number) => {
      if (!canControl) return;

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

      broadcastPacket(event, false);
    },
    [canControl, participantId, participantName, broadcastPacket]
  );

  // ── Request control of the shared screen ─────────────────────────────
  const sendRequestControl = useCallback(() => {
    const event: RequestControlEvent = {
      type: 'request_control',
      guestId: participantId,
      guestName: participantName,
      timestamp: Date.now(),
    };
    console.log('[FunTouch Interaction] Requesting control:', event);
    broadcastPacket(event, true);
  }, [participantId, participantName, broadcastPacket]);

  // ── Broadcast control state change (grant / revoke) ──────────────────
  const broadcastControlState = useCallback((action: 'grant' | 'revoke') => {
    const event: ControlStateEvent = {
      type: 'control_state',
      action,
      guestId: participantId,
      timestamp: Date.now(),
    };
    console.log('[FunTouch Interaction] Broadcasting control state:', action);
    broadcastPacket(event, true);

    // Also notify local Chrome extension
    window.postMessage(
      {
        source: 'FUNTOUCH_HOST_CONTROL_STATE',
        action,
        guestName: participantName,
      },
      '*'
    );
  }, [participantId, participantName, broadcastPacket]);

  return {
    remoteCursors,
    clickRipples,
    sendCursor,
    sendClick,
    sendScroll,
    sendRequestControl,
    broadcastControlState,
  };
}
