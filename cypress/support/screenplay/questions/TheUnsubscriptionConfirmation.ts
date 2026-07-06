import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { AssertionError, Question } from '../core';

export type UnsubscribedAck = { event: 'unsubscribed'; status: string; chanId: number };

/** the `unsubscribed` ack for the released channel — answered from the buffer. */
export class TheUnsubscriptionConfirmation {
  static status(): Question<string> {
    return Question.about('the unsubscription confirmation status', (actor) => {
      const chanId = actor.recalled<number>('unsubscribed:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          {
            kind: 'event',
            event: 'unsubscribed',
            where: [{ path: 'chanId', op: 'eq', value: chanId }],
          },
          { description: `the unsubscribed ack for channel ${chanId}` },
        )
        .then((frames): string => {
          const ack = frames[0]?.frame as UnsubscribedAck | undefined;
          if (!ack || typeof ack.status !== 'string') {
            throw new AssertionError('No unsubscribed ack was found for the channel');
          }
          return ack.status;
        });
    });
  }
}
