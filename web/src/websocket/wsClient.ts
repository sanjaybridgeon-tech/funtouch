import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketEvent } from '../types';

export class RoomWebSocketClient {
  private client: Client | null = null;
  private roomId: string;
  private onEventCallback: (event: WebSocketEvent) => void;
  private connected: boolean = false;

  constructor(roomId: string, onEvent: (event: WebSocketEvent) => void) {
    this.roomId = roomId;
    this.onEventCallback = onEvent;
  }

  connect(): void {
    if (this.client && this.connected) return;

    // Use SockJS factory for reliable websocket connection with fallback
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.debug('[STOMP]', str);
        }
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      this.connected = true;
      console.log(`[STOMP] Connected. Subscribing to /topic/room/${this.roomId}`);

      this.client?.subscribe(`/topic/room/${this.roomId}`, (message) => {
        try {
          const event: WebSocketEvent = JSON.parse(message.body);
          this.onEventCallback(event);
        } catch (err) {
          console.error('[STOMP] Failed to parse message body:', err);
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      console.log('[STOMP] Disconnected');
    };

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }
}

