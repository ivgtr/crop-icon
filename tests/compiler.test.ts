import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('native compiler resolves project types from an external build config', () => {
  const directory = mkdtempSync(join(tmpdir(), 'crop-icon-types-'));
  try {
    // Vercel extends the project configuration from its own temporary directory.
    const config = join(directory, 'tsconfig.json');
    writeFileSync(config, JSON.stringify({
      extends: resolve('tsconfig.json'), compilerOptions: { noEmit: true },
      files: [resolve('api/index.ts')], include: [], exclude: [],
    }));
    execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '--project', config], {
      timeout: 10000, stdio: 'pipe',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
