// Compatibility barrel for the shared crop domain.
// New code should import from model, options, url, or renderer by responsibility.
export * from './model.js';
export { parseOptions, toQuery, type OptionInput } from './options.js';
export { validateUrl } from './url.js';
export { escapeXml, renderSvg, shapeMarkup } from './renderer.js';
