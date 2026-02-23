# Domain Skills System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a modular domain-skills layer so agents dynamically load domain expertise based on AI-powered classification of build descriptions.

**Architecture:** File-system skill registry with `.md` skill files parsed at startup. A new Skill Detector agent classifies builds during creation. Each agent's prompt gets relevant skill sections injected as additive `## Domain Expertise` content.

**Tech Stack:** TypeScript, Hono, Gemini API (structured outputs), PostgreSQL, Node.js

**Design doc:** `docs/plans/2026-02-22-domain-skills-design.md`

---

### Task 1: Database Migration — Add skill columns to builds table

**Files:**
- Create: `migrations/0008_add_skill_columns.sql`

**Step 1: Write the migration file**

```sql
-- Add skill detection columns to builds table
ALTER TABLE builds ADD COLUMN skill_id TEXT;
ALTER TABLE builds ADD COLUMN skill_confidence INTEGER;
```

**Step 2: Run the migration**

Run: `psql $DATABASE_URL -f migrations/0008_add_skill_columns.sql`
Expected: `ALTER TABLE` twice, no errors

**Step 3: Verify columns exist**

Run: `psql $DATABASE_URL -c "\d builds" | grep skill`
Expected: Shows `skill_id` and `skill_confidence` columns

**Step 4: Commit**

```bash
git add migrations/0008_add_skill_columns.sql
git commit -m "feat(db): add skill_id and skill_confidence columns to builds table"
```

---

### Task 2: Skill Types

**Files:**
- Create: `src/server/lib/skills/types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Domain Skills Type Definitions
 *
 * Types for the skill registry, parser, detector, and loader.
 */

/**
 * Metadata extracted from a skill file's YAML frontmatter
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

/**
 * A single section from a skill file (e.g., "## Component Taxonomy")
 */
export interface SkillSection {
  heading: string;
  content: string;
}

/**
 * A fully parsed domain skill
 */
export interface Skill {
  metadata: SkillMetadata;
  sections: SkillSection[];
  raw: string;
}

/**
 * Agent types that can receive skill injection
 */
export type SkillAgentType = 'structure' | 'options' | 'setupSteps' | 'existingItems';

/**
 * Maps each agent to the skill sections it should receive
 */
export const AGENT_SECTION_MAP: Record<SkillAgentType, string[]> = {
  structure:     ['Component Taxonomy', 'Compatibility Rules', 'Budget Allocation Templates'],
  options:       ['Component Taxonomy', 'Compatibility Rules', 'Recommended Stores'],
  setupSteps:    ['Assembly Guide'],
  existingItems: ['Component Taxonomy', 'Compatibility Rules'],
};

/**
 * Result from the skill detector agent
 */
export interface SkillDetectionMatch {
  skillId: string;
  confidence: number;
}

export interface SkillDetectionResult {
  matches: SkillDetectionMatch[];
}

/**
 * Minimum confidence threshold to use a skill (0-100)
 */
export const SKILL_CONFIDENCE_THRESHOLD = 60;
```

**Step 2: Commit**

```bash
git add src/server/lib/skills/types.ts
git commit -m "feat(skills): add domain skills type definitions"
```

---

### Task 3: Skill Parser — Extract frontmatter and sections from .md files

**Files:**
- Create: `src/server/lib/skills/parser.ts`

**Step 1: Write the parser**

```typescript
/**
 * Skill File Parser
 *
 * Extracts YAML frontmatter and markdown sections from .md skill files.
 * No external YAML library needed — frontmatter is simple key-value pairs.
 */

import type { SkillMetadata, SkillSection, Skill } from './types';

/**
 * Parse YAML frontmatter from a skill file.
 * Handles simple key: value pairs and arrays in [bracket] format.
 */
function parseFrontmatter(raw: string): { metadata: SkillMetadata; body: string } | null {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;

  const yamlBlock = match[1];
  const body = match[2];

  const metadata: Record<string, unknown> = {};

  for (const line of yamlBlock.split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    let value: unknown = kvMatch[2].trim();

    // Parse array syntax: [item1, item2, item3]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map(s => s.trim());
    }

    metadata[key] = value;
  }

  // Validate required fields
  if (!metadata.id || !metadata.name || !metadata.description) {
    return null;
  }

  return {
    metadata: {
      id: metadata.id as string,
      name: metadata.name as string,
      description: metadata.description as string,
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
    },
    body,
  };
}

/**
 * Parse markdown body into sections split by ## headings.
 */
function parseSections(body: string): SkillSection[] {
  const sections: SkillSection[] = [];
  const parts = body.split(/^## /m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const newlineIndex = trimmed.indexOf('\n');
    if (newlineIndex === -1) continue;

    const heading = trimmed.slice(0, newlineIndex).trim();
    const content = trimmed.slice(newlineIndex + 1).trim();

    if (heading && content) {
      sections.push({ heading, content });
    }
  }

  return sections;
}

/**
 * Parse a complete skill file (frontmatter + sections).
 * Returns null if the file is invalid.
 */
export function parseSkillFile(raw: string): Skill | null {
  const parsed = parseFrontmatter(raw);
  if (!parsed) return null;

  const sections = parseSections(parsed.body);

  return {
    metadata: parsed.metadata,
    sections,
    raw,
  };
}
```

**Step 2: Commit**

```bash
git add src/server/lib/skills/parser.ts
git commit -m "feat(skills): add markdown skill file parser"
```

---

### Task 4: Skill Registry — Discover and index skills at startup

**Files:**
- Create: `src/server/lib/skills/registry.ts`

**Step 1: Write the registry**

```typescript
/**
 * Skill Registry
 *
 * Scans the domains/ directory at startup, parses each .md file,
 * and builds an in-memory index of available skills.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseSkillFile } from './parser';
import type { Skill, SkillMetadata } from './types';

/** In-memory skill index */
const skills = new Map<string, Skill>();

/** Track initialization state */
let initialized = false;

/**
 * Initialize the registry by scanning the domains/ directory.
 * Safe to call multiple times — only scans once.
 */
export function initializeRegistry(domainsDir?: string): void {
  if (initialized) return;

  const dir = domainsDir ?? join(__dirname, 'domains');

  let files: string[];
  try {
    files = readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  } catch (err) {
    console.warn(`[skills] Could not read domains directory: ${dir}`, err);
    initialized = true;
    return;
  }

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf-8');
      const skill = parseSkillFile(raw);

      if (skill) {
        skills.set(skill.metadata.id, skill);
        console.log(`[skills] Loaded skill: ${skill.metadata.id} (${skill.sections.length} sections)`);
      } else {
        console.warn(`[skills] Failed to parse skill file: ${file}`);
      }
    } catch (err) {
      console.warn(`[skills] Error reading skill file ${file}:`, err);
    }
  }

  console.log(`[skills] Registry initialized with ${skills.size} skill(s)`);
  initialized = true;
}

/**
 * Get a skill by ID. Returns undefined if not found.
 */
export function getSkill(id: string): Skill | undefined {
  return skills.get(id);
}

/**
 * Get metadata for all registered skills.
 * Used by the detector agent to know what skills are available.
 */
export function getAllSkillMetadata(): SkillMetadata[] {
  return Array.from(skills.values()).map(s => s.metadata);
}

/**
 * Check if any skills are registered.
 */
export function hasSkills(): boolean {
  return skills.size > 0;
}

/**
 * Reset registry (for testing).
 */
export function resetRegistry(): void {
  skills.clear();
  initialized = false;
}
```

**Step 2: Commit**

```bash
git add src/server/lib/skills/registry.ts
git commit -m "feat(skills): add file-system skill registry"
```

---

### Task 5: Skill Loader — Get relevant sections for an agent

**Files:**
- Create: `src/server/lib/skills/loader.ts`

**Step 1: Write the loader**

```typescript
/**
 * Skill Loader
 *
 * Loads specific skill sections for a given agent type.
 * This is the primary interface agents use to get domain expertise.
 */

import { getSkill } from './registry';
import { AGENT_SECTION_MAP, type SkillAgentType } from './types';

/**
 * Get concatenated skill sections relevant to a specific agent.
 * Returns undefined if the skill doesn't exist or has no relevant sections.
 *
 * @param skillId - The skill ID (e.g., "pc-building")
 * @param agentType - Which agent is requesting content
 * @returns Markdown string of relevant sections, or undefined
 */
export function getSkillSectionsForAgent(
  skillId: string,
  agentType: SkillAgentType,
): string | undefined {
  const skill = getSkill(skillId);
  if (!skill) {
    console.warn(`[skills] Skill not found: ${skillId}`);
    return undefined;
  }

  const neededSections = AGENT_SECTION_MAP[agentType];
  if (!neededSections) return undefined;

  const matched = skill.sections
    .filter(s => neededSections.includes(s.heading))
    .map(s => `### ${s.heading}\n\n${s.content}`)
    .join('\n\n');

  return matched || undefined;
}
```

**Step 2: Commit**

```bash
git add src/server/lib/skills/loader.ts
git commit -m "feat(skills): add skill section loader for agents"
```

---

### Task 6: Skill Detector Agent — AI-powered build classifier

**Files:**
- Create: `src/server/lib/skills/detector.ts`

This follows the same pattern as all other agents (GeminiClient, structured output, async logging).

**Step 1: Write the detector**

```typescript
/**
 * Skill Detector Agent
 *
 * AI-powered classifier that determines which domain skill best matches
 * a user's build description. Returns confidence scores for each skill.
 */

import { GeminiClient, createAILogEntry, saveAILog } from '../gemini';
import { getAllSkillMetadata, hasSkills } from './registry';
import { SKILL_CONFIDENCE_THRESHOLD, type SkillDetectionResult } from './types';

/**
 * JSON schema for the detector's structured output
 */
const skillDetectorSchema = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          skillId: { type: 'string' },
          confidence: { type: 'integer' },
        },
        required: ['skillId', 'confidence'],
      },
    },
  },
  required: ['matches'],
};

const SKILL_DETECTOR_SYSTEM_PROMPT = `You are a build category classifier. Given a user's build description, determine which domain skill best matches their request.

## Rules
- Return a confidence percentage (0-100) for EACH available skill AND for "general"
- Percentages must sum to 100
- Consider the keywords but also the overall intent of the description
- "general" means no specific domain skill applies
- Sort results by confidence descending`;

/**
 * Build the user prompt listing available skills and the user's description
 */
function buildDetectorPrompt(description: string): string {
  const skills = getAllSkillMetadata();

  let prompt = '## Available Domain Skills\n\n';
  for (const skill of skills) {
    prompt += `- **${skill.id}**: ${skill.description} (keywords: ${skill.keywords.join(', ')})\n`;
  }
  prompt += '- **general**: No specific domain match\n';

  prompt += `\n## User's Build Description\n\n"${description}"\n\n`;
  prompt += 'Return confidence percentages for each skill ID (including "general"). Percentages must sum to 100.';

  return prompt;
}

/**
 * Detect which skill matches a build description.
 * Returns { skillId, confidence } or null if no skills registered or detection fails.
 */
export async function detectSkill(
  description: string,
  buildId: string,
  apiKey: string,
  model: string,
  db: D1Database,
  baseUrl?: string,
): Promise<{ skillId: string | null; confidence: number }> {
  // Skip detection if no skills are registered
  if (!hasSkills()) {
    return { skillId: null, confidence: 0 };
  }

  const client = new GeminiClient({ apiKey, model, baseUrl });
  const userPrompt = buildDetectorPrompt(description);
  const fullPrompt = `${SKILL_DETECTOR_SYSTEM_PROMPT}\n\n${userPrompt}`;

  const response = await client.call({
    systemPrompt: SKILL_DETECTOR_SYSTEM_PROMPT,
    userPrompt,
    outputSchema: skillDetectorSchema,
    temperature: 0.3,
    maxTokens: 256,
  });

  // Log async
  Promise.resolve().then(async () => {
    const logEntry = createAILogEntry(buildId, 'skill_detector', fullPrompt, response);
    await saveAILog(db, logEntry);
  }).catch(err => console.error('Failed to save AI log (skill_detector):', err));

  if (!response.success || !response.data) {
    console.error('[skills] Detector failed:', response.error);
    return { skillId: null, confidence: 0 };
  }

  const result = response.data as SkillDetectionResult;
  if (!Array.isArray(result.matches) || result.matches.length === 0) {
    return { skillId: null, confidence: 0 };
  }

  // Sort by confidence descending
  const sorted = [...result.matches].sort((a, b) => b.confidence - a.confidence);
  const top = sorted[0];

  // If top match is "general" or below threshold, return null
  if (top.skillId === 'general' || top.confidence < SKILL_CONFIDENCE_THRESHOLD) {
    return { skillId: null, confidence: top.confidence };
  }

  return { skillId: top.skillId, confidence: top.confidence };
}
```

**Step 2: Add "skill_detector" to the AgentType union**

Modify: `src/server/lib/gemini/types.ts:70-75`

Change:
```typescript
export type AgentType =
  | "structure"
  | "option"
  | "instruction"
  | "existing_items"
  | "setup_steps";
```

To:
```typescript
export type AgentType =
  | "structure"
  | "option"
  | "instruction"
  | "existing_items"
  | "setup_steps"
  | "skill_detector";
```

**Step 3: Commit**

```bash
git add src/server/lib/skills/detector.ts src/server/lib/gemini/types.ts
git commit -m "feat(skills): add AI-powered skill detector agent"
```

---

### Task 7: Skills Module Index — Wire up exports

**Files:**
- Create: `src/server/lib/skills/index.ts`

**Step 1: Write the index**

```typescript
/**
 * Domain Skills Module
 *
 * Exports all skill-related functionality.
 */

export * from './types';
export { parseSkillFile } from './parser';
export { initializeRegistry, getSkill, getAllSkillMetadata, hasSkills, resetRegistry } from './registry';
export { getSkillSectionsForAgent } from './loader';
export { detectSkill } from './detector';
```

**Step 2: Commit**

```bash
git add src/server/lib/skills/index.ts
git commit -m "feat(skills): add skills module index"
```

---

### Task 8: First Domain Skill — pc-building.md

**Files:**
- Create: `src/server/lib/skills/domains/_template.md`
- Create: `src/server/lib/skills/domains/pc-building.md`

**Step 1: Create the template file**

Write `_template.md` as a reference for authoring new skills:

```markdown
---
id: template-id
name: Template Name
description: A brief description of what this skill covers
keywords: [keyword1, keyword2, keyword3]
---

## Component Taxonomy
<!-- List all components in this domain, organized hierarchically -->
<!-- For each component: name, role, key specs to evaluate, major brands -->

## Compatibility Rules
<!-- Hard rules that MUST be checked when recommending components -->
<!-- Format: IF [condition] THEN [constraint] -->

## Budget Allocation Templates
<!-- Named budget patterns for common sub-categories of this domain -->
<!-- Format: ### Sub-category Name -->
<!-- List components with percentage ranges -->

## Recommended Stores
<!-- Trusted retailers with what they're best for -->
<!-- Include both online and in-store options when applicable -->

## Assembly Guide
<!-- Functional groups of components and assembly order -->
<!-- Safety warnings, tool requirements, common mistakes -->
<!-- Written as a template the SetupSteps agent can adapt to specific builds -->
```

**Step 2: Create the PC Building skill file**

Write `pc-building.md` — a comprehensive reference (~500 lines). This is the core domain knowledge file. Here's the full content:

```markdown
---
id: pc-building
name: PC Building
description: Custom desktop computer builds including gaming, workstation, and general-purpose PCs
keywords: [computer, PC, desktop, gaming rig, workstation, GPU, CPU, motherboard, RAM, SSD, power supply, case, gaming PC, build a PC]
---

## Component Taxonomy

### CPU (Processor)
The CPU is the compatibility hub of any PC build. It determines motherboard socket, memory support, and cooling requirements.

**Key specs to evaluate:**
- Core count and thread count (affects multitasking and workstation workloads)
- Clock speed (base and boost, measured in GHz)
- Socket type (must match motherboard — LGA 1700, LGA 1851, AM5)
- TDP (thermal design power — determines cooling needs)
- Integrated graphics (some CPUs have iGPU, some don't — matters if no discrete GPU)

**Current platforms (2025-2026):**
- **Intel:** Core Ultra 200S series (Arrow Lake, LGA 1851) — latest. 14th Gen (Raptor Lake Refresh, LGA 1700) — previous gen, still widely available
- **AMD:** Ryzen 9000 series (Zen 5, AM5) — latest. Ryzen 7000 series (Zen 4, AM5) — excellent value

**Brand landscape:**
- Intel: Best for single-threaded gaming, widely compatible
- AMD: Best multi-threaded value, strong gaming, more power efficient

**Tiers by use case:**
- Budget gaming: AMD Ryzen 5 7600 / Intel Core i5-14400F
- Mid gaming: AMD Ryzen 7 7800X3D / Intel Core Ultra 7 265K
- High-end gaming: AMD Ryzen 7 9800X3D / Intel Core Ultra 9 285K
- Workstation: AMD Ryzen 9 9950X / Intel Core Ultra 9 285K
- Content creation: AMD Ryzen 9 9900X / Intel Core Ultra 7 265K

### GPU (Graphics Card)
The GPU is typically the most expensive component and has the largest impact on gaming and creative workload performance.

**Key specs to evaluate:**
- VRAM (video memory — 8GB minimum for 1080p, 12GB+ for 1440p, 16GB+ for 4K)
- Architecture generation (affects ray tracing, DLSS/FSR support)
- TDP / power draw (determines PSU requirements)
- Physical size (length and slot width — must fit the case)
- Display outputs (HDMI 2.1, DisplayPort 2.1)

**Current generation (2024-2026):**
- **NVIDIA:** RTX 5090, 5080, 5070 Ti, 5070 (Blackwell) — latest. RTX 4090, 4080 Super, 4070 Ti Super, 4070 Super, 4060 Ti, 4060 (Ada Lovelace) — previous gen
- **AMD:** RX 9070 XT, RX 9070 (RDNA 4) — latest. RX 7900 XTX, 7900 XT, 7800 XT, 7700 XT, 7600 (RDNA 3) — previous gen
- **Intel:** Arc B580 (Battlemage) — budget option

**Tiers by resolution:**
- 1080p gaming: RTX 4060 / RX 7600 / Arc B580 ($200-300)
- 1440p gaming: RTX 5070 / RTX 4070 Super / RX 9070 ($400-600)
- 4K gaming: RTX 5080 / RTX 4080 Super / RX 9070 XT ($600-1000)
- Enthusiast 4K: RTX 5090 / RTX 4090 ($1500-2000)

### Motherboard
The motherboard connects everything. It must match the CPU socket and RAM generation.

**Key specs to evaluate:**
- CPU socket (LGA 1700, LGA 1851, AM5 — MUST match CPU)
- Chipset (determines features like PCIe lanes, USB ports, overclocking support)
- Form factor (ATX, Micro-ATX, Mini-ITX — must fit case)
- RAM slots and max capacity (DDR4 or DDR5, number of slots)
- M.2 SSD slots (number and PCIe generation)
- Rear I/O (USB-C, USB-A count, audio, networking)

**Chipset tiers:**
- Intel LGA 1851: Z890 (OC, full features), B860 (mid-range), H810 (budget)
- Intel LGA 1700: Z790 (OC), B760 (mid-range), H770 (budget)
- AMD AM5: X870E/X870 (enthusiast), B850/B650 (mid-range), A620 (budget)

**Form factors:**
- ATX (305 × 244 mm): Most common, most expansion slots
- Micro-ATX (244 × 244 mm): Smaller, fewer expansion slots, fits smaller cases
- Mini-ITX (170 × 170 mm): Smallest, 1 PCIe slot, for compact builds

### RAM (Memory)
RAM must match the motherboard's supported generation and speeds.

**Key specs to evaluate:**
- Generation (DDR4 or DDR5 — must match motherboard)
- Capacity (16GB minimum, 32GB recommended, 64GB+ for workstation)
- Speed (measured in MT/s — higher is better, must be supported by motherboard)
- Latency (CAS latency — lower is better, CL30-36 for DDR5)
- Kit configuration (2x16GB preferred over 1x32GB for dual-channel)

**Current recommendations:**
- Budget: 16GB (2x8GB) DDR5-5600 (~$50-60)
- Standard: 32GB (2x16GB) DDR5-6000 (~$80-110)
- Workstation: 64GB (2x32GB) DDR5-6000 (~$160-220)
- Extreme: 128GB (4x32GB) DDR5-5600 (~$350+)

### Storage (SSD/HDD)
NVMe SSDs are standard for boot drives. SATA SSDs and HDDs for bulk storage.

**Key specs to evaluate:**
- Interface (NVMe PCIe 5.0/4.0/3.0 or SATA — NVMe strongly preferred)
- Capacity (1TB minimum for boot + games, 2TB recommended)
- Sequential read/write speeds
- TBW (terabytes written — endurance rating)
- Form factor (M.2 2280 for NVMe, 2.5" for SATA SSD)

**Tiers:**
- Budget boot: 1TB NVMe PCIe 4.0 ($60-80) — WD SN770, Kingston NV2
- Standard: 2TB NVMe PCIe 4.0 ($100-140) — Samsung 990 EVO, WD SN850X
- High-end: 2TB NVMe PCIe 5.0 ($150-200) — Samsung 990 Pro, Crucial T700
- Bulk storage: 2-4TB SATA HDD ($50-80) — Seagate Barracuda, WD Blue

### Power Supply (PSU)
Must provide enough wattage for all components with headroom. Quality matters for system stability.

**Key specs to evaluate:**
- Wattage (must exceed total system draw with 20%+ headroom)
- Efficiency rating (80 Plus Bronze/Gold/Platinum — Gold recommended)
- Modularity (fully modular preferred for cable management)
- Form factor (ATX, SFX for small builds)
- 12VHPWR connector (needed for RTX 4000/5000 series GPUs)

**Wattage guidelines:**
- Budget build (no discrete GPU): 450-550W
- Mid-range gaming (RTX 4060-4070): 650W
- High-end gaming (RTX 4080/5070): 750-850W
- Enthusiast (RTX 4090/5080/5090): 850-1000W

**Trusted brands:** Corsair, Seasonic, EVGA, be quiet!, Thermaltake

### Case (Chassis)
Must fit the motherboard form factor and GPU length.

**Key specs to evaluate:**
- Form factor support (ATX, Micro-ATX, Mini-ITX)
- Maximum GPU length (check clearance — modern GPUs can be 300-350mm)
- CPU cooler height clearance
- Airflow design (mesh front panels preferred)
- Fan/radiator support (for AIO liquid coolers)

**Tiers:**
- Budget ($50-80): NZXT H5, Corsair 3000D, Fractal Pop Air
- Mid-range ($80-130): Fractal North, Lian Li Lancool III, be quiet! Pure Base 500DX
- Premium ($130-200): Corsair 5000D, Lian Li O11 Dynamic EVO, Fractal Torrent

### CPU Cooler
Must match CPU socket and fit within case clearance.

**Key specs to evaluate:**
- Type (air tower, AIO liquid 240mm/280mm/360mm)
- Socket compatibility (must support CPU socket)
- TDP rating (must handle CPU's thermal output)
- Height (for air coolers — must fit case clearance)
- Radiator size (for AIO — case must have mounting space)

**Guidelines:**
- Budget/mid CPUs (65-105W TDP): Quality air cooler ($30-50)
- High-end CPUs (125-170W TDP): Large air cooler or 240-280mm AIO ($50-100)
- Enthusiast/overclocked CPUs (200W+ TDP): 360mm AIO ($100-180)

## Compatibility Rules

### Critical (Will Not Work If Violated)
- IF CPU is Intel LGA 1851 THEN motherboard MUST have LGA 1851 socket (Z890, B860, H810 chipset)
- IF CPU is Intel LGA 1700 THEN motherboard MUST have LGA 1700 socket (Z790, B760, H770 chipset)
- IF CPU is AMD AM5 THEN motherboard MUST have AM5 socket (X870, B850, B650, A620 chipset)
- IF motherboard supports DDR5 THEN RAM MUST be DDR5 (DDR4 and DDR5 are NOT interchangeable)
- IF motherboard supports DDR4 THEN RAM MUST be DDR4
- IF case is Mini-ITX THEN motherboard MUST be Mini-ITX
- IF case is Micro-ATX THEN motherboard MUST be Micro-ATX or Mini-ITX

### Important (Will Cause Issues)
- PSU wattage MUST be >= (CPU TDP + GPU TDP + 100W overhead) — recommend 20% additional headroom
- GPU physical length MUST be less than case maximum GPU clearance
- CPU cooler height MUST be less than case maximum cooler clearance
- IF GPU requires 12VHPWR connector THEN PSU should have native 12VHPWR (adapter is acceptable but not ideal)
- IF using NVMe SSD THEN motherboard must have available M.2 slot with matching PCIe generation

### Recommended (For Best Experience)
- RAM speed should match motherboard's sweet spot (e.g., DDR5-6000 for AMD AM5 with 1:1 FCLK)
- Use dual-channel RAM configuration (2 sticks preferred over 1)
- PSU should be 80 Plus Gold or better for efficiency and reliability
- Case should have mesh front panel for airflow
- At least one case fan as exhaust at rear

## Budget Allocation Templates

### Gaming (GPU-Heavy)
The GPU has the largest impact on gaming performance. Prioritize it.
- GPU: 35-40%
- CPU: 18-22%
- Motherboard: 10-13%
- RAM: 5-8%
- Storage: 6-9%
- PSU: 6-8%
- Case: 5-8%
- CPU Cooler: 3-5%

### Workstation / Content Creation (CPU-Heavy)
CPU and RAM matter most for rendering, compilation, and large datasets.
- CPU: 28-35%
- GPU: 20-25%
- RAM: 12-15%
- Motherboard: 10-13%
- Storage: 8-10%
- PSU: 6-8%
- Case: 5-7%
- CPU Cooler: 4-6%

### Balanced / General Purpose
Even distribution for mixed use (gaming + work + media).
- GPU: 28-32%
- CPU: 22-26%
- Motherboard: 10-12%
- RAM: 7-10%
- Storage: 8-10%
- PSU: 6-8%
- Case: 6-8%
- CPU Cooler: 3-5%

### Budget Build (Under $800)
Maximize value at every tier. Consider integrated graphics to skip GPU.
- GPU: 30-35% (or skip if using CPU with iGPU)
- CPU: 22-28%
- Motherboard: 12-15%
- RAM: 8-10%
- Storage: 8-10%
- PSU: 8-10%
- Case: 5-8%

## Recommended Stores

### Online Retailers
- **Amazon** — Widest selection, fast shipping, easy returns. Good for comparing prices. Watch for third-party seller inflated prices.
- **Newegg** — PC component specialist. Combo deals, detailed filtering by spec. Best for finding specific SKUs. Watch for marketplace sellers vs Newegg-sold items.
- **B&H Photo** — No sales tax in many states. Excellent for monitors, peripherals, and components. Reliable, authorized dealer.
- **Best Buy** — Good for in-store pickup, price matching, and seeing products in person. Limited PC component selection but carries major brands.

### In-Store (When Available)
- **Micro Center** — Best in-store PC component prices, especially CPUs. Exclusive CPU + motherboard combo discounts ($20-50 off). Limited locations (25 stores in US). Worth the trip if accessible.

### Price Comparison
- **PCPartPicker** — Essential tool for checking compatibility, comparing prices across retailers, and tracking price history. Always verify a build here before purchasing.

## Assembly Guide

### Tools Required
- Phillips head screwdriver (#2 size — covers 95% of PC screws)
- Anti-static wrist strap (recommended) or ground yourself by touching the case
- Zip ties or velcro straps for cable management
- Small flashlight or headlamp (case interiors are dark)

### Step Group 1: Core Platform (CPU + Motherboard + RAM + M.2 SSD)
**Assemble outside the case on the motherboard box for easy access.**

1. Open the CPU socket latch on the motherboard
2. Align CPU with socket (match the triangle/arrow indicator), drop it in — ZERO force needed
3. Close the socket latch (Intel: plastic cover pops off automatically)
4. Install M.2 SSD into the motherboard's M.2 slot, secure with screw
5. Install RAM sticks — use slots A2 and B2 (2nd and 4th from CPU) for dual-channel
6. Press RAM firmly until both clips click — this requires more force than expected

**Common mistakes:** Forgetting to enable XMP/EXPO in BIOS (RAM runs at base speed without it). Installing RAM in wrong slots (A1/B1 instead of A2/B2).

### Step Group 2: CPU Cooler Installation
**Install before putting motherboard in case — much easier with open access.**

1. Apply thermal paste if not pre-applied (pea-sized dot in center of CPU)
2. Mount cooler bracket/backplate according to cooler manual
3. Attach cooler, tighten in X-pattern (diagonal corners) for even pressure
4. Connect fan header to CPU_FAN on motherboard

**Common mistakes:** Over-tightening cooler screws. Forgetting to remove plastic cover from cooler contact plate. Not plugging in the fan header (system will thermal throttle or shut down).

### Step Group 3: Case Preparation + Motherboard Installation
1. Install case standoffs if not pre-installed (match motherboard form factor)
2. Install rear I/O shield if motherboard has a separate one
3. Lower motherboard onto standoffs, align with I/O shield
4. Secure with 9 screws (ATX) — don't over-tighten

### Step Group 4: GPU + PSU + Power Cables
1. Install PSU in case (fan facing down if case has bottom vent)
2. Route necessary cables: 24-pin ATX, 8-pin CPU, PCIe power, SATA power
3. Remove appropriate PCIe slot covers from case
4. Insert GPU into the top PCIe x16 slot — press firmly until click
5. Secure GPU with screws to case bracket
6. Connect PCIe power cable(s) to GPU

**Common mistakes:** Using daisy-chain PCIe cables for high-power GPUs (use separate cables). Forgetting the 8-pin CPU power cable (system won't POST). Not fully seating the GPU in the slot.

### Step Group 5: Storage, Front Panel, and Final Connections
1. Mount any 2.5"/3.5" drives in case bays
2. Connect SATA data and power cables to drives
3. Connect front panel headers (power button, USB, audio) — consult motherboard manual for pin layout
4. Connect case fans to motherboard fan headers or fan hub
5. Cable management: route cables behind motherboard tray, use tie points

### Step Group 6: First Boot and Configuration
1. Connect monitor, keyboard, power cable
2. Power on — first boot may take 30-60 seconds
3. Enter BIOS (DEL or F2 on startup)
4. Enable XMP/EXPO profile for RAM (critical for performance)
5. Verify all components detected (CPU, RAM amount, storage drives)
6. Set boot priority to USB if installing OS from USB drive
7. Install operating system
8. Install GPU drivers from manufacturer website (NVIDIA GeForce Experience or AMD Adrenalin)

**Common mistakes:** Panicking when first boot takes long. Not enabling XMP/EXPO. Installing GPU drivers from Windows Update instead of manufacturer (outdated).
```

**Step 3: Commit**

```bash
git add src/server/lib/skills/domains/_template.md src/server/lib/skills/domains/pc-building.md
git commit -m "feat(skills): add pc-building domain skill and authoring template"
```

---

### Task 9: Initialize Registry at Server Startup

**Files:**
- Modify: `src/server/index.ts` (or wherever the Hono app is created)

**Step 1: Find the server entry point and add registry initialization**

Look at `src/server/index.ts` for where the Hono app starts. Add:

```typescript
import { initializeRegistry } from './lib/skills';
```

Call `initializeRegistry()` early in the startup, before routes are registered. This scans the domains/ directory once.

```typescript
// Initialize domain skills registry
initializeRegistry();
```

**Step 2: Verify server starts without errors**

Run: `npm run dev` (or the project's dev command)
Expected: Console output includes `[skills] Loaded skill: pc-building (5 sections)` and `[skills] Registry initialized with 1 skill(s)`

**Step 3: Commit**

```bash
git add src/server/index.ts
git commit -m "feat(skills): initialize skill registry at server startup"
```

---

### Task 10: Integrate Detector into Build Creation Route

**Files:**
- Modify: `src/server/routes/index.ts` — the `POST /api/builds` handler (lines 53-141)

**Step 1: Add imports**

At top of `src/server/routes/index.ts`, add to existing imports:

```typescript
import { detectSkill } from '../lib/skills';
```

**Step 2: Add skill detection after build record creation**

In the `POST /api/builds` handler, after the `INSERT INTO builds` query (line 109) and before the `return c.json(...)` (line 111), add skill detection:

```typescript
    // Detect domain skill for this build (non-blocking — if it fails, build continues without skill)
    try {
      const detection = await detectSkill(
        body.description.trim(),
        buildId,
        env.GEMINI_API_KEY,
        env.GEMINI_MODEL,
        env.DB,
        env.GEMINI_API_BASE_URL,
      );

      if (detection.skillId) {
        await env.DB.prepare(
          `UPDATE builds SET skill_id = ?, skill_confidence = ? WHERE id = ?`,
        )
          .bind(detection.skillId, detection.confidence, buildId)
          .run();
      }
    } catch (err) {
      // Skill detection failure should not block build creation
      console.error('Skill detection failed (non-blocking):', err);
    }
```

**Step 3: Commit**

```bash
git add src/server/routes/index.ts
git commit -m "feat(skills): integrate skill detection into build creation"
```

---

### Task 11: Inject Skill Content into Structure Generator

**Files:**
- Modify: `src/server/lib/agents/structure/prompt.ts` — `buildUserPrompt` function (line 94-130)
- Modify: `src/server/routes/index.ts` — the `POST /api/builds/:id/init` handler

**Step 1: Add skillContent parameter to buildUserPrompt**

In `src/server/lib/agents/structure/prompt.ts`, change the `buildUserPrompt` function signature (line 94-99):

From:
```typescript
export function buildUserPrompt(
  description: string,
  budgetMin: number,
  budgetMax: number,
  existingItems?: ExistingItemForPrompt[],
): string {
```

To:
```typescript
export function buildUserPrompt(
  description: string,
  budgetMin: number,
  budgetMax: number,
  existingItems?: ExistingItemForPrompt[],
  skillContent?: string,
): string {
```

Then before the final `return prompt;` (line 129), add:

```typescript
  if (skillContent) {
    prompt += `\n\n## Domain Expertise\n\nUse the following domain-specific knowledge to improve your component selection, ordering, and budget allocation:\n\n${skillContent}`;
  }
```

**Step 2: Pass skill content from the init route**

In `src/server/routes/index.ts`, in the `POST /api/builds/:id/init` handler, after fetching the build (line 326-342) and before calling the StructureGenerator (line 409), add skill loading:

Add import at top:
```typescript
import { detectSkill, getSkillSectionsForAgent } from '../lib/skills';
```

(Update the existing import from Task 10 to include `getSkillSectionsForAgent`.)

Then in the init handler, read skill_id from the build record and pass to generator:

```typescript
    // Load domain skill content if detected
    const skillContent = build.skill_id
      ? getSkillSectionsForAgent(build.skill_id as string, 'structure')
      : undefined;
```

Then modify the `generator.generate()` call. Since StructureGenerator.generate() builds its own prompt internally, we need to thread `skillContent` through. The cleanest approach: modify `StructureGeneratorInput` to include an optional `skillContent` field.

In `src/server/lib/agents/structure/generator.ts`, add `skillContent?: string` to `StructureGeneratorInput` (line 30-36):

```typescript
export interface StructureGeneratorInput {
  buildId: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  existingItems?: ParsedExistingItem[];
  skillContent?: string;
}
```

Then in the `generate` method (line 73-78), pass it through:

```typescript
    const userPrompt = buildUserPrompt(
      input.description,
      input.budgetMin,
      input.budgetMax,
      input.existingItems,
      input.skillContent,
    );
```

And in the route, pass it in the generate call (around line 416-422):

```typescript
    const result = await generator.generate({
      buildId,
      description: build.description as string,
      budgetMin: build.budget_min as number,
      budgetMax: build.budget_max as number,
      existingItems: parsedExistingItems,
      skillContent,
    });
```

**Step 3: Commit**

```bash
git add src/server/lib/agents/structure/prompt.ts src/server/lib/agents/structure/generator.ts src/server/routes/index.ts
git commit -m "feat(skills): inject domain skill content into Structure Generator"
```

---

### Task 12: Inject Skill Content into Option Generator

**Files:**
- Modify: `src/server/lib/agents/options/prompt.ts` — `buildUserPrompt` function (line 92-124)
- Modify: `src/server/lib/agents/options/context.ts` — `buildContextFromDatabase` function
- Modify: `src/server/lib/agents/options/generator.ts`

**Step 1: Add skillContent to OptionGeneratorContext**

In `src/server/lib/agents/options/prompt.ts`, add to the `OptionGeneratorContext` interface (line 67-87):

```typescript
  skillContent?: string;
```

Then in `buildUserPrompt` (line 92-124), before the final return, append:

```typescript
  if (context.skillContent) {
    prompt += `\n\n## Domain Expertise\n\nUse the following domain-specific knowledge to improve your product recommendations and compatibility checks:\n\n${context.skillContent}`;
  }

  return prompt;
```

(Remove the existing bare `return` at the end of the template literal and replace with the above.)

**Step 2: Load skill in context builder**

In `src/server/lib/agents/options/context.ts`, add import at top:

```typescript
import { getSkillSectionsForAgent } from '../../skills';
```

In `buildContextFromDatabase` (line 40-136), after building the context object (around line 111-133), before the return, add:

```typescript
  // Load domain skill content if available
  const skillId = (build as any).skill_id as string | null;
  if (skillId) {
    context.skillContent = getSkillSectionsForAgent(skillId, 'options');
  }
```

Note: The `build` is fetched via `SELECT *`, so `skill_id` will be available on the row. We just need to access it. Update the `BuildRow` interface (line 10-17) to include:

```typescript
interface BuildRow {
  id: string;
  description: string;
  budget_min: number;
  budget_max: number;
  structure_json: string;
  current_step: number;
  skill_id: string | null;
}
```

**Step 3: Commit**

```bash
git add src/server/lib/agents/options/prompt.ts src/server/lib/agents/options/context.ts
git commit -m "feat(skills): inject domain skill content into Option Generator"
```

---

### Task 13: Inject Skill Content into Setup Steps Generator

**Files:**
- Modify: `src/server/lib/agents/setupSteps/prompt.ts` — `buildUserPrompt` function (line 73-101)
- Modify: `src/server/lib/agents/setupSteps/context.ts`
- Modify: `src/server/lib/agents/setupSteps/generator.ts`

**Step 1: Add skillContent parameter to buildUserPrompt**

In `src/server/lib/agents/setupSteps/prompt.ts`, change the function signature (line 73-78):

From:
```typescript
export function buildUserPrompt(
  buildCategory: string,
  buildName: string,
  description: string,
  items: BuildItemForPrompt[],
): string {
```

To:
```typescript
export function buildUserPrompt(
  buildCategory: string,
  buildName: string,
  description: string,
  items: BuildItemForPrompt[],
  skillContent?: string,
): string {
```

Before the final return, append:

```typescript
  if (skillContent) {
    prompt += `\n\n## Domain Expertise\n\nUse the following assembly guide to create more accurate, domain-specific setup steps:\n\n${skillContent}`;
  }
```

**Step 2: Thread skill through context and generator**

In `src/server/lib/agents/setupSteps/context.ts`, add `skill_id` to the build row type and expose it in the context. Add to the `SetupStepsContext` interface:

```typescript
  skillId?: string | null;
```

In the context builder, read `skill_id` from the build row and set `context.skillId = build.skill_id`.

In `src/server/lib/agents/setupSteps/generator.ts`, in the `generate` method (line 55-119), load the skill and pass it:

```typescript
import { getSkillSectionsForAgent } from '../../skills';
```

```typescript
    const skillContent = context.skillId
      ? getSkillSectionsForAgent(context.skillId, 'setupSteps')
      : undefined;

    const userPrompt = buildUserPrompt(
      context.buildCategory,
      context.buildName,
      context.description,
      context.items,
      skillContent,
    );
```

**Step 3: Commit**

```bash
git add src/server/lib/agents/setupSteps/prompt.ts src/server/lib/agents/setupSteps/context.ts src/server/lib/agents/setupSteps/generator.ts
git commit -m "feat(skills): inject domain skill content into Setup Steps Generator"
```

---

### Task 14: Inject Skill Content into Existing Items Parser

**Files:**
- Modify: `src/server/lib/agents/existingItems/prompt.ts` — `buildExistingItemsPrompt` function (line 107-115)
- Modify: `src/server/routes/index.ts` — the init handler where parser is called

**Step 1: Add skillContent parameter to buildExistingItemsPrompt**

In `src/server/lib/agents/existingItems/prompt.ts`, change (line 107):

From:
```typescript
export function buildExistingItemsPrompt(existingItemsText: string): string {
```

To:
```typescript
export function buildExistingItemsPrompt(existingItemsText: string, skillContent?: string): string {
```

Before the return, append domain expertise:

```typescript
  let prompt = `## User's Existing Items
...existing template string...`;

  if (skillContent) {
    prompt += `\n\n## Domain Expertise\n\nUse the following domain knowledge to better identify components and their specifications:\n\n${skillContent}`;
  }

  return prompt;
```

**Step 2: Thread skill through parser**

In `src/server/lib/agents/existingItems/parser.ts`, add `skillContent?: string` to `ExistingItemsParserInput` (line 33-36):

```typescript
export interface ExistingItemsParserInput {
  buildId: string;
  existingItemsText: string;
  skillContent?: string;
}
```

In the `parse` method (line 82), pass it:

```typescript
    const userPrompt = buildExistingItemsPrompt(input.existingItemsText, input.skillContent);
```

In `src/server/routes/index.ts`, in the init handler (around line 370-381), pass skillContent when calling the parser:

```typescript
      const parseResult = await parser.parse({
        buildId,
        existingItemsText,
        skillContent: build.skill_id
          ? getSkillSectionsForAgent(build.skill_id as string, 'existingItems')
          : undefined,
      });
```

**Step 3: Commit**

```bash
git add src/server/lib/agents/existingItems/prompt.ts src/server/lib/agents/existingItems/parser.ts src/server/routes/index.ts
git commit -m "feat(skills): inject domain skill content into Existing Items Parser"
```

---

### Task 15: End-to-End Verification

**Step 1: Start the server**

Run: `npm run dev`
Expected: Server starts, console shows `[skills] Loaded skill: pc-building (5 sections)` and `[skills] Registry initialized with 1 skill(s)`

**Step 2: Create a test build via API**

Run:
```bash
curl -X POST http://localhost:3000/api/builds \
  -H "Content-Type: application/json" \
  -d '{"description": "I want to build a gaming PC for 1440p gaming", "budgetMin": 1000, "budgetMax": 1500}'
```

Expected: Returns 201 with `buildId`. Check database: `SELECT skill_id, skill_confidence FROM builds WHERE id = '<buildId>'` should show `skill_id = 'pc-building'` and `skill_confidence >= 60`.

**Step 3: Initialize the build**

Run:
```bash
curl -X POST http://localhost:3000/api/builds/<buildId>/init
```

Expected: Structure returned with PC-relevant components (CPU, GPU, Motherboard, etc.) ordered by compatibility impact. The structure should reflect the skill's guidance on budget allocation for gaming.

**Step 4: Test fallback — create a build with no matching skill**

Run:
```bash
curl -X POST http://localhost:3000/api/builds \
  -H "Content-Type: application/json" \
  -d '{"description": "I want to build a custom bird feeder for my backyard", "budgetMin": 50, "budgetMax": 200}'
```

Expected: Build created, `skill_id` is NULL (no matching skill, confidence below threshold). Build continues working exactly as before.

**Step 5: Commit any fixes**

If any issues found, fix and commit with descriptive message.

**Step 6: Final commit — mark feature complete**

```bash
git add -A
git commit -m "feat(skills): complete domain-skills system with pc-building skill

- File-system skill registry scans domains/ at startup
- AI-powered skill detector classifies builds with confidence scoring
- Section-based injection gives each agent only relevant domain knowledge
- Graceful fallback: builds without matching skills work unchanged
- First skill: comprehensive pc-building reference (500+ lines)"
```

---

## Summary of All Files

### New Files (10)
| File | Purpose |
|------|---------|
| `migrations/0008_add_skill_columns.sql` | DB migration |
| `src/server/lib/skills/types.ts` | Type definitions |
| `src/server/lib/skills/parser.ts` | Markdown parser |
| `src/server/lib/skills/registry.ts` | File-system registry |
| `src/server/lib/skills/loader.ts` | Section loader |
| `src/server/lib/skills/detector.ts` | AI classifier agent |
| `src/server/lib/skills/index.ts` | Module exports |
| `src/server/lib/skills/domains/_template.md` | Authoring template |
| `src/server/lib/skills/domains/pc-building.md` | PC Building skill |
| `src/server/index.ts` | (Modified — init call) |

### Modified Files (10)
| File | Change |
|------|--------|
| `src/server/lib/gemini/types.ts` | Add `skill_detector` to AgentType |
| `src/server/routes/index.ts` | Detector in build creation, skill loading in init + options |
| `src/server/lib/agents/structure/prompt.ts` | Add `skillContent` param |
| `src/server/lib/agents/structure/generator.ts` | Thread `skillContent` through |
| `src/server/lib/agents/options/prompt.ts` | Add `skillContent` to context |
| `src/server/lib/agents/options/context.ts` | Load skill from build record |
| `src/server/lib/agents/setupSteps/prompt.ts` | Add `skillContent` param |
| `src/server/lib/agents/setupSteps/context.ts` | Expose `skillId` in context |
| `src/server/lib/agents/setupSteps/generator.ts` | Load skill, pass to prompt |
| `src/server/lib/agents/existingItems/prompt.ts` | Add `skillContent` param |
| `src/server/lib/agents/existingItems/parser.ts` | Thread `skillContent` through |
