import React, { useState, useEffect } from 'react';
import {
  useLocalParticipant,
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
import { mediaManager, stopAllLocalMedia, useLocalMediaStreams } from '../utils/mediaManager';

interface ControlBarProps {
  isHost: boolean;
  controlState: ControlState;
  guestCount: number;
  roomId: string;
  onToggleControl?: () => void;
  onEndCall: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isHost,
  controlState,
  guestCount,
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

  const { isCameraActive, isMicActive, isScreenActive } = useLocalMediaStreams();

  // Combine LiveKit state with local media manager state
  const activeCamera = isCameraEnabled || isCameraActive;
  const activeMic = isMicrophoneEnabled || isMicActive;
  const activeScreen = isScreenShareEnabled || isScreenActive;

  // Prompt camera and microphone permissions upon mounting the call
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      // 1. Start local camera hardware
      try {
        await mediaManager.startCamera();
      } catch (e) {
        console.warn('[FunTouch] Initial camera request rejected or unavailable:', e);
      }

      // 2. Start local mic hardware
      try {
        await mediaManager.startMic();
      } catch (e) {
        console.warn('[FunTouch] Initial microphone request rejected or unavailable:', e);
      }

      // 3. Publish to LiveKit if connected
      if (localParticipant) {
        localParticipant.setCameraEnabled(true).catch(() => {});
        localParticipant.setMicrophoneEnabled(true).catch(() => {});
      }
    };

    initMedia();

    // Release all camera and mic hardware when leaving call or unmounting
    return () => {
      mounted = false;
      stopAllLocalMedia();
      if (localParticipant) {
        localParticipant.setCameraEnabled(false).catch(() => {});
        localParticipant.setMicrophoneEnabled(false).catch(() => {});
        localParticipant.setScreenShareEnabled(false).catch(() => {});
      }
    };
  }, [localParticipant]);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleMic = async () => {
    try {
      if (activeMic) {
        mediaManager.stopMic();
        if (localParticipant) {
          await localParticipant.setMicrophoneEnabled(false).catch(() => {});
        }
      } else {
        await mediaManager.startMic();
        if (localParticipant) {
          await localParticipant.setMicrophoneEnabled(true).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[FunTouch] Mic toggle error:', err);
      alert('Microphone access was blocked. Please enable microphone permissions in your browser address bar.');
    }
  };

  const handleToggleCamera = async () => {
    try {
      if (activeCamera) {
        mediaManager.stopCamera();
        if (localParticipant) {
          await localParticipant.setCameraEnabled(false).catch(() => {});
        }
      } else {
        await mediaManager.startCamera();
        if (localParticipant) {
          await localParticipant.setCameraEnabled(true).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[FunTouch] Camera toggle error:', err);
      alert('Camera access was blocked. Please enable camera permissions in your browser address bar.');
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (activeScreen) {
        mediaManager.stopScreenShare();
        if (localParticipant) {
          await localParticipant.setScreenShareEnabled(false).catch(() => {});
        }
      } else {
        await mediaManager.startScreenShare();
        if (localParticipant) {
          await localParticipant.setScreenShareEnabled(true).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[FunTouch] Screen share toggle error:', err);
    }
  };

  const handleEndCallWithCleanup = () => {
    // 1. Immediately kill all hardware tracks (turns off green camera light and orange mic dot)
    stopAllLocalMedia();
    if (localParticipant) {
      localParticipant.setCameraEnabled(false).catch(() => {});
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
      localParticipant.setScreenShareEnabled(false).catch(() => {});
    }
    // 2. Trigger call termination
    onEndCall();
  };

  const isControlGranted = controlState === 'GRANTED';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 shadow-2xl flex items-center justify-between">
        {/* Left: Room info & link */}
        <div className="flex items-center space-x-3">
          <button
            onClick={copyRoomLink}
            title="Copy invitation link"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-xs font-medium text-slate-300 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : `Room ${roomId}`}</span>
          </button>
          <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{guestCount + 1}</span>
          </div>
        </div>

        {/* Center: Core Call Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Microphone */}
          <button
            onClick={handleToggleMic}
            title={!activeMic ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-3 rounded-xl transition ${
              !activeMic
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {!activeMic ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={handleToggleCamera}
            title={!activeCamera ? 'Turn camera on' : 'Turn camera off'}
            className={`p-3 rounded-xl transition ${
              !activeCamera
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {!activeCamera ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share (Host / Participants) */}
          <button
            onClick={handleToggleScreenShare}
            title={activeScreen ? 'Stop screen share' : 'Share tab or screen'}
            className={`p-3 rounded-xl transition ${
              activeScreen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* Remote Control Toggle (Host Only) */}
          {isHost && onToggleControl && (
            <button
              onClick={onToggleControl}
              title={isControlGranted ? 'Revoke remote control' : 'Allow guest to touch screen'}
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
            onClick={handleEndCallWithCleanup}
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
