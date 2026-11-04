import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachChecksumReplay,
  captureChecksumReplay,
  replayChecksums,
  type ReplayFrame,
} from '../../cypress/support/screenplay/questions/checksumReplay';
import { satisfies } from '../../cypress/support/screenplay/core/Ensure';
import { Actor } from '../../cypress/support/screenplay/core/Actor';
import { CommunicateOverWebSocket } from '../../cypress/support/screenplay/abilities/CommunicateOverWebSocket';
import { ChecksumVerifications } from '../../cypress/support/screenplay/questions/ChecksumVerifications';
import type { BufferedFrame } from '../../node-driver/protocol';

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

describe('bounded checksum replay', () => {
  test('the real question retains a replay envelope in assertion failure JSON', async (t) => {
    const input = frames();
    input[1]!.frame = [7, 'cs', 123];
    const ws = new CommunicateOverWebSocket();
    const actor = Actor.named('Replay test').whoCan(ws);
    actor.remembers('book:chanId', 7);
    t.mock.method(ws, 'diagnosticSessionId', () => 's1');
    let calls = 0;
    t.mock.method(ws, 'messagesWhere', () => {
      const checksums = calls++ === 0;
      const selected: BufferedFrame[] = input
        .filter((entry) => Array.isArray(entry.frame) && (entry.frame[1] === 'cs') === checksums)
        .map(({ index, frame }) => ({ index, frame, receivedAt: index }));
      return Promise.resolve(selected) as unknown as Cypress.Chainable<BufferedFrame[]>;
    });
    const result = await (ChecksumVerifications.firstConsecutive(2).answeredBy(
      actor,
    ) as unknown as Promise<ReturnType<typeof replayChecksums>>);
    assert.equal(calls, 2);
    assert.equal(result[0]!.replay?.capturedFrames, 4);
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
