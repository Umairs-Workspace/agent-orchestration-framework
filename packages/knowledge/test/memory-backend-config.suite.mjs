import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { defaultApplication as app } from 'aof/default-application';
import { createMemory, inspectMemoryConfiguration } from '../src/memory.mjs';
import { createGraphifyBackend } from '../src/memory/graphify-backend.mjs';
import { GRAPHIFY_BACKENDS } from '../src/graphify-backends.mjs';
import { MEMORY_RECORD_FIELDS } from '../src/memory/local-retrieval.mjs';

const seam = app.knowledge.work.memory;
const selected = extractionBackend => ({ memory: { backend: 'graphify', graphify: { extractionBackend } } });
async function withProject(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aof-memory-choice-'));
  try {
    const workDir = path.join(root, 'wiki', 'work');
    const itemDir = path.join(workDir, '01_milestone_example');
    await mkdir(itemDir, { recursive: true });
    await mkdir(path.join(root, '.aof'));
    await writeFile(path.join(itemDir, 'SPEC.md'), '---\ntype: milestone\nnumber: 1\nslug: example\ntitle: Example\nstatus: done\n---\n');
    await writeFile(path.join(itemDir, 'RETROSPECTIVE.md'), '## R1 · Shared identity\n- **Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** builder\n- **What happened:** Claude recorded a shared learning linked to 10/ADR-003.\n- **Why:** Both runtimes use the corpus.\n- **Lesson:** Preserve shared identity and links.\n');
    await run({ projectRoot: root, workDir });
  } finally { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await rm(root, { recursive: true, force: true }); }
}
function graphBackend(events) {
  return createGraphifyBackend({
    coreInvoke: async (name, args) => { events.push({ name, args }); return { graphPath: 'fixture/graph.json', egress: 'docs-media' }; },
    loadWorkspace: async () => ({ config: {}, configPath: 'fixture/config.json' }),
    buildRecords: async () => { events.push({ name: 'records' }); return []; },
    ensureAofGitignore: async () => { events.push({ name: 'ignore' }); },
    ensureGraphifyOutGitignore: async () => { events.push({ name: 'graph-ignore' }); },
  }).default;
}
const test = (name, run) => ({ name: `154/09 ${name}`, run });

export const memoryBackendConfigTests = [
  test('task00 E1 + task01 runtime changes: real local ingest/recall preserves shared id, vocabulary and links without an assistant or Graphify', async () => {
    await withProject(async ctx => {
      const calls = [];
      const originals = { spawn: childProcess.spawn, spawnSync: childProcess.spawnSync };
      for (const method of Object.keys(originals)) childProcess[method] = function(binary, ...args) {
        if (/^(claude|codex|graphify)(?:\.(?:exe|cmd|bat))?$/i.test(path.basename(String(binary)))) { calls.push(binary); throw new Error(`Unexpected assistant/extractor spawn: ${binary}`); }
        return originals[method].call(this, binary, ...args);
      };
      syncBuiltinESMExports();
      try {
        ctx.invoke = async () => { calls.push('graph:build'); throw new Error('Graphify must not be invoked'); };
        const config = { memory: { backend: 'local' }, work: { loop: { runtime: 'claude' } } };
        const ingested = await seam.runMemory(['ingest', '--all'], { config, ctx });
        assert.equal(ingested.result.recordCount, 1);
        const original = ingested.result.records[0];
        config.work.loop.runtime = 'codex';
        const recalled = (await seam.runMemory(['recall', 'shared identity'], { config, ctx })).result.records[0];
        assert.deepEqual(Object.fromEntries(MEMORY_RECORD_FIELDS.map(key => [key, recalled[key]])), original);
        assert.equal(recalled.id, 'R1'); assert.equal(recalled.item, '01');
        assert.equal(recalled.kind, 'near-miss'); assert.equal(recalled.area, 'process'); assert.equal(recalled.stage, 'build');
        assert.deepEqual(recalled.tags, ['recurring']); assert.match(recalled.text, /10\/ADR-003/);
        assert.match(recalled.source, /RETROSPECTIVE\.md:\d+$/);
        assert.deepEqual(calls, []);
        assert.deepEqual((await readdir(path.join(ctx.projectRoot, '.aof'))).sort(), ['.gitignore', 'aof.memory.index.json']);
      } finally { Object.assign(childProcess, originals); syncBuiltinESMExports(); }
    });
  }),
  test('task00 outline none: established disabled memory behavior', async () => {
    const result = await seam.runMemory(['recall', 'anything'], { config: { memory: { backend: 'none' } } });
    assert.deepEqual(result.result.records, []);
    assert.equal((await seam.runMemory(['ingest'], { config: {} })).result.recordCount, 0);
  }),
  test('task00 outline absent Graphify extractor: legacy Claude extraction args', async () => {
    await withProject(async ctx => {
      const events = []; const backend = graphBackend(events);
      await backend.reindex(null, ctx);
      assert.deepEqual(events.filter(e => e.name === 'graph:build').map(e => e.args), [{ path: ctx.workDir, backend: 'claude-cli', outRoot: path.join(ctx.projectRoot, '.aof', 'memory-graph') }]);
      const status = await backend.status(ctx);
      assert.equal(status.extractionBackend, 'claude-cli'); assert.equal(status.extractionSource, 'legacy default');
    });
  }),
  ...GRAPHIFY_BACKENDS.map(({ backend }) => test(`task00 outline explicit supported ${backend}: exactly one selected extractor through the existing command`, async () => {
    await withProject(async ctx => {
      const events = []; const graph = graphBackend(events);
      const local = () => { events.push({ name: 'unexpected local' }); throw new Error('No fallback'); };
      const memory = createMemory({ loadLocalBackend: local, loadGraphifyBackend: async () => graph });
      const result = await memory.runMemory(['ingest'], { config: selected(backend), ctx });
      assert.equal(result.result.backend, 'graphify'); assert.equal(result.result.graph.backend, backend);
      assert.equal(result.result.graph.built, true);
      assert.deepEqual(events.filter(e => e.name === 'graph:build').map(e => e.args.backend), [backend]);
      assert.ok(!events.some(e => e.name === 'unexpected local'));
      assert.equal((await graph.status({ ...ctx, configMemory: selected(backend).memory })).extractionBackend, backend);
    });
  })),
  ...['codex', '', null, 4, ['ollama']].map(value => test(`task00 unsupported ${JSON.stringify(value)}: refuse before backend load, parsing, ignored artifacts or writes`, async () => {
    await withProject(async ctx => {
      const events = []; const graph = graphBackend(events);
      const memory = createMemory({ loadLocalBackend: async () => { events.push({ name: 'local' }); }, loadGraphifyBackend: async () => { events.push({ name: 'load' }); return graph; } });
      for (const verb of ['recall', 'ingest']) await assert.rejects(memory.runMemory([verb], { config: selected(value), ctx }), error => error.code === 'invalid-memory-extraction-backend' && error.message.includes(JSON.stringify(value)));
      for (const verb of ['reindex', 'recall', 'status']) {
        const args = verb === 'recall' ? ['', {}, {}, { ...ctx, configMemory: selected(value).memory }] : verb === 'reindex' ? [null, { ...ctx, configMemory: selected(value).memory }] : [{ ...ctx, configMemory: selected(value).memory }];
        await assert.rejects(graph[verb](...args), { code: 'invalid-memory-extraction-backend' });
      }
      assert.deepEqual(events, []); assert.deepEqual(await readdir(path.join(ctx.projectRoot, '.aof')), []);
    });
  })),
  test('task00 explicit unavailable extraction names dependencies in JSON and human output, with no fallback', async () => {
    await withProject(async ctx => {
      const events = []; const graph = graphBackend(events);
      ctx.invoke = async (name, args) => { events.push({ name, args }); const error = new Error('Ollama service unavailable'); error.code = 'graphify-failed'; throw error; };
      const memory = createMemory({ loadLocalBackend: async () => { throw new Error('No alternate memory backend'); }, loadGraphifyBackend: async () => graph });
      const lines = [];
      const result = await memory.runMemory(['ingest'], { config: selected('ollama'), ctx, log: line => lines.push(line) });
      assert.equal(result.result.backend, 'graphify'); assert.equal(result.result.graph.built, false);
      assert.match(result.result.graph.hint, /ollama.*Graphify.*Ollama.*unavailable/s);
      assert.match(lines.join('\n'), /ollama.*Ollama.*unavailable/s);
      assert.deepEqual(events.filter(e => e.name === 'graph:build').map(e => e.args.backend), ['ollama']);
      assert.ok(existsSync(path.join(ctx.projectRoot, '.aof', 'aof.memory.graphify.index.json')));
      assert.ok(!existsSync(path.join(ctx.projectRoot, '.aof', 'aof.memory.index.json')));
    });
  }),
  test('task01 E2 + outline legacy default: pure inspection reports Claude CLI and local alternative without mutation', async () => {
    const config = { memory: { backend: 'graphify' }, work: { loop: { runtime: 'codex' } } };
    const before = JSON.stringify(config);
    const report = inspectMemoryConfiguration(config);
    assert.equal(report.extraction.backend, 'claude-cli'); assert.equal(report.extraction.source, 'legacy default');
    assert.deepEqual(report.dependencies, ['Graphify (graphify)', 'Claude CLI (claude)']);
    assert.match(report.extraction.alternative, /"local"/); assert.equal(JSON.stringify(config), before);
  }),
  test('task01 outline explicit extractor and local: project source and actual dependencies', async () => {
    const extraction = inspectMemoryConfiguration(selected('ollama'));
    assert.equal(extraction.extraction.source, 'project setting'); assert.deepEqual(extraction.dependencies, ['Graphify (graphify)', 'Ollama']);
    const local = inspectMemoryConfiguration({ memory: { backend: 'local' } });
    assert.equal(local.source, 'project setting'); assert.deepEqual(local.dependencies, []); assert.equal(local.extraction, null);
  }),
];
