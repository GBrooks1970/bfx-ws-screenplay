import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isPongEvent, type PongEvent } from '../../../schemas';
import { AssertionError, Question } from '../core';

/** pong frame matching the remembered ping correlation ID (spec Section 6.4). */
export class ThePongResponse {
  static matchingTheLastPing(): Question<PongEvent> {
    return Question.about('the pong matching the last ping', (actor) => {
      const cid = actor.recalled<number>('lastPingCid');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'event', event: 'pong', where: [{ path: 'cid', op: 'eq', value: cid }] },
          { description: `a pong with correlation ID ${cid}` },
        )
        .then((frames): PongEvent => {
          const first = frames[0]?.frame;
          if (!isPongEvent(first)) {
            throw new AssertionError('The pong frame does not match the pong schema');
          }
          return first;
        });
    });
  }
}
