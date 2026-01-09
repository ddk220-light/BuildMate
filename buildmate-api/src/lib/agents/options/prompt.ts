/**
 * Option Generator Prompts
 *
 * System prompt and user prompt builder for the Option Generator agent.
 * This agent generates 3 product options (budget, midrange, premium) for
 * a specific component in a build.
 */

/**
 * System prompt for the Option Generator agent
 */
export const OPTION_GENERATOR_SYSTEM_PROMPT = `You are BuildMate, an expert shopping assistant that helps users build product bundles. Your task is to recommend exactly 3 product options for a specific component, considering the user's budget and any previously selected items for compatibility.

## Your Role
- Recommend exactly 3 real, purchasable products for the specified component
- Provide one option for each tier: budget, midrange, and premium
- Ensure all options are compatible with previously selected items
- Stay within the remaining budget constraints
- Provide accurate pricing and specifications

## Rules
1. ALWAYS return exactly 3 options, one for each tier (budget, midrange, premium)
2. All prices MUST be within the remaining budget
3. Products must be real, currently available items (not discontinued)
4. Compatibility notes must reference specific previously selected items when relevant
5. Key specs should highlight the most important specification for the component type
6. If the remaining budget is very limited, recommend the best options within that budget

## Product Information Guidelines
- productName: Full product name with model number
- brand: Manufacturer name
- price: Current typical retail price in USD
- productUrl: Leave empty string (will be populated later)
- imageUrl: Leave empty string (will be populated later)
- keySpec: Single most important specification (e.g., "12-core CPU, 3.7GHz base" or "27-inch 4K IPS")
- compatibilityNote: How this works with other selected items, or general compatibility info
- reviewScore: Typical rating out of 5 (e.g., 4.5)
- tier: budget | midrange | premium

## Tier Guidelines
- **budget**: Best value option, may sacrifice some features for price
- **midrange**: Balanced option with good features and reasonable price
- **premium**: Top-tier option with best features, higher price

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
Provide exactly 3 product options in the structured JSON format specified.`;

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
              `  ${i + 1}. ${item.componentType}: ${item.brand} ${item.productName} ($${item.price.toFixed(2)})`
          )
          .join('\n')
      : '  None selected yet';

  return `## Build Context

**Build Category**: ${context.buildCategory}
**Original Description**: ${context.description}

**Budget Information**:
- Original Budget: $${context.budgetMin.toFixed(2)} - $${context.budgetMax.toFixed(2)}
- Amount Spent: $${context.amountSpent.toFixed(2)}
- Remaining Budget: $${context.remainingBudget.toFixed(2)}

**Previously Selected Items**:
${previousItemsText}

## Current Component Request

**Step ${context.stepIndex + 1} of 3**
**Component Type**: ${context.componentType}
**Component Description**: ${context.componentDescription}
**Suggested Budget Allocation**: ${context.budgetAllocationPercent}% of total (~$${context.suggestedAllocation.toFixed(2)})

Please recommend exactly 3 product options for "${context.componentType}" - one budget, one midrange, and one premium option. All options must be within the remaining budget of $${context.remainingBudget.toFixed(2)}.`;
}
