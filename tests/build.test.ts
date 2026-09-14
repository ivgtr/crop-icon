import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';
import { build, type Metafile } from 'esbuild';
import { inlineScript } from '../api/_lib/generated/editor.js';

function isSelfContained(metadata: Metafile): boolean {
  const outputs = Object.values(metadata.outputs);
  return outputs.length === 1 && outputs[0].imports.length === 0 && outputs[0].exports.length === 0 &&
    Object.keys(metadata.inputs).every(path => path.startsWith('api/_lib/') && path.endsWith('.ts'));
}

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
  assert.doesNotMatch(inlineScript, /<\/script|<!--|sourceMappingURL/i);
  const metadata: Metafile = JSON.parse(readFileSync('build/editor.meta.json', 'utf8'));
  assert.ok(isSelfContained(metadata));
  assert.doesNotMatch(inlineScript, /node:|loadRemote|node_modules|\/app\.js|\/core\.js/);
});
test('bundle metadata rejects static, dynamic and CommonJS external dependencies, not prose', async () => {
  for (const [contents, expected] of [
    ['console.log("import(...) and require(...)");', true],
    ['import value from "./asset.js"; console.log(value);', false],
    ['import("./asset.js");', false],
    ['require("./asset.js");', false],
  ] as const) {
    const result = await build({
      stdin: { contents, sourcefile: 'api/_lib/test.ts' }, bundle: true,
      format: 'iife', platform: 'browser', external: ['./asset.js'], write: false, metafile: true,
    });
    assert.equal(isSelfContained(result.metafile), expected, contents);
  }
});

test('Vercel builds only the TypeScript API function without a static builder', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.builds, [{ src: 'api/index.ts', use: '@vercel/node@13.0.0', config: { maxDuration: 15 } }]);
  assert.equal(config.outputDirectory, undefined);
  assert.equal(config.functions, undefined);
  assert.equal(config.buildCommand, undefined);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['vercel-build'], 'npm run build');
  for (const path of ['/', '/api', '/api/', '/index.html']) {
    assert.ok(config.rewrites.some((r: { source: string; destination: string }) => r.source === path && r.destination === '/api/index.ts'));
  }
});

// Include build/dev scripts and tests: moving only the runtime would leave unchecked JS.
test('all authored executable files are TypeScript and only api/index.ts is public', () => {
  for (const dir of ['api', 'scripts', 'tests']) {
    for (const file of sources(dir)) assert.ok(file.endsWith('.ts'), file);
  }
  assert.deepEqual(readdirSync('api').sort(), ['_lib', 'index.ts']);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.ok(pkg.scripts.test.includes('build/tests/*.test.js'));
  assert.doesNotMatch(readFileSync('scripts/dev.ts', 'utf8'), /readFile|createReadStream|public\//);
});

test('npm is pinned, with one lockfile and no production dependencies', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(pkg.packageManager, 'npm@12.0.2');
  assert.equal(pkg.engines.npm, '12.0.2');
  assert.equal(pkg.engines.node, '24.x');
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages['node_modules/image-size'], undefined);
  assert.equal(existsSync('yarn.lock'), false);
  assert.equal(existsSync('pnpm-lock.yaml'), false);
  assert.deepEqual(pkg.allowScripts, { 'esbuild@0.28.2': true });
  assert.match(readFileSync('.npmrc', 'utf8'), /strict-allow-scripts=true/);
  for (const command of Object.values(pkg.scripts)) assert.doesNotMatch(String(command), /\b(?:yarn|pnpm)\b/);
  assert.equal(pkg.scripts.check, 'npm run test');
});

test('CI and Vercel use the same npm version, clean install and TypeScript build', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.installCommand, 'npm install --global npm@12.0.2 && npm ci --include=dev');
  for (const name of ['ci', 'browser']) {
    const workflow = readFileSync(`.github/workflows/${name}.yml`, 'utf8');
    assert.match(workflow, /npm install --global npm@12\.0\.2/);
    assert.match(workflow, /npm ci --include=dev/);
    assert.match(workflow, /node-version: 24/);
    assert.match(workflow, /cache: npm/);
    assert.match(workflow, /run: npm run check/);
    assert.match(workflow, /git diff --exit-code -- package-lock\.json/);
    assert.doesNotMatch(workflow, /\b(?:yarn|pnpm)\b/);
  }
});
