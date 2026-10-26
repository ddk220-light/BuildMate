/**
 * Option Generator Agent Module
 *
 * Exports the Option Generator service and related types.
 */

export { OptionGenerator } from "./generator.js";
export type { OptionGeneratorInput, OptionGeneratorResult } from "./generator.js";
export {
  OPTION_GENERATOR_SYSTEM_PROMPT,
  buildUserPrompt as buildOptionUserPrompt,
} from "./prompt.js";
export type { OptionGeneratorContext } from "./prompt.js";
export {
  buildContextFromDatabase,
  getCachedOptions,
  saveShownOptions,
} from "./context.js";
