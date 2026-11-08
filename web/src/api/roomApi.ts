import {
  CreateRoomRequest,
  RoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ApproveGuestRequest,
  ApproveGuestResponse,
  ControlRequest,
  ControlResponse,
} from '../types';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api/rooms`;

// Helper to get stored host token for a room
export const getHostToken = (roomId: string): string | null => {
  return sessionStorage.getItem(`funtouch_host_token_${roomId}`);
};

export const setHostToken = (roomId: string, token: string): void => {
  sessionStorage.setItem(`funtouch_host_token_${roomId}`, token);
};

export const removeHostToken = (roomId: string): void => {
  sessionStorage.removeItem(`funtouch_host_token_${roomId}`);
};

export const roomApi = {
  // 1. Create Room (POST /api/rooms)
  async createRoom(request: CreateRoomRequest): Promise<{ room: RoomResponse; hostToken: string }> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create room');
    }

    const hostToken = res.headers.get('X-Host-Token') || '';
    const room: RoomResponse = await res.json();

    if (hostToken) {
      setHostToken(room.roomId, hostToken);
    }

    return { room, hostToken };
  },

  // 2. Get Room Info (GET /api/rooms/{id})
  async getRoom(roomId: string): Promise<RoomResponse> {
    const res = await fetch(`${API_BASE}/${roomId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Room not found');
    }
    return res.json();
  },

  // 3. Guest Join (POST /api/rooms/{id}/join)
  async joinRoom(roomId: string, request: JoinRoomRequest): Promise<JoinRoomResponse> {
    const res = await fetch(`${API_BASE}/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to join room');
    }

    return res.json();
  },

  // 4. Host Approve Guest (POST /api/rooms/{id}/approve)
  async approveGuest(roomId: string, request: ApproveGuestRequest): Promise<ApproveGuestResponse> {
    const hostToken = getHostToken(roomId);
    const res = await fetch(`${API_BASE}/${roomId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to approve guest');
    }

    return res.json();
  },

  // 5. Host Reject Guest (POST /api/rooms/{id}/reject?guestId=...)
  async rejectGuest(roomId: string, guestId: string): Promise<{ message: string }> {
    const hostToken = getHostToken(roomId);
    const res = await fetch(`${API_BASE}/${roomId}/reject?guestId=${encodeURIComponent(guestId)}`, {
      method: 'POST',
      headers: {
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to reject guest');
    }

    return res.json();
  },

  // 6. Host Control (POST /api/rooms/{id}/control)
  async updateControl(roomId: string, request: ControlRequest): Promise<ControlResponse> {
    const hostToken = getHostToken(roomId);
    const res = await fetch(`${API_BASE}/${roomId}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update control permission');
    }

    return res.json();
  },

  // 7. End Room (DELETE /api/rooms/{id})
  async endRoom(roomId: string): Promise<{ message: string }> {
    const hostToken = getHostToken(roomId);
    const res = await fetch(`${API_BASE}/${roomId}`, {
      method: 'DELETE',
      headers: {
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to end room');
    }

    removeHostToken(roomId);
    return res.json();
  },
};

