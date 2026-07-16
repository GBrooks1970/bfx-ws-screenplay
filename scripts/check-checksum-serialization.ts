/**
 * Standalone unit check for `wireNumber`/`checksumString` (review Risk #1,
 * MEDIUM): guards the flagship checksum assertion against `String()`'s
 * silent exponent-notation fallback for very small/large magnitudes.
 *
 * Deliberately outside Cypress: these are pure functions over the book
 * modules, so this proves the guard without a browser context, a live
 * connection, or a test runner. Run with:
 *
 *   npx tsx scripts/check-checksum-serialization.ts
 *
 * Exits 0 with a summary line per check on success, exits 1 and prints the
 * failing check(s) otherwise.
 */
import {
  applyLevel,
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
    'wireNumber: exponent-range magnitude (1e-7) throws a named, explained error',
    () => {
      const error = assertThrows(
        () => wireNumber(1e-7),
        ChecksumSerializationError,
        'wireNumber(1e-7)',
      );
      assertEqual(error.name, 'ChecksumSerializationError', 'error.name');
      if (!error.message.includes('1e-7') || !error.message.includes('exponent notation')) {
        throw new Error(`wireNumber(1e-7) error message not diagnosable: ${error.message}`);
      }
    },
  ],
  [
    'wireNumber: large-magnitude token (1e21) also throws, not just small ones',
    () => {
      assertThrows(() => wireNumber(1e21), ChecksumSerializationError, 'wireNumber(1e21)');
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
    'checksumString: an exponent-range level fails loudly, not with a silent wrong checksum',
    () => {
      const book = emptyBook();
      // A sub-tick-precision amount is the realistic route to exponent notation
      // (low-priced pairs at high precision) — see review Risk #1.
      const bidLevel: BookLevel = [0.0000001, 1, 1e-7];
      applyLevel(book, bidLevel);
      assertThrows(() => checksumString(book), ChecksumSerializationError, 'checksumString(exponent-range book)');
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
