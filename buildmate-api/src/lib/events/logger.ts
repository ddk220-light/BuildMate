/**
 * Build Event Logger
 *
 * Provides fire-and-forget event logging that doesn't block main request.
 * Errors in logging should NOT fail the main request.
 */

import { v4 as uuidv4 } from "uuid";
import type { BuildEventType, BuildEventData } from "./types";

/**
 * Log a build event (fire-and-forget)
 *
 * This function does not throw - errors are logged but don't block the request.
 */
export async function logBuildEvent<T extends BuildEventType>(
  db: D1Database,
  buildId: string,
  eventType: T,
  eventData: BuildEventData[T],
  stepIndex?: number,
): Promise<void> {
  try {
    const id = uuidv4();
    const eventDataJson = JSON.stringify(eventData);

    await db
      .prepare(
        `INSERT INTO build_events (id, build_id, event_type, event_data, step_index)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, buildId, eventType, eventDataJson, stepIndex ?? null)
      .run();
  } catch (error) {
    // Log error but don't fail the request
    console.warn(`Failed to log build event ${eventType}:`, error);
  }
}

/**
 * Log BUILD_STARTED event
 */
export function logBuildStarted(
  db: D1Database,
  buildId: string,
  data: BuildEventData["BUILD_STARTED"],
): Promise<void> {
  return logBuildEvent(db, buildId, "BUILD_STARTED", data);
}

/**
 * Log STRUCTURE_GENERATED event
 */
export function logStructureGenerated(
  db: D1Database,
  buildId: string,
  data: BuildEventData["STRUCTURE_GENERATED"],
): Promise<void> {
  return logBuildEvent(db, buildId, "STRUCTURE_GENERATED", data);
}

/**
 * Log OPTIONS_SHOWN event
 */
export function logOptionsShown(
  db: D1Database,
  buildId: string,
  stepIndex: number,
  data: BuildEventData["OPTIONS_SHOWN"],
): Promise<void> {
  return logBuildEvent(db, buildId, "OPTIONS_SHOWN", data, stepIndex);
}

/**
 * Log OPTION_SELECTED event
 */
export function logOptionSelected(
  db: D1Database,
  buildId: string,
  stepIndex: number,
  data: BuildEventData["OPTION_SELECTED"],
): Promise<void> {
  return logBuildEvent(db, buildId, "OPTION_SELECTED", data, stepIndex);
}

/**
 * Log BUILD_COMPLETED event
 */
export function logBuildCompleted(
  db: D1Database,
  buildId: string,
  data: BuildEventData["BUILD_COMPLETED"],
): Promise<void> {
  return logBuildEvent(db, buildId, "BUILD_COMPLETED", data);
}

/**
 * Log INSTRUCTIONS_GENERATED event
 */
export function logInstructionsGenerated(
  db: D1Database,
  buildId: string,
  data: BuildEventData["INSTRUCTIONS_GENERATED"],
): Promise<void> {
  return logBuildEvent(db, buildId, "INSTRUCTIONS_GENERATED", data);
}
