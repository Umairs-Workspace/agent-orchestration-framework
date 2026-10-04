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
      if (!targets.has(undefined)) links.set(file, targets.size === 1 ? [...targets][0] : Object.freeze([...targets]));
      continue;
    }
    // The complete configured-forward grammar also covers the CLI face entry.
    const remainder = clean
      .replace(/import\s*\{[\w\s,]+\}\s*from\s*['"][^'"]*application\/default(?:-[\w-]+)?\.mjs['"];?/gu, '')
      .replace(/export\s+const\s*\{[\w\s,:]+\}\s*=\s*\w+;?/gu, '')
      .replace(/export\s+const\s+\w+\s*=\s*\w+(?:\.\w+){1,2};?/gu, '')
      .replace(/export\s+default\s+\w+\.\w+;?/gu, '')
      .replace(/export\s*(?:\{[\w\s,]+\}|\*)\s*from\s*['"]@aof\/[^'"]+['"];?/gu, '')
      .replace(/export\s*\{[\w\s,]+\}\s*from\s*['"]\.\.?\/[^'"]+['"];?/gu, '').trim();
    if (remainder !== '' || !/import\s*\{[^}]+\}\s*from\s*['"][^'"]*application\/default/u.test(clean)) continue;
    const object = /export\s+const\s*\{[^}]+\}\s*=\s*(\w+)/u.exec(clean)?.[1];
    const service = object ?? /export\s+const\s+\w+\s*=\s*default\w+\.(\w+)\./u.exec(clean)?.[1] ?? /export\s+default\s+(\w+)\./u.exec(clean)?.[1];
    if (constructors.has(service)) links.set(file, constructors.get(service));
  }
  // Relative alias forwards (for example the former mesh log names) inherit
  // a destination already proved from the target's recorded configured source.
  for (const [file, source] of modules) {
    if (links.has(file)) continue;
    const clean = source.split(/\r?\n/u).filter(line => !/^\s*\/\//u.test(line)).join('\n').trim();
    const match = /^export\s*\{[\w\s,]+\}\s*from\s*['"](\.\.?\/[^'"]+)['"];?$/u.exec(clean);
    if (!match) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
    if (links.has(target)) links.set(file, links.get(target));
  }
  return links;
}

// A forward recorded in the rename ledger: `F\t<from>\t<to>[\t<to>…]`. A squash merge keeps only
// the ORIGINAL source of a module it deleted, never the forward it became on the branch, so the
// branch's links are derived once (with `moduleRelocations` and `relocationInputs` below) and
// recorded beside the renames (136/VERIFICATION F-136-01). A live derivation wins over a record.
export function parseForwardRecords(text) {
  const links = new Map();
  for (const line of String(text ?? '').split(/\r?\n/u)) {
    const match = /^F\t([^\t]+)\t(.+)$/u.exec(line);
    if (match == null || links.has(match[1])) continue;
    const targets = match[2].split('\t').map(target => target.trim()).filter(Boolean);
    if (targets.length) links.set(match[1], targets.length === 1 ? targets[0] : Object.freeze(targets));
  }
  return links;
}

export function forwardRecords(links) {
  return [...links].map(([file, target]) => ['F', file, ...(Array.isArray(target) ? target : [target])].join('\t'));
}

export async function readCitationHistory(projectRoot, runGit) {
  const ledger = await readFile(path.join(projectRoot, ...RENAME_LEDGER_PATH), 'utf8').catch(() => '');
  const live = await runGit([...RENAME_LOG_ARGS]);
  const renameMap = buildRenameMap(parseRenameRecords(`${live}\n${ledger}`));
  // The working-tree deletion patch carries HEAD's committed source. Including it
  // lets a removal be checked before its commit without inventing a rename record.
  const history = await runGit(['log', '--format=', '--diff-filter=D', '-p', '--', 'packages/core/src']);
  const pending = await runGit(['diff', '--no-ext-diff', '--unified=10000', '--', 'packages/core/src']);
  const links = moduleRelocations(deletedModules(`${pending}\n${history}`), await relocationInputs(projectRoot));
  for (const [file, target] of parseForwardRecords(ledger)) if (!links.has(file)) links.set(file, target);
  renameMap.moduleLinks = links;
  return renameMap;
}

// Today's public exports and constructor homes: what a deleted forward is resolved against.
export async function relocationInputs(projectRoot) {
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
  return { exports, constructors: constructorHomes(sources) };
}
