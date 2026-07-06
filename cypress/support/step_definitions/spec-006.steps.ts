import { Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { Ensure, equals, satisfies } from '../screenplay/core';
import {
  HeartbeatsObservedOn,
  TheChannelSilence,
  TheSubscriptionError,
  TheUnsubscriptionConfirmation,
} from '../screenplay/questions';
import { AttemptSubscription, SubscribeToTrades, Unsubscribe } from '../screenplay/tasks';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

When('she attempts to subscribe to trades for an unknown symbol', () =>
  theActor().attemptsTo(AttemptSubscription.toTradesForAnUnknownSymbol()),
);

When('she attempts to subscribe to an unknown channel', () =>
  theActor().attemptsTo(AttemptSubscription.toAnUnknownChannel()),
);

Then('the subscription is rejected with error code {int}', (code: number) =>
  theActor().attemptsTo(Ensure.that(TheSubscriptionError.code(), equals(code))),
);

Then('the error message says the symbol is invalid', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheSubscriptionError.message(),
      satisfies("mention 'symbol: invalid'", (msg) => msg.includes('symbol: invalid')),
    ),
  ),
);

Then('the error message says the channel is unknown', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheSubscriptionError.message(),
      satisfies("mention 'channel: unknown'", (msg) => msg.includes('channel: unknown')),
    ),
  ),
);

When('she unsubscribes from that channel', () =>
  theActor().attemptsTo(Unsubscribe.fromTheTickerChannel()),
);

Then('the unsubscription is confirmed for that channel', () =>
  theActor().attemptsTo(Ensure.that(TheUnsubscriptionConfirmation.status(), equals('OK'))),
);

Then('no further frames arrive on that channel after the confirmation', () =>
  theActor().attemptsTo(Ensure.that(TheChannelSilence.afterTheUnsubscription(), equals(0))),
);

When('she subscribes to trades for the quiet symbol', () =>
  theActor().attemptsTo(SubscribeToTrades.forTheQuietSymbol()),
);

Then('she observes at least {int} heartbeats on that channel', (count: number) =>
  theActor().attemptsTo(
    Ensure.that(
      HeartbeatsObservedOn.theTradesChannel(count),
      satisfies(`number at least ${count}`, (observed) => observed >= count),
    ),
  ),
);
