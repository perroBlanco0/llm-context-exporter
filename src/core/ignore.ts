import ignore, { type Ignore } from 'ignore';

import type { FileSystemAdapter } from './types';
import { ancestorChain, dirname, joinPath, relativePath } from './paths';

/**
 * Evaluates `.gitignore` files the same way git does: every `.gitignore`
 * between the workspace root and the inspected path contributes patterns that
 * are matched against the path relative to that `.gitignore`.
 */
export class IgnoreEngine {
  private readonly matchers = new Map<string, Ignore | undefined>();
  private readonly global: Ignore;

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly root: string,
    private readonly options: { respectGitignore: boolean; globs: string[] },
  ) {
    this.global = ignore().add(options.globs);
  }

  /** Loads the `.gitignore` files from the root down to `directory`. */
  async load(directory: string): Promise<void> {
    if (!this.options.respectGitignore) {
      return;
    }
    for (const dir of ancestorChain(this.root, directory)) {
      if (this.matchers.has(dir)) {
        continue;
      }
      this.matchers.set(dir, await this.readGitignore(dir));
    }
  }

  isIgnored(path: string, isDirectory: boolean): boolean {
    const fromRoot = relativePath(this.root, path);
    if (fromRoot === undefined || fromRoot === '') {
      return false;
    }
    const candidate = isDirectory ? `${fromRoot}/` : fromRoot;
    if (this.global.ignores(candidate)) {
      return true;
    }
    if (!this.options.respectGitignore) {
      return false;
    }
    for (const dir of ancestorChain(this.root, dirname(path))) {
      const matcher = this.matchers.get(dir);
      if (!matcher) {
        continue;
      }
      const relative = relativePath(dir, path);
      if (relative === undefined || relative === '') {
        continue;
      }
      if (matcher.ignores(isDirectory ? `${relative}/` : relative)) {
        return true;
      }
    }
    return false;
  }

  private async readGitignore(directory: string): Promise<Ignore | undefined> {
    const file = joinPath(directory, '.gitignore');
    if (!(await this.fs.exists(file))) {
      return undefined;
    }
    try {
      const bytes = await this.fs.readFile(file);
      return ignore().add(new TextDecoder().decode(bytes));
    } catch {
      return undefined;
    }
  }
}
