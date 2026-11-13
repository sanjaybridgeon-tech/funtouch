import React, { useRef, useState } from 'react';
import {
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useParticipants,
  isTrackReference,
  TrackReference,
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import {
  MousePointer,
  Sparkles,
  MicOff,
  Hand,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ControlState } from '../types';
import { RemoteCursorOverlay } from './RemoteCursorOverlay';
import { useRemoteInteraction } from '../hooks/useRemoteInteraction';

interface VideoStageProps {
  isHost: boolean;
  controlState: ControlState;
  onSetControlState?: (state: ControlState) => void;
  roomId?: string;
}

export const VideoStage: React.FC<VideoStageProps> = ({
  isHost,
  controlState,
  onSetControlState,
  roomId = 'default',
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [copied, setCopied] = useState(false);

  // Incoming control request state (for the person sharing their screen)
  const [pendingRequest, setPendingRequest] = useState<{ id: string; name: string } | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  // Query all camera and screen share tracks from LiveKit room
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && isTrackReference(t)
  ) as TrackReference | undefined;

  const hasScreenShare = !!screenShareTrack;
  const isScreenOwner = screenShareTrack?.participant.isLocal || false;
  const sharerName = screenShareTrack?.participant.name || screenShareTrack?.participant.identity || 'Participant';

  const isControlActive = controlState === 'GRANTED';

  // Remote WebRTC & BroadcastChannel interaction hook
  const {
    remoteCursors,
    clickRipples,
    sendCursor,
    sendClick,
    sendScroll,
    sendRequestControl,
    broadcastControlState,
  } = useRemoteInteraction({
    isHost,
    canControl: isControlActive && !isScreenOwner,
    isScreenOwner,
    participantId: localParticipant.identity,
    participantName: localParticipant.name || localParticipant.identity || (isHost ? 'Host' : 'Guest'),
    roomId,
    onRequestControl: (guestId, guestName) => {
      setPendingRequest({ id: guestId, name: guestName });
    },
    onControlState: (action) => {
      onSetControlState?.(action === 'grant' ? 'GRANTED' : 'REVOKED');
    },
  });

  // Normalized coordinate helper for remote interaction
  const getRelativeCoordinates = (clientX: number, clientY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Pointer move (throttled 30 fps)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScreenOwner || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    sendCursor(x, y);
  };

  // Pointer down / click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScreenOwner || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    const button = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    sendClick(x, y, button);
  };

  // Mouse wheel scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isScreenOwner || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    sendScroll(x, y, e.deltaX, e.deltaY);
  };

  // Handle Request Control button click (viewer requesting permission)
  const handleSendRequest = () => {
    sendRequestControl();
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 5000);
  };

  // Screen Owner approves control request
  const handleApproveRequest = () => {
    broadcastControlState('grant');
    onSetControlState?.('GRANTED');
    setPendingRequest(null);
  };

  // Screen Owner declines control request
  const handleDeclineRequest = () => {
    setPendingRequest(null);
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to find camera track reference for a given participant
  const getCameraTrack = (p: Participant): TrackReference | undefined => {
    return tracks.find(
      (t) => t.participant.identity === p.identity && t.source === Track.Source.Camera && isTrackReference(t)
    ) as TrackReference | undefined;
  };

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] flex flex-col p-4">
      {/* ── Banners & Notifications ───────────────────────────────────── */}

      {/* Screen Sharer: Notification when another participant requests control */}
      {isScreenOwner && pendingRequest && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/80 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-top-4">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
            ✋
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-white">Remote Control Request</p>
            <p className="text-xs text-slate-300">
              <span className="text-amber-400 font-semibold">{pendingRequest.name}</span> wants to interact with your shared screen
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleApproveRequest}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition shadow"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Allow</span>
            </button>
            <button
              onClick={handleDeclineRequest}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Viewer: Active Screen Control Banner */}
      {!isScreenOwner && hasScreenShare && isControlActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold px-5 py-1.5 rounded-full shadow-xl flex items-center space-x-2 text-xs">
          <MousePointer className="w-4 h-4 animate-bounce" />
          <span>Interactive Touch Enabled — Click, scroll, and type on the screen</span>
        </div>
      )}

      {/* ── Main Stage Area ───────────────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-950/80 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        {hasScreenShare ? (
          /* ── Screen Share Mode (Shared Screen is the MAIN STAGE) ────── */
          <div
            ref={stageRef}
            onPointerMove={!isScreenOwner && isControlActive ? handlePointerMove : undefined}
            onPointerDown={!isScreenOwner && isControlActive ? handlePointerDown : undefined}
            onWheel={!isScreenOwner && isControlActive ? handleWheel : undefined}
            onContextMenu={!isScreenOwner && isControlActive ? (e) => e.preventDefault() : undefined}
            className={`relative w-full h-full flex items-center justify-center bg-slate-950 ${
              !isScreenOwner && isControlActive ? 'cursor-crosshair' : ''
            }`}
          >
            {/* The Shared Screen Video Track */}
            <VideoTrack
              trackRef={screenShareTrack}
              className="w-full h-full object-contain pointer-events-none select-none"
            />

            {/* Screen Sharer sees remote guest cursors & click ripples */}
            {isScreenOwner && (
              <RemoteCursorOverlay cursors={remoteCursors} ripples={clickRipples} />
            )}

            {/* Top Badge: Showing who is sharing */}
            <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium flex items-center space-x-2 pointer-events-none select-none z-20 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>{isScreenOwner ? 'You are sharing your screen' : `${sharerName}'s Shared Screen`}</span>
            </div>

            {/* Viewer: Request Control Button (when control is not yet active) */}
            {!isScreenOwner && !isControlActive && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <button
                  onClick={handleSendRequest}
                  disabled={requestSent}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-xl shadow-orange-500/25 transition active:scale-95 disabled:opacity-75"
                >
                  <Hand className="w-4 h-4" />
                  <span>{requestSent ? 'Request Sent — Waiting for sharer...' : 'Request Touch Control'}</span>
                </button>
              </div>
            )}

            {/* Viewer: Interaction hint badge when control is active */}
            {!isScreenOwner && isControlActive && (
              <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-xs text-amber-300 flex items-center space-x-1.5 pointer-events-none select-none z-30 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Click thumbnails, links, or scroll freely</span>
              </div>
            )}

            {/* ── PiP Floating Webcam Feeds (corner tiles during screen share) ── */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2.5 z-30 pointer-events-none">
              {participants.map((p) => {
                const camTrack = getCameraTrack(p);
                const isCamOn = p.isCameraEnabled && !p.getTrackPublication(Track.Source.Camera)?.isMuted;
                const displayName = p.isLocal ? 'You' : p.name || p.identity;

                return (
                  <div
                    key={p.identity}
                    className="w-36 h-24 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800/90 shadow-2xl relative pointer-events-auto"
                  >
                    {isCamOn && camTrack ? (
                      <VideoTrack
                        trackRef={camTrack}
                        className={`w-full h-full object-cover ${p.isLocal ? 'scale-x-[-1]' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white shadow">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Camera Off</span>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-slate-950/85 px-2 py-0.5 rounded text-[10px] text-white font-medium flex items-center space-x-1">
                      <span className="truncate max-w-[80px]">{displayName}</span>
                      {!p.isMicrophoneEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Camera Grid Mode (Default: Both participants see each other) ── */
          <div className="w-full h-full p-4 flex items-center justify-center">
            {participants.length >= 2 ? (
              /* Two-person split view */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-w-6xl">
                {participants.map((p) => {
                  const camTrack = getCameraTrack(p);
                  const isCamOn = p.isCameraEnabled && !p.getTrackPublication(Track.Source.Camera)?.isMuted;
                  const displayName = p.isLocal
                    ? `You (${isHost ? 'Host' : 'Guest'})`
                    : `${p.name || p.identity} (${isHost ? 'Guest' : 'Host'})`;

                  return (
                    <div
                      key={p.identity}
                      className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xl aspect-video md:aspect-auto"
                    >
                      {isCamOn && camTrack ? (
                        <VideoTrack
                          trackRef={camTrack}
                          className={`w-full h-full object-cover ${p.isLocal ? 'scale-x-[-1]' : ''}`}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 to-blue-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-2xl mb-3">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-white">{displayName}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Camera Off</span>
                        </div>
                      )}
                      {/* Name & status badge */}
                      <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-slate-800/80 shadow-lg flex items-center space-x-2">
                        <span>{displayName}</span>
                        {!p.isMicrophoneEnabled && (
                          <span className="text-rose-400 flex items-center" title="Muted">
                            <MicOff className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single person in room (waiting for partner) */
              <div className="w-full h-full max-w-2xl flex flex-col items-center justify-center">
                {participants.map((p) => {
                  const camTrack = getCameraTrack(p);
                  const isCamOn = p.isCameraEnabled && !p.getTrackPublication(Track.Source.Camera)?.isMuted;

                  return (
                    <div
                      key={p.identity}
                      className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl w-full aspect-video"
                    >
                      {isCamOn && camTrack ? (
                        <VideoTrack
                          trackRef={camTrack}
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl mb-3">
                            {(p.name || p.identity || 'You').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-white">You ({isHost ? 'Host' : 'Guest'})</span>
                          <span className="text-xs text-slate-400 mt-0.5">Camera is active</span>
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-slate-800 shadow flex items-center space-x-2">
                        <span>You ({isHost ? 'Host' : 'Guest'})</span>
                      </div>
                    </div>
                  );
                })}

                {/* Waiting & invitation card */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-4 shadow-xl">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Waiting for the other person to join</p>
                    <p className="text-[11px] text-slate-400">Share your room link so they can enter the call</p>
                  </div>
                  <button
                    onClick={copyRoomLink}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-400 text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Link!' : `Copy Link (#${roomId})`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
