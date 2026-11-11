import { describe, it } from 'node:test';
import { equal } from 'node:assert/strict';
import {
  checkSequenceMonotonicity,
  parseSequencedFrame,
  COMBINED_DIAGNOSTIC_CONF,
} from '../../scripts/diagnose-orderbook-checksum';
import { applyLevel, bookChecksum, emptyBook } from '../../cypress/support/books';
import type { BookLevel } from '../../cypress/schemas';

describe('diagnose-orderbook-checksum', () => {
  it('combines CHECKSUM (131072) and SEQ_ALL (65536) flags into 196608', () => {
    equal(COMBINED_DIAGNOSTIC_CONF, 196608);
  });

  describe('checkSequenceMonotonicity', () => {
    it('accepts initial sequence number', () => {
      const res = checkSequenceMonotonicity(1, null);
      equal(res.ok, true);
      equal(res.actualSeq, 1);
    });

    it('accepts strictly monotonic sequence (n + 1)', () => {
      const res = checkSequenceMonotonicity(2, 1);
      equal(res.ok, true);
      equal(res.expectedSeq, 2);
      equal(res.actualSeq, 2);
    });

    it('detects a positive sequence gap (dropped frame)', () => {
      const res = checkSequenceMonotonicity(5, 2);
      equal(res.ok, false);
      equal(res.expectedSeq, 3);
      equal(res.actualSeq, 5);
      equal(res.gap, 2);
    });

    it('detects duplicate or out-of-order sequence numbers', () => {
      const duplicate = checkSequenceMonotonicity(3, 3);
      equal(duplicate.ok, false);
      equal(duplicate.gap, -1);

      const backwards = checkSequenceMonotonicity(2, 4);
      equal(backwards.ok, false);
      equal(backwards.gap, -3);
    });
  });

  describe('parseSequencedFrame', () => {
    const chanId = 42;

    it('parses a sequenced snapshot frame', () => {
      const raw = [
        chanId,
        [
          [100, 2, 1],
          [101, 3, -1],
        ],
        1,
      ];
      const parsed = parseSequencedFrame(raw, chanId);
      equal(parsed?.type, 'snapshot');
      equal(parsed?.seq, 1);
      equal(Array.isArray(parsed?.payload), true);
    });

    it('parses a sequenced update frame', () => {
      const raw = [chanId, [100, 0, 1], 2];
      const parsed = parseSequencedFrame(raw, chanId);
      equal(parsed?.type, 'update');
      equal(parsed?.seq, 2);
      equal(Array.isArray(parsed?.payload), true);
    });

    it('parses a sequenced checksum frame', () => {
      const raw = [chanId, 'cs', 12345678, 3];
      const parsed = parseSequencedFrame(raw, chanId);
      equal(parsed?.type, 'checksum');
      equal(parsed?.expectedChecksum, 12345678);
      equal(parsed?.seq, 3);
    });

    it('parses a sequenced heartbeat frame', () => {
      const raw = [chanId, 'hb', 4];
      const parsed = parseSequencedFrame(raw, chanId);
      equal(parsed?.type, 'heartbeat');
      equal(parsed?.seq, 4);
    });

    it('rejects wrong channel ID or non-array', () => {
      equal(parseSequencedFrame([999, 'cs', 123, 1], chanId), null);
      equal(parseSequencedFrame('not-an-array', chanId), null);
      equal(parseSequencedFrame([chanId], chanId), null);
    });

    it('correctly folds book state from sequenced frames and verifies checksum', () => {
      const book = emptyBook();
      const snapshot: BookLevel[] = [
        [100, 1, 2],
        [101, 1, -2],
      ];
      snapshot.forEach((lvl) => applyLevel(book, lvl));
      // Oracle: '100:2:101:-2' -> 599066899 (CRC32 signed)
      equal(bookChecksum(book), 599066899);

      // Mutate: update level [100, 1, 3]
      const update: BookLevel = [100, 1, 3];
      applyLevel(book, update);
      // Oracle: '100:3:101:-2' -> -283178611 (CRC32 signed)
      equal(bookChecksum(book), -283178611);
    });
  });
});
