import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { LandingPage } from './components/LandingPage';
import { VideoStage } from './components/VideoStage';
import { ControlBar } from './components/ControlBar';
import { LobbyModal } from './components/LobbyModal';
import { roomApi, getHostToken, getLiveKitToken } from './api/roomApi';
import { RoomWebSocketClient } from './websocket/wsClient';
import { RoomResponse, ControlState, WebSocketEvent } from './types';
import { stopAllLocalMedia } from './utils/mediaManager';
import { AnimatedBackground } from './components/AnimatedBackground';
import logo from './assets/logo.png';

// Fallback LiveKit URL if not provided by env
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://funtouch-jo1t2dh2.livekit.cloud';

export function App() {
  const [currentRoom, setCurrentRoom] = useState<RoomResponse | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRoomId, setInitialRoomId] = useState<string>('');

  // Guest lobby state
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Host lobby state
  const [pendingGuests, setPendingGuests] = useState<{ id: string; name: string }[]>([]);

  // Remote control state
  const [controlState, setControlState] = useState<ControlState>('NONE');

  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // WebSocket reference & Fresh State Refs to eliminate closure stale state
  const wsClientRef = useRef<RoomWebSocketClient | null>(null);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  const guestIdRef = useRef(guestId);
  guestIdRef.current = guestId;

  const onWebSocketEventRef = useRef<(event: WebSocketEvent) => void>(() => {});

  // Handle URL hash on load (e.g., #room=2eb8a8)
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/room=([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const targetRoomId = match[1];
      setInitialRoomId(targetRoomId);

      roomApi.getRoom(targetRoomId)
        .then((room) => {
          // Check if current user is the host and has saved session token
          const hostToken = getHostToken(targetRoomId);
          const savedLiveKitToken = getLiveKitToken(targetRoomId);
          if (hostToken && savedLiveKitToken) {
            setIsHost(true);
            setCurrentRoom(room);
            setLiveKitToken(savedLiveKitToken);
          }
        })
        .catch(() => {
          // Room not found or expired; stay on landing page
        });
    }
  }, []);

  // Dedicated WebSocket lifecycle tied to current active room
  useEffect(() => {
    if (!currentRoom?.roomId) {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      return;
    }

    console.log(`[FunTouch WebSocket] Connecting to room topic: /topic/room/${currentRoom.roomId}`);
    const client = new RoomWebSocketClient(currentRoom.roomId, (event) => {
      onWebSocketEventRef.current(event);
    });
    client.connect();
    wsClientRef.current = client;

    return () => {
      client.disconnect();
      wsClientRef.current = null;
    };
  }, [currentRoom?.roomId]);

  // Window message listener for extension stop control
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data?.source === 'FUNTOUCH_EXTENSION_STOP_CONTROL') {
        setControlState('REVOKED');
      }
    };
    window.addEventListener('message', handleWindowMessage);

    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // WebSocket event handler (always reads latest state via refs)
  onWebSocketEventRef.current = (event: WebSocketEvent) => {
    console.log('[Room Event Received]:', event);

    switch (event.eventType) {
      case 'GUEST_JOINED': {
        const isCurrentHost = isHostRef.current || (currentRoomRef.current && !!getHostToken(currentRoomRef.current.roomId));
        if (isCurrentHost && event.participantId && event.participantName) {
          console.log(`[FunTouch Lobby] Host received join request from: ${event.participantName} (${event.participantId})`);
          setPendingGuests((prev) => [
            ...prev.filter((g) => g.id !== event.participantId),
            { id: event.participantId!, name: event.participantName! },
          ]);
        }
        break;
      }

      case 'GUEST_APPROVED':
        // If this guest was approved, take their token and enter the call
        if (!isHostRef.current && event.guestToken) {
          if (!guestIdRef.current || !event.participantId || event.participantId === guestIdRef.current) {
            console.log('[FunTouch Lobby] Guest approved! Entering video room...');
            setLiveKitToken(event.guestToken);
            setIsWaitingApproval(false);
          }
        }
        // Remove from host's pending list
        if (event.participantId) {
          setPendingGuests((prev) => prev.filter((g) => g.id !== event.participantId));
        }
        break;

      case 'GUEST_REJECTED':
        if (!isHostRef.current) {
          if (!guestIdRef.current || !event.participantId || event.participantId === guestIdRef.current) {
            setIsWaitingApproval(false);
            setError('The host declined your join request.');
            setCurrentRoom(null);
          }
        }
        if (event.participantId) {
          setPendingGuests((prev) => prev.filter((g) => g.id !== event.participantId));
        }
        break;

      case 'CONTROL_GRANTED':
        setControlState('GRANTED');
        break;

      case 'CONTROL_REVOKED':
        setControlState('REVOKED');
        break;

      case 'ROOM_ENDED':
        alert('This call has been ended by the host.');
        handleLeaveCall();
        break;
    }
  };

  // Start Call (Host)
  const handleStartCall = async (hostName: string, roomName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { room } = await roomApi.createRoom({ hostName, roomName });
      setIsHost(true);
      setCurrentRoom(room);
      setLiveKitToken(room.token);

      window.location.hash = `room=${room.roomId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  // Join Call (Guest)
  const handleJoinCall = async (roomId: string, guestName: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch room info
      const room = await roomApi.getRoom(roomId);
      setIsHost(false);
      setCurrentRoom(room);

      // 2. Submit join request to backend (notifies host over WebSocket)
      const joinRes = await roomApi.joinRoom(roomId, { guestName });
      setGuestId(joinRes.guestId);
      setIsWaitingApproval(true);

      window.location.hash = `room=${roomId}`;
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  // Host: Approve Guest
  const handleApproveGuest = async (id: string) => {
    if (!currentRoom) return;
    try {
      await roomApi.approveGuest(currentRoom.roomId, { guestId: id });
      setPendingGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      console.error('Approve failed:', err);
    }
  };

  // Host: Reject Guest
  const handleRejectGuest = async (id: string) => {
    if (!currentRoom) return;
    try {
      await roomApi.rejectGuest(currentRoom.roomId, id);
      setPendingGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      console.error('Reject failed:', err);
    }
  };

  // Host: Toggle Remote Control for Guests
  const handleToggleControl = async () => {
    if (!currentRoom || !isHost) return;
    const targetAction = controlState === 'GRANTED' ? 'revoke' : 'grant';

    // In 1:1 calls, control applies to the first guest
    const targetGuest = currentRoom.guests[0]?.guestId || pendingGuests[0]?.id;
    if (!targetGuest && targetAction === 'grant') {
      alert('No guest is currently connected to receive control.');
      return;
    }

    try {
      await roomApi.updateControl(currentRoom.roomId, {
        guestId: targetGuest || 'all',
        action: targetAction,
      });
      setControlState(targetAction === 'grant' ? 'GRANTED' : 'REVOKED');

      // Notify FunTouch Chrome Extension
      window.postMessage(
        {
          source: 'FUNTOUCH_HOST_CONTROL_STATE',
          action: targetAction,
          guestName: currentRoom.guests[0]?.displayName || pendingGuests[0]?.name || 'Guest',
        },
        '*'
      );
    } catch (err: any) {
      console.error('Update control failed:', err);
    }
  };

  // Leave / End Call
  const handleLeaveCall = async () => {
    // 1. Immediately terminate all camera, mic, and screen share hardware tracks
    stopAllLocalMedia();

    if (currentRoom && isHost) {
      try {
        await roomApi.endRoom(currentRoom.roomId);
      } catch (err) {
        console.error('End room failed:', err);
      }
    }

    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }

    setCurrentRoom(null);
    setLiveKitToken(null);
    setIsHost(false);
    setIsWaitingApproval(false);
    setPendingGuests([]);
    setControlState('NONE');
    setGuestId(null);
    window.location.hash = '';
  };

  // If not inside an active call, show Landing Page
  if (!currentRoom || !liveKitToken) {
    return (
      <>
        <LandingPage
          onStartCall={handleStartCall}
          onJoinCall={handleJoinCall}
          loading={loading}
          error={error}
          initialRoomId={initialRoomId}
        />
        <LobbyModal
          isHost={isHost}
          pendingGuests={pendingGuests}
          onApprove={handleApproveGuest}
          onReject={handleRejectGuest}
          isWaitingApproval={isWaitingApproval}
          onCancelJoin={handleLeaveCall}
        />
      </>
    );
  }

  // Active LiveKit Room Call View
  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={liveKitToken}
      connect={true}
      audio={!isMuted}
      video={!isVideoOff}
      className="min-h-screen bg-[#060913] flex flex-col justify-between overflow-hidden relative"
    >
      {/* Dynamic Animated Ambient Background with Logo Colors */}
      <AnimatedBackground subtle={true} />

      {/* Top Header */}
      <header className="px-6 py-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 shadow-md z-30">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="FunTouch" className="h-8 w-auto object-contain" />
          <div className="flex items-center text-base font-black tracking-tight font-sans select-none">
            <span className="text-[#FF7A00]">Fun</span>
            <span className="text-[#0088FF]">Touch</span>
          </div>
          <span className="text-slate-600 text-xs">|</span>
          <span className="font-medium text-slate-300 text-xs truncate max-w-[150px]">
            {currentRoom.roomName || 'Active Call'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            {isHost ? 'Host' : 'Guest'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-slate-400">Connected</span>
        </div>
      </header>

      {/* Main Video & Screen Sharing Stage */}
      <main className="flex-1 flex items-center justify-center relative">
        <VideoStage
          isHost={isHost}
          controlState={controlState}
          roomId={currentRoom.roomId}
        />
      </main>

      {/* Bottom Control Bar */}
      <ControlBar
        isHost={isHost}
        controlState={controlState}
        guestCount={currentRoom.guests.length}
        roomId={currentRoom.roomId}
        onToggleControl={isHost ? handleToggleControl : undefined}
        onEndCall={handleLeaveCall}
      />

      {/* Host Incoming Join Requests Popup */}
      <LobbyModal
        isHost={isHost}
        pendingGuests={pendingGuests}
        onApprove={handleApproveGuest}
        onReject={handleRejectGuest}
        isWaitingApproval={isWaitingApproval}
        onCancelJoin={handleLeaveCall}
      />

      {/* Automatic Audio Playback */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
