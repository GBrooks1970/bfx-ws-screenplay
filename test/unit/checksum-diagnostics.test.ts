import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bookChecksum, foldBook } from '../../cypress/support/books';
import { verifyChecksumAtIndex } from '../../cypress/support/screenplay/questions/checksumDiagnostics';
import type { BookLevel } from '../../cypress/schemas';

const level = (price: number, count: number, amount: number): BookLevel => [price, count, amount];

describe('checksum mismatch diagnostics', () => {
  const snapshot = [level(100, 1, 2), level(101, 1, -2)];
  const updates = [
    { index: 11, level: level(99, 1, 1) },
    { index: 12, level: level(102, 1, -1) },
    { index: 13, level: level(98, 1, 3) },
    { index: 14, level: level(103, 1, -3) },
    { index: 15, level: level(97, 1, 4) },
    { index: 16, level: level(104, 1, -4) },
    { index: 18, level: level(96, 1, 5) },
  ];

  test('keeps a matching verification compact', () => {
    const expected = bookChecksum(foldBook(snapshot, updates.slice(0, 6).map(({ level }) => level)));
    assert.deepEqual(verifyChecksumAtIndex(snapshot, 10, updates, 17, expected), {
      expected,
      actual: expected,
      csIndex: 17,
    });
  });

  test('records bounded evidence for a mismatch at the exact checksum index', () => {
    const result = verifyChecksumAtIndex(snapshot, 10, updates, 17, 123);

    assert.equal(result.expected, 123);
    assert.equal(result.csIndex, 17);
    assert.notEqual(result.actual, result.expected);
    assert.deepEqual(result.mismatch?.snapshot, { index: 10, levelCount: 2 });
    assert.equal(result.mismatch?.updatesApplied, 6);
    assert.deepEqual(
      result.mismatch?.precedingMutations.map(({ index }) => index),
      [12, 13, 14, 15, 16],
    );
    assert.doesNotMatch(result.mismatch?.localChecksumInput ?? '', /96/);
    assert.match(result.mismatch?.localChecksumInput ?? '', /97/);
  });
});
