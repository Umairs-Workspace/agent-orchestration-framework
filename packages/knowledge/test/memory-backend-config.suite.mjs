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
import { readMemoryConfig, rewriteLegacyMemoryConfig } from '../src/memory-config.mjs';
import { resolveMemorySources } from '../src/memory/claude-auto-memory.mjs';
import { resolveGraphifyExtraction } from '../src/graphify-backends.mjs';
import { readShareSettings } from '../src/graph-share.mjs';

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

// 180/01 — the memory node read in one place (180/ADR-001..005). "read" is `readMemoryConfig` on the
// scenario's config; each case is named after the scenario, and an outline row after its row.
const node180 = (task, name, run) => ({ name: `180/01 task ${task}: ${name}`, run });
const refusedAt = (config, code, at) => assert.throws(() => readMemoryConfig(config), (error) => {
  assert.equal(error.code, code); assert.equal(error.path, at); return true;
});

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

  // ------------------------------------------------- 180/01 task 00: one home ----
  node180('00', 'E1 · the new spelling is read and nothing is legacy', () => {
    const node = readMemoryConfig({ memory: { backend: 'local', graph: { share: 'git-refs' } } });
    assert.deepEqual(node.graph, { share: 'git-refs', remote: 'origin' });
    assert.deepEqual(node.legacy, []);
  }),
  node180('00', 'E2 · the old spelling is read and each old key names its replacement', () => {
    const node = readMemoryConfig({ graph: { share: 'git-refs', remote: 'upstream' }, memory: { backend: 'local' } });
    assert.deepEqual(node.graph, { share: 'git-refs', remote: 'upstream' });
    assert.deepEqual(node.legacy, [{ path: 'graph.share', replacement: 'memory.graph.share' }, { path: 'graph.remote', replacement: 'memory.graph.remote' }]);
  }),
  ...[
    [{ memory: { backend: 'local', sources: ['claude-auto-memory'] } }, (node) => assert.deepEqual(node.corpora, ['work', 'imports', 'code', 'operator']), 'memory.sources', 'memory.corpora'],
    [{ memory: { backend: 'graphify', graphify: { extractionBackend: 'ollama' } } }, (node) => assert.equal(node.backends.graphify.extractionBackend, 'ollama'), 'memory.graphify.extractionBackend', 'memory.backends.graphify.extractionBackend'],
    [{ graph: { share: 'off' } }, (node) => assert.equal(node.graph.share, 'off'), 'graph.share', 'memory.graph.share'],
  ].map(([config, reads, old, replacement]) => node180('00', `every old key is read and reported with its new path — ${old}`, () => {
    const node = readMemoryConfig(config);
    reads(node);
    assert.deepEqual(node.legacy, [{ path: old, replacement }]);
  })),
  node180('00', 'E3 · a setting spelled both ways is refused even when the values agree', () => {
    assert.throws(() => readMemoryConfig({ graph: { share: 'off' }, memory: { graph: { share: 'off' } } }), (error) => {
      assert.equal(error.code, 'memory-config-conflict');
      assert.match(error.message, /"graph"/); assert.match(error.message, /"memory\.graph"/);
      return true;
    });
  }),
  ...[
    [{ memory: { sources: ['claude-auto-memory'], corpora: ['work', 'imports', 'code', 'operator'] } }, 'memory.sources', 'memory.corpora'],
    [{ memory: { graphify: { extractionBackend: 'ollama' }, backends: { graphify: { extractionBackend: 'ollama' } } } }, 'memory.graphify', 'memory.backends.graphify'],
  ].map(([config, old, replacement]) => node180('00', `each pair of spellings is a conflict — ${old}`, () => {
    assert.throws(() => readMemoryConfig(config), (error) => {
      assert.equal(error.code, 'memory-config-conflict');
      assert.ok(error.message.includes(`"${old}"`) && error.message.includes(`"${replacement}"`), error.message);
      return true;
    });
  })),
  ...[
    [{ memory: { sources: ['claude-autosave'] } }, 'invalid-memory-sources', 'memory.sources.0'],
    [{ memory: { corpora: ['work', 'imports', 'code', 'claude-autosave'] } }, 'invalid-memory-corpora', 'memory.corpora.3'],
    [{ graph: { remote: '-x' } }, 'graph-share-unknown', 'graph.remote'],
    [{ memory: { graph: { remote: '-x' } } }, 'graph-share-unknown', 'memory.graph.remote'],
    [{ memory: { graphify: { extractionBackend: 'codex' } } }, 'invalid-memory-extraction-backend', 'memory.graphify.extractionBackend'],
  ].map(([config, code, at]) => node180('00', `E4 · an invalid value is refused at the path the author wrote — ${at}`, () => refusedAt(config, code, at))),
  node180('00', 'the three readers answer the same through either spelling', () => {
    const legacy = { graph: { share: 'git-refs', remote: 'upstream' }, memory: { backend: 'graphify', sources: ['claude-auto-memory'], graphify: { extractionBackend: 'ollama' } } };
    const twin = { memory: { backend: 'graphify', corpora: ['work', 'imports', 'code', 'operator'], graph: { share: 'git-refs', remote: 'upstream' }, backends: { graphify: { extractionBackend: 'ollama' } } } };
    assert.deepEqual(resolveMemorySources(legacy.memory), ['claude-auto-memory']);
    assert.deepEqual(resolveMemorySources(twin.memory), resolveMemorySources(legacy.memory));
    const [old, now] = [legacy, twin].map((config) => resolveGraphifyExtraction(config.memory));
    assert.equal(old.backend, 'ollama');
    assert.deepEqual({ ...now, path: null }, { ...old, path: null }, 'identical apart from the path');
    assert.deepEqual([old.path, now.path], ['memory.graphify.extractionBackend', 'memory.backends.graphify.extractionBackend']);
    assert.deepEqual(readShareSettings(twin), readShareSettings(legacy));
    assert.deepEqual(readShareSettings(legacy), { share: 'git-refs', remote: 'upstream' });
  }),

  // -------------------------------- 180/01 task 02: engine settings and sharing ----
  node180('02', 'E10 · an inactive engine block is still validated', () => {
    refusedAt({ memory: { backend: 'local', backends: { graphify: { extractionBackend: 'codex' } } } }, 'invalid-memory-extraction-backend', 'memory.backends.graphify.extractionBackend');
  }),
  ...[
    [{ share: 'off' }, { share: 'off', remote: 'origin' }],
    [{}, { share: 'off', remote: 'origin' }],
    [{ share: 'always' }, ['graph-share-unknown', 'memory.graph.share']],
    [{ remote: '' }, ['graph-share-unknown', 'memory.graph.remote']],
  ].map(([graph, answer]) => node180('02', `memory.graph keeps graph's values and refusals — ${JSON.stringify(graph)}`, () => {
    // "share absent" is the absent key's default, "off": every build stays local (174/ADR-001).
    if (!Array.isArray(answer)) return assert.deepEqual(readShareSettings({ memory: { graph } }), answer);
    assert.throws(() => readShareSettings({ memory: { graph } }), (error) => {
      assert.equal(error.code, answer[0]); assert.equal(error.path, answer[1]); assert.ok(error.message.startsWith(answer[1]), error.message);
      return true;
    });
  })),

  // The rewrite stories 02 and 03 call (180/ADR-001, ADR-006): one table, never mutating its input.
  node180('00', 'the rewrite beside the reader moves each old key to its new home and leaves a conflict as written', () => {
    const legacy = { name: 'p', graph: { share: 'off' }, resources: [], memory: { backend: 'local', sources: ['claude-auto-memory'], graphify: { extractionBackend: 'ollama' } } };
    const before = JSON.stringify(legacy);
    const { config, moves, conflicts } = rewriteLegacyMemoryConfig(legacy);
    assert.equal(JSON.stringify(legacy), before, 'the input is not mutated');
    assert.deepEqual(moves.map((move) => move.from), ['memory.sources', 'memory.graphify', 'graph']);
    assert.deepEqual(conflicts, []);
    assert.deepEqual(Object.keys(config), ['name', 'resources', 'memory']);
    assert.deepEqual(config.memory, { backend: 'local', corpora: ['work', 'imports', 'code', 'operator'], graph: { share: 'off' }, backends: { graphify: { extractionBackend: 'ollama' } } });
    assert.deepEqual(readMemoryConfig(config).legacy, [], 'the rewritten config reads with nothing legacy');
    assert.deepEqual(Object.keys(rewriteLegacyMemoryConfig({ name: 'p', graph: { share: 'off' }, resources: [] }).config), ['name', 'memory', 'resources'], 'a new memory node takes the root graph key\'s place');
    const twice = rewriteLegacyMemoryConfig({ graph: { share: 'off' }, memory: { graph: { share: 'off' }, sources: [] } });
    assert.deepEqual(twice.conflicts, [{ path: 'graph', replacement: 'memory.graph' }]);
    assert.deepEqual(twice.config, { graph: { share: 'off' }, memory: { graph: { share: 'off' } } }, 'the conflict stays; the empty source list is dropped');
    for (const kept of [{ graph: { share: 'off' }, memory: 'local' }, { memory: { graphify: {}, backends: 'x' } }, { memory: { sources: ['nope'] } }]) {
      assert.deepEqual(rewriteLegacyMemoryConfig(kept), { config: kept, moves: [], conflicts: [] }, `nothing is overwritten: ${JSON.stringify(kept)}`);
    }
  }),
];
