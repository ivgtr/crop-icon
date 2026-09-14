import { parseOptions } from "./core.js";

// Preserve the original module/entry-point names; share validation with the editor.
export type { Options, Pattern as CropPattern } from "./core.js";
export const parseRequest = parseOptions;
