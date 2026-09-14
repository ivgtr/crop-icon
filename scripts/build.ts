import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Invoked only after strict tsc checks and esbuild. Build artifacts are never public.
const root = process.cwd();
interface Metadata {
  inputs: Record<string, unknown>;
  outputs: Record<string, { imports: unknown[] }>;
}
const metadata: Metadata = JSON.parse(await readFile(resolve(root, 'build/editor.meta.json'), 'utf8'));
if (Object.keys(metadata.outputs).length !== 1) throw new Error('Expected one self-contained editor bundle.');
for (const input of Object.keys(metadata.inputs)) {
  if (!input.startsWith('api/_lib/') || !input.endsWith('.ts')) {
    throw new Error(`Editor dependency is not an _lib TypeScript module: ${input}`);
  }
}
for (const output of Object.values(metadata.outputs)) {
  if (output.imports.length) throw new Error('External browser imports are not allowed.');
}
const script = (await readFile(resolve(root, 'build/editor.js'), 'utf8')).replace(/\r\n?/g, '\n');
if (/<\/script|<!--/i.test(script)) throw new Error('Editor bundle is unsafe to embed in HTML.');
await mkdir(resolve(root, 'api/_lib/generated'), { recursive: true });
await writeFile(resolve(root, 'api/_lib/generated/editor.ts'),
  '// Generated from api/_lib/editor/*.ts. Do not edit this build artifact.\n' +
  `export const inlineScript: string = ${JSON.stringify(script)};\n`);
// Vercel's static output is deliberately empty. Only api/index.ts serves requests.
await rm(resolve(root, 'build/static'), { recursive: true, force: true });
await mkdir(resolve(root, 'build/static'), { recursive: true });
