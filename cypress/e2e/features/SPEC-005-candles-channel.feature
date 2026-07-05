@spec-005 @extended
Feature: Candles channel
  Marketa consumes one-minute candles - the OHLCV aggregation of trading
  activity. Subscribing must be acknowledged with the requested key,
  deliver a snapshot of historical candles, then update the current candle
  as trading occurs. Note the platform's field order: [MTS, OPEN, CLOSE,
  HIGH, LOW, VOLUME] - close before high and low.

  Background:
    Given Marketa has an established connection to the Bitfinex public WebSocket API

  Scenario: Subscribing to candles is acknowledged with a channel ID
    When she subscribes to one-minute candles for the primary symbol
    Then the candles subscription is confirmed with a channel ID
    And the confirmation echoes the requested candle key

  Scenario: The candles snapshot is schema-valid and well-formed
    When she subscribes to one-minute candles for the primary symbol
    Then she receives a candles snapshot of schema-valid candles
    And every candle in the snapshot respects the OHLC invariants
    And the snapshot candles are ordered newest first

  Scenario: The current candle updates as trading occurs
    When she subscribes to one-minute candles for the primary symbol
    Then she receives at least 1 candle update matching the candle schema
    And every received candle update respects the OHLC invariants
