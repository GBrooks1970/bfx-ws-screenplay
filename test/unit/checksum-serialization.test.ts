/**
 * Unit tests for `wireNumber`/`checksumString`/`bookChecksum` — the
 * deterministic plain-decimal checksum serialiser defined in
 * `docs/adr/ADR-007-checksum-numeric-token-contract.md` (SPEC-004 flagship).
 *
 * Migrated from the former `scripts/check-checksum-serialization.ts` proof
 * script into the discoverable `node:test` suite (CODEX-05). `wireNumber`
 * *converts* exponent-form values (e.g. `1e-8`) to their canonical plain-decimal
 * token; only a non-finite value is rejected. The CRC fixture pins the exact
 * checksum string and its signed CRC-32 for a known sub-tick book.
 *
 * Pure over the book modules — no browser, no socket, no network.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLevel,
  bookChecksum,
  checksumString,
  ChecksumSerializationError,
  emptyBook,
  wireNumber,
} from '../../cypress/support/books';
import type { BookLevel } from '../../cypress/schemas';

describe('wireNumber', () => {
  test('in-range magnitude serialises as a plain decimal token', () => {
    assert.equal(wireNumber(123.45), '123.45');
    assert.equal(wireNumber(-0.5), '-0.5');
    assert.equal(wireNumber(1), '1');
  });

  test('exponent-form small magnitudes serialise to plain decimal (ADR-007)', () => {
    assert.equal(wireNumber(1e-7), '0.0000001');
    assert.equal(wireNumber(1e-8), '0.00000001');
    assert.equal(wireNumber(-1e-8), '-0.00000001');
    assert.equal(wireNumber(1.5e-7), '0.00000015');
  });

  test('large magnitudes, ordinary decimals and signed zero serialise per contract', () => {
    assert.equal(wireNumber(1e21), '1000000000000000000000');
    assert.equal(wireNumber(0.10783801), '0.10783801');
    assert.equal(wireNumber(0), '0');
    assert.equal(wireNumber(-0), '0');
  });

  test('a non-finite value is still rejected loudly', () => {
    assert.throws(
      () => wireNumber(Number.NaN),
      (error: unknown) =>
        error instanceof ChecksumSerializationError && /finite/.test(error.message),
    );
    assert.throws(
      () => wireNumber(Number.POSITIVE_INFINITY),
      ChecksumSerializationError,
    );
  });
});

describe('checksumString / bookChecksum', () => {
  test('an in-range book serialises without throwing', () => {
    const book = emptyBook();
    applyLevel(book, [64000.5, 1, 0.75] satisfies BookLevel);
    applyLevel(book, [64010.25, 1, -0.5] satisfies BookLevel);
    const result = checksumString(book);
    assert.match(result, /64000\.5/);
    assert.match(result, /64010\.25/);
  });

  test('CRC fixture: a known sub-tick book yields the exact string and signed CRC-32', () => {
    const book = emptyBook();
    // A sub-tick-precision amount is the realistic route to exponent notation
    // (low-priced pairs at high precision) — see review Risk #1 / ADR-007.
    applyLevel(book, [0.00000015, 1, 0.00000001] satisfies BookLevel); // price 1.5e-7, amount +1e-8
    applyLevel(book, [0.0000002, 1, -0.00000001] satisfies BookLevel); // price 2e-7, amount -1e-8
    assert.equal(checksumString(book), '0.00000015:0.00000001:0.0000002:-0.00000001');
    // Deterministic signed CRC-32 of the exact string above (pinned fixture).
    assert.equal(bookChecksum(book), -591028654);
  });
});
