import { Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { SYMBOLS } from '../config';
import { Ensure, equals, satisfies } from '../screenplay/core';
import {
  ReceivedUpdates,
  TheChannelSnapshot,
  TheSubscriptionConfirmation,
} from '../screenplay/questions';
import { ObserveAnExecutedTrade, SubscribeToTrades } from '../screenplay/tasks';
import { TRADE_AMOUNT_INDEX, TRADE_PRICE_INDEX, type TradeFields } from '../../schemas';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

// Spec invariant 'positive absolute amount': AMOUNT is signed (buy/sell), so non-zero.
const priceAndAmountValid = (trade: TradeFields): boolean =>
  trade[TRADE_PRICE_INDEX] > 0 && trade[TRADE_AMOUNT_INDEX] !== 0;

When('she subscribes to trades for the primary symbol', () =>
  theActor().attemptsTo(SubscribeToTrades.forThePrimarySymbol()),
);

Then('the trades subscription is confirmed with a channel ID', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheSubscriptionConfirmation.channelId('trades'),
      satisfies('be a positive channel ID', (chanId) => Number.isFinite(chanId) && chanId > 0),
    ),
  ),
);

Then('the trades confirmation echoes the primary symbol', () =>
  theActor().attemptsTo(
    Ensure.that(TheSubscriptionConfirmation.symbol('trades'), equals<string>(SYMBOLS.primary)),
  ),
);

Then('she receives a trades snapshot of schema-valid trades', () =>
  // Per-trade schema validity is enforced inside the question.
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofTrades(),
      satisfies('contain at least one trade', (trades) => trades.length > 0),
    ),
  ),
);

Then('every trade in the snapshot has a positive price and a non-zero amount', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofTrades(),
      satisfies('have a positive price and a non-zero amount in every trade', (trades) =>
        trades.every(priceAndAmountValid),
      ),
    ),
  ),
);

Then('she receives at least {int} executed trade matching the trade schema', (count: number) =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.executedTrades(count),
      satisfies(`contain at least ${count} executed trade(s)`, (trades) => trades.length >= count),
    ),
  ),
);

Then('every received executed trade has a positive price and a non-zero amount', () =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.executedTrades(1),
      satisfies('have a positive price and a non-zero amount in every executed trade', (trades) =>
        trades.every(priceAndAmountValid),
      ),
    ),
  ),
);

When('she observes an executed trade', () =>
  theActor().attemptsTo(ObserveAnExecutedTrade.onTheTradesChannel()),
);

Then('a trade update for that trade follows its execution', () =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.theUpdateForTheObservedTrade(),
      satisfies(
        'arrive after its execution frame',
        (paired) => paired.bufferIndex > paired.executionBufferIndex,
      ),
    ),
  ),
);
