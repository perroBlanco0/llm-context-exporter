/** Path helpers working on normalized, forward-slash separated absolute paths. */

export function normalizePath(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return normalized.length > 1 && normalized.endsWith('/')
    ? normalized.slice(0, -1)
    : normalized;
}

export function joinPath(parent: string, child: string): string {
  return parent.endsWith('/') ? `${parent}${child}` : `${parent}/${child}`;
}

export function dirname(value: string): string {
  const index = value.lastIndexOf('/');
  if (index <= 0) {
    return index === 0 ? '/' : value;
  }
  return value.slice(0, index);
}

export function basename(value: string): string {
  const index = value.lastIndexOf('/');
  return index === -1 ? value : value.slice(index + 1);
}

export function extname(value: string): string {
  const name = basename(value);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index).toLowerCase();
}

export function isSubPath(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

/** Returns `child` relative to `parent`, or `undefined` when it is not contained. */
export function relativePath(parent: string, child: string): string | undefined {
  if (child === parent) {
    return '';
  }
  return child.startsWith(`${parent}/`) ? child.slice(parent.length + 1) : undefined;
}

/** Ancestor directories of `child` inside `root`, from `root` down to `child`. */
export function ancestorChain(root: string, child: string): string[] {
  const relative = relativePath(root, child);
  if (relative === undefined) {
    return [];
  }
  const chain = [root];
  let current = root;
  for (const segment of relative.split('/').filter(Boolean)) {
    current = joinPath(current, segment);
    chain.push(current);
  }
  return chain;
}
