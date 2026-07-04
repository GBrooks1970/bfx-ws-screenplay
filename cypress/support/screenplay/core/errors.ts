/** Thrown when an assertion over a Question's answer fails. */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/** Thrown when the framework is misused (e.g. missing ability), not when the SUT misbehaves. */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Thrown when the platform reports itself non-operative (spec Section 6.5).
 * A distinguishable environment outcome, not a product failure: the name is
 * the marker reports are filtered on.
 */
export class EnvironmentBlockedError extends Error {
  constructor(message: string) {
    super(`environment-blocked: ${message}`);
    this.name = 'EnvironmentBlockedError';
  }
}
