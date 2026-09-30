import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import { workspaceTestInventory } from './workspace-tests.mjs';
import { runCases } from './test-harness.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));

export function runNativeWorkspaceTests(root = repository, name = null) {
  const owners = workspaceTestInventory(root).filter(owner => name == null || owner.name === name);
  if (name != null && owners.length !== 1) throw Error(`Unknown workspace: ${name}`);
  const files = owners.flatMap(owner => owner.native);
  if (!files.length) return { cases: 0, files: 0, owners: [] };
  const home = mkdtempSync(path.join(os.tmpdir(), 'aof-native-test-home-'));
  try {
    const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, encoding: 'utf8', timeout: 90_000,
      windowsHide: true, env: { ...process.env, AOF_GLOBAL_HOME: home } });
    if (result.status !== 0) throw Error(result.error?.message ?? result.stdout + result.stderr);
    const cases = Number([...result.stdout.matchAll(/^# tests (\d+)\r?$/gmu)].at(-1)?.[1]);
    if (!Number.isInteger(cases) || cases < files.length) throw Error(`Native runner reported no trustworthy executed count: ${result.stdout}`);
    return { cases, files: files.length, owners: owners.filter(owner => owner.native.length).map(owner => owner.name) };
  } finally { rmSync(home, { recursive: true, force: true }); }
}

export async function runWorkspaceTests(name, root = repository) {
  const owner = workspaceTestInventory(root).find(entry => entry.name === name);
  if (!owner) throw Error(`Unknown workspace: ${name}`);
  const cases = [];
  const names = new Set();
  for (const file of owner.suites) {
    const module = await import(pathToFileURL(file).href);
    const arrays = [...new Set(Object.values(module).filter(value => Array.isArray(value) && value.length
      && value.every(entry => typeof entry?.name === 'string' && typeof entry.run === 'function')))];
    if (!arrays.length) throw Error(`${file} exports no executable {name, run} suite`);
    for (const entry of arrays.flat()) {
      if (names.has(entry.name)) throw Error(`${name}: duplicate case ${entry.name}`);
      names.add(entry.name); cases.push(entry);
    }
  }
  const failures = await runCases(cases);
  const native = runNativeWorkspaceTests(root, name);
  if (!cases.length && !native.cases) throw Error(`${name}: test script executed nothing`);
  console.log(`# ${name}: ${cases.length} registered cases + ${native.cases} native cases (${native.files} files)`);
  return failures;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const names = process.argv[2] === '--all' ? workspaceTestInventory(repository)
    .filter(owner => owner.native.length || owner.suites.length).map(owner => owner.name) : [process.argv[2]];
  let failures = 0;
  for (const name of names) failures += await runWorkspaceTests(name);
  if (failures) process.exitCode = 1;
}
