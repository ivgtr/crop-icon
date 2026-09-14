import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHandler } from '../build/api/index.js';
import { inspectImage, SourceError } from '../build/api/_lib/source.js';
import { parseOptions, renderSvg } from '../public/core.js';
import { PNG } from './fixtures.mjs';
const source = inspectImage(PNG);

async function withServer(run, load = async () => source) {
  const server = createServer(createHandler(load));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('legacy /api without an image returns the editor, including HEAD semantics', () => withServer(async base => {
  const get = await fetch(base + '/api');
  assert.equal(get.status, 200); assert.match(get.headers.get('content-type'), /text\/html/);
  const html = await get.text(); assert.match(html, /The cutting room/); assert.match(html, /\/app.js/);
  const head = await fetch(base + '/api', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(html));
}));
for (const p of ['circle', 'hart', 'star']) test(`legacy HTTP contract for ${p}`, () => withServer(async base => {
  const query = new URLSearchParams({ url: 'https://github.com/ivgtr.png', p });
  const response = await fetch(base + '/api?' + query);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/svg+xml');
  assert.match(response.headers.get('cache-control'), /max-age=86400/);
  const body = await response.text();
  assert.equal(body, renderSvg(source, parseOptions(query)));
  assert.equal(Number(response.headers.get('content-length')), Buffer.byteLength(body));
}));
test('new controls produce the exact same output as the browser renderer', () => withServer(async base => {
  const query = new URLSearchParams({ url: 'https://example.com/a?x=1&y=2', p: 'hexagon', fit: 'cover', width: '256', height: '128', x: '10', zoom: '2', border: '8', bg: 'abcdef' });
  const response = await fetch(base + '/api?' + query);
  assert.equal(await response.text(), renderSvg(source, parseOptions(query)));
}));
test('GET/HEAD/conditional requests share ETag and byte length', () => withServer(async base => {
  const url = base + '/api?url=https://example.com/a';
  const get = await fetch(url); const etag = get.headers.get('etag'); const body = await get.text();
  const head = await fetch(url, { method: 'HEAD' });
  assert.equal(head.headers.get('etag'), etag); assert.equal(await head.text(), '');
  assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(body));
  for (const match of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
    const cached = await fetch(url, { headers: { 'If-None-Match': match } });
    assert.equal(cached.status, 304); assert.equal(await cached.text(), '');
  }
}));
test('invalid queries never start a source fetch and retain empty 404 semantics', () => withServer(async base => {
  for (const query of ['url=file:///etc/passwd', 'url=https://example.com&a=1&width=-1', 'url=https://example.com&p=bad', 'url=https://example.com&url=x', 'url=&url=x']) {
    const response = await fetch(base + '/api?' + query);
    assert.equal(response.status, 404); assert.equal(await response.text(), '');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
}, async () => assert.fail('Invalid query reached network loader')));
test('source failures expose only fixed diagnostic codes, never upstream details', () => withServer(async base => {
  const response = await fetch(base + '/api?url=https://example.com/a');
  assert.equal(response.status, 404); assert.equal(await response.text(), '');
  assert.equal(response.headers.get('x-crop-error'), 'blocked_source');
}, async () => { throw new SourceError('blocked_source'); }));
test('unsupported methods do not trigger network requests', () => withServer(async base => {
  const response = await fetch(base + '/api?url=https://example.com/a', { method: 'POST' });
  assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET, HEAD');
}, async () => assert.fail('POST reached network loader')));

test('the editor ships one inline stylesheet and a matching CSP hash, without unsafe-inline', () => withServer(async base => {
  const response = await fetch(base + '/api');
  const html = await response.text();
  const { createHash } = await import('node:crypto');
  const blocks = [...html.matchAll(/<style id="studio-style">([\s\S]*?)<\/style>/g)];
  assert.equal(blocks.length, 1);
  assert.match(blocks[0][1], /@media/);
  assert.doesNotMatch(html, /<link[^>]*rel=["']stylesheet["']/i);
  const expected = createHash('sha256').update(blocks[0][1]).digest('base64');
  const policy = response.headers.get('content-security-policy');
  assert.ok(policy.includes(`style-src 'self' 'sha256-${expected}'`));
  assert.ok(policy.includes("style-src-attr 'none'"));
  assert.ok(policy.includes("script-src 'self'"));
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);
}));

test('editor entry points and HEAD responses share the same style policy and byte length', () => withServer(async base => {
  const initial = await fetch(base + '/api');
  const html = await initial.text();
  const policy = initial.headers.get('content-security-policy');
  for (const path of ['/', '/api', '/api/', '/index.html']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), html);
    assert.equal(response.headers.get('content-security-policy'), policy);
    const head = await fetch(base + path, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(html));
    assert.equal(head.headers.get('content-security-policy'), policy);
  }
}));

test('Vercel routes the editor aliases to the API that supplies its CSP', async () => {
  const { readFile } = await import('node:fs/promises');
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.outputDirectory, 'public');
  assert.equal(config.functions['api/index.ts'].includeFiles, 'public/index.html');
  for (const source of ['/', '/index.html']) {
    assert.ok(config.rewrites.some(rule => rule.source === source && rule.destination === '/api'));
  }
});

test('the editor references existing local modules, not a missing stylesheet', async () => {
  const { readFile, access } = await import('node:fs/promises');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /\/style\.css/);
  for (const [, path] of html.matchAll(/<script[^>]+src="(\/[^\"]+)"/g)) {
    await access(new URL('../public' + path, import.meta.url));
  }
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const [, path] of app.matchAll(/from ['"]\.\/([^'\"]+)['"]/g)) {
    await access(new URL('../public/' + path, import.meta.url));
  }
});

test('SVG responses retain their restrictive policy independently of the editor styles', () => withServer(async base => {
  const response = await fetch(base + '/api?url=https://example.com/a');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; img-src data:; sandbox");
  assert.doesNotMatch(await response.text(), /studio-style/);
}));
