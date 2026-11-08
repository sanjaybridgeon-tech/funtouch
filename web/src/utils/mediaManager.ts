// FunTouch Media Hardware Lifecycle Manager
// Ensures camera, microphone, and screen share hardware tracks are completely
// stopped and released when calls end, turning off the physical camera & mic indicator lights.

import { useState, useEffect } from 'react';

type MediaListener = () => void;

class MediaStateManager {
  private activeStreams = new Set<MediaStream>();
  private cameraStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private listeners = new Set<MediaListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.stopAll());
      window.addEventListener('pagehide', () => this.stopAll());
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: MediaListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot() {
    return {
      cameraStream: this.cameraStream,
      screenStream: this.screenStream,
      isCameraActive: !!this.cameraStream && this.cameraStream.getVideoTracks().some(t => t.readyState === 'live'),
      isMicActive: !!this.micStream && this.micStream.getAudioTracks().some(t => t.readyState === 'live'),
      isScreenActive: !!this.screenStream && this.screenStream.getVideoTracks().some(t => t.readyState === 'live'),
    };
  }

  public registerStream(stream: MediaStream): MediaStream {
    this.activeStreams.add(stream);

    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (stream.getTracks().every((t) => t.readyState === 'ended')) {
          this.activeStreams.delete(stream);
          if (this.cameraStream === stream) this.cameraStream = null;
          if (this.micStream === stream) this.micStream = null;
          if (this.screenStream === stream) this.screenStream = null;
          this.notify();
        }
      });
    });

    return stream;
  }

  public async startCamera(): Promise<MediaStream | null> {
    try {
      if (this.cameraStream && this.cameraStream.getVideoTracks().some(t => t.readyState === 'live')) {
        return this.cameraStream;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      this.cameraStream = this.registerStream(stream);
      this.notify();
      return stream;
    } catch (err) {
      console.error('[FunTouch Media] Failed to start camera:', err);
      throw err;
    }
  }

  public stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getVideoTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('[FunTouch Media] Error stopping video track:', e);
        }
      });
      this.activeStreams.delete(this.cameraStream);
      this.cameraStream = null;
      this.notify();
    }
  }

  public async startMic(): Promise<MediaStream | null> {
    try {
      if (this.micStream && this.micStream.getAudioTracks().some(t => t.readyState === 'live')) {
        return this.micStream;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = this.registerStream(stream);
      this.notify();
      return stream;
    } catch (err) {
      console.error('[FunTouch Media] Failed to start microphone:', err);
      throw err;
    }
  }

  public stopMic(): void {
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('[FunTouch Media] Error stopping audio track:', e);
        }
      });
      this.activeStreams.delete(this.micStream);
      this.micStream = null;
      this.notify();
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (this.screenStream && this.screenStream.getVideoTracks().some(t => t.readyState === 'live')) {
        return this.screenStream;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      this.screenStream = this.registerStream(stream);

      // Listen for browser native "Stop sharing" bar click
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          this.screenStream = null;
          this.notify();
        });
      });

      this.notify();
      return stream;
    } catch (err) {
      console.error('[FunTouch Media] Failed to start screen share:', err);
      throw err;
    }
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('[FunTouch Media] Error stopping screen track:', e);
        }
      });
      this.activeStreams.delete(this.screenStream);
      this.screenStream = null;
      this.notify();
    }
  }

  public stopAll(): void {
    console.log(`[FunTouch Media] Releasing all media hardware tracks (${this.activeStreams.size} active)...`);

    this.activeStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log(`[FunTouch Media] Stopped ${track.kind} track "${track.label}"`);
        } catch (err) {
          console.warn('[FunTouch Media] Error stopping track:', err);
        }
      });
    });

    this.activeStreams.clear();
    this.cameraStream = null;
    this.micStream = null;
    this.screenStream = null;
    this.notify();
  }
}

export const mediaManager = new MediaStateManager();

export const registerStream = (stream: MediaStream) => mediaManager.registerStream(stream);
export const stopAllLocalMedia = () => mediaManager.stopAll();

/**
 * React hook to bind components directly to camera, mic, and screen share state.
 */
export const useLocalMediaStreams = () => {
  const [snapshot, setSnapshot] = useState(() => mediaManager.getSnapshot());

  useEffect(() => {
    const unsubscribe = mediaManager.subscribe(() => {
      setSnapshot(mediaManager.getSnapshot());
    });
    return unsubscribe;
  }, []);

  return snapshot;
};
