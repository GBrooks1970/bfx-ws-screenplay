import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { CHECKSUM_CONF_FLAG } from '../../config';
import { isConfEvent } from '../../../schemas';
import { type Actor, AssertionError, Task } from '../core';

/**
 * Catalogue addition, 5 July 2026 (SPEC-004 review Q2): connection-level
 * `conf` enabling [chanId,'cs',CHECKSUM] frames — a Given, because the flag
 * belongs to the connection, not to any one subscription.
 */
export class EnableChecksumFrames extends Task {
  static forThisConnection(): EnableChecksumFrames {
    return new EnableChecksumFrames();
  }

  private constructor() {
    super('enable checksum frames for this connection');
  }

  performAs(actor: Actor): Cypress.Chainable {
    const ws = CommunicateOverWebSocket.as(actor);
    return ws
      .send({ event: 'conf', flags: CHECKSUM_CONF_FLAG })
      .then(() =>
        ws.messagesWhere(
          { kind: 'event', event: 'conf' },
          { description: 'the conf acknowledgement' },
        ),
      )
      .then((frames) => {
        const ack = frames[0]?.frame;
        if (!isConfEvent(ack) || ack.status !== 'OK') {
          throw new AssertionError(
            `The conf request was not acknowledged with status OK: ${JSON.stringify(ack)}`,
          );
        }
      });
  }
}
