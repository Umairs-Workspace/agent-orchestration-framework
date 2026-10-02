// Build/staging paths follow locked package owners, including relocated apps.
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readYarnPackages } from './dependency-inventory.mjs';

function inside(root, target) {
  const rel = path.relative(root, target);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    throw new Error(`Package path escapes this checkout: ${target}`);
  }
  return target;
}

export function workspaceDirectory(root, name) {
  root = realpathSync(root);
  const pkg = readYarnPackages(readFileSync(path.join(root, 'yarn.lock'), 'utf8'))
    .find(pkg => pkg.workspace && pkg.name === name);
  if (!pkg) throw new Error(`Missing locked workspace ${name}`);
  const dir = inside(root, realpathSync(path.resolve(root, pkg.location)));
  if (JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== name) {
    throw new Error(`Workspace name mismatch for ${name}`);
  }
  return dir;
}

export function dependencyDirectory(root, owner, name) {
  const dir = workspaceDirectory(root, owner);
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (!(name in (pkg.dependencies ?? {}))) throw new Error(`${owner} does not own runtime dependency ${name}`);
  const require = createRequire(path.join(dir, 'package.json'));
  return inside(realpathSync(root), realpathSync(path.dirname(require.resolve(`${name}/package.json`))));
}

// WSL synchronization consumes the same locked owners; no ui/ or apps/ paths
// are hard-coded into the transport script.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== '--list') throw new Error('Usage: node scripts/workspace-paths.mjs --list');
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const pkg of readYarnPackages(readFileSync(path.join(root, 'yarn.lock'), 'utf8'))) {
    if (pkg.workspace && pkg.location !== '.') {
      console.log(path.relative(root, workspaceDirectory(root, pkg.name)).replaceAll('\\', '/'));
    }
  }
}
