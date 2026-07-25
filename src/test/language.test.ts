import assert from 'node:assert/strict';
import test from 'node:test';

import { languageFor } from '../core/language';

test('maps known extensions, including plain text ones', () => {
  assert.equal(languageFor('/a/b/index.ts'), 'typescript');
  assert.equal(languageFor('/a/b/notes.txt'), 'text');
  assert.equal(languageFor('/a/b/server.LOG'), 'text');
  assert.equal(languageFor('/a/b/data.csv'), 'csv');
});

test('maps well-known file names and falls back to no language', () => {
  assert.equal(languageFor('/a/b/Dockerfile'), 'dockerfile');
  assert.equal(languageFor('/a/b/.editorconfig'), 'ini');
  assert.equal(languageFor('/a/b/unknown.xyz'), '');
});
