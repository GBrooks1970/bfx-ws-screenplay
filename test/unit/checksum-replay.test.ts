import { describe, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachChecksumReplay,
  captureChecksumReplay,
  captureChecksumReplayV2,
  classifyGap,
  GAP_DETAIL_LIMIT,
  replayChecksums,
  type ChecksumReplay,
  type ReplayFrame,
} from '../../cypress/support/screenplay/questions/checksumReplay';
import liveRecurrence from '../fixtures/live-01/2026-11-23_run-45159119472.json' with { type: 'json' };
import { satisfies } from '../../cypress/support/screenplay/core/Ensure';
import { Actor } from '../../cypress/support/screenplay/core/Actor';
import { CommunicateOverWebSocket } from '../../cypress/support/screenplay/abilities/CommunicateOverWebSocket';
import { ChecksumVerifications } from '../../cypress/support/screenplay/questions/ChecksumVerifications';
import type { BufferedFrame, PredicateSpec } from '../../node-driver/protocol';
import { frameMatches } from '../../node-driver/predicates';

// Independently calculated with Python zlib.crc32, signed int32:
// '100:2:101:-2' => 599066899; '100:3:101:-2' => -283178611.
// Deliberately synthetic protocol fixture, not a captured LIVE-01 recurrence.
const frames = (): ReplayFrame[] => [
  {
    sessionId: 's1',
    index: 2,
    frame: [
      7,
      [
        [100, 1, 2],
        [101, 1, -2],
      ],
    ],
  },
  { sessionId: 's1', index: 4, frame: [7, 'cs', 599066899] },
  { sessionId: 's1', index: 6, frame: [7, [100, 1, 3]] },
  { sessionId: 's1', index: 8, frame: [7, 'cs', -283178611] },
];
const capture = (input = frames()) => captureChecksumReplay('s1', 7, 8, input);

// A whole session buffer as the driver holds it: every inbound message gets the next
// index, and a message that is not valid JSON is kept as its raw string. Book channel 7
// data frames sit among events, a heartbeat, another channel and unparsable input.
const INFO = { event: 'info', version: 2, platform: { status: 1 } };
const sessionBuffer = (): { index: number; frame: unknown }[] => [
  { index: 0, frame: INFO },
  { index: 1, frame: { event: 'conf', status: 'OK', flags: 131072 } },
  { index: 2, frame: { event: 'subscribed', channel: 'book', chanId: 7 } },
  {
    index: 3,
    frame: [
      7,
      [
        [100, 1, 2],
        [101, 1, -2],
      ],
    ],
  },
  { index: 4, frame: [7, 'hb'] },
  { index: 5, frame: [7, 'cs', 599066899] },
  { index: 6, frame: [9, 'te', [1, 2, 3]] },
  { index: 7, frame: [7, [100, 1, 3]] },
  { index: 8, frame: 'not json {' },
  { index: 9, frame: 42 },
  { index: 10, frame: [7, 'cs', -283178611] },
  { index: 11, frame: [7, [100, 1, 99]] },
];

const askRealQuestion = async (t: TestContext, buffer: { index: number; frame: unknown }[]) => {
  const ws = new CommunicateOverWebSocket();
  const actor = Actor.named('Replay test').whoCan(ws);
  actor.remembers('book:chanId', 7);
  t.mock.method(ws, 'diagnosticSessionId', () => 's1');
  const select = (spec: PredicateSpec): Cypress.Chainable<BufferedFrame[]> =>
    Promise.resolve(
      buffer
        .filter((entry) => frameMatches(entry.frame, spec))
        .map(({ index, frame }) => ({ index, frame, receivedAt: index })),
    ) as unknown as Cypress.Chainable<BufferedFrame[]>;
  const calls = { messagesWhere: 0, peek: [] as PredicateSpec[] };
  // Select through the production predicate, exactly as the driver buffer does. A
  // `frameType: 'data'` query excludes only heartbeats, so it also returns the `cs`
  // frames; an earlier hand-written filter hid that and let the capture duplicate them.
  t.mock.method(ws, 'messagesWhere', (spec: PredicateSpec) => {
    calls.messagesWhere += 1;
    return select(spec);
  });
  t.mock.method(ws, 'peek', (spec: PredicateSpec) => {
    calls.peek.push(spec);
    return select(spec);
  });
  const result = await (ChecksumVerifications.firstConsecutive(2).answeredBy(
    actor,
  ) as unknown as Promise<ReturnType<typeof replayChecksums>>);
  return { result, calls };
};

// A valid version 2 envelope for the session buffer above (all checksums match).
const v2 = () => ({
  version: 2 as const,
  sessionId: 's1',
  chanId: 7,
  fromIndex: 0,
  throughIndex: 10,
  totalFrames: 11,
  capturedFrames: 11,
  truncated: false,
  frames: sessionBuffer()
    .filter((e) => [3, 5, 7, 10].includes(e.index))
    .map(({ index, frame }) => ({ sessionId: 's1', index, frame })),
  gaps: [
    { index: 0, kind: 'event', detail: JSON.stringify(INFO) },
    { index: 1, kind: 'event', detail: '{"event":"conf","status":"OK","flags":131072}' },
    { index: 2, kind: 'event', detail: '{"event":"subscribed","channel":"book","chanId":7}' },
    { index: 4, kind: 'heartbeat' },
    { index: 6, kind: 'other-channel', detail: '9 te' },
    { index: 8, kind: 'unparsed', detail: 'not json {', length: 10 },
    { index: 9, kind: 'other', detail: 'number' },
  ] as { index: number; kind: string; detail?: string; length?: number }[],
});

describe('replay envelope version 2', () => {
  test('the real question attaches a version 2 envelope that names every non-data index', async (t) => {
    const buffer = sessionBuffer();
    buffer[5]!.frame = [7, 'cs', 123];
    const { result, calls } = await askRealQuestion(t, buffer);
    assert.equal(calls.messagesWhere, 2);
    assert.deepEqual(calls.peek, [{ kind: 'any' }], 'the whole buffer is read once, on a mismatch');
    assert.equal(result[1]!.replay, undefined);
    const envelope = result[0]!.replay as unknown as ReturnType<typeof v2>;
    const expected = v2();
    expected.frames[1]!.frame = [7, 'cs', 123];
    assert.deepEqual(envelope, expected);
    const replayed = replayChecksums(envelope as unknown as ChecksumReplay);
    assert.deepEqual(
      replayed.map((r) => [r.csIndex, r.expected, r.actual]),
      [
        [5, 123, 599066899],
        [10, -283178611, -283178611],
      ],
    );
  });

  test('a passing run makes no extra buffer read and attaches nothing', async (t) => {
    const { result, calls } = await askRealQuestion(t, sessionBuffer());
    assert.equal(calls.messagesWhere, 2);
    assert.deepEqual(calls.peek, []);
    assert.ok(result.every((r) => r.actual === r.expected && !r.replay));
  });

  test('replays a complete version 2 envelope through the data frames only', () => {
    const results = replayChecksums(v2() as unknown as ChecksumReplay);
    assert.deepEqual(
      results.map((r) => r.actual),
      [599066899, -283178611],
    );
    assert.ok(results.every((r) => r.actual === r.expected));
  });

  test('rejects a version 2 envelope that does not cover every index exactly once', () => {
    const rejects = (change: (value: ReturnType<typeof v2>) => void, message = /replay/i) => {
      const value = v2();
      change(value);
      assert.throws(() => replayChecksums(value as unknown as ChecksumReplay), message);
    };
    const coverage = /index coverage/;
    // A missing index, with the counts adjusted so only the hole is wrong.
    rejects((v) => {
      v.gaps.splice(3, 1);
      v.totalFrames = v.capturedFrames = 10;
    }, coverage);
    // An index claimed by both a data frame and a placeholder.
    rejects((v) => {
      v.gaps[3]!.index = 5;
    });
    rejects((v) => {
      v.gaps.reverse();
    });
    rejects((v) => {
      v.gaps[0]!.index = 11;
    });
    rejects((v) => {
      v.fromIndex = 1;
    });
    rejects((v) => {
      v.fromIndex = -1;
    });
    rejects((v) => {
      v.gaps[3]!.kind = 'book';
    });
    rejects((v) => {
      v.gaps[5]!.detail = 'x'.repeat(257);
    });
    rejects((v) => {
      v.gaps[5]!.length = -1;
    });
    // A placeholder must not smuggle a frame past the fold.
    rejects((v) => {
      (v.gaps[3] as Record<string, unknown>)['frame'] = [7, [100, 1, 5]];
    });
    rejects((v) => {
      (v as Record<string, unknown>)['gaps'] = undefined;
    });
    rejects((v) => {
      v.truncated = true;
    });
    rejects((v) => {
      v.capturedFrames = 4;
    });
  });

  test('classifies each kind of non-data entry and bounds its detail', () => {
    const long = 'x'.repeat(GAP_DETAIL_LIMIT + 50);
    assert.equal(classifyGap(0, [7, [100, 1, 2]], 7), null);
    assert.equal(classifyGap(0, [7, 'cs', 1], 7), null);
    assert.equal(classifyGap(0, [7], 7), null, 'mirrors the driver: only heartbeats are not data');
    assert.deepEqual(classifyGap(1, [7, 'hb'], 7), { index: 1, kind: 'heartbeat' });
    assert.deepEqual(classifyGap(2, [9, [1, 2]], 7), {
      index: 2,
      kind: 'other-channel',
      detail: '9',
    });
    assert.deepEqual(classifyGap(3, long, 7), {
      index: 3,
      kind: 'unparsed',
      detail: long.slice(0, GAP_DETAIL_LIMIT),
      length: long.length,
    });
    assert.equal(classifyGap(4, { event: 'info', msg: long }, 7)!.detail!.length, GAP_DETAIL_LIMIT);
    assert.deepEqual(classifyGap(5, { other: 1 }, 7), { index: 5, kind: 'other', detail: 'object' });
    assert.deepEqual(classifyGap(6, ['x'], 7), { index: 6, kind: 'other', detail: 'array' });
    assert.deepEqual(classifyGap(7, null, 7), { index: 7, kind: 'other', detail: 'null' });
    assert.deepEqual(classifyGap(8, true, 7), { index: 8, kind: 'other', detail: 'boolean' });
  });

  test('capture sorts the buffer, drops exact repeats and keeps conflicts so replay fails closed', () => {
    const buffer = sessionBuffer();
    const shuffled = [...buffer].reverse();
    assert.deepEqual(captureChecksumReplayV2('s1', 7, 10, shuffled), v2());
    const repeated = [...buffer.slice(0, 5), { ...buffer[4]! }, ...buffer.slice(5)];
    assert.deepEqual(captureChecksumReplayV2('s1', 7, 10, repeated), v2());
    const conflicting = [...buffer.slice(0, 5), { index: 4, frame: [7, 'hb', 'x'] }, ...buffer.slice(5)];
    assert.throws(
      () => replayChecksums(captureChecksumReplayV2('s1', 7, 10, conflicting)),
      /placeholder is invalid or out of order/,
    );
  });

  test('capture budgets data frames first and marks truncation across both lists', () => {
    const buffer = sessionBuffer();
    const full = captureChecksumReplayV2('s1', 7, 10, buffer);
    const tight = captureChecksumReplayV2(
      's1',
      7,
      10,
      buffer,
      Buffer.byteLength(JSON.stringify(full)) - 40,
    );
    assert.equal(tight.truncated, true);
    assert.equal(tight.frames.length, 4, 'every data frame fits before any placeholder');
    assert.ok(tight.gaps.length < 7);
    assert.equal(tight.totalFrames, 11);
    assert.throws(() => replayChecksums(tight), /incomplete/);
    const none = captureChecksumReplayV2('s1', 7, 10, buffer, 10);
    assert.deepEqual([none.frames.length, none.gaps.length, none.truncated], [0, 0, true]);
    const empty = captureChecksumReplayV2('s1', 7, 10, []);
    assert.deepEqual([empty.fromIndex, empty.totalFrames, empty.truncated], [0, 0, false]);
    assert.throws(() => replayChecksums(empty), /incomplete/);
  });
});

describe('bounded checksum replay', () => {
  test('the real question retains a replay envelope in assertion failure JSON', async (t) => {
    const buffer = sessionBuffer();
    buffer[5]!.frame = [7, 'cs', 123];
    const { result } = await askRealQuestion(t, buffer);
    const indexes = result[0]!.replay!.frames.map((entry) => entry.index);
    assert.deepEqual(indexes, [...new Set(indexes)], 'each buffer index is captured once');
    assert.equal(result[1]!.replay, undefined);
    assert.throws(
      () =>
        satisfies<typeof result>('all match', (rs) =>
          rs.every((r) => r.actual === r.expected),
        ).verify(result, 'checksums'),
      /"replay":/,
    );
    assert.equal(replayChecksums(result[0]!.replay!)[0]!.expected, 123);
  });

  test('uses an independent oracle and excludes later mutations', () => {
    const input = frames();
    input.push({ sessionId: 's1', index: 10, frame: [7, [100, 1, 99]] });
    const envelope = capture(input);
    assert.equal(envelope.totalFrames, 4);
    assert.deepEqual(
      replayChecksums(envelope).map((r) => r.actual),
      [599066899, -283178611],
    );
    assert.ok(replayChecksums(envelope).every((r) => r.actual === r.expected));
  });

  test('a missing material update or corrupt checksum stays a mismatch', () => {
    const omitted = capture(frames().filter((f) => f.index !== 6));
    assert.notEqual(replayChecksums(omitted)[1]!.actual, -283178611);
    const corrupt = frames();
    corrupt[1]!.frame = [7, 'cs', 123];
    const envelope = capture(corrupt);
    const result = attachChecksumReplay(replayChecksums(envelope), () => envelope);
    assert.notEqual(result[0]!.actual, result[0]!.expected);
    assert.equal(result[1]!.actual, result[1]!.expected);
    assert.equal(result.filter((r) => r.replay).length, 1);
    // Exercise the real assertion serialisation used by Cucumber failures.
    assert.throws(
      () =>
        satisfies<typeof result>('all match', (rs) =>
          rs.every((r) => r.actual === r.expected),
        ).verify(result, 'checksums'),
      (error: Error) => {
        const retained = JSON.parse(error.message.split(', but got ')[1]!) as typeof result;
        assert.deepEqual(retained[0]!.replay, envelope);
        assert.notEqual(replayChecksums(retained[0]!.replay!)[0]!.actual, 123);
        return true;
      },
    );
  });

  test('does not capture successful verifications', () => {
    const results = replayChecksums(capture());
    attachChecksumReplay(results, () => {
      throw new Error('must not capture');
    });
    assert.ok(results.every((r) => !r.replay && !r.mismatch));
  });

  test('rejects malformed metadata, session, channel and ordering', () => {
    const mutate = (change: (value: ReturnType<typeof capture>) => void) => {
      const value = capture();
      change(value);
      assert.throws(() => replayChecksums(value));
    };
    mutate((v) => {
      v.truncated = true;
    });
    mutate((v) => {
      v.sessionId = '';
    });
    mutate((v) => {
      v.capturedFrames = 0;
    });
    mutate((v) => {
      v.totalFrames = 99;
    });
    mutate((v) => {
      v.frames[1]!.sessionId = 'other';
    });
    mutate((v) => {
      v.frames[1]!.index = 2;
    });
    mutate((v) => {
      v.frames[1]!.index = 1.5;
    });
    mutate((v) => {
      v.throughIndex = 7;
    });
    mutate((v) => {
      v.frames[1]!.frame = [8, 'cs', 1];
    });
    mutate((v) => {
      v.frames[0]!.frame = [7, 'cs', 1];
    });
    mutate((v) => {
      v.frames[0]!.frame = [7, [100, 1, 2]];
    });
    mutate((v) => {
      v.frames[2]!.frame = [7, [[100, 1, 2]]];
    });
    mutate((v) => {
      v.frames[2]!.frame = [7, 'hb'];
    });
    mutate((v) => {
      v.frames[3]!.frame = [7, [100, 1, 3]];
    });
    assert.throws(() => replayChecksums(capture([])));
  });

  test('capture drops an exact repeat of the same index and frame', () => {
    const input = frames();
    const doubled = [...input.slice(0, 2), { ...input[1]! }, ...input.slice(2), { ...input[3]! }];
    const value = capture(doubled);
    assert.equal(value.totalFrames, 4);
    assert.equal(value.capturedFrames, 4);
    assert.equal(value.truncated, false);
    assert.deepEqual(
      replayChecksums(value).map((r) => r.actual),
      [599066899, -283178611],
    );
  });

  test('capture keeps a conflicting frame under a repeated index, so replay fails closed', () => {
    const input = frames();
    const conflicting = [...input.slice(0, 2), { ...input[1]!, frame: [7, 'cs', 1] }, ...input.slice(2)];
    const value = capture(conflicting);
    assert.equal(value.capturedFrames, 5);
    assert.throws(() => replayChecksums(value), /session or index order is invalid/);
  });

  test('pins the 2026-11-23 live recurrence: an unexplained divergence, not a correct-book oracle', () => {
    // Run 45159119472 on main at fa7b39e; provenance in test/fixtures/live-01/README.md.
    const envelope = liveRecurrence as ChecksumReplay;
    assert.equal(envelope.truncated, false);
    assert.deepEqual(
      replayChecksums(envelope).map((r) => [r.csIndex, r.expected === r.actual]),
      [
        [27, false],
        [77, false],
        [191, true],
        [291, true],
        [331, true],
      ],
    );
  });

  test('enforces frame and UTF-8 byte budgets with explicit truncation', () => {
    const many = Array.from({ length: 5_001 }, (_, index) => ({
      sessionId: 's1',
      index,
      frame: [7, [100, 1, 2]],
    }));
    const bounded = captureChecksumReplay('s1', 7, 5_000, many);
    assert.equal(bounded.capturedFrames, 5_000);
    assert.equal(bounded.totalFrames, 5_001);
    assert.equal(bounded.truncated, true);
    assert.throws(() => replayChecksums(bounded));
    const huge = [{ sessionId: 's1', index: 0, frame: [7, 'é'.repeat(600_000)] }];
    const byteLimited = captureChecksumReplay('s1', 7, 0, huge);
    assert.equal(byteLimited.capturedFrames, 0);
    assert.equal(byteLimited.truncated, true);
    assert.ok(Buffer.byteLength(JSON.stringify(byteLimited)) <= 1_048_576);
  });
});
