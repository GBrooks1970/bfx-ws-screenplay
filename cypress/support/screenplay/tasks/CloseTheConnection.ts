import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { type Actor, Interaction } from '../core';

/** Closing is a single ability call, so an Interaction rather than a Task. */
export class CloseTheConnection extends Interaction {
  static now(): CloseTheConnection {
    return new CloseTheConnection();
  }

  private constructor() {
    super('close the connection');
  }

  performAs(actor: Actor): Cypress.Chainable {
    return CommunicateOverWebSocket.as(actor).close();
  }
}
