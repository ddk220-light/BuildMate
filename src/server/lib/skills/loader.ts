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
