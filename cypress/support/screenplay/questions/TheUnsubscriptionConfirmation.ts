import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { isUnsubscribedAck } from '../../../schemas';
import { AssertionError, Question } from '../core';

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
          const ack = frames[0]?.frame;
          if (!isUnsubscribedAck(ack)) {
            throw new AssertionError('No unsubscribed ack was found for the channel');
          }
          return ack.status;
        });
    });
  }
}
