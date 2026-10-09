// Traceability wiring for milestone 148 / story 02 (a-lessons-meta-line-is-normalised-on-read) —
// the scenarios that need the parsers and the backends, which live in this package. The vocabulary
// module's own contract is `packages/work/test/memory-vocabulary.suite.mjs`.
//
//   00_a-lessons-meta-value-is-indexed-as-its-vocabulary-word-with-the-rest-as-a-tag.feature
//   01_a-gaps-status-is-one-of-three-and-its-date-and-cause-are-tags.feature
//   02_every-record-carries-tags-and-a-store-before-version-2-is-stale.feature
//
// Everything is built from the knowledge factories with hermetic collaborators: the stream is a temp
// folder, the graph build is refused (so the graphify backend reports it skipped), and no global
// store is opened.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { createMemory } from "@aof/knowledge/memory";
import { MEMORY_RECORD_FIELDS, recall as localRecall } from "@aof/knowledge/memory/local-retrieval";
import { createTuneCorpus } from "@aof/work/tune/corpus";

const refuse = (what) => () => { throw new Error(`this suite must not reach ${what}`); };

// The stream every build reads: whatever `items` the scenario hands in, all local.
function indexingFor(items, root) {
  return createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
  });
}

// Parsing needs no stream at all.
const { parseRetrospective, parseOutcome } = indexingFor([], os.tmpdir());

const META = { item: "40", itemSlug: "m40", workRelPath: "40_milestone_m40/RETROSPECTIVE.md" };

function retro(metaLines) {
  return [
    "# 40 · m40 — Retrospective",
    "",
    "## R1 — A lesson about a meta line",
    "",
    ...metaLines,
    "- **What happened:** x",
    "- **Why:** y",
    "- **Lesson:** z",
    "",
  ].join("\n");
}

const lessonOf = (metaLine) => {
  const lessons = parseRetrospective(retro(Array.isArray(metaLine) ? metaLine : [metaLine]), META);
  assert.equal(lessons.length, 1, "one lesson parsed");
  return lessons[0];
};

const OUTCOME_META = { item: "119/03", itemSlug: "a-cited-path", workRelPath: "119_milestone_x/stories/03_story_a-cited-path/OUTCOME.md" };

function outcome(statusLine, title = "A cited path in a shipped asset") {
  return [
    "# 119/03 · Outcome",
    "",
    "## Gaps",
    "",
    `### ${title}`,
    ...(statusLine == null ? [] : [statusLine]),
    "- **Discharge condition:** a probe resolves every cited path",
    "",
  ].join("\n");
}

const gapOf = (statusLine) => {
  const gaps = parseOutcome(outcome(statusLine), OUTCOME_META).filter((r) => r.recordType === "gap");
  assert.equal(gaps.length, 1, "one gap parsed");
  return gaps[0];
};

const E1 = "- **Kind:** near-miss (cross-milestone, discovered here) · **Area:** memory/accounting · **Stage:** verify · **Owner:** architect";

// A temp project holding milestone 39 (ARCHITECTURE, OUTCOME, RETROSPECTIVE), as task 02's fixture.
async function stream39() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-148-02-"));
  const workDir = path.join(root, "wiki", "work");
  const dir = path.join(workDir, "39_milestone_delivery");
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(path.join(dir, "ARCHITECTURE.md"), [
    "# 39 · Architecture", "",
    "## ADR-001: Delivery records reuse the frozen MemoryRecord", "",
    "**Status:** Accepted", "",
    "**Decision.** delivery records reuse the frozen MemoryRecord shape.", "",
  ].join("\n"));
  await writeFile(path.join(dir, "OUTCOME.md"), [
    "# 39 · Outcome", "",
    "## Delivered", "",
    "### Delivery records are recallable",
    "A capability record is indexed for every delivered heading.", "",
    "## Gaps", "",
    "### warnings_delivered field",
    "- **Status:** open",
    "- **Discharge condition:** a production path writes it",
    "Nothing writes the field.", "",
  ].join("\n"));
  await writeFile(path.join(dir, "RETROSPECTIVE.md"), [
    "# 39 · Retrospective", "",
    "## R1 — A recurring near-miss", "",
    "- **Kind:** near-miss (recurring) · **Area:** code · **Stage:** build · **Owner:** developer",
    "- **What happened:** x", "- **Why:** y", "- **Lesson:** z", "",
  ].join("\n"));
  const items = [{ type: "milestone", parent: null, ref: "39", number: "39", slug: "delivery", dir }];
  const indexing = indexingFor(items, root);
  const ctx = {
    workDir,
    projectRoot: root,
    configMemory: {},
    // The graph half is refused: graphify reindex reports it skipped and writes only its store.
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
  const local = createLocalBackend(indexing);
  return { root, ctx, indexing, backends: { local: local.default, graphify: graphify.default }, graphify };
}

async function withStream(run) {
  const s = await stream39();
  try {
    await run(s);
  } finally {
    await rm(s.root, { recursive: true, force: true });
  }
}

const { runMemory, renderMemory } = createMemory({ loadLocalBackend: refuse("a configured local backend"), loadGraphifyBackend: refuse("a configured graphify backend") });

// A store written as an older build wrote it: version 1, no `tags` on any record.
async function writeVersionOneStore(s, backendName) {
  const records = (await s.indexing.buildRecords(null, s.ctx)).map(({ tags, ...rest }) => rest);
  const storePath = backendName === "local"
    ? s.indexing.memoryIndexPath(s.root)
    : s.graphify.graphifyIndexPath(s.root);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify({ backend: backendName, version: 1, recordCount: records.length, records }));
}

async function statusOf(s, backendName) {
  const { result } = await runMemory(["status", "--json"], { resolveBackend: async () => s.backends[backendName], ctx: s.ctx });
  return { result, text: renderMemory("status", result) };
}

export const memoryMetaNormalisedTests = [
  // ── 00 · a lesson's meta line ───────────────────────────────────────────────
  {
    name: "148/02/00 E1: a Kind with a parenthetical qualifier",
    run: () => {
      const lesson = lessonOf(E1);
      assert.equal(lesson.kind, "near-miss");
      assert.deepEqual(lesson.tags, ["cross-milestone, discovered here"]);
    },
  },
  {
    name: "148/02/00 E2: a Stage with a parenthetical qualifier",
    run: () => {
      const lesson = lessonOf("- **Kind:** mistake · **Area:** code · **Stage:** build (caught at review) · **Owner:** developer");
      assert.equal(lesson.stage, "build");
      assert.deepEqual(lesson.tags, ["caught at review"]);
    },
  },
  {
    name: "148/02/00 E3: an Area with a parenthetical qualifier",
    run: () => {
      const lesson = lessonOf("- **Kind:** near-miss · **Area:** process (calibration) · **Stage:** refine · **Owner:** architect");
      assert.equal(lesson.area, "process");
      assert.deepEqual(lesson.tags, ["calibration"]);
    },
  },
  {
    name: "148/02/00 E4: a word written in another case is the vocabulary word",
    run: () => {
      const lesson = lessonOf("- **Kind:** Near-Miss · **Area:** Code · **Stage:** Build · **Owner:** developer");
      assert.deepEqual([lesson.kind, lesson.area, lesson.stage], ["near-miss", "code", "build"]);
      assert.deepEqual(lesson.tags, []);
    },
  },
  {
    name: "148/02/00 E5: a remainder that is not in parentheses is kept as written",
    run: () => {
      const lesson = lessonOf("- **Kind:** near-miss · **Area:** architecture · **Stage:** build→verify · **Owner:** architect");
      assert.equal(lesson.stage, "build");
      assert.deepEqual(lesson.tags, ["→verify"]);
    },
  },
  {
    name: "148/02/00: qualifiers from several fields are tags in field order, without repeats",
    run: () => {
      const lesson = lessonOf("- **Kind:** near-miss (recurring) · **Area:** process (recurring) · **Stage:** build (caught at review) · **Owner:** qa");
      assert.deepEqual(lesson.tags, ["recurring", "caught at review"]);
    },
  },
  {
    name: "148/02/00: a meta split across two lines is read whole, as before",
    run: () => {
      const lesson = lessonOf([
        "- **Kind:** blocker (stall) · **Area:** process",
        "- **Stage:** build · **Owner:** orchestrator · **Raised by:** observe",
      ]);
      assert.deepEqual([lesson.kind, lesson.area, lesson.stage], ["blocker", "process", "build"]);
      assert.deepEqual(lesson.tags, ["stall"]);
    },
  },
  {
    name: "148/02/00: only the indexed fields change; title, summary, text, owner and source do not",
    run: () => {
      const tagged = lessonOf("- **Kind:** near-miss (recurring) · **Area:** code · **Stage:** build · **Owner:** developer (Story 00)");
      const plain = lessonOf("- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer (Story 00)");
      assert.equal(tagged.owner, "developer (Story 00)");
      for (const field of ["title", "summary", "text", "source"]) assert.equal(tagged[field], plain[field], field);
    },
  },
  {
    name: "148/02/00 E6: a word that runs on past a vocabulary word is not that word",
    run: () => {
      const lesson = lessonOf("- **Kind:** mistakes · **Area:** code · **Stage:** build · **Owner:** developer");
      assert.equal(lesson.kind, "mistakes");
      assert.deepEqual(lesson.tags, []);
    },
  },
  {
    name: "148/02/00 E7: a Kind outside the vocabulary is kept as written, never mapped",
    run: () => {
      const lesson = lessonOf("- **Kind:** blind spot · **Area:** contract · **Stage:** refine · **Owner:** qa");
      assert.equal(lesson.kind, "blind spot");
      assert.deepEqual(lesson.tags, []);
    },
  },
  ...[
    { kind: "defect", area: "testing", stage: "continue" },
    { kind: "confirmed approach", area: "planning", stage: "review" },
    { kind: "process", area: "memory/accounting", stage: "accept" },
  ].map((row) => ({
    name: `148/02/00 outline: other words outside the vocabulary are kept as written — ${row.kind} / ${row.area} / ${row.stage}`,
    run: () => {
      const lesson = lessonOf(`- **Kind:** ${row.kind} · **Area:** ${row.area} · **Stage:** ${row.stage} · **Owner:** developer`);
      assert.deepEqual([lesson.kind, lesson.area, lesson.stage], [row.kind, row.area, row.stage]);
    },
  })),
  {
    name: "148/02/00 E8: a lesson with no meta line is indexed blank, never guessed",
    run: () => {
      const text = [
        "## R1 — A harness that cannot express a side effect", "",
        "The harness had no way to express it, which was a near-miss the review caught.", "",
      ].join("\n");
      const [lesson] = parseRetrospective(text, META);
      assert.ok(lesson.text.includes("A harness") && text.includes("near-miss"), "fixture: the prose names near-miss");
      assert.deepEqual([lesson.kind, lesson.area, lesson.stage], ["", "", ""]);
      assert.deepEqual(lesson.tags, []);
    },
  },
  {
    name: "148/02/00: the tune corpus reads the same values the index does",
    run: async () => {
      const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-148-02-tune-"));
      try {
        const dir = path.join(cwd, "wiki", "work", "40_milestone_m40");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "SPEC.md"), "---\ntype: milestone\nnumber: 40\nslug: m40\nstatus: in-progress\n---\n# 40\n");
        await writeFile(path.join(dir, "RETROSPECTIVE.md"), retro([E1]));
        // Only the lessons lane is under test: the run and snapshot readers answer nothing.
        const { assembleCorpus } = createTuneCorpus({
          parseRetrospective,
          readRuns: async () => [],
          runNodeRecordPath: refuse("runNodeRecordPath"),
          runRecordPath: refuse("runRecordPath"),
          readLatestSnapshot: async () => null,
          loopPointersIn: () => [],
        });
        const corpus = await assembleCorpus({ cwd });
        const lessons = corpus.lanes.find((lane) => lane.lane === "lessons").raw;
        const lesson = lessons.find((l) => l.item === "40");
        assert.ok(lesson, "the corpus read 40's lesson");
        assert.equal(lesson.kind, "near-miss");
        assert.deepEqual(lesson.tags, ["cross-milestone, discovered here"]);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },

  // ── 01 · a gap's status ─────────────────────────────────────────────────────
  {
    name: "148/02/01 E9: a discharge with its cause in parentheses",
    run: () => {
      const gap = gapOf("- **Status:** discharged (by story `86`, 2026-09-04)");
      assert.equal(gap.status, "discharged");
      assert.deepEqual(gap.tags, ["by story 86, 2026-09-04"]);
    },
  },
  {
    name: "148/02/01 E10: \"open by decision\" is its own status, not \"open\" with a tag",
    run: () => {
      const gap = gapOf("- **Status:** open by decision");
      assert.equal(gap.status, "open-by-decision");
      assert.deepEqual(gap.tags, []);
    },
  },
  {
    name: "148/02/01 E11: a gap with no Status line is open",
    run: () => {
      const gap = gapOf(null);
      assert.equal(gap.status, "open");
      assert.deepEqual(gap.tags, []);
    },
  },
  ...[
    { written: "open", status: "open", tags: [] },
    { written: "discharged", status: "discharged", tags: [] },
    { written: "discharged 2026-08-23 by `m70/05`", status: "discharged", tags: ["2026-08-23 by m70/05"] },
    { written: "discharged (2026-08-23, at 54's verify) — **but not by the mechanism**", status: "discharged", tags: ["(2026-08-23, at 54's verify) — but not by the mechanism"] },
    { written: "open-by-decision", status: "open-by-decision", tags: [] },
    { written: "pending", status: "pending", tags: [] },
  ].map((row) => ({
    name: `148/02/01 outline: the spellings measured on the live corpus — "${row.written}"`,
    run: () => {
      const gap = gapOf(`- **Status:** ${row.written}`);
      assert.equal(gap.status, row.status);
      assert.deepEqual(gap.tags, row.tags);
    },
  })),
  {
    name: "148/02/01: a gap's other fields are unchanged",
    run: () => {
      const tagged = gapOf("- **Status:** discharged (by story `86`, 2026-09-04)");
      const plain = gapOf("- **Status:** discharged");
      for (const field of ["title", "summary", "text", "source"]) assert.equal(tagged[field], plain[field], field);
    },
  },
  {
    name: "148/02/01: a gap-status scope is exact on the vocabulary word",
    run: async () => {
      const discharged = parseOutcome(outcome("- **Status:** discharged (by story `86`, 2026-09-04)", "First gap"), OUTCOME_META);
      const byDecision = parseOutcome(outcome("- **Status:** open by decision", "Second gap"), OUTCOME_META);
      const records = [...discharged, ...byDecision];
      const result = await localRecall("", { status: "discharged" }, { limit: 10 }, { records });
      assert.deepEqual(result.records.map((r) => r.title), ["First gap"]);
    },
  },

  // ── 02 · tags and index version 2 ───────────────────────────────────────────
  {
    name: "148/02/02 E12: every record carries a tags array",
    run: () => withStream(async (s) => {
      const records = await s.indexing.buildRecords(null, s.ctx);
      assert.ok(records.length >= 4, `the fixture built ${records.length} records`);
      for (const record of records) assert.ok(Array.isArray(record.tags), `${record.recordType} ${record.id} carries tags`);
      for (const type of ["adr", "capability", "gap"]) {
        const of = records.filter((r) => r.recordType === type);
        assert.ok(of.length > 0, `a ${type} record was built`);
        for (const record of of) assert.deepEqual(record.tags, [], `${type} ${record.id} carries tags []`);
      }
      assert.deepEqual(records.find((r) => r.recordType === "lesson").tags, ["recurring"]);
      assert.ok(MEMORY_RECORD_FIELDS.includes("tags"), "MEMORY_RECORD_FIELDS names tags");
    }),
  },
  {
    name: "148/02/02: both index versions are 2",
    run: () => withStream(async (s) => {
      const local = await s.backends.local.reindex(null, s.ctx);
      const graphify = await s.backends.graphify.reindex(null, s.ctx);
      assert.equal(local.version, 2);
      assert.equal(graphify.version, 2);
      assert.equal(s.indexing.INDEX_VERSION, 2);
      assert.equal(s.graphify.GRAPHIFY_INDEX_VERSION, 2);
    }),
  },
  {
    name: "148/02/02 E13: a version-1 store whose records carry no tags still answers recall",
    run: () => withStream(async (s) => {
      await writeVersionOneStore(s, "graphify");
      const result = await s.backends.graphify.recall("delivery records reuse", {}, {}, s.ctx);
      const adr = result.records.find((r) => r.recordType === "adr");
      assert.ok(adr, "the ADR record is returned");
      assert.deepEqual(adr.tags, [], "a missing tags field is read as []");
    }),
  },
  ...["local", "graphify"].map((backend) => ({
    name: `148/02/02 E14 outline: each backend reports a version-1 store as stale — ${backend}`,
    run: () => withStream(async (s) => {
      await writeVersionOneStore(s, backend);
      const { result, text } = await statusOf(s, backend);
      assert.deepEqual(result.index, { version: 1, current: 2, stale: true });
      assert.match(text, /aof work memory ingest/);
    }),
  })),
  ...["local", "graphify"].map((backend) => ({
    name: `148/02/02 E15 outline: each backend reports a version-2 store as current — ${backend}`,
    run: () => withStream(async (s) => {
      await s.backends[backend].reindex(null, s.ctx);
      const { result, text } = await statusOf(s, backend);
      assert.deepEqual(result.index, { version: 2, current: 2, stale: false });
      assert.doesNotMatch(text, /aof work memory ingest/);
    }),
  })),
  {
    name: "148/02/02: the stale block adds no top-level number to status",
    run: () => withStream(async (s) => {
      await s.backends.local.reindex(null, s.ctx);
      const { result } = await statusOf(s, "local");
      const numeric = Object.entries(result).filter(([, value]) => typeof value === "number");
      const perType = numeric.filter(([key]) => key !== "recordCount");
      assert.deepEqual(
        perType.map(([key]) => key).sort(),
        ["adrs", "capabilities", "gaps", "lessons", "summaries"],
        "the only top-level numbers besides recordCount are the per-type counts",
      );
      assert.equal(perType.reduce((sum, [, n]) => sum + n, 0), result.recordCount, "they sum to recordCount");
    }),
  },
];
