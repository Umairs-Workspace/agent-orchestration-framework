// memory-record-origin — milestone 178 / story 03. A work record carries its item's `origin:`,
// resolved to project-root paths that name existing files, and recall shows it in every projection
// without scoring it (178/ADR-002).
//
//   task 00 (`00_work-records-carry-their-resolved-origin.feature`) — E1..E8, the story inheritance
//     rows, the record-type outline, the candidate order and the status sum. E9 (the live stream)
//     is FF-17803, `test/arch/memory/acd-record-origin-resolves.test.mjs`.
//   task 01 (`01_recall-shows-origin-and-never-scores-it.feature`) — E10..E14. The `--origin`
//     refusal is a face rule, asserted through the real CLI in FF-17803's file.
//
// THE FIXTURE is the feature's: a temp project whose `wiki/planning/` holds the five PRDs and the
// one research file, whose `wiki/work/TECH_DEBT.md` exists, and whose items each scenario adds.
// Indexing is built from the knowledge factories with stub item and episodic readers, as the
// other suites in this directory build it; the graph half of graphify is refused, so its reindex
// writes only its store.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { createClaudeAutoMemory } from "@aof/knowledge/memory/claude-auto-memory";
import { createMemory } from "@aof/knowledge/memory";
import { MEMORY_RECORD_FIELDS, rankRecords } from "@aof/knowledge/memory/local-retrieval";

const refuse = (what) => () => { throw new Error(`this suite must not reach ${what}`); };
const PLANNING = ["PRD-memory-engine.md", "PRD-acd-loop-engineering.md", "PRD-graph-engineering.md", "PRD-web-ui-restructure.md", "PRD-acd-loop-performance.md", "research/RESEARCH-agent-memory-procedure.md"];
const BACKENDS = ["local", "graphify"];

const recordDoc = (type, ref, origin) => [
  "---", `type: ${type}`, `number: ${ref.split("/").pop()}`, "slug: x", "status: done", ...(origin == null ? [] : [`origin: ${origin}`]), "---", `# ${ref}`, "",
].join("\n");
const architecture = (title) => `# A\n\n## ADR-001: ${title}\n\n**Status:** Accepted\n\n**Decision.** ${title}.\n`;
const retrospective = (title = "A lesson about memory", tags = "") =>
  `# R\n\n## R1 — ${title}\n\n- **Kind:** near-miss${tags} · **Area:** process · **Stage:** build · **Owner:** developer\n- **Lesson:** z\n`;

// items: [{ ref, type?, parent?, folder, origin?, files: { name: text } }]
async function project(items, { autoMemory = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-178-03-"));
  const workDir = path.join(root, "wiki", "work");
  for (const rel of PLANNING) {
    await mkdir(path.dirname(path.join(root, "wiki", "planning", rel)), { recursive: true });
    await writeFile(path.join(root, "wiki", "planning", rel), `# ${rel}\n`);
  }
  await mkdir(workDir, { recursive: true });
  await writeFile(path.join(workDir, "TECH_DEBT.md"), "# Tech debt\n");
  const rows = [];
  for (const spec of items) {
    const type = spec.type ?? "milestone";
    const dir = path.join(workDir, spec.folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, type === "story" ? "STORY.md" : "SPEC.md"), recordDoc(type, spec.ref, spec.origin));
    for (const [name, text] of Object.entries(spec.files ?? {})) await writeFile(path.join(dir, name), text);
    rows.push({ type, parent: spec.parent ?? null, ref: spec.ref, number: spec.ref.split("/").pop(), slug: "x", dir });
  }
  const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude") };
  const memoryDir = path.join(env.CLAUDE_CONFIG_DIR, "memory");
  if (autoMemory) {
    await mkdir(memoryDir, { recursive: true });
    await writeFile(path.join(memoryDir, "note.md"), "---\nname: n\ntype: reference\nmetadata:\n  type: feedback\n---\nRemember the origin.\n");
  }
  const indexing = createLocalIndexing({
    listItemsCacheFirst: async () => rows,
    localItemsOnly: (list) => ({ items: list, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
    episodicReaders: {
      readRuns: async () => [],
      runRecordPath: (item, runId) => path.join(item.dir, "runs", `${runId}.json`),
      runNodeRecordPath: (item, node, runId) => path.join(item.dir, "runs", node, `${runId}.json`),
      readLatestSnapshot: async () => null,
      readFeedbackRecords: async (item) => (await readFile(path.join(item.dir, "FEEDBACK.ndjson"), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line)),
      feedbackRecordPath: (item) => path.join(item.dir, "FEEDBACK.ndjson"),
      reportDegrade: () => {},
    },
    autoMemory: createClaudeAutoMemory({ memoryDirFor: () => memoryDir, reportDegrade: () => {} }),
  });
  const ctx = {
    workDir,
    projectRoot: root,
    configMemory: autoMemory ? { backend: "local", sources: ["claude-auto-memory"] } : {},
    env,
    loadWorkspace: async () => ({ projectRoot: root, config: {}, configPath: null }),
    invoke: async () => { throw Object.assign(new Error("graphify absent"), { code: "graphify-missing" }); },
  };
  const graphify = createGraphifyBackend({
    coreInvoke: refuse("coreInvoke"),
    loadWorkspace: refuse("loadWorkspace"),
    buildRecords: indexing.buildRecords,
    ensureAofGitignore: async () => {},
    ensureGraphifyOutGitignore: async () => {},
  });
  const backends = { local: createLocalBackend(indexing).default, graphify: graphify.default };
  const memory = createMemory({ loadLocalBackend: refuse("a configured local backend"), loadGraphifyBackend: refuse("a configured graphify backend") });
  const run = async (backend, argv) => (await memory.runMemory(argv, { resolveBackend: async () => backends[backend], ctx })).result;
  return {
    root, workDir, indexing, graphify, backends, memory, ctx, run,
    // `aof memory ingest` on one backend, then its stored records.
    async ingest(backend = "local") {
      await backends[backend].reindex(null, ctx);
      const store = backend === "local" ? indexing.memoryIndexPath(root) : graphify.graphifyIndexPath(root);
      return JSON.parse(await readFile(store, "utf8"));
    },
  };
}

async function withProject(items, options, body) {
  const p = await project(items, options);
  try {
    await body(p);
  } finally {
    await rm(p.root, { recursive: true, force: true });
  }
}

const recordOf = (store, item, id) => store.records.find((record) => record.item === item && record.id === id);
const M178 = { ref: "178", folder: "178_milestone_x", origin: "wiki/planning/PRD-memory-engine.md", files: { "ARCHITECTURE.md": architecture("aof memory is the canonical route") } };
const M41 = { ref: "41", folder: "41_milestone_x", files: { "ARCHITECTURE.md": architecture("pin line endings") } };

export const memoryRecordOriginTests = [
  // ═════════════════════ task 00 R1 — a work record carries its item's resolved origin ════════
  ...BACKENDS.map((backend) => ({
    name: `178/03 E1 outline: a root-relative origin is carried as declared — ${backend}`,
    run: () => withProject([M178], {}, async (p) => {
      const store = await p.ingest(backend);
      assert.deepEqual(recordOf(store, "178", "ADR-001").origin, ["wiki/planning/PRD-memory-engine.md"]);
    }),
  })),
  {
    name: "178/03 E2: a doc-relative flow list resolves in declared order",
    run: () => withProject([{ ref: "62", folder: "62_milestone_self-improvement-loop", origin: "[../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]", files: { "RETROSPECTIVE.md": retrospective() } }], {}, async (p) => {
      for (const backend of BACKENDS) {
        const store = await p.ingest(backend);
        assert.deepEqual(recordOf(store, "62", "R1").origin, ["wiki/planning/PRD-acd-loop-engineering.md", "wiki/planning/PRD-graph-engineering.md"], backend);
      }
    }),
  },
  {
    name: "178/03 E3: a story with no origin inherits its milestone's",
    run: () => withProject([
      { ref: "153", folder: "153_milestone_x", origin: "wiki/planning/research/RESEARCH-agent-memory-procedure.md" },
      { ref: "153/01", type: "story", parent: "153", folder: "153_milestone_x/stories/01_story_x", files: { "RETROSPECTIVE.md": retrospective() } },
    ], {}, async (p) => {
      for (const backend of BACKENDS) {
        assert.deepEqual(recordOf(await p.ingest(backend), "153/01", "R1").origin, ["wiki/planning/research/RESEARCH-agent-memory-procedure.md"], backend);
      }
    }),
  },
  {
    name: "178/03: a story with its own origin keeps its own",
    run: () => withProject([
      { ref: "153", folder: "153_milestone_x", origin: "wiki/planning/PRD-memory-engine.md" },
      { ref: "153/02", type: "story", parent: "153", folder: "153_milestone_x/stories/02_story_x", origin: "wiki/planning/PRD-graph-engineering.md", files: { "RETROSPECTIVE.md": retrospective() } },
    ], {}, async (p) => {
      assert.deepEqual(recordOf(await p.ingest(), "153/02", "R1").origin, ["wiki/planning/PRD-graph-engineering.md"]);
    }),
  },
  {
    name: "178/03 E4: records from outside the work stream carry an empty origin — an imported digest and an operator auto-memory",
    run: () => withProject([M178], { autoMemory: true }, async (p) => {
      const imported = path.join(p.workDir, "elsewhere", "00-imported");
      await mkdir(imported, { recursive: true });
      await writeFile(path.join(imported, "AOF.md"), "---\nimported: true\n---\n# Imported\n\n## Intent\n\nRecovered intent.\n");
      for (const backend of BACKENDS) {
        const store = await p.ingest(backend);
        const outside = store.records.filter((record) => record.item !== "178");
        assert.ok(outside.some((record) => record.recordType === "summary"), `${backend}: the imported summary record is indexed`);
        assert.ok(outside.some((record) => record.owner === "operator"), `${backend}: the auto-memory record is indexed`);
        for (const record of outside) assert.deepEqual(record.origin, [], `${backend}: ${record.item}/${record.id} carries origin []`);
      }
    }),
  },
  {
    name: "178/03 outline: every record type from an item carries the item's origin — lesson | adr | summary | capability | finding | feedback",
    run: () => withProject([{
      ...M178,
      files: {
        "RETROSPECTIVE.md": retrospective(),
        "ARCHITECTURE.md": architecture("aof memory is the canonical route"),
        "AOF.md": "# Digest\n\n## Intent\n\nThe intent.\n",
        "OUTCOME.md": "# Outcome\n\n## Delivered\n\n### Origin is carried\nA capability.\n",
        "VERIFICATION.md": "## Findings\n\n| id | severity | finding |\n|---|---|---|\n| F-01 | major | a finding |\n",
        "FEEDBACK.ndjson": `${JSON.stringify({ kind: "raw", id: "fb-1", text: "a note", actor: "qa", at: "2026-10-29T00:00:00.000Z" })}\n`,
      },
    }], {}, async (p) => {
      const store = await p.ingest();
      for (const type of ["lesson", "adr", "summary", "capability", "finding", "feedback"]) {
        const records = store.records.filter((record) => record.item === "178" && record.recordType === type);
        assert.ok(records.length > 0, `a ${type} record is indexed`);
        for (const record of records) assert.deepEqual(record.origin, ["wiki/planning/PRD-memory-engine.md"], `${type} ${record.id}`);
      }
    }),
  },
  {
    name: "178/03 E5 outline: an archived milestone's link resolves from its pre-archive folder — 48 doc-relative | 119 [../TECH_DEBT.md] | 50 root-relative",
    run: () => withProject([
      { ref: "48", folder: "archive/48_milestone_fleet-session-identity", origin: "../../planning/PRD-web-ui-restructure.md", files: { "ARCHITECTURE.md": architecture("a") } },
      { ref: "119", folder: "archive/119_milestone_the-tree-gets-an-interior", origin: "[../TECH_DEBT.md]", files: { "ARCHITECTURE.md": architecture("b") } },
      { ref: "50", folder: "archive/50_milestone_session-launcher", origin: "wiki/planning/PRD-web-ui-restructure.md", files: { "ARCHITECTURE.md": architecture("c") } },
    ], {}, async (p) => {
      const store = await p.ingest();
      assert.deepEqual(recordOf(store, "48", "ADR-001").origin, ["wiki/planning/PRD-web-ui-restructure.md"]);
      assert.deepEqual(recordOf(store, "119", "ADR-001").origin, ["wiki/work/TECH_DEBT.md"]);
      assert.deepEqual(recordOf(store, "50", "ADR-001").origin, ["wiki/planning/PRD-web-ui-restructure.md"]);
      assert.deepEqual(store.origin, { unresolved: 0 });
    }),
  },
  {
    name: "178/03: a candidate is tried in order and the first existing file wins — the doc-relative candidate before the pre-archive one",
    run: () => withProject([{ ref: "48", folder: "archive/48_milestone_fleet-session-identity", origin: "../../planning/PRD-web-ui-restructure.md", files: { "ARCHITECTURE.md": architecture("a") } }], {}, async (p) => {
      await mkdir(path.join(p.workDir, "planning"), { recursive: true });
      await writeFile(path.join(p.workDir, "planning", "PRD-web-ui-restructure.md"), "# shadow\n");
      assert.deepEqual(recordOf(await p.ingest(), "48", "ADR-001").origin, ["wiki/work/planning/PRD-web-ui-restructure.md"]);
    }),
  },

  // ═══════════════════ task 00 R2 — a value that names no existing file is dropped and counted ═
  {
    name: "178/03 E7: a moved file is dropped and its sibling kept, and status counts the drop",
    run: () => withProject([{ ref: "72", folder: "archive/72_milestone_inner-loop", origin: "[../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]", files: { "ARCHITECTURE.md": architecture("a") } }], {}, async (p) => {
      for (const backend of BACKENDS) {
        const store = await p.ingest(backend);
        assert.deepEqual(recordOf(store, "72", "ADR-001").origin, ["wiki/planning/PRD-acd-loop-performance.md"], backend);
        assert.deepEqual((await p.run(backend, ["status", "--json"])).origin, { unresolved: 1 }, backend);
      }
    }),
  },
  ...["../../../../etc/hosts", "/etc/hosts", "wiki/planning"].map((declared) => ({
    name: `178/03 E8 outline: a value outside the project root, or naming no file, is dropped and never cited — ${declared}`,
    run: () => withProject([{ ...M178, origin: declared }], {}, async (p) => {
      const store = await p.ingest();
      assert.deepEqual(recordOf(store, "178", "ADR-001").origin, []);
      assert.deepEqual((await p.run("local", ["status", "--json"])).origin, { unresolved: 1 });
    }),
  })),
  {
    name: "178/03: status reports the unresolved count without breaking its sum, on each backend",
    run: () => withProject([
      { ref: "10", folder: "10_milestone_x", origin: "wiki/planning/PRD-gone.md", files: { "ARCHITECTURE.md": architecture("a") } },
      { ref: "11", folder: "11_milestone_x", origin: "../../planning/also-gone.md", files: { "RETROSPECTIVE.md": retrospective() } },
    ], {}, async (p) => {
      for (const backend of BACKENDS) {
        await p.ingest(backend);
        const status = await p.run(backend, ["status", "--json"]);
        assert.deepEqual(status.origin, { unresolved: 2 }, backend);
        const sum = ["lessons", "adrs", "summaries", "capabilities", "gaps", "findings", "feedback", "runs"].reduce((total, key) => total + (status[key] ?? 0), 0);
        assert.equal(sum, status.recordCount, `${backend}: the type counts still sum to recordCount`);
      }
    }),
  },

  // ═══════════════════════ task 01 R3 — origin is shown and never scored ══════════════════════
  ...BACKENDS.map((backend) => ({
    name: `178/03 E10 outline: the block line carries origin before its source — ${backend}`,
    run: () => withProject([M178, M41], {}, async (p) => {
      await p.ingest(backend);
      const result = await p.run(backend, ["recall", "canonical route", "--item", "178", "--block"]);
      const line = p.memory.renderMemory("recall", result, { block: true }).split("\n").find((text) => text.startsWith("ADR-001 (m178)"));
      assert.equal(line, "ADR-001 (m178) · adr · architecture · aof memory is the canonical route · origin wiki/planning/PRD-memory-engine.md · 178_milestone_x/ARCHITECTURE.md:3");
    }),
  })),
  {
    name: "178/03: two origins are joined in declared order, and tags stay before them",
    run: () => withProject([{ ref: "62", folder: "62_milestone_x", origin: "[wiki/planning/PRD-acd-loop-engineering.md, wiki/planning/PRD-graph-engineering.md]", files: { "RETROSPECTIVE.md": retrospective("A lesson about memory", " (recurring)") } }], {}, async (p) => {
      await p.ingest();
      const block = p.memory.renderMemory("recall", await p.run("local", ["recall", "lesson", "--item", "62", "--block"]), { block: true });
      const line = block.split("\n").find((text) => text.startsWith("R1 (m62)"));
      assert.ok(line.endsWith(" · [recurring] · origin wiki/planning/PRD-acd-loop-engineering.md; wiki/planning/PRD-graph-engineering.md · 62_milestone_x/RETROSPECTIVE.md:3"), line);
    }),
  },
  {
    name: "178/03 E11: a record with no origin renders byte for byte as before, and holds no ` · origin `",
    run: () => withProject([M178, M41], {}, async (p) => {
      await p.ingest();
      const block = p.memory.renderMemory("recall", await p.run("local", ["recall", "pin line endings", "--item", "41", "--block"]), { block: true });
      const line = block.split("\n").find((text) => text.startsWith("ADR-001 (m41)"));
      // The five-field line the renderer drew before this story: id · kind · area · title · source.
      assert.equal(line, "ADR-001 (m41) · adr · architecture · pin line endings · 41_milestone_x/ARCHITECTURE.md:3");
      assert.equal(line.includes(" · origin "), false);
    }),
  },
  {
    name: "178/03: the text view adds one origin line after the source line, and a record with none has no origin line",
    run: () => withProject([M178, M41], {}, async (p) => {
      await p.ingest();
      const text = (await p.run("local", ["recall", "canonical route"])).text.split("\n");
      const at = text.findIndex((line) => line === "    ↳ 178_milestone_x/ARCHITECTURE.md:3");
      assert.ok(at >= 0, text.join("\n"));
      assert.equal(text[at + 1], "    ↳ origin wiki/planning/PRD-memory-engine.md");
      const other = text.findIndex((line) => line === "    ↳ 41_milestone_x/ARCHITECTURE.md:3");
      assert.ok(other >= 0 && !(text[other + 1] ?? "").includes("origin"), "41's ADR has no origin line");
    }),
  },
  {
    name: "178/03: the json projection carries origin as stored, an array on every record",
    run: () => withProject([M178, M41], {}, async (p) => {
      await p.ingest();
      const records = p.memory.memoryJson("recall", await p.run("local", ["recall", "canonical route", "--json"]));
      assert.deepEqual(records.find((record) => record.item === "178" && record.id === "ADR-001").origin, ["wiki/planning/PRD-memory-engine.md"]);
      for (const record of records) assert.ok(Array.isArray(record.origin), `${record.item}/${record.id} carries an origin array`);
    }),
  },
  {
    name: "178/03 E12: origin changes no ranking — ids and scores are identical with origins stripped, and a query naming only the PRD gains nothing from it",
    run: () => withProject([M178, M41, { ref: "62", folder: "62_milestone_x", origin: "wiki/planning/PRD-memory-engine.md", files: { "RETROSPECTIVE.md": retrospective() } }], {}, async (p) => {
      const records = (await p.ingest()).records;
      const stripped = records.map((record) => ({ ...record, origin: [] }));
      for (const query of ["memory", "PRD-memory-engine", "wiki/planning/PRD-memory-engine.md"]) {
        const ranked = rankRecords(records, query, {}, { all: true }).map((record) => [record.item, record.id, record.score]);
        const baseline = rankRecords(stripped, query, {}, { all: true }).map((record) => [record.item, record.id, record.score]);
        assert.deepEqual(ranked, baseline, `"${query}" ranks the same with and without origin`);
      }
    }),
  },

  // ════════════════ task 01 R4 — the record shape grows by one field under a version bump ════
  {
    name: "178/03 E13: the versions move in lockstep to 4, MEMORY_RECORD_FIELDS includes origin, and every record the parsers emit carries exactly those fields",
    run: () => withProject([{ ...M178, files: { ...M178.files, "RETROSPECTIVE.md": retrospective(), "AOF.md": "# D\n\n## Intent\n\nx\n", "OUTCOME.md": "# O\n\n## Delivered\n\n### y\nz\n" } }], {}, async (p) => {
      assert.equal(p.indexing.INDEX_VERSION, 4);
      assert.equal(p.graphify.GRAPHIFY_INDEX_VERSION, 4);
      assert.ok(MEMORY_RECORD_FIELDS.includes("origin"));
      const records = await p.indexing.buildRecords(null, p.ctx);
      assert.ok(records.length >= 4, "non-vacuous");
      for (const record of records) assert.deepEqual(Object.keys(record).sort(), [...MEMORY_RECORD_FIELDS].sort(), `${record.recordType} ${record.id}`);
    }),
  },
  ...BACKENDS.map((backend) => ({
    name: `178/03 E14 outline: a version-3 store is stale until an ingest, and its records read as having no origin — ${backend}`,
    run: () => withProject([M178, M41], {}, async (p) => {
      const current = await p.ingest(backend);
      const storePath = backend === "local" ? p.indexing.memoryIndexPath(p.root) : p.graphify.graphifyIndexPath(p.root);
      const { origin, ...rest } = current;
      await writeFile(storePath, JSON.stringify({ ...rest, version: 3, records: current.records.map(({ origin: _origin, ...record }) => record) }));
      assert.deepEqual((await p.run(backend, ["status", "--json"])).index, { version: 3, current: 4, stale: true });
      const block = p.memory.renderMemory("recall", await p.run(backend, ["recall", "canonical route", "--item", "178", "--block"]), { block: true });
      assert.ok(block.startsWith("ADR-001 (m178) · adr · architecture · aof memory is the canonical route · 178_milestone_x/ARCHITECTURE.md:3"), `the pre-origin line: ${block}`);
      await p.ingest(backend);
      assert.deepEqual((await p.run(backend, ["status", "--json"])).index, { version: 4, current: 4, stale: false });
    }),
  })),
];
