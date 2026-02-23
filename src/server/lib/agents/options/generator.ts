/**
 * Option Generator Service
 *
 * Orchestrates the Option Generator AI agent that recommends
 * 3 product options for a component, differentiated by functionality/use case.
 */

import { GeminiClient, createAILogEntry, saveAILog } from "../../gemini";
import {
  optionGeneratorSchema,
  type OptionGeneratorOutput,
} from "../../gemini/schemas";
import {
  OPTION_GENERATOR_SYSTEM_PROMPT,
  buildUserPrompt,
  type OptionGeneratorContext,
} from "./prompt";

/**
 * Input for the Option Generator
 */
export interface OptionGeneratorInput {
  context: OptionGeneratorContext;
}

/**
 * Result from the Option Generator
 */
export interface OptionGeneratorResult {
  success: boolean;
  data?: OptionGeneratorOutput;
  error?: string;
  latencyMs: number;
}

/**
 * Option Generator Service
 *
 * Generates 3 product options differentiated by functionality/use case.
 */
export class OptionGenerator {
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
   * Generate 3 product options for the specified component
   */
  async generate(input: OptionGeneratorInput): Promise<OptionGeneratorResult> {
    const userPrompt = buildUserPrompt(input.context);
    const fullPrompt = `${OPTION_GENERATOR_SYSTEM_PROMPT}\n\n${userPrompt}`;

    // Call the Gemini API
    const response = await this.client.call({
      systemPrompt: OPTION_GENERATOR_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: optionGeneratorSchema,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Log the AI call asynchronously
    Promise.resolve().then(async () => {
      const logEntry = createAILogEntry(
        input.context.buildId,
        "option",
        fullPrompt,
        response,
      );
      await saveAILog(this.db, logEntry);
    }).catch(err => console.error("Failed to save AI log (option generator):", err));

    // Handle API failure
    if (!response.success) {
      return {
        success: false,
        error: response.error ?? "Unknown error from Gemini API",
        latencyMs: response.latencyMs,
      };
    }

    // Validate the response structure
    const data = response.data as OptionGeneratorOutput;

    if (!this.validateResponse(data, input.context.remainingBudget)) {
      return {
        success: false,
        error:
          "Invalid response structure from AI: expected exactly 3 options with required fields",
        latencyMs: response.latencyMs,
      };
    }

    return {
      success: true,
      data,
      latencyMs: response.latencyMs,
    };
  }

  /**
   * Validate the AI response has the correct structure
   */
  private validateResponse(
    data: unknown,
    remainingBudget: number,
  ): data is OptionGeneratorOutput {
    if (!data || typeof data !== "object") {
      return false;
    }

    const output = data as OptionGeneratorOutput;

    // Must have exactly 3 options
    if (!Array.isArray(output.options) || output.options.length !== 3) {
      return false;
    }

    // Track bestFor values to ensure uniqueness
    const bestForValues = new Set<string>();

    // Validate each option
    for (const option of output.options) {
      // Required fields
      if (typeof option.productName !== "string" || !option.productName) {
        return false;
      }
      if (typeof option.brand !== "string" || !option.brand) {
        return false;
      }
      if (typeof option.price !== "number" || option.price <= 0) {
        return false;
      }
      if (typeof option.keySpec !== "string" || !option.keySpec) {
        return false;
      }
      if (
        typeof option.compatibilityNote !== "string" ||
        !option.compatibilityNote
      ) {
        return false;
      }
      if (typeof option.bestFor !== "string" || !option.bestFor) {
        return false;
      }
      if (
        typeof option.differentiationText !== "string" ||
        !option.differentiationText
      ) {
        return false;
      }

      // Check price is within budget - log warning but don't fail
      if (option.price > remainingBudget) {
        console.warn(
          `Option ${option.productName} exceeds remaining budget: $${option.price} > $${remainingBudget}`,
        );
      }

      bestForValues.add(option.bestFor);
    }

    // Ensure we have 3 different bestFor values (each option serves a different use case)
    if (bestForValues.size !== 3) {
      console.warn(
        "Options do not have 3 unique bestFor values, but allowing response",
      );
    }

    return true;
  }
}
