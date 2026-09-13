// Traceability wiring for milestone 68 / story 04 — story- and phase-scoped observe.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_story-scoped-ref.feature
//   tasks/01_per-phase-rollup.feature
//   tasks/02_json-contract.feature
// exercising the REAL src/work/observe.mjs resolver + rollup/report path and the REAL
// registered src/commands/observe.mjs --json door, against a temp fixture work stream
// (mkdtemp → write folders/runs/config → observe → rm in finally). One test object per
// @executable scenario (Scenario-Outline rows folded into one entry iterating the rows),
// each name tracing to feature + scenario. node:assert/strict. `{ name, run }` shape so
// it spreads into the runner's tests array like every other suite.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  resolveMilestoneFolder,
  observeMilestone,
  rollupRunsByPhase,
  observabilityEnabled,
} from "../../../src/work/observe.mjs";
import { observeCommand } from "../../../src/commands/observe.mjs";

const T0 = Date.parse("2026-08-20T10:00:00.000Z");

// A minimal run record carrying what the rollup reads (68/ADR-002: phase rides
// brief.loop.phase; 68/ADR-001: spend). `spend:false` ⇒ spend null (not measured).
function mkRun(id, { phase = null, tokens = null, cost = null, durMs = 1000, created = T0, spend = true } = {}) {
  return {
    runId: id,
    itemRef: "68",
    state: "done",
    attempt: 1,
    outcome: null,
    sessionId: null,
    brief: phase == null ? {} : { loop: { phase } },
    createdAt: new Date(created).toISOString(),
    updatedAt: new Date(created + durMs).toISOString(),
    failureReason: null,
    heartbeatAt: null,
    retryOf: null,
    reclaimedAt: null,
    node: null,
    resumeAfter: null,
    spend: spend
      ? { model: "claude-sonnet", effort: "medium", tokens, costUsd: cost, costSource: "priced", priceTable: "v1", turns: 1, toolCalls: 0, exitReason: "final_output" }
      : null,
  };
}

async function makeTree(folders = []) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-obs68-"));
  for (const f of folders) {
    await mkdir(path.join(cwd, "wiki", "work", f), { recursive: true });
  }
  return cwd;
}

async function writeRun(cwd, relFolder, run) {
  const runsDir = path.join(cwd, "wiki", "work", relFolder, "runs");
  await mkdir(runsDir, { recursive: true });
  await writeFile(path.join(runsDir, `${run.runId}.json`), JSON.stringify(run));
}

// Run `fn` with the fixture as process.cwd() (the registered command resolves
// everything from process.cwd()), restoring the previous cwd afterwards.
async function withCwd(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}

export const workObserveScopeTests = [
  // ══ 00_story-scoped-ref.feature ══
  // Scenario: a story ref resolves to the story's own folder
  {
    name: "work-observe-scope/00 a story ref NN/SS resolves to the story's own folder and reports on the story, not its parent milestone",
    async run() {
      const cwd = await makeTree([
        "68_milestone_loop-telemetry",
        "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe",
      ]);
      try {
        const r = await resolveMilestoneFolder({ cwd, ref: "68/04" });
        assert.equal(r.kind, "story");
        assert.equal(r.id, "68");
        assert.equal(r.story, "4");
        assert.equal(r.folder, "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe");
        const obs = await observeMilestone({ cwd, ref: "68/04", home: cwd, env: {}, generatedAt: T0 });
        assert.equal(obs.kind, "story");
        assert.equal(obs.story, "4");
        assert.equal(obs.folder, "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe");
        assert.equal(obs.json.story, "4", "the report targets the story, not the milestone");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a bare milestone ref keeps working exactly as it does today
  {
    name: "work-observe-scope/00 a bare milestone ref keeps working exactly as today",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        const r = await resolveMilestoneFolder({ cwd, ref: "68" });
        assert.equal(r.kind, "milestone");
        assert.equal(r.story, null);
        assert.equal(r.folder, "68_milestone_loop-telemetry");
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        assert.equal(obs.kind, "milestone");
        assert.equal(obs.story, null);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: an ambiguous ref is refused rather than silently resolved
  {
    name: "work-observe-scope/00 an ambiguous bare ref 00 is refused, never resolved by substring to a story of another milestone",
    async run() {
      const cwd = await makeTree([
        "00_milestone_work-cli",
        "68_milestone_loop-telemetry/stories/00_story_spend-bearing-run-record",
        "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe",
      ]);
      try {
        const r = await resolveMilestoneFolder({ cwd, ref: "00" });
        assert.equal(r, null, "a bare story-like ref is refused, not silently resolved");
        // And observe refuses it loudly, naming the ref — it never reports on a story.
        await assert.rejects(
          observeMilestone({ cwd, ref: "00", home: cwd, env: {}, generatedAt: T0 }),
          (err) => err.code === "milestone-not-found" && /"00"/.test(err.message),
        );
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the ref forms observe answers to — resolvable
  {
    name: "work-observe-scope/00 resolvable ref forms: milestone number, leading zeros, story ref, exact folder name",
    async run() {
      const cwd = await makeTree([
        "68_milestone_loop-telemetry",
        "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe",
        "07_milestone_other",
      ]);
      try {
        // a milestone number
        assert.equal((await resolveMilestoneFolder({ cwd, ref: "68" })).folder, "68_milestone_loop-telemetry");
        // a milestone number with leading zeros
        assert.equal((await resolveMilestoneFolder({ cwd, ref: "068" })).folder, "68_milestone_loop-telemetry");
        // a story ref NN/SS
        assert.equal((await resolveMilestoneFolder({ cwd, ref: "68/04" })).folder, "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe");
        // an exact folder name (milestone)
        assert.equal((await resolveMilestoneFolder({ cwd, ref: "68_milestone_loop-telemetry" })).folder, "68_milestone_loop-telemetry");
        // an exact folder name (story)
        assert.equal((await resolveMilestoneFolder({ cwd, ref: "04_story_story-and-phase-scoped-observe" })).kind, "story");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: refused, loudly
  {
    name: "work-observe-scope/00 refused ref forms name the ref: missing milestone, no story index, story under a missing milestone",
    async run() {
      const cwd = await makeTree([
        "68_milestone_loop-telemetry",
        "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe",
      ]);
      try {
        assert.equal(await resolveMilestoneFolder({ cwd, ref: "999" }), null, "a milestone number that does not exist");
        assert.equal(await resolveMilestoneFolder({ cwd, ref: "68/99" }), null, "a story index no milestone has");
        assert.equal(await resolveMilestoneFolder({ cwd, ref: "999/00" }), null, "a story ref under a missing milestone");
        for (const ref of ["999", "68/99", "999/00"]) {
          await assert.rejects(
            observeMilestone({ cwd, ref, home: cwd, env: {}, generatedAt: T0 }),
            (err) => err.code === "milestone-not-found" && err.message.includes(ref),
            `observe must refuse and name the ref "${ref}"`,
          );
        }
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a refusal names what was asked for
  {
    name: "work-observe-scope/00 a refusal names what was asked for and does not report on some other item",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await assert.rejects(
          observeMilestone({ cwd, ref: "777", home: cwd, env: {}, generatedAt: T0 }),
          (err) => err.code === "milestone-not-found" && /777/.test(err.message) && !/68/.test(err.message),
          "the failure states the ref that did not resolve, and reports nothing about the milestone that does",
        );
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_per-phase-rollup.feature ══
  // (pure seam: rollupRunsByPhase reads phase ONLY from brief.loop.phase — ADR-002)
  {
    name: "work-observe-scope/01 rollupRunsByPhase groups purely by brief.loop.phase, no-phase reported as such",
    async run() {
      const runs = [
        mkRun("a", { phase: "refine", tokens: { input: 10, output: 10, cacheRead: 0, cacheCreate: 0 }, cost: 0.01, durMs: 1000 }),
        mkRun("b", { phase: "refine", tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 2000 }),
        mkRun("c", { phase: null, spend: false, durMs: 3000 }),
      ];
      const r = rollupRunsByPhase(runs);
      const refine = r.phases.find((p) => p.phase === "refine");
      assert.equal(refine.runCount, 2);
      assert.equal(refine.tokens, 20, "a genuinely free run still counts its tokens, a null-spend run is unmeasured");
      assert.equal(refine.unmeasuredSpend, 0);
      assert.equal(r.noPhase.runCount, 1);
      assert.equal(r.noPhase.unmeasuredSpend, 1);
      assert.equal(r.total.runCount, 3);
    },
  },
  // Scenario: the report breaks the total down by phase
  {
    name: "work-observe-scope/01 the report breaks the total down by phase, each phase drawn only from its own runs, summing to the attributed total",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: "refine", tokens: { input: 10, output: 100, cacheRead: 0, cacheCreate: 0 }, cost: 0.01, durMs: 5 * 60 * 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("b", { phase: "refine", tokens: { input: 5, output: 50, cacheRead: 0, cacheCreate: 0 }, cost: 0.005, durMs: 3 * 60 * 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("c", { phase: "continue", tokens: { input: 20, output: 200, cacheRead: 0, cacheCreate: 0 }, cost: 0.02, durMs: 10 * 60 * 1000 }));
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        const { total, phases } = obs.json.runs;
        const refine = phases.find((p) => p.phase === "refine");
        const cont = phases.find((p) => p.phase === "continue");
        assert.ok(refine && cont, "the report states a per-phase breakdown");
        assert.equal(refine.runCount, 2);
        assert.equal(refine.tokens, 165, "refine tokens come only from its own runs (110 + 55)");
        assert.ok(Math.abs(refine.costUsd - 0.015) < 1e-9);
        assert.equal(cont.runCount, 1);
        assert.equal(cont.tokens, 220);
        // the phases sum to the item's attributed total
        assert.equal(phases.reduce((a, p) => a + p.runCount, 0), total.runCount);
        assert.equal(phases.reduce((a, p) => a + p.tokens, 0), total.tokens);
        assert.ok(Math.abs(phases.reduce((a, p) => a + p.costUsd, 0) - total.costUsd) < 1e-9);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the phase comes from the loop's own declaration
  {
    name: "work-observe-scope/01 the phase comes from the loop's own declaration, never derived from prompt text, agent type or timing",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("v", { phase: "verify", tokens: { input: 1, output: 9, cacheRead: 0, cacheCreate: 0 }, cost: 0.001, durMs: 1000 }));
        // A run NOT minted by the loop shell — no declaration, so it is NOT placed
        // under verify even though nothing else distinguishes it.
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("x", { phase: null, tokens: { input: 1, output: 9, cacheRead: 0, cacheCreate: 0 }, cost: 0.001, durMs: 1000 }));
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        const { phases, noPhase, total } = obs.json.runs;
        const verify = phases.find((p) => p.phase === "verify");
        assert.equal(verify.runCount, 1, "only the loop-minted run appears under verify");
        assert.equal(noPhase.runCount, 1, "the non-loop run is reported as having no declared phase, not folded in");
        assert.equal(total.runCount, 2);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: runs with no declared phase are reported as such
  {
    name: "work-observe-scope/01 runs with no declared phase are reported under an explicit grouping with a run count, not distributed across the declared phases",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: "refine", tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("b", { phase: null, tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("c", { phase: null, tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 1000 }));
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        const { phases, noPhase } = obs.json.runs;
        assert.equal(noPhase.runCount, 2, "the grouping states how many runs it holds");
        assert.equal(phases.reduce((a, p) => a + p.runCount, 0), 1, "no-phase runs are not distributed across the declared phases");
        assert.match(obs.report, /no declared phase/, "the report names the grouping");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: what each phase grouping reports
  {
    name: "work-observe-scope/01 each phase row states runs, active time, tokens and cost",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: "refine", tokens: { input: 5, output: 10, cacheRead: 0, cacheCreate: 0 }, cost: 0.02, durMs: 4 * 60 * 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("b", { phase: "refine", tokens: { input: 5, output: 5, cacheRead: 0, cacheCreate: 0 }, cost: 0.01, durMs: 2 * 60 * 1000 }));
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        const refine = obs.json.runs.phases.find((p) => p.phase === "refine");
        assert.equal(typeof refine.runCount, "number", "the number of runs in that phase");
        assert.ok(refine.activeMs > 0, "the active time attributed to that phase");
        assert.ok(refine.tokens > 0, "the tokens attributed to that phase");
        assert.ok(refine.costUsd >= 0, "the cost attributed to that phase");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: an item whose runs declared no phase at all still reports
  {
    name: "work-observe-scope/01 an item none of whose runs declare a phase still reports under the no-declared-phase grouping with no empty phase rows fabricated",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: null, tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 1000 }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("b", { phase: null, tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0, durMs: 1000 }));
        const obs = await observeMilestone({ cwd, ref: "68", home: cwd, env: {}, generatedAt: T0 });
        assert.equal(obs.json.runs.noPhase.runCount, 2, "every run appears under the no-declared-phase grouping");
        assert.equal(obs.json.runs.phases.length, 0, "no empty phase rows are fabricated");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },

  // ══ 02_json-contract.feature ══
  // Scenario: the document carries the scoped, per-phase answer
  {
    name: "work-observe-scope/02 the --json document carries the item's totals, per-phase breakdown, and per-agent rows",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: "refine", tokens: { input: 1, output: 10, cacheRead: 0, cacheCreate: 0 }, cost: 0.001, durMs: 1000 }));
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "68" }));
        // exactly one document, parseable
        const json = JSON.parse(JSON.stringify(res.json));
        assert.ok(json && typeof json === "object", "one parseable document is emitted");
        assert.equal(json.milestone, "68");
        assert.ok(json.runs.total, "the item's totals are carried");
        assert.ok(Array.isArray(json.runs.phases), "the per-phase breakdown is carried");
        assert.ok(Array.isArray(json.agents), "the per-agent rows are carried");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a story ref is answerable through the same door
  {
    name: "work-observe-scope/02 a story ref is answerable through the same door with the same key set as a milestone",
    async run() {
      const cwd = await makeTree([
        "68_milestone_loop-telemetry",
        "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe",
      ]);
      try {
        await writeRun(cwd, "68_milestone_loop-telemetry/stories/04_story_story-and-phase-scoped-observe", mkRun("s", { phase: "continue", tokens: { input: 1, output: 5, cacheRead: 0, cacheCreate: 0 }, cost: 0.001, durMs: 1000 }));
        const storyRes = await withCwd(cwd, () => observeCommand.run({ ref: "68/04" }));
        const storyJson = storyRes.json;
        assert.equal(storyJson.kind, "story", "the document reports on that story");
        assert.equal(storyJson.story, "4");
        assert.equal(storyJson.milestone, "68");
        const msRes = await withCwd(cwd, () => observeCommand.run({ ref: "68" }));
        assert.deepEqual(Object.keys(storyJson).sort(), Object.keys(msRes.json).sort(), "its key set is the same as the one returned for a milestone");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the document states what it could not attribute
  {
    name: "work-observe-scope/02 absence is stated, never omitted — unattributed count, no-declared-phase grouping, and unmeasured spend distinct from zero",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry", "stray-dir"]);
      try {
        // A run with no declared phase and no measured spend.
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: null, spend: false, durMs: 1000 }));
        // A stray unattributed run under a non-item dir.
        const strayRuns = path.join(cwd, "wiki", "work", "stray-dir", "runs");
        await mkdir(strayRuns, { recursive: true });
        await writeFile(path.join(strayRuns, "zzz.json"), JSON.stringify(mkRun("zzz", { phase: "refine", tokens: { input: 1, output: 1, cacheRead: 0, cacheCreate: 0 }, cost: 0.01, durMs: 1000 })));
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "68" }));
        const { runs } = res.json;
        // runs that resolve to no item → the count of unattributed runs
        assert.equal(runs.unattributedCount, 1, "the count of unattributed runs is stated");
        // runs with no declared phase → the grouping and its run count
        assert.equal(runs.noPhase.runCount, 1, "the no-declared-phase grouping and its run count are stated");
        // runs whose spend was never measured → stated as not measured, distinct from zero
        assert.equal(runs.noPhase.unmeasuredSpend, 1, "unmeasured spend is counted, not guessed as zero");
        assert.equal(runs.noPhase.tokens, 0, "no measured tokens are fabricated for the unmeasured run");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the disabled gate still returns one parseable document
  {
    name: "work-observe-scope/02 the disabled --if-enabled gate still returns exactly one { skipped: true } document and writes no report",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await mkdir(path.join(cwd, ".aof"), { recursive: true });
        await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ work: { observability: { enabled: false } } }));
        assert.equal(observabilityEnabled({ work: { observability: { enabled: false } } }), false, "the config gates observability off");
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "68", ifEnabled: true }));
        assert.deepEqual(res, { skipped: true }, "exactly one skipped document is emitted and no report is written");
        // and the --json face emits that one parseable document.
        assert.deepEqual(observeCommand.cli.json(res), { skipped: true });
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a direct request runs regardless of the gate
  {
    name: "work-observe-scope/02 a direct request runs regardless of the gate and the document carries the full answer",
    async run() {
      const cwd = await makeTree(["68_milestone_loop-telemetry"]);
      try {
        await mkdir(path.join(cwd, ".aof"), { recursive: true });
        await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ work: { observability: { enabled: false } } }));
        await writeRun(cwd, "68_milestone_loop-telemetry", mkRun("a", { phase: "refine", tokens: { input: 1, output: 10, cacheRead: 0, cacheCreate: 0 }, cost: 0.001, durMs: 1000 }));
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "68", ifEnabled: false }));
        assert.notDeepEqual(res, { skipped: true }, "a direct request is not gated");
        assert.ok(res.json, "the document carries the full answer");
        assert.equal(res.json.milestone, "68");
        assert.ok(res.json.runs.phases.length >= 1);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
];
