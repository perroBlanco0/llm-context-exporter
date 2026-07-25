import assert from 'node:assert/strict';
import test from 'node:test';

import { collect, dedupeSelection } from '../core/collector';
import type { CollectOptions } from '../core/types';
import { createMemoryFileSystem } from './memoryFileSystem';

const ROOT = '/workspace';

const OPTIONS: CollectOptions = {
  respectGitignore: true,
  ignoreGlobs: ['**/.git/**'],
  binaryExtensions: ['.png'],
  detectBinaryContent: true,
  maxFileSizeKb: 1,
  maxTotalSizeMb: 1,
  maxFiles: 10,
  includeFileContents: true,
};

test('collects text files and skips gitignored ones', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/.gitignore': 'dist/\nsecret.txt\n',
    '/workspace/src/index.ts': 'export const a = 1;\n',
    '/workspace/src/util.ts': 'export const b = 2;\n',
    '/workspace/dist/index.js': 'compiled',
    '/workspace/secret.txt': 'nope',
  });

  const result = await collect(fs, ROOT, ['/workspace'], OPTIONS);

  assert.deepEqual(
    result.files.map((file) => file.relativePath),
    ['.gitignore', 'src/index.ts', 'src/util.ts'],
  );
  assert.equal(result.files[1].content, 'export const a = 1;\n');
});

test('nested .gitignore files apply relative to their directory', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/src/.gitignore': 'generated.ts\n',
    '/workspace/src/generated.ts': 'generated',
    '/workspace/src/keep.ts': 'keep',
    '/workspace/generated.ts': 'root level stays',
  });

  const result = await collect(fs, ROOT, ['/workspace'], OPTIONS);

  assert.deepEqual(
    result.files.map((file) => file.relativePath),
    ['generated.ts', 'src/.gitignore', 'src/keep.ts'],
  );
});

test('respectGitignore=false keeps ignored files but honours ignoreGlobs', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/.gitignore': 'dist/\n',
    '/workspace/dist/index.js': 'compiled',
    '/workspace/.git/config': 'internal',
  });

  const result = await collect(fs, ROOT, ['/workspace'], {
    ...OPTIONS,
    respectGitignore: false,
  });

  assert.deepEqual(
    result.files.map((file) => file.relativePath),
    ['.gitignore', 'dist/index.js'],
  );
});

test('skips binary extensions, binary content and oversized files', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/logo.png': 'not really a png',
    '/workspace/data.dat': 'abc\u0000def',
    '/workspace/big.txt': 'x'.repeat(2048),
    '/workspace/ok.txt': 'fine',
  });

  const result = await collect(fs, ROOT, ['/workspace'], OPTIONS);

  assert.deepEqual(
    result.files.map((file) => file.relativePath),
    ['ok.txt'],
  );
  assert.deepEqual(
    result.skipped.map((entry) => `${entry.relativePath}:${entry.reason}`).sort(),
    ['big.txt:too-large', 'data.dat:binary', 'logo.png:binary'],
  );
});

test('honours the file limit and reports truncation', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/a.txt': 'a',
    '/workspace/b.txt': 'b',
    '/workspace/c.txt': 'c',
  });

  const result = await collect(fs, ROOT, ['/workspace'], { ...OPTIONS, maxFiles: 2 });

  assert.equal(result.files.length, 2);
  assert.equal(result.truncated, true);
  assert.equal(result.skipped[0].reason, 'file-limit');
});

test('an explicitly selected file is included even when gitignored', async () => {
  const fs = createMemoryFileSystem({
    '/workspace/.gitignore': 'dist/\n',
    '/workspace/dist/index.js': 'compiled',
  });

  const result = await collect(fs, ROOT, ['/workspace/dist/index.js'], OPTIONS);

  assert.deepEqual(
    result.files.map((file) => file.relativePath),
    ['dist/index.js'],
  );
});

test('dedupeSelection drops paths already covered by a selected folder', () => {
  assert.deepEqual(
    dedupeSelection(['/workspace/src', '/workspace/src/index.ts', '/workspace/README.md']),
    ['/workspace/README.md', '/workspace/src'],
  );
});
