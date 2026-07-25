import { extname } from './paths';

export function hasBinaryExtension(path: string, binaryExtensions: string[]): boolean {
  const extension = extname(path);
  if (!extension) {
    return false;
  }
  return binaryExtensions.some(
    (candidate) => normalizeExtension(candidate) === extension,
  );
}

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

/** Heuristic used by git: a NUL byte in the first 8k marks the file as binary. */
export function looksBinary(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 8000);
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) {
      return true;
    }
  }
  return false;
}

export function decodeText(bytes: Uint8Array): string | undefined {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    return undefined;
  }
}
