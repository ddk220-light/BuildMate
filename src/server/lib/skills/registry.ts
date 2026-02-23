/**
 * Skill Registry
 *
 * Scans the domains/ directory at startup, parses each .md file,
 * and builds an in-memory index of available skills.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseSkillFile } from './parser';
import type { Skill, SkillMetadata } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
