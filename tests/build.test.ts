import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { inlineScript } from '../api/_lib/generated/editor.js';

// Inspect syntax rather than UI strings such as "PNG export failed".
function hasModuleSyntax(code: string): boolean {
  const file = ts.createSourceFile('inline.js', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  let found = false;
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExportAssignment(node) ||
        node.kind === ts.SyntaxKind.ExportKeyword ||
        (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require')))) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
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
  assert.equal(hasModuleSyntax(inlineScript), false);
  assert.doesNotMatch(inlineScript, /node:|loadRemote|node_modules|\/app\.js|\/core\.js/);
});
test('module syntax checks ignore prose but reject actual module dependencies', () => {
  assert.equal(hasModuleSyntax('throw new Error("PNG export failed. Try a smaller output size.");'), false);
  assert.equal(hasModuleSyntax('const message = "import(...) and require(...)";'), false);
  for (const code of [
    'import value from "./asset.js";',
    'export const value = 1;',
    'export { value } from "./asset.js";',
    'export default 1;',
    'import("./asset.js");',
    'require("./asset.js");',
  ]) assert.equal(hasModuleSyntax(code), true, code);
});

test('Vercel builds only the TypeScript API function without a static builder', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.builds, [{ src: 'api/index.ts', use: '@vercel/node', config: { maxDuration: 15 } }]);
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
