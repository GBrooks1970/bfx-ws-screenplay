import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { OPERATIVE_PLATFORM_STATUS, TIMEOUTS } from '../../config';
import { isPlatformInfoEvent } from '../../../schemas';
import { type Actor, AssertionError, EnvironmentBlockedError, Task } from '../core';

/** open + await the info event, guarding operative status (spec Section 6.3). */
export class EstablishConnection extends Task {
  static toThePublicApi(): EstablishConnection {
    return new EstablishConnection();
  }

  private constructor() {
    super('establish a connection to the Bitfinex public WebSocket API');
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    return ws.open('public').then((result) => {
      if (!result.ok) {
        throw new AssertionError(
          `Could not establish a connection: ${result.reason} (${result.message})`,
        );
      }
      actor.remembers('connectionId', result.connectionId);
      return ws
        .messagesWhere(
          { kind: 'event', event: 'info' },
          { timeoutMs: TIMEOUTS.connectionMs, description: 'the platform info event' },
        )
        .then((frames) => {
          const first = frames[0]?.frame;
          if (!isPlatformInfoEvent(first)) {
            throw new AssertionError('The first info frame does not match the platform info schema');
          }
          if (first.platform.status !== OPERATIVE_PLATFORM_STATUS) {
            throw new EnvironmentBlockedError(
              `platform status is ${first.platform.status}, not operative`,
            );
          }
        });
    });
  }
}
