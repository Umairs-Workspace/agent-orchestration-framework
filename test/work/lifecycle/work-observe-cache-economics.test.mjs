// Traceability wiring for milestone 70 / story 02 — cache economics per phase.
//
// Covers EVERY @executable scenario in the two task features:
//   tasks/00_ratio-per-phase.feature
//   tasks/01_target-and-verdict.feature
// exercising the REAL src/work/observe.mjs pure cache-economics functions
// (rollupRunsByPhase, applyCacheTarget, verdictForCacheBucket, cacheTargetIsHonourable)
// and the REAL registered src/commands/observe.mjs --json door reading the configured
// target from the workspace config (work.observability.cacheRatioTarget), against a
// temp fixture work stream. One test object per @executable scenario (Scenario-Outline
// rows folded into one entry iterating the rows), each name tracing to feature +
// scenario. node:assert/strict. `{ name, run }` shape so it spreads into the runner's
// tests array like every other suite.
//
// ADR-008: this story RECORDS and does not ENFORCE — no run is failed, capped, retried
// or killed on a verdict. The pure functions below never mutate a run record.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  observeMilestone,
  rollupRunsByPhase,
  applyCacheTarget,
  verdictForCacheBucket,
  cacheTargetIsHonourable,
} from "../../../src/work/observe.mjs";
import { observeCommand } from "../../../src/commands/observe.mjs";
import { getCommand, invoke } from "../../../src/command-core.mjs";

const T0 = Date.parse("2026-08-21T10:00:00.000Z");

// A minimal run record carrying what the rollup reads (68/ADR-002: phase rides
// brief.loop.phase; 68/ADR-001: spend). `spend:false` ⇒ spend null (not measured);
// `tokens` carries the four mutually-exclusive buckets 68 enforces in the writer.
function mkRun(id, { phase = null, tokens = null, cost = null, durMs = 1000, created = T0, spend = true } = {}) {
  return {
    runId: id,
    itemRef: "70",
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

// token buckets — shorthand for the four mutually-exclusive keys 68/ADR-003 enforces.
const B = (cacheRead, cacheCreate, input = 0, output = 0) => ({ input, output, cacheRead, cacheCreate });

async function makeTree(folders = []) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-obs70-"));
  for (const f of folders) {
    await mkdir(path.join(cwd, "wiki", "work", f), { recursive: true });
  }
  return cwd;
}

async function writeRun(cwd, relFolder, run) {
  const runsDir = path.join(cwd, "wiki", "work", relFolder, "runs");
  await mkdir(runsDir, { recursive: true });
  const runPath = path.join(runsDir, `${run.runId}.json`);
  await writeFile(runPath, JSON.stringify(run));
  return runPath;
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

export const workObserveCacheEconomicsTests = [
  // ══ 00_ratio-per-phase.feature ══
  // Scenario: a phase's runs report their cache ratio
  {
    name: "work-observe-cache/00 each phase reports its cache-read-to-creation ratio, derived from the recorded buckets, not re-counted from a transcript",
    async run() {
      const runs = [
        mkRun("a", { phase: "refine", tokens: B(2000, 500) }),
        mkRun("b", { phase: "refine", tokens: B(1000, 500) }),
      ];
      const r = rollupRunsByPhase(runs);
      const refine = r.phases.find((p) => p.phase === "refine");
      assert.equal(refine.cacheState, "measured");
      assert.equal(refine.cacheRead, 3000, "cache reads sum the recorded buckets");
      assert.equal(refine.cacheCreate, 1000, "cache creations sum the recorded buckets");
      assert.equal(refine.cacheRatio, 3, "the ratio is reads ÷ creations, derived from the buckets");
    },
  },
  // Scenario: runs are grouped by the phase the loop declared
  {
    name: "work-observe-cache/00 runs are attributed to the phase their loop declaration names, never inferred from item, command or elapsed time",
    async run() {
      const runs = [
        mkRun("a", { phase: "refine", tokens: B(100, 10), durMs: 5000 }),
        mkRun("b", { phase: "continue", tokens: B(50, 10), durMs: 3000 }),
        // a run minted in no phase at all — nothing about its item/command/time places it
        mkRun("c", { phase: null, tokens: B(10, 1), durMs: 7000 }),
      ];
      const r = rollupRunsByPhase(runs);
      assert.equal(r.phases.length, 2, "only the two declared phases appear");
      assert.equal(r.phases.find((p) => p.phase === "refine").runCount, 1);
      assert.equal(r.phases.find((p) => p.phase === "continue").runCount, 1);
      assert.equal(r.noPhase.runCount, 1, "the undeclared run is not folded into a phase");
      assert.equal(r.total.runCount, 3);
    },
  },
  // Scenario: a run the loop did not mint reports no phase
  {
    name: "work-observe-cache/00 a run with no loop declaration reports no phase, its spend still reported under no phase rather than a guessed one",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", mkRun("x", { phase: null, tokens: B(300, 100), cost: 0.02, durMs: 1000 }));
        const obs = await observeMilestone({ cwd, ref: "70", home: cwd, env: {}, generatedAt: T0 });
        const { phases, noPhase } = obs.json.runs;
        assert.equal(phases.length, 0, "no phase is minted for an undeclared run");
        assert.equal(noPhase.runCount, 1);
        assert.equal(noPhase.cacheRead, 300, "its spend is still reported, under no declared phase");
        assert.equal(noPhase.cacheRatio, 3);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: an unmeasured run is not a zero
  {
    name: "work-observe-cache/00 an unmeasured run (no spend) is reported unmeasured and excluded from the ratio, never counted as a cache miss; the count is visible",
    async run() {
      const runs = [
        mkRun("a", { phase: "refine", tokens: B(2000, 500) }),
        mkRun("b", { phase: "refine", spend: false }),
      ];
      const r = rollupRunsByPhase(runs);
      const refine = r.phases.find((p) => p.phase === "refine");
      assert.equal(refine.cacheState, "measured");
      assert.equal(refine.cacheRatio, 4, "the unmeasured run's absence does not corrupt the ratio (2000 ÷ 500)");
      assert.equal(refine.unmeasuredSpend, 1, "the count of unmeasured runs is visible");
      assert.equal(refine.cacheRead, 2000, "the unmeasured run contributes nothing to the cache buckets");
      // The count must survive into the RENDERED markdown, not only the JSON object.
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", runs[0]);
        await writeRun(cwd, "70_milestone_warm-start", runs[1]);
        const obs = await observeMilestone({ cwd, ref: "70", home: cwd, env: {}, generatedAt: T0 });
        const row = obs.report.split("\n").find((l) => l.startsWith("| refine "));
        assert.ok(row, "the refine phase row is rendered");
        const cells = row.split("|").map((c) => c.trim()).filter((c) => c !== "");
        assert.equal(cells[5], "1", "the rendered report shows the unmeasured-run count per phase");
        assert.equal(cells[8], "4.000", "the rendered report shows the ratio, un-corrupted by the unmeasured run");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a phase that created cache but never read it is reported, not hidden
  {
    name: "work-observe-cache/00 a phase that created cache but never read it reports a ratio of zero, distinguishable from no measurement at all",
    async run() {
      const runs = [mkRun("a", { phase: "refine", tokens: B(0, 500) })];
      const r = rollupRunsByPhase(runs);
      const refine = r.phases.find((p) => p.phase === "refine");
      assert.equal(refine.cacheState, "measured", "a created-only phase IS measured");
      assert.equal(refine.cacheRatio, 0, "reads ÷ creations = 0, not unmeasured");
      assert.notEqual(refine.cacheState, "unmeasured", "a zero ratio is distinguishable from no measurement");
    },
  },
  // Scenario Outline: the ratio across the cases a real stream contains
  {
    name: "work-observe-cache/00 ratio cases: reads/creations divided; reads-only unbounded; creations-only zero; neither bucket unmeasured; no spend envelope unmeasured",
    async run() {
      const cases = [
        { run: mkRun("a", { phase: "p", tokens: B(2000, 500) }), state: "measured", ratio: 4, label: "reads and creations" },
        { run: mkRun("b", { phase: "p", tokens: B(1000, 0) }), state: "unbounded", ratio: Infinity, label: "reads only, no creations" },
        { run: mkRun("c", { phase: "p", tokens: B(0, 500) }), state: "measured", ratio: 0, label: "creations only, no reads" },
        { run: mkRun("d", { phase: "p", tokens: B(0, 0) }), state: "unmeasured", ratio: null, label: "neither bucket populated" },
        { run: mkRun("e", { phase: "p", spend: false }), state: "unmeasured", ratio: null, label: "no spend envelope at all" },
      ];
      for (const c of cases) {
        const r = rollupRunsByPhase([c.run]);
        const p = r.phases.find((x) => x.phase === "p");
        assert.equal(p.cacheState, c.state, `${c.label}: state`);
        if (c.ratio === Infinity) {
          assert.equal(p.cacheRatio, Infinity, `${c.label}: unbounded (not divided by zero)`);
        } else {
          assert.equal(p.cacheRatio, c.ratio, `${c.label}: ratio`);
        }
      }
    },
  },
  {
    name: "work-observe-cache/00 the rendered report distinguishes warm/unbounded, zero, and wholly unmeasured phases",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", mkRun("warm", { phase: "warm", tokens: B(1000, 0) }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("zero", { phase: "zero", tokens: B(0, 500) }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("none", { phase: "unmeasured", spend: false }));

        const res = await withCwd(cwd, () => invoke("work:observe", { ref: "70" }));
        const rendered = getCommand("work:observe").cli.render(res);
        const ratioCell = (phase) => {
          const row = rendered.split("\n").find((line) => line.startsWith(`| ${phase} `));
          assert.ok(row, `${phase}: rendered phase row exists`);
          return row.split("|").map((cell) => cell.trim()).filter(Boolean)[8];
        };
        assert.equal(ratioCell("warm"), "∞ (warm, unbounded)", "reads with no creations render as warm/unbounded");
        assert.equal(ratioCell("zero"), "0.000", "creations with no reads render as a measured zero");
        assert.equal(ratioCell("unmeasured"), "unmeasured", "a phase with no spend at all does not render as zero");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the report answers the question the milestone is judged by
  {
    name: "work-observe-cache/00 the report answers: fraction read vs written, which phase pays the write rate, and how many runs contributed no measurement",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("b", { phase: "continue", tokens: B(0, 900) }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("c", { phase: "continue", spend: false }));
        const obs = await observeMilestone({ cwd, ref: "70", home: cwd, env: {}, generatedAt: T0 });
        assert.match(obs.report, /cacheRead ÷ cacheCreate/, "the report states what the ratio means");
        assert.match(obs.report, /refine.*4\.000/, "the report states each phase's ratio (fraction read vs written)");
        assert.match(obs.report, /continue.*0\.000/, "a phase paying the cache-write rate reads as 0");
        assert.match(obs.report, /unmeasured/, "runs that contributed no measurement are named");
        const cont = obs.json.runs.phases.find((p) => p.phase === "continue");
        assert.equal(cont.unmeasuredSpend, 1, "how many runs contributed no measurement is visible");
        // The rendered markdown must carry the answer too, alongside the preserved
        // 68/04 cost and unmeasured-spend columns (review fix: the cache columns are
        // ADDED, never substituted for cost reporting).
        const row = obs.report.split("\n").find((l) => l.startsWith("| continue "));
        assert.ok(row, "the continue phase row is rendered");
        const cells = row.split("|").map((c) => c.trim()).filter((c) => c !== "");
        // cells: phase(0) runs(1) active(2) tokens(3) cost(4) unmeasured(5)
        //        cacheRead(6) cacheCreate(7) cacheRatio(8) verdict(9)
        assert.match(cells[4], /^\$[\d.]+$/, "the cost column is preserved alongside the cache columns");
        assert.equal(cells[5], "1", "the rendered report shows how many runs contributed no measurement");
        assert.equal(cells[6], "0", "the rendered report shows that phase's cache reads");
        assert.equal(cells[7], "900", "the rendered report shows that phase's cache creations");
        assert.equal(cells[8], "0.000", "the rendered report shows that phase's cache ratio");
        assert.equal(cells[9], "—", "no verdict is stated without a target");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_target-and-verdict.feature ══
  // Scenario: a stated target produces a verdict per phase
  {
    name: "work-observe-cache/01 a configured target yields a met-or-missed verdict per measured phase and is stated in the report",
    async run() {
      const runs = [
        mkRun("a", { phase: "refine", tokens: B(2000, 500) }), // ratio 4
        mkRun("b", { phase: "continue", tokens: B(100, 500) }), // ratio 0.2
      ];
      const rollup = applyCacheTarget(rollupRunsByPhase(runs), 1);
      assert.equal(rollup.cacheTarget, 1);
      assert.equal(rollup.phases.find((p) => p.phase === "refine").cacheVerdict, "met");
      assert.equal(rollup.phases.find((p) => p.phase === "continue").cacheVerdict, "missed");
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));
        const obs = await observeMilestone({ cwd, ref: "70", home: cwd, env: {}, generatedAt: T0, cacheRatioTarget: 1 });
        assert.match(obs.report, /cache-ratio target is \*\*1\*\*/, "the target it was judged against is stated");
        assert.match(obs.report, /met/, "a verdict is stated");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: no target means no verdict, not a default one
  {
    name: "work-observe-cache/01 with no configured target the ratio is still reported, and no verdict and no target are stated or invented",
    async run() {
      const runs = [mkRun("a", { phase: "refine", tokens: B(2000, 500) })];
      const rollup = applyCacheTarget(rollupRunsByPhase(runs), null);
      assert.equal(rollup.cacheTarget, null, "no target is invented");
      assert.equal(rollup.phases.find((p) => p.phase === "refine").cacheVerdict, null, "no verdict is stated");
      assert.equal(rollup.phases.find((p) => p.phase === "refine").cacheRatio, 4, "the ratio is still reported");
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));
        const obs = await observeMilestone({ cwd, ref: "70", home: cwd, env: {}, generatedAt: T0, cacheRatioTarget: null });
        assert.equal(obs.json.runs.cacheTarget, null);
        assert.equal(obs.json.runs.phases[0].cacheVerdict, null);
        assert.match(obs.report, /4\.000/, "the ratio is still reported");
        assert.doesNotMatch(obs.report, /target is \*\*/u, "no numeric target value is invented when none is configured");
        assert.match(obs.report, /No cache-ratio target is configured/, "the absence is stated first-class, not hidden");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario: an unmeasured phase gets no verdict
  {
    name: "work-observe-cache/01 an unmeasured phase gets no verdict — reported unmeasured, never judged missed",
    async run() {
      const runs = [mkRun("a", { phase: "refine", spend: false })];
      const rollup = applyCacheTarget(rollupRunsByPhase(runs), 1);
      const refine = rollup.phases.find((p) => p.phase === "refine");
      assert.equal(refine.cacheState, "unmeasured");
      assert.equal(refine.cacheVerdict, null, "an unmeasured phase is not judged missed");
    },
  },
  // Scenario: the verdict changes nothing about the run
  {
    name: "work-observe-cache/01 the verdict is recorded in the report and no run is failed, retried, capped or killed as a result",
    async run() {
      const runs = [mkRun("a", { phase: "refine", tokens: B(100, 500) })]; // ratio 0.2 < target 1
      const before = JSON.parse(JSON.stringify(runs[0]));
      const rollup = applyCacheTarget(rollupRunsByPhase(runs), 1);
      assert.equal(rollup.phases.find((p) => p.phase === "refine").cacheVerdict, "missed");
      assert.deepEqual(runs[0], before, "the run record is byte-unchanged — the verdict only reports, it never enforces");
    },
  },
  {
    name: "work-observe-cache/01 a missed target completes through the registered command, renders the missed verdict, and leaves run-record bytes unchanged",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await mkdir(path.join(cwd, ".aof"), { recursive: true });
        await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ name: "fx", work: { observability: { cacheRatioTarget: 1 } } }));
        const runPath = await writeRun(cwd, "70_milestone_warm-start", mkRun("miss", { phase: "refine", tokens: B(100, 500) }));
        const before = await readFile(runPath);

        const command = getCommand("work:observe");
        assert.ok(command, "work:observe is permanently registered");
        const res = await withCwd(cwd, () => invoke("work:observe", { ref: "70" }));
        const rendered = command.cli.render(res);
        const after = await readFile(runPath);

        assert.equal(res.json.runs.phases[0].cacheVerdict, "missed", "the command completes successfully with a report result");
        assert.match(rendered, /\| refine .*\| \*\*missed\*\* \|/u, "the user-visible report renders the missed verdict");
        assert.equal(res.written, null, "the default report path remains read-only");
        assert.deepEqual(after, before, "the run-record file is byte-unchanged after reporting the missed verdict");
        assert.equal(JSON.parse(after.toString("utf8")).state, "done", "a missed target does not fail, retry, cap or kill the completed run");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: verdicts against a stated target
  {
    name: "work-observe-cache/01 verdicts against a stated target: above=met, at=met, below=missed, zero-with-creations=missed, unmeasured=none",
    async run() {
      // target 1
      assert.equal(verdictForCacheBucket({ cacheState: "measured", cacheRatio: 2 }, 1), "met", "above the target");
      assert.equal(verdictForCacheBucket({ cacheState: "measured", cacheRatio: 1 }, 1), "met", "exactly at the target");
      assert.equal(verdictForCacheBucket({ cacheState: "measured", cacheRatio: 0.5 }, 1), "missed", "below the target");
      assert.equal(verdictForCacheBucket({ cacheState: "measured", cacheRatio: 0 }, 1), "missed", "zero, with creations recorded");
      assert.equal(verdictForCacheBucket({ cacheState: "unmeasured", cacheRatio: null }, 1), null, "unmeasured");
      // unbounded (warm) is always met
      assert.equal(verdictForCacheBucket({ cacheState: "unbounded", cacheRatio: Infinity }, 1), "met", "a warm phase is met");
    },
  },
  // Scenario Outline: target configuration that cannot be honoured
  {
    name: "work-observe-cache/01 target configuration: in-range target stated; not-a-number, negative and absent all yield no verdict while the ratio is still reported",
    async run() {
      const run = mkRun("a", { phase: "refine", tokens: B(2000, 500) });
      const inRange = applyCacheTarget(rollupRunsByPhase([run]), 1);
      assert.equal(inRange.cacheTarget, 1, "a number in range → verdicts are stated against it");
      assert.equal(inRange.phases[0].cacheVerdict, "met");
      for (const bad of ["nope", -1, null, undefined, NaN]) {
        const r = applyCacheTarget(rollupRunsByPhase([run]), bad);
        assert.equal(r.cacheTarget, null, `unhonourable target (${String(bad)}) → no target invented`);
        assert.equal(r.phases[0].cacheVerdict, null, `unhonourable target (${String(bad)}) → no verdict`);
        assert.equal(r.phases[0].cacheRatio, 4, `unhonourable target (${String(bad)}) → the ratio is still reported`);
      }
      // the honourable predicate matches the same boundary
      assert.equal(cacheTargetIsHonourable(1), true);
      assert.equal(cacheTargetIsHonourable(0), true);
      assert.equal(cacheTargetIsHonourable(-1), false);
      assert.equal(cacheTargetIsHonourable("nope"), false);
      assert.equal(cacheTargetIsHonourable(null), false);
      assert.equal(cacheTargetIsHonourable(undefined), false);
      assert.equal(cacheTargetIsHonourable(Number.NaN), false);
    },
  },
  // CLI wiring: the registered command reads the configured target from the workspace config
  {
    name: "work-observe-cache/01 the registered observe command reads the configured cache-ratio target from work.observability.cacheRatioTarget",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await mkdir(path.join(cwd, ".aof"), { recursive: true });
        await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ name: "fx", work: { observability: { cacheRatioTarget: 1 } } }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "70" }));
        assert.equal(res.json.runs.cacheTarget, 1, "the target configured in the workspace reaches the report");
        assert.equal(res.json.runs.phases.find((p) => p.phase === "refine").cacheVerdict, "met");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-cache/01 with no target configured the command states no verdict and no target, while the ratio is still reported",
    async run() {
      const cwd = await makeTree(["70_milestone_warm-start"]);
      try {
        await mkdir(path.join(cwd, ".aof"), { recursive: true });
        await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ name: "fx", work: { observability: {} } }));
        await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));
        const res = await withCwd(cwd, () => observeCommand.run({ ref: "70" }));
        assert.equal(res.json.runs.cacheTarget, null, "no target is invented");
        assert.equal(res.json.runs.phases.find((p) => p.phase === "refine").cacheVerdict, null, "no verdict is stated");
        assert.equal(res.json.runs.phases.find((p) => p.phase === "refine").cacheRatio, 4, "the ratio is still reported");
        const rendered = getCommand("work:observe").cli.render(res);
        assert.match(rendered, /No cache-ratio target is configured/u, "the user-visible report identifies an absent target");
        assert.doesNotMatch(rendered, /configured but invalid/u, "absence is not mislabeled as invalid configuration");
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  },
  {
    name: "work-observe-cache/01 malformed and negative configured targets are pinned at the registered command boundary as invalid, with ratio and no verdict preserved",
    async run() {
      for (const target of ["not-a-number", -1]) {
        const cwd = await makeTree(["70_milestone_warm-start"]);
        try {
          await mkdir(path.join(cwd, ".aof"), { recursive: true });
          await writeFile(path.join(cwd, ".aof", "aof.config.json"), JSON.stringify({ name: "fx", work: { observability: { cacheRatioTarget: target } } }));
          await writeRun(cwd, "70_milestone_warm-start", mkRun("a", { phase: "refine", tokens: B(2000, 500) }));

          const res = await withCwd(cwd, () => invoke("work:observe", { ref: "70" }));
          const phase = res.json.runs.phases.find((p) => p.phase === "refine");
          const rendered = getCommand("work:observe").cli.render(res);
          assert.equal(res.json.runs.cacheTarget, null, `${String(target)}: no invalid target is exposed as honourable`);
          assert.equal(phase.cacheRatio, 4, `${String(target)}: the recorded ratio is preserved`);
          assert.equal(phase.cacheVerdict, null, `${String(target)}: no verdict is invented`);
          assert.match(rendered, /cache-ratio target is configured but invalid/u, `${String(target)}: user-visible output distinguishes invalid from absent`);
          assert.match(rendered, /\| refine .*\| 4\.000 \| — \|/u, `${String(target)}: rendered ratio remains visible with no verdict`);
          assert.doesNotMatch(rendered, /No cache-ratio target is configured/u, `${String(target)}: configured invalid is not mislabeled absent`);
        } finally {
          await rm(cwd, { recursive: true, force: true });
        }
      }
    },
  },
];
