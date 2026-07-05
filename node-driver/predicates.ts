import type { FieldMatch, JsonValue, PredicateSpec } from './protocol';

/** Resolves a dot path ('platform.status') against a frame. */
function valueAt(frame: unknown, path: string): unknown {
  let current: unknown = frame;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function sameValue(actual: unknown, expected: JsonValue): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function fieldMatches(frame: unknown, match: FieldMatch): boolean {
  const actual = valueAt(frame, match.path);
  switch (match.op) {
    case 'exists':
      return actual !== undefined;
    case 'eq':
      return match.value !== undefined && sameValue(actual, match.value as JsonValue);
    case 'in':
      return Array.isArray(match.value) && match.value.some((v) => sameValue(actual, v));
  }
}

export function frameMatches(frame: unknown, spec: PredicateSpec): boolean {
  switch (spec.kind) {
    case 'any':
      return true;
    case 'event': {
      if (typeof frame !== 'object' || frame === null || Array.isArray(frame)) {
        return false;
      }
      const event = (frame as Record<string, unknown>)['event'];
      if (event !== spec.event) {
        return false;
      }
      return (spec.where ?? []).every((match) => fieldMatches(frame, match));
    }
    case 'channel': {
      if (!Array.isArray(frame) || frame[0] !== spec.chanId) {
        return false;
      }
      const isHeartbeat = frame[1] === 'hb';
      if (spec.frameType === 'hb' && !isHeartbeat) {
        return false;
      }
      if (spec.frameType === 'data' && isHeartbeat) {
        return false;
      }
      if (spec.label !== undefined && frame[1] !== spec.label) {
        return false;
      }
      return (spec.where ?? []).every((match) => fieldMatches(frame, match));
    }
  }
}
