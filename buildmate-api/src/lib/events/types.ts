/**
 * Build Event Types
 *
 * Defines event types and data structures for build event logging.
 */

export type BuildEventType =
  | "BUILD_STARTED"
  | "STRUCTURE_GENERATED"
  | "OPTIONS_SHOWN"
  | "OPTION_SELECTED"
  | "BUILD_COMPLETED"
  | "INSTRUCTIONS_GENERATED";

export interface BuildEventData {
  BUILD_STARTED: {
    description: string;
    budgetMin: number;
    budgetMax: number;
    sessionId: string;
  };
  STRUCTURE_GENERATED: {
    buildCategory: string;
    components: Array<{ componentType: string; stepIndex: number }>;
    latencyMs: number;
  };
  OPTIONS_SHOWN: {
    componentType: string;
    optionCount: number;
    cached: boolean;
    latencyMs?: number;
  };
  OPTION_SELECTED: {
    componentType: string;
    productName: string;
    brand: string;
    price: number;
    tier: "budget" | "midrange" | "premium";
    isModification: boolean;
  };
  BUILD_COMPLETED: {
    totalCost: number;
    itemCount: number;
    timeToCompleteMs: number;
  };
  INSTRUCTIONS_GENERATED: {
    cached: boolean;
    latencyMs: number;
    stepCount: number;
  };
}

export interface BuildEvent<T extends BuildEventType = BuildEventType> {
  id: string;
  buildId: string;
  eventType: T;
  eventData: BuildEventData[T];
  stepIndex?: number;
  createdAt?: string;
}

export interface BuildMetrics {
  id: string;
  buildId: string;
  timeToCompleteMs: number | null;
  totalCost: number;
  budgetMin: number;
  budgetMax: number;
  budgetAdherence: "under" | "within" | "over";
  stepCount: number;
  optionsShownCount: number;
  modificationsCount: number;
}
