@spec-003 @extended
Feature: Trades channel
  Marketa consumes the executed-trades stream for a symbol. Subscribing
  must be acknowledged, deliver a snapshot of recent trades, then stream
  each new trade as a 'te' (executed) frame followed by its 'tu' (update)
  frame carrying the same trade ID.

  Background:
    Given Marketa has an established connection to the Bitfinex public WebSocket API

  Scenario: Subscribing to trades is acknowledged with a channel ID
    When she subscribes to trades for the primary symbol
    Then the trades subscription is confirmed with a channel ID
    And the trades confirmation echoes the primary symbol

  Scenario: The trades channel delivers a snapshot of schema-valid trades
    When she subscribes to trades for the primary symbol
    Then she receives a trades snapshot of schema-valid trades
    And every trade in the snapshot has a positive price and a non-zero amount

  Scenario: Executed trades stream as schema-valid frames
    When she subscribes to trades for the primary symbol
    Then she receives at least 1 executed trade matching the trade schema
    And every received executed trade has a positive price and a non-zero amount

  Scenario: A trade update follows its executed trade
    When she subscribes to trades for the primary symbol
    And she observes an executed trade
    Then a trade update for that trade follows its execution
