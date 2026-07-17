/**
 * Shared contract types for the cy.task bridge (spec Section 7.3).
 *
 * These types cross the browser/Node boundary, so everything here must be
 * JSON-serialisable — functions cannot cross cy.task(), which is why frame
 * selection is expressed as a declarative PredicateSpec interpreted Node-side.
 * The DSL does frame *selection* only; assertion logic stays in Questions.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type FieldMatch = {
  /** Dot path into the frame, e.g. 'cid' or 'platform.status'. */
  path: string;
  op: 'eq' | 'exists' | 'in';
  /** Required for 'eq' (single value) and 'in' (array of candidates). */
  value?: JsonValue | JsonValue[];
};

export type PredicateSpec =
  /** JSON event objects, e.g. info, subscribed, error, pong. */
  | { kind: 'event'; event: string; where?: FieldMatch[] }
  /**
   * Array frames on a channel, e.g. [chanId, ...] data or [chanId, 'hb'].
   * `label` matches frame[1] ('te', 'tu', 'cs', ...); `where` paths are
   * numeric dot paths into the array frame (contract change, 5 July 2026 —
   * see docs/predicate-dsl.md).
   */
  | {
      kind: 'channel';
      chanId: number;
      frameType?: 'hb' | 'data';
      label?: string;
      where?: FieldMatch[];
    }
  /** Any frame — used by environment-blocked scanning and diagnostics. */
  | { kind: 'any' };

export type PollOptions = {
  timeoutMs?: number;
  /** Resolve once this many matches exist (default 1). Zero polls the buffer without waiting. */
  minCount?: number;
  /** Only consider frames after this buffer index (enables 'no further frames' checks). */
  sinceIndex?: number;
};

export type BufferedFrame = {
  index: number;
  receivedAt: number;
  frame: unknown;
};

export type PollResult = {
  frames: BufferedFrame[];
  timedOut: boolean;
};

export type OpenResult =
  | { ok: true; connectionId: string; elapsedMs: number }
  | {
      ok: false;
      reason: 'invalid-url' | 'connect-failure' | 'connect-timeout';
      message: string;
      elapsedMs: number;
    };

export type OpenArgs = { url: string; connectionTimeoutMs: number };
export type SendArgs = { connectionId: string; payload: JsonValue };
export type PollArgs = { connectionId: string; predicateSpec: PredicateSpec; options?: PollOptions };
export type CloseArgs = { connectionId: string };

export type OkResult = { ok: boolean };
/**
 * `ws:send`'s result (bridge contract change, review Risk #3 / backlog
 * Risk #4): distinguishes a genuine send from a socket that is no longer
 * open, so a mid-scenario disconnect fails at the send with a named reason
 * instead of surfacing later as a misleading poll timeout.
 */
export type SendResult = { ok: true } | { ok: false; reason: 'socket-not-open' };
export type SessionsResult = { connectionIds: string[] };
