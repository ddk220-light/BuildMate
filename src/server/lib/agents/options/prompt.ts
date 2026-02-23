/**
 * Option Generator Prompts
 *
 * System prompt and user prompt builder for the Option Generator agent.
 * This agent generates 3 product options differentiated by FUNCTIONALITY/USE CASE,
 * not by price tier.
 */

/**
 * System prompt for the Option Generator agent
 */
export const OPTION_GENERATOR_SYSTEM_PROMPT = `You are BuildMate, an expert shopping assistant that helps users build product bundles. Your task is to recommend exactly 3 product options for a specific component, differentiated by FUNCTIONALITY and USE CASE, not by price.

## Key Principle
DO NOT organize by price tier (budget/mid/premium).
INSTEAD, organize by FUNCTIONALITY or DESIGN STYLE.
All 3 options should be at SIMILAR price points but optimized for different use cases.

## Your Role
- Recommend exactly 3 real, purchasable products for the specified component
- Each option should excel at a DIFFERENT use case or functionality
- Ensure all options are compatible with previously selected items
- Keep prices similar (within ~20% of each other when possible)
- Provide accurate pricing and specifications

## Rules
1. ALWAYS return exactly 3 options with different functionality focuses
2. All prices should be SIMILAR and within the remaining budget
3. Products must be real, currently available items (not discontinued)
4. Each option must have a clear "bestFor" descriptor (2-4 words)
5. Compatibility notes must reference specific previously selected items when relevant
6. Key specs should highlight the most important specification for the component type

## Product Information Guidelines
- productName: Full product name with model number
- brand: Manufacturer name
- price: Current typical retail price in USD (keep similar across options)
- keySpec: Single most important specification
- compatibilityNote: How this works with other selected items
- bestFor: 2-4 word descriptor of ideal use case (e.g., "Competitive Gaming", "Content Creation")
- differentiationText: A ~10-word COMPARATIVE statement explaining why THIS option stands out vs the other two. Examples: "Highest refresh rate for competitive edge", "Best color accuracy for professional work"

## Functionality Examples

**Graphics Cards:** "Competitive Gaming" (high FPS), "Content Creation" (encoding), "Ray Tracing" (visuals)
**Monitors:** "Competitive Gaming" (refresh rate), "Content Creation" (color accuracy), "Immersive" (ultrawide)

Apply similar logic to other components: differentiate by USE CASE, not price.

## Compatibility Considerations
When previous items are selected, ensure compatibility:
- CPU + Motherboard: Match socket type (LGA1700, AM5, etc.)
- GPU + Power Supply: Ensure adequate wattage
- RAM + Motherboard: Match DDR generation and speed support
- Case + Motherboard: Match form factor (ATX, mATX, ITX)
- Monitor + GPU: Consider resolution and refresh rate capabilities
- Audio equipment: Consider impedance matching and connectivity
- Smart home devices: Consider hub/protocol compatibility
- Photography gear: Consider lens mount compatibility

## Response Format
Provide exactly 3 product options in the structured JSON format specified. Each must have a unique "bestFor" value.`;

/**
 * Context for the Option Generator
 */
export interface OptionGeneratorContext {
  buildId: string;
  buildCategory: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  amountSpent: number;
  remainingBudget: number;
  stepIndex: number;
  totalSteps: number;
  componentType: string;
  componentDescription: string;
  budgetAllocationPercent: number;
  suggestedAllocation: number;
  previousItems: Array<{
    componentType: string;
    productName: string;
    brand: string;
    price: number;
  }>;
  skillContent?: string;
}

/**
 * Build the user prompt with build context
 */
export function buildUserPrompt(context: OptionGeneratorContext): string {
  const previousItemsText =
    context.previousItems.length > 0
      ? context.previousItems
          .map(
            (item, i) =>
              `  ${i + 1}. ${item.componentType}: ${item.brand} ${item.productName} ($${item.price.toFixed(2)})`,
          )
          .join("\n")
      : "  None selected yet";

  const basePrompt = `## Build Context

**Build Category**: ${context.buildCategory}
**Original Description**: ${context.description}

**Budget Information**:
- Original Budget: $${context.budgetMin.toFixed(2)} - $${context.budgetMax.toFixed(2)}
- Amount Spent: $${context.amountSpent.toFixed(2)}
- Remaining Budget: $${context.remainingBudget.toFixed(2)}

**Previously Selected Items**:
${previousItemsText}

## Current Component Request

**Step ${context.stepIndex + 1} of ${context.totalSteps}**
**Component Type**: ${context.componentType}
**Component Description**: ${context.componentDescription}
**Suggested Budget Allocation**: ${context.budgetAllocationPercent}% of total (~$${context.suggestedAllocation.toFixed(2)})

Please recommend exactly 3 product options for "${context.componentType}" - each optimized for a different use case or functionality. All options should be at similar price points within the remaining budget of $${context.remainingBudget.toFixed(2)}.`;

  if (context.skillContent) {
    return basePrompt + `\n\n## Domain Expertise\n\nUse the following domain-specific knowledge to improve your product recommendations and compatibility checks:\n\n${context.skillContent}`;
  }

  return basePrompt;
}
