import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { TIMEOUTS } from '../config';
import {
  Ensure,
  equals,
  isAtMost,
  isDefined,
  isFalse,
  isIn,
  isTrue,
} from '../screenplay/core';
import {
  TheConnectionOutcome,
  ThePlatformInfo,
  ThePongResponse,
  TheSessionRegistration,
} from '../screenplay/questions';
import {
  AttemptConnection,
  CloseTheConnection,
  EstablishConnection,
  SendPing,
} from '../screenplay/tasks';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

When('Marketa establishes a connection to the Bitfinex public WebSocket API', () =>
  theActor().attemptsTo(EstablishConnection.toThePublicApi()),
);

Given('Marketa has an established connection to the Bitfinex public WebSocket API', () =>
  theActor().attemptsTo(EstablishConnection.toThePublicApi()),
);

Then('she receives a platform info event', () =>
  theActor().attemptsTo(Ensure.that(ThePlatformInfo.event(), isDefined())),
);

Then('the info event reports API version 2', () =>
  theActor().attemptsTo(Ensure.that(ThePlatformInfo.version(), equals(2))),
);

Then('the platform reports itself as operative', () =>
  theActor().attemptsTo(Ensure.that(ThePlatformInfo.operativeStatus(), isTrue())),
);

When('she sends a ping with a correlation ID', () =>
  theActor().attemptsTo(SendPing.withAFreshCorrelationId()),
);

Then('she receives a pong carrying the same correlation ID', () =>
  theActor().attemptsTo(Ensure.that(ThePongResponse.matchingTheLastPing(), isDefined())),
);

When('she closes the connection', () => theActor().attemptsTo(CloseTheConnection.now()));

Then('her session is no longer held by the connection driver', () =>
  theActor().attemptsTo(
    Ensure.that(TheSessionRegistration.forTheRememberedConnection(), isFalse()),
  ),
);

When('Marketa attempts a connection to an unreachable endpoint', () =>
  theActor().attemptsTo(AttemptConnection.to('unreachable')),
);

Then('the connection attempt is reported as failed within the connection timeout', () =>
  theActor().attemptsTo(
    Ensure.that(TheConnectionOutcome.successful(), isFalse()),
    Ensure.that(TheConnectionOutcome.failureReason(), isIn(['connect-failure', 'connect-timeout'])),
    Ensure.that(TheConnectionOutcome.elapsedMs(), isAtMost(TIMEOUTS.connectionMs + 1_000)),
  ),
);

When('Marketa attempts a connection to a malformed endpoint address', () =>
  theActor().attemptsTo(AttemptConnection.to('malformed')),
);

Then('the connection attempt is rejected as invalid', () =>
  theActor().attemptsTo(Ensure.that(TheConnectionOutcome.failureReason(), equals('invalid-url'))),
);
