import { Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { SYMBOLS } from '../config';
import { Ensure, equals, isDefined, satisfies } from '../screenplay/core';
import {
  ReceivedUpdates,
  TheChannelSnapshot,
  TheSubscriptionConfirmation,
} from '../screenplay/questions';
import { SubscribeToTicker } from '../screenplay/tasks';
import { TICKER_ASK_INDEX, TICKER_BID_INDEX, type TickerFields } from '../../schemas';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

const bidDoesNotExceedAsk = (ticker: TickerFields): boolean =>
  ticker[TICKER_BID_INDEX] <= ticker[TICKER_ASK_INDEX];

When('she subscribes to the ticker for the primary symbol', () =>
  theActor().attemptsTo(SubscribeToTicker.forThePrimarySymbol()),
);

Then('the ticker subscription is confirmed with a channel ID', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheSubscriptionConfirmation.channelId('ticker'),
      satisfies('be a positive channel ID', (chanId) => Number.isFinite(chanId) && chanId > 0),
    ),
  ),
);

Then('the confirmation echoes the primary symbol', () =>
  theActor().attemptsTo(
    Ensure.that(TheSubscriptionConfirmation.symbol('ticker'), equals<string>(SYMBOLS.primary)),
  ),
);

Then('she receives a ticker snapshot matching the ticker schema', () =>
  // Schema validity is enforced inside the question (finiteness included).
  theActor().attemptsTo(Ensure.that(TheChannelSnapshot.ofTheTicker(), isDefined())),
);

Then('the snapshot bid does not exceed the snapshot ask', () =>
  theActor().attemptsTo(
    Ensure.that(TheChannelSnapshot.ofTheTicker(), satisfies('have bid <= ask', bidDoesNotExceedAsk)),
  ),
);

Then('she receives at least {int} ticker update matching the ticker schema', (count: number) =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.fromTheTicker(count),
      satisfies(`contain at least ${count} update(s)`, (updates) => updates.length >= count),
    ),
  ),
);

Then('the bid does not exceed the ask in every received update', () =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.fromTheTicker(1),
      satisfies('have bid <= ask in every update', (updates) => updates.every(bidDoesNotExceedAsk)),
    ),
  ),
);
