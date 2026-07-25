import { formatBytes } from './collector';
import { languageFor } from './language';
import { basename } from './paths';
import { renderTree } from './tree';
import type { CollectionResult, SkipReason } from './types';

export interface RenderOptions {
  includeTree: boolean;
  includeFileContents: boolean;
  includeLineNumbers: boolean;
  showSummary: boolean;
  header: string;
  title?: string;
}

const SKIP_LABELS: Record<SkipReason, string> = {
  binary: 'binary file',
  'too-large': 'exceeds the per-file size limit',
  'file-limit': 'file limit reached',
  'total-size-limit': 'total size limit reached',
  unreadable: 'could not be read',
};

export function renderMarkdown(result: CollectionResult, options: RenderOptions): string {
  const title = options.title ?? basename(result.root);
  const sections: string[] = [`# Project context: ${title}`];

  if (options.header.trim()) {
    sections.push(options.header.trim());
  }

  if (options.includeTree) {
    const tree = renderTree(title, result.files.map((file) => file.relativePath));
    sections.push(['## File tree', '', '```text', tree, '```'].join('\n'));
  }

  if (options.includeFileContents && result.files.length > 0) {
    sections.push('## Files');
    for (const file of result.files) {
      const body = file.content ?? '';
      const content = options.includeLineNumbers ? withLineNumbers(body) : body;
      const fence = fenceFor(content);
      sections.push(
        [
          `### \`${file.relativePath}\``,
          '',
          `${fence}${languageFor(file.path)}`,
          content.replace(/\n$/, ''),
          fence,
        ].join('\n'),
      );
    }
  }

  if (options.showSummary) {
    sections.push(renderSummary(result));
  }

  return `${sections.join('\n\n')}\n`;
}

function renderSummary(result: CollectionResult): string {
  const lines = [
    '## Summary',
    '',
    `- Files included: ${result.files.length}`,
    `- Total size: ${formatBytes(result.totalBytes)}`,
  ];
  if (result.truncated) {
    lines.push('- Output truncated because a configured limit was reached.');
  }
  if (result.skipped.length > 0) {
    lines.push('', '<details>', `<summary>Skipped files (${result.skipped.length})</summary>`, '');
    for (const skipped of result.skipped) {
      const detail = skipped.detail ? `, ${skipped.detail}` : '';
      lines.push(`- \`${skipped.relativePath}\` — ${SKIP_LABELS[skipped.reason]}${detail}`);
    }
    lines.push('', '</details>');
  }
  return lines.join('\n');
}

/** Picks a fence long enough to safely wrap content that contains backticks. */
export function fenceFor(content: string): string {
  const longest = [...content.matchAll(/`+/g)].reduce(
    (max, match) => Math.max(max, match[0].length),
    0,
  );
  return '`'.repeat(Math.max(3, longest + 1));
}

export function withLineNumbers(content: string): string {
  const lines = content.split('\n');
  const width = String(lines.length).length;
  return lines
    .map((line, index) => `${String(index + 1).padStart(width, ' ')} | ${line}`)
    .join('\n');
}
