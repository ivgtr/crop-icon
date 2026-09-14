import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Source } from './_lib/core.js';
import { html, inlineStyles } from './_lib/html.js';
import { inlineScript } from './_lib/generated/editor.js';
import { parseRequest } from './_lib/parser.js';
import { cropImage } from './_lib/cropImage/index.js';
import { loadRemote, SourceError } from './_lib/source.js';

// html() composes both assets from TypeScript modules. No public files or runtime file reads.
const page = Buffer.from(html());
const styleHash = createHash('sha256').update(inlineStyles).digest('base64');
const scriptHash = createHash('sha256').update(inlineScript).digest('base64');
const editorPaths = new Set(['/', '/api', '/api/', '/index.html']);

export function createHandler(load: (url: string) => Promise<Source> = loadRemote) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const target = new URL(request.url ?? '/api', 'http://localhost');
    if (!editorPaths.has(target.pathname)) {
      response.writeHead(404, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    const head = request.method === 'HEAD';
    if (request.method !== 'GET' && !head) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    const query = target.searchParams;
    if (query.getAll('url').length <= 1 && (!query.has('url') || query.get('url') === '')) {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8', 'Content-Length': page.byteLength,
        'Cache-Control': 'no-cache', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': `default-src 'none'; script-src 'sha256-${scriptHash}'; script-src-attr 'none'; style-src 'sha256-${styleHash}'; style-src-attr 'none'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      });
      response.end(head ? undefined : page);
      return;
    }
    try {
      const options = parseRequest(query);
      const svg = await cropImage(options, load);
      const etag = `"${createHash('sha256').update(svg).digest('hex')}"`;
      response.setHeader('ETag', etag);
      response.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=60');
      response.setHeader('Content-Type', 'image/svg+xml');
      response.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; sandbox");
      const matches = request.headers['if-none-match']?.split(',').some(value => value.trim().replace(/^W\//, '') === etag || value.trim() === '*');
      if (matches) { response.writeHead(304); response.end(); return; }
      response.writeHead(200, { 'Content-Length': Buffer.byteLength(svg) });
      response.end(head ? undefined : svg);
    } catch (error) {
      // Preserve the old empty 404 response; the editor gets a non-sensitive diagnostic code.
      response.writeHead(404, {
        'Cache-Control': 'no-store',
        'X-Crop-Error': error instanceof SourceError ? error.code : 'invalid_source_or_options',
      });
      response.end();
    }
  };
}
export default createHandler();
