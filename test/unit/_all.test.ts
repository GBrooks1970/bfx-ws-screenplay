/**
 * Discovery shim for the deterministic `node:test` unit suite (CODEX-05).
 *
 * The Node 20 test runner (the project's supported floor) does not expand glob
 * arguments to `--test`, and shell globbing is not portable across the local
 * (Windows) and CI (Ubuntu) shells. So a single entry file loads every sibling
 * `*.test.ts` synchronously; their top-level `test()`/`describe()` calls
 * register on the default runner during that load, giving zero-dependency
 * auto-discovery that works identically on every platform and Node version.
 * Drop a new `*.test.ts` beside this file and it is picked up with no script
 * change.
 *
 * `require` (not `await import`) is deliberate: the project runs as CommonJS, so
 * a synchronous load keeps registration inside this module's evaluation where
 * the runner collects it — a top-level `await import` would transpile to an
 * unsupported top-level await under the CJS output format.
 *
 * Run via `npm run test:unit` (`node --import tsx --test test/unit/_all.test.ts`).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const here = __dirname;
const suites = readdirSync(here)
  .filter((file) => file.endsWith('.test.ts') && file !== '_all.test.ts')
  .sort();

for (const file of suites) {
  require(join(here, file));
}
