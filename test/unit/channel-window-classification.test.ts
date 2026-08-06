/**
 * Unit tests for `classifyChannelWindow` — the generalised quiet-window outcome
 * contract in `docs/adr/ADR-010-quiet-window-classification-and-gating.md`,
 * extending ADR-008's trades decision to the ticker, candle and book-checksum
 * waits.
 *
 * The two things worth pinning: a quiet market is a distinguishable environment
 * outcome (never a silent pass), and the precedence between branches is what
 * stops a real regression being masked by market quiet. `quietFloor` is the new
 * lever — it is what keeps "the checksum flag was never honoured" loud while
 * "the book was slow" stays green. Pure — no Cypress, no socket.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyChannelWindow,
  type ChannelWindowEvidence,
} from '../../cypress/support/screenplay/streams';

/** A healthy, quiet ticker window: connected, subscribed, snapshot, no updates. */
function baseEvidence(): ChannelWindowEvidence {
  return {
    channel: 'ticker',
    symbol: 'tBTCUSD',
    awaited: '1 ticker update(s) after the snapshot',
    timeoutMs: 30_000,
    subscriptionConfirmed: true,
    snapshotReceived: true,
    observedCount: 0,
    requiredCount: 1,
    quietFloor: 0,
    blockingStatusSeen: false,
    totalDataFrames: 1,
  };
}

/** The book-checksum shape: zero cs frames is a defect, a shortfall is not. */
function checksumEvidence(): ChannelWindowEvidence {
  return {
    ...baseEvidence(),
    channel: 'book',
    awaited: '5 checksum frame(s)',
    observedCount: 2,
    requiredCount: 5,
    quietFloor: 1,
    totalDataFrames: 40,
  };
}

describe('classifyChannelWindow', () => {
  test('quiet: subscribed + snapshot but no updates → environment-blocked, not a product failure', () => {
    const outcome = classifyChannelWindow(baseEvidence());
    assert.equal(outcome.kind, 'quiet');
    assert.equal(outcome.severity, 'environment');
    assert.match(outcome.message, /quiet market/);
  });

  test('quiet diagnostics carry channel, symbol, timeout and observed counts (actionable evidence)', () => {
    const outcome = classifyChannelWindow({ ...baseEvidence(), totalDataFrames: 3 });
    assert.match(outcome.message, /channel=ticker/);
    assert.match(outcome.message, /symbol=tBTCUSD/);
    assert.match(outcome.message, /timeout=30000ms/);
    assert.match(outcome.message, /observed=0\/1/);
    assert.match(outcome.message, /dataFrames=3/);
  });

  test('delivered: the count was in fact reached → pass, never reported as blocked', () => {
    const outcome = classifyChannelWindow({ ...baseEvidence(), observedCount: 2 });
    assert.equal(outcome.kind, 'delivered');
    assert.equal(outcome.severity, 'pass');
  });

  test('unconfirmed: no channel ID is a PRODUCT failure and outranks a quiet market', () => {
    const outcome = classifyChannelWindow({ ...baseEvidence(), subscriptionConfirmed: false });
    assert.equal(outcome.kind, 'unconfirmed');
    assert.equal(outcome.severity, 'product');
  });

  test('no-snapshot: a channel that never delivered its snapshot is a PRODUCT failure', () => {
    const outcome = classifyChannelWindow({
      ...baseEvidence(),
      snapshotReceived: false,
      totalDataFrames: 0,
    });
    assert.equal(outcome.kind, 'no-snapshot');
    assert.equal(outcome.severity, 'product');
  });

  test('blocked: a platform status outranks everything, including product failures', () => {
    const outcome = classifyChannelWindow({
      ...baseEvidence(),
      blockingStatusSeen: true,
      subscriptionConfirmed: false,
    });
    assert.equal(outcome.kind, 'blocked');
    assert.equal(outcome.severity, 'environment');
  });

  test('a product failure is never masked by a quiet market (precedence over "quiet")', () => {
    // Zero updates would read as quiet, but the missing snapshot must win.
    const outcome = classifyChannelWindow({
      ...baseEvidence(),
      observedCount: 0,
      snapshotReceived: false,
    });
    assert.equal(outcome.severity, 'product');
  });

  describe('quietFloor', () => {
    test('a partial checksum run (2 of 5) is a quiet book → environment-blocked', () => {
      const outcome = classifyChannelWindow(checksumEvidence());
      assert.equal(outcome.kind, 'quiet');
      assert.equal(outcome.severity, 'environment');
    });

    test('ZERO checksum frames while the book streams is a PRODUCT failure, not market quiet', () => {
      // The regression this guards: the conf flag silently stops enabling cs
      // frames. Under quietFloor 0 that would be excused as a quiet market.
      const outcome = classifyChannelWindow({ ...checksumEvidence(), observedCount: 0 });
      assert.equal(outcome.kind, 'silent');
      assert.equal(outcome.severity, 'product');
      assert.match(outcome.message, /never switched on/);
    });

    test('zero ticker updates stays quiet — floor 0 means zero is genuinely plausible', () => {
      const outcome = classifyChannelWindow({ ...baseEvidence(), observedCount: 0 });
      assert.equal(outcome.kind, 'quiet');
      assert.equal(outcome.severity, 'environment');
    });
  });
});
