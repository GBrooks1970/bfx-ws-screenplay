/**
 * Test doubles for the Node driver's injected seam (CODEX-07). A fake socket and
 * a controllable fake clock let the open/poll/close lifecycle run deterministically
 * with no real socket and no wall-clock waiting. Not a `*.test.ts`, so the
 * discovery shim does not load it as a suite — it is imported by
 * `driver-lifecycle.test.ts`.
 */
import { __setDriverDeps, type DriverClock, type DriverSocket } from '../../../node-driver/driver';

/** ws readyState values (WebSocket.OPEN === 1, CLOSED === 3). */
export const SOCKET_OPEN = 1;
export const SOCKET_CLOSED = 3;

type Listener = (arg?: unknown) => void;

/** A hand-driven socket: `emit` delivers the events the driver listens for. */
export class FakeSocket implements DriverSocket {
  readyState = SOCKET_OPEN;
  sent: string[] = [];
  terminated = false;
  closed = false;
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: (arg?: unknown) => void): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(listener);
    this.listeners.set(event, existing);
  }

  emit(event: string, arg?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(arg);
    }
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = SOCKET_CLOSED;
  }

  terminate(): void {
    this.terminated = true;
    this.readyState = SOCKET_CLOSED;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

type PendingTimer = { at: number; callback: () => void; cancelled: boolean; fired: boolean };

/**
 * A fake clock. `sleep` (the poll loop's back-off) auto-advances time and
 * resolves, so a poll loop terminates deterministically and instantly; `advance`
 * fires any due timer (e.g. the connect-timeout) on demand.
 */
export class FakeClock implements DriverClock {
  private time = 0;
  private timers: PendingTimer[] = [];

  now(): number {
    return this.time;
  }

  setTimer(callback: () => void, ms: number): () => void {
    const timer: PendingTimer = { at: this.time + ms, callback, cancelled: false, fired: false };
    this.timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }

  sleep(ms: number): Promise<void> {
    this.advance(ms);
    return Promise.resolve();
  }

  /** Advance time and fire any timer whose deadline has passed. */
  advance(ms: number): void {
    this.time += ms;
    for (const timer of this.timers) {
      if (!timer.cancelled && !timer.fired && timer.at <= this.time) {
        timer.fired = true;
        timer.callback();
      }
    }
  }
}

export type FakeDriverEnv = {
  clock: FakeClock;
  sockets: FakeSocket[];
  /** The socket created by the most recent `open()` call. */
  lastSocket(): FakeSocket;
};

/**
 * Installs fake socket/clock/uuid deps and returns a controller. Each `open()`
 * creates a fresh `FakeSocket` (captured in `sockets`); connection ids are a
 * deterministic counter so sessions stay distinct.
 */
export function installFakeDriverEnv(): FakeDriverEnv {
  const clock = new FakeClock();
  const sockets: FakeSocket[] = [];
  let counter = 0;
  __setDriverDeps({
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    clock,
    uuid: () => `conn-${(counter += 1)}`,
  });
  return {
    clock,
    sockets,
    lastSocket: () => {
      const socket = sockets[sockets.length - 1];
      if (!socket) {
        throw new Error('no socket created yet — call open() first');
      }
      return socket;
    },
  };
}

/** A schema-valid platform info event, as a raw JSON string (what a socket delivers). */
export function infoFrameRaw(status = 1): string {
  return JSON.stringify({ event: 'info', version: 2, platform: { status } });
}
