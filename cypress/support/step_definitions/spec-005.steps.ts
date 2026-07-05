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
  CANDLE_CLOSE_INDEX,
  CANDLE_HIGH_INDEX,
  CANDLE_LOW_INDEX,
  CANDLE_MTS_INDEX,
  CANDLE_OPEN_INDEX,
  CANDLE_VOLUME_INDEX,
  type CandleFields,
} from '../../schemas';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

const ohlcInvariantsHold = (candle: CandleFields): boolean => {
  const open = candle[CANDLE_OPEN_INDEX];
  const close = candle[CANDLE_CLOSE_INDEX];
  const high = candle[CANDLE_HIGH_INDEX];
  const low = candle[CANDLE_LOW_INDEX];
  return (
    low <= open &&
    open <= high &&
    low <= close &&
    close <= high &&
    candle[CANDLE_VOLUME_INDEX] >= 0
  );
};

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
    Ensure.that(
      TheChannelSnapshot.ofCandles(),
      satisfies('respect low <= open,close <= high and volume >= 0 in every candle', (candles) =>
        candles.every(ohlcInvariantsHold),
      ),
    ),
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
    Ensure.that(
      ReceivedUpdates.candles(1),
      satisfies('respect low <= open,close <= high and volume >= 0 in every update', (updates) =>
        updates.every(ohlcInvariantsHold),
      ),
    ),
  ),
);
