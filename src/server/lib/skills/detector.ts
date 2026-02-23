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
