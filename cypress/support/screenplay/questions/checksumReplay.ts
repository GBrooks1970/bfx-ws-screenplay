import { isBookChecksumFrame, isBookLevel } from '../../../schemas';
import { AssertionError } from '../core';
import { extractBookFrames } from './bookFolding';
import { verifyChecksumAtIndex, type ChecksumVerification } from './checksumDiagnostics';

export type ReplayFrame = { sessionId: string; index: number; frame: unknown };

/** Version 1: the book channel's data frames only (kept so pinned v1 fixtures replay). */
export type ChecksumReplayV1 = {
  version: 1;
  sessionId: string;
  chanId: number;
  throughIndex: number;
  totalFrames: number;
  capturedFrames: number;
  truncated: boolean;
  frames: ReplayFrame[];
};

export const GAP_KINDS = ['heartbeat', 'event', 'other-channel', 'unparsed', 'other'] as const;
export type ReplayGapKind = (typeof GAP_KINDS)[number];
/** A placeholder for a buffer index that is not a book data frame. */
export type ReplayGap = { index: number; kind: ReplayGapKind; detail?: string; length?: number };

/**
 * Version 2 (LIVE-01, plan 2026-11-24): `frames` keeps the version 1 meaning and is the
 * only input to the fold; `gaps` names every other buffer index from `fromIndex` to
 * `throughIndex`, so together they cover the buffer with no holes. Counts span both.
 */
export type ChecksumReplayV2 = Omit<ChecksumReplayV1, 'version'> & {
  version: 2;
  fromIndex: number;
  gaps: ReplayGap[];
};
export type ChecksumReplay = ChecksumReplayV1 | ChecksumReplayV2;

const MAX_FRAMES = 5_000;
const MAX_BYTES = 1_048_576;
export const GAP_DETAIL_LIMIT = 256;
const GAP_KEYS = new Set(['index', 'kind', 'detail', 'length']);
const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/**
 * Mirrors the driver's `{ kind: 'channel', chanId, frameType: 'data' }` selection
 * (node-driver/predicates.ts) without importing driver runtime code into Cypress.
 */
const isBookDataFrame = (frame: unknown, chanId: number): boolean =>
  Array.isArray(frame) && frame[0] === chanId && frame[1] !== 'hb';

const bounded = (text: string): string => text.slice(0, GAP_DETAIL_LIMIT);

/** Names a non-data buffer entry; returns null for a book data frame. */
export function classifyGap(index: number, frame: unknown, chanId: number): ReplayGap | null {
  if (isBookDataFrame(frame, chanId)) return null;
  if (Array.isArray(frame)) {
    if (frame[0] === chanId) return { index, kind: 'heartbeat' };
    if (typeof frame[0] === 'number') {
      const label = typeof frame[1] === 'string' ? ` ${frame[1]}` : '';
      return { index, kind: 'other-channel', detail: bounded(`${frame[0]}${label}`) };
    }
    return { index, kind: 'other', detail: 'array' };
  }
  if (typeof frame === 'string') {
    // The driver keeps a message it could not parse as its raw text.
    return { index, kind: 'unparsed', detail: bounded(frame), length: frame.length };
  }
  if (typeof frame === 'object' && frame !== null) {
    if (typeof (frame as Record<string, unknown>)['event'] === 'string') {
      return { index, kind: 'event', detail: bounded(JSON.stringify(frame)) };
    }
    return { index, kind: 'other', detail: 'object' };
  }
  return { index, kind: 'other', detail: frame === null ? 'null' : typeof frame };
}

// Drop an exact repeat of the previous entry (same index and same frame). A
// different frame under a repeated index is kept, so replay still fails closed.
function withoutExactRepeats<T extends { index: number; frame: unknown }>(
  entries: readonly T[],
  throughIndex: number,
): T[] {
  return entries.filter(
    (entry, i) =>
      entry.index <= throughIndex &&
      !(
        i > 0 &&
        entries[i - 1]!.index === entry.index &&
        JSON.stringify(entries[i - 1]!.frame) === JSON.stringify(entry.frame)
      ),
  );
}

/**
 * Pushes entries until the frame or byte budget runs out. Reserves metadata space and
 * accounts for each comma; never serialises an unbounded prefix to discover the size.
 */
function fillWithinBudget<T>(
  target: T[],
  candidates: readonly T[],
  state: { used: number; count: number; full: boolean },
  byteBudget: number,
): void {
  for (const entry of candidates) {
    const size = bytes(entry) + 1;
    if (state.count === MAX_FRAMES || state.used + size > Math.min(byteBudget, MAX_BYTES)) {
      state.full = true;
      return;
    }
    target.push(entry);
    state.used += size;
    state.count += 1;
  }
}

/** Version 1 capture: parsed book data frames only. Retained for v1 fixtures and tests. */
export function captureChecksumReplay(
  sessionId: string,
  chanId: number,
  throughIndex: number,
  frames: readonly ReplayFrame[],
  byteBudget = MAX_BYTES,
): ChecksumReplayV1 {
  const prefix = withoutExactRepeats(frames, throughIndex);
  const envelope: ChecksumReplayV1 = {
    version: 1,
    sessionId,
    chanId,
    throughIndex,
    totalFrames: prefix.length,
    capturedFrames: 0,
    truncated: true,
    frames: [],
  };
  const state = { used: bytes(envelope) + 64, count: 0, full: false };
  fillWithinBudget(envelope.frames, prefix, state, byteBudget);
  envelope.capturedFrames = envelope.frames.length;
  envelope.truncated = envelope.capturedFrames !== envelope.totalFrames;
  return envelope;
}

/**
 * Version 2 capture from the whole session buffer (every index from 0). Book data
 * frames are budgeted first, then placeholders; anything left out marks truncation.
 * Parsed frames only: completeness describes capture, not lossless wire tokens.
 */
export function captureChecksumReplayV2(
  sessionId: string,
  chanId: number,
  throughIndex: number,
  buffered: readonly { index: number; frame: unknown }[],
  byteBudget = MAX_BYTES,
): ChecksumReplayV2 {
  const prefix = withoutExactRepeats(
    [...buffered].sort((a, b) => a.index - b.index),
    throughIndex,
  );
  const data: ReplayFrame[] = [];
  const gaps: ReplayGap[] = [];
  for (const { index, frame } of prefix) {
    const gap = classifyGap(index, frame, chanId);
    if (gap) gaps.push(gap);
    else data.push({ sessionId, index, frame });
  }
  const envelope: ChecksumReplayV2 = {
    version: 2,
    sessionId,
    chanId,
    fromIndex: prefix.length > 0 ? prefix[0]!.index : 0,
    throughIndex,
    totalFrames: prefix.length,
    capturedFrames: 0,
    truncated: true,
    frames: [],
    gaps: [],
  };
  const state = { used: bytes(envelope) + 96, count: 0, full: false };
  fillWithinBudget(envelope.frames, data, state, byteBudget);
  if (!state.full) fillWithinBudget(envelope.gaps, gaps, state, byteBudget);
  envelope.capturedFrames = envelope.frames.length + envelope.gaps.length;
  envelope.truncated = envelope.capturedFrames !== envelope.totalFrames;
  return envelope;
}

/** Version 2 only: placeholders are well formed and, with the frames, cover every index once. */
function validateGaps(envelope: ChecksumReplayV2): void {
  const { gaps, frames, fromIndex, throughIndex } = envelope;
  let previous = fromIndex - 1;
  for (const gap of gaps) {
    if (
      typeof gap !== 'object' ||
      gap === null ||
      Object.keys(gap).some((key) => !GAP_KEYS.has(key)) ||
      !Number.isSafeInteger(gap.index) ||
      gap.index <= previous ||
      gap.index > throughIndex ||
      !(GAP_KINDS as readonly string[]).includes(gap.kind) ||
      (gap.detail !== undefined &&
        (typeof gap.detail !== 'string' || gap.detail.length > GAP_DETAIL_LIMIT)) ||
      (gap.length !== undefined && (!Number.isSafeInteger(gap.length) || gap.length < 0))
    ) {
      throw new AssertionError('Checksum replay placeholder is invalid or out of order');
    }
    previous = gap.index;
  }
  const covered = new Set([...frames, ...gaps].map((entry) => entry.index));
  if (
    covered.size !== frames.length + gaps.length ||
    covered.size !== throughIndex - fromIndex + 1
  ) {
    throw new AssertionError('Checksum replay index coverage is incomplete or overlapping');
  }
}

/** Fail closed on incomplete, mixed-session/channel or malformed evidence. */
export function replayChecksums(envelope: ChecksumReplay): ChecksumVerification[] {
  const { frames, sessionId, chanId, throughIndex } = envelope;
  const v2 = envelope.version === 2 ? envelope : undefined;
  const entries = frames?.length + (v2 ? (Array.isArray(v2.gaps) ? v2.gaps.length : NaN) : 0);
  if (
    (envelope.version !== 1 && !v2) ||
    !sessionId ||
    !Number.isInteger(chanId) ||
    !Array.isArray(frames) ||
    envelope.truncated ||
    envelope.capturedFrames !== entries ||
    envelope.totalFrames !== entries ||
    frames.length === 0 ||
    (v2 && (!Number.isSafeInteger(v2.fromIndex) || v2.fromIndex < 0 || v2.fromIndex > throughIndex))
  ) {
    throw new AssertionError('Checksum replay is incomplete or has invalid metadata');
  }
  let previous = v2 ? v2.fromIndex - 1 : -1;
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
  if (v2) validateGaps(v2);
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
