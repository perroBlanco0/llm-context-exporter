import * as vscode from 'vscode';

import type { DirectoryEntry, FileSystemAdapter } from './core/types';

/** `FileSystemAdapter` backed by `vscode.workspace.fs` (works on remote/virtual workspaces). */
export const vscodeFileSystem: FileSystemAdapter = {
  async readDirectory(path: string): Promise<DirectoryEntry[]> {
    const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(path));
    return entries.map(([name, type]) => ({
      name,
      isDirectory: (type & vscode.FileType.Directory) !== 0,
    }));
  },

  async readFile(path: string): Promise<Uint8Array> {
    return vscode.workspace.fs.readFile(vscode.Uri.file(path));
  },

  async stat(path: string): Promise<{ size: number; isDirectory: boolean }> {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path));
    return {
      size: stat.size,
      isDirectory: (stat.type & vscode.FileType.Directory) !== 0,
    };
  },

  async exists(path: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(path));
      return true;
    } catch {
      return false;
    }
  },
};
