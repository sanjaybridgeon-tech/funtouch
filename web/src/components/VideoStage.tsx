import React, { useRef } from 'react';
import {
  TrackRefContext,
  VideoTrack,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { MousePointer, MonitorPlay, Sparkles } from 'lucide-react';
import { ControlState } from '../types';
import { RemoteCursorOverlay } from './RemoteCursorOverlay';
import { useRemoteInteraction } from '../hooks/useRemoteInteraction';
import { useLocalMediaStreams } from '../utils/mediaManager';

interface VideoStageProps {
  isHost: boolean;
  controlState: ControlState;
  roomId?: string;
}

export const VideoStage: React.FC<VideoStageProps> = ({
  isHost,
  controlState,
  roomId = 'default',
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const { localParticipant } = useLocalParticipant();
  const { cameraStream, screenStream } = useLocalMediaStreams();

  const isControlActive = controlState === 'GRANTED';

  // Remote WebRTC & Local BroadcastChannel interaction hook
  const {
    remoteCursors,
    clickRipples,
    sendCursor,
    sendClick,
    sendScroll,
  } = useRemoteInteraction({
    isHost,
    canControl: isControlActive,
    participantId: localParticipant.identity,
    participantName: localParticipant.name || localParticipant.identity || 'Guest',
    roomId,
  });

  // Query video tracks (camera & screen share) from LiveKit room
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  );

  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera
  );

  const hasScreenShare = !!screenShareTrack || !!screenStream;
  const hasCamera = cameraTracks.length > 0 || !!cameraStream;

  // Normalized coordinate helper
  const getRelativeCoordinates = (clientX: number, clientY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Guest: Pointer move (throttled 30 fps)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isHost || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    sendCursor(x, y);
  };

  // Guest: Pointer down / click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isHost || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    const button = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    sendClick(x, y, button);
  };

  // Guest: Mouse wheel scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isHost || !isControlActive) return;
    const { x, y } = getRelativeCoordinates(e.clientX, e.clientY);
    sendScroll(x, y, e.deltaX, e.deltaY);
  };

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] flex flex-col p-4">
      {/* Remote Control Notification Banner */}
      {isControlActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs animate-bounce">
          <MousePointer className="w-3.5 h-3.5" />
          <span>Interactive Screen Control Active — Touch enabled</span>
        </div>
      )}

      {/* Main Screen Share or Large Active Stage */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-950/80 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        {hasScreenShare ? (
          <div
            ref={stageRef}
            onPointerMove={!isHost && isControlActive ? handlePointerMove : undefined}
            onPointerDown={!isHost && isControlActive ? handlePointerDown : undefined}
            onWheel={!isHost && isControlActive ? handleWheel : undefined}
            onContextMenu={!isHost && isControlActive ? (e) => e.preventDefault() : undefined}
            className={`relative w-full h-full flex items-center justify-center ${
              !isHost && isControlActive ? 'cursor-crosshair' : ''
            }`}
          >
            {screenShareTrack ? (
              <TrackRefContext.Provider value={screenShareTrack}>
                <VideoTrack className="w-full h-full object-contain pointer-events-none select-none" />
              </TrackRefContext.Provider>
            ) : screenStream ? (
              <video
                ref={(el) => {
                  if (el && el.srcObject !== screenStream) {
                    el.srcObject = screenStream;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            ) : null}

            {/* Host sees remote guest cursors & click ripples */}
            {isHost && (
              <RemoteCursorOverlay cursors={remoteCursors} ripples={clickRipples} />
            )}

            {/* Guest interaction hint badge */}
            {!isHost && isControlActive && (
              <div className="absolute bottom-4 right-4 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-amber-300 flex items-center space-x-1.5 pointer-events-none select-none z-30 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Move & click to control the shared screen</span>
              </div>
            )}
          </div>
        ) : hasCamera ? (
          /* When no screen is shared: display camera feeds */
          <div className="w-full h-full p-4 flex items-center justify-center">
            {cameraTracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
                {cameraTracks.map((trackRef) => (
                  <div
                    key={trackRef.participant.identity}
                    className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xl"
                  >
                    <TrackRefContext.Provider value={trackRef}>
                      <VideoTrack className="w-full h-full object-cover" />
                    </TrackRefContext.Provider>
                    <div className="absolute bottom-3 left-3 bg-slate-950 px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800 shadow-md">
                      {trackRef.participant.name || trackRef.participant.identity}
                    </div>
                  </div>
                ))}
              </div>
            ) : cameraStream ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 w-full max-w-3xl aspect-video flex items-center justify-center shadow-2xl">
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== cameraStream) {
                      el.srcObject = cameraStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-3 left-3 bg-slate-950 px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800 shadow-md">
                  {localParticipant.name || localParticipant.identity || (isHost ? 'You (Host)' : 'You (Guest)')}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Empty Room Stage */
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <MonitorPlay className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {isHost ? 'Share your screen or turn on camera' : 'Waiting for host to share...'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHost
                ? 'Click "Share Screen" in the bottom control bar to share a YouTube tab, document, or application.'
                : 'The shared tab or video will appear here as soon as the host begins streaming.'}
            </p>
          </div>
        )}

        {/* Small Webcam Tiles strip (shown when screen sharing is active) */}
        {hasScreenShare && hasCamera && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
            {cameraTracks.length > 0 ? (
              cameraTracks.map((trackRef) => (
                <div
                  key={trackRef.participant.identity}
                  className="w-36 h-24 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800/80 shadow-lg relative"
                >
                  <TrackRefContext.Provider value={trackRef}>
                    <VideoTrack className="w-full h-full object-cover" />
                  </TrackRefContext.Provider>
                  <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-white font-medium">
                    {trackRef.participant.name || trackRef.participant.identity}
                  </div>
                </div>
              ))
            ) : cameraStream ? (
              <div className="w-36 h-24 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-800/80 shadow-lg relative">
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== cameraStream) {
                      el.srcObject = cameraStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-white font-medium">
                  {localParticipant.name || localParticipant.identity || (isHost ? 'You (Host)' : 'You (Guest)')}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
