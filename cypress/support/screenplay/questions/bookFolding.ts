/**
 * Internal helper shared by the book questions: splits buffered channel
 * frames into the snapshot's levels and the subsequent single-level updates
 * (each schema-guarded), preserving buffer indexes so folds can stop at an
 * exact point — the determinism that makes checksum comparison exact.
 * Checksum ('cs') and any non-array-payload frames are ignored here.
 */
import { isBookLevel, type BookLevel } from '../../../schemas';
import { AssertionError } from '../core';

type Buffered = { frame: unknown; index: number };

export type BookFrameLog = {
  snapshotLevels: BookLevel[];
  snapshotIndex: number;
  updates: { level: BookLevel; index: number }[];
};

export function extractBookFrames(frames: readonly Buffered[]): BookFrameLog {
  const bookFrames = frames.filter(
    (buffered) => Array.isArray(buffered.frame) && Array.isArray((buffered.frame as unknown[])[1]),
  );
  const first = bookFrames[0];
  if (!first) {
    throw new AssertionError('No book snapshot frame was found on the channel');
  }
  const rawSnapshot = (first.frame as unknown[])[1] as unknown[];
  const snapshotLevels = rawSnapshot.map((level): BookLevel => {
    if (!isBookLevel(level)) {
      throw new AssertionError('A snapshot entry does not match the book level schema');
    }
    return level;
  });
  const updates = bookFrames.slice(1).map((buffered) => {
    const payload = (buffered.frame as unknown[])[1];
    if (!isBookLevel(payload)) {
      throw new AssertionError('A book update does not match the book level schema');
    }
    return { level: payload, index: buffered.index };
  });
  return { snapshotLevels, snapshotIndex: first.index, updates };
}
