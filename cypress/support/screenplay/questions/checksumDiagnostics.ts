import { bookChecksum, checksumString, foldBook } from '../../books';
import type { BookLevel } from '../../../schemas';

const PRECEDING_MUTATION_LIMIT = 5;

export type IndexedBookMutation = {
  level: BookLevel;
  index: number;
};

export type ChecksumMismatchDiagnostic = {
  snapshot: {
    index: number;
    levelCount: number;
  };
  updatesApplied: number;
  precedingMutations: IndexedBookMutation[];
  localChecksumInput: string;
};

export type ChecksumVerification = {
  expected: number;
  actual: number;
  csIndex: number;
  mismatch?: ChecksumMismatchDiagnostic;
};

/**
 * Builds one checksum result at an exact buffer index. A mismatch carries a
 * deliberately bounded diagnostic: snapshot location/size, the five most
 * recent mutations folded before the checksum, and the exact local top-25
 * checksum input. Matching results stay compact so a successful live report
 * does not duplicate market data.
 */
export function verifyChecksumAtIndex(
  snapshotLevels: readonly BookLevel[],
  snapshotIndex: number,
  updates: readonly IndexedBookMutation[],
  csIndex: number,
  expected: number,
): ChecksumVerification {
  const applied = updates.filter((update) => update.index < csIndex);
  const book = foldBook(
    snapshotLevels,
    applied.map((update) => update.level),
  );
  const actual = bookChecksum(book);
  const verification: ChecksumVerification = { expected, actual, csIndex };

  if (actual !== expected) {
    verification.mismatch = {
      snapshot: { index: snapshotIndex, levelCount: snapshotLevels.length },
      updatesApplied: applied.length,
      precedingMutations: applied.slice(-PRECEDING_MUTATION_LIMIT),
      localChecksumInput: checksumString(book),
    };
  }

  return verification;
}
