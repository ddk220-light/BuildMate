/**
 * Gemini API Types
 */

export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface GeminiRequestConfig {
  systemPrompt: string;
  userPrompt: string;
  outputSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  success: boolean;
  data?: unknown;
  rawText?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

// Gemini API request/response structures
export interface GeminiAPIRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
}

export interface GeminiAPIResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export type AgentType =
  | "structure"
  | "option"
  | "instruction"
  | "existing_items"
  | "setup_steps"
  | "skill_detector";

export interface AILogEntry {
  id: string;
  build_id: string | null;
  agent_type: AgentType;
  request_prompt: string;
  response_json: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number;
  success: number;
  error_message: string | null;
}
