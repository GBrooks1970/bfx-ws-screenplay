import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { CANDLES, TIMEOUTS } from '../../config';
import {
  isCandleFields,
  isTickerFields,
  isTradeFields,
  type CandleFields,
  type TickerFields,
  type TradeFields,
} from '../../../schemas';
import { AssertionError, Question } from '../core';
import type { ObservedExecution } from '../tasks/ObserveAnExecutedTrade';

/** A tu frame paired back to its remembered te observation. */
export type PairedTradeUpdate = {
  trade: TradeFields;
  bufferIndex: number;
  executionBufferIndex: number;
};

/**
 * first N post-snapshot frames (spec Section 6.4). The snapshot is the first
 * data frame on the channel, so the question waits for count + 1 data frames
 * and drops the first — no hidden state between questions.
 */
export class ReceivedUpdates {
  static fromTheTicker(atLeast: number): Question<TickerFields[]> {
    return Question.about(`at least ${atLeast} ticker update(s)`, (actor) => {
      const chanId = actor.recalled<number>('ticker:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          {
            minCount: atLeast + 1,
            timeoutMs: TIMEOUTS.updateWaitMs,
            description: `${atLeast} ticker update(s) after the snapshot`,
          },
        )
        .then((frames): TickerFields[] =>
          frames.slice(1).map((buffered) => {
            const payload = Array.isArray(buffered.frame)
              ? (buffered.frame as unknown[])[1]
              : undefined;
            if (!isTickerFields(payload)) {
              throw new AssertionError('A ticker update does not match the ticker schema');
            }
            return payload;
          }),
        );
    });
  }

  static executedTrades(atLeast: number): Question<TradeFields[]> {
    return Question.about(`at least ${atLeast} executed trade(s)`, (actor) => {
      const chanId = actor.recalled<number>('trades:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, label: 'te' },
          {
            minCount: atLeast,
            timeoutMs: TIMEOUTS.updateWaitMs,
            description: `${atLeast} executed trade(s) (te frames)`,
          },
        )
        .then((frames): TradeFields[] =>
          frames.map((buffered) => {
            const payload = Array.isArray(buffered.frame)
              ? (buffered.frame as unknown[])[2]
              : undefined;
            if (!isTradeFields(payload)) {
              throw new AssertionError('An executed trade does not match the trade schema');
            }
            return payload;
          }),
        );
    });
  }

  static candles(atLeast: number): Question<CandleFields[]> {
    return Question.about(`at least ${atLeast} candle update(s)`, (actor) => {
      const chanId = actor.recalled<number>('candles:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          {
            minCount: atLeast + 1, // + the snapshot frame
            timeoutMs: TIMEOUTS.candleUpdateWaitMs,
            description: `${atLeast} candle update(s) after the snapshot`,
          },
        )
        .then((frames): CandleFields[] =>
          frames.slice(1).map((buffered) => {
            const payload = Array.isArray(buffered.frame)
              ? (buffered.frame as unknown[])[1]
              : undefined;
            if (!isCandleFields(payload, CANDLES.timeframeMs)) {
              throw new AssertionError('A candle update does not match the candle schema');
            }
            return payload;
          }),
        );
    });
  }

  /** The tu carrying the observed te's trade ID — a single bounded condition. */
  static theUpdateForTheObservedTrade(): Question<PairedTradeUpdate> {
    return Question.about('the trade update for the observed execution', (actor) => {
      const chanId = actor.recalled<number>('trades:chanId');
      const observed = actor.recalled<ObservedExecution>('trades:observedExecution');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'channel',
            chanId,
            label: 'tu',
            where: [{ path: '2.0', op: 'eq', value: observed.tradeId }],
          },
          {
            sinceIndex: observed.bufferIndex,
            timeoutMs: TIMEOUTS.updateWaitMs,
            description: `the tu frame for trade ${observed.tradeId}`,
          },
        )
        .then((frames): PairedTradeUpdate => {
          const first = frames[0];
          const payload = Array.isArray(first?.frame) ? (first.frame as unknown[])[2] : undefined;
          if (!first || !isTradeFields(payload)) {
            throw new AssertionError('The trade update does not match the trade schema');
          }
          return {
            trade: payload,
            bufferIndex: first.index,
            executionBufferIndex: observed.bufferIndex,
          };
        });
    });
  }
}
