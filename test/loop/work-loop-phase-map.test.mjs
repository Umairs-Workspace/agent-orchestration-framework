import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideLoop, decideLoopAction, decideLoopPhase, decideWave } from "../../src/work/loop.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { workLoopStoryFixturesFor } from "../support/work-loop-story-fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ready = (type, ref = "53/01", status = "in-progress") => ({ state: "ready", ref, type, status });
const tasks = (count, uat = 0, extras = {}) => ({
  ...extras,
  tasks: Array.from({ length: count }, (_, index) => ({
    file: `${index}.feature`,
    feature: `feature-${index}`,
    scenarios: 9,
    counts: { executable: 9, manual: 0, uat },
  })),
});


// =============================================================================
// 129/01 — THE ENGINE ROUTES ON STATUS, NAMES THE THREE PHASES, DECIDES THE WAVE
// =============================================================================
//
// Traceability: 129/01/tasks/01_the-engine-routes-on-status.feature,
// 02_refine-first-is-three-phases.feature and 03_the-wave-is-decided-purely.feature (the
// `decideWave` half; the closed-set half is `work-loop-stop-set.test.mjs`'s). Every scenario
// and every Examples row of the three is exercised here, against the pure engine and nothing
// else — no shell, no fixture tree, no config — because that is the property the story lands:
// every concurrency decision is a function the suites can drive.

const story = (status, ref = "07/02") => ({ state: "ready", ref, type: "story", status });
const oneTask = (uat = 0) => tasks(1, uat);
const GATE = Object.freeze({ act: "gate", ref: "07/02", command: "work:validate" });
const CONTINUE = (cycle = 1) => ({ act: "drive", ref: "07/02", phase: "continue", cycle });
const REFINE = (ref) => ({ act: "drive", ref, phase: "refine", cycle: 1 });
const capExhausted = (phase, cycle = 3) => ({ act: "halt", stop: "cap-exhausted", producer: "engine:cycle>=cap", ref: "07/02", phase, cycle, cap: 3 });
const UAT_GATE = Object.freeze({ act: "halt", stop: "uat-gate", producer: "work:tasks:counts.uat", ref: "07/02", uat: 1 });
const show = (value) => (value === undefined ? "undefined" : JSON.stringify(value));

const loopConcurrencyTests = [
  // ── task 01 · an in-review story with tasks decides gate whatever the last phase was ──
  ...[
    [undefined, undefined, 0],
    ["continue", undefined, 0],
    ["verify", undefined, 0],
    ["refine", undefined, 0],
    [undefined, 1, 0],
    ["verify", 3, 0],
    ["verify", undefined, 1],
  ].map(([lastPhase, cycle, uat]) => ({
    name: `129/01/01 an in-review story with tasks decides gate — lastPhase ${show(lastPhase)}, cycle ${show(cycle)}, uat ${uat}`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("in-review"), tasks: oneTask(uat), lastPhase, cycle, cap: 3 }), GATE);
    },
  })),
  // Scenario Outline: every other status decides as it does today.
  ...[
    ["not-started", undefined, undefined, 0, CONTINUE(1)],
    ["in-progress", undefined, undefined, 0, CONTINUE(1)],
    ["in-progress", undefined, 2, 0, CONTINUE(3)],
    ["in-progress", undefined, 3, 0, capExhausted("continue")],
    ["in-progress", "continue", undefined, 0, GATE],
    ["in-progress", "verify", undefined, 0, { act: "drive", ref: "07/02", phase: "verify", cycle: 1 }],
    ["in-progress", "verify", 3, 0, capExhausted("verify")],
    ["in-progress", "verify", undefined, 1, UAT_GATE],
    ["in-progress", "refine", undefined, 0, CONTINUE(1)],
    ["blocked", undefined, undefined, 0, CONTINUE(1)],
    ["done", undefined, undefined, 0, CONTINUE(1)],
    [null, undefined, undefined, 0, CONTINUE(1)],
    [undefined, undefined, undefined, 0, CONTINUE(1)],
    [undefined, "continue", undefined, 0, GATE],
  ].map(([status, lastPhase, cycle, uat, decision]) => ({
    name: `129/01/01 status ${show(status)} decides as today — lastPhase ${show(lastPhase)}, cycle ${show(cycle)}, uat ${uat} → ${decision.act}${decision.stop ? ` ${decision.stop}` : decision.phase ? ` ${decision.phase}` : ""}`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story(status), tasks: oneTask(uat), lastPhase, cycle, cap: 3 }), decision);
    },
  })),
  // Scenario Outline: an in-review story with a supplied gate still routes on the gate's findings.
  ...[
    [[{ id: "a" }, { id: "b" }], 1, undefined, { act: "drive", ref: "07/02", phase: "continue", cycle: 2, findings: [{ id: "a" }, { id: "b" }] }],
    [[{ id: "a" }, { id: "b" }], 3, undefined, capExhausted("continue")],
    [[{ id: "a" }], undefined, undefined, { code: "loop-bound-unresolved", field: "cycle", value: undefined, resolution: "work.autonomous.maxAttempts" }],
    [[], 1, undefined, { act: "drive", ref: "07/02", phase: "verify", cycle: 1 }],
    [[], 1, 2, { act: "drive", ref: "07/02", phase: "verify", cycle: 3 }],
    [[], 1, 3, capExhausted("verify")],
  ].map(([findings, cycle, verifyCycle, decision]) => ({
    name: `129/01/01 an in-review story with a supplied gate routes on its findings — ${findings.length} finding(s), cycle ${show(cycle)}, verifyCycle ${show(verifyCycle)}`,
    run() {
      assert.deepEqual(
        decideLoopPhase({ next: story("in-review"), tasks: oneTask(0), gate: { findings }, lastPhase: "continue", cycle, verifyCycle, cap: 3 }),
        decision,
      );
    },
  })),
  // Scenario Outline: an in-review story with no tasks still refines.
  ...[
    [{ tasks: [] }, undefined],
    [{ tasks: [] }, "continue"],
    [undefined, undefined],
  ].map(([taskFacts, lastPhase]) => ({
    name: `129/01/01 an in-review story with tasks ${show(taskFacts)} and lastPhase ${show(lastPhase)} still refines`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("in-review"), tasks: taskFacts, lastPhase }), REFINE("07/02"));
    },
  })),
  {
    name: "129/01/01 the shared story fixtures decide byte-identically — every phase-map and stop-set fixture",
    run() {
      let decided = 0;
      for (const family of ["phase-map", "stop-set"]) {
        for (const { name, args, expected } of workLoopStoryFixturesFor(family)) {
          assert.deepEqual(decideLoopAction(...args), expected, `${family}: ${name}`);
          decided += 1;
        }
      }
      assert.ok(decided > 0, "non-vacuity: the fixture families hold rows");
    },
  },
  {
    name: "129/01/01 the engine imports nothing",
    async run() {
      const source = stripComments(await readFile(path.join(root, "src", "work", "loop.mjs"), "utf8"));
      assert.doesNotMatch(source, /^\s*import\b/mu, "no import statement");
      assert.doesNotMatch(source, /\bfrom\s+["'`]/u, "no re-export from a module either");
      assert.doesNotMatch(source, /\brequire\s*\(/u);
      assert.doesNotMatch(source, /\bimport\s*\(/u, "no dynamic import() either");
    },
  },
  // Scenario Outline: the status is read verbatim — a variant spelling is not in-review.
  ...["In-Review", " in-review", "in_review"].map((status) => ({
    name: `129/01/01 the status is read verbatim — ${JSON.stringify(status)} is not in-review and drives continue`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story(status), tasks: oneTask(0), cap: 3 }), CONTINUE(1));
    },
  })),

  // ── task 02 · under refine_first the engine names the three phases from two additive inputs ──
  ...[
    [["07/03", "07/04"], REFINE("07/03")],
    [["07/04", "07/03"], REFINE("07/04")],
    [["07/04"], REFINE("07/04")],
    [[], CONTINUE(1)],
    [undefined, CONTINUE(1)],
  ].map(([unrefined, decision]) => ({
    name: `129/01/02 refine_first with unrefined ${show(unrefined)} decides ${decision.phase} ${decision.ref} ahead of the head`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("not-started"), tasks: oneTask(0), concurrency: "refine_first", unrefined, cap: 3 }), decision);
    },
  })),
  ...["sequential", undefined, null, "parallel"].map((concurrency) => ({
    name: `129/01/02 concurrency ${show(concurrency)} ignores unrefined and drives the head`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("not-started"), tasks: oneTask(0), concurrency, unrefined: ["07/03"], cap: 3 }), CONTINUE(1));
    },
  })),
  ...["refine_first", "sequential", undefined].map((concurrency) => ({
    name: `129/01/02 the milestone with zero stories still refines first under concurrency ${show(concurrency)}`,
    run() {
      assert.deepEqual(
        decideLoopPhase({ next: { state: "ready", ref: "07", type: "milestone" }, stories: { total: 0, done: 0 }, concurrency, unrefined: [], cap: 3 }),
        REFINE("07"),
      );
    },
  })),
  ...["refine_first", "sequential", undefined].map((concurrency) => ({
    name: `129/01/02 a through-review done answer is the phase boundary and stays a done act under concurrency ${show(concurrency)}`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: { state: "done" }, concurrency, unrefined: [], cap: 3 }), { act: "done" });
    },
  })),
  {
    name: "129/01/02 the two inputs ride decideLoop unchanged — same key set, same next, the refine act",
    run() {
      const next = story("not-started");
      const answer = decideLoop({ scope: "07", level: "L2", cap: 3, next, tasks: oneTask(0), concurrency: "refine_first", unrefined: ["07/03"] });
      assert.equal(answer.admitted, true);
      assert.deepEqual(answer.act, REFINE("07/03"));
      assert.deepEqual(Object.keys(answer), ["admitted", "scope", "form", "level", "cap", "next", "act", "stops"]);
      assert.deepEqual(answer.next, next);
    },
  },
  ...[
    ["signal: \"SIGINT\"", { signal: "SIGINT" }, "operator-interrupt"],
    ["session: needs-input", { session: { outcome: "needs-input", sessionId: "s-1" } }, "session-needs-input"],
  ].map(([label, fact, stop]) => ({
    name: `129/01/02 the outcome precedence above the phase decision is untouched by the mode — ${label} halts ${stop}`,
    run() {
      const decision = decideLoopAction({ next: story("not-started"), tasks: oneTask(0), concurrency: "refine_first", unrefined: ["07/03"], cap: 3, ...fact });
      assert.equal(decision.act, "halt");
      assert.equal(decision.stop, stop);
    },
  })),
  {
    name: "129/01/02 an unrefined story is refined even when the head is a gate",
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("in-review"), tasks: oneTask(0), concurrency: "refine_first", unrefined: ["07/05"], cap: 3 }), REFINE("07/05"));
    },
  },
  {
    name: "129/01/02 with nothing left to refine the in-review head still routes to the gate under refine_first",
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("in-review"), tasks: oneTask(0), concurrency: "refine_first", unrefined: [], lastPhase: "verify", cap: 3 }), GATE);
    },
  },
  ...[
    { state: "done" },
    { state: "blocked", ref: "07/04", waitingOn: ["07/01"] },
    { state: "held", ref: "07/04", skipped: [] },
    { state: "ready", ref: "07", type: "milestone" },
    { state: "ready", ref: "09", type: "uat" },
    { state: "ready", ref: "07/04", type: "spike" },
  ].map((next) => ({
    name: `129/01/02 under refine_first a non-empty unrefined precedes the head ${JSON.stringify(next)}`,
    run() {
      assert.deepEqual(decideLoopPhase({ next, concurrency: "refine_first", unrefined: ["07/03"], cap: 3 }), REFINE("07/03"));
    },
  })),
  ...[undefined, null, "07/03", 3].map((unrefined) => ({
    name: `129/01/02 a malformed unrefined of ${show(unrefined)} is treated as empty, never as a refine`,
    run() {
      assert.deepEqual(decideLoopPhase({ next: story("not-started"), tasks: oneTask(0), concurrency: "refine_first", unrefined }), CONTINUE(1));
    },
  })),

  // ── task 03 · decideWave is pure and bound-free ──
  ...[
    [["129/01", "129/02", "129/03"], [], [], [], ["129/01", "129/02", "129/03"], []],
    [["129/03", "129/01"], [], [], [], ["129/03", "129/01"], []],
    [["127/02", "127/04"], ["127/03"], ["127/02"], [], ["127/04"], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], [], ["127/04"], ["127/02"], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], ["127/02"], ["127/04"], [], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], ["127/04"], ["127/04"], ["127/02"], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], ["127/09"], ["127/08"], ["127/02", "127/04"], ["127/03"]],
    [["127/02", "127/04"], [], undefined, undefined, ["127/02", "127/04"], []],
    [["127/02"], undefined, [], [], ["127/02"], []],
    [[], ["127/03"], [], [], [], ["127/03"]],
    [[], [], ["127/02"], [], [], []],
    [["127/04"], ["127/02", "127/03"], ["127/02"], [], ["127/04"], ["127/03"]],
  ].map(([wave, heldSet, live, setAside, dispatch, hold]) => ({
    name: `129/01/03 decideWave — wave ${show(wave)}, held ${show(heldSet)}, live ${show(live)}, setAside ${show(setAside)} → dispatch ${show(dispatch)}, hold ${show(hold)}`,
    run() {
      const answer = decideWave({ wave, heldSet, live, setAside });
      assert.deepEqual([...answer.dispatch], dispatch);
      assert.deepEqual([...answer.hold], hold);
    },
  })),
  // Scenario Outline: members arrive as objects or refs and are answered as refs.
  ...[
    [[{ ref: "127/02", type: "story" }, { ref: "127/04", type: "story" }], [], [], ["127/02", "127/04"], []],
    [[{ ref: "127/02", type: "story" }, "127/04"], [{ ref: "127/03", type: "story" }], [], ["127/02", "127/04"], ["127/03"]],
    [[{ ref: "127/02", type: "story" }, { ref: "127/04", type: "story" }], [], ["127/02"], ["127/04"], []],
  ].map(([wave, heldSet, live, dispatch, hold]) => ({
    name: `129/01/03 decideWave answers refs for members ${show(wave)} held ${show(heldSet)} live ${show(live)}`,
    run() {
      const answer = decideWave({ wave, heldSet, live });
      assert.deepEqual([...answer.dispatch], dispatch);
      assert.deepEqual([...answer.hold], hold);
    },
  })),
  {
    name: "129/01/03 the answer carries no bound, reads no configuration and mutates nothing",
    run() {
      const wave = ["127/02", "127/04"];
      const heldSet = ["127/03"];
      const live = ["127/02"];
      const setAside = [];
      const before = JSON.stringify({ wave, heldSet, live, setAside });
      const first = decideWave({ wave, heldSet, live, setAside });
      const second = decideWave({ wave, heldSet, live, setAside });
      assert.deepEqual(Object.keys(first), ["dispatch", "hold"]);
      assert.deepEqual(Object.keys(second), ["dispatch", "hold"]);
      assert.deepEqual(first, second);
      assert.equal(JSON.stringify({ wave, heldSet, live, setAside }), before, "the four input arrays are what they were");
      assert.ok(Object.isFrozen(first), "the answer is immutable");
      // No bound reaches the answer by any name, and none is an input: the signature has no
      // slot for one, so a caller cannot hand a number in and have it silently honoured.
      const withBound = decideWave({ wave, heldSet, live, setAside, bound: 1, concurrency: 1 });
      assert.deepEqual(withBound, first, "a bound handed in changes nothing — admission is dispatch's");
    },
  },
  // Scenario Outline: a malformed wave or heldSet is null, never an empty dispatch.
  ...[
    [undefined, ["127/03"]],
    [null, ["127/03"]],
    ["127/02", ["127/03"]],
    [2, ["127/03"]],
    [{ ref: "127/02" }, ["127/03"]],
    [["127/02"], "127/03"],
    [["127/02"], null],
    [["127/02"], { ref: "127/03" }],
  ].map(([wave, heldSet]) => ({
    name: `129/01/03 decideWave with wave ${show(wave)} and heldSet ${show(heldSet)} is null, never an empty dispatch`,
    run() {
      assert.equal(decideWave({ wave, heldSet }), null);
    },
  })),
  // Review close, 129/01 (craft pass, Important): the shell's memories arrive as a `Set` —
  // `src/commands/loop.mjs` keeps `setAside = new Set()` — and reading a `Set` as an empty array
  // re-dispatched every live lane and re-offered every set-aside unit. Outside the contract's
  // rows (which pass arrays or nothing), so pinned here: a `Set` is read, and a memory that is
  // present but neither an array nor a `Set` is `null`, for the same reason a malformed `wave`
  // is — a FULL dispatch inferred from an unrecognised shape spawns lanes.
  ...[
    [["127/02", "127/04"], ["127/03"], new Set(["127/02"]), new Set(["127/04"]), [], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], new Set(["127/02"]), [], ["127/04"], ["127/03"]],
    [["127/02", "127/04"], ["127/03"], [], new Set(["127/04"]), ["127/02"], ["127/03"]],
    [["127/02", "127/04"], ["127/02", "127/03"], new Set([{ ref: "127/02", type: "story" }]), undefined, ["127/04"], ["127/03"]],
  ].map(([wave, heldSet, live, setAside, dispatch, hold]) => ({
    name: `129/01/03 decideWave reads a Set memory — live ${show([...(live ?? [])])}, setAside ${show([...(setAside ?? [])])} → dispatch ${show(dispatch)}, hold ${show(hold)}`,
    run() {
      const answer = decideWave({ wave, heldSet, live, setAside });
      assert.deepEqual([...answer.dispatch], dispatch);
      assert.deepEqual([...answer.hold], hold);
    },
  })),
  ...[
    ["127/02", []],
    [null, []],
    [2, []],
    [{ ref: "127/02" }, []],
    [[], "127/04"],
    [[], null],
    [[], { ref: "127/04" }],
    [[], new Map([["127/04", true]])],
  ].map(([live, setAside]) => ({
    name: `129/01/03 decideWave with live ${show(live)} and setAside ${show(setAside)} is null, never a full dispatch`,
    run() {
      assert.equal(decideWave({ wave: ["127/02", "127/04"], heldSet: ["127/03"], live, setAside }), null);
    },
  })),
];

export const workLoopPhaseMapTests = [
  {
    name: "loop phase map — the shared story fixtures stay executable",
    run() {
      for (const { name, args, expected } of workLoopStoryFixturesFor("phase-map")) {
        assert.deepEqual(decideLoopAction(...args), expected, name);
      }
    },
  },
  {
    name: "loop phase map — next terminal and dependency states map without invention",
    run() {
      assert.deepEqual(decideLoopAction({ next: { state: "done" }, cap: 3 }), { act: "done" });
      assert.deepEqual(decideLoopAction({ next: { state: "blocked", ref: "54", waitingOn: ["53"] }, cap: 3 }), {
        act: "halt", stop: "dependency-blocked", producer: "work:next:state=blocked", ref: "54", waitingOn: ["53"],
      });
      const skipped = [{ ref: "53/02", holderNode: "aof-wsl" }];
      assert.deepEqual(decideLoopAction({ next: { state: "held", skipped }, cap: 3 }), {
        act: "halt", stop: "dependency-blocked", producer: "work:next:state=held", skipped,
      });
    },
  },
  {
    name: "loop phase map — milestones and stories dispatch from the registered-command predicates",
    run() {
      assert.equal(decideLoopAction({ next: ready("milestone", "53"), stories: { total: 0, done: 0 }, cap: 3 }).phase, "refine");
      assert.equal(decideLoopAction({ next: ready("milestone", "53"), stories: { total: 6, done: 6 }, cap: 3 }).phase, "verify");
      assert.equal(decideLoopAction({ next: ready("milestone", "53"), stories: { total: 3, done: 1 }, cap: 3 }).phase, "verify");
      assert.deepEqual(decideLoopAction({ next: ready("story"), tasks: tasks(0), cap: 3 }), {
        act: "drive", ref: "53/01", phase: "refine", cycle: 1,
      });
      assert.deepEqual(decideLoopAction({ next: ready("story"), tasks: tasks(2), cap: 3 }), {
        act: "drive", ref: "53/01", phase: "continue", cycle: 1,
      });
      assert.deepEqual(decideLoopAction({ next: ready("story"), tasks: tasks(2), lastPhase: "continue", cap: 3 }), {
        act: "gate", ref: "53/01", command: "work:validate",
      });
    },
  },
  {
    name: "loop phase map — uat and unmapped types halt with coded producers",
    run() {
      assert.deepEqual(decideLoopAction({ next: ready("uat", "47"), cap: 3 }), {
        act: "halt", stop: "uat-gate", producer: "work:next:type=uat", ref: "47", alternative: "aof work drive verify 47",
      });
      for (const type of ["spike", "chore", "task", "epic", undefined]) {
        const result = decideLoopAction({ next: ready(type, "51"), cap: 3 });
        assert.equal(result.act, "halt");
        assert.equal(result.stop, "unmapped-item-type");
        assert.equal(result.type, type);
        assert.equal("phase" in result, false);
      }
      assert.equal(decideLoopAction({ next: ready("story", "53/04"), tasks: tasks(1, 1), cap: 3 }).phase, "continue");
      assert.deepEqual(decideLoopAction({ next: ready("story", "53/04"), tasks: tasks(1, 1), lastPhase: "verify", cycle: 1, cap: 3 }), {
        act: "halt", stop: "uat-gate", producer: "work:tasks:counts.uat", ref: "53/04", uat: 1,
      });
    },
  },
  {
    name: "loop phase map — for a story that is not in-review, only task count and uat counts affect task-derived dispatch (129/01 routes in-review on status)",
    run() {
      const next = ready("story");
      const a = decideLoopAction({ next, tasks: tasks(1, 0, { fromWorker: true }), cap: 3 });
      const b = decideLoopAction({ next: { ...next, status: "blocked" }, tasks: { tasks: [{ counts: { uat: 0, executable: 100 }, feature: "different" }] }, cap: 3 });
      assert.deepEqual(a, b);
      assert.equal(a.phase, "continue");
    },
  },
  // 129/01 — status routing, refine_first phases and decideWave ride this registered suite
  // (test/loop/ is at its budget ceiling, so no new suite file).
  ...loopConcurrencyTests,
];
