/**
 * Instruction Generator Service
 *
 * Orchestrates the Instruction Generator AI agent that creates
 * custom assembly guides for completed builds.
 */

import { GeminiClient, createAILogEntry, saveAILog } from '../../gemini';
import {
  instructionGeneratorSchema,
  type InstructionGeneratorOutput,
} from '../../gemini/schemas';
import { INSTRUCTION_GENERATOR_SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import type { InstructionGeneratorContext } from './context';

/**
 * Input for the Instruction Generator
 */
export interface InstructionGeneratorInput {
  context: InstructionGeneratorContext;
}

/**
 * Result from the Instruction Generator
 */
export interface InstructionGeneratorResult {
  success: boolean;
  data?: InstructionGeneratorOutput;
  error?: string;
  latencyMs: number;
}

/**
 * Instruction Generator Service
 *
 * Creates custom assembly guides based on the actual products
 * selected in a completed build.
 */
export class InstructionGenerator {
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
   * Generate assembly instructions for a completed build
   */
  async generate(input: InstructionGeneratorInput): Promise<InstructionGeneratorResult> {
    const userPrompt = buildUserPrompt(input.context);
    const fullPrompt = `${INSTRUCTION_GENERATOR_SYSTEM_PROMPT}\n\n${userPrompt}`;

    // Call the Gemini API
    const response = await this.client.call({
      systemPrompt: INSTRUCTION_GENERATOR_SYSTEM_PROMPT,
      userPrompt,
      outputSchema: instructionGeneratorSchema,
      temperature: 0.7,
      maxTokens: 4096, // Instructions can be longer than other outputs
    });

    // Log the AI call
    const logEntry = createAILogEntry(
      input.context.buildId,
      'instruction',
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
    const data = response.data as InstructionGeneratorOutput;

    if (!this.validateResponse(data)) {
      return {
        success: false,
        error: 'Invalid response structure from AI: expected title and steps array',
        latencyMs: response.latencyMs,
      };
    }

    // Ensure step numbers are sequential starting from 1
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
  private validateResponse(data: unknown): data is InstructionGeneratorOutput {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const output = data as InstructionGeneratorOutput;

    // Must have title
    if (typeof output.title !== 'string' || !output.title) {
      return false;
    }

    // Must have steps array with at least one step
    if (!Array.isArray(output.steps) || output.steps.length === 0) {
      return false;
    }

    // Validate each step has required fields
    for (const step of output.steps) {
      if (typeof step.title !== 'string' || !step.title) {
        return false;
      }
      if (typeof step.description !== 'string' || !step.description) {
        return false;
      }
    }

    return true;
  }
}
