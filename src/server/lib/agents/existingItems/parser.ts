/**
 * Existing Items Parser Service
 *
 * Parses user-provided text about existing components and extracts
 * structured information about each item.
 */

import { GeminiClient, createAILogEntry, saveAILog } from "../../gemini";
import {
  existingItemsParserSchema,
  type ExistingItemsParserOutput,
} from "../../gemini/schemas";
import {
  EXISTING_ITEMS_PARSER_SYSTEM_PROMPT,
  buildExistingItemsPrompt,
} from "./prompt";

/**
 * Parsed item from user's existing items text
 */
export interface ParsedItem {
  originalText: string;
  productName: string;
  brand: string;
  category: string;
  estimatedPrice: number;
  keySpec: string;
}

/**
 * Input for the Existing Items Parser
 */
export interface ExistingItemsParserInput {
  buildId: string;
  existingItemsText: string;
  skillContent?: string;
}

/**
 * Result from the Existing Items Parser
 */
export interface ExistingItemsParserResult {
  success: boolean;
  data?: ExistingItemsParserOutput;
  error?: string;
  latencyMs: number;
}

/**
 * Existing Items Parser Service
 *
 * Parses free-form text about existing items into structured data.
 */
export class ExistingItemsParser {
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
   * Parse existing items text into structured data
   */
  async parse(input: ExistingItemsParserInput): Promise<ExistingItemsParserResult> {
    // Handle empty or whitespace-only input
    if (!input.existingItemsText?.trim()) {
      return {
        success: true,
        data: {
          items: [],
          unrecognizedText: null,
        },
        latencyMs: 0,
      };
    }

    const userPrompt = buildExistingItemsPrompt(input.existingItemsText, input.skillContent);
    const fullPrompt = `${EXISTING_ITEMS_PARSER_SYSTEM_PROMPT}\n\n${userPrompt}`;

    // Call the Gemini API
    const response = await this.client.call({
      systemPrompt: EXISTING_ITEMS_PARSER_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: existingItemsParserSchema,
      temperature: 0.3, // Lower temperature for more consistent parsing
      maxTokens: 2048,
    });

    // Log the AI call asynchronously to prevent blocking the response
    Promise.resolve().then(async () => {
      const logEntry = createAILogEntry(
        input.buildId,
        "existing_items",
        fullPrompt,
        response
      );
      await saveAILog(this.db, logEntry);
    }).catch(err => console.error("Failed to save AI log (existing_items):", err));

    // Handle API failure
    if (!response.success) {
      return {
        success: false,
        error: response.error ?? "Unknown error from Gemini API",
        latencyMs: response.latencyMs,
      };
    }

    // Validate the response structure
    const data = response.data as ExistingItemsParserOutput;

    if (!this.validateResponse(data)) {
      return {
        success: false,
        error: "Invalid response structure from AI",
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
  private validateResponse(data: unknown): data is ExistingItemsParserOutput {
    if (!data || typeof data !== "object") {
      return false;
    }

    const output = data as ExistingItemsParserOutput;

    // Must have items array
    if (!Array.isArray(output.items)) {
      return false;
    }

    // Validate each item
    for (const item of output.items) {
      if (typeof item.originalText !== "string") {
        return false;
      }
      if (typeof item.productName !== "string") {
        return false;
      }
      if (typeof item.brand !== "string") {
        return false;
      }
      if (typeof item.category !== "string") {
        return false;
      }
      if (typeof item.estimatedPrice !== "number") {
        return false;
      }
      if (typeof item.keySpec !== "string") {
        return false;
      }
    }

    return true;
  }
}
