// Traceability wiring for milestone 96 / story 04 — the regression gate is mandatory.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-gate-run-is-recorded-as-evidence.feature
//   tasks/01_the-accept-door-refuses-without-a-green-gate.feature
//   tasks/02_the-override-is-data-and-it-is-recorded.feature
//
// EVERY RECORD HERE IS A REAL `REGRESSION.md` ON DISK, written by the shipped writer and read back
// through the shipped parser. Handing the door a hand-built row object would drive the arithmetic
// and skip the two things most likely to be wrong: that the document ROUND-TRIPS (a writer whose
// own output its parser refuses is the failure 78/02's header names), and that a half-written row
// is UNREADABLE rather than skipped — which is only observable through the bytes.
//
// The gate's impure edges are injected exactly as 72/02's suite injects the test command's, so
// every row drives with no repository and no child process, against the code path production runs.
// `git` is stubbed rather than mocked away, so "a git that cannot answer is not a clean tree" is
// measured rather than asserted about the source.
//
// The accept-door rows drive the REAL `work:status` command over a hermetic fixture with its own
// `AOF_GLOBAL_HOME` (the work-item-status-lifecycle discipline), because the claim is about the
// door an operator actually types — not about a predicate called directly.
//
// One test object per @executable scenario, Scenario-Outline rows folded into one entry iterating
// the rows. node:assert/strict, `{ name, run }` shape.
//
// The scenarios this file does not drive are the four that are properties of the TREE rather than
// of a behaviour — the frozen shape having one home, the refusal living in the command layer, the
// acceptance horizon still importing nothing, the code disjointness, and the absence of any path
// that admits a claim in place of a run. Those are FF-9605's and FF-9606's, in
// test/arch/grade/acd-gate-door-lives-in-the-command-layer.test.mjs and
// test/arch/grade/acd-gate-result-is-evidence.test.mjs.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, writeFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace } from "../../src/work.mjs";
import { invoke } from "../../src/command-core.mjs";
import {
  EMPTY_CELL,
  RECORD_MALFORMED,
  REGRESSION_DIVIDER,
  REGRESSION_HEADER,
  REGRESSION_HEADING,
  REGRESSION_RECORD_BASENAME,
  parseRegressionRows,
} from "../../src/regression-record.mjs";
import { DIRTY_TREE, runRegressionGate } from "../../src/commands/regression-gate.mjs";
import { GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED } from "../../src/commands/item-status.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── the gate's fixture ───────────────────────────────────────────────────────

const COMMIT = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const LATER_COMMIT = "9f8e7d6c5b4a30291827364554637281909a0b1c";
const INSTANT = "2026-09-04T11:22:33Z";
const LATER_INSTANT = "2026-09-05T08:00:00Z";

// A git stub in the shipped seam's own shape (`{ stdout, stderr, status }`), so the module's real
// parsing runs. `dirty` is porcelain TEXT rather than a list, because the porcelain parse — the
// `XY ` prefix, the rename arrow, the quoted path — is part of what is under test.
const gitStub = ({ dirty = "", commit = COMMIT, statusFails = false, headFails = false } = {}) =>
  async (args) => {
    if (args[0] === "status") return { stdout: dirty, stderr: "", status: statusFails ? 128 : 0 };
    if (args[0] === "rev-parse") return { stdout: headFails ? "" : `${commit}\n`, stderr: "", status: headFails ? 128 : 0 };
    return { stdout: "", stderr: "", status: 0 };
  };

// A `runTest` result in the shipped shape. Only the fields the gate reads are varied; the rest are
// present so a destructuring change in the command is caught here rather than at a call site.
const suiteResult = ({ scope = "all", widened = [], failures = [], refusal = null, exit = null } = {}) =>
  Object.freeze({
    askedScope: "all",
    scope,
    story: null,
    gate: scope === "all" && widened.length === 0,
    launched: refusal == null,
    selected: [],
    total: 3,
    widened: Object.freeze(widened),
    changed: Object.freeze([]),
    runner: Object.freeze({ outcome: "exited", exitCode: failures.length > 0 ? 1 : 0, verdict: "ok", message: "" }),
    report: Object.freeze({ ok: true, format: "tap", cases: Object.freeze([]), failures: Object.freeze(failures), contradiction: false }),
    refusal,
    exit: exit ?? (refusal != null || failures.length > 0 ? 1 : 0),
  });

async function withGateFixture(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-regression-gate-")));
  const itemDir = path.join(tmp, "wiki", "work", "70_milestone_gate");
  await mkdir(itemDir, { recursive: true });
  await writeFile(path.join(itemDir, "SPEC.md"), "---\ntype: milestone\n---\n# 70\n", "utf8");
  await writeFile(path.join(itemDir, "VERIFICATION.md"), "# Verification\n\nUNTOUCHED\n", "utf8");
  const item = { ref: "70", dir: itemDir, type: "milestone" };
  const recordPath = path.join(itemDir, REGRESSION_RECORD_BASENAME);
  const run = (overrides = {}) =>
    runRegressionGate({ ref: "70", now: overrides.now ?? INSTANT }, {
      projectRoot: tmp,
      config: {},
      resolve: async (ref) => (ref === "70" ? item : null),
      git: gitStub(overrides.git ?? {}),
      runSuite: async () => (overrides.suite ?? suiteResult()),
    });
  try {
    await body({ root: tmp, itemDir, item, recordPath, run });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const readRecord = (recordPath) => readFile(recordPath, "utf8");

// A REAL GIT REPOSITORY, because the override row names the commit it was taken against and
// `headCommit` is the shipped read that answers. ADR-008 is a git-based mechanism end to end — the
// gate refuses a dirty tree and every row names a commit — so a fixture that mocked git away would
// be driving a door that does not exist in production.
const git = promisify(execFile);
async function initRepo(root) {
  await git("git", ["init", "-q", "-b", "main"], { cwd: root });
  await git("git", [
    "-c", "user.email=fixture@aof.local", "-c", "user.name=fixture", "-c", "commit.gpgsign=false",
    "commit", "-q", "--allow-empty", "-m", "fixture",
  ], { cwd: root });
  return (await git("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
}

// ── the accept door's fixture ────────────────────────────────────────────────

const specDoc = (status) => [
  "---", "type: milestone", "number: 70", "slug: gate", 'title: "Gate"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "depends: []", "---",
  "# 70 · Gate", "", "Body line — must stay byte-identical.", "",
].join("\n");

const storyDoc = (status) => [
  "---", "type: story", "number: 00", "slug: lane", "parent: 70", 'title: "Lane"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "---",
  "# 70/00 · Lane", "",
].join("\n");

// A record document assembled from the FROZEN literals — never a hand-typed table — so a change to
// the shape breaks the fixture rather than silently making these rows test a document nobody writes.
function recordWith(rows) {
  return [
    "# Regression gate", "",
    REGRESSION_HEADING, "",
    REGRESSION_HEADER, REGRESSION_DIVIDER,
    ...rows.map((row) => `| ${row.commit} | ${row.instant} | ${row.scope} | ${row.result} | ${row.detail ?? EMPTY_CELL} |`),
    "",
  ].join("\n");
}

const greenRow = (over = {}) => ({ commit: COMMIT, instant: INSTANT, scope: "all", result: "green", detail: null, ...over });
const redRow = (over = {}) => ({ commit: COMMIT, instant: INSTANT, scope: "all", result: "red", detail: "arch/96/04 the door refuses", ...over });

async function withDoorFixture({ status = "in-progress", storyStatus = "in-review", record = null } = {}, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-gate-door-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const aofDir = path.join(root, ".aof");
  const mDir = path.join(root, "wiki", "work", "70_milestone_gate");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(aofDir, { recursive: true });
  await mkdir(sDir, { recursive: true });
  await writeFile(path.join(aofDir, "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await writeFile(path.join(mDir, "SPEC.md"), specDoc(status), "utf8");
  await writeFile(path.join(sDir, "STORY.md"), storyDoc(storyStatus), "utf8");
  const recordPath = path.join(mDir, REGRESSION_RECORD_BASENAME);
  if (record != null) await writeFile(recordPath, record, "utf8");
  const headCommit = await initRepo(root);
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  const ctx = { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } };
  try {
    await body({ root, ctx, mDir, sDir, recordPath, headCommit, specPath: path.join(mDir, "SPEC.md") });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function refusalOf(fn) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected a refusal");
  return caught;
}

export const regressionGateTests = [
  // ══════════════════════════ task 00 — the gate run is recorded as evidence ══
  {
    name: "96/04-00 a green gate run writes a row naming what it proved — the commit, the instant, the scope and the result",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      const out = await run();

      const rows = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(rows.length, 1, "one row per gate run");
      assert.equal(rows[0].commit, COMMIT, "it carries the commit the run ran against");
      assert.equal(rows[0].instant, INSTANT, "…the instant the run finished");
      assert.equal(rows[0].scope, "all", "…the scope the run ran as");
      assert.equal(rows[0].result, "green", "…and the result");
      assert.equal(out.satisfiesDoor, true, "a whole-tree green run may stand as the accept gate");
      assert.equal(out.exit, 0);
    }),
  },
  {
    name: "96/04-00 a red gate run records what failed and the command exits non-zero",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      const out = await run({ suite: suiteResult({ failures: [{ case: "work/gate refuses" }, { case: "work/gate records" }] }) });

      const [row] = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(row.result, "red", "a row is appended recording the result as red");
      assert.match(row.detail, /work\/gate refuses/, "and it names what failed");
      assert.match(row.detail, /work\/gate records/);
      assert.equal(out.exit, 1, "the command exits non-zero");
      assert.equal(out.satisfiesDoor, false);
    }),
  },
  {
    name: "96/04-00 a rerun appends — the earlier row survives byte-for-byte and the newest is the one the door reads",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      await run();
      const first = await readRecord(recordPath);
      const firstRow = parseRegressionRows(first, recordPath)[0].line;

      // The second run finds the FIRST run's evidence in the tree. It is the gate's own output, so
      // it is not a dirty tree — a gate blocked by the row it just wrote is a gate nobody runs twice.
      await run({
        now: LATER_INSTANT,
        git: { dirty: `?? wiki/work/70_milestone_gate/${REGRESSION_RECORD_BASENAME}\n`, commit: LATER_COMMIT },
      });

      const rows = parseRegressionRows(await readRecord(recordPath), recordPath);
      assert.equal(rows.length, 2, "the record holds two rows");
      assert.equal(rows[0].line, firstRow, "the earlier row is unchanged");
      assert.equal(rows[0].commit, COMMIT);
      assert.equal(rows[1].commit, LATER_COMMIT, "and the newest row is the one the door reads");
      assert.equal(rows[1].instant, LATER_INSTANT);
    }),
  },
  {
    name: "96/04-00 the run refuses a tree it cannot trust — clean runs, tracked changes and untracked source both refuse",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      for (const [state, dirty, expected] of [
        ["clean", "", "runs"],
        ["carrying uncommitted tracked changes", " M src/regression-record.mjs\n", "src/regression-record.mjs"],
        ["carrying untracked files under a source root", "?? src/smuggled.mjs\n", "src/smuggled.mjs"],
        // A rename reports `XY <old> -> <new>`; the NEW path is the one the tree now holds.
        ["carrying a rename", "R  src/old.mjs -> src/new.mjs\n", "src/new.mjs"],
        // A git that cannot answer is NOT a clean tree — this seam fails CLOSED, which is the one
        // way it differs from `laneChanges`, whose sweep must never delete a lane on a git fault.
        ["unreadable by git", null, "git status"],
      ]) {
        if (expected === "runs") {
          const out = await run({ git: { dirty } });
          assert.equal(out.appended, true, `a ${state} checkout runs the suite and appends a row`);
          continue;
        }
        const error = await refusalOf(() => run(dirty == null ? { git: { statusFails: true } } : { git: { dirty } }));
        assert.equal(error.code, DIRTY_TREE, `a checkout ${state} is refused`);
        assert.match(error.message, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "…naming what is dirty");
      }
      // …and only the first, clean, row ever reached the document.
      assert.equal(parseRegressionRows(await readRecord(recordPath), recordPath).length, 1, "a refused run records nothing");
    }),
  },
  {
    name: "96/04-00 a row missing any of its four facts is unreadable, never skipped",
    run: () => withGateFixture(async ({ recordPath }) => {
      for (const field of ["commit", "instant", "scope", "result"]) {
        // A GOOD row first, so "the read is refused" cannot be satisfied by an empty table: the
        // failure this forbids is a MALFORMED row rendering as though it were not there at all.
        // The computed key is spread LAST so the blanked field wins over the row default it shadows.
        const text = recordWith([greenRow(), greenRow({ instant: LATER_INSTANT, [field]: EMPTY_CELL })]);
        await writeFile(recordPath, text, "utf8");
        const error = await refusalOf(async () => parseRegressionRows(await readRecord(recordPath), recordPath));
        assert.equal(error.code, RECORD_MALFORMED, `a row missing its ${field} makes the record unreadable`);
        assert.match(error.message, new RegExp(`row 2 is missing its ${field}`), "…naming the malformed row");
      }
      // A cell that is PRESENT but not the thing it claims to be is the same answer — a row nobody
      // can read and a gate nobody ran are the same fact.
      for (const [field, value] of [["commit", "not-a-hash"], ["instant", "2026-09-04"], ["result", "probably-fine"]]) {
        await writeFile(recordPath, recordWith([greenRow({ [field]: value })]), "utf8");
        const error = await refusalOf(async () => parseRegressionRows(await readRecord(recordPath), recordPath));
        assert.equal(error.code, RECORD_MALFORMED, `a row whose ${field} is "${value}" is unreadable`);
      }
    }),
  },
  {
    name: "96/04-00 a run that was not a whole-tree run is recorded and does not satisfy the door",
    run: () => withGateFixture(async ({ recordPath, run }) => {
      for (const [property, suite, cell] of [
        ["scope was not `all`", suiteResult({ scope: "impacted" }), "impacted"],
        ["selection widened during the run", suiteResult({ widened: [{ file: "src/x.mjs", reason: "graph-unknown" }] }), "all+widened"],
      ]) {
        await rm(recordPath, { force: true });
        const out = await run({ suite });
        const [row] = parseRegressionRows(await readRecord(recordPath), recordPath);
        assert.equal(row.scope, cell, `a run whose ${property} is recorded`);
        assert.equal(out.satisfiesDoor, false, "…and it is marked as not satisfying the door");
        // It is RECORDED, not refused: the milestone's history has to be able to say a partial run
        // happened, or "no gate ran" and "a gate ran narrowly" become the same absence.
        assert.equal(out.appended, true);
      }
    }),
  },
  {
    name: "96/04-00 the record lives beside the milestone's other records — not under runs/, not under observability/, not in VERIFICATION.md",
    run: () => withGateFixture(async ({ itemDir, recordPath, run }) => {
      const verificationBefore = await readFile(path.join(itemDir, "VERIFICATION.md"), "utf8");
      const out = await run();

      assert.equal(path.dirname(out.path), itemDir, "the written path is inside that milestone's own directory");
      assert.equal(path.basename(out.path), REGRESSION_RECORD_BASENAME);
      assert.doesNotMatch(out.path.split(path.sep).join("/"), /\/runs\//, "it is not under that item's runs directory");
      assert.doesNotMatch(out.path.split(path.sep).join("/"), /\/observability\//, "…nor its observability directory");
      assert.equal(
        await readFile(path.join(itemDir, "VERIFICATION.md"), "utf8"),
        verificationBefore,
        "no section of the milestone's verification document was written",
      );
      assert.equal(recordPath, out.path);
    }),
  },

  // ═══════════════════════ task 01 — the accept door refuses without a green gate ══
  {
    name: "96/04-01 the door reads the newest row and refuses what it must",
    run: async () => {
      for (const [label, record, outcome] of [
        ["absent", null, GATE_MISSING],
        ["present, newest row red", recordWith([redRow()]), GATE_RED],
        ["present, newest row green but the run widened", recordWith([greenRow({ scope: "all+widened" })]), GATE_MISSING],
        ["present, newest row green from a whole-tree run", recordWith([greenRow()]), null],
      ]) {
        await withDoorFixture({ record }, async ({ ctx }) => {
          if (outcome == null) {
            const moved = await invoke("work:status", { ref: "70", status: "done" }, ctx);
            assert.equal(moved.moved, true, `a record ${label} permits the move`);
            assert.equal(moved.status, "done");
            assert.equal(moved.regressionGate?.commit, COMMIT, "…and the result names the row that let it through");
            return;
          }
          const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
          assert.equal(error.code, outcome, `a record ${label} is refused ${outcome}`);
        });
      }
    },
  },
  {
    name: "96/04-01 an older green row does not rescue a newer red one",
    run: () => withDoorFixture({ record: recordWith([greenRow(), redRow({ instant: LATER_INSTANT, commit: LATER_COMMIT })]) }, async ({ ctx, specPath }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(error.code, GATE_RED);
      assert.match(error.message, new RegExp(LATER_COMMIT), "the refusal names the RED row, not the green one behind it");
      assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "and nothing moved");
    }),
  },
  {
    name: "96/04-01 a story's accept door is untouched — no gate refusal is raised anywhere on it",
    run: () => withDoorFixture({ record: null }, async ({ ctx, sDir }) => {
      const moved = await invoke("work:status", { ref: "70/00", status: "done" }, ctx);
      assert.equal(moved.moved, true, "the move is permitted with no regression record anywhere");
      assert.equal(moved.status, "done");
      assert.equal(moved.regressionGate, undefined, "no gate answer is attached to a story's accept");
      // …and no record was invented for it either: the gate is bought back at the MILESTONE door.
      await assert.rejects(() => readFile(path.join(sDir, REGRESSION_RECORD_BASENAME), "utf8"));
    }),
  },
  {
    name: "96/04-01 every other lifecycle move is unaffected — the gate governs one edge and no other",
    run: async () => {
      for (const [from, target] of [["not-started", "in-progress"], ["in-progress", "in-review"], ["in-progress", "blocked"]]) {
        await withDoorFixture({ status: from, record: null }, async ({ ctx }) => {
          const moved = await invoke("work:status", { ref: "70", status: target }, ctx);
          assert.equal(moved.moved, true, `${from} → ${target} is permitted with no regression record`);
          assert.equal(moved.status, target);
        });
      }
    },
  },
  {
    name: "96/04-01 the read form still reports the item's status and its legal next moves, and raises no gate refusal",
    run: () => withDoorFixture({ record: null }, async ({ ctx }) => {
      const read = await invoke("work:status", { ref: "70" }, ctx);
      assert.equal(read.status, "in-progress");
      assert.deepEqual(read.edges, ["in-review", "done", "blocked", "not-started"]);
      assert.equal(read.moved, undefined, "the read moved nothing");
    }),
  },
  {
    name: "96/04-01 the refusal names the repair — the gate command that would produce a record",
    run: () => withDoorFixture({ record: null }, async ({ ctx }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.match(error.message, /aof work regression-gate/, "the message names the gate command");
      assert.match(error.message, /--gate-override/, "…and the escape, so neither path has to be remembered");
    }),
  },
  {
    name: "96/04-01 a record the parser cannot read stops the accept — it is never read as an absent gate",
    run: () => withDoorFixture({ record: recordWith([greenRow({ result: EMPTY_CELL })]) }, async ({ ctx, specPath }) => {
      const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(error.code, RECORD_MALFORMED, "the record's own refusal, not the door's");
      assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m);
    }),
  },

  // ═════════════════════════ task 02 — the override is data and it is recorded ══
  {
    name: "96/04-02 an override permits the accept and records why, as a row marked an override rather than a gate run",
    run: () => withDoorFixture({ record: null }, async ({ ctx, recordPath }) => {
      const reason = "the WSL node cannot host the browser lane";
      const moved = await invoke("work:status", { ref: "70", status: "done", gateOverride: reason, now: INSTANT }, ctx);
      assert.equal(moved.moved, true, "the move is permitted");
      assert.equal(moved.status, "done");

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 1, "a row is appended to the regression record");
      assert.equal(rows[0].detail, reason, "…carrying that reason");
      assert.equal(rows[0].result, "override", "and the row is marked as an override rather than as a gate run");
      assert.notEqual(rows[0].result, "green");
    }),
  },
  {
    name: "96/04-02 an override with no reason is refused, and no row is appended",
    run: async () => {
      for (const [label, input] of [
        ["absent", {}],
        ["an empty string", { gateOverride: "" }],
        ["whitespace only", { gateOverride: "   \t " }],
      ]) {
        await withDoorFixture({ record: null }, async ({ ctx, recordPath, specPath }) => {
          const error = await refusalOf(() => invoke("work:status", { ref: "70", status: "done", ...input }, ctx));
          // An ABSENT override is not an override at all: it falls through to the ordinary door,
          // which refuses for the record's absence. Both are refusals and neither writes.
          assert.equal(error.code, label === "absent" ? GATE_MISSING : OVERRIDE_REASON_REQUIRED, `a reason that is ${label} is refused`);
          await assert.rejects(() => readFile(recordPath, "utf8"), "no row is appended");
          assert.match(await readFile(specPath, "utf8"), /^status: in-progress$/m, "and the move did not happen");
        });
      }
    },
  },
  {
    name: "96/04-02 an override over a red gate is permitted and the row names the red row it overrode",
    run: () => withDoorFixture({ record: recordWith([redRow()]) }, async ({ ctx, recordPath }) => {
      const moved = await invoke("work:status", { ref: "70", status: "done", gateOverride: "the runner cannot start here", now: LATER_INSTANT }, ctx);
      assert.equal(moved.moved, true, "the move is permitted");

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 2);
      assert.equal(rows[1].result, "override");
      assert.match(rows[1].detail, new RegExp(COMMIT), "the override row names the red row it overrode");
      assert.match(rows[1].detail, /the runner cannot start here/);
    }),
  },
  {
    name: "96/04-02 an override row survives a later gate run — both rows are present and the override row is unchanged",
    run: () => withDoorFixture({ record: null, status: "in-progress" }, async ({ ctx, mDir, recordPath, root }) => {
      await invoke("work:status", { ref: "70", status: "done", gateOverride: "no runner on this node", now: INSTANT }, ctx);
      const overrideLine = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath)[0].line;

      // The gate later runs green over the same record — the two writers meet on one document.
      await runRegressionGate({ ref: "70", now: LATER_INSTANT }, {
        projectRoot: root,
        config: {},
        resolve: async () => ({ ref: "70", dir: mDir, type: "milestone" }),
        git: gitStub({ commit: LATER_COMMIT }),
        runSuite: async () => suiteResult(),
      });

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 2, "both rows are present");
      assert.equal(rows[0].line, overrideLine, "the override row is unchanged");
      assert.equal(rows[1].result, "green");
    }),
  },
  {
    name: "96/04-02 an override is not a gate result — the row is distinguishable and the milestone reports no green gate run",
    run: () => withDoorFixture({ record: null }, async ({ ctx, recordPath }) => {
      await invoke("work:status", { ref: "70", status: "done", gateOverride: "environment cannot host the run", now: INSTANT }, ctx);
      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);

      assert.equal(rows[0].result, "override", "the override row is distinguishable from a gate run row");
      assert.equal(rows[0].scope, "override", "…in both cells a gate run would use for its run");
      assert.equal(rows.filter((row) => row.result === "green").length, 0, "the milestone reports no green gate run");
    }),
  },
  {
    name: "96/04-02 the shipped verify command document names both paths, prefers the run, and rules out reporting the gate as passed",
    run: async () => {
      const verify = await readFile(path.join(repoRoot, "src", "bundle", "commands", "verify.md"), "utf8");
      assert.match(verify, /aof work regression-gate/, "it names the gate command as the ordinary path");
      assert.match(verify, /--gate-override/, "…and the override as the escape");
      assert.match(
        verify,
        /environment[\s\S]{0,200}cannot host/i,
        "…named as the environment-cannot-host-it escape rather than as a way past a slow gate",
      );
      assert.match(
        verify,
        /reporting the gate as passed is not/i,
        "and it states that reporting the gate as passed is not a form of evidence",
      );
    },
  },
];
