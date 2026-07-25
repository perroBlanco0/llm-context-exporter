import * as vscode from 'vscode';

import type { CollectOptions } from './core/types';
import type { RenderOptions } from './core/markdown';

export interface Settings extends CollectOptions {
  render: RenderOptions;
}

export function readSettings(scope?: vscode.Uri): Settings {
  const configuration = vscode.workspace.getConfiguration('llmContextBuilder', scope);
  const includeFileContents = configuration.get<boolean>('includeFileContents', true);

  return {
    respectGitignore: configuration.get<boolean>('respectGitignore', true),
    ignoreGlobs: configuration.get<string[]>('ignoreGlobs', []),
    binaryExtensions: configuration.get<string[]>('binaryExtensions', []),
    detectBinaryContent: configuration.get<boolean>('detectBinaryContent', true),
    maxFileSizeKb: configuration.get<number>('maxFileSizeKb', 256),
    maxTotalSizeMb: configuration.get<number>('maxTotalSizeMb', 5),
    maxFiles: configuration.get<number>('maxFiles', 500),
    includeFileContents,
    render: {
      includeTree: configuration.get<boolean>('includeTree', true),
      includeFileContents,
      includeLineNumbers: configuration.get<boolean>('includeLineNumbers', false),
      showSummary: configuration.get<boolean>('showSummary', true),
      header: configuration.get<string>('header', ''),
    },
  };
}
