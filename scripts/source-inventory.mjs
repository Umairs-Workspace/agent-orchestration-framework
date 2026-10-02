import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readYarnPackages } from './dependency-inventory.mjs';
import { workspaceDirectory } from './workspace-paths.mjs';

// Locked owners determine the source surfaces, including app workspaces after a move.
// Skip dependency/build trees by location; an actual src/commands/assets directory is code.
export function workspaceSourceRoots(root) {
  return readYarnPackages(readFileSync(path.join(root, 'yarn.lock'), 'utf8'))
    .filter(entry => entry.workspace && entry.location !== '.')
    .flatMap(entry => {
      const owner = workspaceDirectory(root, entry.name);
      return ['src', 'bin'].filter(name => existsSync(path.join(owner, name)))
        .map(name => ({ owner: entry.name, directory: path.relative(root, path.join(owner, name)).replaceAll('\\', '/') }));
    });
}

export function sourceFiles(root, surfaces = workspaceSourceRoots(root)) {
  const files = [];
  const seen = new Set();
  const workspace = realpathSync(root);
  function walk(directory, owner) {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (['node_modules', '.git', 'target', 'dist', 'coverage'].includes(entry.name)) continue;
      const relative = `${directory}/${entry.name}`;
      const full = realpathSync(path.join(root, relative));
      const containment = path.relative(workspace, full);
      if (containment === '..' || containment.startsWith('..' + path.sep) || path.isAbsolute(containment)) throw Error(`Source escapes workspace: ${relative}`);
      if (entry.isDirectory()) walk(relative, owner);
      else if (/\.(?:[cm]?js|[cm]ts|jsx|tsx?)$/u.test(entry.name) && !seen.has(full)) {
        seen.add(full); files.push({ owner, rel: relative, path: full });
      }
    }
  }
  for (const { directory, owner } of surfaces) walk(directory, owner);
  return files.sort((a, b) => a.rel.localeCompare(b.rel));
}
