import { CommunicateOverWebSocket } from '../abilities/CommunicateOverWebSocket';
import { Question } from '../core';

/**
 * Catalogue addition, 4 July 2026 (SPEC-001 review): whether the driver still
 * holds a session for the actor's remembered connection.
 */
export class TheSessionRegistration {
  static forTheRememberedConnection(): Question<boolean> {
    return Question.about('whether the driver still holds the remembered session', (actor) => {
      const connectionId = actor.recalled<string>('connectionId');
      return CommunicateOverWebSocket.as(actor)
        .sessionIds()
        .then((ids) => ids.includes(connectionId));
    });
  }
}
