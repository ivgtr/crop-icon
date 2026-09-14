import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';
import { inlineScript } from '../api/_lib/generated/editor.js';

function sources(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? sources(child) : [child];
  });
}
test('all application implementation is TypeScript under api/_lib', () => {
  assert.equal(existsSync('public'), false);
  assert.ok(sources('api/_lib').every(path => path.endsWith('.ts')));
  for (const path of sources('api/_lib').filter(path => !path.includes('/generated/'))) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /public\/|@ts-nocheck|@ts-ignore|\bas any\b/);
  }
});
test('browser code is strict-checked with DOM types, server code has no DOM ambient types', () => {
  const server = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
  const editor = JSON.parse(readFileSync('tsconfig.editor.json', 'utf8'));
  assert.equal(server.compilerOptions.strict, true);
  assert.equal(server.compilerOptions.allowJs, false);
  assert.equal(server.compilerOptions.noEmitOnError, true);
  assert.equal(editor.extends, './tsconfig.json');
  assert.ok(editor.include.includes('api/_lib/editor/**/*.ts'));
  assert.deepEqual(editor.compilerOptions.types, []);
  assert.ok(editor.compilerOptions.lib.includes('DOM'));
  assert.ok(!server.compilerOptions.lib.includes('DOM'));
});
test('compiled editor is one self-contained, HTML-safe executable script', () => {
  assert.ok(inlineScript.length > 1000);
  assert.doesNotThrow(() => new Script(inlineScript));
  assert.doesNotMatch(inlineScript, /<\/script|<!--|\bimport\s*\(|\bexport\s|sourceMappingURL|require\(/i);
  assert.doesNotMatch(inlineScript, /node:|loadRemote|node_modules|\/app\.js|\/core\.js/);
});
test('Vercel static output is empty and cannot expose compiled server modules', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'build/static');
  assert.deepEqual(readdirSync(config.outputDirectory), []);
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.functions['api/index.ts'].includeFiles, undefined);
  for (const path of ['/', '/index.html']) assert.ok(config.rewrites.some((r: { source: string; destination: string }) => r.source === path && r.destination === '/api'));
});

test('all authored executable files are TypeScript and only api/index.ts is public', () => {
  for (const dir of ['api', 'scripts', 'tests']) {
    for (const file of sources(dir)) assert.ok(file.endsWith('.ts'), file);
  }
  assert.deepEqual(readdirSync('api').sort(), ['_lib', 'index.ts']);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.ok(pkg.scripts.test.includes('build/tests/*.test.js'));
  assert.doesNotMatch(readFileSync('scripts/dev.ts', 'utf8'), /readFile|createReadStream|public\//);
});
