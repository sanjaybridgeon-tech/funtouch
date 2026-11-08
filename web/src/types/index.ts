export type RoomStatus = 'WAITING' | 'ACTIVE' | 'ENDED';
export type ControlState = 'NONE' | 'REQUESTED' | 'GRANTED' | 'REVOKED';
export type ParticipantRole = 'HOST' | 'GUEST';
export type GuestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface GuestInfo {
  guestId: string;
  displayName: string;
  guestStatus: GuestStatus | null;
  controlState: ControlState | null;
}

export interface RoomResponse {
  roomId: string;
  roomName: string;
  roomUrl: string;
  status: RoomStatus;
  hostName: string;
  guests: GuestInfo[];
  token: string | null;
  createdAt: string;
}

export interface CreateRoomRequest {
  hostName: string;
  roomName?: string;
}

export interface JoinRoomRequest {
  guestName: string;
}

export interface JoinRoomResponse {
  guestId: string;
  roomId: string;
  message: string;
}

export interface ApproveGuestRequest {
  guestId: string;
}

export interface ApproveGuestResponse {
  guestToken: string;
  message: string;
}

export interface ControlRequest {
  guestId: string;
  action: 'grant' | 'revoke';
}

export interface ControlResponse {
  controlState: ControlState;
  controlToken?: string;
  message: string;
}

export interface WebSocketEvent {
  eventType: 'GUEST_JOINED' | 'GUEST_APPROVED' | 'GUEST_REJECTED' | 'CONTROL_GRANTED' | 'CONTROL_REVOKED' | 'ROOM_ENDED';
  roomId: string;
  participantId?: string;
  participantName?: string;
  guestToken?: string;
  controlState?: ControlState;
  roomStatus?: RoomStatus;
  message: string;
}

