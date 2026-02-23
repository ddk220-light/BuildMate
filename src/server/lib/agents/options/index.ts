/**
 * Option Generator Agent Module
 *
 * Exports the Option Generator service and related types.
 */

export { OptionGenerator } from "./generator";
export type { OptionGeneratorInput, OptionGeneratorResult } from "./generator";
export {
  OPTION_GENERATOR_SYSTEM_PROMPT,
  buildUserPrompt as buildOptionUserPrompt,
} from "./prompt";
export type { OptionGeneratorContext } from "./prompt";
export {
  buildContextFromDatabase,
  getCachedOptions,
  saveShownOptions,
} from "./context";
