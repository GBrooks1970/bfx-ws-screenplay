import { After, Before } from '@badeball/cypress-cucumber-preprocessor';
import { CommunicateOverWebSocket } from '../screenplay/abilities/CommunicateOverWebSocket';
import { Actor, ConfigurationError } from '../screenplay/core';

let marketa: Actor | null = null;

export function theActor(): Actor {
  if (!marketa) {
    throw new ConfigurationError('No actor on stage — has the Before hook run?');
  }
  return marketa;
}

Before(() => {
  // One actor persona, granted her single ability at scenario start (spec Section 6.1).
  marketa = Actor.named('Marketa').whoCan(new CommunicateOverWebSocket());
});

// Unconditional teardown (ADR-005, spec Section 7.1): every session is closed
// whatever the scenario outcome, and ws:reset also guards against leaks from
// failed scenarios that never reached their own close.
After(() => {
  cy.task('ws:reset', null, { log: false });
});
