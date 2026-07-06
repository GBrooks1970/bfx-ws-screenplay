@spec-006 @extended
Feature: Negative paths and unsubscription
  The platform must reject bad subscriptions with error events rather than
  silence, release channels cleanly on unsubscribe, and keep proving
  liveness with heartbeats even where there is no market activity.

  Background:
    Given Marketa has an established connection to the Bitfinex public WebSocket API

  Scenario: Subscribing to an unknown symbol is rejected with an error event
    When she attempts to subscribe to trades for an unknown symbol
    Then the subscription is rejected with error code 10300
    And the error message says the symbol is invalid

  Scenario: Subscribing to an unknown channel is rejected with an error event
    When she attempts to subscribe to an unknown channel
    Then the subscription is rejected with error code 10300
    And the error message says the channel is unknown

  Scenario: Unsubscribing releases the channel
    When she subscribes to the ticker for the primary symbol
    And she unsubscribes from that channel
    Then the unsubscription is confirmed for that channel
    And no further frames arrive on that channel after the confirmation

  Scenario: A quiet channel still heartbeats
    When she subscribes to trades for the quiet symbol
    Then she observes at least 2 heartbeats on that channel
