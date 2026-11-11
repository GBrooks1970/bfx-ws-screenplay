/**
 * Out-of-band diagnostic probe for order-book checksum verification and sequence monotonicity.
 *
 * This script runs independently outside Cucumber/Cypress. It opens an isolated WebSocket
 * connection to Bitfinex API v2 with combined configuration flags:
 *   - CHECKSUM: 131072 (0x20000)
 *   - SEQ_ALL:  65536  (0x10000)
 *   Combined:   196608
 *
 * It inspects:
 *   1. Raw wire tokens before JSON parsing.
 *   2. Sequence number monotonicity across channel messages to detect dropped packets or gaps.
 *   3. Early-frame vs steady-state checksum agreement between the local book replica and Bitfinex.
 *
 * Usage:
 *   node --import tsx scripts/diagnose-orderbook-checksum.ts [--count=5] [--symbol=tBTCUSD] [--timeout=30000]
 *   npm run diagnose:checksum
 */
import { WebSocket } from 'ws';
import { BOOK_SETTINGS, CHECKSUM_CONF_FLAG, ENDPOINTS, SYMBOLS } from '../cypress/support/config';
import { applyLevel, bookChecksum, checksumString, emptyBook, sortedSides, type MaintainedBook } from '../cypress/support/books';
import type { BookLevel } from '../cypress/schemas';

export const SEQ_ALL_FLAG = 65536;
export const COMBINED_DIAGNOSTIC_CONF = CHECKSUM_CONF_FLAG | SEQ_ALL_FLAG; // 196608

export type SequencedFrameType = 'snapshot' | 'update' | 'checksum' | 'heartbeat' | 'unknown';

export interface SequencedFrame {
  chanId: number;
  type: SequencedFrameType;
  payload?: unknown;
  seq?: number;
  expectedChecksum?: number;
}

export interface SequenceCheckResult {
  ok: boolean;
  expectedSeq?: number;
  actualSeq?: number;
  gap?: number;
}

/**
 * Checks sequence number monotonicity for sequenced channel messages.
 */
export function checkSequenceMonotonicity(
  currentSeq: number,
  previousSeq: number | null,
): SequenceCheckResult {
  if (previousSeq === null) {
    return { ok: true, actualSeq: currentSeq };
  }
  const expectedSeq = previousSeq + 1;
  if (currentSeq === expectedSeq) {
    return { ok: true, expectedSeq, actualSeq: currentSeq };
  }
  return {
    ok: false,
    expectedSeq,
    actualSeq: currentSeq,
    gap: currentSeq - expectedSeq,
  };
}

/**
 * Parses a channel array frame when SEQ_ALL is active (sequence is trailing element).
 */
export function parseSequencedFrame(frame: unknown, chanId: number): SequencedFrame | null {
  if (!Array.isArray(frame) || frame[0] !== chanId || frame.length < 2) {
    return null;
  }

  // Trailing element is sequence number when SEQ_ALL is active
  const lastElement = frame[frame.length - 1];
  const hasSeq = typeof lastElement === 'number' && Number.isInteger(lastElement) && frame.length >= 3;
  const seq = hasSeq ? (lastElement as number) : undefined;

  // Checksum frame: [chanId, "cs", checksum, seq?]
  if (frame[1] === 'cs' && typeof frame[2] === 'number') {
    return {
      chanId,
      type: 'checksum',
      expectedChecksum: frame[2],
      seq,
    };
  }

  // Heartbeat frame: [chanId, "hb", seq?]
  if (frame[1] === 'hb') {
    return {
      chanId,
      type: 'heartbeat',
      seq,
    };
  }

  // Data frame: [chanId, payload, seq?]
  const payload = frame[1];
  if (Array.isArray(payload)) {
    if (payload.length > 0 && Array.isArray(payload[0])) {
      return {
        chanId,
        type: 'snapshot',
        payload,
        seq,
      };
    }
    if (payload.length === 3 && typeof payload[0] === 'number') {
      return {
        chanId,
        type: 'update',
        payload,
        seq,
      };
    }
  }

  return {
    chanId,
    type: 'unknown',
    payload,
    seq,
  };
}

export interface DiagnosticRunOptions {
  url?: string;
  symbol?: string;
  targetCount?: number;
  timeoutMs?: number;
  log?: (message: string) => void;
}

export interface DiagnosticRunOutcome {
  totalFrames: number;
  checksumsEvaluated: number;
  matches: number;
  mismatches: number;
  sequenceGaps: number;
  success: boolean;
}

export async function runDiagnostic(options: DiagnosticRunOptions = {}): Promise<DiagnosticRunOutcome> {
  const url = options.url ?? ENDPOINTS.public;
  const symbol = options.symbol ?? SYMBOLS.primary;
  const targetCount = options.targetCount ?? 5;
  const timeoutMs = options.timeoutMs ?? 30000;
  const log = options.log ?? console.log;

  return new Promise((resolve, reject) => {
    log(`[DIAGNOSTIC] Connecting to ${url}...`);
    log(`[DIAGNOSTIC] Symbol: ${symbol}, Target checksum matches: ${targetCount}`);
    log(`[DIAGNOSTIC] Flags: ${COMBINED_DIAGNOSTIC_CONF} (CHECKSUM=${CHECKSUM_CONF_FLAG} | SEQ_ALL=${SEQ_ALL_FLAG})`);

    const ws = new WebSocket(url);
    const book: MaintainedBook = emptyBook();
    let chanId: number | null = null;
    let lastSeq: number | null = null;
    let totalFrames = 0;
    let checksumsEvaluated = 0;
    let matches = 0;
    let mismatches = 0;
    let sequenceGaps = 0;
    let updatesApplied = 0;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.terminate();
        log(`[DIAGNOSTIC TIMEOUT] Reached ${timeoutMs}ms limit.`);
        resolve({
          totalFrames,
          checksumsEvaluated,
          matches,
          mismatches,
          sequenceGaps,
          success: checksumsEvaluated >= targetCount && mismatches === 0 && sequenceGaps === 0,
        });
      }
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      settled = true;
      ws.close();
    }

    ws.on('open', () => {
      log('[DIAGNOSTIC] Socket opened. Sending conf with CHECKSUM and SEQ_ALL...');
      ws.send(JSON.stringify({ event: 'conf', flags: COMBINED_DIAGNOSTIC_CONF }));
    });

    ws.on('message', (data) => {
      totalFrames += 1;
      const rawText = data.toString('utf8');

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        log(`[PARSE ERROR] Invalid JSON: ${rawText.slice(0, 80)}`);
        return;
      }

      // Handle non-channel event objects
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const evt = parsed as Record<string, unknown>;
        if (evt.event === 'info') {
          log(`[INFO] Bitfinex server version ${evt.version}, status: ${JSON.stringify(evt.platform)}`);
        } else if (evt.event === 'conf') {
          log(`[CONF ACK] status=${evt.status}, flags=${evt.flags}`);
          // Once conf is acked, subscribe to book
          log(`[SUBSCRIBE] Subscribing to ${symbol} book...`);
          ws.send(
            JSON.stringify({
              event: 'subscribe',
              channel: 'book',
              symbol,
              prec: BOOK_SETTINGS.prec,
              freq: BOOK_SETTINGS.freq,
              len: BOOK_SETTINGS.len,
            }),
          );
        } else if (evt.event === 'subscribed' && evt.channel === 'book') {
          chanId = evt.chanId as number;
          log(`[SUBSCRIBED] Book channel subscribed: chanId=${chanId}`);
        } else if (evt.event === 'error') {
          log(`[ERROR EVENT] Code=${evt.code}, Msg=${evt.msg}`);
          cleanup();
          reject(new Error(`Bitfinex returned error event: ${evt.msg} (code ${evt.code})`));
        }
        return;
      }

      if (chanId === null) {
        return;
      }

      const sequenced = parseSequencedFrame(parsed, chanId);
      if (!sequenced) {
        return;
      }

      // Check sequence monotonicity if sequence number present
      if (sequenced.seq !== undefined) {
        const seqCheck = checkSequenceMonotonicity(sequenced.seq, lastSeq);
        if (!seqCheck.ok) {
          sequenceGaps += 1;
          log(`[SEQ GAP] Expected sequence ${seqCheck.expectedSeq}, received ${seqCheck.actualSeq} (gap: ${seqCheck.gap})`);
        }
        lastSeq = sequenced.seq;
      }

      if (sequenced.type === 'snapshot') {
        const snapshotLevels = sequenced.payload as BookLevel[];
        snapshotLevels.forEach((level) => applyLevel(book, level));
        const { bids, asks } = sortedSides(book);
        log(`[SNAPSHOT] Applied ${snapshotLevels.length} levels (bids: ${bids.length}, asks: ${asks.length}) at seq=${sequenced.seq ?? 'N/A'}`);
      } else if (sequenced.type === 'update') {
        const updateLevel = sequenced.payload as BookLevel;
        applyLevel(book, updateLevel);
        updatesApplied += 1;
      } else if (sequenced.type === 'checksum') {
        checksumsEvaluated += 1;
        const expectedCs = sequenced.expectedChecksum!;
        const actualCs = bookChecksum(book);
        const match = actualCs === expectedCs;

        if (match) {
          matches += 1;
          log(
            `[CHECKSUM #${checksumsEvaluated}] seq=${sequenced.seq ?? 'N/A'} | Expected: ${expectedCs} | Actual: ${actualCs} | MATCH | Updates applied: ${updatesApplied}`,
          );
        } else {
          mismatches += 1;
          log(`[CHECKSUM #${checksumsEvaluated}] seq=${sequenced.seq ?? 'N/A'} | Expected: ${expectedCs} | Actual: ${actualCs} | MISMATCH!`);
          log(`  Local checksum string: ${checksumString(book)}`);
          const sides = sortedSides(book);
          log(`  Top 3 Bids: ${JSON.stringify(sides.bids.slice(0, 3))}`);
          log(`  Top 3 Asks: ${JSON.stringify(sides.asks.slice(0, 3))}`);
        }

        if (checksumsEvaluated >= targetCount) {
          log(`[DIAGNOSTIC COMPLETE] Target of ${targetCount} checksum frames reached.`);
          cleanup();
          resolve({
            totalFrames,
            checksumsEvaluated,
            matches,
            mismatches,
            sequenceGaps,
            success: mismatches === 0 && sequenceGaps === 0,
          });
        }
      }
    });

    ws.on('error', (err) => {
      log(`[SOCKET ERROR] ${err.message}`);
      cleanup();
      reject(err);
    });

    ws.on('close', (code, reason) => {
      log(`[SOCKET CLOSED] code=${code}, reason=${reason.toString('utf8')}`);
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        resolve({
          totalFrames,
          checksumsEvaluated,
          matches,
          mismatches,
          sequenceGaps,
          success: checksumsEvaluated >= targetCount && mismatches === 0 && sequenceGaps === 0,
        });
      }
    });
  });
}

// Direct CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  let targetCount = 5;
  let symbol: string = SYMBOLS.primary;
  let timeoutMs = 30000;

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      targetCount = parseInt(arg.slice(8), 10);
    } else if (arg.startsWith('--symbol=')) {
      symbol = arg.slice(9);
    } else if (arg.startsWith('--timeout=')) {
      timeoutMs = parseInt(arg.slice(10), 10);
    }
  }

  runDiagnostic({ symbol, targetCount, timeoutMs })
    .then((outcome) => {
      console.log('--- Summary ---');
      console.log(`Total frames: ${outcome.totalFrames}`);
      console.log(`Checksums evaluated: ${outcome.checksumsEvaluated} (Matches: ${outcome.matches}, Mismatches: ${outcome.mismatches})`);
      console.log(`Sequence gaps: ${outcome.sequenceGaps}`);
      console.log(`Verdict: ${outcome.success ? 'PASS' : 'FAIL'}`);
      process.exit(outcome.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
