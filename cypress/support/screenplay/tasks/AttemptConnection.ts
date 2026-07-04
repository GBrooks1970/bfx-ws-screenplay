import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import type { EndpointKey } from '../../config';
import { type Actor, Task } from '../core';

/**
 * Catalogue addition, 4 July 2026 (SPEC-001 review): opens against a
 * configured endpoint key and records the outcome for later questioning —
 * it does not fail the scenario itself.
 */
export class AttemptConnection extends Task {
  static to(endpointKey: EndpointKey): AttemptConnection {
    return new AttemptConnection(endpointKey);
  }

  private constructor(private readonly endpointKey: EndpointKey) {
    super(`attempt a connection to the '${endpointKey}' endpoint`);
  }

  performAs(actor: Actor): Cypress.Chainable {
    return CommunicateOverWebSocket.as(actor)
      .open(this.endpointKey)
      .then((result) => {
        actor.remembers('lastConnectionOutcome', result);
      });
  }
}
