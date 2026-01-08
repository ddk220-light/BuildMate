/**
 * Gemini API Client
 *
 * Provides a reusable interface for making Gemini API calls with:
 * - Structured output support via JSON schema
 * - Error handling with exponential backoff retry
 * - Request/response logging
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GeminiClientConfig,
  GeminiRequestConfig,
  GeminiResponse,
  GeminiAPIRequest,
  GeminiAPIResponse,
  AgentType,
  AILogEntry,
} from './types';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite-preview-06-2025';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.7;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: GeminiClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /**
   * Make a call to the Gemini API
   */
  async call(config: GeminiRequestConfig): Promise<GeminiResponse> {
    const startTime = Date.now();

    // Combine system and user prompts
    const combinedPrompt = `${config.systemPrompt}\n\n${config.userPrompt}`;

    // Build the API request
    const requestBody: GeminiAPIRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: combinedPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      },
    };

    // Add structured output schema if provided
    if (config.outputSchema) {
      requestBody.generationConfig.responseMimeType = 'application/json';
      requestBody.generationConfig.responseSchema = config.outputSchema;
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.makeRequest(url, requestBody);
        const latencyMs = Date.now() - startTime;

        return this.parseResponse(response, latencyMs, config.outputSchema !== undefined);
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message;

        // Don't retry on 401 (auth error) or 400 (bad request)
        if (errorMessage.includes('401') || errorMessage.includes('400')) {
          break;
        }

        // Retry on 429 (rate limit) or 503 (service unavailable)
        if (errorMessage.includes('429') || errorMessage.includes('503')) {
          if (attempt < MAX_RETRIES - 1) {
            const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }
        }

        // For other errors, don't retry
        break;
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message ?? 'Unknown error',
      latencyMs,
    };
  }

  /**
   * Make the actual HTTP request with timeout
   */
  private async makeRequest(url: string, body: GeminiAPIRequest): Promise<GeminiAPIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
      }

      return await response.json() as GeminiAPIResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout after 30 seconds');
      }
      throw error;
    }
  }

  /**
   * Parse the Gemini API response
   */
  private parseResponse(
    response: GeminiAPIResponse,
    latencyMs: number,
    expectJson: boolean
  ): GeminiResponse {
    // Check for API-level error
    if (response.error) {
      return {
        success: false,
        error: `${response.error.status}: ${response.error.message}`,
        latencyMs,
      };
    }

    // Extract the text from the response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return {
        success: false,
        error: 'No content in response',
        latencyMs,
      };
    }

    // Extract usage metadata
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        }
      : undefined;

    // If we expect JSON, try to parse it
    if (expectJson) {
      try {
        const data = JSON.parse(text);
        return {
          success: true,
          data,
          rawText: text,
          usage,
          latencyMs,
        };
      } catch {
        // JSON parse failed, return raw text
        return {
          success: true,
          rawText: text,
          error: 'Failed to parse JSON response',
          usage,
          latencyMs,
        };
      }
    }

    // Return raw text response
    return {
      success: true,
      rawText: text,
      usage,
      latencyMs,
    };
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create an AI log entry for database storage
 */
export function createAILogEntry(
  buildId: string | null,
  agentType: AgentType,
  requestPrompt: string,
  response: GeminiResponse
): AILogEntry {
  return {
    id: uuidv4(),
    build_id: buildId,
    agent_type: agentType,
    request_prompt: requestPrompt.length > 10000 ? requestPrompt.substring(0, 10000) : requestPrompt,
    response_json: response.success ? JSON.stringify(response.data ?? response.rawText) : null,
    prompt_tokens: response.usage?.promptTokens ?? null,
    completion_tokens: response.usage?.completionTokens ?? null,
    latency_ms: response.latencyMs,
    success: response.success ? 1 : 0,
    error_message: response.error ?? null,
  };
}

/**
 * Save an AI log entry to the database
 */
export async function saveAILog(db: D1Database, log: AILogEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_logs (id, build_id, agent_type, request_prompt, response_json, prompt_tokens, completion_tokens, latency_ms, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      log.id,
      log.build_id,
      log.agent_type,
      log.request_prompt,
      log.response_json,
      log.prompt_tokens,
      log.completion_tokens,
      log.latency_ms,
      log.success,
      log.error_message
    )
    .run();
}
