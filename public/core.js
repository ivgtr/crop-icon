// One renderer for the browser and the API. No DOM, network, or platform dependencies.
/** @typedef {'circle'|'hart'|'heart'|'star'|'square'|'rounded'|'squircle'|'hexagon'|'diamond'|'shield'|'ticket'|'flower'} Pattern */
/** @typedef {{url: string, pattern: Pattern, width?: number, height?: number, fit: 'contain'|'cover', x: number, y: number, zoom: number, border: number, color: string, bg: string}} Options */
/** @typedef {{data: string, width: number, height: number}} Source */
export const PATTERNS = /** @type {const} */ ([
  'circle', 'hart', 'star', 'square', 'rounded', 'squircle',
  'hexagon', 'diamond', 'shield', 'ticket', 'flower',
]);
export const MAX_DIMENSION = 4096;
export const MAX_BYTES = 3 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;

/** @param {unknown} value */
export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c] || c));
}

/** @param {string} value */
export function validateUrl(value) {
  if (value.length > 4096) throw new Error('Image URL is too long.');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) {
    throw new Error('Use a public HTTP(S) image URL without credentials or a custom port.');
  }
  url.hash = '';
  return url;
}

/** @param {URLSearchParams | Record<string, unknown>} query @returns {Options} */
export function parseOptions(query) {
  /** @param {string} key @param {string} [fallback] */
  function get(key, fallback = '') {
    const values = query instanceof URLSearchParams ? query.getAll(key) : [query[key]];
    if (values.length > 1 || Array.isArray(values[0])) throw new Error(`Repeated parameter: ${key}`);
    const value = values[0];
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') throw new Error(`Invalid parameter: ${key}`);
    return value;
  }
  /** @param {string} key @param {number} fallback @param {number} min @param {number} max */
  function number(key, fallback, min, max) {
    const raw = get(key);
    const value = raw === '' ? fallback : Number(raw);
    if ((raw && !/^\d+(?:\.\d+)?$/.test(raw)) || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}.`);
    }
    return value;
  }
  const url = get('url');
  if (url) validateUrl(url);
  const pattern = get('p', 'circle');
  if (![...PATTERNS, 'heart'].some(p => p === pattern)) throw new Error('Unknown shape.');
  const fit = get('fit', 'contain');
  if (fit !== 'contain' && fit !== 'cover') throw new Error('Unknown fit.');
  /** @param {string} key @param {string} fallback @param {boolean} [transparent] */
  function color(key, fallback, transparent = false) {
    const raw = get(key, fallback).replace(/^#/, '');
    if (transparent && raw === 'transparent') return raw;
    if (!/^(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(raw)) throw new Error(`Invalid ${key} color.`);
    return `#${raw.toLowerCase()}`;
  }
  const width = get('width') ? number('width', 1, 1, MAX_DIMENSION) : undefined;
  const height = get('height') ? number('height', 1, 1, MAX_DIMENSION) : undefined;
  if ((width && !Number.isInteger(width)) || (height && !Number.isInteger(height))) throw new Error('Use whole-pixel dimensions.');
  return {
    url, pattern: /** @type {Pattern} */ (pattern), width, height,
    fit, x: number('x', 50, 0, 100), y: number('y', 50, 0, 100),
    zoom: number('zoom', 1, 1, 4), border: number('border', 0, 0, 64),
    color: color('color', 'ffffff'), bg: color('bg', 'transparent', true),
  };
}

/** @param {Pattern} pattern @param {number} w @param {number} h @param {string} [attributes] */
export function shapeMarkup(pattern, w, h, attributes = '') {
  const round = Math.round;
  // Keep the original circle, star and misspelled hart geometry, including non-square canvases.
  if (pattern === 'circle') return `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.hypot(w, h) / Math.sqrt(8)}" ${attributes}/>`;
  if (pattern === 'star') return `<polygon points="${round(w / 2)},0 ${round(3 * w / 16)},${h} ${w},${round(h / 3)} 0,${round(h / 3)} ${round(13 * w / 16)},${h}" ${attributes}/>`;
  if (pattern === 'hart' || pattern === 'heart') {
    return `<path d="M${round(w * .1)},${round(w * .3)} A${round(w * .2)},${round(w * .2)},0,0,1,${round(w * .5)},${round(w * .3)} A${round(w * .2)},${round(w * .2)},0,0,1,${round(w * .9)},${round(w * .3)} Q${round(w * .9)},${round(w * .6)},${round(w * .5)},${round(w * .9)} Q${round(w * .1)},${round(w * .6)},${round(w * .1)},${round(w * .3)} Z" ${attributes}/>`;
  }
  if (pattern === 'square' || pattern === 'rounded') return `<rect width="${w}" height="${h}" rx="${pattern === 'rounded' ? Math.min(w, h) * .2 : 0}" ${attributes}/>`;
  /** @type {Record<string, string>} */
  const paths = {
    squircle: 'M50 0C92 0 100 8 100 50S92 100 50 100 0 92 0 50 8 0 50 0Z',
    hexagon: 'M25 0H75L100 50 75 100H25L0 50Z',
    diamond: 'M50 0 100 50 50 100 0 50Z',
    shield: 'M5 0H95V48Q95 80 50 100Q5 80 5 48Z',
    ticket: 'M0 0H100V35C80 35 80 65 100 65V100H0V65C20 65 20 35 0 35Z',
    flower: 'M50 8C70 -12 87 5 82 24C106 20 108 44 91 50C108 65 99 86 80 82C83 106 58 108 50 91C35 108 14 99 18 80C-6 83 -8 58 9 50C-8 35 1 14 20 18C17 -6 42 -8 50 8Z',
  };
  return `<path d="${paths[pattern]}" transform="scale(${w / 100} ${h / 100})" vector-effect="non-scaling-stroke" ${attributes}/>`;
}

/** @param {Source} source @param {Options} options */
export function renderSvg(source, options) {
  if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(source.data)) throw new Error('Unsupported image data.');
  const w = options.width ?? source.width;
  const h = options.height ?? source.height;
  if (![w, h, source.width, source.height].every(n => Number.isFinite(n) && n > 0) ||
      w > MAX_DIMENSION || h > MAX_DIMENSION || source.width * source.height > MAX_PIXELS) throw new Error('Image dimensions exceed the limit.');
  const scale = (options.fit === 'cover' ? Math.max(w / source.width, h / source.height) : Math.min(w / source.width, h / source.height)) * options.zoom;
  const iw = source.width * scale, ih = source.height * scale;
  const x = (w - iw) * options.x / 100, y = (h - ih) * options.y / 100;
  const shape = shapeMarkup(options.pattern, w, h);
  const border = options.border ? shapeMarkup(options.pattern, w, h,
    `fill="none" stroke="${escapeXml(options.color)}" stroke-width="${options.border * 2}" stroke-linejoin="round"`) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" id="profile-icon"><defs><clipPath id="crop">${shape}</clipPath></defs><g clip-path="url(#crop)"><rect width="${w}" height="${h}" fill="${escapeXml(options.bg)}"/><image href="${escapeXml(source.data)}" x="${x}" y="${y}" width="${iw}" height="${ih}" preserveAspectRatio="none"/>${border}</g></svg>`;
}

/** @param {Options} options */
export function toQuery(options) {
  const query = new URLSearchParams({ url: options.url, p: options.pattern });
  for (const key of /** @type {const} */ (['width', 'height', 'fit', 'x', 'y', 'zoom', 'border', 'color', 'bg'])) {
    if (options[key] !== undefined) query.set(key, String(options[key]).replace(/^#/, ''));
  }
  return query;
}
