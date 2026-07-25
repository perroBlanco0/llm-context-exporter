export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
}

/** Minimal file system abstraction so the core stays testable outside VS Code. */
export interface FileSystemAdapter {
  readDirectory(path: string): Promise<DirectoryEntry[]>;
  readFile(path: string): Promise<Uint8Array>;
  stat(path: string): Promise<{ size: number; isDirectory: boolean }>;
  exists(path: string): Promise<boolean>;
}

export interface CollectOptions {
  respectGitignore: boolean;
  ignoreGlobs: string[];
  binaryExtensions: string[];
  detectBinaryContent: boolean;
  maxFileSizeKb: number;
  maxTotalSizeMb: number;
  maxFiles: number;
  includeFileContents: boolean;
}

export type SkipReason =
  | 'binary'
  | 'too-large'
  | 'file-limit'
  | 'total-size-limit'
  | 'unreadable';

export interface CollectedFile {
  /** Absolute normalized path. */
  path: string;
  /** Path relative to the collection root, used for display. */
  relativePath: string;
  size: number;
  content?: string;
}

export interface SkippedFile {
  relativePath: string;
  reason: SkipReason;
  detail?: string;
}

export interface CollectionResult {
  root: string;
  files: CollectedFile[];
  skipped: SkippedFile[];
  totalBytes: number;
  truncated: boolean;
}
