/**
 * Structure Generator Agent Module
 *
 * Exports the Structure Generator service and related types.
 */

export { StructureGenerator } from './generator';
export type {
  StructureGeneratorInput,
  StructureGeneratorResult,
} from './generator';
export { STRUCTURE_GENERATOR_SYSTEM_PROMPT, buildUserPrompt } from './prompt';
