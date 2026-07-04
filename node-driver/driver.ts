import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { frameMatches } from './predicates';
import type {
  BufferedFrame,
  OpenResult,
  PollOptions,
  PollResult,
  PredicateSpec,
} from './protocol';

/**
 * Layer 6 — the Node-side WebSocket driver (ADR-001).
 *
 * Every inbound frame is appended to a per-connection buffer with a
 * monotonically increasing index and receipt timestamp. Questions never
 * 'listen'; they poll this buffer via ws:poll. This converts the
 * asynchronous stream into a synchronously assertable log.
 */

type Session = {
  socket: WebSocket;
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
  session.frames.push({ index: session.nextIndex++, receivedAt: Date.now(), frame });
}

export function open(url: string, connectionTimeoutMs: number): Promise<OpenResult> {
  const startedAt = Date.now();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({
      ok: false,
      reason: 'invalid-url',
      message: `Not a parseable URL: '${url}'`,
      elapsedMs: Date.now() - startedAt,
    });
  }
  if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') {
    return Promise.resolve({
      ok: false,
      reason: 'invalid-url',
      message: `Not a WebSocket URL (protocol '${parsed.protocol}'): '${url}'`,
      elapsedMs: Date.now() - startedAt,
    });
  }

  return new Promise<OpenResult>((resolve) => {
    const connectionId = randomUUID();
    const socket = new WebSocket(url, { handshakeTimeout: connectionTimeoutMs });
    const session: Session = { socket, frames: [], nextIndex: 0 };

    let settled = false;
    const settle = (result: OpenResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (!result.ok) {
        sessions.delete(connectionId);
        socket.removeAllListeners();
        socket.terminate();
      }
      resolve(result);
    };

    // The connection is 'open' for test purposes once the info event is
    // buffered (ability contract, spec Section 6.2) — not merely on socket open.
    const timer = setTimeout(() => {
      settle({
        ok: false,
        reason: 'connect-timeout',
        message: `No connection + info event within ${connectionTimeoutMs} ms`,
        elapsedMs: Date.now() - startedAt,
      });
    }, connectionTimeoutMs);

    socket.on('message', (raw) => {
      bufferFrame(session, raw);
      if (!settled && session.frames.some(({ frame }) => frameMatches(frame, { kind: 'event', event: 'info' }))) {
        settle({ ok: true, connectionId, elapsedMs: Date.now() - startedAt });
      }
    });
    socket.on('error', (error) => {
      settle({
        ok: false,
        reason: 'connect-failure',
        message: error.message,
        elapsedMs: Date.now() - startedAt,
      });
    });
    socket.on('close', () => {
      settle({
        ok: false,
        reason: 'connect-failure',
        message: 'Socket closed before the info event arrived',
        elapsedMs: Date.now() - startedAt,
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

export function send(connectionId: string, payload: unknown): { ok: boolean } {
  const session = requireSession(connectionId);
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
  const deadline = Date.now() + timeoutMs;

  const matches = (): BufferedFrame[] =>
    session.frames.filter(
      (buffered) => buffered.index > sinceIndex && frameMatches(buffered.frame, predicateSpec),
    );

  let found = matches();
  while (found.length < minCount && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
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
