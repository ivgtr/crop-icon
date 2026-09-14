import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import handler from '../build/api/index.js';
const assets = new Map([['/app.js', 'text/javascript'], ['/core.js', 'text/javascript']]);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/' || path === '/api' || path === '/api/' || path === '/index.html') return await handler(request, response);
    if (!assets.has(path)) { response.writeHead(404); return response.end(); }
    const content = await readFile(resolve('public', path.slice(1)));
    response.writeHead(200, { 'Content-Type': assets.get(path), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    return response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) { console.error(error); response.writeHead(500); return response.end(); }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`crop-icon: http://localhost:${server.address().port}`));
