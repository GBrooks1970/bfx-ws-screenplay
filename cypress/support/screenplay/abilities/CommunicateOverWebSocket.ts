import {
  Ability,
  type Actor,
  AssertionError,
  ConfigurationError,
  EnvironmentBlockedError,
} from '../core';
import {
  ENDPOINTS,
  ENVIRONMENT_BLOCKED_INFO_CODES,
  TIMEOUTS,
  type EndpointKey,
} from '../../config';
import type {
  BufferedFrame,
  JsonValue,
  OkResult,
  OpenResult,
  PollOptions,
  PollResult,
  PredicateSpec,
  SendResult,
  SessionsResult,
} from '../../../../node-driver/protocol';

/** Buffer scan for platform blocking codes (spec Section 6.5). */
const ENVIRONMENT_BLOCKED: PredicateSpec = {
  kind: 'event',
  event: 'info',
  where: [{ path: 'code', op: 'in', value: [...ENVIRONMENT_BLOCKED_INFO_CODES] }],
};

/** Extra allowance so cy.task never times out before the driver's own bounded wait. */
const BRIDGE_MARGIN_MS = 5_000;

/**
 * Layer 4 — wraps the cy.task bridge (spec Section 6.2). Translates domain
 * vocabulary (subscribe, ticker) into transport vocabulary (frame, session).
 * The browser side never opens a socket itself (ADR-001).
 */
export class CommunicateOverWebSocket extends Ability {
  private connectionId: string | null = null;

  static as(actor: Actor): CommunicateOverWebSocket {
    return actor.abilityTo(CommunicateOverWebSocket);
  }

  /** Opens a connection; on success the info event is already buffered (driver contract). */
  open(endpointKey: EndpointKey = 'public'): Cypress.Chainable<OpenResult> {
    return cy
      .task<OpenResult>(
        'ws:open',
        { url: ENDPOINTS[endpointKey], connectionTimeoutMs: TIMEOUTS.connectionMs },
        { log: false, timeout: TIMEOUTS.connectionMs + BRIDGE_MARGIN_MS },
      )
      .then((result) => {
        if (result.ok) {
          this.connectionId = result.connectionId;
        }
        return result;
      });
  }

  /**
   * Sends over the driver's bridge. A closed/closing socket fails *here*,
   * at the send, rather than as a misleading poll timeout later: the
   * buffer is rescanned for platform blocking codes (same pattern as
   * `messagesWhere`'s timeout handling) so a platform-reported outage
   * surfaces as environment-blocked, and anything else surfaces as a
   * distinguishable configuration error (review Risk #3 / backlog Risk #4).
   */
  send(payload: JsonValue): Cypress.Chainable<OkResult> {
    const connectionId = this.requireConnectionId();
    return cy.task<SendResult>('ws:send', { connectionId, payload }, { log: false }).then((result) => {
      if (result.ok) {
        return cy.wrap<OkResult>(result, { log: false });
      }
      return cy
        .task<PollResult>(
          'ws:poll',
          { connectionId, predicateSpec: ENVIRONMENT_BLOCKED, options: { timeoutMs: 0 } },
          { log: false },
        )
        .then((blocked): OkResult => {
          if (blocked.frames.length > 0) {
            throw new EnvironmentBlockedError(
              'the platform reported a blocking status before the send could reach an open socket',
            );
          }
          throw new ConfigurationError(
            `Cannot send: connection '${connectionId}' is not open (socket-not-open)`,
          );
        });
    });
  }

  /**
   * Polls the driver's buffer for frames matching the predicate (ADR-005:
   * bounded condition-wait, no fixed sleeps). A timed-out wait first rescans
   * the buffer for platform blocking codes so maintenance surfaces as
   * environment-blocked, not as a product failure.
   */
  messagesWhere(
    spec: PredicateSpec,
    options: PollOptions & { description?: string } = {},
  ): Cypress.Chainable<BufferedFrame[]> {
    const timeoutMs = options.timeoutMs ?? TIMEOUTS.messageWaitMs;
    const connectionId = this.requireConnectionId();
    const subject = options.description ?? `frames matching ${JSON.stringify(spec)}`;
    return cy
      .task<PollResult>(
        'ws:poll',
        {
          connectionId,
          predicateSpec: spec,
          options: { timeoutMs, minCount: options.minCount, sinceIndex: options.sinceIndex },
        },
        { log: false, timeout: timeoutMs + BRIDGE_MARGIN_MS },
      )
      .then((result) => {
        if (!result.timedOut) {
          return cy.wrap(result.frames, { log: false });
        }
        return cy
          .task<PollResult>(
            'ws:poll',
            { connectionId, predicateSpec: ENVIRONMENT_BLOCKED, options: { timeoutMs: 0 } },
            { log: false },
          )
          .then((blocked): BufferedFrame[] => {
            if (blocked.frames.length > 0) {
              throw new EnvironmentBlockedError(
                `the platform reported a blocking status while waiting for ${subject}`,
              );
            }
            throw new AssertionError(`Timed out after ${timeoutMs} ms waiting for ${subject}`);
          });
      });
  }

  close(): Cypress.Chainable<OkResult> {
    if (!this.connectionId) {
      const alreadyClosed: OkResult = { ok: true };
      return cy.wrap(alreadyClosed, { log: false });
    }
    const connectionId = this.connectionId;
    this.connectionId = null;
    return cy.task<OkResult>('ws:close', { connectionId }, { log: false });
  }

  /** Connection IDs the driver still holds — supports TheSessionRegistration. */
  sessionIds(): Cypress.Chainable<string[]> {
    return cy
      .task<SessionsResult>('ws:sessions', null, { log: false })
      .then((result) => result.connectionIds);
  }

  private requireConnectionId(): string {
    if (!this.connectionId) {
      throw new ConfigurationError('No open connection — perform EstablishConnection first');
    }
    return this.connectionId;
  }
}
