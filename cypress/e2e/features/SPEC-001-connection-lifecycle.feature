@spec-001 @smoke
Feature: Connection lifecycle
  Marketa, a market-data consumer, needs a reliable connection to the
  Bitfinex public WebSocket API before she can consume any market data.
  These scenarios prove the connection machinery: the platform announces
  itself on connect, answers pings, and releases sessions cleanly.

  Scenario: Connecting yields a version-2 info event
    When Marketa establishes a connection to the Bitfinex public WebSocket API
    Then she receives a platform info event
    And the info event reports API version 2
    And the platform reports itself as operative

  Scenario: The platform responds to a ping with a matching pong
    Given Marketa has an established connection to the Bitfinex public WebSocket API
    When she sends a ping with a correlation ID
    Then she receives a pong carrying the same correlation ID

  Scenario: Closing the connection releases the session
    Given Marketa has an established connection to the Bitfinex public WebSocket API
    When she closes the connection
    Then her session is no longer held by the connection driver

  @negative @offline
  Scenario: Connecting to an unreachable endpoint fails within the connection timeout
    When Marketa attempts a connection to an unreachable endpoint
    Then the connection attempt is reported as failed within the connection timeout

  @negative @offline
  Scenario: Connecting with a malformed endpoint address is rejected immediately
    When Marketa attempts a connection to a malformed endpoint address
    Then the connection attempt is rejected as invalid
