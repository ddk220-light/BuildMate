/**
 * Mock Gemini API Client for testing
 *
 * Provides deterministic responses for all three agent types:
 * - Structure Generator: Returns 3 components
 * - Option Generator: Returns 3 product tiers
 * - Instruction Generator: Returns assembly guide
 */

import type {
  GeminiRequestConfig,
  GeminiResponse,
} from "../../lib/gemini/types";

/**
 * Mock structure response - Gaming PC example
 */
export const MOCK_STRUCTURE_RESPONSE = {
  buildCategory: "Gaming PC Build",
  components: [
    {
      stepIndex: 0,
      componentType: "Graphics Card",
      description: "High-performance GPU for gaming",
    },
    {
      stepIndex: 1,
      componentType: "Processor",
      description: "Fast CPU for gaming and multitasking",
    },
    {
      stepIndex: 2,
      componentType: "Motherboard",
      description: "Compatible motherboard for components",
    },
  ],
  reasoning:
    "These three components form the core of a gaming PC, with the GPU being the most important for gaming performance.",
};

/**
 * Mock options response - 3 tiers of products
 */
export const MOCK_OPTIONS_RESPONSE = {
  options: [
    {
      productName: "RTX 4060",
      brand: "NVIDIA",
      price: 299,
      keySpec: "8GB GDDR6, 3050 MHz",
      compatibilityNote: "Excellent for 1080p gaming",
      reviewScore: 4.5,
      productUrl: "https://example.com/rtx4060",
      tier: "budget",
    },
    {
      productName: "RTX 4070",
      brand: "NVIDIA",
      price: 549,
      keySpec: "12GB GDDR6X, 3750 MHz",
      compatibilityNote: "Great for 1440p gaming",
      reviewScore: 4.7,
      productUrl: "https://example.com/rtx4070",
      tier: "midrange",
    },
    {
      productName: "RTX 4080",
      brand: "NVIDIA",
      price: 999,
      keySpec: "16GB GDDR6X, 4000 MHz",
      compatibilityNote: "Excellent for 4K gaming",
      reviewScore: 4.8,
      productUrl: "https://example.com/rtx4080",
      tier: "premium",
    },
  ],
};

/**
 * Mock instructions response
 */
export const MOCK_INSTRUCTIONS_RESPONSE = {
  title: "Gaming PC Assembly Guide",
  estimatedTime: "2-3 hours",
  overview:
    "This guide will walk you through assembling your gaming PC with the selected components.",
  steps: [
    {
      stepNumber: 1,
      title: "Prepare Your Workspace",
      description:
        "Clear a large, clean workspace. Ground yourself to prevent static damage.",
      warnings: ["Static electricity can damage components"],
      tips: ["Work on a non-conductive surface"],
    },
    {
      stepNumber: 2,
      title: "Install the Processor",
      description:
        "Carefully align the CPU with the socket and lower it into place.",
      warnings: ["Do not force the CPU into the socket"],
      tips: ["Look for the golden triangle alignment marker"],
    },
    {
      stepNumber: 3,
      title: "Install the Graphics Card",
      description:
        "Insert the GPU into the PCIe x16 slot and secure with screws.",
      warnings: ["Ensure power cables are connected"],
      tips: ["Remove PCIe slot covers before installation"],
    },
  ],
  finalChecks: [
    "Verify all power connections",
    "Check that all components are seated properly",
    "Ensure case fans are connected",
  ],
};

/**
 * Configuration for mock responses
 */
interface MockConfig {
  shouldFail?: boolean;
  failureMessage?: string;
  latencyMs?: number;
  customResponse?: unknown;
}

/**
 * Mock Gemini Client for testing
 */
export class MockGeminiClient {
  private config: MockConfig;

  constructor(config: MockConfig = {}) {
    this.config = config;
  }

  /**
   * Simulate a Gemini API call
   */
  async call(requestConfig: GeminiRequestConfig): Promise<GeminiResponse> {
    const latencyMs = this.config.latencyMs ?? 100;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Handle configured failure
    if (this.config.shouldFail) {
      return {
        success: false,
        error: this.config.failureMessage ?? "Mock API error",
        latencyMs,
      };
    }

    // Return custom response if provided
    if (this.config.customResponse) {
      return {
        success: true,
        data: this.config.customResponse,
        rawText: JSON.stringify(this.config.customResponse),
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
        latencyMs,
      };
    }

    // Determine response based on prompt content
    const promptContent =
      `${requestConfig.systemPrompt} ${requestConfig.userPrompt}`.toLowerCase();

    let responseData: unknown;

    if (
      promptContent.includes("structure") ||
      promptContent.includes("component types")
    ) {
      responseData = MOCK_STRUCTURE_RESPONSE;
    } else if (
      promptContent.includes("options") ||
      promptContent.includes("product recommendations")
    ) {
      responseData = MOCK_OPTIONS_RESPONSE;
    } else if (
      promptContent.includes("instruction") ||
      promptContent.includes("assembly")
    ) {
      responseData = MOCK_INSTRUCTIONS_RESPONSE;
    } else {
      // Default response
      responseData = { message: "Mock response" };
    }

    return {
      success: true,
      data: responseData,
      rawText: JSON.stringify(responseData),
      usage: {
        promptTokens: 150,
        completionTokens: 250,
        totalTokens: 400,
      },
      latencyMs,
    };
  }

  /**
   * Configure the mock to fail
   */
  setFailure(message: string): void {
    this.config.shouldFail = true;
    this.config.failureMessage = message;
  }

  /**
   * Configure the mock to succeed
   */
  setSuccess(): void {
    this.config.shouldFail = false;
    this.config.failureMessage = undefined;
  }

  /**
   * Set a custom response
   */
  setCustomResponse(response: unknown): void {
    this.config.customResponse = response;
  }

  /**
   * Reset to default behavior
   */
  reset(): void {
    this.config = {};
  }
}

/**
 * Create a new mock Gemini client
 */
export function createMockGeminiClient(config?: MockConfig): MockGeminiClient {
  return new MockGeminiClient(config);
}

/**
 * Helper to create a mock fetch function for Gemini API
 */
export function createMockFetch(config: MockConfig = {}) {
  return async (_url: string, options: RequestInit): Promise<Response> => {
    // Parse the request to determine what type of response to return
    const body = options.body ? JSON.parse(options.body as string) : {};
    const promptContent =
      body.contents?.[0]?.parts?.[0]?.text?.toLowerCase() ?? "";

    if (config.shouldFail) {
      return new Response(
        JSON.stringify({
          error: {
            code: 500,
            message: config.failureMessage ?? "API Error",
            status: "INTERNAL",
          },
        }),
        { status: 500 },
      );
    }

    let responseData: unknown;

    if (
      promptContent.includes("structure") ||
      promptContent.includes("component types")
    ) {
      responseData = MOCK_STRUCTURE_RESPONSE;
    } else if (
      promptContent.includes("options") ||
      promptContent.includes("product")
    ) {
      responseData = MOCK_OPTIONS_RESPONSE;
    } else if (
      promptContent.includes("instruction") ||
      promptContent.includes("assembly")
    ) {
      responseData = MOCK_INSTRUCTIONS_RESPONSE;
    } else {
      responseData = { message: "Mock response" };
    }

    const geminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(responseData) }],
            role: "model",
          },
          finishReason: "STOP",
        },
      ],
      usageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 250,
        totalTokenCount: 400,
      },
    };

    return new Response(JSON.stringify(geminiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
