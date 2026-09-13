// FF-9605 (96/ADR-008 §3, §4, §5) — THE GATE DOOR LIVES IN THE COMMAND LAYER, AND THE ACCEPTANCE
// HORIZON STILL IMPORTS NOTHING.
//
// The tempting home for a lifecycle predicate is the module that owns the lifecycle. Here that
// module is `src/acceptance-horizon.mjs`, and putting the gate there would be ILLEGAL rather than
// merely untidy: it imports nothing by 66/ARCHITECTURE ROUND 3/3, and 66/02's FF-6605 forbids the
// controls lane reaching `node:fs` through its direct imports — so a predicate that reads a
// recorded result cannot live there and stay legal. The refusal would fail 66/02 on arrival, and
// the failure would look like an unrelated control breaking.
//
// SIX CLAIMS, each failing for its own reason:
//
//   1. THE HORIZON IS UNTOUCHED. It imports nothing and names no gate, record, path or filesystem
//      call. Asserted over the MODULE rather than assumed from the graph, because that is the
//      property ADR-008 §3 exists to preserve and the one a future "move it closer to the
//      lifecycle" edit would take away.
//   2. THE TWO CODES ARE RAISED IN THE ITEM-STATUS COMMAND, and nowhere else in `src/`. A second
//      raiser is a second door, and a door nobody knows about is one nobody can override.
//   3. THEY ARE DISJOINT FROM THE VOCABULARIES ALREADY IN SERVICE — doctor's control codes and the
//      audit's own set. A shared code lets one command's severity table decide the other's meaning,
//      which is the FF-5905 species.
//   4. THE REFUSAL IS SCOPED TO MILESTONES. A story moving to `done` with no gate record is DRIVEN
//      and required to pass, because §5's claim is behavioural and a census over source text would
//      not notice a `type` check that was written and then inverted.
//   6. NO PATH ADMITS A CLAIM IN PLACE OF A RUN. The door's decision reads the recorded record and
//      the recorded reason and NOTHING else — no environment variable, no configuration key, no
//      second flag — asserted over the deciding function's own body AND driven with every plausible
//      bypass set in the environment. This is the sentence 96/04 exists to write, and it is the one
//      claim a reviewer cannot check by reading a header: a bypass would look reasonable in its own
//      commit and would make the gate permanently satisfied.
//   5. THE OVERRIDE REQUIRES A NON-EMPTY REASON AND IS RECORDED. A permitted move that appends no
//      row is a failure of this control: a silent override is indistinguishable from no gate at all
//      within two milestones, and the reason is the whole mechanism.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertFamilyPurity } from "../../support/module-family.mjs";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";
import { AUDIT_FINDING_CODES } from "../../../src/work-audit/census.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { REGRESSION_RECORD_BASENAME, parseRegressionRows } from "../../../src/regression-record.mjs";
import { GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED } from "../../../src/commands/item-status.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const HORIZON = "src/acceptance-horizon.mjs";
const DOOR = "src/commands/item-status.mjs";

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

async function srcModules(dir = path.join(repoRoot, "src"), found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await srcModules(full, found);
    else if (entry.name.endsWith(".mjs")) found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
  }
  return found;
}

// ── the driven fixture (claims 4 and 5) ──────────────────────────────────────

const specDoc = (status) => [
  "---", "type: milestone", "number: 70", "slug: gate", 'title: "Gate"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "depends: []", "---",
  "# 70 · Gate", "",
].join("\n");

const storyDoc = (status) => [
  "---", "type: story", "number: 00", "slug: lane", "parent: 70", 'title: "Lane"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "---",
  "# 70/00 · Lane", "",
].join("\n");

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

async function withStream(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-ff9605-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "repo");
  const mDir = path.join(root, "wiki", "work", "70_milestone_gate");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(sDir, { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "ff9605", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await writeFile(path.join(mDir, "SPEC.md"), specDoc("in-progress"), "utf8");
  await writeFile(path.join(sDir, "STORY.md"), storyDoc("in-review"), "utf8");
  await initRepo(root);
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  try {
    await body({
      ctx: { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env } },
      mDir,
      recordPath: path.join(mDir, REGRESSION_RECORD_BASENAME),
    });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const refusalOf = async (fn) => {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, "expected a refusal");
  return caught;
};

export const archTests = [
  {
    name: "arch/96/04 FF-9605 (1) THE HORIZON IS UNTOUCHED — it imports nothing and names no gate, record or path",
    run: async () => {
      const text = await source(HORIZON);
      // PURITY IS EXTERNAL (119/ADR-002). The claim is that the horizon depends on nothing outside
      // itself — 66/02's FF-6605 forbids the controls lane reaching `node:fs` through its direct
      // imports, which is why the gate door is in the command layer — and that claim is about its
      // DEPENDENCIES, not about how many files it occupies. The unit is the family, so
      // `src/acceptance-horizon/` stays a legal decomposition while every external specifier is
      // still a violation naming the file and the specifier.
      await assertFamilyPurity(assert, repoRoot, HORIZON);
      assert.equal(/\brequire\s*\(/.test(text), false, "…and no CommonJS require either");
      for (const forbidden of [
        "REGRESSION",
        "regression",
        "regressionRecordPath",
        "readFile",
        "node:fs",
        "gateOverride",
        ".md",
      ]) {
        assert.equal(
          text.includes(forbidden),
          false,
          `${HORIZON} must name no gate, record or path — found ${JSON.stringify(forbidden)}`,
        );
      }
    },
  },
  {
    name: "arch/96/04 FF-9605 (2) THE TWO CODES ARE RAISED IN THE ITEM-STATUS COMMAND, and in no other module in src/",
    run: async () => {
      const door = await source(DOOR);
      for (const code of [GATE_MISSING, GATE_RED]) {
        assert.equal(door.includes(`"${code}"`), true, `${DOOR} declares ${code}`);
      }
      const others = [];
      for (const rel of await srcModules()) {
        if (rel === DOOR) continue;
        const text = await source(rel);
        if (text.includes(`"${GATE_MISSING}"`) || text.includes(`"${GATE_RED}"`)) others.push(rel);
      }
      assert.deepEqual(
        others,
        [],
        "a second module spelling a gate refusal code is a second door, and a door nobody knows about is one nobody can override",
      );
    },
  },
  {
    name: "arch/96/04 FF-9605 (3) THE REFUSAL CODES ARE DISJOINT from doctor's control codes and the audit's code space",
    run: () => {
      const mine = [GATE_MISSING, GATE_RED, OVERRIDE_REASON_REQUIRED];
      for (const code of mine) {
        assert.equal(CONTROL_FINDING_CODES.includes(code), false, `${code} must not appear in CONTROL_FINDING_CODES`);
        assert.equal(AUDIT_FINDING_CODES.includes(code), false, `${code} must not appear in AUDIT_FINDING_CODES`);
      }
      assert.equal(new Set(mine).size, mine.length, "…and the three are distinct from each other");
    },
  },
  {
    name: "arch/96/04 FF-9605 (4) THE REFUSAL IS SCOPED TO MILESTONES — a story's `done` with no gate record passes, the milestone's is refused",
    run: () => withStream(async ({ ctx, recordPath }) => {
      const story = await invoke("work:status", { ref: "70/00", status: "done" }, ctx);
      assert.equal(story.moved, true, "a story moving to done with no gate record anywhere is permitted");

      const milestone = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
      assert.equal(milestone.code, GATE_MISSING, "…and the milestone at the same door is refused");
      await assert.rejects(() => readFile(recordPath, "utf8"), "a refusal writes no record");
    }),
  },
  {
    name: "arch/96/04 FF-9605 (5) THE OVERRIDE REQUIRES A NON-EMPTY REASON AND IS RECORDED — a permitted move with no new row is a failure",
    run: () => withStream(async ({ ctx, recordPath }) => {
      for (const reason of ["", "   "]) {
        const refused = await refusalOf(() => invoke("work:status", { ref: "70", status: "done", gateOverride: reason }, ctx));
        assert.equal(refused.code, OVERRIDE_REASON_REQUIRED, `an override whose reason is ${JSON.stringify(reason)} is refused`);
        await assert.rejects(() => readFile(recordPath, "utf8"), "…and writes nothing");
      }

      const moved = await invoke("work:status", { ref: "70", status: "done", gateOverride: "no runner on this node" }, ctx);
      assert.equal(moved.moved, true, "a reasoned override permits the move");

      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
      assert.equal(rows.length, 1, "a permitted override MUST leave a row — this is the control's whole point");
      assert.equal(rows[0].result, "override");
      assert.match(rows[0].detail, /no runner on this node/, "…carrying the reason it was permitted on");
    }),
  },
  {
    name: "arch/96/04 FF-9605 (6) NO PATH ADMITS A CLAIM IN PLACE OF A RUN — the door reads the record and the reason, and nothing else",
    run: async () => {
      // (a) THE DECIDING FUNCTION'S OWN BODY. Read with comments stripped, so a header that PROMISES
      // there is no bypass cannot satisfy a claim about whether one exists.
      const body = functionBody(await source(DOOR), "async function admitThroughRegressionGate(");
      assert.ok(body.length > 0, "the deciding function was located");
      assert.equal(/process\.env/.test(body), false, "no environment variable reaches the decision");
      assert.equal(/\bconfig\b/.test(body), false, "no configuration key reaches the decision");
      assert.equal(/\bargv\b|\boptions\./.test(body), false, "and no second CLI surface either");

      // THE TWO ADMISSIBLE INPUTS, and there are exactly two: a recorded run (read from the record)
      // and a recorded reason (`gateOverride`). `now` is the established injected clock — it stamps
      // the row, and no value of it permits anything.
      const consulted = [...new Set([...body.matchAll(/input\.([A-Za-z0-9_$]+)/g)].map((m) => m[1]))].sort();
      assert.deepEqual(consulted, ["gateOverride", "now"], "the door consults no third input");

      // (b) DRIVEN, because a census cannot prove the absence of a bypass somewhere UP the call
      // chain. With every plausible escape hatch set in the environment, the refusal still stands.
      const planted = ["AOF_SKIP_REGRESSION_GATE", "AOF_REGRESSION_GATE", "AOF_GATE_OVERRIDE", "AOF_FORCE", "AOF_NO_GATE"];
      const saved = Object.fromEntries(planted.map((name) => [name, process.env[name]]));
      for (const name of planted) process.env[name] = "1";
      try {
        await withStream(async ({ ctx, recordPath }) => {
          const refused = await refusalOf(() => invoke("work:status", { ref: "70", status: "done" }, ctx));
          assert.equal(refused.code, GATE_MISSING, "a claim in the environment is not a gate run");
          await assert.rejects(() => readFile(recordPath, "utf8"), "…and it writes no row either");
        });
      } finally {
        for (const name of planted) {
          if (saved[name] === undefined) delete process.env[name];
          else process.env[name] = saved[name];
        }
      }
    },
  },
];
