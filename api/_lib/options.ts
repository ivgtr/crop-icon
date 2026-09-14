import { MAX_DIMENSION, MAX_ZOOM, MIN_ZOOM, isPattern, type Options } from './model.js';
import { validateUrl } from './url.js';

export type OptionInput = URLSearchParams | Record<string, unknown>;

export function parseOptions(query: OptionInput): Options {
  function get(key: string, fallback = ''): string {
    const values = query instanceof URLSearchParams ? query.getAll(key) : [query[key]];
    if (values.length > 1 || Array.isArray(values[0])) throw new Error(`Repeated parameter: ${key}`);
    const value = values[0];
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') throw new Error(`Invalid parameter: ${key}`);
    return value;
  }
  function number(key: string, fallback: number, min: number, max: number): number {
    const raw = get(key);
    const value = raw === '' ? fallback : Number(raw);
    if ((raw && !/^\d+(?:\.\d+)?$/.test(raw)) || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}.`);
    }
    return value;
  }
  function color(key: string, fallback: string, transparent = false): string {
    const raw = get(key, fallback).replace(/^#/, '');
    if (transparent && raw === 'transparent') return raw;
    if (!/^(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(raw)) throw new Error(`Invalid ${key} color.`);
    return `#${raw.toLowerCase()}`;
  }

  const url = get('url');
  if (url) validateUrl(url);
  const pattern = get('p', 'circle');
  if (!isPattern(pattern)) throw new Error('Unknown shape.');
  const fit = get('fit', 'contain');
  if (fit !== 'contain' && fit !== 'cover') throw new Error('Unknown fit.');
  const width = get('width') ? number('width', 1, 1, MAX_DIMENSION) : undefined;
  const height = get('height') ? number('height', 1, 1, MAX_DIMENSION) : undefined;
  if ((width && !Number.isInteger(width)) || (height && !Number.isInteger(height))) throw new Error('Use whole-pixel dimensions.');

  return {
    url,
    pattern,
    width,
    height,
    fit,
    x: number('x', 50, 0, 100),
    y: number('y', 50, 0, 100),
    zoom: number('zoom', 1, MIN_ZOOM, MAX_ZOOM),
    border: number('border', 0, 0, 64),
    color: color('color', 'ffffff'),
    bg: color('bg', 'transparent', true),
  };
}

export function toQuery(options: Options): URLSearchParams {
  const query = new URLSearchParams({ url: options.url, p: options.pattern });
  for (const key of (['width', 'height', 'fit', 'x', 'y', 'zoom', 'border', 'color', 'bg'] as const)) {
    if (options[key] !== undefined) query.set(key, String(options[key]).replace(/^#/, ''));
  }
  return query;
}
