interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
}

/** Renders an ASCII tree (`├──`/`└──`) from a list of relative file paths. */
export function renderTree(rootName: string, relativePaths: string[]): string {
  const root: TreeNode = { name: rootName, children: new Map() };
  for (const relative of relativePaths) {
    let current = root;
    for (const segment of relative.split('/').filter(Boolean)) {
      let child = current.children.get(segment);
      if (!child) {
        child = { name: segment, children: new Map() };
        current.children.set(segment, child);
      }
      current = child;
    }
  }

  const lines = [`${rootName}/`];
  renderChildren(root, '', lines);
  return lines.join('\n');
}

function renderChildren(node: TreeNode, prefix: string, lines: string[]): void {
  const children = [...node.children.values()].sort(compareNodes);
  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    const isDirectory = child.children.size > 0;
    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${child.name}${isDirectory ? '/' : ''}`);
    renderChildren(child, `${prefix}${isLast ? '    ' : '│   '}`, lines);
  });
}

function compareNodes(left: TreeNode, right: TreeNode): number {
  const leftIsDirectory = left.children.size > 0;
  const rightIsDirectory = right.children.size > 0;
  if (leftIsDirectory !== rightIsDirectory) {
    return leftIsDirectory ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}
