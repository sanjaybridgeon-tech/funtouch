import React from 'react';
import { UserCheck, UserX, Loader2, Clock, ShieldAlert } from 'lucide-react';

interface PendingGuest {
  id: string;
  name: string;
}

interface LobbyModalProps {
  isHost: boolean;
  pendingGuests: PendingGuest[];
  onApprove: (guestId: string) => Promise<void>;
  onReject: (guestId: string) => Promise<void>;
  isWaitingApproval: boolean;
  onCancelJoin: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isHost,
  pendingGuests,
  onApprove,
  onReject,
  isWaitingApproval,
  onCancelJoin,
}) => {
  // Guest waiting screen
  if (!isHost && isWaitingApproval) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting for the host</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The host has been notified that you are in the lobby. You will be connected as soon as they let you in.
          </p>
          <div className="flex items-center justify-center space-x-2 text-orange-400 text-sm font-medium mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for host to admit you...</span>
          </div>
          <button
            onClick={onCancelJoin}
            className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    );
  }

  // Host floating notification for incoming join requests
  if (isHost && pendingGuests.length > 0) {
    return (
      <div className="fixed bottom-24 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full animate-in slide-in-from-bottom-5">
        {pendingGuests.map((guest) => (
          <div
            key={guest.id}
            className="bg-slate-900 border border-orange-500/50 rounded-2xl p-4 shadow-2xl flex flex-col space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow">
                {guest.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{guest.name}</p>
                <p className="text-xs text-slate-400">wants to join the call</p>
              </div>
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => onApprove(guest.id)}
                className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Admit</span>
              </button>
              <button
                onClick={() => onReject(guest.id)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

