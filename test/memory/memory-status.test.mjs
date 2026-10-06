import { defaultApplication as _aofApplication } from "aof/default-application";
// Milestone 148 / story 05 — `aof work memory status` names every record type's layer and reports
// the vocabulary's conformance (ADR-004), on every backend.
//
// Task 00: the seam composes `types` (each type's count and layer), `layers` and the text view's
// layers line over every record, so the counts sum to `recordCount` on local and graphify alike, and
// a type the map does not name is counted as `unmapped` rather than dropped.
// Task 01 (R2): `conformance` counts the blank and non-vocabulary values per field — kind, area and
// stage over lessons, owner blanks, gap status — nested, so status gains no top-level number.
//
// Driven through `runMemory` with the real backend registry, as `aof work memory` runs, over a temp
// stream ingested into a temp project root. The graphify graph build is stubbed to the honest
// binary-absent miss through `ctx.invoke` (the backend's own test seam), so no graphify binary and
// no network extraction is reached; the records half needs neither.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { RECORD_TYPE_LAYERS } from "@aof/knowledge/memory/local-retrieval";

const runMemory = _aofApplication.knowledge.work.memory.runMemory;
const memoryIndexPath = _aofApplication.knowledge.memory.localIndexing.memoryIndexPath;
const resolveConfiguredBackend = _aofApplication.knowledge.work.memory.resolveConfiguredBackend;

const graphifyMissing = async () => {
  const error = new Error("graphify is not installed (test stub)");
  error.code = "graphify-missing";
  throw error;
};

// ---------------------------------------------------------------- fixtures ----

const frontmatter = (fields) => ["---", ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`), "---", ""].join("\n");

// A lesson's meta line from its fields; a blank field is left off the line, as an author leaves it.
function lessonText(id, meta) {
  const labels = { kind: "Kind", area: "Area", stage: "Stage", owner: "Owner" };
  const segments = Object.entries(labels)
    .filter(([field]) => (meta[field] ?? "") !== "")
    .map(([field, label]) => `**${label}:** ${meta[field]}`);
  return [`## ${id} — lesson ${id}`, "", ...(segments.length ? [`- ${segments.join(" · ")}`] : []), "- **What happened:** something.", ""].join("\n");
}

const DEFAULT_LESSON = { kind: "near-miss", area: "process", stage: "build", owner: "developer" };

// Milestone 39, exercising every parser: lessons, ADRs, capabilities + gaps, and an AOF.md summary.
// `lessons` / `gapStatuses` vary the conformance fixtures; the defaults are task 00's stream.
export async function writeEveryParserStream(workDir, { lessons = [DEFAULT_LESSON, DEFAULT_LESSON], gapStatuses = ["open", "discharged"] } = {}) {
  const dir = path.join(workDir, "39_milestone_fixture");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SPEC.md"), `${frontmatter({ type: "milestone", number: "39", slug: "fixture", status: "in-progress", schema: 1 })}# 39 · fixture\n`);
  await writeFile(
    path.join(dir, "RETROSPECTIVE.md"),
    `${frontmatter({ doc: "retrospective" })}# 39 · Retrospective\n\n${lessons.map((meta, i) => lessonText(`R${i + 1}`, meta)).join("\n")}`,
  );
  const adrs = [1, 2, 3].map((n) => `## ADR-00${n}: Decision ${n}\n\n**Status:** Accepted\n**Date:** 2026-10-04\n\n**Decision.** Decide ${n}.\n`);
  await writeFile(path.join(dir, "ARCHITECTURE.md"), `${frontmatter({ doc: "architecture" })}# 39 · Architecture\n\n${adrs.join("\n")}`);
  const capabilities = [1, 2, 3, 4].map((n) => `### Capability ${n}\n\nIt delivers ${n}.\n`);
  const gaps = gapStatuses.map((status, i) => `### Gap ${i + 1}\n\n- **Status:** ${status}\n\nIt lacks ${i + 1}.\n`);
  await writeFile(
    path.join(dir, "OUTCOME.md"),
    `${frontmatter({ doc: "outcome" })}# 39 · Outcome\n\n## Delivered\n\n${capabilities.join("\n")}\n## Gaps\n\n${gaps.join("\n")}`,
  );
  await writeFile(path.join(dir, "AOF.md"), `${frontmatter({ doc: "aof" })}# 39 · Digest\n\n## Intent\n\nThe intent of 39.\n`);
}

async function withStream(options, run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-mem-status-"));
  try {
    const workDir = path.join(root, "wiki", "work");
    const projectRoot = path.join(root, "project");
    await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
    await writeEveryParserStream(workDir, options);
    await run({ workDir, projectRoot });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function memory(backend, { workDir, projectRoot }, argv, extraCtx = {}) {
  const config = { memory: { backend } };
  const out = [];
  const outcome = await runMemory(argv, {
    config,
    resolveBackend: (cfg) => resolveConfiguredBackend(cfg),
    ctx: { workDir, projectRoot, configMemory: config.memory, invoke: graphifyMissing, ...extraCtx },
    log: (line) => out.push(line),
  });
  assert.equal(outcome.ok, true, `memory ${argv.join(" ")} on ${backend} succeeds: ${out.join("\n")}`);
  return { result: outcome.result, output: out.join("\n") };
}

async function ingestedStatus(backend, paths, { json = true } = {}) {
  await memory(backend, paths, ["ingest", "--all"]);
  return memory(backend, paths, json ? ["status", "--json"] : ["status"]);
}

const sumCounts = (types) => Object.values(types).reduce((sum, entry) => sum + entry.count, 0);

const EVERY_TYPE = {
  lesson: { count: 2, layer: "procedural" },
  adr: { count: 3, layer: "semantic" },
  capability: { count: 4, layer: "semantic" },
  gap: { count: 2, layer: "semantic" },
  summary: { count: 1, layer: "semantic" },
};

// ------------------------------------------------------------------- tasks ----

export const memoryStatusTests = [
  {
    name: "148/05 E1: every type is counted under its layer, and the counts sum to the record count",
    run: () => withStream({}, async (paths) => {
      const { result } = await ingestedStatus("local", paths);
      assert.deepEqual(result.types, EVERY_TYPE);
      assert.deepEqual(result.layers, { episodic: 0, semantic: 10, procedural: 2 });
      assert.equal(result.recordCount, 12);
      assert.equal(sumCounts(result.types), result.recordCount);
    }),
  },
  {
    name: "148/05 E2: a record type the map does not name is counted, never dropped",
    run: () => withStream({}, async (paths) => {
      await memory("local", paths, ["ingest", "--all"]);
      const finding = (n) => ({ recordType: "finding", id: `F-${n}`, item: "39", itemSlug: "fixture", title: `Finding ${n}`, area: "", stage: "", kind: "", owner: "", status: "", tags: [], summary: "", text: "", source: "x.md:1" });
      // The store also holds three records of a type the map does not name, written into the derived
      // index itself, so the backend's own recordCount and the composed partition read one store.
      const storePath = memoryIndexPath(paths.projectRoot);
      const store = JSON.parse(await readFile(storePath, "utf8"));
      store.records.push(finding(1), finding(2), finding(3));
      await writeFile(storePath, JSON.stringify(store));
      const { result } = await memory("local", paths, ["status", "--json"]);
      assert.deepEqual(result.types.finding, { count: 3, layer: "unmapped" });
      assert.equal(result.layers.unmapped, 3);
      assert.equal(result.recordCount, 15);
      assert.equal(sumCounts(result.types), result.recordCount);
    }),
  },
  {
    name: "148/05 E3: the local and graphify backends report the same partition over the same stream",
    run: () => withStream({}, async (paths) => {
      const local = (await ingestedStatus("local", paths)).result;
      const graphify = (await ingestedStatus("graphify", paths)).result;
      assert.deepEqual(graphify.types, local.types);
      assert.deepEqual(graphify.layers, local.layers);
      assert.equal(sumCounts(graphify.types), graphify.recordCount);
    }),
  },
  {
    name: "148/05: the none backend reports an empty partition",
    run: () => withStream({}, async (paths) => {
      const { result } = await memory("none", paths, ["status", "--json"]);
      assert.deepEqual(result.types, {});
      assert.deepEqual(result.layers, { episodic: 0, semantic: 0, procedural: 0 });
    }),
  },
  {
    name: "148/05: the text view keeps its first line and adds the layers",
    run: () => withStream({}, async (paths) => {
      const { output } = await ingestedStatus("local", paths, { json: false });
      const lines = output.split("\n");
      assert.equal(lines[0], "memory: backend=local records=12");
      assert.ok(lines.slice(1).includes("layers: episodic 0 · semantic 10 · procedural 2"), output);
    }),
  },
  {
    name: "148/05: the layer map names each layer once and each type once",
    run: () => {
      assert.equal(RECORD_TYPE_LAYERS.lesson, "procedural");
      for (const type of ["adr", "capability", "gap", "summary"]) assert.equal(RECORD_TYPE_LAYERS[type], "semantic", type);
      assert.ok(Object.isFrozen(RECORD_TYPE_LAYERS));
      // A type is one key, so it can carry one layer; every layer it names is one of the three.
      for (const layer of Object.values(RECORD_TYPE_LAYERS)) assert.ok(["episodic", "semantic", "procedural"].includes(layer), layer);
    },
  },
  {
    name: "148/05 E4: Kind conformance counts the blank and the non-vocabulary",
    run: () => withStream({ lessons: [{ ...DEFAULT_LESSON }, { ...DEFAULT_LESSON, kind: "blind spot" }, { ...DEFAULT_LESSON, kind: "" }] }, async (paths) => {
      const { result } = await ingestedStatus("local", paths);
      assert.deepEqual(result.conformance.kind, { blank: 1, nonEnum: 1 });
    }),
  },
  {
    name: "148/05 E5: gap status conformance counts the non-vocabulary",
    run: () => withStream({ gapStatuses: ["open", "discharged", "pending"] }, async (paths) => {
      const { result } = await ingestedStatus("local", paths);
      assert.deepEqual(result.conformance.gapStatus, { nonEnum: 1 });
    }),
  },
  {
    name: "148/05 E6: Owner reports blanks only",
    run: () => withStream({ lessons: [{ ...DEFAULT_LESSON }, { ...DEFAULT_LESSON, owner: "the operator" }, { ...DEFAULT_LESSON, owner: "" }] }, async (paths) => {
      const { result } = await ingestedStatus("local", paths);
      assert.deepEqual(result.conformance.owner, { blank: 1 });
    }),
  },
  ...[
    ["area", ["process", "testing", ""], { blank: 1, nonEnum: 1 }],
    ["stage", ["build", "continue", "review"], { blank: 0, nonEnum: 2 }],
  ].map(([field, values, counts]) => ({
    name: `148/05 outline: ${field} is counted the same way — ${JSON.stringify(values)}`,
    run: () => withStream({ lessons: values.map((value) => ({ ...DEFAULT_LESSON, [field]: value })) }, async (paths) => {
      const { result } = await ingestedStatus("local", paths);
      assert.deepEqual(result.conformance[field], counts);
    }),
  })),
  {
    name: "148/05: the text view adds one conformance line",
    run: () => withStream({ lessons: [{ ...DEFAULT_LESSON }, { ...DEFAULT_LESSON, kind: "blind spot" }, { ...DEFAULT_LESSON, kind: "" }] }, async (paths) => {
      const { output } = await ingestedStatus("local", paths, { json: false });
      const lines = output.split("\n").filter((line) => line.startsWith("conformance:"));
      assert.equal(lines.length, 1, output);
      assert.match(lines[0], /kind blank 1 non-enum 1/);
    }),
  },
  {
    name: "148/05: conformance adds no top-level number to status",
    run: () => withStream({}, async (paths) => {
      for (const backend of ["local", "graphify"]) {
        const { result } = await ingestedStatus(backend, paths);
        for (const key of ["conformance", "types", "layers"]) {
          assert.equal(typeof result[key], "object", `${backend}: ${key} is an object`);
          assert.ok(result[key] !== null && !Array.isArray(result[key]), `${backend}: ${key} is a plain object`);
        }
        // The top-level split is the backend's own and is not edited here (ADR-004 §3): local's
        // accounts for every type, so the composition must leave its sum intact. Graphify's legacy
        // split names lessons and adrs only, which is why `types` exists — it is held above.
        if (backend !== "local") continue;
        const numbers = Object.entries(result).filter(([key, value]) => typeof value === "number" && key !== "recordCount");
        assert.equal(numbers.reduce((sum, [, value]) => sum + value, 0), result.recordCount, `${backend}: ${JSON.stringify(Object.fromEntries(numbers))}`);
      }
    }),
  },
];
