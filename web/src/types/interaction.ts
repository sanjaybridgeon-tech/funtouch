export type InteractionMessageType = 'cursor' | 'click' | 'scroll';

export interface RemoteCursorEvent {
  type: 'cursor';
  x: number; // 0.0 to 1.0 (relative to video width)
  y: number; // 0.0 to 1.0 (relative to video height)
  guestId: string;
  guestName: string;
  color?: string;
  timestamp: number;
}

export interface RemoteClickEvent {
  type: 'click';
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  guestId: string;
  guestName: string;
  timestamp: number;
}

export interface RemoteScrollEvent {
  type: 'scroll';
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  guestId: string;
  guestName: string;
  timestamp: number;
}

export type InteractionMessage = RemoteCursorEvent | RemoteClickEvent | RemoteScrollEvent;

export interface ClickRipple {
  id: string;
  x: number;
  y: number;
  color: string;
}

