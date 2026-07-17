import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { foldBook, sortedSides, type SortedBookSides } from '../../books';
import { Question } from '../core';
import { extractBookFrames } from './bookFolding';

/**
 * the local book replica, folded from every buffered frame (spec Section
 * 6.4). Answers the serialisable `sortedSides()` projection, not the raw
 * `Map`-based book, so a failed invariant prints the actual levels instead
 * of `{"bids":{},"asks":{}}` (review Risk #7 / backlog Risk #8).
 */
export class TheMaintainedBook {
  static now(): Question<SortedBookSides> {
    return Question.about('the locally maintained order book', (actor) => {
      const chanId = actor.recalled<number>('book:chanId');
      return CommunicateOverWebSocket.as(actor)
        .messagesWhere(
          { kind: 'channel', chanId, frameType: 'data' },
          { description: 'the buffered book frames' },
        )
        .then((frames): SortedBookSides => {
          const log = extractBookFrames(frames);
          const book = foldBook(
            log.snapshotLevels,
            log.updates.map((update) => update.level),
          );
          return sortedSides(book);
        });
    });
  }
}
