@spec-002 @smoke
Feature: Ticker channel
  Marketa consumes the ticker - the price and volume summary for a symbol.
  Subscribing must be acknowledged with a channel ID, followed by a
  schema-valid snapshot and at least one schema-valid update. This is the
  'happy path proves the machine' unit: it exercises the full subscribe ->
  snapshot -> update flow that every later channel unit builds on.

  Background:
    Given Marketa has an established connection to the Bitfinex public WebSocket API

  Scenario: Subscribing to the ticker is acknowledged with a channel ID
    When she subscribes to the ticker for the primary symbol
    Then the ticker subscription is confirmed with a channel ID
    And the confirmation echoes the primary symbol

  Scenario: The ticker delivers a schema-valid snapshot on subscription
    When she subscribes to the ticker for the primary symbol
    Then she receives a ticker snapshot matching the ticker schema
    And the snapshot bid does not exceed the snapshot ask

  Scenario: The ticker delivers at least one schema-valid update
    When she subscribes to the ticker for the primary symbol
    Then she receives at least 1 ticker update matching the ticker schema
    And the bid does not exceed the ask in every received update
