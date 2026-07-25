import * as vscode from 'vscode';

import { collect, formatBytes } from './core/collector';
import { renderMarkdown } from './core/markdown';
import { basename, dirname, joinPath, normalizePath } from './core/paths';
import type { CollectionResult } from './core/types';
import { readSettings } from './settings';
import { vscodeFileSystem } from './vscodeFileSystem';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'llmContextBuilder.copyForLLMPrompt',
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => copyToClipboard(resolveSelection(uri, uris)),
    ),
    vscode.commands.registerCommand(
      'llmContextBuilder.exportForLLMPrompt',
      (uri?: vscode.Uri, uris?: vscode.Uri[]) => exportToFile(resolveSelection(uri, uris)),
    ),
    vscode.commands.registerCommand('llmContextBuilder.copyWorkspaceForLLMPrompt', () =>
      copyToClipboard((vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri)),
    ),
  );
}

export function deactivate(): void {
  // Nothing to dispose: all resources live in the extension context subscriptions.
}

function resolveSelection(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  if (uris && uris.length > 0) {
    return uris;
  }
  if (uri) {
    return [uri];
  }
  const active = vscode.window.activeTextEditor?.document.uri;
  return active ? [active] : [];
}

async function copyToClipboard(selection: vscode.Uri[]): Promise<void> {
  const built = await build(selection);
  if (!built) {
    return;
  }
  await vscode.env.clipboard.writeText(built.markdown);
  await notify(built.result, 'copied to the clipboard', built.markdown);
}

async function exportToFile(selection: vscode.Uri[]): Promise<void> {
  const built = await build(selection);
  if (!built) {
    return;
  }
  const defaultName = `${basename(built.result.root) || 'llm'}-context.md`;
  const target = await vscode.window.showSaveDialog({
    title: 'Export LLM context',
    filters: { Markdown: ['md'] },
    defaultUri: vscode.Uri.file(joinPath(built.result.root, defaultName)),
  });
  if (!target) {
    return;
  }
  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(built.markdown));
  await vscode.window.showTextDocument(target);
  await notify(built.result, `saved to ${basename(target.fsPath)}`);
}

interface BuildResult {
  markdown: string;
  result: CollectionResult;
}

async function build(selection: vscode.Uri[]): Promise<BuildResult | undefined> {
  const paths = selection
    .filter((uri) => uri.scheme === 'file')
    .map((uri) => normalizePath(uri.fsPath));
  if (paths.length === 0) {
    void vscode.window.showWarningMessage(
      'LLM Context Builder: select one or more files or folders in the explorer first.',
    );
    return undefined;
  }

  const settings = readSettings(selection[0]);
  const root = resolveRoot(selection[0], paths);

  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Building LLM context…' },
    () => collect(vscodeFileSystem, root, paths, settings),
  );

  if (result.files.length === 0) {
    void vscode.window.showWarningMessage(
      'LLM Context Builder: no readable text files found in the selection (check your ignore settings).',
    );
    return undefined;
  }

  return { markdown: renderMarkdown(result, settings.render), result };
}

function resolveRoot(reference: vscode.Uri, paths: string[]): string {
  const folder = vscode.workspace.getWorkspaceFolder(reference);
  if (folder) {
    return normalizePath(folder.uri.fsPath);
  }
  return paths.length === 1 ? dirname(paths[0]) : commonAncestor(paths);
}

export function commonAncestor(paths: string[]): string {
  const split = paths.map((path) => path.split('/'));
  const shortest = Math.min(...split.map((segments) => segments.length));
  const common: string[] = [];
  for (let index = 0; index < shortest; index += 1) {
    const segment = split[0][index];
    if (split.every((segments) => segments[index] === segment)) {
      common.push(segment);
    } else {
      break;
    }
  }
  return common.join('/') || '/';
}

async function notify(
  result: CollectionResult,
  action: string,
  markdown?: string,
): Promise<void> {
  const skipped = result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : '';
  const message = `LLM Context Builder: ${result.files.length} files (${formatBytes(
    result.totalBytes,
  )})${skipped} ${action}.`;
  const choice = markdown
    ? await vscode.window.showInformationMessage(message, 'Preview')
    : await vscode.window.showInformationMessage(message);
  if (choice === 'Preview' && markdown) {
    const document = await vscode.workspace.openTextDocument({
      content: markdown,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(document, { preview: true });
  }
}
