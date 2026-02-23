/**
 * Domain Skills Type Definitions
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
