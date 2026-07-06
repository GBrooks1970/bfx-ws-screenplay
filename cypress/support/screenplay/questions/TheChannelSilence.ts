import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { Question } from '../core';

/**
 * Catalogue addition, 5 July 2026 (SPEC-006 review): the frames that arrived
 * on the released channel AFTER the unsubscribed ack. The Unsubscribe task
 * has already run its ping/pong sync barrier, so this is a deterministic
 * buffer scan (minCount 0 = return immediately), not a timed wait.
 */
export class TheChannelSilence {
  static afterTheUnsubscription(): Question<number> {
    return Question.about('the number of frames after the unsubscribed ack', (actor) => {
      const chanId = actor.recalled<number>('unsubscribed:chanId');
      const ackIndex = actor.recalled<number>('unsubscribed:ackIndex');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId },
          {
            minCount: 0,
            sinceIndex: ackIndex,
            description: `frames on channel ${chanId} after the unsubscribed ack`,
          },
        )
        .then((frames) => frames.length);
    });
  }
}
