import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { RENAME_LEDGER_PATH, RENAME_LOG_ARGS, buildRenameMap, parseRenameRecords } from './cited-path-resolve.mjs';

// A retired forwarding module is not a Git rename. Derive its destination from the
// committed deleted source and today's explicit exports or actual constructor calls.
// This reads source as text; it never imports or executes the project being inspected.
export function deletedModules(patch) {
  const modules = new Map();
  for (const block of String(patch).split(/^diff --git /mu).slice(1)) {
    const file = /^a\/(\S+) b\/\S+\r?$/mu.exec(block)?.[1];
    if (!file || !/^deleted file mode /mu.test(block)) continue;
    const source = block.split(/\r?\n/u).filter(line => line.startsWith('-') && !line.startsWith('---')).map(line => line.slice(1)).join('\n');
    if (!modules.has(file)) modules.set(file, source); // newest recorded deletion wins
  }
  return modules;
}

export function constructorHomes(sources) {
  const homes = new Map();
  for (const { file, source } of sources) {
    const imports = new Map([...source.matchAll(/import\s*\{\s*(assemble\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/gu)].map(([, name, from]) => [name, path.posix.normalize(path.posix.join(path.posix.dirname(file), from))]));
    for (const [, instance, factory] of source.matchAll(/const\s+(\w+)\s*=\s*(assemble\w+)\s*\(/gu)) {
      if (imports.has(factory)) homes.set(instance, imports.get(factory));
    }
  }
  return homes;
}

export function moduleRelocations(modules, { exports, constructors }) {
  const links = new Map();
  for (const [file, source] of modules) {
    // Recognize an entirely declarative public forward, not arbitrary project code.
    // Only standalone comment lines are admitted by this forwarding grammar;
    // comment-looking text inside a statement is never stripped or executed.
    const clean = source.split(/\r?\n/u).filter(line => !/^\s*\/\//u.test(line)).join('\n').trim();
    const statements = [...clean.matchAll(/export\s*(?:\{[^}]+\}|\*)\s*from\s*['"](@aof\/[^'"]+)['"];?/gu)];
    if (statements.length && clean.replace(/export\s*(?:\{[^}]+\}|\*)\s*from\s*['"]@aof\/[^'"]+['"];?/gu, '').trim() === '') {
      const targets = new Set(statements.map(match => exports.get(match[1])));
      if (targets.size === 1 && !targets.has(undefined)) links.set(file, [...targets][0]);
      continue;
    }
    if (!source.includes('Compatibility entry; construction belongs to core application assembly.')) continue;
    const object = /export\s+const\s*\{[^}]+\}\s*=\s*(\w+)/u.exec(clean)?.[1];
    const service = object ?? /export\s+const\s+\w+\s*=\s*default\w+\.(\w+)\./u.exec(clean)?.[1];
    if (constructors.has(service)) links.set(file, constructors.get(service));
  }
  return links;
}

export async function readCitationHistory(projectRoot, runGit) {
  const ledger = await readFile(path.join(projectRoot, ...RENAME_LEDGER_PATH), 'utf8').catch(() => '');
  const live = await runGit([...RENAME_LOG_ARGS]);
  const renameMap = buildRenameMap(parseRenameRecords(`${live}\n${ledger}`));
  // The working-tree deletion patch carries HEAD's committed source. Including it
  // lets a removal be checked before its commit without inventing a rename record.
  const history = await runGit(['log', '--format=', '--diff-filter=D', '-p', '--', 'packages/core/src']);
  const pending = await runGit(['diff', '--no-ext-diff', '--unified=10000', '--', 'packages/core/src']);
  const exports = new Map();
  for (const owner of await readdir(path.join(projectRoot, 'packages')).catch(() => [])) {
    const manifest = await readFile(path.join(projectRoot, 'packages', owner, 'package.json'), 'utf8').then(JSON.parse).catch(() => null);
    for (const [entry, target] of Object.entries(manifest?.exports ?? {})) {
      if (typeof target !== 'string' || !target.startsWith('./') || target.includes('..') || entry.includes('*')) continue;
      exports.set(`${manifest.name}${entry === '.' ? '' : entry.slice(1)}`, path.posix.join('packages', owner, target));
    }
  }
  const assemblyDir = path.join(projectRoot, 'packages/core/src/application');
  const sources = [];
  for (const name of await readdir(assemblyDir).catch(() => [])) {
    if (!name.endsWith('.mjs')) continue;
    sources.push({ file: `packages/core/src/application/${name}`, source: await readFile(path.join(assemblyDir, name), 'utf8') });
  }
  renameMap.moduleLinks = moduleRelocations(deletedModules(`${pending}\n${history}`), { exports, constructors: constructorHomes(sources) });
  return renameMap;
}
