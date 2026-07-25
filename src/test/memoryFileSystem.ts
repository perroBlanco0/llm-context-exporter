import type { DirectoryEntry, FileSystemAdapter } from '../core/types';
import { dirname, normalizePath } from '../core/paths';

/** In-memory `FileSystemAdapter` used by the unit tests. */
export function createMemoryFileSystem(files: Record<string, string>): FileSystemAdapter {
  const contents = new Map<string, string>();
  const directories = new Set<string>();

  for (const [rawPath, content] of Object.entries(files)) {
    const path = normalizePath(rawPath);
    contents.set(path, content);
    let parent = dirname(path);
    while (parent && parent !== '/' && !directories.has(parent)) {
      directories.add(parent);
      parent = dirname(parent);
    }
  }

  const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

  return {
    async readDirectory(path: string): Promise<DirectoryEntry[]> {
      const prefix = `${normalizePath(path)}/`;
      const entries = new Map<string, DirectoryEntry>();
      for (const candidate of [...contents.keys(), ...directories]) {
        if (!candidate.startsWith(prefix)) {
          continue;
        }
        const rest = candidate.slice(prefix.length);
        const name = rest.split('/')[0];
        const child = `${prefix}${name}`;
        entries.set(name, { name, isDirectory: directories.has(child) });
      }
      return [...entries.values()];
    },

    async readFile(path: string): Promise<Uint8Array> {
      const content = contents.get(normalizePath(path));
      if (content === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return encode(content);
    },

    async stat(path: string): Promise<{ size: number; isDirectory: boolean }> {
      const normalized = normalizePath(path);
      if (directories.has(normalized)) {
        return { size: 0, isDirectory: true };
      }
      const content = contents.get(normalized);
      if (content === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return { size: encode(content).byteLength, isDirectory: false };
    },

    async exists(path: string): Promise<boolean> {
      const normalized = normalizePath(path);
      return contents.has(normalized) || directories.has(normalized);
    },
  };
}
