/**
 * Pure order-book purity/ordering invariants (SPEC-004), relocated out of
 * the step-definition glue layer so step definitions return to pure
 * delegation (ADR-003; review Risk #4 / backlog Risk #5). Reusable and
 * independently testable, exported as a named `Expectation` for
 * `Ensure.that`.
 */
import { Expectation, satisfies } from '../screenplay/core';
import type { BookSideEntry, SortedBookSides } from './orderBook';

/** ADR-006's transient-overshoot margin: 25 subscribed / 30 allowed. */
const MAX_SIDE_SIZE = 30;

export const strictlyDescending = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || (values[i - 1] as number) > value);

export const strictlyAscending = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || (values[i - 1] as number) < value);

/**
 * Takes already-sorted sides (`sortedSides()`'s output — the book Questions
 * answer this serialisable projection, not the raw `Map`-based book) so a
 * failed diagnostic can print the actual levels instead of `{}`.
 */
export const sidesPureAndOrdered = ({ bids, asks }: SortedBookSides): boolean => {
  const sizeOk = (side: readonly BookSideEntry[]): boolean =>
    side.length >= 1 && side.length <= MAX_SIDE_SIZE;
  return (
    sizeOk(bids) &&
    sizeOk(asks) &&
    bids.every((level) => level.amount > 0) &&
    asks.every((level) => level.amount < 0) &&
    strictlyDescending(bids.map((level) => level.price)) &&
    strictlyAscending(asks.map((level) => level.price))
  );
};

export const bookSidesArePureAndOrdered: Expectation<SortedBookSides> = satisfies(
  'have pure, correctly ordered sides of plausible size',
  sidesPureAndOrdered,
);
