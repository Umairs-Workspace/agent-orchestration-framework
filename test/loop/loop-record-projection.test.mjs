import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loopConcurrencyFromConfig } from "../../src/loop-bounds.mjs";
import { projectExecution, GAP_CLASSES } from "../../src/loop-record.mjs";
import { loadLoops } from "../../src/work/loops.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ------------------------------------------------------------- fixtures ----
//
// Built in the LOADER'S OWN SHAPES, never in a shape a belief about the loader would produce.
// `registryShapeTests` at the foot of this file pins them against `loadLoops` reading the real
// `.aof/loops`, which is the m77/R8 lesson made executable: two of five fixture rows there passed
// for the wrong reason because the fixture was written against a belief about the loader.
//
// A ceiling is one of exactly two things the loader can produce (`src/work/loops.mjs`): a list of
// POINTER entries, or one of the three sentinels. It is NEVER a bare number — `ceiling: 6` is a
// `loop-bad-value`. So the contract's "`ceiling: 6`" is realised the only way the registry admits
// a numeric bound: a `config:` pointer, resolved against the config handed to the projection.

const ceilingField = (declared) => {
  if (declared == null) return null;
  if (["none", "unknown", "uncapped"].includes(declared)) return [{ key: "ceiling", raw: declared, kind: declared }];
  return [{
    key: "ceiling",
    raw: `config:${declared.config}`,
    kind: "pointer",
    pointer: { scheme: "config", operand: declared.config },
  }];
};

const loopNode = (id, { ceiling = "none", owner = null, edges = {}, title = id } = {}) => {
  const fields = {};
  const parsedCeiling = ceilingField(ceiling);
  if (parsedCeiling) fields.ceiling = parsedCeiling;
  // `owner` parses through ACTOR_SCHEMES alone — an `actor:` ref, or the `unknown` sentinel.
  if (owner === "unknown") fields.owner = { key: "owner", raw: "unknown", kind: "unknown" };
  else if (owner) fields.owner = { key: "owner", raw: owner, kind: "ref", scheme: "actor", operand: owner.slice("actor:".length) };
  return { id, kind: "loop", title, path: `.aof/loops/${id.slice(id.indexOf(":") + 1)}.md`, fields, edges };
};

const actorNode = (id) => ({ id, kind: "actor", title: id, path: `.aof/loops/${id.slice(6)}.md`, fields: {}, edges: {} });

// The bound a ceiling of "6" is realised through. `work.autonomous.maxAttempts` is the key
// `autonomous-cascade.md` really declares, and it carries no clamp — so the number the projection
// reports is the number the config says.
const CAP_KEY = "work.autonomous.maxAttempts";
const capOf = (value) => ({ work: { autonomous: { maxAttempts: value } } });
const capped = (id) => loopNode(id, { ceiling: { config: CAP_KEY } });

// A run record in the fifteen-key shape `run-store.mjs` writes (measured against a real record at
// `wiki/work/38_.../runs/umamis-msi/20260712T213809392Z-0000.json`).
const run = ({ runId, createdAt, loop = null, state = "running", outcome = null, failureReason = null, retryOf = null, attempt = 1 }) => ({
  runId,
  itemRef: "78/00",
  state,
  attempt,
  outcome,
  sessionId: null,
  brief: loop ? { loop } : {},
  createdAt,
  updatedAt: createdAt,
  failureReason,
  heartbeatAt: null,
  retryOf,
  reclaimedAt: null,
  node: "test-node",
});

// The `brief.loop` envelope. Seven of these keys are the ones `buildLoopDeclaration` really mints;
// `id` (and `stopReason` below) are the two the contract requires and the producer does NOT write —
// the join hole recorded in 78/STATE.md. They are named here so the gap is visible in the fixture
// rather than hidden behind a passing test.
const declaration = ({ id, loopRunId, phase = "continue", cycle = 1, startedAt = "2026-09-01T00:00:00.000Z", ...rest }) => ({
  loopRunId,
  id,
  scope: "78",
  level: "L1",
  cap: 3,
  phase,
  cycle,
  startedAt,
  ...rest,
});

const stamp = (n) => `2026-09-01T00:0${n}:00.000Z`;

// n runs of one engagement, at cycles 1..n.
const engagementRuns = (id, loopRunId, n, extra = {}) => Array.from({ length: n }, (unused, index) => run({
  runId: `${loopRunId}-000${index}`,
  createdAt: stamp(index),
  loop: declaration({ id, loopRunId, cycle: index + 1 }),
  ...extra,
}));

const project = (registry, runs, config) => projectExecution({ registry, runs, config });

// =============================================================================
// 00_the-execution-model.feature
// =============================================================================

export const loopRecordProjectionTests = [
  // Scenario: a loop that ran once reports its cycles against its declared ceiling
  {
    name: "loop-record/00: a loop that ran once reports 4 cycles against its declared ceiling of 6",
    run: () => {
      const model = project(
        [capped("loop:build-to-green")],
        engagementRuns("loop:build-to-green", "lr-1", 4),
        capOf(6),
      );
      assert.equal(model.engagements.length, 1);
      assert.equal(model.engagements[0].loop, "loop:build-to-green");
      assert.equal(model.engagements[0].cycles, 4);
      assert.equal(model.engagements[0].ceiling.state, "bounded");
      assert.equal(model.engagements[0].ceiling.bound, 6);
    },
  },

  // Scenario: two engagements of the same loop are two rows, not one
  {
    name: "loop-record/00: two loopRunIds of one loop are two engagements, each with its own facts",
    run: () => {
      const first = engagementRuns("loop:review-fix-rereview", "lr-a", 2);
      const second = [
        run({
          runId: "lr-b-0000",
          createdAt: stamp(5),
          loop: declaration({ id: "loop:review-fix-rereview", loopRunId: "lr-b", phase: "verify", cycle: 1 }),
          state: "failed",
          outcome: "failed",
          failureReason: "runtime_offline",
        }),
      ];
      const model = project([loopNode("loop:review-fix-rereview")], [...first, ...second], {});
      assert.equal(model.engagements.length, 2);
      assert.deepEqual(model.engagements.map((e) => e.loopRunId), ["lr-a", "lr-b"]);
      assert.deepEqual(model.engagements.map((e) => e.cycles), [2, 1]);
      assert.deepEqual(model.engagements.map((e) => e.phases), [["continue"], ["verify"]]);
      assert.deepEqual(model.engagements.map((e) => e.outcome), [null, "failed"]);
    },
  },

  // Preamble: ORDER IS CANONICAL — engagements sort by startedAt, then by loopRunId.
  {
    name: "loop-record/00: engagements sort by startedAt, and two sharing a timestamp fall back to loopRunId",
    run: () => {
      const at = (loopRunId, startedAt) => run({
        runId: `${loopRunId}-0000`,
        createdAt: stamp(0),
        loop: declaration({ id: "loop:the-loop", loopRunId, startedAt }),
      });
      const later = "2026-09-01T09:00:00.000Z";
      const earlier = "2026-09-01T08:00:00.000Z";
      const model = project([loopNode("loop:the-loop")], [
        at("lr-zulu", later),
        at("lr-alpha", later),
        at("lr-omega", earlier),
      ], {});
      assert.deepEqual(model.engagements.map((e) => e.loopRunId), ["lr-omega", "lr-alpha", "lr-zulu"],
        "startedAt orders first; a shared timestamp falls back to the loopRunId, never to input order");
    },
  },

  // Scenario: the phases entered are reported in the order they were first entered
  {
    name: "loop-record/00: phases continue, verify, continue report as continue, verify",
    run: () => {
      const runs = ["continue", "verify", "continue"].map((phase, index) => run({
        runId: `lr-1-000${index}`,
        createdAt: stamp(index),
        loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-1", phase, cycle: index + 1 }),
      }));
      const model = project([loopNode("loop:build-to-green")], runs, {});
      assert.deepEqual(model.engagements[0].phases, ["continue", "verify"]);
    },
  },

  // Scenario: the attempt chain is reported as a chain, not a count
  {
    name: "loop-record/00: attempts 1, 2, 3 report as 3 attempts and a retry chain naming each retried run",
    run: () => {
      const runs = [0, 1, 2].map((index) => run({
        runId: `lr-1-000${index}`,
        createdAt: stamp(index),
        attempt: index + 1,
        retryOf: index === 0 ? null : `lr-1-000${index - 1}`,
        loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-1", cycle: index + 1 }),
      }));
      const model = project([loopNode("loop:build-to-green")], runs, {});
      assert.equal(model.engagements[0].attempts, 3);
      assert.deepEqual(model.engagements[0].retryChain, [
        { runId: "lr-1-0001", retryOf: "lr-1-0000" },
        { runId: "lr-1-0002", retryOf: "lr-1-0001" },
      ]);
    },
  },

  // Scenario Outline: the declared ceiling is reported as its own state
  ...[
    { declared: { config: CAP_KEY }, config: capOf(6), cycles: 4, state: "bounded", comparison: "within" },
    { declared: { config: CAP_KEY }, config: capOf(6), cycles: 6, state: "bounded", comparison: "at" },
    { declared: { config: CAP_KEY }, config: capOf(6), cycles: 7, state: "bounded", comparison: "over" },
    { declared: "none", config: {}, cycles: 4, state: "none", comparison: null },
    { declared: "unknown", config: {}, cycles: 4, state: "unknown", comparison: null },
    { declared: "uncapped", config: {}, cycles: 4, state: "uncapped", comparison: null },
  ].map((row) => ({
    name: `loop-record/00: a ceiling declared ${JSON.stringify(row.declared)} over ${row.cycles} cycles reports state ${row.state} and comparison ${row.comparison}`,
    run: () => {
      const model = project(
        [loopNode("loop:the-loop", { ceiling: row.declared })],
        engagementRuns("loop:the-loop", "lr-1", row.cycles),
        row.config,
      );
      assert.equal(model.engagements[0].ceiling.state, row.state);
      assert.equal(model.engagements[0].ceiling.comparison, row.comparison);
      if (row.comparison === null) assert.equal(model.engagements[0].ceiling.bound, null, "a non-numeric ceiling has no bound to compare against");
      assert.ok(Array.isArray(model.engagements[0].ceiling.declared),
        "the declared ceiling is carried as the raw entries, leaving how they read to the renderer");
    },
  })),

  // Scenario: a capped engagement and an uncapped one do not produce equal models
  {
    name: "loop-record/00: identical observed facts under ceiling 6 and ceiling uncapped are not equal models",
    run: () => {
      const runs = engagementRuns("loop:the-loop", "lr-1", 4);
      const cappedModel = project([loopNode("loop:the-loop", { ceiling: { config: CAP_KEY } })], runs, capOf(6));
      const uncappedModel = project([loopNode("loop:the-loop", { ceiling: "uncapped" })], runs, capOf(6));
      assert.notDeepEqual(cappedModel.engagements[0], uncappedModel.engagements[0]);
      assert.notEqual(cappedModel.engagements[0].ceiling.state, uncappedModel.engagements[0].ceiling.state,
        "they differ in the ceiling STATE, not only in a rendered string");
      assert.equal(cappedModel.engagements[0].cycles, uncappedModel.engagements[0].cycles);
    },
  },

  // Scenario Outline: the terminal outcome and stop reason are carried through, never re-derived
  ...[
    { outcome: "done", state: "done", failureReason: null, stopReason: "converged", expected: "converged" },
    { outcome: "failed", state: "failed", failureReason: "session_limit", stopReason: null, expected: "session_limit" },
    { outcome: null, state: "running", failureReason: null, stopReason: null, expected: null },
  ].map((row) => ({
    name: `loop-record/00: an engagement settling ${row.outcome ?? "(none)"} reports that outcome and the reason ${row.expected ?? "(none)"}`,
    run: () => {
      const runs = [run({
        runId: "lr-1-0000",
        createdAt: stamp(0),
        state: row.state,
        outcome: row.outcome,
        failureReason: row.failureReason,
        loop: declaration({ id: "loop:the-loop", loopRunId: "lr-1", ...(row.stopReason ? { stopReason: row.stopReason } : {}) }),
      })];
      const model = project([loopNode("loop:the-loop")], runs, {});
      assert.equal(model.engagements[0].outcome, row.outcome);
      assert.equal(model.engagements[0].stopReason, row.expected);
    },
  })),

  // Scenario: an engagement still in flight is reported as in flight, not as failed
  {
    name: "loop-record/00: an engagement with no terminal run is distinguishable from one that failed",
    run: () => {
      const inFlight = project([loopNode("loop:the-loop")], engagementRuns("loop:the-loop", "lr-1", 2), {});
      const failed = project([loopNode("loop:the-loop")], [run({
        runId: "lr-2-0000",
        createdAt: stamp(0),
        state: "failed",
        outcome: "failed",
        failureReason: "error",
        loop: declaration({ id: "loop:the-loop", loopRunId: "lr-2" }),
      })], {});
      assert.equal(inFlight.engagements[0].outcome, null);
      assert.equal(failed.engagements[0].outcome, "failed");
      assert.notDeepEqual(inFlight.engagements[0].outcome, failed.engagements[0].outcome);
    },
  },

  // Scenario: the projection is deterministic and does not mutate what it is handed
  {
    name: "loop-record/00: two projections of the same inputs are deeply equal and mutate neither input",
    run: () => {
      const registry = [capped("loop:build-to-green"), loopNode("loop:verify-triage-accept")];
      const runs = engagementRuns("loop:build-to-green", "lr-1", 3);
      const registryBefore = JSON.stringify(registry);
      const runsBefore = JSON.stringify(runs);
      const first = project(registry, runs, capOf(6));
      const second = project(registry, runs, capOf(6));
      assert.deepEqual(first, second);
      assert.equal(JSON.stringify(registry), registryBefore, "the registry model is unchanged");
      assert.equal(JSON.stringify(runs), runsBefore, "the run records are unchanged");
    },
  },

  // =============================================================================
  // 01_coverage-and-gaps.feature
  // =============================================================================

  // Scenario: coverage is stated even when nothing joined
  {
    name: "loop-record/01: 14 runs carrying no declaration report 14 found, 0 carrying, ratio 0, no engagements",
    run: () => {
      const runs = Array.from({ length: 14 }, (unused, index) => run({ runId: `r-${index}`, createdAt: stamp(index % 10) }));
      const model = project([loopNode("loop:the-loop")], runs, {});
      assert.equal(model.coverage.runsFound, 14);
      assert.equal(model.coverage.runsCarryingDeclaration, 0);
      assert.equal(model.coverage.ratio, 0);
      assert.deepEqual(model.engagements, []);
    },
  },

  // Scenario: a zero-coverage model is not the same object as a model built from no runs at all
  {
    name: "loop-record/01: 14 undeclared runs and no runs at all are different models",
    run: () => {
      const runs = Array.from({ length: 14 }, (unused, index) => run({ runId: `r-${index}`, createdAt: stamp(index % 10) }));
      const withRuns = project([], runs, {});
      const withoutRuns = project([], [], {});
      assert.equal(withRuns.coverage.runsFound, 14);
      assert.equal(withoutRuns.coverage.runsFound, 0);
      assert.notDeepEqual(withRuns, withoutRuns);
    },
  },

  // Scenario: coverage counts records, not engagements
  {
    name: "loop-record/01: 10 runs with 6 declarations across 2 loopRunIds report 10 found, 6 carrying, 2 engagements",
    run: () => {
      const declared = [
        ...engagementRuns("loop:the-loop", "lr-a", 3),
        ...engagementRuns("loop:the-loop", "lr-b", 3),
      ];
      const bare = Array.from({ length: 4 }, (unused, index) => run({ runId: `bare-${index}`, createdAt: stamp(9) }));
      const model = project([loopNode("loop:the-loop")], [...declared, ...bare], {});
      assert.equal(model.coverage.runsFound, 10);
      assert.equal(model.coverage.runsCarryingDeclaration, 6);
      assert.equal(model.engagements.length, 2);
    },
  },

  // Scenario Outline: each gap class is produced by its own cause and named separately
  {
    name: "loop-record/01: a run declaring a loop the registry does not hold is a ran-undeclared gap naming the id",
    run: () => {
      const model = project([loopNode("loop:the-loop")], engagementRuns("loop:not-in-the-registry", "lr-1", 1), {});
      assert.deepEqual(model.gaps["ran-undeclared"], [{ subject: "loop:not-in-the-registry" }]);
    },
  },
  {
    name: "loop-record/01: a registry loop no run carries is a declared-never-ran gap naming the loop",
    run: () => {
      const model = project([loopNode("loop:never-driven")], [], {});
      assert.deepEqual(model.gaps["declared-never-ran"], [{ subject: "loop:never-driven" }]);
    },
  },
  {
    name: "loop-record/01: a ran loop citing an owner the registry does not declare is an authority-unresolved gap naming the endpoint",
    run: () => {
      const registry = [loopNode("loop:the-loop", { owner: "actor:nobody" })];
      const model = project(registry, engagementRuns("loop:the-loop", "lr-1", 1), {});
      assert.deepEqual(model.gaps["authority-unresolved"], [{ subject: "actor:nobody" }]);
    },
  },

  // Scenario: the three gap classes are reported separately, never merged into one list
  {
    name: "loop-record/01: one gap of each class at once reports under three names with no gap in two of them",
    run: () => {
      const registry = [
        loopNode("loop:ran-and-unowned", { owner: "actor:nobody" }),
        loopNode("loop:never-driven"),
      ];
      const runs = [
        ...engagementRuns("loop:ran-and-unowned", "lr-a", 1),
        ...engagementRuns("loop:not-in-the-registry", "lr-b", 1),
      ];
      const model = project(registry, runs, {});
      assert.deepEqual(Object.keys(model.gaps), [...GAP_CLASSES]);
      assert.deepEqual(model.gaps["ran-undeclared"], [{ subject: "loop:not-in-the-registry" }]);
      assert.deepEqual(model.gaps["declared-never-ran"], [{ subject: "loop:never-driven" }]);
      assert.deepEqual(model.gaps["authority-unresolved"], [{ subject: "actor:nobody" }]);
      const all = GAP_CLASSES.flatMap((cls) => model.gaps[cls].map((gap) => gap.subject));
      assert.equal(new Set(all).size, all.length, "no gap appears in more than one class");
    },
  },

  // Scenario: `declared-never-ran` is bounded by the registry, not by the work stream
  {
    name: "loop-record/01: a 17-record registry with no engagements reports every loop never-ran, and no more",
    run: () => {
      const registry = Array.from({ length: 17 }, (unused, index) => loopNode(`loop:l-${String(index).padStart(2, "0")}`));
      const model = project(registry, [], {});
      assert.equal(model.gaps["declared-never-ran"].length, 17);
      assert.ok(model.gaps["declared-never-ran"].length <= registry.length,
        "the class is bounded by the registry's size, never by the work stream's");
    },
  },

  // Scenario: a resolved authority produces no gap
  {
    name: "loop-record/01: a ran loop whose owner names a declared actor produces no authority-unresolved gap",
    run: () => {
      const registry = [loopNode("loop:the-loop", { owner: "actor:operator" }), actorNode("actor:operator")];
      const model = project(registry, engagementRuns("loop:the-loop", "lr-1", 1), {});
      assert.deepEqual(model.gaps["authority-unresolved"], []);
    },
  },

  // Scenario: gaps are ordered canonically so the rendered record is stable
  {
    name: "loop-record/01: several gaps in one class appear in code-unit order, the same order both times",
    run: () => {
      const registry = ["loop:zeta", "loop:alpha", "loop:Mid", "loop:beta"].map((id) => loopNode(id));
      const first = project(registry, [], {});
      const second = project(registry, [], {});
      const subjects = first.gaps["declared-never-ran"].map((gap) => gap.subject);
      assert.deepEqual(subjects, ["loop:Mid", "loop:alpha", "loop:beta", "loop:zeta"]);
      assert.deepEqual(second.gaps["declared-never-ran"], first.gaps["declared-never-ran"]);
    },
  },

  // =============================================================================
  // 129/01/tasks/00_the-mode-has-one-home.feature — a record citing the MODE as a ceiling
  // =============================================================================

  // Scenario: a loop record citing the key as a ceiling carries no string bound
  {
    name: "129/01/00 a loop record citing config:work.loop.concurrency as its ceiling projects bounded with a null bound and no comparison, beside one citing reviewRounds that carries 2 and within",
    run: () => {
      const config = { work: { loop: { concurrency: "refine_first", reviewRounds: 2 } } };
      // THE RESOLVER REALLY ANSWERS A STRING for this config — so a `null` bound below is the
      // projection's guard refusing to carry it, not a resolver that answered nothing (m77/R8:
      // a fixture must not pass for the wrong reason).
      assert.equal(loopConcurrencyFromConfig({ config }), "refine_first", "guard: the mode resolves to a string for this config");
      const registry = [
        loopNode("loop:mode-bounded", { ceiling: { config: "work.loop.concurrency" } }),
        loopNode("loop:review-bounded", { ceiling: { config: "work.loop.reviewRounds" } }),
      ];
      const runs = [
        ...engagementRuns("loop:mode-bounded", "lr-mode", 1),
        ...engagementRuns("loop:review-bounded", "lr-review", 1),
      ];
      const model = project(registry, runs, config);
      const byLoop = new Map(model.engagements.map((engagement) => [engagement.loop, engagement]));
      assert.equal(model.engagements.length, 2, "guard: both records joined");

      const mode = byLoop.get("loop:mode-bounded").ceiling;
      assert.equal(mode.state, "bounded", "the author declared a limit, so the pointer is bounded…");
      assert.equal(mode.bound, null, "…with no number on it — never the string the resolver answered");
      assert.notEqual(mode.bound, "refine_first");
      assert.equal(mode.comparison, null);
      assert.deepEqual([...mode.declared], ["config:work.loop.concurrency"]);

      const review = byLoop.get("loop:review-bounded").ceiling;
      assert.equal(review.state, "bounded");
      assert.equal(review.bound, 2, "a numeric knob in the same projection still carries its number");
      assert.equal(review.comparison, "within", "1 cycle against a bound of 2");
    },
  },
];

// =============================================================================
// THE FIXTURE PIN (m77/R8) — the fixtures above are shaped like the loader's output because this
// asserts it against the loader's real output, not because someone believed they were.
// =============================================================================

export const loopRecordRegistryShapeTests = [
  {
    name: "loop-record/fixture: the ceiling shapes the fixtures build are the shapes loadLoops really produces",
    run: async () => {
      const registry = await loadLoops(path.join(root, ".aof"));
      const loops = registry.nodes.filter((node) => node.kind === "loop");
      assert.ok(loops.length > 0, "the real registry has loop records to pin against");

      const pointerCeilings = loops.filter((node) => node.fields.ceiling?.[0]?.kind === "pointer");
      const sentinelCeilings = loops.filter((node) => ["none", "unknown", "uncapped"].includes(node.fields.ceiling?.[0]?.kind));
      assert.ok(pointerCeilings.length > 0 && sentinelCeilings.length > 0,
        "the real registry exercises both ceiling forms, so both fixture forms are pinned");

      // A ceiling is NEVER a bare number: the fixture realises "ceiling: 6" through a config
      // pointer for exactly this reason.
      for (const node of loops) {
        for (const entry of node.fields.ceiling ?? []) {
          assert.ok(typeof entry.cycles !== "number", `${node.id} declares a numeric ceiling, which the loader cannot produce`);
        }
      }

      const real = pointerCeilings[0].fields.ceiling[0];
      assert.deepEqual(Object.keys(real).sort(), ["key", "kind", "pointer", "raw"]);
      assert.deepEqual(Object.keys(real.pointer).sort(), ["operand", "scheme"]);
      const fixture = ceilingField({ config: CAP_KEY })[0];
      assert.deepEqual(Object.keys(fixture).sort(), Object.keys(real).sort());
      assert.deepEqual(Object.keys(fixture.pointer).sort(), Object.keys(real.pointer).sort());

      const realSentinel = sentinelCeilings[0].fields.ceiling[0];
      assert.deepEqual(Object.keys(realSentinel).sort(), Object.keys(ceilingField("none")[0]).sort());
    },
  },
  {
    name: "loop-record/fixture: the projection over the REAL registry and this repo's real coverage reports zero, loudly",
    run: async () => {
      const registry = await loadLoops(path.join(root, ".aof"));
      // ADR-003's primary case, against the real registry: no run in this repository carries a
      // loop declaration, so every declared loop is `declared-never-ran` and coverage is a
      // measurement rather than an absence.
      const model = projectExecution({ registry, runs: [], config: {} });
      const loops = registry.nodes.filter((node) => node.kind === "loop");
      assert.equal(model.coverage.runsFound, 0);
      assert.equal(model.coverage.runsCarryingDeclaration, 0);
      assert.deepEqual(model.engagements, []);
      assert.equal(model.gaps["declared-never-ran"].length, loops.length);
      assert.deepEqual(model.gaps["ran-undeclared"], []);
    },
  },
];
