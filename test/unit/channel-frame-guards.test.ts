/**
 * Unit tests for the exact-shape channel-frame guards `isBookChecksumFrame` and
 * `isHeartbeatFrame` (CODEX-08). Each is proven with a representative valid frame
 * (from the shared fixtures) plus the wrong-channel, wrong-length, wrong-label
 * and wrong-payload-type cases — the boundary the assertion layer relies on
 * after the predicate DSL has selected candidates.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isBookChecksumFrame, isHeartbeatFrame } from '../../cypress/schemas';
import frames from '../fixtures/frames.fixtures.json' with { type: 'json' };

describe('isBookChecksumFrame', () => {
  test('accepts [chanId, "cs", integer] for the expected channel', () => {
    assert.equal(isBookChecksumFrame(frames.channelFrames.checksum, 1), true);
  });

  test('rejects the wrong channel id', () => {
    assert.equal(isBookChecksumFrame(frames.channelFrames.checksum, 2), false);
  });

  test('rejects wrong length (short and long)', () => {
    assert.equal(isBookChecksumFrame([1, 'cs'], 1), false);
    assert.equal(isBookChecksumFrame([1, 'cs', 5, 6], 1), false);
  });

  test('rejects the wrong label', () => {
    assert.equal(isBookChecksumFrame([1, 'hb', 5], 1), false);
  });

  test('rejects a non-integer / non-number payload and a non-array', () => {
    assert.equal(isBookChecksumFrame([1, 'cs', 5.5], 1), false);
    assert.equal(isBookChecksumFrame([1, 'cs', '5'], 1), false);
    assert.equal(isBookChecksumFrame({ 0: 1, 1: 'cs', 2: 5 }, 1), false);
  });
});

describe('isHeartbeatFrame', () => {
  test('accepts [chanId, "hb"] for the expected channel', () => {
    assert.equal(isHeartbeatFrame(frames.channelFrames.heartbeat, 17), true);
  });

  test('rejects the wrong channel id', () => {
    assert.equal(isHeartbeatFrame(frames.channelFrames.heartbeat, 99), false);
  });

  test('rejects wrong length (a trailing payload) and the wrong label', () => {
    assert.equal(isHeartbeatFrame([17, 'hb', 0], 17), false);
    assert.equal(isHeartbeatFrame([17, 'cs'], 17), false);
  });

  test('rejects a non-array', () => {
    assert.equal(isHeartbeatFrame('17,hb', 17), false);
  });
});
