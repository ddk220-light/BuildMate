/**
 * JSON Schemas for Gemini API Structured Outputs
 */

/**
 * Schema for Structure Generator Agent output
 * Used when analyzing user input to determine 3 required components
 */
export const structureGeneratorSchema = {
  type: 'object',
  properties: {
    buildCategory: {
      type: 'string',
      description: 'The detected category of the build (e.g., "gaming_pc", "home_theater", "smart_home")',
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepIndex: { type: 'integer' },
          componentType: { type: 'string' },
          description: { type: 'string' },
          budgetAllocationPercent: { type: 'number' },
        },
        required: ['stepIndex', 'componentType', 'description'],
      },
      minItems: 3,
      maxItems: 3,
    },
    reasoning: {
      type: 'string',
      description: 'Brief explanation of why these 3 components were chosen',
    },
  },
  required: ['buildCategory', 'components', 'reasoning'],
};

/**
 * Schema for Option Generator Agent output
 * Used when generating 3 product options for a component
 */
export const optionGeneratorSchema = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          brand: { type: 'string' },
          price: { type: 'number' },
          productUrl: { type: 'string' },
          imageUrl: { type: 'string' },
          keySpec: { type: 'string' },
          compatibilityNote: { type: 'string' },
          reviewScore: { type: 'number' },
          reviewUrl: { type: 'string' },
          tier: {
            type: 'string',
            enum: ['budget', 'midrange', 'premium'],
          },
        },
        required: [
          'productName',
          'brand',
          'price',
          'keySpec',
          'compatibilityNote',
          'tier',
        ],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['options'],
};

/**
 * Schema for Instruction Generator Agent output
 * Used when generating assembly instructions for a completed build
 */
export const instructionGeneratorSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    estimatedTime: { type: 'string' },
    overview: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepNumber: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          warnings: {
            type: 'array',
            items: { type: 'string' },
          },
          tips: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['stepNumber', 'title', 'description'],
      },
    },
    finalChecks: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'steps'],
};

/**
 * Type definitions for schema outputs
 */
export interface StructureGeneratorOutput {
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
    productUrl?: string;
    imageUrl?: string;
    keySpec: string;
    compatibilityNote: string;
    reviewScore?: number;
    reviewUrl?: string;
    tier: 'budget' | 'midrange' | 'premium';
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
