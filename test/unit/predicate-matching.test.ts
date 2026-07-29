/**
 * Unit tests for the Node-side predicate DSL matcher (`node-driver/predicates.ts`)
 * — the pure frame-selection logic the driver's buffer poll runs (ADR-005,
 * predicate DSL doc). Covers the three predicate kinds, the `frameType`/`label`
 * channel refinements, `where` field matching (`exists`/`eq`/`in`), and dotted
 * path traversal including into array frames — with the negative cases that keep
 * selection distinct from schema validation (CODEX-06).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { frameMatches } from '../../node-driver/predicates';
import type { PredicateSpec } from '../../node-driver/protocol';
import frames from '../fixtures/frames.fixtures.json' with { type: 'json' };

describe('frameMatches — kind: any', () => {
  test('matches every frame shape', () => {
    for (const frame of [frames.events.pong, frames.channelFrames.heartbeat, 42, null, 'x']) {
      assert.equal(frameMatches(frame, { kind: 'any' }), true);
    }
  });
});

describe('frameMatches — kind: event', () => {
  const infoSpec: PredicateSpec = { kind: 'event', event: 'info' };

  test('matches a JSON event object by its event name', () => {
    assert.equal(frameMatches(frames.events.infoOperative, infoSpec), true);
  });

  test('rejects a different event name, an array frame, and non-objects', () => {
    assert.equal(frameMatches(frames.events.pong, infoSpec), false);
    assert.equal(frameMatches(frames.channelFrames.heartbeat, infoSpec), false); // array
    assert.equal(frameMatches(null, infoSpec), false);
    assert.equal(frameMatches(2, infoSpec), false);
  });

  test('where: eq on a nested dotted path (platform.status)', () => {
    const operative: PredicateSpec = {
      kind: 'event',
      event: 'info',
      where: [{ path: 'platform.status', op: 'eq', value: 1 }],
    };
    assert.equal(frameMatches(frames.events.infoOperative, operative), true);
    assert.equal(frameMatches(frames.events.infoMaintenance, operative), false);
  });

  test('where: in matches any listed value; a non-array match value never matches', () => {
    const blocking: PredicateSpec = {
      kind: 'event',
      event: 'error',
      where: [{ path: 'code', op: 'in', value: [10300, 10301] }],
    };
    assert.equal(frameMatches(frames.events.errorBadSymbol, blocking), true);
    const malformedIn: PredicateSpec = {
      kind: 'event',
      event: 'error',
      // `in` with a non-array value must be treated as "no match", not throw.
      where: [{ path: 'code', op: 'in', value: 10300 as unknown as number[] }],
    };
    assert.equal(frameMatches(frames.events.errorBadSymbol, malformedIn), false);
  });

  test('where: exists distinguishes a present field from a missing one', () => {
    const hasSymbol: PredicateSpec = {
      kind: 'event',
      event: 'error',
      where: [{ path: 'symbol', op: 'exists' }],
    };
    assert.equal(frameMatches(frames.events.errorBadSymbol, hasSymbol), true);
    assert.equal(frameMatches(frames.events.errorBadChannel, hasSymbol), false); // no symbol field
  });

  test('a dotted path through a non-object segment resolves to undefined (no throw)', () => {
    const deep: PredicateSpec = {
      kind: 'event',
      event: 'pong',
      where: [{ path: 'ts.nope.deeper', op: 'exists' }],
    };
    assert.equal(frameMatches(frames.events.pong, deep), false);
  });
});

describe('frameMatches — kind: channel', () => {
  const chanId = 17;

  test('rejects a non-array frame and a wrong channel id', () => {
    assert.equal(frameMatches(frames.events.pong, { kind: 'channel', chanId }), false);
    assert.equal(frameMatches([99, 'hb'], { kind: 'channel', chanId }), false);
  });

  test('frameType hb vs data partitions heartbeats from data frames', () => {
    assert.equal(frameMatches(frames.channelFrames.heartbeat, { kind: 'channel', chanId, frameType: 'hb' }), true);
    assert.equal(frameMatches(frames.channelFrames.heartbeat, { kind: 'channel', chanId, frameType: 'data' }), false);
    assert.equal(frameMatches(frames.channelFrames.tradeExecuted, { kind: 'channel', chanId, frameType: 'data' }), true);
    assert.equal(frameMatches(frames.channelFrames.tradeExecuted, { kind: 'channel', chanId, frameType: 'hb' }), false);
  });

  test('label selects te vs tu on the same channel', () => {
    assert.equal(frameMatches(frames.channelFrames.tradeExecuted, { kind: 'channel', chanId, label: 'te' }), true);
    assert.equal(frameMatches(frames.channelFrames.tradeExecuted, { kind: 'channel', chanId, label: 'tu' }), false);
    assert.equal(frameMatches(frames.channelFrames.tradeUpdate, { kind: 'channel', chanId, label: 'tu' }), true);
  });

  test('where: numeric dotted path into the array frame (trade id at 2.0)', () => {
    const byTradeId: PredicateSpec = {
      kind: 'channel',
      chanId,
      label: 'tu',
      where: [{ path: '2.0', op: 'eq', value: 588750488 }],
    };
    assert.equal(frameMatches(frames.channelFrames.tradeUpdate, byTradeId), true);
    const wrongId: PredicateSpec = { ...byTradeId, where: [{ path: '2.0', op: 'eq', value: 999 }] };
    assert.equal(frameMatches(frames.channelFrames.tradeUpdate, wrongId), false);
  });
});
