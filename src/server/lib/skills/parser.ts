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
