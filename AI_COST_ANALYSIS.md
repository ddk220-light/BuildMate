# BuildMate AI Cost Analysis

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Document all Gemini API calls, estimate costs, and provide optimization recommendations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Model Configuration](#current-model-configuration)
3. [API Call Inventory](#api-call-inventory)
4. [Token Estimates by Agent](#token-estimates-by-agent)
5. [Cost Calculation: Complete Build Journey](#cost-calculation-complete-build-journey)
6. [Scenario Analysis](#scenario-analysis)
7. [Optimization Recommendations](#optimization-recommendations)
8. [Appendix: Prompt Details](#appendix-prompt-details)

---

## Executive Summary

BuildMate uses **4 AI agents** powered by Google's Gemini API to provide intelligent product recommendations:

| Metric | Value |
|--------|-------|
| **Current Model** | `gemini-2.5-flash-lite-preview-06-2025` |
| **Input Token Cost** | $0.10 per 1M tokens |
| **Output Token Cost** | $0.40 per 1M tokens |
| **Est. Cost per 5-Step Build** | **$0.0032 - $0.0047** |
| **Est. Cost per 1,000 Builds** | **$3.20 - $4.70** |

The application is **highly cost-efficient** due to:
- Using Flash-Lite (Google's cheapest model)
- Structured JSON outputs (reduced output tokens)
- Reasonable maxTokens limits per agent

---

## Current Model Configuration

### Model Selection

```typescript
const DEFAULT_MODEL = 'gemini-2.5-flash-lite-preview-06-2025';
```

### Gemini 2.5 Flash-Lite Pricing (January 2026)

| Tier | Input (Text/Image/Video) | Output |
|------|--------------------------|--------|
| **Standard** | $0.10 / 1M tokens | $0.40 / 1M tokens |
| **Batch** | $0.05 / 1M tokens | $0.20 / 1M tokens |

### Alternative Models for Comparison

| Model | Input Cost | Output Cost | Notes |
|-------|------------|-------------|-------|
| Gemini 2.5 Flash-Lite | $0.10/1M | $0.40/1M | **Currently used** |
| Gemini 2.0 Flash | $0.10/1M | $0.40/1M | Same price, higher quality |
| Gemini 2.5 Flash | $0.30/1M | $2.50/1M | 3x input, 6.25x output more |
| Gemini 2.5 Pro | $1.25-2.50/1M | $10-15/1M | Premium reasoning |

---

## API Call Inventory

### Agent 1: Existing Items Parser (Optional)

**Purpose:** Parse free-form text about items the user already owns

**Trigger:** Only called when user provides existing items text

| Parameter | Value |
|-----------|-------|
| **Endpoint** | Part of `POST /api/builds/:id/init` |
| **Temperature** | 0.3 (lower for consistent parsing) |
| **maxTokens** | 2,048 |
| **Agent Type** | `existing_items` |

**Input Prompt Components:**
- System prompt: ~800 words (~1,100 tokens)
- User prompt: ~50 words + user text (~100-200 tokens)

**Expected Output:**
```json
{
  "items": [
    {
      "originalText": "RTX 4070",
      "productName": "NVIDIA GeForce RTX 4070",
      "brand": "NVIDIA",
      "category": "Graphics Card",
      "estimatedPrice": 549,
      "keySpec": "12GB GDDR6X, Ada Lovelace"
    }
  ],
  "unrecognizedText": null
}
```

**Estimated Output:** ~200-500 tokens (depending on item count)

---

### Agent 2: Structure Generator

**Purpose:** Analyze user description and determine 3-5 critical components

**Trigger:** Called once per build during initialization

| Parameter | Value |
|-----------|-------|
| **Endpoint** | `POST /api/builds/:id/init` |
| **Temperature** | 0.7 |
| **maxTokens** | 2,048 |
| **Agent Type** | `structure` |

**Input Prompt Components:**
- System prompt: ~1,400 words (~1,900 tokens)
- User prompt: ~100 words (~140 tokens)
- With existing items: +~150 tokens

**Expected Output:**
```json
{
  "buildName": "1440p Gaming Rig",
  "buildCategory": "gaming_pc",
  "components": [
    {
      "stepIndex": 0,
      "componentType": "Graphics Card",
      "description": "GPU for gaming performance",
      "budgetAllocationPercent": 40
    },
    // ... 2-4 more components
  ],
  "reasoning": "These components form the core..."
}
```

**Estimated Output:** ~300-500 tokens

---

### Agent 3: Option Generator

**Purpose:** Generate 3 product options differentiated by functionality

**Trigger:** Called once per component step (3-5 times per build)

| Parameter | Value |
|-----------|-------|
| **Endpoint** | `GET /api/builds/:id/step/:n/options` |
| **Temperature** | 0.7 |
| **maxTokens** | 4,096 |
| **Agent Type** | `option` |

**Input Prompt Components:**
- System prompt: ~1,200 words (~1,650 tokens)
- User prompt (context): ~200 words (~275 tokens)
- Previous items: +~50 tokens per previous selection

**Expected Output:**
```json
{
  "options": [
    {
      "productName": "NVIDIA GeForce RTX 4070",
      "brand": "NVIDIA",
      "price": 549,
      "productUrl": "",
      "imageUrl": "",
      "keySpec": "12GB GDDR6X",
      "compatibilityNote": "Excellent for 1440p gaming",
      "bestFor": "Competitive Gaming",
      "differentiationText": "Highest frame rates for competitive edge"
    },
    // ... 2 more options
  ]
}
```

**Estimated Output:** ~400-600 tokens per call

---

### Agent 4: Setup Steps Generator

**Purpose:** Generate 3-5 functional setup steps for completed build

**Trigger:** Called once when user views instructions

| Parameter | Value |
|-----------|-------|
| **Endpoint** | `GET /api/builds/:id/instructions` |
| **Temperature** | 0.7 |
| **maxTokens** | 2,048 |
| **Agent Type** | `setup_steps` |

**Input Prompt Components:**
- System prompt: ~700 words (~960 tokens)
- User prompt (build context): ~150 words (~200 tokens)
- Selected items: +~50 tokens per item

**Expected Output:**
```json
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Install Core Components",
      "description": "Mount the CPU onto the motherboard...",
      "componentsInvolved": ["CPU", "Motherboard", "RAM"],
      "tip": "Apply thermal paste sparingly"
    },
    // ... 2-4 more steps
  ]
}
```

**Estimated Output:** ~400-700 tokens

---

## Token Estimates by Agent

### Detailed Token Breakdown

| Agent | System Prompt | User Prompt | Total Input | Output | maxTokens |
|-------|---------------|-------------|-------------|--------|-----------|
| **Existing Items Parser** | ~1,100 | ~150 | ~1,250 | ~350 | 2,048 |
| **Structure Generator** | ~1,900 | ~200 | ~2,100 | ~400 | 2,048 |
| **Option Generator** | ~1,650 | ~350* | ~2,000 | ~500 | 4,096 |
| **Setup Steps Generator** | ~960 | ~450* | ~1,410 | ~550 | 2,048 |

*Varies based on context size (previous selections, items count)

### Token Count Notes

- Token estimates are approximate (1 token ≈ 0.75 words for English)
- System prompts are verbose with examples for better AI understanding
- Structured JSON output reduces hallucination but adds output tokens
- maxTokens is a ceiling, actual output is typically 10-25% of max

---

## Cost Calculation: Complete Build Journey

### Scenario: Standard 5-Component Build with Instructions

**User Journey:**
1. User enters description + budget
2. (Optional) User lists existing items → **Existing Items Parser**
3. System initializes build → **Structure Generator**
4. Step 1: Get options → **Option Generator** (call 1)
5. Step 2: Get options → **Option Generator** (call 2)
6. Step 3: Get options → **Option Generator** (call 3)
7. Step 4: Get options → **Option Generator** (call 4)
8. Step 5: Get options → **Option Generator** (call 5)
9. User views instructions → **Setup Steps Generator**

### Cost Calculation (Without Existing Items)

| Call | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |
|------|-------------|---------------|------------|-------------|-------|
| Structure Generator | 2,100 | 400 | $0.00021 | $0.00016 | $0.00037 |
| Option Generator (Step 1) | 2,000 | 500 | $0.00020 | $0.00020 | $0.00040 |
| Option Generator (Step 2) | 2,050 | 500 | $0.00021 | $0.00020 | $0.00041 |
| Option Generator (Step 3) | 2,100 | 500 | $0.00021 | $0.00020 | $0.00041 |
| Option Generator (Step 4) | 2,150 | 500 | $0.00022 | $0.00020 | $0.00042 |
| Option Generator (Step 5) | 2,200 | 500 | $0.00022 | $0.00020 | $0.00042 |
| Setup Steps Generator | 1,410 | 550 | $0.00014 | $0.00022 | $0.00036 |
| **TOTAL** | **13,960** | **3,450** | **$0.00140** | **$0.00138** | **$0.00278** |

### Cost Calculation (With Existing Items - 3 items)

| Call | Input Tokens | Output Tokens | Input Cost | Output Cost | Total |
|------|-------------|---------------|------------|-------------|-------|
| Existing Items Parser | 1,250 | 350 | $0.00013 | $0.00014 | $0.00027 |
| Structure Generator | 2,250 | 400 | $0.00023 | $0.00016 | $0.00039 |
| Option Generator (×5) | 10,500 | 2,500 | $0.00105 | $0.00100 | $0.00205 |
| Setup Steps Generator | 1,410 | 550 | $0.00014 | $0.00022 | $0.00036 |
| **TOTAL** | **15,410** | **3,800** | **$0.00154** | **$0.00152** | **$0.00306** |

---

## Scenario Analysis

### Cost per Build by Complexity

| Scenario | Components | API Calls | Est. Total Tokens | Est. Cost |
|----------|------------|-----------|-------------------|-----------|
| Simple (3 components) | 3 | 5 | ~11,000 | ~$0.0022 |
| Standard (4 components) | 4 | 6 | ~13,500 | ~$0.0027 |
| **Complex (5 components)** | 5 | 7 | ~17,400 | ~$0.0032 |
| Complex + Existing Items | 5 | 8 | ~19,200 | ~$0.0037 |
| Complex + Refresh (2×) | 5 | 17 | ~32,000 | ~$0.0060 |

### Monthly Cost Projections

| Monthly Builds | Simple | Standard | Complex | With Refreshes |
|----------------|--------|----------|---------|----------------|
| 100 | $0.22 | $0.27 | $0.32 | $0.60 |
| 1,000 | $2.20 | $2.70 | $3.20 | $6.00 |
| 10,000 | $22.00 | $27.00 | $32.00 | $60.00 |
| 100,000 | $220.00 | $270.00 | $320.00 | $600.00 |

### Cost Comparison: Model Alternatives

If BuildMate used different models for a 5-component build:

| Model | Input Cost | Output Cost | Total per Build | vs Current |
|-------|------------|-------------|-----------------|------------|
| **Gemini 2.5 Flash-Lite** | $0.0014 | $0.0014 | **$0.0028** | baseline |
| Gemini 2.0 Flash | $0.0014 | $0.0014 | $0.0028 | same |
| Gemini 2.5 Flash | $0.0042 | $0.0086 | $0.0128 | +4.6× |
| Gemini 2.5 Pro | $0.0175 | $0.0345 | $0.0520 | +18.6× |
| GPT-4o Mini | $0.0021 | $0.0041 | $0.0062 | +2.2× |
| Claude Haiku 3.5 | $0.0011 | $0.0055 | $0.0066 | +2.4× |

---

## Optimization Recommendations

### High Impact Recommendations

#### 1. **Reduce System Prompt Size** (Est. 15-25% cost reduction)

**Current Issue:** System prompts are verbose with extensive examples.

**Current Sizes:**
- Structure Generator: ~1,900 tokens
- Option Generator: ~1,650 tokens
- Existing Items Parser: ~1,100 tokens
- Setup Steps: ~960 tokens

**Recommendation:**
- Remove redundant examples (keep 1-2 per category instead of all)
- Move detailed rules to schema descriptions
- Use bullet points instead of paragraphs
- Consider a "minimal prompt" mode for repeat users

**Example Optimization (Structure Generator):**

```
BEFORE (~1,900 tokens):
- Full category definitions with examples for 9 categories
- Detailed component selection guidelines
- Build naming guidelines with multiple examples

AFTER (~1,200 tokens):
- Category list without examples
- 3 key rules for component selection
- 1 naming example
```

**Estimated Savings:** ~700 input tokens × 7 calls = 4,900 tokens/build → ~$0.0005/build

---

#### 2. **Implement Prompt Caching** (Est. 30-50% cost reduction)

**Current Issue:** System prompts are sent with every request, even though they're identical.

**Recommendation:**
- Use Gemini's context caching feature for system prompts
- Cache common build contexts (e.g., "gaming_pc" category patterns)
- Store and reuse parsed existing items within a session

**Implementation:**
```typescript
// Cache the system prompt for reuse
const cachedContext = await gemini.cacheContent({
  model: 'gemini-2.5-flash-lite',
  contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
  ttlSeconds: 3600 // 1 hour cache
});
```

**Note:** Caching has a minimum billing of 32,768 tokens, so only beneficial for high-volume scenarios.

---

#### 3. **Reduce Option Generator Context Growth** (Est. 5-10% cost reduction)

**Current Issue:** Each subsequent Option Generator call includes all previous selections, causing context to grow.

**Current Pattern:**
- Step 1: 2,000 tokens
- Step 2: 2,050 tokens (+50)
- Step 3: 2,100 tokens (+50)
- Step 4: 2,150 tokens (+50)
- Step 5: 2,200 tokens (+50)

**Recommendation:**
- Only include previous items that affect compatibility (not all items)
- Summarize previous selections instead of full details
- For non-hardware builds, previous context may be unnecessary

**Example:**
```
BEFORE:
Previously Selected Items:
1. CPU: AMD Ryzen 7 7800X3D ($449.99) - 8 cores, 4.2GHz, AM5 socket
2. Motherboard: ASUS ROG Strix B650E-F ($289.99) - AM5, DDR5, PCIe 5.0

AFTER:
Previous: Ryzen 7 7800X3D (AM5), ASUS B650E-F motherboard
```

---

#### 4. **Batch API Calls Where Possible** (Est. 50% cost reduction)

**Current Issue:** API calls are made sequentially.

**Recommendation:**
- Use Gemini's batch API for non-time-sensitive operations
- Batch pricing: 50% off ($0.05/$0.20 per 1M tokens)

**Applicable Scenarios:**
- Build analytics and reporting
- Pre-generating popular build structures
- Background option refresh

---

#### 5. **Implement Response Caching** (Variable savings)

**Current Status:** Options are cached in `build_options_shown` table (partial implementation)

**Recommendation:**
- Cache Structure Generator results for similar descriptions
- Cache Option Generator results for identical component + budget combinations
- Implement semantic similarity matching for cache hits

**Cache Strategy:**
```typescript
// Generate cache key from normalized inputs
const cacheKey = hash({
  componentType: 'Graphics Card',
  budgetRange: '$400-$600', // bucketed
  category: 'gaming_pc',
  previousSocket: 'AM5' // compatibility-relevant only
});
```

---

### Medium Impact Recommendations

#### 6. **Optimize Output Schema** (Est. 5-10% output token reduction)

**Current Issue:** Some output fields may be unnecessary.

**Fields to Review:**
- `productUrl` and `imageUrl` in Option Generator (always empty strings)
- `reasoning` in Structure Generator (useful for debugging, not end-user)
- `unrecognizedText` in Existing Items Parser (rarely used)

**Recommendation:**
- Make optional fields truly optional (don't require empty strings)
- Consider removing `reasoning` in production mode
- Add a "verbose" flag for debugging

---

#### 7. **Consider Gemini 2.0 Flash** (Quality improvement, same cost)

**Current Model:** `gemini-2.5-flash-lite-preview-06-2025`

**Alternative:** `gemini-2.0-flash`

**Comparison:**
| Aspect | 2.5 Flash-Lite | 2.0 Flash |
|--------|----------------|-----------|
| Input Cost | $0.10/1M | $0.10/1M |
| Output Cost | $0.40/1M | $0.40/1M |
| Quality | Good | Better |
| Latency | Lower | Slightly higher |

**Recommendation:** Test 2.0 Flash for quality improvements at same cost, especially for Option Generator where product accuracy matters.

---

#### 8. **Add Token Budget Monitoring** (Operational improvement)

**Current Issue:** No visibility into actual token usage patterns.

**Recommendation:**
- Log token usage from API responses (already captured in `ai_logs`)
- Create dashboard to track:
  - Average tokens per agent type
  - Token usage trends over time
  - Cost per build over time
- Set alerts for unusual token consumption

**Query Example:**
```sql
SELECT 
  agent_type,
  AVG(prompt_tokens) as avg_input,
  AVG(completion_tokens) as avg_output,
  COUNT(*) as call_count,
  SUM(prompt_tokens + completion_tokens) as total_tokens
FROM ai_logs
WHERE created_at > datetime('now', '-7 days')
GROUP BY agent_type;
```

---

### Low Impact / Future Considerations

#### 9. **Dynamic Model Selection**

For simple builds, use cheaper/faster models; for complex builds, use higher quality:

```typescript
const model = buildComplexity === 'simple' 
  ? 'gemini-2.5-flash-lite' 
  : 'gemini-2.0-flash';
```

#### 10. **Progressive Disclosure Prompts**

Start with minimal prompts, add detail only when needed:

```typescript
// First attempt: minimal prompt
const result = await generate(minimalPrompt);

// If validation fails: retry with detailed prompt
if (!result.success) {
  const result2 = await generate(detailedPrompt);
}
```

---

## Summary: Recommended Action Items

| Priority | Recommendation | Est. Savings | Effort |
|----------|----------------|--------------|--------|
| 1 | Reduce system prompt size | 15-25% | Low |
| 2 | Implement response caching | 20-40% | Medium |
| 3 | Use batch API for analytics | 50% (batch ops) | Low |
| 4 | Optimize context growth | 5-10% | Low |
| 5 | Remove unused output fields | 5-10% | Low |
| 6 | Add token monitoring dashboard | Operational | Medium |
| 7 | Test Gemini 2.0 Flash | Quality gain | Low |
| 8 | Implement prompt caching | 30-50% (high vol) | High |

**Total Potential Savings:** 30-50% with recommendations 1-5 implemented

---

## Appendix: Complete Prompts

### A. Existing Items Parser

**File:** `buildmate-api/src/lib/agents/existingItems/prompt.ts`  
**Estimated Token Count:** ~1,100 tokens (system) + ~150 tokens (user)

#### System Prompt

```
You are BuildMate's Existing Items Parser. Your task is to analyze a user's list of existing components and extract structured information about each item.

## Your Role
- Parse free-form text describing items the user already owns
- Identify specific products, brands, and component categories
- Estimate current market prices for each item
- Extract key specifications that matter for compatibility

## Rules
1. Parse each item mentioned separately
2. Handle various input formats (comma-separated, newlines, bullet points, etc.)
3. Be generous in interpretation - match partial names to real products when possible
4. If text is unclear or doesn't describe a product, include it in "unrecognizedText"
5. Provide realistic price estimates based on current market values
6. Focus on key specs that affect compatibility with other components

## Component Categories
Identify items as one of these categories:
- CPU / Processor
- Graphics Card / GPU
- Motherboard
- RAM / Memory
- Storage / SSD / HDD
- Power Supply / PSU
- Case / Chassis
- CPU Cooler
- Monitor / Display
- Keyboard
- Mouse
- Headset / Audio
- Camera / Webcam
- Microphone
- Lighting
- Desk
- Chair
- Other (specify)

## Parsing Guidelines

### Product Identification
- Look for brand names (NVIDIA, AMD, Intel, Corsair, Samsung, etc.)
- Look for model numbers (RTX 4070, Ryzen 7 7800X3D, etc.)
- Look for capacity/specs (16GB, 1TB, 750W, etc.)

### Price Estimation
- Use current market prices (as of 2026)
- For older products, estimate used/refurbished value
- If uncertain, provide a reasonable estimate

### Key Specifications
- For GPUs: VRAM, architecture
- For CPUs: cores, clock speed, socket
- For RAM: capacity, speed, type (DDR4/DDR5)
- For Storage: capacity, type (NVMe/SATA), speed
- For PSU: wattage, efficiency rating
- For Monitors: size, resolution, refresh rate

## Example Input/Output

Input: "I have an RTX 4070, 32GB DDR5 RAM, and a 1TB Samsung 980 Pro"

Output:
{
  "items": [
    {
      "originalText": "RTX 4070",
      "productName": "NVIDIA GeForce RTX 4070",
      "brand": "NVIDIA",
      "category": "Graphics Card",
      "estimatedPrice": 549,
      "keySpec": "12GB GDDR6X, Ada Lovelace"
    },
    {
      "originalText": "32GB DDR5 RAM",
      "productName": "32GB DDR5 Memory Kit",
      "brand": "Generic",
      "category": "RAM",
      "estimatedPrice": 120,
      "keySpec": "32GB DDR5-5600"
    },
    {
      "originalText": "1TB Samsung 980 Pro",
      "productName": "Samsung 980 Pro 1TB",
      "brand": "Samsung",
      "category": "Storage",
      "estimatedPrice": 110,
      "keySpec": "1TB NVMe PCIe 4.0"
    }
  ],
  "unrecognizedText": null
}
```

#### User Prompt Template

```
## User's Existing Items

Please parse the following text and extract information about each item the user already owns:

"${existingItemsText}"

Extract each item with its product name, brand, category, estimated price, and key specification. If any text cannot be parsed as a product, include it in unrecognizedText.
```

#### Output Schema

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "originalText": { "type": "string" },
          "productName": { "type": "string" },
          "brand": { "type": "string" },
          "category": { "type": "string" },
          "estimatedPrice": { "type": "number" },
          "keySpec": { "type": "string" }
        },
        "required": ["originalText", "productName", "brand", "category", "estimatedPrice", "keySpec"]
      }
    },
    "unrecognizedText": {
      "type": ["string", "null"],
      "description": "Any text that could not be parsed as a product"
    }
  },
  "required": ["items"]
}
```

---

### B. Structure Generator

**File:** `buildmate-api/src/lib/agents/structure/prompt.ts`  
**Estimated Token Count:** ~1,900 tokens (system) + ~200 tokens (user)

#### System Prompt

```
You are BuildMate, an expert shopping assistant that helps users build product bundles. Your task is to analyze a user's build description and budget to determine the 3 most critical components they need.

## Your Role
- Analyze the user's description to understand what they want to build
- Identify 3-5 components that are most critical to their build (based on complexity)
- Order components by impact on compatibility (most critical first)
- Allocate budget percentages appropriately
- Consider any existing items the user already owns

## Rules
1. Return between 3 and 5 components based on build complexity
2. EXCLUDE components the user already owns (from existing items list)
3. Only include ESSENTIAL components - no accessories or nice-to-haves
4. Order by compatibility impact: components that other components depend on come first
5. Budget allocations must sum to approximately 100%
6. Component types should be specific but not brand-specific (e.g., "Graphics Card" not "NVIDIA RTX 4080")
7. Descriptions should explain WHY this component matters for this specific build

## Component Count Guidelines
- Simple, focused builds: 3 components
- Standard builds: 4 components
- Complex, multi-system builds: 5 components
- Subtract any component categories covered by existing items

## Build Categories
Detect and return one of these categories:
- gaming_pc: Gaming computer builds
- workstation: Professional/creative workstations (video editing, 3D rendering, etc.)
- home_theater: Audio/video entertainment systems
- smart_home: Home automation setups
- home_office: Work-from-home setups (desk, monitor, etc.)
- photography: Camera and photography equipment
- music_production: Audio recording and production
- streaming: Content creation and streaming setups
- custom: Other builds that don't fit above categories

## Component Selection Guidelines
For each build type, consider:
- What components MUST be compatible with each other?
- What components have the highest impact on overall performance?
- What components are hardest to change later?

### Examples by Category

**gaming_pc:**
1. CPU (determines motherboard socket, cooler compatibility)
2. Graphics Card (determines power supply needs, case size, performance ceiling)
3. Motherboard (must match CPU socket, determines expansion options)

**workstation:**
1. CPU (multi-core performance for rendering/editing)
2. Graphics Card (GPU acceleration for professional software)
3. RAM (high capacity for large projects)

**home_theater:**
1. TV/Display (centerpiece, determines viewing experience)
2. Soundbar/Audio System (audio quality)
3. Streaming Device (content access)

**smart_home:**
1. Smart Hub (compatibility center for all devices)
2. Smart Lights (most visible automation)
3. Smart Thermostat (energy savings and comfort)

**home_office:**
1. Monitor (productivity and eye comfort)
2. Desk (ergonomics foundation)
3. Chair (comfort for long hours)

**photography:**
1. Camera Body (determines lens compatibility, sensor quality)
2. Primary Lens (most-used focal length)
3. Lighting Kit (essential for controlled shots)

**music_production:**
1. Audio Interface (sound quality, connectivity)
2. Studio Monitors (accurate playback)
3. Microphone (recording quality)

**streaming:**
1. Camera/Webcam (video quality)
2. Microphone (audio quality)
3. Lighting (professional appearance)

## Build Naming Guidelines
Generate a memorable 2-4 word name that captures the essence of the build:
- Pattern: [Descriptor] + [Category/Type]
- Make it specific to the user's stated goals, not generic
- Examples:
  - "A gaming PC for 1440p" → "1440p Gaming Rig"
  - "A suitable dress set for a black tie dinner" → "Black Tie Ensemble"
  - "An astrophotography setup" → "Stargazer Kit"
  - "A bike for hiking trails" → "Trail Explorer Build"
  - "A home office for video calls" → "Pro Meeting Station"
- Avoid generic names like "Gaming PC", "Home Setup", or "Custom Build"

## Response Format
Provide your analysis in the structured JSON format specified. Include:
- buildName: A memorable 2-4 word name for this build
- buildCategory: One of the categories listed above
- components: 3-5 components with stepIndex (0, 1, 2, ...), componentType, description, and budgetAllocationPercent
- reasoning: Brief explanation of why these components were chosen and ordered this way
```

#### User Prompt Template

```
## User's Build Request

**Description**: ${description}

**Budget Range**: $${budgetMin} - $${budgetMax}

## Existing Items (User Already Owns)  [ONLY IF existingItems PROVIDED]

The user already has the following items. Do NOT recommend components in these categories - they are already covered:

- **${item.productName}** (${item.brand}) - ${item.category}
  - Estimated Value: $${item.estimatedPrice}
  - Key Spec: ${item.keySpec}

**Important**: Since the user already owns items in these categories, EXCLUDE these component types from your recommendations. Focus on the remaining components they need to complete their build.

Please analyze this request and determine the 3-5 most critical components for this build (excluding any categories covered by existing items). Order them by compatibility impact (most critical first) and allocate budget percentages appropriately.
```

#### Output Schema

```json
{
  "type": "object",
  "properties": {
    "buildName": {
      "type": "string",
      "description": "A memorable 2-4 word name that captures the essence of the build"
    },
    "buildCategory": {
      "type": "string",
      "description": "The detected category of the build"
    },
    "components": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "stepIndex": { "type": "integer" },
          "componentType": { "type": "string" },
          "description": { "type": "string" },
          "budgetAllocationPercent": { "type": "number" }
        },
        "required": ["stepIndex", "componentType", "description"]
      },
      "minItems": 3,
      "maxItems": 5
    },
    "reasoning": {
      "type": "string",
      "description": "Brief explanation of why these components were chosen"
    }
  },
  "required": ["buildName", "buildCategory", "components", "reasoning"]
}
```

---

### C. Option Generator

**File:** `buildmate-api/src/lib/agents/options/prompt.ts`  
**Estimated Token Count:** ~1,650 tokens (system) + ~350 tokens (user)

#### System Prompt

```
You are BuildMate, an expert shopping assistant that helps users build product bundles. Your task is to recommend exactly 3 product options for a specific component, differentiated by FUNCTIONALITY and USE CASE, not by price.

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
- productUrl: Leave empty string (will be populated later)
- keySpec: Single most important specification
- compatibilityNote: How this works with other selected items
- bestFor: 2-4 word descriptor of ideal use case (e.g., "Competitive Gaming", "Content Creation")
- differentiationText: A ~10-word COMPARATIVE statement explaining why THIS option stands out vs the other two options. Focus on the unique advantage. Examples:
  - "Highest refresh rate delivers competitive edge over other options"
  - "Best color accuracy makes it ideal for professional work"
  - "Most comfortable design for marathon gaming sessions"
  - "Superior low-light performance compared to alternatives"

## Functionality Examples by Component Type

**Graphics Cards:**
- Option 1: "Competitive Gaming" - Optimized for high FPS
- Option 2: "Content Creation" - Better encoding, CUDA cores
- Option 3: "Ray Tracing Quality" - Best visual effects

**CPUs:**
- Option 1: "Gaming Performance" - Best single-thread
- Option 2: "Streaming/Multitasking" - More cores
- Option 3: "Productivity Work" - Balanced performance

**Monitors:**
- Option 1: "Competitive Gaming" - High refresh rate
- Option 2: "Content Creation" - Color accuracy
- Option 3: "Immersive Experience" - Ultrawide/curved

**Headphones:**
- Option 1: "Competitive Gaming" - Precise imaging
- Option 2: "Music Enjoyment" - Rich bass
- Option 3: "Long Sessions" - Maximum comfort

**Cameras:**
- Option 1: "Video Focus" - Better video features
- Option 2: "Low Light" - Better sensor performance
- Option 3: "Sports/Action" - Fast autofocus

**Smart Home Hubs:**
- Option 1: "Voice Control" - Best voice assistant
- Option 2: "Privacy Focused" - Local processing
- Option 3: "Wide Compatibility" - Most protocols

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
Provide exactly 3 product options in the structured JSON format specified. Each must have a unique "bestFor" value.
```

#### User Prompt Template

```
## Build Context

**Build Category**: ${context.buildCategory}
**Original Description**: ${context.description}

**Budget Information**:
- Original Budget: $${context.budgetMin} - $${context.budgetMax}
- Amount Spent: $${context.amountSpent}
- Remaining Budget: $${context.remainingBudget}

**Previously Selected Items**:
  1. ${item.componentType}: ${item.brand} ${item.productName} ($${item.price})
  [... or "None selected yet"]

## Current Component Request

**Step ${context.stepIndex + 1} of ${context.totalSteps}**
**Component Type**: ${context.componentType}
**Component Description**: ${context.componentDescription}
**Suggested Budget Allocation**: ${context.budgetAllocationPercent}% of total (~$${context.suggestedAllocation})

Please recommend exactly 3 product options for "${context.componentType}" - one budget, one midrange, and one premium option. All options must be within the remaining budget of $${context.remainingBudget}.
```

**Note:** There's an inconsistency in the user prompt - it says "one budget, one midrange, and one premium option" but the system prompt says to differentiate by functionality, not price tier. This should be fixed.

#### Output Schema

```json
{
  "type": "object",
  "properties": {
    "options": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "productName": { "type": "string" },
          "brand": { "type": "string" },
          "price": { "type": "number" },
          "productUrl": { "type": "string" },
          "imageUrl": { "type": "string" },
          "keySpec": { "type": "string" },
          "compatibilityNote": { "type": "string" },
          "bestFor": {
            "type": "string",
            "description": "The primary use case or functionality focus"
          },
          "differentiationText": {
            "type": "string",
            "description": "A ~10-word comparative statement explaining why THIS option stands out"
          }
        },
        "required": ["productName", "brand", "price", "keySpec", "compatibilityNote", "bestFor", "differentiationText"]
      },
      "minItems": 3,
      "maxItems": 3
    }
  },
  "required": ["options"]
}
```

---

### D. Setup Steps Generator

**File:** `buildmate-api/src/lib/agents/setupSteps/prompt.ts`  
**Estimated Token Count:** ~960 tokens (system) + ~450 tokens (user)

#### System Prompt

```
You are BuildMate, an expert at creating simple, easy-to-follow setup guides. Your task is to generate 3-5 functional setup steps for a completed product build.

## Key Principle
Group components by FUNCTION, not individually. Each step should accomplish a tangible goal by combining related components.

## Rules
1. Return 3-5 steps maximum (not more)
2. Each step should involve 1-3 components working together
3. Keep step titles short: 3-6 words using action verbs (Connect, Install, Configure, Test)
4. Keep descriptions brief: 40-60 words max per step
5. Total word count must stay under 500 words
6. Use simple, beginner-friendly language
7. Order steps logically (foundational steps first, testing last)
8. Include a helpful tip only when genuinely useful

## Step Grouping Examples

**Gaming PC Build:**
- "Install Core Processing Unit" → CPU + Motherboard + RAM (foundation)
- "Set Up Graphics System" → GPU + power cables + display connection
- "Configure Storage and Boot" → SSD + OS installation

**Home Theater:**
- "Position Display and Audio" → TV mounting + soundbar placement
- "Connect Entertainment Sources" → streaming device + cables + power
- "Configure and Test System" → settings + calibration

**Smart Home:**
- "Set Up Central Hub" → hub placement + power + network connection
- "Install Smart Lighting" → bulbs + switches + app pairing
- "Add Climate Control" → thermostat + sensors + schedule setup

## Writing Style
- Use active voice: "Connect the cables" not "The cables should be connected"
- Be specific but concise: "Secure the GPU in the top PCIe slot" not "Install the graphics card"
- Assume basic competence: no need to explain what a cable is
- Tips should prevent common mistakes, not state the obvious

## Response Format
Provide your setup steps in the structured JSON format specified. Include:
- steps: Array of 3-5 step objects
  - stepNumber: Sequential number starting at 1
  - title: Short action title (3-6 words)
  - description: Brief instructions (40-60 words)
  - componentsInvolved: Array of component type names used in this step
  - tip: Optional helpful hint (omit if not genuinely useful)
```

#### User Prompt Template

```
## Completed Build

**Build Name**: ${buildName}
**Category**: ${buildCategory}
**Description**: ${description}

## Selected Components

- **${item.componentType}**: ${item.brand} ${item.productName} ($${item.price}) - ${item.keySpec}
[... for each item]

Generate 3-5 functional setup steps that group these components logically. Focus on completing functions, not installing components one-by-one. Keep the total word count under 500 words.
```

#### Output Schema

```json
{
  "type": "object",
  "properties": {
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "stepNumber": {
            "type": "integer",
            "description": "Step number starting from 1"
          },
          "title": {
            "type": "string",
            "description": "Short action title (3-6 words)"
          },
          "description": {
            "type": "string",
            "description": "Brief instructions (40-60 words)"
          },
          "componentsInvolved": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of component types used in this step"
          },
          "tip": {
            "type": "string",
            "description": "Optional quick tip for this step"
          }
        },
        "required": ["stepNumber", "title", "description", "componentsInvolved"]
      },
      "minItems": 3,
      "maxItems": 5
    }
  },
  "required": ["steps"]
}
```

---

## Prompt Issues Identified

### Issue 1: Option Generator User Prompt Contradiction

**Location:** `buildmate-api/src/lib/agents/options/prompt.ts` line 95

**Problem:** The user prompt says:
> "Please recommend exactly 3 product options for "${context.componentType}" - **one budget, one midrange, and one premium option**."

But the system prompt explicitly states:
> "DO NOT organize by price tier (budget/mid/premium). INSTEAD, organize by FUNCTIONALITY or DESIGN STYLE."

**Recommendation:** Update the user prompt to:
> "Please recommend exactly 3 product options for "${context.componentType}" - each optimized for a different use case or functionality."

### Issue 2: Unused Output Fields

**Location:** Option Generator output schema

**Problem:** `productUrl` and `imageUrl` are required fields that are always empty strings.

**Recommendation:** Make these optional or remove them to reduce output tokens.

### Issue 3: Verbose Category Examples

**Location:** Structure Generator system prompt

**Problem:** All 8 category examples take ~800 tokens but may not improve output quality significantly.

**Recommendation:** Test with 2-3 examples to see if quality degrades.

---

## Sources

- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 2.5 Flash-Lite Announcement](https://developers.googleblog.com/en/gemini-25-flash-lite-is-now-stable-and-generally-available/)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)

---

**Document Author:** AI Cost Analysis Tool  
**Last Updated:** January 2026
