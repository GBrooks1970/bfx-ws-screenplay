import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { BOOK_SETTINGS } from '../config';
import { sortedSides, type MaintainedBook } from '../books';
import { Ensure, satisfies } from '../screenplay/core';
import {
  ChecksumVerifications,
  TheBookConfirmation,
  TheChannelSnapshot,
  TheMaintainedBook,
  TheSubscriptionConfirmation,
} from '../screenplay/questions';
import {
  EnableChecksumFrames,
  ObserveBookUpdates,
  SubscribeToTheOrderBook,
} from '../screenplay/tasks';
import { theActor } from './hooks';

// Layer 2 — glue only (ADR-003): every step delegates to Tasks and Questions.

const strictlyDescending = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || (values[i - 1] as number) > value);

const strictlyAscending = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || (values[i - 1] as number) < value);

const sidesPureAndOrdered = (book: MaintainedBook): boolean => {
  const { bids, asks } = sortedSides(book);
  const sizeOk = (side: unknown[]): boolean => side.length >= 1 && side.length <= 30;
  return (
    sizeOk(bids) &&
    sizeOk(asks) &&
    bids.every((level) => level.amount > 0) &&
    asks.every((level) => level.amount < 0) &&
    strictlyDescending(bids.map((level) => level.price)) &&
    strictlyAscending(asks.map((level) => level.price))
  );
};

Given('she has enabled checksum frames for this connection', () =>
  theActor().attemptsTo(EnableChecksumFrames.forThisConnection()),
);

When('she subscribes to the order book for the primary symbol', () =>
  theActor().attemptsTo(SubscribeToTheOrderBook.forThePrimarySymbol()),
);

When('the book evolves through at least {int} updates', (updates: number) =>
  theActor().attemptsTo(ObserveBookUpdates.atLeast(updates)),
);

Then('the book subscription is confirmed with a channel ID', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheSubscriptionConfirmation.channelId('book'),
      satisfies('be a positive channel ID', (chanId) => Number.isFinite(chanId) && chanId > 0),
    ),
  ),
);

Then('the confirmation echoes the requested precision, frequency and depth', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheBookConfirmation.settings(),
      satisfies(
        `echo ${BOOK_SETTINGS.prec}/${BOOK_SETTINGS.freq}/${BOOK_SETTINGS.len}`,
        (settings) =>
          settings.prec === BOOK_SETTINGS.prec &&
          settings.freq === BOOK_SETTINGS.freq &&
          settings.len === BOOK_SETTINGS.len,
      ),
    ),
  ),
);

Then('she receives a book snapshot of schema-valid price levels', () =>
  // Per-level schema validity is enforced inside the question.
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofTheBook(),
      satisfies(
        'contain at least one level per side',
        (book) => book.bids.size >= 1 && book.asks.size >= 1,
      ),
    ),
  ),
);

Then('the snapshot has bids below asks, each side correctly ordered', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheChannelSnapshot.ofTheBook(),
      satisfies('have best bid below best ask, sides ordered', (book) => {
        const { bids, asks } = sortedSides(book);
        const bestBid = bids[0];
        const bestAsk = asks[0];
        return (
          bestBid !== undefined &&
          bestAsk !== undefined &&
          bestBid.price < bestAsk.price &&
          sidesPureAndOrdered(book)
        );
      }),
    ),
  ),
);

Then('the maintained book has only positive prices and counts', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheMaintainedBook.now(),
      satisfies('have only positive prices and counts', (book) =>
        [...book.bids.values(), ...book.asks.values()].every(
          (level) => level.price > 0 && level.count >= 1,
        ),
      ),
    ),
  ),
);

Then('each side of the maintained book is pure and correctly ordered', () =>
  theActor().attemptsTo(
    Ensure.that(
      TheMaintainedBook.now(),
      satisfies('have pure, correctly ordered sides of plausible size', sidesPureAndOrdered),
    ),
  ),
);

Then('{int} consecutive checksum frames each match her locally maintained book', (count: number) =>
  theActor().attemptsTo(
    Ensure.that(
      ChecksumVerifications.firstConsecutive(count),
      satisfies(
        `match the platform checksum ${count} time(s) running`,
        (verifications) =>
          verifications.length === count &&
          verifications.every((verification) => verification.actual === verification.expected),
      ),
    ),
  ),
);
