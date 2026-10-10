// Traceability wiring for milestone 153 / story 03, task 01 (account-for-memory-effectiveness) —
// `memory status` gains a nested `effectiveness` block through the REAL seam, over every backend:
//
//   E1 · surfacing and recurrence are counted from their separate evidence
//   E2 · bare lesson ids do not join unrelated items
//   E3 · a removed target keeps its observed history, provenance unresolved
//   outline · accounting is shared by every configured backend (local, graphify, none)
//   status writes no index, ledger or retrospective; the legacy fields stay intact
//
// The stream is a temp folder; nothing here touches the real index or the real global home.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { createMemory } from "@aof/knowledge/memory";
import noneBackend from "../src/memory/none-backend.mjs";

const refuse = (what) => () => { throw new Error(`this suite must not reach ${what}`); };
const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const observation = (id, records) => ({ kind: "recall", id, at: "2026-10-10T10:00:00.000Z", edge: "refine.architect", actor: "architect", query: "junction", scope: {}, records });
const returned = (item, id, verdict, recordType = "lesson") => ({ item, id, recordType, verdict });

// milestone 45 (R13) and 68 (R13, R10 recurring 45/R13); 45's ledger holds two completed recalls of 45/R13.
async function stream() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-153-03-"));
  const workDir = path.join(root, "wiki", "work");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const items = [];
  const lesson = (id, title, ...extra) => [`## ${id} — ${title}`, "", META, ...extra, `- **What happened:** ${title}.`, ""].join("\n");
  const milestones = [
    [45, [lesson("R13", "a junction removal deleted the real tree")]],
    [68, [lesson("R13", "an unrelated lesson about hooks"), lesson("R10", "the junction deleted the tree again", "- **Recurs:** 45/R13")]],
  ];
  for (const [number, lessons] of milestones) {
    const dir = path.join(workDir, `${number}_milestone_m${number}`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SPEC.md"), `---\ntype: milestone\nnumber: ${number}\nslug: m${number}\nstatus: done\nupdated: 2026-01-0${number % 9 + 1}\nschema: 1\n---\n# ${number}\n`);
    await writeFile(path.join(dir, "RETROSPECTIVE.md"), [`# ${number} · Retrospective`, "", ...lessons].join("\n"));
    items.push({ type: "milestone", parent: null, ref: String(number), number: String(number), slug: `m${number}`, dir });
  }
  const ledger = path.join(items[0].dir, "FEEDBACK.ndjson");
  await writeFile(ledger, [
    observation("r1", [returned("45", "R13", "honoured"), returned("45", "ADR-001", "irrelevant", "adr")]),
    observation("r2", [returned("45", "R13", "departed"), returned("9", "cap-a", "departed", "capability")]),
  ].map((row) => JSON.stringify(row)).join("\n") + "\n");

  const indexing = createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
  });
  const ctx = {
    workDir,
    projectRoot: root,
    configMemory: {},
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
  const backends = { local: createLocalBackend(indexing).default, graphify: graphify.default, none: noneBackend };
  await backends.local.reindex(null, ctx);
  await backends.graphify.reindex(null, ctx);
  return { root, ctx, backends, workDir, ledger };
}

async function withStream(run) {
  const s = await stream();
  try {
    await run(s);
  } finally {
    await rm(s.root, { recursive: true, force: true });
  }
}

const { runMemory, renderMemory, parseMemoryArgv } = createMemory({ loadLocalBackend: refuse("a configured local backend"), loadGraphifyBackend: refuse("a configured graphify backend") });
const status = async (s, backend, ...flags) => (await runMemory(["status", ...flags, "--json"], { resolveBackend: async () => s.backends[backend], ctx: s.ctx })).result;

async function snapshot(root) {
  const files = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.set(path.relative(root, full), `${(await stat(full)).size}:${await readFile(full, "utf8")}`);
    }
  }
  await walk(root);
  return files;
}

const pick = (entry) => [entry.surfaced, entry.honoured, entry.departed, entry.irrelevant, entry.recurred];
const BACKENDS = ["local", "graphify", "none"];

export const memoryEffectivenessTests = [
  {
    name: "153/03 parse: `status --lessons` asks for the per-lesson table; any other verb ignores the flag",
    run: () => {
      assert.equal(parseMemoryArgv(["status", "--lessons"]).lessons, true);
      assert.equal(parseMemoryArgv(["status"]).lessons, false);
      assert.equal(parseMemoryArgv(["recall", "x", "--lessons"]).verb, "recall");
    },
  },
  {
    name: "153/03 E1: surfaced 2, honoured 1, departed 1 and recurred 1 are counted for 45/R13, and the type totals include them under lesson",
    run: () => withStream(async (s) => {
      const result = await status(s, "local", "--lessons");
      assert.deepEqual(pick(result.effectiveness.lessons["45/R13"]), [2, 1, 1, 0, 1]);
      assert.deepEqual(pick(result.effectiveness.types.lesson), [2, 1, 1, 0, 1]);
      assert.match(result.effectiveness.basis, /not proof/);
    }),
  },
  {
    name: "153/03 E2: 68/R13 shares only a bare id with 45/R13, so it is listed with all five counts zero",
    run: () => withStream(async (s) => {
      const lessons = (await status(s, "local", "--lessons")).effectiveness.lessons;
      assert.deepEqual(pick(lessons["68/R13"]), [0, 0, 0, 0, 0]);
      assert.equal(lessons["68/R13"].provenance, "indexed");
    }),
  },
  {
    name: "153/03 E3: a target absent from the index keeps its counts, provenance unresolved, and still totals",
    run: () => withStream(async (s) => {
      const lessons = (await status(s, "none", "--lessons")).effectiveness;
      assert.equal(lessons.lessons["45/R13"].provenance, "unresolved");
      assert.deepEqual(pick(lessons.lessons["45/R13"]), [2, 1, 1, 0, 1]);
      assert.equal(lessons.types.lesson.surfaced, 2);
    }),
  },
  {
    name: "153/03: every returned record type contributes only its own observations, and per-lesson detail is omitted without the flag",
    run: () => withStream(async (s) => {
      const result = await status(s, "local");
      assert.deepEqual(pick(result.effectiveness.types.adr), [1, 0, 0, 1, 0]);
      assert.deepEqual(pick(result.effectiveness.types.capability), [1, 0, 1, 0, 0]);
      assert.equal("lessons" in result.effectiveness, false);
      assert.equal(result.recordCount, 3, "the legacy top-level counts are preserved");
      assert.equal(result.lessons, 3);
    }),
  },
  ...BACKENDS.map((backend) => ({
    name: `153/03: accounting is shared by every configured backend — ${backend} reports lesson surfaced 2 and writes nothing`,
    run: () => withStream(async (s) => {
      const before = await snapshot(s.root);
      const result = await status(s, backend);
      assert.equal(result.effectiveness.types.lesson.surfaced, 2);
      assert.deepEqual(await snapshot(s.root), before, "status wrote no index, ledger or retrospective");
    }),
  })),
  {
    name: "153/03: a corrupt ledger is a diagnostic in the report, which says it is incomplete",
    run: () => withStream(async (s) => {
      await writeFile(s.ledger, "{not json\n");
      const result = await status(s, "local");
      assert.equal(result.effectiveness.complete, false);
      assert.deepEqual(result.effectiveness.diagnostics.map((diagnostic) => diagnostic.defect), ["malformed ledger JSON"]);
      const text = renderMemory("status", result);
      assert.match(text, /effectiveness \(incomplete\)/);
      assert.match(text, /effectiveness diagnostic: .*FEEDBACK\.ndjson:1 — malformed ledger JSON/);
    }),
  },
  {
    name: "153/03: the human render adds one effectiveness line, and a table line per lesson under --lessons",
    run: () => withStream(async (s) => {
      const text = renderMemory("status", await status(s, "local", "--lessons"));
      assert.match(text, /^effectiveness: adr surfaced 1 .* · capability surfaced 1 .* · lesson surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 1$/m);
      assert.match(text, /^  45\/R13 · surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 1$/m);
      assert.match(renderMemory("status", await status(s, "none", "--lessons")), /45\/R13 .* provenance unresolved/);
    }),
  },
];
