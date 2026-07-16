import { Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { CANDLES } from '../config';
import { Ensure, equals, satisfies } from '../screenplay/core';
import {
  ReceivedUpdates,
  TheCandlesConfirmation,
  TheChannelSnapshot,
} from '../screenplay/questions';
import { SubscribeToCandles } from '../screenplay/tasks';
import {
  candlesRespectOhlcInvariants,
  CANDLE_MTS_INDEX,
  type CandleFields,
} from '../../schemas';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.
// OHLC invariants live in ../../schemas/candlesChannel.ts (review Risk #4 / backlog Risk #5).

When('she subscribes to one-minute candles for the primary symbol', () =>
  theActor().attemptsTo(SubscribeToCandles.oneMinuteForThePrimarySymbol()),
);

Then('the candles subscription is confirmed with a channel ID', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheCandlesConfirmation.channelId(),
      satisfies('be a positive channel ID', (chanId) => Number.isFinite(chanId) && chanId > 0),
    ),
  ),
);

Then('the confirmation echoes the requested candle key', () =>
  theActor().attemptsTo(Ensure.that(TheCandlesConfirmation.key(), equals<string>(CANDLES.key))),
);

Then('she receives a candles snapshot of schema-valid candles', () =>
  // Per-candle schema validity (incl. timeframe alignment) is enforced inside the question.
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofCandles(),
      satisfies('contain at least one candle', (candles) => candles.length > 0),
    ),
  ),
);

Then('every candle in the snapshot respects the OHLC invariants', () =>
  theActor().attemptsTo(
    Ensure.that(TheChannelSnapshot.ofCandles(), candlesRespectOhlcInvariants()),
  ),
);

Then('the snapshot candles are ordered newest first', () =>
  // Observed-but-undocumented ordering, asserted deliberately (SPEC-005 review Q1, approved).
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofCandles(),
      satisfies('have strictly descending timestamps', (candles) =>
        candles.every(
          (candle, i) =>
            i === 0 ||
            (candles[i - 1] as CandleFields)[CANDLE_MTS_INDEX] > candle[CANDLE_MTS_INDEX],
        ),
      ),
    ),
  ),
);

Then('she receives at least {int} candle update matching the candle schema', (count: number) =>
  theActor().attemptsTo(
    Ensure.that(
      ReceivedUpdates.candles(count),
      satisfies(`contain at least ${count} update(s)`, (updates) => updates.length >= count),
    ),
  ),
);

Then('every received candle update respects the OHLC invariants', () =>
  theActor().attemptsTo(
    Ensure.that(ReceivedUpdates.candles(1), candlesRespectOhlcInvariants('update')),
  ),
);
