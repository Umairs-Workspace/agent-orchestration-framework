// milestone 63 / story 01 — THE LEVEL IS A CEILING, NOT AN ADMISSION.
//
// Every @executable scenario and every Scenario-Outline row of the story's four task features,
// driven against the real leaf (`resolveTriggerLevel`), the real gate (`resolveLoopLevelGate`,
// which is the SAME function `src/commands/loop.mjs` gates with at fire time) and the real
// compiler (`compileTriggerDeclaration`). Nothing here re-implements a rule it asserts — the
// threshold, the ladder and the default are all imported from `src/work/loop.mjs`, so a test that
// passed by agreeing with a copy of the gate is not available.
//
//   00_the-level-is-resolved-at-every-fire-never-cached  — one trigger, two fires, two readings,
//        in both directions and with the refusal's PAYLOAD required to move; the compile answering
//        nothing about admission; the pre-flight as a prediction the loop re-gates.
//   01_a-refused-level-is-refused-by-name-never-downgraded — thirteen ways the gate fails and what
//        each refusal must NAME; the resolved set carrying no entry at any level; no source
//        trusted with the rung.
//   02_an-absent-level-and-a-refused-level-are-different-answers — four outcomes and never three,
//        in the machine form AND the rendered one; the near-miss pair (absent vs empty string);
//        unknown refused BEFORE any workspace fact.
//   03_the-gate-facts-are-handed-in-and-the-leaf-holds-no-threshold — the pre-flight and the loop's
//        own gate compared across the SPAN of the gate; facts handed in beating facts on disk; and
//        "you did not give me the readings" kept apart from "your workspace does not qualify".
//
// THE FACTS ARE PLANTED AS THE READINGS A DOCTOR AND A GROUNDEDNESS REPORT ACTUALLY RETURN — the
// fields `l3ScoreFailure` and `l3GroundednessFailure` read — so a row reads like the sentence it
// mechanises and no builder can quietly become the thing under test.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  TRIGGER_GATE_FACTS,
  TRIGGER_LEVEL_FACTS_NOT_SUPPLIED,
  renderTriggerLevelResolution,
  resolveTriggerLevel,
  resolveTriggerLevels,
} from "../../src/work-trigger/level.mjs";
import { compileTriggerDeclaration } from "../../src/work-trigger/declaration.mjs";
import {
  L3_SCORE_THRESHOLD,
  LOOP_LEVELS,
  resolveLoopLevel,
  resolveLoopLevelGate,
} from "../../src/work/loop.mjs";

// ─── the ladder, read from the ladder ──────────────────────────────────────────────────
const GATED_RUNG = "L3";
const DEFAULT_RUNG = resolveLoopLevel(undefined).level;

// ─── gate-fact builders ────────────────────────────────────────────────────────────────
// The Loop-Ready reading. `l3ScoreFailure` admits exactly one shape — the score AT the threshold
// AND `clears` naming the gated rung — so "at the threshold but clears a lower rung" is a real,
// distinguishable reading and is the row a copied threshold dies on.
const scoreClears = (clears) => ({
  score: L3_SCORE_THRESHOLD,
  clears,
  checks: [
    { id: "loops-declared", state: "pass" },
    { id: "anchors-declared", state: clears === GATED_RUNG ? "pass" : "fail" },
  ],
  blocking: clears === GATED_RUNG ? [] : ["anchors-declared"],
});

const scoreOneShort = () => ({
  score: L3_SCORE_THRESHOLD - 1,
  clears: "L2",
  checks: [
    { id: "loops-declared", state: "pass" },
    { id: "anchors-declared", state: "fail" },
  ],
  blocking: ["anchors-declared", "memory-declared"],
});

// A reading the doctor RETURNED but could not compute — the registry answered with something no
// gate half can be read from. It is SUPPLIED (so it is not the "you did not hand it in" refusal)
// and it fails (so it is not an admission on no evidence).
const scoreNeverRead = () => ({
  score: null,
  clears: "none",
  checks: [
    { id: "loops-declared", state: "not-applicable" },
    { id: "anchors-declared", state: "not-applicable" },
  ],
  blocking: [],
});

const reportClean = () => ({
  state: "reported",
  present: true,
  components: [{ verdict: "grounded", members: ["loop:build"], groundClasses: ["measurement"] }],
  authorities: [{ anchor: "wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md", pointer: "#ADR-006", resolved: true }],
});

const reportNotReached = () => ({
  state: "unavailable",
  present: false,
  components: [],
  authorities: [],
  error: "work:loops-groundedness was not reachable",
});

const reportNotPresent = () => ({ state: "reported", present: false, components: [], authorities: [] });

const reportWith = (...components) => ({
  state: "reported",
  present: true,
  components: [{ verdict: "grounded", members: ["loop:verify"], groundClasses: ["measurement"] }, ...components],
  authorities: [
    { anchor: "wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md", pointer: "#ADR-007", resolved: true },
    ...components.some((row) => row.verdict === "stale")
      ? [{ anchor: "wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md", pointer: "#ADR-004", resolved: false }]
      : [],
  ],
});

const selfReferential = () => ({ verdict: "self-referential", members: ["loop:build", "loop:review"], groundClasses: [] });
const stale = () => ({
  verdict: "stale",
  members: ["loop:build"],
  groundClasses: ["measurement"],
  staleAuthorities: [{ anchor: "wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md", pointer: "#ADR-004" }],
});
const exogenousOnly = () => ({ verdict: "exogenous-only", members: ["loop:tune"], groundClasses: ["external-doc"] });

const facts = (loopReady, groundedness) => ({ loopReady, groundedness });
const bothPass = () => facts(scoreClears(GATED_RUNG), reportClean());
const scoreFails = () => facts(scoreOneShort(), reportClean());
const reportFails = () => facts(scoreClears(GATED_RUNG), reportWith(stale()));
const bothFail = () => facts(scoreOneShort(), reportWith(stale()));

// ─── trigger builders ──────────────────────────────────────────────────────────────────
const trigger = (level, id = "t-0") => (level === undefined ? { id } : { id, level });

const member = (overrides = {}) => ({
  id: "t-0",
  protects: "the driver from stalling unattended",
  source: "cron",
  scope: "63",
  level: GATED_RUNG,
  ...overrides,
});

const declaration = (members) => ({ version: 1, members });

// ─── probes ────────────────────────────────────────────────────────────────────────────
// Facts that cannot be consulted without saying so. A row claiming "with no gate consulted" or
// "before any gate" is driven through this, which is the only way to assert an ORDER rather than
// an outcome that happens to coincide with one.
const untouchableFacts = () => new Proxy({}, {
  get(_target, key) { throw new Error(`the gate facts were consulted (${String(key)})`); },
  has(_target, key) { throw new Error(`the gate facts were probed (${String(key)})`); },
});

// A trigger that records which of its own keys the resolver read, so "consults neither" is proven
// positively rather than inferred from an outcome.
function recordingTrigger(source) {
  const read = [];
  const proxy = new Proxy(source, {
    get(target, key) { read.push(String(key)); return Reflect.get(target, key); },
  });
  return { proxy, read };
}

const keysOf = (value) => Object.keys(value).sort();
const only = (left, right) => keysOf(left).filter((key) => !(key in right));

// The substantive verdict, so "the same answer" is compared as an ANSWER rather than as an object
// literal. Identity keys and pre-flight metadata are excluded here and asserted EXHAUSTIVELY
// elsewhere, so nothing can hide in the gap between the two assertions.
function verdictOf(answer) {
  if (answer.code === undefined) return { verdict: "admitted", level: answer.level };
  return {
    verdict: "refused",
    code: answer.code,
    level: answer.level ?? answer.requestedLevel,
    reason: answer.reason,
    failingHalves: answer.failingHalves,
    score: answer.score,
    groundedness: answer.groundedness,
  };
}

// Every string and every key in a value, for the "nothing carries an argv / a launch / a clock"
// sweeps that have to be exhaustive rather than spot-checked.
function walk(value, visit, trail = []) {
  visit(value, trail);
  if (Array.isArray(value)) value.forEach((row, index) => walk(row, visit, [...trail, index]));
  else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) walk(value[key], visit, [...trail, key]);
  }
}

async function scratch(body, prefix = "aof-63-01-") {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function inDirectory(dir, body) {
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await body();
  } finally {
    process.chdir(previous);
  }
}

// ─── expectation vocabulary ────────────────────────────────────────────────────────────
// The four answers the story keeps apart, asserted by NAME so a row reads as its own sentence.
function expectAdmitted(answer, level, where) {
  assert.equal(answer.resolved, true, `${where}: it resolves`);
  assert.equal(answer.level, level, `${where}: at ${level}`);
  assert.equal(answer.code, undefined, `${where}: an admission carries no refusal code`);
}

function expectGateRefusal(answer, halves, where) {
  assert.equal(answer.resolved, undefined, `${where}: a refusal is not a resolution`);
  assert.equal(answer.code, "loop-level-gate", `${where}: the gate's own code`);
  assert.deepEqual(answer.failingHalves, halves, `${where}: the failing half is named`);
  assert.equal("level" in answer, false, `${where}: a refusal answers to no level`);
  assert.equal(answer.requestedLevel, GATED_RUNG, `${where}: it names the rung that was requested`);
}

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 00 — a level is resolved at the fire it belongs to, and no answer outlives the facts
// ════════════════════════════════════════════════════════════════════════════════════════

const READING = {
  "both halves pass": bothPass,
  "the score fell one short": scoreFails,
  "the score is one short": scoreFails,
  "a component went stale": reportFails,
  "a component is stale": reportFails,
  "only a component is stale": reportFails,
};

const ANSWER = {
  "admitted at L3": (answer, where) => expectAdmitted(answer, GATED_RUNG, where),
  "refused, naming the score": (answer, where) => {
    expectGateRefusal(answer, ["score"], where);
    assert.equal(answer.score.score, L3_SCORE_THRESHOLD - 1, `${where}: the score itself`);
    assert.equal(answer.groundedness, null, `${where}: the half that passed is not blamed`);
  },
  "refused on groundedness": (answer, where) => {
    expectGateRefusal(answer, ["groundedness"], where);
    assert.equal(answer.groundedness.components[0].verdict, "stale", `${where}: the component that failed`);
    assert.equal(answer.score, null, `${where}: the half that passed is not blamed`);
  },
};

const RESOLVED_AT_EVERY_FIRE = [
  {
    name: "63/01/00 one trigger, two fires, two readings of the same workspace — the answer tracks the facts in BOTH directions, and so does the refusal's payload",
    run: () => {
      const rows = [
        ["both halves pass", "the score fell one short", "admitted at L3", "refused, naming the score"],
        ["the score is one short", "both halves pass", "refused, naming the score", "admitted at L3"],
        ["both halves pass", "a component went stale", "admitted at L3", "refused on groundedness"],
        ["a component is stale", "both halves pass", "refused on groundedness", "admitted at L3"],
        ["the score is one short", "only a component is stale", "refused, naming the score", "refused on groundedness"],
        ["both halves pass", "both halves pass", "admitted at L3", "admitted at L3"],
      ];
      for (const [firstReading, secondReading, firstAnswer, secondAnswer] of rows) {
        const where = `${firstReading} -> ${secondReading}`;
        // ONE trigger, resolved twice. Two triggers resolved once each would pass over a compiled
        // admission, which is the implementation this row exists to catch.
        const subject = trigger(GATED_RUNG);
        const first = resolveTriggerLevel(subject, READING[firstReading]());
        const firstAsGiven = structuredClone(first);
        const second = resolveTriggerLevel(subject, READING[secondReading]());

        ANSWER[firstAnswer](first, `${where} / first`);
        ANSWER[secondAnswer](second, `${where} / second`);
        assert.deepStrictEqual(first, firstAsGiven, `${where}: the first answer is not disturbed by the second`);
      }
    },
  },

  {
    name: "63/01/00 the third reading — a refusal that has to CHANGE which half it names, and its payload changes with it",
    run: () => {
      const subject = trigger(GATED_RUNG);
      const first = resolveTriggerLevel(subject, scoreFails());
      const second = resolveTriggerLevel(subject, reportFails());
      assert.deepEqual(first.failingHalves, ["score"]);
      assert.deepEqual(second.failingHalves, ["groundedness"]);
      // The payload, not merely the verdict: an implementation that recomputes the answer but
      // keeps the payload it printed last time is green on the verdict and red here.
      assert.notDeepEqual(first.score, second.score, "the score payload moved");
      assert.notDeepEqual(first.groundedness, second.groundedness, "the groundedness payload moved");
      assert.equal(first.groundedness, null);
      assert.equal(second.score, null);
    },
  },

  {
    name: "63/01/00 compiling the declaration answers nothing about admission",
    run: () => scratch(async (root) => {
      const source = declaration([member({ id: "t-0" }), member({ id: "t-1", scope: "60-63" })]);

      // Two real workspaces, each carrying its own readings on disk: one that passes the gate and
      // one that does not. The declaration is compiled while standing in each.
      const workspaces = {};
      for (const [name, reading] of [["passes", bothPass()], ["does-not", bothFail()]]) {
        workspaces[name] = path.join(root, name);
        await mkdir(path.join(workspaces[name], ".aof"), { recursive: true });
        await writeFile(path.join(workspaces[name], ".aof", "loop-readings.json"), `${JSON.stringify(reading, null, 2)}\n`, "utf8");
      }

      const passing = await inDirectory(workspaces.passes, () => compileTriggerDeclaration(source));
      assert.equal(resolveTriggerLevel(passing.triggers[0], bothPass()).resolved, true, "this workspace passes the gate");
      const failing = await inDirectory(workspaces["does-not"], () => compileTriggerDeclaration(source));
      assert.equal(resolveTriggerLevel(failing.triggers[0], bothFail()).code, "loop-level-gate", "this one does not");

      assert.deepStrictEqual(passing, failing, "the two compiled sets are the same");

      const admissionVocabulary = [
        "admitted", "admission", "refusal", "refused", "resolved", "resolvedLevel", "resolvedFor",
        "preflight", "requestedLevel", "code", "failingHalves", "gate", "loopReady", "groundedness",
      ];
      for (const compiled of passing.triggers) {
        for (const word of admissionVocabulary) {
          assert.equal(word in compiled, false, `a compiled trigger carries no ${word}`);
        }
        // The DECLARED request survives, because that is what a reviewer reads in the diff; what
        // does not survive is any answer about it.
        assert.equal(compiled.level, GATED_RUNG, "the compiled trigger carries the level it DECLARED");
        assert.deepEqual(keysOf(compiled), ["id", "level", "protects", "scope", "source"]);
      }
    }),
  },

  {
    name: "63/01/00 resolving does not write back to what was resolved, and a second resolution consults neither",
    run: () => {
      const source = declaration([member()]);
      const sourceAsGiven = structuredClone(source);
      const compiled = compileTriggerDeclaration(source);
      const compiledAsGiven = structuredClone(compiled);

      const refused = resolveTriggerLevel(compiled.triggers[0], bothFail());
      assert.equal(refused.code, "loop-level-gate");

      assert.deepStrictEqual(source, sourceAsGiven, "the declaration is unchanged");
      assert.deepStrictEqual(compiled, compiledAsGiven, "the compiled trigger is unchanged");
      for (const carrier of [source, compiled]) {
        walk(carrier, (value, trail) => {
          if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            for (const word of ["code", "admitted", "refusal", "failingHalves", "verdict"]) {
              assert.equal(word in value, false, `neither carries the verdict (${[...trail, word].join(".")})`);
            }
          }
        });
      }

      // Positively: the resolver reads the DECLARATION off the trigger and nothing else, so there
      // is no verdict key it could be consulting.
      const { proxy, read } = recordingTrigger(compiled.triggers[0]);
      resolveTriggerLevel(proxy, bothFail());
      assert.deepEqual([...new Set(read)].sort(), ["id", "level"], "only the declared id and level are read");

      // …and the second resolution over passing facts admits, which a consulted cached refusal
      // could not have produced.
      expectAdmitted(resolveTriggerLevel(compiled.triggers[0], bothPass()), GATED_RUNG, "the second resolution");
    },
  },

  {
    name: "63/01/00 an answer already given is not disturbed by the next one",
    run: () => {
      const subject = trigger(GATED_RUNG);
      const first = resolveTriggerLevel(subject, bothPass());
      const asGiven = structuredClone(first);
      const second = resolveTriggerLevel(subject, bothFail());

      assert.equal(second.code, "loop-level-gate", "the second answer is a refusal");
      assert.deepStrictEqual(first, asGiven, "the first answer still reads as it did");
      expectAdmitted(first, GATED_RUNG, "the first answer");
      assert.ok(Object.isFrozen(first), "an answer already given cannot be edited at all");
    },
  },

  {
    name: "63/01/00 the pre-flight is a prediction, and the loop gates the level again at fire time",
    run: () => {
      const resolution = resolveTriggerLevel(trigger(GATED_RUNG), bothPass());
      expectAdmitted(resolution, GATED_RUNG, "the pre-flight");

      // The facts move before the launch, and the loop is entered. `resolveLoopLevelGate` IS the
      // fire-time gate — `src/commands/loop.mjs` calls exactly this, which
      // `acd-trigger-level-is-a-ceiling` pins as a source fact.
      const moved = bothFail();
      const atFire = resolveLoopLevelGate(GATED_RUNG, moved);
      assert.equal(atFire.admitted, undefined, "the loop's own gate refuses the run");
      assert.equal(atFire.code, "loop-level-gate");

      // The earlier resolution admits nothing: it carries neither gate fact, so there is nothing
      // on it the fire-time gate could read as a grant…
      for (const fact of TRIGGER_GATE_FACTS) {
        assert.equal(fact in resolution, false, `the resolution carries no ${fact}`);
      }
      // …and handing the whole resolution to the gate alongside the moved facts changes nothing.
      assert.deepStrictEqual(
        resolveLoopLevelGate(GATED_RUNG, { ...moved, ...resolution }),
        atFire,
        "no part of the resolution is carried into the loop as a grant",
      );
      // …and offered as a third argument it is not read either: the gate takes a level and the
      // facts, and there is no seat a grant could be handed to.
      assert.deepStrictEqual(
        resolveLoopLevelGate(GATED_RUNG, moved, resolution),
        atFire,
        "a grant offered beside the facts is not read",
      );
    },
  },

  {
    name: "63/01/00 a refused resolution never reaches the fire-time gate at all",
    run: () => {
      const source = declaration([member({ id: "refused-one" }), member({ id: "attended-one", level: "L1" })]);
      const compiled = compileTriggerDeclaration(source);
      const resolution = resolveTriggerLevels(compiled.triggers, bothFail());

      assert.deepEqual(resolution.resolved.map((row) => row.triggerId), ["attended-one"]);
      assert.deepEqual(resolution.refused.map((row) => row.triggerId), ["refused-one"]);

      // No work:loop input and no argv is emitted for it — asserted as an exhaustive sweep of the
      // whole answer rather than a spot check, because a launch that hid one level down would
      // satisfy a spot check.
      const refused = resolution.refused[0];
      walk(refused, (value, trail) => {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          for (const word of ["argv", "args", "input", "launch", "bin", "program", "cli", "command"]) {
            assert.equal(word in value, false, `a refusal emits no ${word} (${[...trail, word].join(".")})`);
          }
        }
      });
      // …and the refused side carries no scope either, so nothing downstream could assemble one.
      assert.equal("scope" in refused, false, "a refusal carries no scope to launch over");
      // The fire-time gate is only ever reached through a launch, and the resolved side is the
      // only side a launch is built from.
      assert.equal(resolution.resolved.some((row) => row.triggerId === "refused-one"), false);
    },
  },

  {
    name: "63/01/00 the answer says which moment it belongs to",
    run: () => {
      const resolution = resolveTriggerLevel(trigger(GATED_RUNG), bothPass());
      assert.equal(resolution.resolvedFor, "this-fire", "it says the level was resolved for THIS fire");
      assert.equal(resolution.preflight, true, "it says it is a pre-flight");
      assert.equal(resolution.gatedAgainAt, "work:loop", "it says the loop will gate that level again");
      assert.match(
        renderTriggerLevelResolution(resolution),
        /gates it again at launch/,
        "and the rendered form says so too",
      );
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 01 — refused by name, never downgraded
// ════════════════════════════════════════════════════════════════════════════════════════

const SCORE_READING = {
  "at the threshold, clears L3": () => scoreClears(GATED_RUNG),
  "at the threshold, clears L2": () => scoreClears("L2"),
  "at the threshold, clears L1": () => scoreClears("L1"),
  "one short of the threshold": scoreOneShort,
  "never read at all": scoreNeverRead,
};

const REPORT_READING = {
  "reported, present, nothing failing": reportClean,
  "never reached the reported state": reportNotReached,
  "reported but not present": reportNotPresent,
  "one self-referential component": () => reportWith(selfReferential()),
  "one stale component": () => reportWith(stale()),
  "one exogenous-only component": () => reportWith(exogenousOnly()),
  "three failing components": () => reportWith(selfReferential(), stale(), exogenousOnly()),
};

const PARTICULARS = {
  "the level it admitted": (answer) => {
    assert.equal(answer.level, GATED_RUNG);
  },
  "the score, the threshold and the checks": (answer) => {
    assert.equal(answer.score.score, L3_SCORE_THRESHOLD - 1);
    assert.equal(answer.score.threshold, L3_SCORE_THRESHOLD);
    assert.deepEqual(answer.score.blocking, ["anchors-declared", "memory-declared"]);
  },
  "the level the score actually clears": (answer, row) => {
    assert.equal(answer.score.score, L3_SCORE_THRESHOLD, "the number alone would have passed");
    assert.equal(answer.score.clears, row.clears);
  },
  "that no score was read": (answer) => {
    assert.equal(answer.score.score, null);
    assert.equal(answer.score.clears, "none");
  },
  "the state the report came back in": (answer, row) => {
    assert.equal(answer.groundedness.state, row.state);
    assert.deepEqual(answer.groundedness.components, []);
  },
  "that component and its members": (answer) => {
    assert.equal(answer.groundedness.components.length, 1);
    assert.equal(answer.groundedness.components[0].verdict, "self-referential");
    assert.deepEqual(answer.groundedness.components[0].members, ["loop:build", "loop:review"]);
  },
  "that component and the authority that decayed": (answer) => {
    assert.equal(answer.groundedness.components[0].verdict, "stale");
    assert.deepEqual(answer.groundedness.components[0].staleAuthorities, stale().staleAuthorities);
    assert.deepEqual(
      answer.groundedness.staleAuthorities,
      [{ anchor: "wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md", pointer: "#ADR-004" }],
    );
  },
  "that component and its ground classes": (answer) => {
    assert.equal(answer.groundedness.components[0].verdict, "exogenous-only");
    assert.deepEqual(answer.groundedness.components[0].groundClasses, ["external-doc"]);
  },
  "all three, not the first": (answer) => {
    assert.deepEqual(
      answer.groundedness.components.map((component) => component.verdict),
      ["self-referential", "stale", "exogenous-only"],
    );
  },
  "the particulars of both halves": (answer) => {
    assert.ok(answer.score !== null, "the score half is named");
    assert.ok(answer.groundedness !== null, "the groundedness half is named");
    assert.equal(answer.score.threshold, L3_SCORE_THRESHOLD);
    assert.ok(answer.groundedness.state !== undefined);
  },
};

const OUTCOME = {
  "admits L3": (answer, where) => expectAdmitted(answer, GATED_RUNG, where),
  "refuses on the score": (answer, where) => expectGateRefusal(answer, ["score"], where),
  "refuses on groundedness": (answer, where) => expectGateRefusal(answer, ["groundedness"], where),
  "refuses on both halves": (answer, where) => expectGateRefusal(answer, ["score", "groundedness"], where),
};

const REFUSED_BY_NAME = [
  {
    name: "63/01/01 which half failed, and what the refusal has to name for it — one half at a time, then both, and the two readings that are MISSING rather than failing",
    run: () => {
      const rows = [
        ["at the threshold, clears L3", "reported, present, nothing failing", "admits L3", "the level it admitted"],
        ["one short of the threshold", "reported, present, nothing failing", "refuses on the score", "the score, the threshold and the checks"],
        ["at the threshold, clears L2", "reported, present, nothing failing", "refuses on the score", "the level the score actually clears"],
        ["at the threshold, clears L1", "reported, present, nothing failing", "refuses on the score", "the level the score actually clears"],
        ["never read at all", "reported, present, nothing failing", "refuses on the score", "that no score was read"],
        ["at the threshold, clears L3", "never reached the reported state", "refuses on groundedness", "the state the report came back in"],
        ["at the threshold, clears L3", "reported but not present", "refuses on groundedness", "the state the report came back in"],
        ["at the threshold, clears L3", "one self-referential component", "refuses on groundedness", "that component and its members"],
        ["at the threshold, clears L3", "one stale component", "refuses on groundedness", "that component and the authority that decayed"],
        ["at the threshold, clears L3", "one exogenous-only component", "refuses on groundedness", "that component and its ground classes"],
        ["at the threshold, clears L3", "three failing components", "refuses on groundedness", "all three, not the first"],
        ["one short of the threshold", "one stale component", "refuses on both halves", "the particulars of both halves"],
        ["never read at all", "never reached the reported state", "refuses on both halves", "the particulars of both halves"],
      ];
      for (const [score, report, outcome, particulars] of rows) {
        const where = `${score} / ${report}`;
        const loopReady = SCORE_READING[score]();
        const groundedness = REPORT_READING[report]();
        const answer = resolveTriggerLevel(trigger(GATED_RUNG), facts(loopReady, groundedness));
        OUTCOME[outcome](answer, where);
        PARTICULARS[particulars](answer, { ...loopReady, ...groundedness });
      }
    },
  },

  {
    name: "63/01/01 a refused trigger is resolved at NO level at all",
    run: () => {
      const compiled = compileTriggerDeclaration(declaration([member({ id: "asks-for-the-rung" })]));
      const resolution = resolveTriggerLevels(compiled.triggers, bothFail());

      assert.equal(resolution.refused.length, 1, "the answer for that trigger is a refusal");
      assert.equal(resolution.refused[0].code, "loop-level-gate");
      assert.deepEqual(resolution.resolved, [], "the resolved set carries no entry for it at L3");
      // …at L2, at L1, or at any other level. Asserted over the WHOLE ladder rather than over the
      // one rung below, because a downgrade two rungs down is the same defect.
      for (const level of LOOP_LEVELS) {
        assert.equal(
          resolution.resolved.some((row) => row.level === level),
          false,
          `no entry at ${level}`,
        );
      }
      walk(resolution, (value) => {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          for (const word of ["argv", "input", "launch", "program"]) {
            assert.equal(word in value, false, `no ${word} is emitted for it`);
          }
        }
      });
    },
  },

  {
    name: "63/01/01 the refusal names the level that was asked for and offers no other",
    run: () => {
      const refusal = resolveTriggerLevel(trigger(GATED_RUNG), bothFail());
      assert.equal(refusal.requestedLevel, GATED_RUNG, "it names L3 as the level that was requested");
      // It names no level the run may use instead. `score.clears` names the rung the SCORE clears
      // — a fact about the reading, and required by the row above — never an offer.
      for (const word of ["level", "fallback", "fallbackLevel", "downgradeTo", "useLevel", "insteadLevel", "resolvedLevel", "runAt", "effectiveLevel"]) {
        assert.equal(word in refusal, false, `it offers no ${word}`);
      }
      assert.equal(refusal.resolved, undefined, "it does not report the trigger as resolved");
      assert.equal(/will run/.test(renderTriggerLevelResolution(refusal)), false, "and says so to a human too");
    },
  },

  {
    name: "63/01/01 asking for less is an EDIT to the declaration, which is a diff a reviewer sees",
    run: () => {
      const failing = bothFail();
      const asked = compileTriggerDeclaration(declaration([member({ id: "t-0" })]));
      assert.equal(resolveTriggerLevel(asked.triggers[0], failing).code, "loop-level-gate");

      // The declaration is changed — the only way the level moves.
      const edited = compileTriggerDeclaration(declaration([member({ id: "t-0", level: "L2" })]));
      const answer = resolveTriggerLevel(edited.triggers[0], failing);
      expectAdmitted(answer, "L2", "the edited declaration");
      assert.equal(
        answer.level,
        edited.triggers[0].level,
        "the level it now runs at is STATED IN THE DECLARATION rather than chosen at resolution",
      );
      assert.notEqual(edited.triggers[0].level, asked.triggers[0].level, "…and the change is a diff");
    },
  },

  {
    name: "63/01/01 the refusal is machine-readable and is not a crash",
    run: () => {
      let refusal = "NOTHING-WAS-RETURNED";
      assert.doesNotThrow(() => { refusal = resolveTriggerLevel(trigger(GATED_RUNG), bothFail()); },
        "no exception escapes to the caller");
      assert.notEqual(refusal, "NOTHING-WAS-RETURNED", "the resolution completes and reports the refusal");
      assert.equal(typeof refusal.code, "string", "the refusal carries a code");
      assert.ok(Array.isArray(refusal.failingHalves), "the failing halves are a structured value");
      assert.deepEqual(refusal.failingHalves, ["score", "groundedness"]);
      assert.equal(typeof refusal.score, "object", "…and so are their particulars");
      assert.equal(typeof refusal.groundedness, "object");
      assert.deepStrictEqual(refusal, JSON.parse(JSON.stringify(refusal)), "the whole refusal survives a JSON round trip");
    },
  },

  {
    name: "63/01/01 no source is trusted with the rung and no scope is exempt from the gate",
    run: () => {
      const rows = [
        ["a mesh assignment", "mesh-assignment", "a driver", "63"],
        ["a cadence", "cron", "a range", "60-63"],
        ["a CI signal", "ci-signal", "a driver", "63"],
        ["an inbound finding", "feedback-finding", "a range", "60-63"],
      ];
      const compiled = compileTriggerDeclaration(declaration(rows.map(([label, source, _form, scope]) =>
        member({ id: label, source, scope }))));
      const resolution = resolveTriggerLevels(compiled.triggers, bothFail());

      assert.deepEqual(resolution.resolved, [], "no source buys the rung");
      assert.equal(resolution.refused.length, rows.length);
      for (const refusal of resolution.refused) {
        expectGateRefusal(refusal, ["score", "groundedness"], refusal.triggerId);
        assert.equal("source" in refusal, false, "the refusal names the failing half rather than the source");
        assert.equal("scope" in refusal, false, "…and no scope is exempt from it either");
      }
      // A trusted source would be a config key with a nicer name: the four answers are the SAME
      // answer, distinguishable only by which trigger asked.
      const [head, ...rest] = resolution.refused.map((row) => ({ ...row, triggerId: null }));
      for (const other of rest) assert.deepStrictEqual(other, head, "every source gets the same answer");
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 02 — absent, admitted, refused and unknown are FOUR outcomes and never three
// ════════════════════════════════════════════════════════════════════════════════════════

const DECLARED = {
  "no level key at all": () => ({ id: "t-0" }),
  "a level key set to null": () => ({ id: "t-0", level: null }),
  L1: () => trigger("L1"),
  L2: () => trigger("L2"),
  L3: () => trigger(GATED_RUNG),
  "an empty string": () => trigger(""),
  "a single space": () => trigger(" "),
  "L2 with a trailing space": () => trigger("L2 "),
  "l3 in lower case": () => trigger("l3"),
  L4: () => trigger("L4"),
  "the number 3": () => trigger(3),
  "an object": () => trigger({ level: GATED_RUNG }),
};

const GATE = {
  "pass both halves": bothPass,
  "fail both halves": bothFail,
  "fail on the score": scoreFails,
  "fail on groundedness": reportFails,
  "are not supplied": () => undefined,
};

const RESOLUTION = {
  "resolved at the loop's own default": (answer, where) => expectAdmitted(answer, DEFAULT_RUNG, where),
  "resolved at L1, with no gate consulted": (answer, where) => expectAdmitted(answer, "L1", where),
  "resolved at L2, with no gate consulted": (answer, where) => expectAdmitted(answer, "L2", where),
  "resolved at L3": (answer, where) => expectAdmitted(answer, GATED_RUNG, where),
  "refused, naming the score half": (answer, where) => expectGateRefusal(answer, ["score"], where),
  "refused, naming the groundedness half": (answer, where) => expectGateRefusal(answer, ["groundedness"], where),
  "refused, naming both halves": (answer, where) => expectGateRefusal(answer, ["score", "groundedness"], where),
  "refused, saying the facts were not given": (answer, where) => {
    assert.equal(answer.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED, `${where}: it says the facts were not given`);
    assert.deepEqual(answer.missing, [...TRIGGER_GATE_FACTS], `${where}: and which ones`);
    assert.equal(answer.resolved, undefined, `${where}: it is not a resolution`);
  },
  "refused as an unknown level": (answer, where) => {
    assert.equal(answer.code, "loop-level-unknown", `${where}: the unknown-level code`);
    assert.equal("level" in answer, false, `${where}: no default is substituted for it`);
  },
  "refused as unknown, before any gate": (answer, where) => {
    assert.equal(answer.code, "loop-level-unknown", `${where}: the unknown-level code`);
  },
};

// The rows whose contract is an ORDER, not merely an outcome: whatever the gate facts say, they
// must not be READ. Driven a second time through facts that cannot be consulted without throwing.
const NO_GATE_CONSULTED = new Set([
  "resolved at L1, with no gate consulted",
  "resolved at L2, with no gate consulted",
  "refused as unknown, before any gate",
  "refused as an unknown level",
  "resolved at the loop's own default",
]);

const FOUR_ANSWERS = [
  {
    name: "63/01/02 what was declared, against the facts, decides which of the FOUR answers comes back",
    run: () => {
      const rows = [
        ["no level key at all", "pass both halves", "resolved at the loop's own default"],
        ["no level key at all", "fail both halves", "resolved at the loop's own default"],
        ["a level key set to null", "fail both halves", "resolved at the loop's own default"],
        ["no level key at all", "are not supplied", "resolved at the loop's own default"],
        ["L1", "fail both halves", "resolved at L1, with no gate consulted"],
        ["L2", "fail both halves", "resolved at L2, with no gate consulted"],
        ["L2", "are not supplied", "resolved at L2, with no gate consulted"],
        ["L3", "pass both halves", "resolved at L3"],
        ["L3", "fail on the score", "refused, naming the score half"],
        ["L3", "fail on groundedness", "refused, naming the groundedness half"],
        ["L3", "fail both halves", "refused, naming both halves"],
        ["L3", "are not supplied", "refused, saying the facts were not given"],
        ["an empty string", "pass both halves", "refused as an unknown level"],
        ["a single space", "pass both halves", "refused as an unknown level"],
        ["L2 with a trailing space", "pass both halves", "refused as an unknown level"],
        ["l3 in lower case", "pass both halves", "refused as an unknown level"],
        ["L4", "pass both halves", "refused as an unknown level"],
        ["the number 3", "pass both halves", "refused as an unknown level"],
        ["an object", "pass both halves", "refused as an unknown level"],
        ["L4", "fail both halves", "refused as unknown, before any gate"],
      ];
      for (const [declared, gate, resolution] of rows) {
        const where = `${declared} / ${gate}`;
        RESOLUTION[resolution](resolveTriggerLevel(DECLARED[declared](), GATE[gate]()), where);
        if (NO_GATE_CONSULTED.has(resolution)) {
          RESOLUTION[resolution](resolveTriggerLevel(DECLARED[declared](), untouchableFacts()), `${where} (unconsultable)`);
        }
      }
    },
  },

  {
    name: "63/01/02 a defaulted level and a refused level are different things in the MACHINE form",
    run: () => {
      const failing = bothFail();
      const defaulted = resolveTriggerLevel({ id: "no-opinion" }, failing);
      const refused = resolveTriggerLevel(trigger(GATED_RUNG, "asks-for-the-rung"), failing);

      assert.equal(defaulted.resolved, true, "the first is an answer carrying a level");
      assert.equal(defaulted.level, DEFAULT_RUNG);
      assert.equal(defaulted.code, undefined);

      assert.equal(typeof refused.code, "string", "the second is a refusal carrying a code");
      // A caller that reads only the level finds NO level on the second. This is the collapse the
      // whole feature exists to refuse, and the one key it turns on.
      assert.equal(refused.level, undefined);
      assert.equal("level" in refused, false);
      assert.equal(refused.requestedLevel, GATED_RUNG, "…while the rung it ASKED for is still named");
    },
  },

  {
    name: "63/01/02 a defaulted level and a refused level are different things in the RENDERED form",
    run: () => {
      const failing = bothFail();
      const defaulted = renderTriggerLevelResolution(resolveTriggerLevel({ id: "no-opinion" }, failing));
      const refused = renderTriggerLevelResolution(resolveTriggerLevel(trigger(GATED_RUNG, "asks-for-the-rung"), failing));

      assert.match(defaulted, new RegExp(`will run at ${DEFAULT_RUNG}`), "the first will run at the default level");
      assert.match(refused, /will not run/, "the second will not run");
      assert.match(refused, /score/, "…with the half that refused it");
      assert.match(refused, /groundedness/);
      assert.equal(/will run at/.test(refused), false, "the second is NOT shown as a trigger that will run at the default level");
      assert.notEqual(defaulted, refused);
    },
  },

  {
    name: "63/01/02 the default is the LOOP'S OWN and is not restated here",
    run: () => {
      const answer = resolveTriggerLevel({ id: "no-opinion" }, bothFail());
      // Compared against what the loop resolves for a request that declares none, not against a
      // literal — a restated default is exactly what would drift.
      assert.equal(answer.level, resolveLoopLevel(undefined).level);
      assert.equal(answer.level, resolveLoopLevel(null).level);
      assert.equal(resolveTriggerLevel({ id: "no-opinion", level: null }, bothFail()).level, resolveLoopLevel(null).level);
    },
  },

  {
    name: "63/01/02 an unknown level is refused rather than defaulted or repaired",
    run: () => {
      const declared = ["", " ", "L2 ", "l3", "L4", 3, { level: GATED_RUNG }, [GATED_RUNG], true];
      for (const level of declared) {
        const where = JSON.stringify(level) ?? String(level);
        const refusal = resolveTriggerLevel({ id: "t-0", level }, bothPass());
        assert.equal(refusal.code, "loop-level-unknown", `${where}: the unknown-level code`);
        assert.deepEqual(refusal.known, [...LOOP_LEVELS], `${where}: the refusal names the levels the ladder DOES carry`);
        assert.deepEqual(refusal.requestedLevel, level, `${where}: it names the level as it was declared, UNREPAIRED`);
        assert.equal("level" in refusal, false, `${where}: no default is substituted for it`);
        assert.equal(refusal.resolved, undefined, `${where}: and it is not a resolution`);
      }
      // The near-miss pair, stated as the pair: one is a caller with no opinion, the other a
      // caller whose opinion did not parse. An implementation testing for truthiness renders them
      // the same; this is the assertion that would fail if one did.
      assert.equal(resolveTriggerLevel({ id: "t-0" }, bothPass()).level, DEFAULT_RUNG);
      assert.equal(resolveTriggerLevel({ id: "t-0", level: "" }, bothPass()).code, "loop-level-unknown");
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════════════
// TASK 03 — the gate facts are handed in and the leaf holds no threshold
// ════════════════════════════════════════════════════════════════════════════════════════

const SPAN = {
  "both halves pass": bothPass,
  "the score is one short of the threshold": scoreFails,
  "the score is at the threshold but clears L2": () => facts(scoreClears("L2"), reportClean()),
  "the score reading is missing": () => facts(scoreNeverRead(), reportClean()),
  "the report never reached the reported state": () => facts(scoreClears(GATED_RUNG), reportNotReached()),
  "the report is reported but not present": () => facts(scoreClears(GATED_RUNG), reportNotPresent()),
  "one component is self-referential": () => facts(scoreClears(GATED_RUNG), reportWith(selfReferential())),
  "one component is stale": () => facts(scoreClears(GATED_RUNG), reportWith(stale())),
  "one component is grounded only exogenously": () => facts(scoreClears(GATED_RUNG), reportWith(exogenousOnly())),
  "the score is one short and a component stale": bothFail,
};

// Everything the pre-flight adds to the gate's own answer, enumerated. Identity (`triggerId`) and
// the pre-flight metadata are the whole list, and the assertion below is EXHAUSTIVE in both
// directions — a threshold copied into the leaf would show up here as a key the gate never said.
const PREFLIGHT_ONLY_ON_AN_ANSWER = ["gatedAgainAt", "preflight", "resolved", "resolvedFor", "triggerId"];
const PREFLIGHT_ONLY_ON_A_REFUSAL = ["requestedLevel", "triggerId"];

const HANDED_IN = [
  {
    name: "63/01/03 over the same facts, the pre-flight and the loop's own gate are INDISTINGUISHABLE — across the span of the gate, not one point on it",
    run: () => {
      const rows = [
        ["both halves pass", "admitted at L3"],
        ["the score is one short of the threshold", "refused, naming the score"],
        ["the score is at the threshold but clears L2", "refused, naming the score"],
        ["the score reading is missing", "refused, naming the score"],
        ["the report never reached the reported state", "refused, on groundedness"],
        ["the report is reported but not present", "refused, on groundedness"],
        ["one component is self-referential", "refused, on groundedness"],
        ["one component is stale", "refused, on groundedness"],
        ["one component is grounded only exogenously", "refused, on groundedness"],
        ["the score is one short and a component stale", "refused, naming both halves"],
      ];
      const halvesOf = {
        "admitted at L3": null,
        "refused, naming the score": ["score"],
        "refused, on groundedness": ["groundedness"],
        "refused, naming both halves": ["score", "groundedness"],
      };
      for (const [row, expected] of rows) {
        const handed = SPAN[row]();
        // The SAME facts, put to both.
        const gate = resolveLoopLevelGate(GATED_RUNG, handed);
        const preflight = resolveTriggerLevel(trigger(GATED_RUNG), handed);

        // Both answer the same answer…
        assert.deepStrictEqual(verdictOf(preflight), verdictOf(gate), `${row}: the same verdict, code, halves and particulars`);
        if (halvesOf[expected] === null) {
          expectAdmitted(preflight, GATED_RUNG, row);
          assert.equal(gate.admitted, true, `${row}: and the loop's own gate admits it too`);
          assert.deepEqual(only(preflight, gate).sort(), PREFLIGHT_ONLY_ON_AN_ANSWER, `${row}: the pre-flight says nothing else`);
          assert.deepEqual(only(gate, preflight), ["admitted"], `${row}: and the gate says nothing else`);
        } else {
          expectGateRefusal(preflight, halvesOf[expected], row);
          assert.deepEqual(gate.failingHalves, halvesOf[expected], `${row}: and the loop's own gate names the same half`);
          assert.deepEqual(only(preflight, gate).sort(), PREFLIGHT_ONLY_ON_A_REFUSAL, `${row}: the pre-flight says nothing else`);
          // The one key the pre-flight withholds is `level`, and it withholds it deliberately —
          // a refusal that answered to `level` would collapse task 02's four outcomes into three.
          assert.deepEqual(only(gate, preflight), ["level"], `${row}: and the gate says nothing else`);
          assert.equal(preflight.requestedLevel, gate.level, `${row}: …which the pre-flight carries under its own name`);
        }
        // …and neither says anything the other does not: everything they share is identical.
        for (const key of keysOf(gate).filter((name) => name in preflight)) {
          assert.deepStrictEqual(preflight[key], gate[key], `${row}: ${key} is the gate's own, not re-phrased`);
        }
      }
    },
  },

  {
    name: "63/01/03 what the caller did not hand in is SAID, not guessed — and a rung that needs no facts is not blocked by facts it never needed",
    run: () => {
      const rows = [
        ["L3", "no gate facts at all", "refused, saying the gate facts were not given"],
        ["L3", "a score reading and no report", "refused, saying the report was not given"],
        ["L3", "a report and no score reading", "refused, saying the score was not given"],
        ["L3", "both readings present but empty", "a refusal, and never an admission"],
        ["L1", "no gate facts at all", "resolved at L1"],
        ["L2", "no gate facts at all", "resolved at L2"],
        ["none", "no gate facts at all", "resolved at the loop's own default"],
      ];
      const handedIn = {
        "no gate facts at all": () => undefined,
        "a score reading and no report": () => ({ loopReady: scoreClears(GATED_RUNG) }),
        "a report and no score reading": () => ({ groundedness: reportClean() }),
        "both readings present but empty": () => ({ loopReady: {}, groundedness: {} }),
      };
      const expect = {
        "refused, saying the gate facts were not given": (answer) => {
          assert.equal(answer.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
          assert.deepEqual(answer.missing, [...TRIGGER_GATE_FACTS]);
        },
        "refused, saying the report was not given": (answer) => {
          assert.equal(answer.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
          assert.deepEqual(answer.missing, ["groundedness"]);
        },
        "refused, saying the score was not given": (answer) => {
          assert.equal(answer.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
          assert.deepEqual(answer.missing, ["loopReady"]);
        },
        // Present-but-empty is SUPPLIED: the readings arrived and cannot be read from, which is a
        // gate failure and never an admission on no evidence.
        "a refusal, and never an admission": (answer) => {
          assert.equal(answer.code, "loop-level-gate");
          assert.equal(answer.resolved, undefined);
          assert.deepEqual(answer.failingHalves, ["score", "groundedness"]);
        },
        "resolved at L1": (answer) => expectAdmitted(answer, "L1", "L1 needs no facts"),
        "resolved at L2": (answer) => expectAdmitted(answer, "L2", "L2 needs no facts"),
        "resolved at the loop's own default": (answer) => expectAdmitted(answer, DEFAULT_RUNG, "the default needs no facts"),
      };
      for (const [level, handed, answer] of rows) {
        const subject = level === "none" ? { id: "t-0" } : trigger(level);
        expect[answer](resolveTriggerLevel(subject, handedIn[handed]()));
      }
    },
  },

  {
    name: "63/01/03 the answer follows the facts it was HANDED, not the workspace it is standing in",
    run: () => scratch(async (root) => {
      const rows = [
        ["would pass", "would fail", "refused, naming the failing half"],
        ["would fail", "would pass", "admitted at L3"],
      ];
      for (const [disk, handed, expected] of rows) {
        const workspace = path.join(root, disk.replace(/\s+/g, "-"));
        await mkdir(path.join(workspace, ".aof"), { recursive: true });
        // A workspace whose own readings say the OPPOSITE of what is handed in. If the disk could
        // move the answer, the facts were not handed in.
        await writeFile(
          path.join(workspace, ".aof", "loop-readings.json"),
          `${JSON.stringify(disk === "would pass" ? bothPass() : bothFail(), null, 2)}\n`,
          "utf8",
        );
        const answer = await inDirectory(workspace, () =>
          resolveTriggerLevel(trigger(GATED_RUNG), handed === "would pass" ? bothPass() : bothFail()));
        if (expected === "admitted at L3") expectAdmitted(answer, GATED_RUNG, `${disk} on disk / ${handed} handed in`);
        else expectGateRefusal(answer, ["score", "groundedness"], `${disk} on disk / ${handed} handed in`);
      }
    }),
  },

  {
    name: "63/01/03 resolution needs no registry, no workspace and no clock",
    run: () => scratch(async (empty) => {
      // An empty directory: no workspace, no `.aof`, no registry, and no registered command
      // available to the resolver — the signature has no seat for one.
      assert.equal(resolveTriggerLevel.length, 2, "a trigger and the facts; there is no ctx to invoke through");
      const answer = await inDirectory(empty, () => resolveTriggerLevel(trigger(GATED_RUNG), bothPass()));
      expectAdmitted(answer, GATED_RUNG, "it answers from the facts alone");
      // …and the same call one directory over answers identically, which is what "no file is read"
      // looks like from outside. (`acd-trigger-level-is-a-ceiling` holds the static half: the leaf
      // imports no `node:fs` and reaches no `invoke`.)
      assert.deepStrictEqual(
        await inDirectory(os.tmpdir(), () => resolveTriggerLevel(trigger(GATED_RUNG), bothPass())),
        answer,
      );
    }),
  },

  {
    name: "63/01/03 the same facts twice give the same answer, at two clock readings and in two directories",
    run: () => scratch(async (root) => {
      const one = path.join(root, "one");
      const two = path.join(root, "two");
      await mkdir(one, { recursive: true });
      await mkdir(two, { recursive: true });

      const reading = bothFail();
      const first = await inDirectory(one, () => resolveTriggerLevel(trigger(GATED_RUNG), reading));
      await new Promise((resolve) => { setTimeout(resolve, 5); });
      const second = await inDirectory(two, () => resolveTriggerLevel(trigger(GATED_RUNG), reading));

      assert.deepStrictEqual(first, second, "the two answers are identical");
      // Nothing in the answer is a moment: a timestamp would make two answers differ and would be
      // a clock this leaf is not allowed to hold.
      walk(first, (value, trail) => {
        if (typeof value === "number") {
          assert.ok(value < 1e12, `no epoch reading at ${trail.join(".")}`);
        }
        if (typeof value === "string") {
          assert.equal(/\d{4}-\d{2}-\d{2}T\d{2}:/.test(value), false, `no timestamp at ${trail.join(".")}`);
        }
      });
    }),
  },

  {
    name: "63/01/03 the refusal for facts that were NOT SUPPLIED is distinguishable from one for facts that FAILED",
    run: () => {
      const notSupplied = resolveTriggerLevel(trigger(GATED_RUNG), undefined);
      const failed = resolveTriggerLevel(trigger(GATED_RUNG), bothFail());

      // Told apart WITHOUT reading their prose: the codes differ.
      assert.notEqual(notSupplied.code, failed.code);
      assert.equal(notSupplied.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
      assert.equal(failed.code, "loop-level-gate");
      const withoutProse = (answer) => {
        const { reason, message, ...rest } = answer;
        return rest;
      };
      assert.notDeepEqual(withoutProse(notSupplied), withoutProse(failed));

      // Neither reports a score or a component that was never read.
      for (const word of ["score", "groundedness", "failingHalves"]) {
        assert.equal(word in notSupplied, false, `the not-supplied refusal reports no ${word}`);
      }
      assert.deepEqual(notSupplied.missing, [...TRIGGER_GATE_FACTS], "it reports which readings it did not get");
      assert.equal(failed.score.score, L3_SCORE_THRESHOLD - 1, "and the failed refusal reports the score it DID read");
      assert.deepEqual(
        failed.groundedness.components.map((component) => component.verdict),
        ["stale"],
        "…and only the components that actually came back failing",
      );
      // The rendered forms are two different sentences too, for the same reason.
      assert.match(renderTriggerLevelResolution(notSupplied), /the gate facts were not handed in/);
      assert.match(renderTriggerLevelResolution(failed), /refused on score and groundedness/);
    },
  },
];

export const triggerLevelCeilingTests = [
  ...RESOLVED_AT_EVERY_FIRE,
  ...REFUSED_BY_NAME,
  ...FOUR_ANSWERS,
  ...HANDED_IN,
];
