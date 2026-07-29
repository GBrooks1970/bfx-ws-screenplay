import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { TIMEOUTS } from '../../config';
import { isHeartbeatFrame } from '../../../schemas';
import { AssertionError, Question } from '../core';

/**
 * heartbeat frames on a channel (spec Section 6.4) — [chanId,'hb'] every
 * 15 s on idle channels, so N heartbeats needs ~N×15 s (heartbeatWaitMs).
 */
export class HeartbeatsObservedOn {
  static theTradesChannel(atLeast: number): Question<number> {
    return Question.about(`at least ${atLeast} heartbeat(s) on the trades channel`, (actor) => {
      const chanId = actor.recalled<number>('trades:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'hb' },
          {
            minCount: atLeast,
            timeoutMs: TIMEOUTS.heartbeatWaitMs,
            description: `${atLeast} heartbeat(s) on channel ${chanId}`,
          },
        )
        .then((frames) => {
          // Predicate selection matched frame[1]==='hb'; the guard validates the
          // exact [chanId,'hb'] shape (length, channel id) before we count it.
          for (const buffered of frames) {
            if (!isHeartbeatFrame(buffered.frame, chanId)) {
              throw new AssertionError('A heartbeat frame does not match the [chanId, "hb"] schema');
            }
          }
          return frames.length;
        });
    });
  }
}
