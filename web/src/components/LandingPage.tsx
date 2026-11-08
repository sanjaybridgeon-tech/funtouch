import React, { useState } from 'react';
import { MousePointerClick, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import logo from '../assets/logo.png';
import { AnimatedBackground } from './AnimatedBackground';

interface LandingPageProps {
  onStartCall: (hostName: string, roomName: string) => Promise<void>;
  onJoinCall: (roomId: string, guestName: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCall,
  onJoinCall,
  loading,
  error,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [hostName, setHostName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    await onStartCall(hostName.trim(), roomName.trim());
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !roomId.trim()) return;
    await onJoinCall(roomId.trim(), guestName.trim());
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col justify-between overflow-hidden bg-[#090d16]">
      {/* Professional Brand-Matched Ambient Background */}
      <AnimatedBackground />

      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16]/90 sticky top-0 z-50">
        {/* Brand Logo & Matching Wordmark */}
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="FunTouch"
            className="h-9 w-auto object-contain"
          />
          <div className="flex items-center text-2xl font-black tracking-tight font-sans select-none">
            <span className="text-[#FF7A00]">Fun</span>
            <span className="text-[#0088FF]">Touch</span>
          </div>
        </div>

        {/* LiveKit Status Pill Badge */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium">LiveKit WebRTC &bull; Remote Screen Control</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-14 flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full">
        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Video calls where you can{' '}
          <span className="bg-gradient-to-r from-[#FF7A00] via-[#FFA726] to-[#0088FF] bg-clip-text text-transparent">
            touch the screen
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-5 text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed font-normal">
          Share a browser tab with a single click. Let your friends, clients, or colleagues click, scroll, and type on your shared tab in real time.
        </p>

        {/* Interactive Action Card */}
        <div className="mt-10 w-full max-w-md bg-[#0e1626] border border-slate-800 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7),0_0_40px_-15px_rgba(255,122,0,0.12),0_0_40px_-15px_rgba(0,136,255,0.12)] rounded-2xl relative overflow-hidden text-left transition hover:border-slate-700">
          {/* Top Brand Accent Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-[#FF7A00] via-[#FFA000] to-[#0088FF]" />

          <div className="p-6 sm:p-8">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#090d16] rounded-xl mb-6 border border-slate-800">
              <button
                onClick={() => setMode('create')}
                className={`py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                  mode === 'create'
                    ? 'bg-gradient-to-r from-[#FF7A00] to-[#FF9436] text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Start a Call
              </button>
              <button
                onClick={() => setMode('join')}
                className={`py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                  mode === 'join'
                    ? 'bg-gradient-to-r from-[#0088FF] to-[#00B4D8] text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Call
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm font-medium">
                {error}
              </div>
            )}

            {mode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Your Name (Host)
                  </label>
                  <input
                    type="text"
                    required
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Alice"
                    className="w-full px-4 py-3 bg-[#090d16] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-slate-700 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Room Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. YouTube Party or Code Review"
                    className="w-full px-4 py-3 bg-[#090d16] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/50 focus:border-slate-700 transition font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !hostName.trim()}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#FF7A00] to-[#FF9436] hover:from-[#ff6a00] hover:to-[#ff8800] text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 transition duration-200 active:scale-[0.98]"
                >
                  <span>{loading ? 'Creating Room...' : 'Start New Call'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Your Name (Guest)
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Bob"
                    className="w-full px-4 py-3 bg-[#090d16] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0088FF]/50 focus:border-slate-700 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Room Code
                  </label>
                  <input
                    type="text"
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="e.g. 2eb8a8"
                    className="w-full px-4 py-3 bg-[#090d16] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0088FF]/50 focus:border-slate-700 transition uppercase tracking-widest font-mono font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !guestName.trim() || !roomId.trim()}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#0088FF] to-[#00B4D8] hover:from-[#0077e6] hover:to-[#00a2c7] text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition duration-200 active:scale-[0.98]"
                >
                  <span>{loading ? 'Joining Room...' : 'Ask to Join'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl text-left w-full">
          <div className="p-6 rounded-2xl bg-[#0e1626] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-[#FF7A00] flex items-center justify-center mb-4 border border-orange-500/20">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Interactive Touch & Click</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Guests can click thumbnails, scroll long documents, and type search queries directly on the shared screen.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0e1626] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-[#0088FF] flex items-center justify-center mb-4 border border-blue-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Sub-50ms Low Latency</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Powered by LiveKit WebRTC and real-time data messaging channels for instantaneous audio, video, and control.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0e1626] border border-slate-800/90 hover:border-slate-700 transition-all duration-200 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Strict Host Consent</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Only approved guests can touch the screen. The host holds total authority with instant one-click revocation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-800/80 text-center text-xs text-slate-500 bg-[#090d16] relative z-10">
        <p>FunTouch &copy; 2026 — Interactive Video Calls Backend & WebRTC Frontend.</p>
      </footer>
    </div>
  );
};
