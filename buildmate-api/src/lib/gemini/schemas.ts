/**
 * JSON Schemas for Gemini API Structured Outputs
 */

/**
 * Schema for Existing Items Parser Agent output
 * Used when parsing user-provided text about existing components
 */
export const existingItemsParserSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          originalText: { type: "string" },
          productName: { type: "string" },
          brand: { type: "string" },
          category: { type: "string" },
          estimatedPrice: { type: "number" },
          keySpec: { type: "string" },
        },
        required: [
          "originalText",
          "productName",
          "brand",
          "category",
          "estimatedPrice",
          "keySpec",
        ],
      },
    },
    unrecognizedText: {
      type: ["string", "null"],
      description: "Any text that could not be parsed as a product",
    },
  },
  required: ["items"],
};

/**
 * Schema for Structure Generator Agent output
 * Used when analyzing user input to determine 3-5 required components
 */
export const structureGeneratorSchema = {
  type: "object",
  properties: {
    buildName: {
      type: "string",
      description:
        'A memorable 2-4 word name that captures the essence of the build (e.g., "1440p Gaming Rig", "Creator Workstation", "Smart Living Hub")',
    },
    buildCategory: {
      type: "string",
      description:
        'The detected category of the build (e.g., "gaming_pc", "home_theater", "smart_home")',
    },
    components: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepIndex: { type: "integer" },
          componentType: { type: "string" },
          description: { type: "string" },
          budgetAllocationPercent: { type: "number" },
        },
        required: ["stepIndex", "componentType", "description"],
      },
      minItems: 3,
      maxItems: 5,
    },
    reasoning: {
      type: "string",
      description: "Brief explanation of why these components were chosen",
    },
  },
  required: ["buildName", "buildCategory", "components", "reasoning"],
};

/**
 * Schema for Option Generator Agent output
 * Used when generating 3 product options for a component
 * Options are differentiated by functionality/use case, not price tier
 * Note: productUrl and imageUrl removed to reduce output tokens (they were always empty)
 */
export const optionGeneratorSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productName: { type: "string" },
          brand: { type: "string" },
          price: { type: "number" },
          keySpec: { type: "string" },
          compatibilityNote: { type: "string" },
          bestFor: {
            type: "string",
            description:
              "The primary use case or functionality focus (e.g., 'Competitive Gaming', 'Content Creation', 'Everyday Computing')",
          },
          differentiationText: {
            type: "string",
            description:
              "A ~10-word comparative statement explaining why THIS option stands out vs the other two options (e.g., 'Highest refresh rate delivers competitive edge over other options')",
          },
        },
        required: [
          "productName",
          "brand",
          "price",
          "keySpec",
          "compatibilityNote",
          "bestFor",
          "differentiationText",
        ],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["options"],
};

/**
 * Schema for Instruction Generator Agent output
 * Used when generating assembly instructions for a completed build
 */
export const instructionGeneratorSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    estimatedTime: { type: "string" },
    overview: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          warnings: {
            type: "array",
            items: { type: "string" },
          },
          tips: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["stepNumber", "title", "description"],
      },
    },
    finalChecks: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "steps"],
};

/**
 * Schema for Setup Steps Generator Agent output
 * Used when generating functional setup steps for a completed build
 * Steps group multiple components by function (not one-by-one)
 */
export const setupStepsSchema = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: {
            type: "integer",
            description: "Step number starting from 1",
          },
          title: {
            type: "string",
            description:
              "Short action title (3-6 words), e.g., 'Connect Core Components'",
          },
          description: {
            type: "string",
            description:
              "Brief instructions (40-60 words) explaining what to do",
          },
          componentsInvolved: {
            type: "array",
            items: { type: "string" },
            description: "List of component types used in this step",
          },
          tip: {
            type: "string",
            description: "Optional quick tip for this step",
          },
        },
        required: ["stepNumber", "title", "description", "componentsInvolved"],
      },
      minItems: 3,
      maxItems: 5,
    },
  },
  required: ["steps"],
};

/**
 * Type definitions for schema outputs
 */
export interface SetupStepsOutput {
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    componentsInvolved: string[];
    tip?: string;
  }>;
}

export interface StructureGeneratorOutput {
  buildName: string;
  buildCategory: string;
  components: Array<{
    stepIndex: number;
    componentType: string;
    description: string;
    budgetAllocationPercent?: number;
  }>;
  reasoning: string;
}

export interface OptionGeneratorOutput {
  options: Array<{
    productName: string;
    brand: string;
    price: number;
    keySpec: string;
    compatibilityNote: string;
    bestFor: string;
    differentiationText: string;
  }>;
}

export interface InstructionGeneratorOutput {
  title: string;
  estimatedTime?: string;
  overview?: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    warnings?: string[];
    tips?: string[];
  }>;
  finalChecks?: string[];
}

export interface ExistingItemsParserOutput {
  items: Array<{
    originalText: string;
    productName: string;
    brand: string;
    category: string;
    estimatedPrice: number;
    keySpec: string;
  }>;
  unrecognizedText: string | null;
}
