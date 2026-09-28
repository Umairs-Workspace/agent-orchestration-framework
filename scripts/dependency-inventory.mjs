import { readFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseSyml } from '@yarnpkg/parsers';

// Read every locked platform, including optional dependencies absent on this machine.
export function readYarnPackages(source) {
  const lock = parseSyml(source);
  if (!lock?.__metadata?.version) throw new Error('Expected a modern Yarn lockfile');
  const packages = Object.entries(lock).filter(([key]) => key !== '__metadata').map(([, entry]) => {
    if (!entry?.resolution || !entry.version) throw new Error('Invalid Yarn package entry');
    let locator = entry.resolution;
    const separator = locator.indexOf('@', 1);
    if (separator < 1) throw new Error('Invalid Yarn package locator');
    const name = locator.slice(0, separator);
    let reference = locator.slice(separator + 1);
    if (reference.startsWith('patch:')) {
      locator = decodeURIComponent(reference.slice(6).split('#')[0]);
      reference = locator.slice(locator.indexOf('@', 1) + 1);
    }
    return { name, version: String(entry.version), workspace: reference.startsWith('workspace:'),
      registry: reference.startsWith('npm:') && !reference.includes('__archiveUrl='),
      location: reference.startsWith('workspace:') ? reference.slice(10) : null };
  });
  if (!packages.length) throw new Error('Yarn lockfile contains no packages');
  return packages;
}

// Yarn's node-modules linker records all actual locations, including nested copies and workspaces.
export function installedManifests(root) {
  root = realpathSync(root);
  const state = parseSyml(readFileSync(path.join(root, 'node_modules/.yarn-state.yml'), 'utf8'));
  const result = [];
  for (const [locator, entry] of Object.entries(state)) {
    if (locator === '__metadata') continue;
    for (const location of entry.locations ?? []) {
      const file = path.resolve(root, location, 'package.json');
      const relative = path.relative(root, realpathSync(file));
      if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Installed package escapes repository');
      result.push({ location, manifest: JSON.parse(readFileSync(file, 'utf8')) });
    }
  }
  if (!result.length) throw new Error('Yarn installed-package inventory is empty');
  return result;
}

// Follow Node's actual installation layout without invoking npm or importing package code.
// Keep installation paths (including nested versions), not just package names.
export function productionDependencyDirs(root) {
  root = realpathSync(root);
  const found = new Set();
  function visit(owner) {
    const pkg = JSON.parse(readFileSync(path.join(owner, 'package.json'), 'utf8'));
    const dependencies = { ...pkg.peerDependencies, ...pkg.dependencies, ...pkg.optionalDependencies };
    for (const name of Object.keys(dependencies)) {
      let dir = owner, target;
      while (true) {
        // NODE_MODULES_PATHS skips adding node_modules to a directory already named that.
        if (path.basename(dir) !== 'node_modules') {
          const candidate = path.join(dir, 'node_modules', name);
          if (existsSync(path.join(candidate, 'package.json'))) { target = candidate; break; }
        }
        if (dir === root) break;
        const parent = path.dirname(dir);
        if (parent === dir || !parent.startsWith(root)) break;
        dir = parent;
      }
      if (!target) {
        if (name in (pkg.optionalDependencies ?? {}) || pkg.peerDependenciesMeta?.[name]?.optional) continue;
        throw new Error(`Missing production dependency ${name} required by ${pkg.name}`);
      }
      // Workspace payload staging will be introduced with extraction. Refuse to silently omit it.
      if (!realpathSync(target).startsWith(path.join(root, 'node_modules') + path.sep)) {
        throw new Error(`Production workspace ${name} needs explicit payload staging`);
      }
      if (found.has(target)) continue;
      found.add(target);
      visit(target);
    }
  }
  visit(root);
  return [...found].sort();
}
