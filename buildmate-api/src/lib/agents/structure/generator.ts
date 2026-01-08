/**
 * Structure Generator Service
 *
 * Orchestrates the Structure Generator AI agent that analyzes user input
 * and determines the 3 most critical components for their build.
 */

import { GeminiClient, createAILogEntry, saveAILog } from '../../gemini';
import {
  structureGeneratorSchema,
  type StructureGeneratorOutput,
} from '../../gemini/schemas';
import { STRUCTURE_GENERATOR_SYSTEM_PROMPT, buildUserPrompt } from './prompt';

/**
 * Input for the Structure Generator
 */
export interface StructureGeneratorInput {
  buildId: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
}

/**
 * Result from the Structure Generator
 */
export interface StructureGeneratorResult {
  success: boolean;
  data?: StructureGeneratorOutput;
  error?: string;
  latencyMs: number;
}

/**
 * Structure Generator Service
 *
 * Analyzes user build descriptions and determines the 3 most critical
 * components needed for their build.
 */
export class StructureGenerator {
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
   * Generate the build structure from user input
   */
  async generate(input: StructureGeneratorInput): Promise<StructureGeneratorResult> {
    const userPrompt = buildUserPrompt(
      input.description,
      input.budgetMin,
      input.budgetMax
    );

    const fullPrompt = `${STRUCTURE_GENERATOR_SYSTEM_PROMPT}\n\n${userPrompt}`;

    // Call the Gemini API
    const response = await this.client.call({
      systemPrompt: STRUCTURE_GENERATOR_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: structureGeneratorSchema,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Log the AI call
    const logEntry = createAILogEntry(
      input.buildId,
      'structure',
      fullPrompt,
      response
    );
    await saveAILog(this.db, logEntry);

    // Handle API failure
    if (!response.success) {
      return {
        success: false,
        error: response.error ?? 'Unknown error from Gemini API',
        latencyMs: response.latencyMs,
      };
    }

    // Validate the response structure
    const data = response.data as StructureGeneratorOutput;

    if (!this.validateResponse(data)) {
      return {
        success: false,
        error: 'Invalid response structure from AI: expected exactly 3 components with required fields',
        latencyMs: response.latencyMs,
      };
    }

    // Ensure step indices are 0, 1, 2
    data.components = data.components.map((comp, index) => ({
      ...comp,
      stepIndex: index,
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
  private validateResponse(data: unknown): data is StructureGeneratorOutput {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const output = data as StructureGeneratorOutput;

    // Must have buildCategory
    if (typeof output.buildCategory !== 'string' || !output.buildCategory) {
      return false;
    }

    // Must have exactly 3 components
    if (!Array.isArray(output.components) || output.components.length !== 3) {
      return false;
    }

    // Validate each component
    for (const comp of output.components) {
      if (typeof comp.componentType !== 'string' || !comp.componentType) {
        return false;
      }
      if (typeof comp.description !== 'string' || !comp.description) {
        return false;
      }
    }

    // Must have reasoning
    if (typeof output.reasoning !== 'string' || !output.reasoning) {
      return false;
    }

    return true;
  }
}
