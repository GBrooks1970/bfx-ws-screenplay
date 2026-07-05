import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import {
  isTickerFields,
  isTradeFields,
  type TickerFields,
  type TradeFields,
} from '../../../schemas';
import { AssertionError, Question } from '../core';

/** first data frame after the ack (spec Section 6.4). */
export class TheChannelSnapshot {
  static ofTrades(): Question<TradeFields[]> {
    return Question.about('the trades snapshot', (actor) => {
      const chanId = actor.recalled<number>('trades:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          { description: 'the trades snapshot' },
        )
        .then((frames): TradeFields[] => {
          const first = frames[0];
          const payload = Array.isArray(first?.frame) ? (first.frame as unknown[])[1] : undefined;
          if (!Array.isArray(payload)) {
            throw new AssertionError('The trades snapshot is not an array of trades');
          }
          return payload.map((trade) => {
            if (!isTradeFields(trade)) {
              throw new AssertionError('A snapshot trade does not match the trade schema');
            }
            return trade;
          });
        });
    });
  }
  static ofTheTicker(): Question<TickerFields> {
    return Question.about('the ticker snapshot', (actor) => {
      const chanId = actor.recalled<number>('ticker:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          { description: 'the ticker snapshot' },
        )
        .then((frames): TickerFields => {
          const first = frames[0];
          const payload = Array.isArray(first?.frame) ? (first.frame as unknown[])[1] : undefined;
          if (!isTickerFields(payload)) {
            throw new AssertionError('The ticker snapshot does not match the ticker schema');
          }
          return payload;
        });
    });
  }
}
