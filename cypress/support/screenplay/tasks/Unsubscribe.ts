import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { type Actor, AssertionError, Task } from '../core';

/**
 * unsubscribe + await the `unsubscribed` ack (spec Section 6.3), then run a
 * ping/pong SYNC BARRIER: TCP stream ordering guarantees that anything the
 * server emitted before processing the unsubscribe sits at a lower buffer
 * index than the ack — so once the pong lands, TheChannelSilence can assert
 * "no frames after the ack" as an exact index scan, with no fixed waits
 * (ADR-005).
 */
export class Unsubscribe extends Task {
  static fromTheTickerChannel(): Unsubscribe {
    return new Unsubscribe('ticker:chanId');
  }

  private constructor(private readonly chanIdKey: string) {
    super('unsubscribe from the channel');
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    const chanId = actor.recalled<number>(this.chanIdKey);
    const barrierCid = Date.now() % 1_000_000_000;
    return ws
      .send({ event: 'unsubscribe', chanId })
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'unsubscribed',
            where: [{ path: 'chanId', op: 'eq', value: chanId }],
          },
          { description: `the unsubscribed ack for channel ${chanId}` },
        ),
      )
      .then((frames) => {
        const first = frames[0];
        if (!first) {
          throw new AssertionError('No unsubscribed ack was received');
        }
        actor.remembers('unsubscribed:chanId', chanId);
        actor.remembers('unsubscribed:ackIndex', first.index);
      })
      .then(() => ws.send({ event: 'ping', cid: barrierCid }))
      .then(() =>
        ws.messagesWhere(
          {
            kind: 'event',
            event: 'pong',
            where: [{ path: 'cid', op: 'eq', value: barrierCid }],
          },
          { description: 'the sync-barrier pong' },
        ),
      );
  }
}
