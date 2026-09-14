import { renderSvg, type Source } from "../core.js";
import type { Options } from "../parser.js";
import { loadRemote } from "../source.js";

// The HTTP handler delegates image generation here, as in the original project.
export const cropImage = async (
  options: Options,
  load: (url: string) => Promise<Source> = loadRemote,
): Promise<string> => renderSvg(await load(options.url), options);
