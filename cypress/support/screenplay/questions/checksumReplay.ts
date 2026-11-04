import { isBookChecksumFrame, isBookLevel } from '../../../schemas';
import { AssertionError } from '../core';
import { extractBookFrames } from './bookFolding';
import { verifyChecksumAtIndex, type ChecksumVerification } from './checksumDiagnostics';

export type ReplayFrame = { sessionId: string; index: number; frame: unknown };
export type ChecksumReplay = {
  version: 1;
  sessionId: string;
  chanId: number;
  throughIndex: number;
  totalFrames: number;
  capturedFrames: number;
  truncated: boolean;
  frames: ReplayFrame[];
};

const MAX_FRAMES = 5_000;
const MAX_BYTES = 1_048_576;
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** Parsed frames only. Completeness describes capture, not lossless wire tokens. */
export function captureChecksumReplay(
  sessionId: string,
  chanId: number,
  throughIndex: number,
  frames: readonly ReplayFrame[],
  byteBudget = MAX_BYTES,
): ChecksumReplay {
  const prefix = frames.filter((entry) => entry.index <= throughIndex);
  const envelope: ChecksumReplay = {
    version: 1,
    sessionId,
    chanId,
    throughIndex,
    totalFrames: prefix.length,
    capturedFrames: 0,
    truncated: true,
    frames: [],
  };
  // Reserve metadata space and account for each comma. Never serialise an
  // unbounded prefix merely to discover that the report exceeds its budget.
  let used = bytes(envelope) + 64;
  for (const entry of prefix) {
    const size = bytes(entry) + 1;
    if (envelope.frames.length === MAX_FRAMES || used + size > Math.min(byteBudget, MAX_BYTES))
      break;
    envelope.frames.push(entry);
    used += size;
  }
  envelope.capturedFrames = envelope.frames.length;
  envelope.truncated = envelope.capturedFrames !== envelope.totalFrames;
  return envelope;
}

/** Fail closed on incomplete, mixed-session/channel or malformed evidence. */
export function replayChecksums(envelope: ChecksumReplay): ChecksumVerification[] {
  const { frames, sessionId, chanId, throughIndex } = envelope;
  if (
    envelope.version !== 1 ||
    !sessionId ||
    !Number.isInteger(chanId) ||
    envelope.truncated ||
    envelope.capturedFrames !== frames.length ||
    envelope.totalFrames !== frames.length ||
    frames.length === 0
  ) {
    throw new AssertionError('Checksum replay is incomplete or has invalid metadata');
  }
  let previous = -1;
  let snapshotSeen = false;
  for (const entry of frames) {
    if (
      entry.sessionId !== sessionId ||
      !Number.isSafeInteger(entry.index) ||
      entry.index <= previous ||
      entry.index > throughIndex
    ) {
      throw new AssertionError('Checksum replay session or index order is invalid');
    }
    previous = entry.index;
    const frame = entry.frame;
    if (!Array.isArray(frame) || frame[0] !== chanId) {
      throw new AssertionError('Checksum replay channel is invalid');
    }
    if (isBookChecksumFrame(frame, chanId)) {
      if (!snapshotSeen) throw new AssertionError('Checksum precedes snapshot');
      continue;
    }
    const payload: unknown = frame[1];
    if (frame.length < 2 || !Array.isArray(payload)) {
      throw new AssertionError('Checksum replay data frame is invalid');
    }
    if (!snapshotSeen) {
      if (!payload.every(isBookLevel)) throw new AssertionError('Invalid replay snapshot');
      snapshotSeen = true;
    } else if (!isBookLevel(payload)) {
      throw new AssertionError('Invalid replay mutation or repeated snapshot');
    }
  }
  const last = frames[frames.length - 1];
  if (!last || last.index !== throughIndex || !isBookChecksumFrame(last.frame, chanId)) {
    throw new AssertionError('Checksum replay does not end at its declared checksum');
  }
  const log = extractBookFrames(frames);
  return frames.flatMap((entry) =>
    isBookChecksumFrame(entry.frame, chanId)
      ? [
          verifyChecksumAtIndex(
            log.snapshotLevels,
            log.snapshotIndex,
            log.updates,
            entry.index,
            entry.frame[2],
          ),
        ]
      : [],
  );
}

/** Attach one envelope only, preserving compact successful results. */
export function attachChecksumReplay(
  results: ChecksumVerification[],
  capture: (byteBudget: number) => ChecksumReplay,
): ChecksumVerification[] {
  const firstMismatch = results.find((result) => result.actual !== result.expected);
  if (firstMismatch) {
    // Include the existing result diagnostics and JSON property overhead in
    // the scenario budget, not just the replay frame array.
    firstMismatch.replay = capture(MAX_BYTES - bytes(results) - 32);
  }
  return results;
}
