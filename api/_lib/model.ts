export const PATTERNS = [
  'circle', 'heart', 'star', 'square', 'rounded', 'squircle',
  'hexagon', 'diamond', 'shield', 'ticket', 'flower',
] as const;

export type Pattern = typeof PATTERNS[number];

export interface Options {
  url: string;
  pattern: Pattern;
  width?: number;
  height?: number;
  fit: 'contain' | 'cover';
  x: number;
  y: number;
  zoom: number;
  border: number;
  color: string;
  bg: string;
}

export interface Source {
  data: string;
  width: number;
  height: number;
}

export const MAX_DIMENSION = 4096;
export const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function isPattern(value: unknown): value is Pattern {
  return PATTERNS.some(pattern => pattern === value);
}
