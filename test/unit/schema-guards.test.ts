/**
 * Unit tests for every message schema guard in `cypress/schemas/` (CODEX-06).
 * Each guard is exercised with a representative valid frame (from the shared
 * language-neutral fixtures) plus the boundary/negative cases that matter:
 * wrong length, wrong element type, non-finite / non-integer numbers, missing
 * fields, and the deliberate exact-length rejections (funding trades/tickers).
 * These prove selection (predicate DSL) and validation (schemas) are distinct
 * responsibilities.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBookLevel,
  isCandleFields,
  isConfEvent,
  isPlatformInfoEvent,
  isPongEvent,
  isSubscribedAck,
  isSubscribedBookAck,
  isSubscribedCandlesAck,
  isSubscriptionErrorEvent,
  isTickerFields,
  isTradeFields,
  isUnsubscribedAck,
} from '../../cypress/schemas';
import frames from '../fixtures/frames.fixtures.json' with { type: 'json' };

const TIMEFRAME_MS = 60_000;

describe('every object-event guard rejects non-object inputs (null / array / primitive)', () => {
  // The shared early guard (`typeof !== 'object' || null || Array.isArray`) must
  // reject these for every event/ack schema — a boundary each guard depends on.
  const guards: Array<[string, (frame: unknown) => boolean]> = [
    ['isPlatformInfoEvent', isPlatformInfoEvent],
    ['isConfEvent', isConfEvent],
    ['isSubscriptionErrorEvent', isSubscriptionErrorEvent],
    ['isPongEvent', isPongEvent],
    ['isUnsubscribedAck', isUnsubscribedAck],
    ['isSubscribedCandlesAck', isSubscribedCandlesAck],
    ['isSubscribedBookAck', isSubscribedBookAck],
    ['isSubscribedAck(trades)', (frame) => isSubscribedAck(frame, 'trades')],
  ];
  for (const [name, guard] of guards) {
    test(`${name} rejects null, an array and a primitive`, () => {
      assert.equal(guard(null), false);
      assert.equal(guard([1, 2, 3]), false);
      assert.equal(guard(42), false);
    });
  }
});

describe('isTradeFields', () => {
  test('accepts a 4-element [ID, MTS, AMOUNT, PRICE] trade', () => {
    assert.equal(isTradeFields(frames.payloads.trade), true);
  });
  test('rejects wrong length (funding 5-tuple / short 3-tuple), non-numbers and non-integers', () => {
    assert.equal(isTradeFields([1, 2, 3, 4, 5]), false);
    assert.equal(isTradeFields([1, 2, 3]), false);
    assert.equal(isTradeFields([1, 2, 3, '4']), false);
    assert.equal(isTradeFields([1, 2, 3, Number.NaN]), false);
    assert.equal(isTradeFields([1.5, 2, 3, 4]), false); // non-integer ID
    assert.equal(isTradeFields([1, 2.5, 3, 4]), false); // non-integer MTS
    assert.equal(isTradeFields('not-an-array'), false);
  });
});

describe('isTickerFields', () => {
  test('accepts the 10-field payload and tolerates the live trailing null (>=10)', () => {
    assert.equal(isTickerFields(frames.payloads.tickerTenField), true);
    assert.equal(isTickerFields(frames.payloads.tickerWithTrailingNull), true);
  });
  test('rejects fewer than 10 fields or a non-finite value among the first 10', () => {
    assert.equal(isTickerFields([1, 2, 3, 4, 5, 6, 7, 8, 9]), false);
    const withInfinity = [...frames.payloads.tickerTenField];
    withInfinity[6] = Number.POSITIVE_INFINITY;
    assert.equal(isTickerFields(withInfinity), false);
  });
});

describe('isCandleFields', () => {
  test('accepts a 6-field candle whose MTS aligns to the timeframe', () => {
    assert.equal(isCandleFields(frames.payloads.candle1m, TIMEFRAME_MS), true);
  });
  test('rejects wrong length, non-integer/mis-aligned MTS, and non-finite fields', () => {
    assert.equal(isCandleFields([1751731200000, 1, 2, 3, 4], TIMEFRAME_MS), false); // 5 fields
    assert.equal(isCandleFields([1751731200001, 1, 2, 3, 4, 5], TIMEFRAME_MS), false); // not aligned
    assert.equal(isCandleFields([1751731200000.5, 1, 2, 3, 4, 5], TIMEFRAME_MS), false); // non-integer MTS
    assert.equal(isCandleFields([1751731200000, 1, 2, 3, 4, Number.NaN], TIMEFRAME_MS), false);
  });
});

describe('isBookLevel', () => {
  test('accepts a 3-element [PRICE, COUNT, AMOUNT] level', () => {
    assert.equal(isBookLevel(frames.payloads.bookLevelBid), true);
    assert.equal(isBookLevel(frames.payloads.bookLevelRemove), true);
  });
  test('rejects wrong length, non-integer count and non-finite numbers', () => {
    assert.equal(isBookLevel([64000.5, 1]), false);
    assert.equal(isBookLevel([64000.5, 1.5, 0.75]), false); // non-integer count
    assert.equal(isBookLevel([64000.5, 1, Number.POSITIVE_INFINITY]), false);
  });
});

describe('subscribed acks', () => {
  test('isSubscribedAck matches the requested channel and rejects mismatches / bad shapes', () => {
    assert.equal(isSubscribedAck(frames.events.subscribedTrades, 'trades'), true);
    assert.equal(isSubscribedAck(frames.events.subscribedTrades, 'ticker'), false);
    assert.equal(isSubscribedAck({ event: 'subscribed', channel: 'trades', chanId: 1, symbol: 't' }, 'trades'), false); // no pair
    assert.equal(isSubscribedAck(null, 'trades'), false);
    assert.equal(isSubscribedAck([1, 2], 'trades'), false);
  });
  test('isSubscribedBookAck additionally requires prec/freq/len strings', () => {
    assert.equal(isSubscribedBookAck(frames.events.subscribedBook), true);
    const withoutPrec: Record<string, unknown> = { ...frames.events.subscribedBook };
    delete withoutPrec.prec;
    assert.equal(isSubscribedBookAck(withoutPrec), false);
  });
  test('isSubscribedCandlesAck requires event/channel/chanId/key (no symbol/pair)', () => {
    assert.equal(isSubscribedCandlesAck(frames.events.subscribedCandles), true);
    assert.equal(isSubscribedCandlesAck({ event: 'subscribed', channel: 'candles', chanId: 5 }), false); // no key
    assert.equal(isSubscribedCandlesAck(frames.events.subscribedTrades), false); // wrong channel
  });
});

describe('platform / config / error / pong / unsubscribed events', () => {
  test('isPlatformInfoEvent requires event=info, numeric version and platform.status', () => {
    assert.equal(isPlatformInfoEvent(frames.events.infoOperative), true);
    assert.equal(isPlatformInfoEvent(frames.events.infoMaintenance), true);
    assert.equal(isPlatformInfoEvent({ event: 'info', version: '2', platform: { status: 1 } }), false);
    assert.equal(isPlatformInfoEvent({ event: 'info', version: 2, platform: {} }), false);
    assert.equal(isPlatformInfoEvent({ event: 'info', version: 2 }), false);
    assert.equal(isPlatformInfoEvent([1, 2]), false);
  });
  test('isConfEvent accepts optional numeric flags and rejects a wrong flags type / status', () => {
    assert.equal(isConfEvent(frames.events.conf), true);
    assert.equal(isConfEvent({ event: 'conf', status: 'OK', flags: 131072 }), true);
    assert.equal(isConfEvent({ event: 'conf', status: 'OK', flags: 'x' }), false);
    assert.equal(isConfEvent({ event: 'conf', status: 1 }), false);
  });
  test('isSubscriptionErrorEvent requires event=error, string msg and numeric code', () => {
    assert.equal(isSubscriptionErrorEvent(frames.events.errorBadSymbol), true);
    assert.equal(isSubscriptionErrorEvent(frames.events.errorBadChannel), true);
    assert.equal(isSubscriptionErrorEvent({ event: 'error', msg: 'x' }), false); // no code
    assert.equal(isSubscriptionErrorEvent({ event: 'info', msg: 'x', code: 1 }), false);
  });
  test('isPongEvent requires numeric cid and ts', () => {
    assert.equal(isPongEvent(frames.events.pong), true);
    assert.equal(isPongEvent({ event: 'pong', cid: 1 }), false); // no ts
    assert.equal(isPongEvent({ event: 'pong', ts: 1, cid: '1' }), false);
  });
  test('isUnsubscribedAck requires status string and numeric chanId', () => {
    assert.equal(isUnsubscribedAck(frames.events.unsubscribed), true);
    assert.equal(isUnsubscribedAck({ event: 'unsubscribed', status: 'OK' }), false); // no chanId
    assert.equal(isUnsubscribedAck({ event: 'unsubscribed', status: 'OK', chanId: '1' }), false);
  });
});
