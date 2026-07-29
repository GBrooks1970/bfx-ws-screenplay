import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { frameMatches } from './predicates';
import type {
  BufferedFrame,
  OpenResult,
  PollOptions,
  PollResult,
  PredicateSpec,
  SendResult,
} from './protocol';

/**
 * Layer 6 — the Node-side WebSocket driver (ADR-001).
 *
 * Every inbound frame is appended to a per-connection buffer with a
 * monotonically increasing index and receipt timestamp. Questions never
 * 'listen'; they poll this buffer via ws:poll. This converts the
 * asynchronous stream into a synchronously assertable log.
 *
 * The socket, clock and id source are injected through `deps` (CODEX-07): the
 * production defaults are `ws`, `Date.now`/`setTimeout` and `randomUUID`, so the
 * cy.task bridge contract is unchanged. Tests swap in a fake socket and a clock
 * to drive the open/poll/close lifecycle deterministically, without opening a
 * real socket, via `__setDriverDeps`.
 */

/** The minimal socket surface the driver uses — structurally satisfied by `ws`. */
export type DriverSocket = {
  readyState: number;
  on(event: string, listener: (arg?: unknown) => void): void;
  send(data: string): void;
  close(): void;
  terminate(): void;
  removeAllListeners(): void;
};

/**
 * The time boundary. `setTimer` returns its own cancel function; `sleep` is the
 * poll loop's back-off. A fake clock makes the connect-timeout and poll-timeout
 * paths deterministic.
 */
export type DriverClock = {
  now(): number;
  setTimer(callback: () => void, ms: number): () => void;
  sleep(ms: number): Promise<void>;
};

export type DriverDeps = {
  createSocket(url: string, options: { handshakeTimeout: number }): DriverSocket;
  clock: DriverClock;
  uuid(): string;
};

const productionDeps: DriverDeps = {
  createSocket: (url, options) => new WebSocket(url, options) as unknown as DriverSocket,
  clock: {
    now: () => Date.now(),
    setTimer: (callback, ms) => {
      const handle = setTimeout(callback, ms);
      return () => clearTimeout(handle);
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  },
  uuid: () => randomUUID(),
};

let deps: DriverDeps = productionDeps;

/** Test seam (CODEX-07): override selected deps; never called by the bridge. */
export function __setDriverDeps(overrides: Partial<DriverDeps>): void {
  deps = { ...productionDeps, ...overrides };
}

/** Test seam (CODEX-07): restore the production socket/clock/id source. */
export function __resetDriverDeps(): void {
  deps = productionDeps;
}

type Session = {
  socket: DriverSocket;
  frames: BufferedFrame[];
  nextIndex: number;
};

const sessions = new Map<string, Session>();

const POLL_INTERVAL_MS = 100;

function bufferFrame(session: Session, raw: unknown): void {
  // Raw-frame ingress: the single place unparsed data enters the system.
  let frame: unknown;
  try {
    frame = JSON.parse(String(raw));
  } catch {
    frame = String(raw);
  }
  session.frames.push({ index: session.nextIndex++, receivedAt: deps.clock.now(), frame });
}

export function open(url: string, connectionTimeoutMs: number): Promise<OpenResult> {
  const startedAt = deps.clock.now();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({
      ok: false,
      reason: 'invalid-url',
      message: `Not a parseable URL: '${url}'`,
      elapsedMs: deps.clock.now() - startedAt,
    });
  }
  if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') {
    return Promise.resolve({
      ok: false,
      reason: 'invalid-url',
      message: `Not a WebSocket URL (protocol '${parsed.protocol}'): '${url}'`,
      elapsedMs: deps.clock.now() - startedAt,
    });
  }

  return new Promise<OpenResult>((resolve) => {
    const connectionId = deps.uuid();
    const socket = deps.createSocket(url, { handshakeTimeout: connectionTimeoutMs });
    const session: Session = { socket, frames: [], nextIndex: 0 };

    let settled = false;
    const settle = (result: OpenResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      cancelTimer();
      if (!result.ok) {
        sessions.delete(connectionId);
        socket.removeAllListeners();
        socket.terminate();
      }
      resolve(result);
    };

    // The connection is 'open' for test purposes once the info event is
    // buffered (ability contract, spec Section 6.2) — not merely on socket open.
    const cancelTimer = deps.clock.setTimer(() => {
      settle({
        ok: false,
        reason: 'connect-timeout',
        message: `No connection + info event within ${connectionTimeoutMs} ms`,
        elapsedMs: deps.clock.now() - startedAt,
      });
    }, connectionTimeoutMs);

    socket.on('message', (raw) => {
      bufferFrame(session, raw);
      if (!settled && session.frames.some(({ frame }) => frameMatches(frame, { kind: 'event', event: 'info' }))) {
        settle({ ok: true, connectionId, elapsedMs: deps.clock.now() - startedAt });
      }
    });
    socket.on('error', (error) => {
      settle({
        ok: false,
        reason: 'connect-failure',
        message: error instanceof Error ? error.message : String(error),
        elapsedMs: deps.clock.now() - startedAt,
      });
    });
    socket.on('close', () => {
      settle({
        ok: false,
        reason: 'connect-failure',
        message: 'Socket closed before the info event arrived',
        elapsedMs: deps.clock.now() - startedAt,
      });
    });

    sessions.set(connectionId, session);
  });
}

function requireSession(connectionId: string): Session {
  const session = sessions.get(connectionId);
  if (!session) {
    throw new Error(`No session registered for connection '${connectionId}'`);
  }
  return session;
}

export function send(connectionId: string, payload: unknown): SendResult {
  const session = requireSession(connectionId);
  // A mid-scenario disconnect (restart/maintenance) must fail here, at the
  // send, rather than silently reporting success and dying later as a
  // misleading poll timeout with no send-side cause.
  if (session.socket.readyState !== WebSocket.OPEN) {
    return { ok: false, reason: 'socket-not-open' };
  }
  session.socket.send(JSON.stringify(payload));
  return { ok: true };
}

export async function poll(
  connectionId: string,
  predicateSpec: PredicateSpec,
  options: PollOptions = {},
): Promise<PollResult> {
  const session = requireSession(connectionId);
  const timeoutMs = options.timeoutMs ?? 10_000;
  const minCount = options.minCount ?? 1;
  const sinceIndex = options.sinceIndex ?? -1;
  const deadline = deps.clock.now() + timeoutMs;

  const matches = (): BufferedFrame[] =>
    session.frames.filter(
      (buffered) => buffered.index > sinceIndex && frameMatches(buffered.frame, predicateSpec),
    );

  let found = matches();
  while (found.length < minCount && deps.clock.now() < deadline) {
    await deps.clock.sleep(POLL_INTERVAL_MS);
    found = matches();
  }
  return { frames: found, timedOut: found.length < minCount };
}

export function close(connectionId: string): { ok: boolean } {
  const session = sessions.get(connectionId);
  if (session) {
    session.socket.removeAllListeners();
    session.socket.close();
    sessions.delete(connectionId);
  }
  return { ok: true };
}

export function reset(): { ok: boolean } {
  for (const connectionId of [...sessions.keys()]) {
    close(connectionId);
  }
  return { ok: true };
}

export function listSessions(): { connectionIds: string[] } {
  return { connectionIds: [...sessions.keys()] };
}
