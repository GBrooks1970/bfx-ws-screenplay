import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { type Actor, Task } from '../core';

/** send ping with a correlation ID, remembered for the pong question (spec Section 6.3). */
export class SendPing extends Task {
  static withAFreshCorrelationId(): SendPing {
    return new SendPing();
  }

  private constructor() {
    super('send a ping with a fresh correlation ID');
  }

  performAs(actor: Actor): Cypress.Chainable {
    const cid = Date.now() % 1_000_000_000;
    actor.remembers('lastPingCid', cid);
    return CommunicateOverWebSocket.as(actor).send({ event: 'ping', cid });
  }
}
