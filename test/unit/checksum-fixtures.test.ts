/**
 * Contract test driving `checksumString`/`bookChecksum` from the shared
 * language-neutral fixtures (`test/fixtures/checksum.fixtures.json`, CODEX-06).
 * Each fixture folds a set of [price, count, amount] levels and pins the exact
 * wire string and signed 32-bit CRC-32 — the same JSON a future implementation
 * in any language can verify its own serialiser against (SPEC-004 / ADR-007).
 * Also covers `crc32Signed` directly for the empty-string boundary.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLevel, bookChecksum, checksumString, crc32Signed, emptyBook } from '../../cypress/support/books';
import type { BookLevel } from '../../cypress/schemas';
import fixtures from '../fixtures/checksum.fixtures.json' with { type: 'json' };

describe('checksum fixtures (language-neutral contract)', () => {
  for (const fixture of fixtures.cases) {
    test(`${fixture.name}: string and signed CRC-32 match the pinned values`, () => {
      const book = emptyBook();
      for (const level of fixture.levels) {
        applyLevel(book, level as unknown as BookLevel);
      }
      assert.equal(checksumString(book), fixture.expectedChecksumString);
      assert.equal(bookChecksum(book), fixture.expectedCrc32Signed);
    });
  }
});

describe('crc32Signed', () => {
  test('returns the standard signed 32-bit CRC-32 of the empty string (0)', () => {
    assert.equal(crc32Signed(''), 0);
  });

  test('is deterministic and matches the pinned fixture string directly', () => {
    const first = fixtures.cases[0];
    assert.ok(first);
    assert.equal(crc32Signed(first.expectedChecksumString), first.expectedCrc32Signed);
  });
});
