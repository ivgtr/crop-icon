import { parseOptions, type Options } from "./core.js";

// Share request validation with the editor while extending zoom below the
// historical 1x lower bound. Rendering already supports positive zoom values;
// keeping this adapter here lets the API and browser use the same validation.
export type { Options, Pattern as CropPattern } from "./core.js";
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

type OptionInput = URLSearchParams | Record<string, unknown>;

function readZoom(query: OptionInput): string | undefined {
  if (query instanceof URLSearchParams) {
    const values = query.getAll("zoom");
    if (values.length > 1) throw new Error("Repeated parameter: zoom");
    return values[0] || undefined;
  }
  const value = query.zoom;
  if (Array.isArray(value)) throw new Error("Repeated parameter: zoom");
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("Invalid parameter: zoom");
  return value;
}

function withNeutralZoom(query: OptionInput): OptionInput {
  if (query instanceof URLSearchParams) {
    const normalized = new URLSearchParams(query);
    normalized.set("zoom", "1");
    return normalized;
  }
  return { ...query, zoom: "1" };
}

export function parseCropOptions(query: OptionInput): Options {
  const raw = readZoom(query);
  if (raw === undefined) return parseOptions(query);
  const zoom = Number(raw);
  if (!/^\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(zoom) || zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
    throw new Error(`zoom must be between ${MIN_ZOOM} and ${MAX_ZOOM}.`);
  }
  return { ...parseOptions(withNeutralZoom(query)), zoom };
}

export const parseRequest = parseCropOptions;
