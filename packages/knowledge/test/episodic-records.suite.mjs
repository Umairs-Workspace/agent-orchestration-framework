// Traceability wiring for milestone 157 / story 01 (episodic-records-resolve-to-their-sources) —
// the leaf's own units, built from the knowledge factories with injected readers, over a temp
// stream. The task features are bound end to end in
// `test/integration/features/memory-episodic-records.feature`; FF-15701 is
// `test/arch/memory/acd-episodic-source-provenance.test.mjs`. This suite covers what neither
// reaches cheaply: the walk's record order, the readers' absent and refused answers, a headerless
// register row, and the pointer helpers.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";

const MILESTONE = "39_milestone_x";

const runRecord = (runId, state, extra = {}) => ({ runId, itemRef: "39", state, attempt: 1, outcome: state, sessionId: "s-1", brief: {}, failureReason: null, retryOf: null, node: null, ...extra });

async function fixture({ verification = null, ledger = null, runs = [], snapshot = undefined, retrospective = false, readers = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-157-01-"));
  const workDir = path.join(root, "wiki", "work");
  const dir = path.join(workDir, MILESTONE);
  await mkdir(dir, { recursive: true });
  if (verification) await writeFile(path.join(dir, "VERIFICATION.md"), verification);
  if (ledger != null) await writeFile(path.join(dir, "FEEDBACK.ndjson"), ledger);
  if (retrospective) {
    await writeFile(path.join(dir, "RETROSPECTIVE.md"), "# R\n\n## R1 — A lesson\n\n- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer\n- **Lesson:** z\n");
  }
  const degrades = [];
  const snapshotReads = [];
  const items = [{ type: "milestone", parent: null, ref: "39", number: "39", slug: "x", dir }];
  const { buildRecords, readRecordSourceValue } = createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
    episodicReaders: {
      readRuns: async () => runs,
      runRecordPath: (item, runId) => path.join(item.dir, "runs", `${runId}.json`),
      runNodeRecordPath: (item, node, runId) => path.join(item.dir, "runs", node, `${runId}.json`),
      readLatestSnapshot: async (args) => {
        snapshotReads.push(args);
        return snapshot === undefined ? null : snapshot;
      },
      readFeedbackRecords: async () => {
        throw Object.assign(new Error("Feedback record line 2 is invalid: Unexpected token"), { code: "feedback-record-invalid" });
      },
      feedbackRecordPath: (item) => path.join(item.dir, "FEEDBACK.ndjson"),
      reportDegrade: (code, error, extra) => degrades.push({ code, message: error.message, path: extra?.path }),
      ...readers,
    },
  });
  return { root, workDir, dir, degrades, snapshotReads, readRecordSourceValue, build: (ctx = {}) => buildRecords(null, { workDir, projectRoot: root, configMemory: {}, ...ctx }) };
}

async function withFixture(options, run) {
  const stream = await fixture(options);
  try {
    await run(stream);
  } finally {
    await rm(stream.root, { recursive: true, force: true });
  }
}

export const episodicRecordsTests = [
  {
    name: "157/01: an item's episodic records follow its existing records, in the one walk",
    run: () => withFixture({ retrospective: true, verification: "## Findings\n\n| id | severity | finding |\n|---|---|---|\n| F-01 | major | a finding |\n", runs: [runRecord("r-1", "done")] }, async (s) => {
      const types = (await s.build()).map((record) => record.recordType);
      assert.deepEqual(types, ["lesson", "finding", "run"]);
    }),
  },
  {
    name: "157/01: a construction without episodic readers builds exactly the records it built before",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-157-01-"));
      try {
        const dir = path.join(root, "wiki", "work", MILESTONE);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "VERIFICATION.md"), "## Findings\n\n| F-01 | major | a finding |\n");
        const { buildRecords } = createLocalIndexing({
          listItemsCacheFirst: async () => [{ type: "milestone", parent: null, ref: "39", number: "39", slug: "x", dir }],
          localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
          reportReachThroughSkips: () => {},
          ensureAofGitignore: async () => {},
          importStoreRoot: () => path.join(root, "imports"),
          ARCHITECTURE_FILE: "ARCHITECTURE.md",
          RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
          AOF_FILE: "AOF.md",
        });
        assert.deepEqual(await buildRecords(null, { workDir: path.join(root, "wiki", "work"), projectRoot: root }), []);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "157/01 R1: a headerless register row is read positionally, never mislabelled",
    run: () => withFixture({ verification: "## Findings\n\n| F-58-01-1 | the scenario FAILS on twelve of fifteen rows |\n| F-58-01-2 | b |\n" }, async (s) => {
      const finding = (await s.build()).find((record) => record.id === "F-58-01-1");
      assert.equal(finding.title, "the scenario FAILS on twelve of fifteen rows");
      assert.equal(finding.status, "", "no status column, no status");
      assert.equal(finding.source, `${MILESTONE}/VERIFICATION.md:3`);
    }),
  },
  {
    name: "157/01 R1: a heading-only finding reads its whole section, its fields and nothing past its peer",
    run: () => withFixture({
      verification: "## Findings\n\n### F-07 · the hook fails open\n\n- **Severity:** blocker\n- **Status:** fixed\n- **Stage:** continue\n\nThe path was relative.\n\n#### Evidence\n\nmeasured twice\n\n### F-08 · another\n\nnot F-07's\n",
    }, async (s) => {
      const records = await s.build();
      const f07 = records.find((record) => record.id === "F-07");
      assert.equal(f07.title, "the hook fails open");
      assert.deepEqual([f07.status, f07.stage], ["fixed", "build"]);
      assert.match(f07.summary, /^blocker · fixed — /);
      assert.ok(f07.text.includes("measured twice"), "a deeper subheading stays inside the section");
      assert.ok(!f07.text.includes("not F-07's"), "the next peer heading ends the section");
    }),
  },
  {
    name: "157/01 R1: a heading finding's section ends at the next finding's register row",
    run: () => withFixture({ verification: "## Findings\n\n### F-01 · the summary\n\nF-01's evidence\n\n| id | finding |\n|---|---|\n| F-02 | a sibling row |\n" }, async (s) => {
      const records = await s.build();
      const f01 = records.find((record) => record.id === "F-01");
      assert.ok(f01.text.includes("F-01's evidence"), f01.text);
      assert.ok(!f01.text.includes("a sibling row"), "F-02's row is not folded into F-01");
      assert.ok(records.some((record) => record.id === "F-02"), "the sibling row is its own record");
    }),
  },
  {
    name: "157/01 R1: a second declaration of one id is named in the record's text",
    run: () => withFixture({ verification: "## Findings\n\n| id | severity | finding |\n|---|---|---|\n| F-01 | major | a finding |\n\n### F-01 · a finding\n\nevidence\n" }, async (s) => {
      const [finding] = (await s.build()).filter((record) => record.id === "F-01");
      assert.equal(finding.source, `${MILESTONE}/VERIFICATION.md:5`);
      assert.ok(finding.text.includes(`also declared at ${MILESTONE}/VERIFICATION.md:7`), finding.text);
    }),
  },
  {
    name: "157/01 R2: a ledger the reader refuses is reported through its own diagnostic and yields no record",
    run: () => withFixture({ ledger: '{"kind":"raw"}\n{ not json\n' }, async (s) => {
      const records = await s.build();
      assert.deepEqual(records.filter((record) => record.recordType === "feedback"), []);
      assert.deepEqual(s.degrades.map((entry) => [entry.code, entry.message]), [["memory-episodic-feedback", "Feedback record line 2 is invalid: Unexpected token"]]);
      assert.equal(s.degrades[0].path, path.join(s.dir, "FEEDBACK.ndjson"));
    }),
  },
  {
    name: "157/01 R3: a stream outside <project>/wiki/work reports stalls unavailable and reads no snapshot",
    run: () => withFixture({ runs: [runRecord("r-1", "done")], snapshot: { jsonPath: "x", json: { agents: [{ sessionId: "s-1", attributedTo: "39", stalls: [] }] } } }, async (s) => {
      const [run] = await s.build({ projectRoot: path.join(s.root, "elsewhere") });
      assert.match(run.text, /stalls: unavailable \(the snapshot reader reads only <project>\/wiki\/work\)/);
      assert.deepEqual(s.snapshotReads, []);
    }),
  },
  {
    name: "157/01 R3: an unreadable snapshot, a session-less run and an agent without telemetry are each unavailable, never zero",
    run: async () => {
      const cases = [
        [{ runs: [runRecord("r-1", "done")], snapshot: { jsonPath: "x", json: null } }, /the snapshot is unreadable/],
        [{ runs: [runRecord("r-1", "done", { sessionId: null })] }, /the run recorded no session/],
        [{ runs: [runRecord("r-1", "done")], snapshot: { jsonPath: "x", json: { agents: [{ sessionId: "s-1", attributedTo: "39" }] } } }, /carries no stall telemetry/],
      ];
      for (const [options, reason] of cases) {
        await withFixture(options, async (s) => {
          const [run] = await s.build();
          assert.match(run.text, reason);
          assert.doesNotMatch(run.text, /stalls: 0\b/);
        });
      }
    },
  },
  {
    name: "157/01 R3: one snapshot read serves every run of a milestone",
    run: () => withFixture({ runs: [runRecord("r-1", "done"), runRecord("r-2", "failed")], snapshot: null }, async (s) => {
      await s.build();
      assert.equal(s.snapshotReads.length, 1);
      assert.deepEqual(s.snapshotReads[0], { cwd: s.root, ref: "39" });
    }),
  },
  {
    name: "157/ADR-002: a pointer's ~1 and ~0 unescape to / and ~, and selects exactly one value",
    run: () => withFixture({}, async (s) => {
      const value = { brief: { "a/b~c": 1 }, agents: [{ id: "x" }, { id: "y" }] };
      await writeFile(path.join(s.dir, "doc.json"), JSON.stringify(value, null, 2));
      const read = (pointer) => s.readRecordSourceValue({ item: "39", source: `${MILESTONE}/doc.json#${pointer}` }, { workDir: s.workDir, projectRoot: s.root });
      assert.deepEqual(await read(""), value);
      assert.equal(await read("/brief/a~1b~0c"), 1);
      assert.deepEqual(await read("/agents/1"), { id: "y" });
      for (const missing of ["/agents/2", "/agents/01", "/nope"]) assert.equal(await read(missing), undefined, missing);
    }),
  },
];
