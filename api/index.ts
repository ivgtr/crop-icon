import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOptions, renderSvg, type Source } from '../public/core.js';
import { loadRemote, SourceError } from './_lib/source.js';

export function createHandler(load: (url: string) => Promise<Source> = loadRemote) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const head = request.method === 'HEAD';
    if (request.method !== 'GET' && !head) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    const query = new URL(request.url ?? '/api', 'http://localhost').searchParams;
    if (query.getAll('url').length <= 1 && (!query.has('url') || query.get('url') === '')) {
      const html = readFileSync(join(process.cwd(), 'public/index.html'));
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.byteLength,
        'Cache-Control': 'no-cache', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      });
      response.end(head ? undefined : html);
      return;
    }
    try {
      const options = parseOptions(query);
      const svg = renderSvg(await load(options.url), options);
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
