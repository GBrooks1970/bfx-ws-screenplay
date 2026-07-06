/**
 * The single configuration module required by ADR-005: every timeout is a
 * named constant here; symbols and endpoints are config, not code.
 */

export const ENDPOINTS = {
  /** The system under test (spec Section 2.1). */
  public: 'wss://api-pub.bitfinex.com/ws/2',
  /** Non-routable local address for offline connection-failure scenarios. */
  unreachable: 'wss://127.0.0.1:9',
  /** Deliberately malformed for the invalid-endpoint scenario. */
  malformed: 'not-a-websocket-url',
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

export const TIMEOUTS = {
  /** ADR-005: connection timeout. */
  connectionMs: 5_000,
  /** ADR-005: default bounded wait for a matching message. */
  messageWaitMs: 10_000,
  /**
   * Heartbeats arrive every 15 s on idle channels (docs, confirmed live
   * 5 July 2026: gaps of exactly 15.0 s on tZECBTC). Two heartbeats at that
   * cadence can take ~30 s, so 30 s left zero margin — raised to 45 s
   * (SPEC-006 review Q3, approved).
   */
  heartbeatWaitMs: 45_000,
  /**
   * Channel data pushes are event-driven and throttled: live probing
   * (5 July 2026) showed ticker updates on tBTCUSD arriving 5-8 s apart,
   * with longer gaps in quiet minutes — the 10 s default is marginal for
   * "at least one update" waits, so they get their own bounded constant
   * (ADR-005: named condition-waits, never retries).
   */
  updateWaitMs: 30_000,
  /**
   * Candle updates tick roughly every 15 s on 1m tBTCUSD (live probe,
   * 5 July 2026: first update at 17.6 s) — the generic updateWaitMs leaves
   * too little margin for "at least one update" waits on this channel
   * (SPEC-005 review Q2, approved).
   */
  candleUpdateWaitMs: 45_000,
} as const;

export const SYMBOLS = {
  /** High-liquidity primary (spec Section 11, confirmation 1). */
  primary: 'tBTCUSD',
  /** Second parameterised pair for SPEC-004 outlines. */
  secondary: 'tETHUSD',
  /**
   * Quiet pair for heartbeat scenarios, selected empirically 5 July 2026
   * (SPEC-006 review Q2, approved): lowest 24 h quote volume in the REST
   * tickers survey (0.05 ZEC traded all day) while still listed and
   * subscribable; heartbeats observed live at exactly 15.0 s intervals.
   */
  quiet: 'tZECBTC',
} as const;

/** Deliberately invalid subscription inputs for the SPEC-006 negative paths. */
export const NEGATIVE = {
  unknownSymbol: 'tFAKEPAIRXYZ',
  unknownChannel: 'bogus-channel',
} as const;

/**
 * Candles subscription settings (SPEC-005): channel is keyed, not symboled —
 * `trade:TIMEFRAME:SYMBOL`. Timeframe is config, not code (ADR-005).
 */
export const CANDLES = {
  timeframe: '1m',
  timeframeMs: 60_000,
  key: `trade:1m:${SYMBOLS.primary}`,
} as const;

/**
 * Order-book subscription settings (SPEC-004). P0/F0/25 is the combination
 * the checksum algorithm was proven against live (probe 5 July 2026: 8/8).
 */
export const BOOK_SETTINGS = {
  prec: 'P0',
  freq: 'F0',
  len: '25',
} as const;

/** conf flag enabling [chanId,'cs',CHECKSUM] frames (docs + probe, 5 July 2026). */
export const CHECKSUM_CONF_FLAG = 131072;

/**
 * Platform status/maintenance codes (spec Section 6.5), verified against
 * https://docs.bitfinex.com/docs/ws-general on 4 July 2026:
 * 20051 = stop/restart (reconnect), 20060 = entering maintenance.
 * 20061 (maintenance ended) deliberately excluded — it signals recovery.
 */
export const ENVIRONMENT_BLOCKED_INFO_CODES = [20051, 20060] as const;

/** `platform.status` value meaning operative in the info event. */
export const OPERATIVE_PLATFORM_STATUS = 1;
