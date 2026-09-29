import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTuneCorpus } from '../src/tune/corpus.mjs';
import { createTuneProposals } from '../src/tune/proposal.mjs';
import { createTuneCommand } from '../src/commands/tune.mjs';

async function scratch(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-tune-package-'));
  try { await run(root); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test('corpus joins supplied source readers and preserves their locators without writing records', () => scratch(async root => {
  const dir = path.join(root, 'wiki/work/12_milestone_fixture');
  await mkdir(dir, { recursive: true });
  const text = '# R1\nA lesson\n';
  await writeFile(path.join(dir, 'RETROSPECTIVE.md'), text);
  const calls = [];
  const api = createTuneCorpus({
    parseRetrospective: (source, context) => { calls.push(['lessons', source, context.item]); return [{ source: `${context.workRelPath}:1`, title: 'Injected lesson' }]; },
    loopPointersIn: source => { calls.push(['pointers', source]); return [{ scheme: 'config', raw: 'config:fixture.bound' }]; },
    readRuns: async item => { calls.push(['runs', item.ref]); return [{ runId: 'flat' }, { runId: 'partitioned', node: 'worker' }]; },
    runRecordPath: (item, id) => path.join(item.dir, 'supplied', `${id}.json`),
    runNodeRecordPath: (item, node, id) => path.join(item.dir, 'supplied', node, `${id}.json`),
    readLatestSnapshot: async input => { calls.push(['snapshot', input]); return { jsonPath: path.join(dir, 'supplied/reading.json'), json: { agents: [{ sessionId: 's', attributedTo: '12' }] } }; },
  });
  assert.deepEqual(calls, []);
  const result = await api.assembleCorpus({ cwd: root, scope: '12', lanes: api.CORPUS_LANES.map(lane => ({ ...lane, floor: 1 })) });
  assert.deepEqual(result.items, ['12']);
  assert.equal(result.lanes[0].contribution[0].target, 'config:fixture.bound');
  assert.deepEqual(result.lanes[1].contribution.map(run => run.source), [
    'wiki/work/12_milestone_fixture/supplied/flat.json',
    'wiki/work/12_milestone_fixture/supplied/worker/partitioned.json',
  ]);
  assert.equal(result.lanes[2].contribution.entries[0].state, 'read-attributed');
  assert.ok(calls.some(([kind, input]) => kind === 'snapshot' && input.cwd === root && input.ref === '12'));
  assert.equal(await readFile(path.join(dir, 'RETROSPECTIVE.md'), 'utf8'), text);
}));

test('proposal factory uses the supplied model-map policy and path', () => {
  const seen = [];
  const api = createTuneProposals({ AGENT_MODEL_MAP_PATH: 'custom.models', agentModelMap: config => { seen.push(config); return { developer: 'before' }; } });
  assert.deepEqual(seen, []);
  const config = { supplied: true };
  const result = api.emitProposal({ class: api.PROPOSAL_CLASSES.MODEL_REALLOCATION, target: { kind: 'model', role: 'developer' }, to: 'after' }, { projectConfig: config, model: { nodes: [] } });
  assert.deepEqual(seen, [config]);
  assert.equal(result.proposal.target.raw, 'custom.models.developer');
  assert.equal(result.proposal.patch.from, 'before');
  assert.equal(result.proposal.patch.to, 'after');
});

test('tune command defers registry acquisition until tunable evidence needs the acceptor', () => scratch(async root => {
  await mkdir(path.join(root, 'src'));
  for (const name of ['one', 'two']) await writeFile(path.join(root, `src/${name}.mjs`), '// fixture\n');
  const key = 'fixture.bound';
  const model = { nodes: [{ id: 'arbiter:fixture', path: 'fixture.md', edges: { 'parameter-tuning': [{ scheme: 'config', operand: key }] } }] };
  const records = ['src/one.mjs:1', 'src/two.mjs:1'].map(source => ({ source, title: 'same lesson', text: 'evidence', kind: 'mistake', area: 'process', stage: 'review', owner: 'developer', target: key, class: 'cap-adjustment', from: 1, to: 2 }));
  let rows = [];
  const calls = [];
  const proposals = createTuneProposals({ AGENT_MODEL_MAP_PATH: 'custom.models', agentModelMap: () => ({}) });
  const api = createTuneCommand({ ...proposals,
    loadLoops: async workspace => { calls.push(['model', workspace]); return model; },
    assembleCorpus: async input => { calls.push(['corpus', input]); return { matched: true, items: ['12'], reads: [], findings: [], lanes: [{ lane: 'lessons', contribution: rows }] }; },
    getRegistry: async () => {
      calls.push(['registry']);
      return { getCommand: id => id === 'work:acceptor' ? { id } : undefined,
        invoke: async (id, input) => { calls.push(['invoke', id, input]); return { proposals: [{ key, proposal: { from: 1, to: 2 }, verdict: 'report-only', eligible: false, evidence: null, distance: null, admissibility: {}, refusals: [], constructionRefusals: [] }] }; },
      };
    },
  });
  assert.deepEqual(calls, []);
  const workspace = { projectRoot: root };
  const empty = await api.tuneCommand.run({ scope: ' 12 ' }, { workspace });
  assert.deepEqual(empty.proposals, []);
  assert.deepEqual(calls.map(call => call[0]), ['model', 'corpus']);
  assert.deepEqual(calls[1][1], { cwd: root, scope: '12' });
  rows = records;
  calls.length = 0;
  const report = await api.buildTuneReport({}, { workspace });
  assert.deepEqual(calls.map(call => call[0]), ['model', 'corpus', 'registry', 'invoke']);
  assert.equal(calls[3][1], 'work:acceptor');
  assert.equal(calls[3][2].commit, undefined, 'tuning never requests a commit');
  assert.equal(report.proposals[0].verdict, 'report-only');
  assert.equal(api.tuneCommand.run, api.buildTuneReport);
  assert.deepEqual(api.tuneCommand.cli.route, ['work', 'tune']);
}));
