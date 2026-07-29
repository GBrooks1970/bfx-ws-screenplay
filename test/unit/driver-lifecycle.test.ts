/**
 * Deterministic lifecycle tests for the Node driver (CODEX-07), driving it
 * entirely through the injected socket/clock seam — no real socket is opened and
 * no wall-clock time passes. Covers open success/timeout/failure, the buffer's
 * monotonic indices, `sinceIndex`/`minCount` polls, poll timeout,
 * send-on-closed-socket, maintenance-code selection, close cleanup, and session
 * isolation.
 */
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetDriverDeps,
  close,
  listSessions,
  open,
  poll,
  reset,
  send,
} from '../../node-driver/driver';
import type { PredicateSpec } from '../../node-driver/protocol';
import { installFakeDriverEnv, infoFrameRaw, type FakeDriverEnv } from './support/driver-doubles';

const URL = 'wss://api-pub.bitfinex.com/ws/2';
let env: FakeDriverEnv;

beforeEach(() => {
  env = installFakeDriverEnv();
});

afterEach(() => {
  reset();
  __resetDriverDeps();
});

/** Opens and drives the fake socket to the "info buffered" success state. */
async function openConnected(): Promise<string> {
  const pending = open(URL, 5_000);
  env.lastSocket().emit('message', infoFrameRaw());
  const result = await pending;
  assert.ok(result.ok, 'expected a successful open');
  return result.connectionId;
}

describe('open', () => {
  test('resolves ok once the platform info event is buffered', async () => {
    const pending = open(URL, 5_000);
    env.lastSocket().emit('message', infoFrameRaw());
    const result = await pending;
    assert.equal(result.ok, true);
    assert.equal(listSessions().connectionIds.length, 1);
  });

  test('rejects an unparseable URL and a non-WebSocket protocol without a socket', async () => {
    const bad = await open('not a url', 5_000);
    assert.deepEqual([bad.ok, bad.ok || bad.reason], [false, 'invalid-url']);
    const httpUrl = await open('https://example.com', 5_000);
    assert.equal(httpUrl.ok || httpUrl.reason, 'invalid-url');
    assert.equal(env.sockets.length, 0); // never reached the socket factory
  });

  test('times out (connect-timeout) when no info event arrives before the deadline', async () => {
    const pending = open(URL, 5_000);
    env.clock.advance(5_000); // fire the connect timer; the socket stays silent
    const result = await pending;
    assert.equal(result.ok, false);
    assert.equal(result.ok || result.reason, 'connect-timeout');
    assert.equal(listSessions().connectionIds.length, 0); // session cleaned up
    assert.equal(env.lastSocket().terminated, true);
  });

  test('fails (connect-failure) on a socket error, surfacing the error message', async () => {
    const pending = open(URL, 5_000);
    env.lastSocket().emit('error', new Error('handshake refused'));
    const result = await pending;
    assert.equal(result.ok || result.reason, 'connect-failure');
    assert.equal(result.ok ? '' : result.message, 'handshake refused');
  });

  test('fails (connect-failure) when the socket closes before the info event', async () => {
    const pending = open(URL, 5_000);
    env.lastSocket().emit('close');
    const result = await pending;
    assert.equal(result.ok || result.reason, 'connect-failure');
  });
});

describe('buffer + poll', () => {
  test('assigns monotonic indices to buffered frames in arrival order', async () => {
    const connectionId = await openConnected();
    env.lastSocket().emit('message', JSON.stringify([17, 'hb']));
    env.lastSocket().emit('message', JSON.stringify([17, 'te', [1, 2, 3, 4]]));
    const result = await poll(connectionId, { kind: 'any' }, { timeoutMs: 1_000 });
    assert.deepEqual(result.frames.map((f) => f.index), [0, 1, 2]);
    assert.equal(result.timedOut, false);
  });

  test('sinceIndex excludes earlier frames; minCount waits for enough matches', async () => {
    const connectionId = await openConnected();
    const socket = env.lastSocket();
    socket.emit('message', JSON.stringify([17, 'te', [1, 0, 0, 0]]));
    socket.emit('message', JSON.stringify([17, 'te', [2, 0, 0, 0]]));

    const sinceInfo = await poll(connectionId, { kind: 'any' }, { sinceIndex: 0, timeoutMs: 1_000 });
    assert.deepEqual(sinceInfo.frames.map((f) => f.index), [1, 2]); // info at 0 excluded

    const spec: PredicateSpec = { kind: 'channel', chanId: 17, label: 'te' };
    const twoTe = await poll(connectionId, spec, { minCount: 2, timeoutMs: 1_000 });
    assert.equal(twoTe.frames.length, 2);
    assert.equal(twoTe.timedOut, false);
  });

  test('a non-JSON raw frame is buffered verbatim as a string (ingress fallback)', async () => {
    const connectionId = await openConnected();
    env.lastSocket().emit('message', 'not-json-at-all');
    const result = await poll(connectionId, { kind: 'any' }, { sinceIndex: 0, timeoutMs: 1_000 });
    assert.deepEqual(result.frames.map((f) => f.frame), ['not-json-at-all']);
  });

  test('times out (deterministically) when a match never arrives', async () => {
    const connectionId = await openConnected();
    const spec: PredicateSpec = { kind: 'channel', chanId: 17, label: 'tu' };
    const result = await poll(connectionId, spec, { timeoutMs: 300 });
    assert.equal(result.timedOut, true);
    assert.equal(result.frames.length, 0);
  });

  test('a buffered maintenance info-code is selectable by the environment-blocked predicate', async () => {
    const connectionId = await openConnected();
    env.lastSocket().emit('message', JSON.stringify({ event: 'info', code: 20060 }));
    const blocked: PredicateSpec = {
      kind: 'event',
      event: 'info',
      where: [{ path: 'code', op: 'in', value: [20051, 20060] }],
    };
    const result = await poll(connectionId, blocked, { timeoutMs: 1_000 });
    assert.equal(result.frames.length, 1); // only the maintenance frame, not the operative info
    assert.equal(result.timedOut, false);
  });
});

describe('send', () => {
  test('sends over an open socket and reports success', async () => {
    const connectionId = await openConnected();
    const result = send(connectionId, { event: 'ping', cid: 1 });
    assert.equal(result.ok, true);
    assert.equal(env.lastSocket().sent.length, 1);
  });

  test('fails at the send on a closed socket (socket-not-open), not later', async () => {
    const connectionId = await openConnected();
    env.lastSocket().close(); // mid-scenario disconnect
    const result = send(connectionId, { event: 'ping', cid: 1 });
    assert.equal(result.ok, false);
    assert.equal(result.ok || result.reason, 'socket-not-open');
  });
});

describe('close + session isolation', () => {
  test('close removes the session; polling it afterwards throws', async () => {
    const connectionId = await openConnected();
    close(connectionId);
    assert.equal(listSessions().connectionIds.includes(connectionId), false);
    assert.equal(env.lastSocket().closed, true);
    await assert.rejects(() => poll(connectionId, { kind: 'any' }, { timeoutMs: 100 }));
  });

  test('two connections keep independent buffers', async () => {
    const first = await openConnected();
    const firstSocket = env.lastSocket();
    const second = await openConnected();
    const secondSocket = env.lastSocket();
    assert.notEqual(first, second);

    firstSocket.emit('message', JSON.stringify([1, 'te', [10, 0, 0, 0]]));
    secondSocket.emit('message', JSON.stringify([2, 'te', [20, 0, 0, 0]]));

    const firstFrames = await poll(first, { kind: 'channel', chanId: 1, label: 'te' }, { timeoutMs: 500 });
    const secondFrames = await poll(second, { kind: 'channel', chanId: 2, label: 'te' }, { timeoutMs: 500 });
    assert.equal(firstFrames.frames.length, 1);
    assert.equal(secondFrames.frames.length, 1);
    // The chanId-1 predicate must not match the chanId-2 connection's frame.
    const crossed = await poll(first, { kind: 'channel', chanId: 2, label: 'te' }, { timeoutMs: 200 });
    assert.equal(crossed.timedOut, true);
  });
});
