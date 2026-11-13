export type InteractionMessageType = 'cursor' | 'click' | 'scroll' | 'request_control' | 'control_state';

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

export interface RequestControlEvent {
  type: 'request_control';
  guestId: string;
  guestName: string;
  timestamp: number;
}

export interface ControlStateEvent {
  type: 'control_state';
  action: 'grant' | 'revoke';
  guestId?: string;
  timestamp: number;
}

export type InteractionMessage =
  | RemoteCursorEvent
  | RemoteClickEvent
  | RemoteScrollEvent
  | RequestControlEvent
  | ControlStateEvent;

export interface ClickRipple {
  id: string;
  x: number;
  y: number;
  color: string;
}
