import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { OPERATIVE_PLATFORM_STATUS } from '../../config';
import { isPlatformInfoEvent, type PlatformInfoEvent } from '../../../schemas';
import { AssertionError, Question } from '../core';

/** version and status fields from the info event (spec Section 6.4). */
export class ThePlatformInfo {
  static event(): Question<PlatformInfoEvent> {
    return Question.about('the platform info event', (actor) =>
      CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'event', event: 'info' },
          { description: 'the platform info event' },
        )
        .then((frames): PlatformInfoEvent => {
          const first = frames[0]?.frame;
          if (!isPlatformInfoEvent(first)) {
            throw new AssertionError('The info frame does not match the platform info schema');
          }
          return first;
        }),
    );
  }

  static version(): Question<number> {
    return Question.about('the platform info API version', (actor) =>
      actor.asks(ThePlatformInfo.event()).then((info) => info.version),
    );
  }

  static operativeStatus(): Question<boolean> {
    return Question.about('whether the platform reports itself operative', (actor) =>
      actor
        .asks(ThePlatformInfo.event())
        .then((info) => info.platform.status === OPERATIVE_PLATFORM_STATUS),
    );
  }
}
