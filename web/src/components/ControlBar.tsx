import React, { useState } from 'react';
import {
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Copy,
  Check,
  MousePointer,
  Users,
} from 'lucide-react';
import { ControlState } from '../types';

interface ControlBarProps {
  isHost: boolean;
  controlState: ControlState;
  guestCount?: number;
  roomId: string;
  onToggleControl?: () => void;
  onEndCall: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isHost,
  controlState,
  roomId,
  onToggleControl,
  onEndCall,
}) => {
  const [copied, setCopied] = useState(false);
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const participants = useParticipants();

  const copyRoomLink = () => {
    const url = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.warn('[FunTouch] Mic toggle error:', err);
    }
  };

  const handleToggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.warn('[FunTouch] Camera toggle error:', err);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
          systemAudio: 'include',
        });
      }
    } catch (err: any) {
      console.warn('[FunTouch] Screen share toggle error:', err);
    }
  };

  const isControlGranted = controlState === 'GRANTED';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl flex items-center justify-between">
        {/* Left: Room info & participant count */}
        <div className="flex items-center space-x-3">
          <button
            onClick={copyRoomLink}
            title="Copy invitation link"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-xs font-medium text-slate-300 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : `Room ${roomId}`}</span>
          </button>
          <div
            title={`${participants.length} connected in room`}
            className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-700/40"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{participants.length}</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">online</span>
          </div>
        </div>

        {/* Center: Core Call Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Microphone */}
          <button
            onClick={handleToggleMic}
            title={!isMicrophoneEnabled ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-3 rounded-xl transition ${
              !isMicrophoneEnabled
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {!isMicrophoneEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={handleToggleCamera}
            title={!isCameraEnabled ? 'Turn camera on' : 'Turn camera off'}
            className={`p-3 rounded-xl transition ${
              !isCameraEnabled
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {!isCameraEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            title={isScreenShareEnabled ? 'Stop screen share' : 'Share tab or screen'}
            className={`p-3 rounded-xl transition ${
              isScreenShareEnabled
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* Remote Control Toggle (Host or Screen Sharer) */}
          {onToggleControl && (
            <button
              onClick={onToggleControl}
              title={isControlGranted ? 'Revoke remote control' : 'Allow touch & click on shared screen'}
              className={`p-3 rounded-xl transition flex items-center space-x-1.5 ${
                isControlGranted
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-400 animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MousePointer className="w-5 h-5" />
              <span className="text-xs hidden md:inline">
                {isControlGranted ? 'Control Active' : 'Allow Control'}
              </span>
            </button>
          )}
        </div>

        {/* Right: Leave / End Call */}
        <div>
          <button
            onClick={onEndCall}
            title={isHost ? 'End call for all' : 'Leave call'}
            className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition flex items-center space-x-2"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">
              {isHost ? 'End Call' : 'Leave'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
