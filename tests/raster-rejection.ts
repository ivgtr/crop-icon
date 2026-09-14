import assert from 'node:assert/strict';
import { inspectImage, SourceError } from '../api/_lib/source.js';

assert.throws(() => inspectImage(Buffer.from(process.argv[2] ?? '', 'hex')),
  (error: unknown) => error instanceof SourceError && error.code === 'invalid_image');
