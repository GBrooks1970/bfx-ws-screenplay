import { close, listSessions, open, poll, reset, send } from './driver';
import type { CloseArgs, OpenArgs, PollArgs, SendArgs } from './protocol';

/**
 * Layer 5 — the cy.task bridge (spec Section 7.3). These named contracts are
 * the only path between the browser-side framework and the Node driver.
 */
export function registerWsTasks(on: Cypress.PluginEvents): void {
  on('task', {
    'ws:open': ({ url, connectionTimeoutMs }: OpenArgs) => open(url, connectionTimeoutMs),
    'ws:send': ({ connectionId, payload }: SendArgs) => send(connectionId, payload),
    'ws:poll': ({ connectionId, predicateSpec, options }: PollArgs) =>
      poll(connectionId, predicateSpec, options),
    'ws:close': ({ connectionId }: CloseArgs) => close(connectionId),
    'ws:reset': () => reset(),
    'ws:sessions': () => listSessions(),
  });
}
