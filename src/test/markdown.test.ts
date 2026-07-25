import assert from 'node:assert/strict';
import test from 'node:test';

import { fenceFor, renderMarkdown, withLineNumbers } from '../core/markdown';
import { renderTree } from '../core/tree';
import type { CollectionResult } from '../core/types';

const RESULT: CollectionResult = {
  root: '/workspace/demo',
  files: [
    {
      path: '/workspace/demo/src/index.ts',
      relativePath: 'src/index.ts',
      size: 20,
      content: 'export const a = 1;\n',
    },
    {
      path: '/workspace/demo/README.md',
      relativePath: 'README.md',
      size: 6,
      content: '# Demo\n',
    },
  ],
  skipped: [{ relativePath: 'logo.png', reason: 'binary' }],
  totalBytes: 26,
  truncated: false,
};

const OPTIONS = {
  includeTree: true,
  includeFileContents: true,
  includeLineNumbers: false,
  showSummary: true,
  header: '',
};

test('renders tree, contents and summary', () => {
  const markdown = renderMarkdown(RESULT, OPTIONS);

  assert.match(markdown, /^# Project context: demo/);
  assert.match(markdown, /## File tree/);
  assert.match(markdown, /### `src\/index\.ts`/);
  assert.match(markdown, /```typescript\nexport const a = 1;\n```/);
  assert.match(markdown, /- Files included: 2/);
  assert.match(markdown, /`logo\.png` — binary file/);
});

test('header is prepended and sections can be disabled', () => {
  const markdown = renderMarkdown(RESULT, {
    ...OPTIONS,
    includeTree: false,
    showSummary: false,
    header: 'Review this code.',
  });

  assert.match(markdown, /Review this code\./);
  assert.doesNotMatch(markdown, /## File tree/);
  assert.doesNotMatch(markdown, /## Summary/);
});

test('fences grow when the content contains backticks', () => {
  assert.equal(fenceFor('plain'), '```');
  assert.equal(fenceFor('a ``` b'), '````');
  assert.equal(fenceFor('a ````` b'), '``````');
});

test('line numbers are padded', () => {
  assert.equal(withLineNumbers('a\nb'), '1 | a\n2 | b');
});

test('tree renders directories before files', () => {
  const tree = renderTree('demo', ['README.md', 'src/index.ts', 'src/core/util.ts']);

  assert.equal(
    tree,
    [
      'demo/',
      '├── src/',
      '│   ├── core/',
      '│   │   └── util.ts',
      '│   └── index.ts',
      '└── README.md',
    ].join('\n'),
  );
});
