@spec-004 @extended
Feature: Order book channel with checksum verification
  Marketa maintains a local replica of the aggregated order book from the
  snapshot and update stream, and proves it faithful by matching the
  platform's own CRC-32 checksum frames - the strongest correctness
  guarantee the public API offers, and this project's flagship assertion.

  Background:
    Given Marketa has an established connection to the Bitfinex public WebSocket API

  Scenario: Subscribing to the order book is acknowledged with the requested settings
    When she subscribes to the order book for the primary symbol
    Then the book subscription is confirmed with a channel ID
    And the confirmation echoes the requested precision, frequency and depth

  Scenario: The book snapshot is schema-valid and correctly sided
    When she subscribes to the order book for the primary symbol
    Then she receives a book snapshot of schema-valid price levels
    And the snapshot has bids below asks, each side correctly ordered

  Scenario: Applying updates maintains a plausible book
    When she subscribes to the order book for the primary symbol
    And the book evolves through at least 50 updates
    Then the maintained book has only positive prices and counts
    And each side of the maintained book is pure and correctly ordered

  Scenario: The maintained book matches the platform checksum
    Given she has enabled checksum frames for this connection
    When she subscribes to the order book for the primary symbol
    Then 5 consecutive checksum frames each match her locally maintained book
