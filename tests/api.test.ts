import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Source } from '../api/_lib/core.js';
import { once } from 'node:events';
import { createHandler } from '../api/index.js';
import { inspectImage, SourceError } from '../api/_lib/source.js';
import { parseOptions, renderSvg } from '../api/_lib/core.js';
import { PNG } from './fixtures.js';
const source = inspectImage(PNG);

async function withServer(run: (base: string) => Promise<void>, load: (url: string) => Promise<Source> = async () => source) {
  const server = createServer(createHandler(load));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try { await run(base); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('legacy /api without an image returns the editor, including HEAD semantics', () => withServer(async base => {
  const get = await fetch(base + '/api');
  assert.equal(get.status, 200); assert.match(get.headers.get('content-type') ?? '', /text\/html/);
  const html = await get.text(); assert.match(html, /The cutting room/); assert.match(html, /studio-script/);
  const head = await fetch(base + '/api', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(html));
}));
for (const p of ['circle', 'hart', 'star']) test(`legacy HTTP contract for ${p}`, () => withServer(async base => {
  const query = new URLSearchParams({ url: 'https://github.com/ivgtr.png', p });
  const response = await fetch(base + '/api?' + query);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/svg+xml');
  assert.match(response.headers.get('cache-control') ?? '', /max-age=86400/);
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
  const get = await fetch(url); const etag = get.headers.get('etag'); assert.ok(etag); const body = await get.text();
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

test('HTML routes serve html() with hashes permitting only compiled code and generated styles', () => withServer(async base => {
  const { createHash } = await import('node:crypto');
  const { html, inlineStyles } = await import('../api/_lib/html.js');
  const { inlineScript } = await import('../api/_lib/generated/editor.js');
  for (const path of ['/', '/api', '/api/', '/index.html']) {
    const response = await fetch(base + path);
    const document = await response.text();
    assert.equal(document, html());
    assert.equal([...document.matchAll(/<script\b/g)].length, 1);
    assert.equal(document.match(/<script id="studio-script">([\s\S]*?)<\/script>/)?.[1], inlineScript);
    assert.equal(document.match(/<style id="studio-style">([\s\S]*?)<\/style>/)?.[1], inlineStyles);
    assert.doesNotMatch(document, /<script[^>]*\ssrc=|rel="stylesheet"/);
    const policy = response.headers.get('content-security-policy'); assert.ok(policy);
    for (const [kind, value] of [['script', inlineScript], ['style', inlineStyles]]) {
      const hash = createHash('sha256').update(value).digest('base64');
      assert.ok(policy.includes(`${kind}-src 'sha256-${hash}'`));
      assert.ok(policy.includes(`${kind}-src-attr 'none'`));
    }
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);
    const head = await fetch(base + path, { method: 'HEAD' });
    assert.equal(await head.text(), '');
    assert.equal(head.headers.get('content-security-policy'), policy);
    assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(document));
  }
}));
test('HTML query values are never interpolated into inline script or style blocks', () => withServer(async base => {
  const query = new URLSearchParams({ p: '</script><script>sentinel</script>', width: 'bad', bg: 'sentinel' });
  const baseline = await fetch(base + '/api');
  const response = await fetch(base + '/api?' + query);
  assert.equal(await response.text(), await baseline.text());
  assert.equal(response.headers.get('content-security-policy'), baseline.headers.get('content-security-policy'));
}));
test('former public assets and source paths are not HTTP entry points', () => withServer(async base => {
  for (const path of ['/app.js', '/core.js', '/style.css', '/public/app.js', '/api/_lib/editor/index.ts', '/build/api/index.js']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(base + path + '?url=https://example.com/a', { method });
      assert.equal(response.status, 404, path);
      assert.equal(await response.text(), '');
    }
  }
}, async () => assert.fail('An asset path must not fetch an image')));
test('SVG response policy and data are independent of the inline editor', () => withServer(async base => {
  const response = await fetch(base + '/api?url=https://example.com/a');
  assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; img-src data:; sandbox");
  assert.doesNotMatch(await response.text(), /studio-script|studio-style|<script/);
}));
