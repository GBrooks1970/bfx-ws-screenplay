/**
 * Unit tests for `classifyTradeStream` — the trades-window outcome contract in
 * `docs/adr/ADR-008-trade-starvation-classification.md` (CODEX-03). A quiet
 * market (`starved`) is a distinguishable environment outcome, never a silent
 * pass and never confused with a genuine channel/protocol failure; the
 * precedence between branches is what stops a real regression being masked by
 * market quiet.
 *
 * Migrated from the former `scripts/check-trade-starvation-classification.ts`
 * proof script into the discoverable `node:test` suite (CODEX-05). Pure — no
 * Cypress, no socket.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTradeStream,
  type TradeStreamEvidence,
} from '../../cypress/support/screenplay/trades';

/** A healthy, quiet window: connected, subscribed, snapshot present, no te. */
function baseEvidence(): TradeStreamEvidence {
  return {
    symbol: 'tBTCUSD',
    timeoutMs: 30_000,
    subscriptionConfirmed: true,
    snapshotReceived: true,
    snapshotSize: 42,
    executedTradeCount: 0,
    tradeUpdateCount: 0,
    malformedFrameSeen: false,
    blockingStatusSeen: false,
    totalDataFrames: 3,
  };
}

describe('classifyTradeStream', () => {
  test('starved: connected + subscribed + snapshot but no te → environment-blocked, not a product failure', () => {
    const outcome = classifyTradeStream(baseEvidence());
    assert.equal(outcome.kind, 'starved');
    assert.equal(outcome.severity, 'environment');
    assert.match(outcome.message, /quiet market/);
  });

  test('starved diagnostics carry symbol, timeout and observed frame counts (actionable evidence)', () => {
    const outcome = classifyTradeStream({ ...baseEvidence(), totalDataFrames: 5, tradeUpdateCount: 1 });
    assert.match(outcome.message, /symbol=tBTCUSD/);
    assert.match(outcome.message, /timeout=30000ms/);
    assert.match(outcome.message, /te=0/);
    assert.match(outcome.message, /tu=1/);
    assert.match(outcome.message, /dataFrames=5/);
  });

  test('streamed: a te actually arrived → pass, never reported as blocked', () => {
    const outcome = classifyTradeStream({ ...baseEvidence(), executedTradeCount: 2 });
    assert.equal(outcome.kind, 'streamed');
    assert.equal(outcome.severity, 'pass');
  });

  test('malformed: a bad/mis-paired frame is a PRODUCT failure and outranks a quiet market', () => {
    const outcome = classifyTradeStream({ ...baseEvidence(), malformedFrameSeen: true });
    assert.equal(outcome.kind, 'malformed');
    assert.equal(outcome.severity, 'product');
  });

  test('unconfirmed: subscription never acknowledged → product failure', () => {
    const outcome = classifyTradeStream({ ...baseEvidence(), subscriptionConfirmed: false });
    assert.equal(outcome.kind, 'unconfirmed');
    assert.equal(outcome.severity, 'product');
  });

  test('no-snapshot: channel never delivered its snapshot → product failure', () => {
    const outcome = classifyTradeStream({
      ...baseEvidence(),
      snapshotReceived: false,
      snapshotSize: 0,
      totalDataFrames: 0,
    });
    assert.equal(outcome.kind, 'no-snapshot');
    assert.equal(outcome.severity, 'product');
  });

  test('blocked: a platform maintenance status outranks everything → environment-blocked', () => {
    const outcome = classifyTradeStream({
      ...baseEvidence(),
      blockingStatusSeen: true,
      malformedFrameSeen: true,
    });
    assert.equal(outcome.kind, 'blocked');
    assert.equal(outcome.severity, 'environment');
  });

  test('precedence: malformed outranks unconfirmed and no-snapshot (most specific defect wins)', () => {
    const outcome = classifyTradeStream({
      ...baseEvidence(),
      malformedFrameSeen: true,
      subscriptionConfirmed: false,
      snapshotReceived: false,
    });
    assert.equal(outcome.kind, 'malformed');
  });
});
