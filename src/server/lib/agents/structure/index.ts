/**
 * Structure Generator Agent Module
 *
 * Exports the Structure Generator service and related types.
 */

export { StructureGenerator } from './generator.js';
export type {
  StructureGeneratorInput,
  StructureGeneratorResult,
} from './generator.js';
export { STRUCTURE_GENERATOR_SYSTEM_PROMPT, buildUserPrompt } from './prompt.js';
