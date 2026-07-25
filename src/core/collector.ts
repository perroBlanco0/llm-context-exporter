import { decodeText, hasBinaryExtension, looksBinary } from './binary';
import { IgnoreEngine } from './ignore';
import { basename, dirname, isSubPath, joinPath, normalizePath, relativePath } from './paths';
import type {
  CollectOptions,
  CollectedFile,
  CollectionResult,
  FileSystemAdapter,
  SkippedFile,
} from './types';

/**
 * Walks the selected files and folders, applying the ignore rules and size
 * limits, and returns the files (with their contents) in a stable order.
 */
export async function collect(
  fs: FileSystemAdapter,
  root: string,
  selection: string[],
  options: CollectOptions,
): Promise<CollectionResult> {
  const normalizedRoot = normalizePath(root);
  const engine = new IgnoreEngine(fs, normalizedRoot, {
    respectGitignore: options.respectGitignore,
    globs: options.ignoreGlobs,
  });

  const files: CollectedFile[] = [];
  const skipped: SkippedFile[] = [];
  const visited = new Set<string>();
  const maxFileSize = options.maxFileSizeKb > 0 ? options.maxFileSizeKb * 1024 : Infinity;
  const maxTotalSize = options.maxTotalSizeMb > 0 ? options.maxTotalSizeMb * 1024 * 1024 : Infinity;
  const maxFiles = options.maxFiles > 0 ? options.maxFiles : Infinity;

  let totalBytes = 0;
  let truncated = false;

  const display = (path: string): string =>
    relativePath(normalizedRoot, path) ?? basename(path);

  const addFile = async (path: string, size: number): Promise<void> => {
    if (files.length >= maxFiles) {
      truncated = true;
      skipped.push({ relativePath: display(path), reason: 'file-limit' });
      return;
    }
    if (size > maxFileSize) {
      skipped.push({
        relativePath: display(path),
        reason: 'too-large',
        detail: formatBytes(size),
      });
      return;
    }
    if (hasBinaryExtension(path, options.binaryExtensions)) {
      skipped.push({ relativePath: display(path), reason: 'binary' });
      return;
    }
    if (!options.includeFileContents) {
      files.push({ path, relativePath: display(path), size });
      return;
    }
    if (totalBytes + size > maxTotalSize) {
      truncated = true;
      skipped.push({ relativePath: display(path), reason: 'total-size-limit' });
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = await fs.readFile(path);
    } catch (error) {
      skipped.push({
        relativePath: display(path),
        reason: 'unreadable',
        detail: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (options.detectBinaryContent && looksBinary(bytes)) {
      skipped.push({ relativePath: display(path), reason: 'binary' });
      return;
    }
    const content = decodeText(bytes);
    if (content === undefined) {
      skipped.push({ relativePath: display(path), reason: 'binary' });
      return;
    }

    totalBytes += bytes.byteLength;
    files.push({ path, relativePath: display(path), size: bytes.byteLength, content });
  };

  const walk = async (directory: string): Promise<void> => {
    await engine.load(directory);
    let entries;
    try {
      entries = await fs.readDirectory(directory);
    } catch (error) {
      skipped.push({
        relativePath: display(directory),
        reason: 'unreadable',
        detail: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const sorted = [...entries].sort(compareEntries);
    for (const entry of sorted) {
      const child = joinPath(directory, entry.name);
      if (visited.has(child) || engine.isIgnored(child, entry.isDirectory)) {
        continue;
      }
      visited.add(child);
      if (entry.isDirectory) {
        await walk(child);
      } else {
        const stat = await safeStat(fs, child);
        await addFile(child, stat?.size ?? 0);
      }
    }
  };

  for (const rawPath of dedupeSelection(selection)) {
    const path = normalizePath(rawPath);
    const stat = await safeStat(fs, path);
    if (!stat) {
      skipped.push({ relativePath: display(path), reason: 'unreadable' });
      continue;
    }
    await engine.load(stat.isDirectory ? path : dirname(path));
    if (engine.isIgnored(path, stat.isDirectory) && !isExplicitFile(selection, path)) {
      continue;
    }
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);
    if (stat.isDirectory) {
      await walk(path);
    } else {
      await addFile(path, stat.size);
    }
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { root: normalizedRoot, files, skipped, totalBytes, truncated };
}

/** Removes selected paths already contained in another selected folder. */
export function dedupeSelection(selection: string[]): string[] {
  const normalized = [...new Set(selection.map(normalizePath))].sort();
  return normalized.filter(
    (path) => !normalized.some((other) => other !== path && isSubPath(other, path)),
  );
}

function isExplicitFile(selection: string[], path: string): boolean {
  return selection.map(normalizePath).includes(path);
}

function compareEntries(
  left: { name: string; isDirectory: boolean },
  right: { name: string; isDirectory: boolean },
): number {
  if (left.isDirectory !== right.isDirectory) {
    return left.isDirectory ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

async function safeStat(
  fs: FileSystemAdapter,
  path: string,
): Promise<{ size: number; isDirectory: boolean } | undefined> {
  try {
    return await fs.stat(path);
  } catch {
    return undefined;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
