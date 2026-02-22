/**
 * Setup Steps Generator Service
 *
 * Orchestrates the Setup Steps Generator AI agent that creates
 * 3-5 functional setup steps for a completed build.
 */

import { GeminiClient, createAILogEntry, saveAILog } from "../../gemini";
import {
  setupStepsSchema,
  type SetupStepsOutput,
} from "../../gemini/schemas";
import { SETUP_STEPS_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { SetupStepsContext } from "./context";

/**
 * Input for the Setup Steps Generator
 */
export interface SetupStepsGeneratorInput {
  context: SetupStepsContext;
}

/**
 * Result from the Setup Steps Generator
 */
export interface SetupStepsGeneratorResult {
  success: boolean;
  data?: SetupStepsOutput;
  error?: string;
  latencyMs: number;
}

/**
 * Setup Steps Generator Service
 *
 * Creates 3-5 functional setup steps for a completed build,
 * grouping components by function rather than individually.
 */
export class SetupStepsGenerator {
  private client: GeminiClient;
  private db: D1Database;

  constructor(apiKey: string, model: string, db: D1Database, baseUrl?: string) {
    this.client = new GeminiClient({
      apiKey,
      model,
      baseUrl,
    });
    this.db = db;
  }

  /**
   * Generate setup steps for a completed build
   */
  async generate(
    input: SetupStepsGeneratorInput,
  ): Promise<SetupStepsGeneratorResult> {
    const { context } = input;

    const userPrompt = buildUserPrompt(
      context.buildCategory,
      context.buildName,
      context.description,
      context.items,
    );

    const fullPrompt = `${SETUP_STEPS_SYSTEM_PROMPT}\n\n${userPrompt}`;

    // Call the Gemini API
    const response = await this.client.call({
      systemPrompt: SETUP_STEPS_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: setupStepsSchema,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Log the AI call
    const logEntry = createAILogEntry(
      context.buildId,
      "setup_steps",
      fullPrompt,
      response,
    );
    await saveAILog(this.db, logEntry);

    // Handle API failure
    if (!response.success) {
      return {
        success: false,
        error: response.error ?? "Unknown error from Gemini API",
        latencyMs: response.latencyMs,
      };
    }

    // Validate the response structure
    const data = response.data as SetupStepsOutput;

    if (!this.validateResponse(data)) {
      return {
        success: false,
        error:
          "Invalid response structure from AI: expected 3-5 steps with required fields",
        latencyMs: response.latencyMs,
      };
    }

    // Ensure step numbers are sequential starting at 1
    data.steps = data.steps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));

    return {
      success: true,
      data,
      latencyMs: response.latencyMs,
    };
  }

  /**
   * Validate the AI response has the correct structure
   */
  private validateResponse(data: unknown): data is SetupStepsOutput {
    if (!data || typeof data !== "object") {
      return false;
    }

    const output = data as SetupStepsOutput;

    // Must have 3-5 steps
    if (
      !Array.isArray(output.steps) ||
      output.steps.length < 3 ||
      output.steps.length > 5
    ) {
      return false;
    }

    // Validate each step
    for (const step of output.steps) {
      if (typeof step.title !== "string" || !step.title.trim()) {
        return false;
      }
      if (typeof step.description !== "string" || !step.description.trim()) {
        return false;
      }
      if (
        !Array.isArray(step.componentsInvolved) ||
        step.componentsInvolved.length === 0
      ) {
        return false;
      }
    }

    return true;
  }
}
