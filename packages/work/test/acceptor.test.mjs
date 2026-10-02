import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAcceptorCriterion } from '../src/acceptor/criterion.mjs';
import { createAcceptorStore } from '../src/acceptor/store.mjs';
import { createAcceptorObservations } from '../src/acceptor/observations.mjs';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-acceptor-package-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test('criterion assets are supplied lazily and persisted criteria override fallback assets', () => scratch(async root => {
  const calls = [];
  const api = createAcceptorCriterion({
    bundledFrozenSet: () => { calls.push('bundle'); return { members: [{ id: 'bundled' }] }; },
    readFrozenSet: async target => { calls.push(target); return { members: [{ id: 'project' }] }; },
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(api.defaultCriterion().frozenSet, ['bundled']);
  assert.deepEqual((await api.readCriterion(root)).frozenSet, ['project']);
  const criterion = api.defaultCriterion();
  await mkdir(path.join(root, '.aof'));
  await writeFile(path.join(root, api.CRITERION_RELPATH), JSON.stringify(criterion));
  const before = calls.length;
  assert.deepEqual(await api.readCriterion(root), criterion);
  assert.equal(calls.length, before, 'an existing criterion needs no frozen-asset fallback');
}));

test('the acceptor store uses its supplied ledger path and changes only the selected configuration value', () => scratch(async root => {
  const api = createAcceptorStore({ LEDGER_RELPATH: 'evidence/rulings.jsonl' });
  const absent = await api.readLedger(root);
  assert.equal(absent.path, path.join(root, 'evidence/rulings.jsonl'));
  assert.equal(absent.exists, false);
  await mkdir(path.join(root, '.aof'));
  const original = '{\n  "work": { "loop": { "reviewRounds": 2 } },\n  "kept": [1, 2]\n}\n';
  await writeFile(path.join(root, api.CONFIG_RELPATH), original);
  const result = await api.writeKnobValue(root, 'work.loop.reviewRounds', 3);
  assert.equal(result.from, 2);
  assert.equal(result.to, 3);
  assert.equal(await readFile(path.join(root, api.CONFIG_RELPATH), 'utf8'), original.replace('"reviewRounds": 2', '"reviewRounds": 3'));
}));

test('observation census uses the supplied journal reader and path policy', () => {
  const seen = [];
  const api = createAcceptorObservations({
    dispatchWorktreeSlug: ref => `lane-${ref}`,
    meshDispatchWorktreesRoot: root => path.join(root, 'lanes'),
    isUnderMeshDispatchWorktreesRoot: (root, candidate) => path.resolve(candidate).startsWith(path.resolve(root, 'lanes') + path.sep),
    readEvents: (journal, request) => { seen.push({ journal, request }); return []; },
  });
  assert.deepEqual(seen, []);
  const root = path.resolve('fixture');
  const folded = api.foldDispatchWorktree(path.join(root, 'lanes', 'lane-item', 'nested'));
  assert.equal(folded.workspace, root);
  assert.equal(folded.worktrees[0].minted, true);
  const journal = { databasePath: 'fixture.sqlite' };
  api.readObservationCensus(journal, { workspaceRoot: root, roots: [], limit: 7 });
  assert.equal(seen.length, api.OBSERVATION_SWEEPS.length);
  for (const [index, call] of seen.entries()) {
    assert.equal(call.journal, journal);
    assert.deepEqual(call.request, { name: api.OBSERVATION_SWEEPS[index].event, limit: 7 });
  }
});
