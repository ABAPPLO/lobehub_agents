import type { A2ARelayConfig } from '@lobechat/types';

import type { RelayClientMessage, RelayServerMessage } from './protocol';
import { parseRelayMessage, serializeRelayMessage } from './protocol';

export type RelayLogger = (...args: any[]) => void;

export type RelayConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface RelayConnectionCallbacks {
  onMessage: (msg: RelayServerMessage) => void;
  onStatusChange: (status: RelayConnectionStatus) => void;
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

const noop: RelayLogger = () => {};

/**
 * Manages a persistent outbound WebSocket connection to an external platform relay.
 *
 * Based on the QQ Gateway pattern (packages/chat-adapter-qq/src/gateway.ts):
 * - Heartbeat with ACK tracking
 * - Exponential backoff reconnection
 * - Automatic re-registration after reconnect
 */
export class AgentRelayConnection {
  private readonly groupId: string;
  private readonly config: A2ARelayConfig;
  private readonly callbacks: RelayConnectionCallbacks;
  private readonly log: RelayLogger;

  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatAcked = true;
  private reconnectAttempts = 0;
  private closed = false;
  private status: RelayConnectionStatus = 'disconnected';

  constructor(
    groupId: string,
    config: A2ARelayConfig,
    callbacks: RelayConnectionCallbacks,
    log?: RelayLogger,
  ) {
    this.groupId = groupId;
    this.config = config;
    this.callbacks = callbacks;
    this.log = log ?? noop;
  }

  async connect(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('Relay endpoint not configured');
    }

    this.closed = false;
    this.setStatus('connecting');

    return this.openConnection();
  }

  disconnect(): void {
    this.closed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client shutdown');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  send(message: RelayClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serializeRelayMessage(message));
    } else {
      this.log('Cannot send — WebSocket not open (state=%d)', this.ws?.readyState);
    }
  }

  getStatus(): RelayConnectionStatus {
    return this.status;
  }

  // ---------- Connection ----------

  private openConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.closed) {
        resolve();
        return;
      }

      const url = this.config.endpoint!;
      const ws = new WebSocket(url);
      this.ws = ws;

      let resolved = false;

      ws.addEventListener('open', () => {
        this.log('WebSocket connected to %s', url);
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
        resolved = true;
        resolve();
      });

      ws.addEventListener('message', (event) => {
        // Any incoming message means the connection is alive
        this.heartbeatAcked = true;

        const data =
          typeof event.data === 'string'
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);

        const msg = parseRelayMessage(data);
        if (!msg) {
          this.log('Failed to parse relay message: %s', data);
          return;
        }

        if (msg.type === 'pong') {
          // Response to our heartbeat ping — already marked alive above
          return;
        }

        this.callbacks.onMessage(msg);
      });

      ws.addEventListener('close', (event) => {
        this.log('WebSocket closed: code=%d reason=%s', event.code, event.reason);
        this.stopHeartbeat();

        if (!resolved) {
          resolved = true;
          reject(new Error(`WebSocket closed before open: code=${event.code}`));
        }

        if (!this.closed) {
          this.attemptReconnect();
        }
      });

      ws.addEventListener('error', () => {
        this.log('WebSocket error');
        if (!resolved) {
          resolved = true;
          this.setStatus('error');
          reject(new Error('WebSocket connection failed'));
        }
      });
    });
  }

  // ---------- Heartbeat ----------

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatAcked = true;

    this.heartbeatTimer = setInterval(() => {
      if (this.closed) {
        this.stopHeartbeat();
        return;
      }

      if (!this.heartbeatAcked) {
        this.log('Heartbeat ACK missed — zombie connection, reconnecting');
        this.ws?.close(4000, 'Heartbeat timeout');
        return;
      }

      this.heartbeatAcked = false;
      this.send({ type: 'ping' });

      // Set ACK timeout
      setTimeout(() => {
        if (!this.heartbeatAcked && !this.closed) {
          this.log('Heartbeat ACK timeout — reconnecting');
          this.ws?.close(4000, 'Heartbeat ACK timeout');
        }
      }, HEARTBEAT_ACK_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ---------- Reconnection ----------

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.log('Max reconnect attempts reached (%d), giving up', MAX_RECONNECT_ATTEMPTS);
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY_MS,
    );

    this.log(
      'Reconnecting in %dms (attempt %d/%d)',
      delay,
      this.reconnectAttempts,
      MAX_RECONNECT_ATTEMPTS,
    );

    this.setStatus('connecting');

    setTimeout(() => {
      if (this.closed) return;

      this.openConnection().catch((err) => {
        this.log('Reconnect failed: %O', err);
      });
    }, delay);
  }

  // ---------- Status ----------

  private setStatus(status: RelayConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange(status);
    }
  }
}
