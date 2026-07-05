import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { foldBook, type MaintainedBook } from '../../books';
import { Question } from '../core';
import { extractBookFrames } from './bookFolding';

/** the local book replica, folded from every buffered frame (spec Section 6.4). */
export class TheMaintainedBook {
  static now(): Question<MaintainedBook> {
    return Question.about('the locally maintained order book', (actor) => {
      const chanId = actor.recalled<number>('book:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          { description: 'the buffered book frames' },
        )
        .then((frames): MaintainedBook => {
          const log = extractBookFrames(frames);
          return foldBook(
            log.snapshotLevels,
            log.updates.map((update) => update.level),
          );
        });
    });
  }
}
