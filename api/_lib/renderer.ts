import { MAX_DIMENSION, MAX_PIXELS, type Options, type Pattern, type Source } from './model.js';

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeXml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => (XML_ENTITIES[c] ?? c));
}

export function shapeMarkup(pattern: Pattern, w: number, h: number, attributes = ''): string {
  const round = Math.round;
  if (pattern === 'circle') return `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.hypot(w, h) / Math.sqrt(8)}" ${attributes}/>`;
  if (pattern === 'star') return `<polygon points="${round(w / 2)},0 ${round(3 * w / 16)},${h} ${w},${round(h / 3)} 0,${round(h / 3)} ${round(13 * w / 16)},${h}" ${attributes}/>`;
  if (pattern === 'heart') {
    return `<path d="M${round(w * .1)},${round(w * .3)} A${round(w * .2)},${round(w * .2)},0,0,1,${round(w * .5)},${round(w * .3)} A${round(w * .2)},${round(w * .2)},0,0,1,${round(w * .9)},${round(w * .3)} Q${round(w * .9)},${round(w * .6)},${round(w * .5)},${round(w * .9)} Q${round(w * .1)},${round(w * .6)},${round(w * .1)},${round(w * .3)} Z" ${attributes}/>`;
  }
  if (pattern === 'square' || pattern === 'rounded') return `<rect width="${w}" height="${h}" rx="${pattern === 'rounded' ? Math.min(w, h) * .2 : 0}" ${attributes}/>`;
  const paths: Partial<Record<Pattern, string>> = {
    squircle: 'M50 0C92 0 100 8 100 50S92 100 50 100 0 92 0 50 8 0 50 0Z',
    hexagon: 'M25 0H75L100 50 75 100H25L0 50Z',
    diamond: 'M50 0 100 50 50 100 0 50Z',
    shield: 'M5 0H95V48Q95 80 50 100Q5 80 5 48Z',
    ticket: 'M0 0H100V35C80 35 80 65 100 65V100H0V65C20 65 20 35 0 35Z',
    flower: 'M50 8C70 -12 87 5 82 24C106 20 108 44 91 50C108 65 99 86 80 82C83 106 58 108 50 91C35 108 14 99 18 80C-6 83 -8 58 9 50C-8 35 1 14 20 18C17 -6 42 -8 50 8Z',
  };
  return `<path d="${paths[pattern]}" transform="scale(${w / 100} ${h / 100})" vector-effect="non-scaling-stroke" ${attributes}/>`;
}

export function renderSvg(source: Source, options: Options): string {
  if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(source.data)) throw new Error('Unsupported image data.');
  const w = options.width ?? source.width;
  const h = options.height ?? source.height;
  if (![w, h, source.width, source.height].every(n => Number.isFinite(n) && n > 0) ||
      w > MAX_DIMENSION || h > MAX_DIMENSION || source.width * source.height > MAX_PIXELS) throw new Error('Image dimensions exceed the limit.');
  const scale = (options.fit === 'cover' ? Math.max(w / source.width, h / source.height) : Math.min(w / source.width, h / source.height)) * options.zoom;
  const iw = source.width * scale;
  const ih = source.height * scale;
  const x = (w - iw) * options.x / 100;
  const y = (h - ih) * options.y / 100;
  const shape = shapeMarkup(options.pattern, w, h);
  const border = options.border ? shapeMarkup(options.pattern, w, h,
    `fill="none" stroke="${escapeXml(options.color)}" stroke-width="${options.border * 2}" stroke-linejoin="round"`) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" id="profile-icon"><defs><clipPath id="crop">${shape}</clipPath></defs><g clip-path="url(#crop)"><rect width="${w}" height="${h}" fill="${escapeXml(options.bg)}"/><image href="${escapeXml(source.data)}" x="${x}" y="${y}" width="${iw}" height="${ih}" preserveAspectRatio="none"/>${border}</g></svg>`;
}
