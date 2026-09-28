import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkDoctor } from '../src/doctor/index.mjs';
import { createDoctorDiagrams } from '../src/doctor/diagrams.mjs';
import { isDriver } from '../src/dependencies.mjs';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-doctor-package-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test('doctor reads execution only when a record exists and uses supplied projection', () => scratch(async root => {
  const calls = [];
  const diagramsGroup = () => [];
  const api = createWorkDoctor({ diagramsGroup,
    readRuns: async item => { calls.push(['read', item.ref]); return [{ id: 'injected-run' }]; },
    projectExecution: input => { calls.push(['project', input]); return { engagements: [{ loop: 'injected-loop' }] }; },
  });
  assert.deepEqual(calls, []);
  assert.equal(api.isDriver, isDriver, 'doctor uses the shared driver predicate');
  assert.ok(api.CHECK_GROUPS.includes(diagramsGroup), 'the supplied diagram policy owns its check');
  const dir = path.join(root, '12_milestone_fixture');
  await mkdir(dir);
  const record = '---\nstatus: planned\n---\n# Fixture\n';
  await writeFile(path.join(dir, 'SPEC.md'), record);
  const first = await api.buildSnapshot(root);
  assert.equal(first.items.length, 1);
  assert.deepEqual(calls, [], 'an absent execution record does not read runs');
  await writeFile(path.join(dir, 'EXECUTION.md'), '# Execution\n');
  const second = await api.buildSnapshot(root);
  assert.deepEqual(calls, [['read', '12'], ['project', { registry: [], runs: [{ id: 'injected-run' }], config: {} }]]);
  assert.deepEqual(second.items[0].loopEngagements, ['injected-loop']);
  assert.equal(await readFile(path.join(dir, 'SPEC.md'), 'utf8'), record, 'the snapshot does not rewrite records');
}));

test('diagram checks receive caller configuration without loading application configuration', () => {
  const seen = [];
  const api = createDoctorDiagrams({ resolveWorkDiagrams: config => { seen.push(config); return { enabled: true, formats: ['svg', 'png'] }; } });
  assert.deepEqual(seen, []);
  const config = { supplied: true };
  assert.deepEqual(api.diagramsGroup({ items: [] }, { config }), []);
  assert.deepEqual(seen, [config]);
});
