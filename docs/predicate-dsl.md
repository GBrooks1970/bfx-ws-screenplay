# Predicate DSL — frame-selection contract (SPEC-001 Definition-of-Done item)

Functions cannot cross the `cy.task()` boundary, so `ws:poll` accepts a
serialisable `PredicateSpec`, interpreted by the Node driver
(`node-driver/predicates.ts`; types in `node-driver/protocol.ts`).

**Design principle: the DSL does frame *selection* only; all assertion logic
stays in Questions.** This keeps the Node driver dumb and the DSL small.

```ts
type PredicateSpec =
  | { kind: 'event'; event: string; where?: FieldMatch[] }   // JSON event objects
  | {
      kind: 'channel';
      chanId: number;
      frameType?: 'hb' | 'data';
      label?: string;          // matches frame[1], e.g. 'te', 'tu', 'cs'
      where?: FieldMatch[];    // numeric dot paths into the array frame, e.g. '2.0'
    }
  | { kind: 'any' };                                          // diagnostics / env-block scans

type FieldMatch = {
  path: string;                    // dot path, e.g. 'cid' or 'platform.status'
  op: 'eq' | 'exists' | 'in';
  value?: JsonValue | JsonValue[]; // required for 'eq' and 'in'
};

type PollOptions = {
  timeoutMs?: number;   // defaults per ADR-005 config constants
  minCount?: number;    // resolve once this many matches exist (default 1; 0 = inspect, never wait)
  sinceIndex?: number;  // only frames after this buffer index
};
```

Examples in use:

- Pong matching a ping:
  `{ kind: 'event', event: 'pong', where: [{ path: 'cid', op: 'eq', value: 1234 }] }`
- Environment-blocked scan (zero-wait buffer inspection):
  `{ kind: 'event', event: 'info', where: [{ path: 'code', op: 'in', value: [20051, 20060] }] }`
- Post-unsubscribe silence (SPEC-006, future): channel spec with `sinceIndex`
  set to the unsubscribe ack's buffer index.

**The DSL is a contract.** Any new `kind` or operator requires a note in this
document before the code that uses it.

## Contract changes

- **5 July 2026 (SPEC-003 review Q1, approved):** channel predicates gain
  `label` (matches `frame[1]` — `'te'`/`'tu'` now, `'cs'` for SPEC-004
  checksums later) and `where` (FieldMatches evaluated against the whole array
  frame using numeric dot paths, e.g. path `'2.0'` = the trade ID inside the
  payload). `where` rides alongside `label` so a wait can target *the `tu` for
  trade N* as a single bounded condition (ADR-005), rather than polling
  broadly and filtering client-side — the pairing invariant in SPEC-003 is the
  motivating case. Example:
  `{ kind: 'channel', chanId, label: 'tu', where: [{ path: '2.0', op: 'eq', value: 1945024471 }] }`
