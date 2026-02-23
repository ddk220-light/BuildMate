# Domain Skills System Design

## Overview

Add a modular domain-skills layer to BuildMate so agents can dynamically load domain expertise (e.g., PC building, home theater) based on the user's build description. Skills are comprehensive `.md` reference files that get section-injected into agent prompts to improve response quality.

## Architecture: File-System Skill Registry

Skills are `.md` files stored in `src/server/lib/skills/domains/`. A registry scans the directory at startup, parses frontmatter for metadata, and builds an in-memory index. Agents request specific sections of a skill relevant to their task.

### Module Structure

```
src/server/lib/skills/
├── types.ts             # Type definitions
├── registry.ts          # Discovers & indexes skills at startup
├── parser.ts            # Extracts frontmatter + sections from .md
├── detector.ts          # AI-powered skill classifier (new agent)
├── loader.ts            # Loads skill sections for a specific agent
└── domains/
    ├── pc-building.md
    └── _template.md     # Reference template for authoring new skills
```

## Skill File Template

Each domain skill is a single `.md` file with YAML frontmatter and 5 standardized sections:

```markdown
---
id: pc-building
name: PC Building
description: Custom desktop computer builds including gaming, workstation, and general-purpose PCs
keywords: [computer, PC, desktop, gaming rig, workstation, GPU, CPU, motherboard]
---

## Component Taxonomy
<!-- Components in this domain, organized hierarchically -->
<!-- Each component: name, role, key specs to evaluate, brand landscape -->

## Compatibility Rules
<!-- Hard rules: IF [condition] THEN [constraint] -->
<!-- e.g., IF CPU is Intel 14th Gen THEN Motherboard must have LGA 1700 socket -->

## Budget Allocation Templates
<!-- Named budget patterns for common sub-categories -->
<!-- e.g., ### Gaming: GPU 35-40%, CPU 20-25%, ... -->

## Recommended Stores
<!-- Trusted retailers with what they're best for -->

## Assembly Guide
<!-- Functional groups of components and assembly order -->
<!-- Safety warnings, tool requirements, common mistakes -->
```

**Frontmatter** provides structured metadata for the detector without parsing the full file. **Keywords** help the AI classifier. **Sections are self-contained** for independent injection.

## Type Definitions

```typescript
interface SkillMetadata {
  id: string;           // e.g., "pc-building"
  name: string;         // e.g., "PC Building"
  description: string;  // For the detector's context
  keywords: string[];   // Matching hints
}

interface SkillSection {
  heading: string;      // e.g., "Component Taxonomy"
  content: string;      // Raw markdown content
}

interface Skill {
  metadata: SkillMetadata;
  sections: SkillSection[];
  raw: string;          // Full file content
}

type AgentType = 'structure' | 'options' | 'setupSteps' | 'existingItems';

const AGENT_SECTION_MAP: Record<AgentType, string[]> = {
  structure:     ['Component Taxonomy', 'Compatibility Rules', 'Budget Allocation Templates'],
  options:       ['Component Taxonomy', 'Compatibility Rules', 'Recommended Stores'],
  setupSteps:    ['Assembly Guide'],
  existingItems: ['Component Taxonomy', 'Compatibility Rules'],
};
```

## Skill Detector Agent

A new 5th agent that runs during build creation. Returns confidence scores for each available skill.

### Output Schema

```typescript
interface SkillDetectionResult {
  matches: {
    skillId: string;      // e.g., "pc-building" or "general"
    confidence: number;   // 0-100 percentage
  }[];
  // Sorted by confidence descending
  // Always includes a "general" entry
}
```

### Prompt Design

```
You are a build category classifier. Given a user's build description,
determine which domain skill best matches their request.

Available skills:
{{#each skills}}
- {{id}}: {{description}} (keywords: {{keywords}})
{{/each}}
- general: No specific domain match

Rules:
- Return a confidence percentage (0-100) for EACH skill including "general"
- Percentages must sum to 100
- Consider the keywords but also the overall intent
```

### Selection Logic

- Take the highest-confidence match
- If the top match is `"general"` OR confidence is below 60%, use no skill injection (current behavior)
- Store both `skill_id` and `skill_confidence` on the build record

### Configuration

- Temperature: 0.3 (low, for consistent classification)
- MaxTokens: 256 (small response)
- Model: Same Gemini model as other agents

## Database Change

Add two columns to the `builds` table:

```sql
ALTER TABLE builds ADD COLUMN skill_id TEXT;
ALTER TABLE builds ADD COLUMN skill_confidence INTEGER;
```

Both nullable. `null` means no skill detected or detection hasn't run (backward compatible).

## Agent Prompt Integration

Skill content is **additive** — existing prompts stay intact, skill sections are appended as `## Domain Expertise`.

### Pattern for each agent's prompt.ts

```typescript
// Before:
export function buildUserPrompt(context: BuildContext): string {
  return `## Build Context\n${formatContext(context)}`;
}

// After:
export function buildUserPrompt(context: BuildContext, skillContent?: string): string {
  let prompt = `## Build Context\n${formatContext(context)}`;
  if (skillContent) {
    prompt += `\n\n## Domain Expertise\n${skillContent}`;
  }
  return prompt;
}
```

### In each agent's generator.ts

```typescript
const skillContent = build.skill_id
  ? getSkillSectionsForAgent(build.skill_id, 'options')
  : undefined;

const userPrompt = buildUserPrompt(context, skillContent);
```

## Section-to-Agent Mapping

| Agent | Injected Sections |
|-------|------------------|
| Structure | Component Taxonomy, Compatibility Rules, Budget Allocation Templates |
| Options | Component Taxonomy, Compatibility Rules, Recommended Stores |
| SetupSteps | Assembly Guide |
| ExistingItems | Component Taxonomy, Compatibility Rules |

## End-to-End Flow

```
1. User submits build description + budget
   → POST /api/builds

2. BUILD CREATION
   a. Create build record (existing)
   b. Skill Detector classifies description
      → { pc-building: 87%, home-theater: 8%, general: 5% }
      → 87% > 60% threshold → skill_id = "pc-building"
   c. Store skill_id + skill_confidence on build record

3. INIT (POST /api/builds/:id/init)
   a. Parse existing items if provided (existing)
   b. Load skill sections for Structure agent
   c. Structure Generator runs with domain expertise injected
   d. Returns refined component list

4. OPTIONS LOOP (for each component)
   a. Load skill sections for Options agent
   b. Options Generator runs with domain expertise
   c. Recommends from known stores, checks domain-specific compatibility

5. SETUP STEPS (GET /api/builds/:id/setup-steps)
   a. Load skill sections for SetupSteps agent
   b. SetupSteps Generator runs with assembly expertise
```

## What Changes

- **New column:** `builds.skill_id` (TEXT, nullable), `builds.skill_confidence` (INTEGER, nullable)
- **New module:** `src/server/lib/skills/` (5 source files + domain .md files)
- **Modified:** Each agent's `generator.ts` and `prompt.ts` (small additions)
- **Modified:** Build creation route to call detector
- **New:** One migration file for the column addition

## What Stays the Same

- All existing prompts and agent logic
- Frontend — zero changes
- API contract — no new endpoints, no response shape changes
- Builds without a matching skill work exactly as they do today

## Fallback Behavior

- If `skill_id` is null: agents run with no injected domain content (current behavior)
- If skill file is missing/corrupt: graceful fallback to no injection, log a warning
- If detector fails: build continues without skill, logged as error

## Future Extensions

- **Skill authoring UI:** Later phase, enables creating new skills through the app
- **Database-backed skills:** Swap registry data source from filesystem to DB when runtime authoring is needed
- **Multi-skill matching:** Could load multiple skills if a build spans domains
- **Skill versioning:** Track which skill version was used for each build
