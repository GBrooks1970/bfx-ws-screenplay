/**
 * Standalone unit + fixture check for `wireNumber`/`checksumString` (Codex
 * review v1, Risk #1, HIGH): proves the deterministic plain-decimal checksum
 * serialiser defined in `docs/adr/ADR-007-checksum-numeric-token-contract.md`.
 * `wireNumber` now *converts* exponent-form values (e.g. `1e-8`) to their
 * canonical plain-decimal token rather than throwing, and only a non-finite
 * value is rejected. The CRC fixture pins the exact checksum string and its
 * signed CRC-32 for a known sub-tick book without weakening the live comparison.
 *
 * Deliberately outside Cypress: these are pure functions over the book
 * modules, so this proves the serialiser without a browser context, a live
 * connection, or a test runner. Run with:
 *
 *   npx tsx scripts/check-checksum-serialization.ts
 *
 * Exits 0 with a summary line per check on success, exits 1 and prints the
 * failing check(s) otherwise.
 */
import {
  applyLevel,
  bookChecksum,
  checksumString,
  ChecksumSerializationError,
  emptyBook,
  wireNumber,
} from '../cypress/support/books';
import type { BookLevel } from '../cypress/schemas';

type CheckResult = { name: string; pass: boolean; detail?: string };

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn: () => void, errorClass: abstract new (...args: never[]) => Error, message: string): Error {
  try {
    fn();
  } catch (error) {
    if (error instanceof errorClass) {
      return error;
    }
    throw new Error(`${message}: threw ${String(error)}, expected an instance of ${errorClass.name}`, {
      cause: error,
    });
  }
  throw new Error(`${message}: expected a throw, but the call returned normally`);
}

const checks: Array<[string, () => void]> = [
  [
    'wireNumber: in-range magnitude serialises as a plain decimal token',
    () => {
      assertEqual(wireNumber(123.45), '123.45', 'wireNumber(123.45)');
      assertEqual(wireNumber(-0.5), '-0.5', 'wireNumber(-0.5)');
      assertEqual(wireNumber(1), '1', 'wireNumber(1)');
    },
  ],
  [
    'wireNumber: exponent-form small magnitudes serialise to plain decimal (ADR-007)',
    () => {
      assertEqual(wireNumber(1e-7), '0.0000001', 'wireNumber(1e-7)');
      assertEqual(wireNumber(1e-8), '0.00000001', 'wireNumber(1e-8)');
      assertEqual(wireNumber(-1e-8), '-0.00000001', 'wireNumber(-1e-8)');
      assertEqual(wireNumber(1.5e-7), '0.00000015', 'wireNumber(1.5e-7)');
    },
  ],
  [
    'wireNumber: large magnitudes, ordinary decimals and signed zero serialise per contract',
    () => {
      assertEqual(wireNumber(1e21), '1000000000000000000000', 'wireNumber(1e21)');
      assertEqual(wireNumber(0.10783801), '0.10783801', 'wireNumber(0.10783801)');
      assertEqual(wireNumber(0), '0', 'wireNumber(0)');
      assertEqual(wireNumber(-0), '0', 'wireNumber(-0)');
    },
  ],
  [
    'wireNumber: a non-finite value is still rejected loudly',
    () => {
      const error = assertThrows(
        () => wireNumber(Number.NaN),
        ChecksumSerializationError,
        'wireNumber(NaN)',
      );
      if (!error.message.includes('finite')) {
        throw new Error(`wireNumber(NaN) error not diagnosable: ${error.message}`);
      }
      assertThrows(
        () => wireNumber(Number.POSITIVE_INFINITY),
        ChecksumSerializationError,
        'wireNumber(Infinity)',
      );
    },
  ],
  [
    'checksumString: an in-range book serialises without throwing',
    () => {
      const book = emptyBook();
      const bidLevel: BookLevel = [64000.5, 1, 0.75];
      const askLevel: BookLevel = [64010.25, 1, -0.5];
      applyLevel(book, bidLevel);
      applyLevel(book, askLevel);
      const result = checksumString(book);
      if (!result.includes('64000.5') || !result.includes('64010.25')) {
        throw new Error(`checksumString for an in-range book looks wrong: ${result}`);
      }
    },
  ],
  [
    'CRC fixture: a known sub-tick book yields the exact string and signed CRC-32',
    () => {
      const book = emptyBook();
      // A sub-tick-precision amount is the realistic route to exponent notation
      // (low-priced pairs at high precision) — see review Risk #1 / ADR-007.
      // Both levels carry values that String() would render in exponent form.
      const bidLevel: BookLevel = [0.00000015, 1, 0.00000001]; // price 1.5e-7, amount +1e-8
      const askLevel: BookLevel = [0.0000002, 1, -0.00000001]; // price 2e-7, amount -1e-8
      applyLevel(book, bidLevel);
      applyLevel(book, askLevel);
      assertEqual(
        checksumString(book),
        '0.00000015:0.00000001:0.0000002:-0.00000001',
        'checksumString(sub-tick fixture)',
      );
      // Deterministic signed CRC-32 of the exact string above (pinned fixture).
      assertEqual(bookChecksum(book), -591028654, 'bookChecksum(sub-tick fixture) signed CRC-32');
    },
  ],
];

const results: CheckResult[] = checks.map(([name, fn]) => {
  try {
    fn();
    return { name, pass: true };
  } catch (error) {
    return { name, pass: false, detail: error instanceof Error ? error.message : String(error) };
  }
});

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}`);
  if (!result.pass) {
    console.log(`       ${result.detail}`);
  }
}

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  process.exit(1);
}
