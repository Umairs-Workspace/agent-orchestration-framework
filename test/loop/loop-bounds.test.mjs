// Traceability: 69/00/tasks/00_the-bounds-resolve.feature. Every scenario and
// every Examples row is exercised here against the pure declaration leaf.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_BUILD_NO_PROGRESS_ROUNDS,
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_LOOP_CONCURRENCY,
  DEFAULT_PROGRESS_MAX_RESETS,
  DEFAULT_REVIEW_ROUNDS,
  MAX_BUILD_NO_PROGRESS_ROUNDS,
  MAX_REVIEW_ROUNDS,
  DEFAULT_SCHEDULE_TO_CLOSE_MS,
  DEFAULT_SCHEDULE_TO_START_MS,
  DEFAULT_START_TO_CLOSE_MS,
  DEFAULT_STARTUP_GRACE_MS,
  LOOP_BOUND_CONFIG_KEYS,
  LOOP_BOUND_CONFIG_RESOLVERS,
  LOOP_BOUND_TERMINAL_BEHAVIOURS,
  LOOP_BOUND_VALUE_KEYS,
  LOOP_BOUND_VALUE_RESOLVERS,
  LOOP_CONCURRENCY_MODES,
  NO_DECLARED_RANGE,
  OUTSIDE_DECLARED_RANGE,
  STEP_WOULD_BE_COMPOUND,
  compoundStepRefusal,
  deadlineApplicability,
  loopBoundsFromConfig,
  loopConcurrencyFromConfig,
  rangeProbe,
  resolveLoopConcurrency,
  resolveStartToCloseMs,
  resolveReviewRounds,
  resolvesLoopBoundConfigKey,
  stepProbe,
  stepProbeFromConfig,
} from "../../src/loop-bounds.mjs";
import { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS } from "../../src/mesh/assignment-reclaim.mjs";
import { dispatchConcurrencyFromConfig } from "../../src/work/dispatch.mjs";
// 61/00 — the clamp is asked for at the doors it actually binds, not only at its
// declaration: the three no-progress decisions, the attempt-retry door and the
// drive-cycle door are all exercised through their own production surfaces.
import {
  decideBuildProgress,
  evaluateProgressPolicy,
  progressPolicyFromConfig,
  progressSample,
} from "../../src/loop-progress.mjs";
import { resolveAttemptCeiling } from "../../src/commands/run-retry.mjs";
import { loopCommand } from "../../src/commands/loop.mjs";
import { loopFixture } from "./loop-command-probe.test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaults = {
  startToCloseMs: DEFAULT_START_TO_CLOSE_MS,
  heartbeatMs: DEFAULT_HEARTBEAT_MS,
  scheduleToStartMs: DEFAULT_SCHEDULE_TO_START_MS,
  scheduleToCloseMs: DEFAULT_SCHEDULE_TO_CLOSE_MS,
  startupGraceMs: DEFAULT_STARTUP_GRACE_MS,
  reviewRounds: DEFAULT_REVIEW_ROUNDS,
  buildNoProgressRounds: DEFAULT_BUILD_NO_PROGRESS_ROUNDS,
  progressMaxResets: DEFAULT_PROGRESS_MAX_RESETS,
};

const malformedRows = [
  ["absent", undefined],
  ["null", null],
  ["the string 30", "30"],
  ["a boolean", true],
  ["zero", 0],
  ["a negative number", -1],
  ["a non-integer float", 1.5],
  ["not-a-number", Number.NaN],
  ["infinity", Number.POSITIVE_INFINITY],
  ["negative infinity", Number.NEGATIVE_INFINITY],
  ["an unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ["an object", {}],
  ["an array", [30]],
];

const behaviourRows = [
  ["start-to-close", "startToClose", "kill the attempt and retry it"],
  ["heartbeat", "heartbeat", "kill the attempt and retry it"],
  ["schedule-to-start", "scheduleToStart", "alert and escalate, never retry"],
  ["schedule-to-close", "scheduleToClose", "give up, escalate, preserve the tree"],
  ["startup grace", "startupGrace", "suspend the heartbeat deadline only"],
];

export const loopBoundsTests = [
  {
    name: "proposed-fixes/review bound clamps every configured value to the three-round hard maximum",
    run() {
      assert.equal(resolveReviewRounds(MAX_REVIEW_ROUNDS), MAX_REVIEW_ROUNDS);
      assert.equal(resolveReviewRounds(MAX_REVIEW_ROUNDS + 1), MAX_REVIEW_ROUNDS);
      assert.equal(resolveReviewRounds(99), MAX_REVIEW_ROUNDS);
    },
  },
  {
    name: "69/00 bounds/00 an unconfigured workspace still has every documented bound and does not throw",
    run() {
      assert.doesNotThrow(() => loopBoundsFromConfig({ config: {} }));
      assert.deepEqual(loopBoundsFromConfig({ config: {} }), defaults);
    },
  },
  {
    name: "69/00 bounds/00 a declared per-attempt ceiling is used verbatim and leaves the other defaults alone",
    run() {
      assert.deepEqual(loopBoundsFromConfig({ config: { work: { loop: { startToCloseMs: 42_000 } } } }), {
        ...defaults,
        startToCloseMs: 42_000,
      });
    },
  },
  {
    name: "69/00 bounds/00 heartbeat is the reclaim threshold's one declared constant",
    async run() {
      assert.equal(loopBoundsFromConfig({ config: {} }).heartbeatMs, DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS);
      const reclaim = await readFile(path.join(root, "src", "mesh", "assignment-reclaim.mjs"), "utf8");
      assert.match(reclaim, /DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS\s*=\s*DEFAULT_HEARTBEAT_MS/u);
      assert.doesNotMatch(reclaim, /DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS\s*=\s*15\s*\*/u);
    },
  },
  ...malformedRows.map(([label, value]) => ({
    name: `69/00 bounds/00 malformed row — ${label} falls back without crashing`,
    run() {
      assert.doesNotThrow(() => resolveStartToCloseMs(value));
      assert.equal(resolveStartToCloseMs(value), DEFAULT_START_TO_CLOSE_MS);
    },
  })),
  ...behaviourRows.map(([label, key, expected]) => ({
    name: `69/00 bounds/00 terminal behaviour row — ${label}`,
    run() {
      assert.equal(LOOP_BOUND_TERMINAL_BEHAVIOURS[key], expected);
    },
  })),
  {
    name: "69/00 bounds/00 startup grace suspends heartbeat only, never either wall clock",
    run() {
      const policy = loopBoundsFromConfig({ config: {} });
      assert.deepEqual(deadlineApplicability(policy, policy.startupGraceMs - 1), {
        heartbeat: false,
        startToClose: true,
        scheduleToClose: true,
      });
    },
  },
  {
    name: "69/00 bounds/00 dispatch concurrency and maxAttempts keep their existing homes",
    async run() {
      const source = await readFile(path.join(root, "src", "loop-bounds.mjs"), "utf8");
      assert.doesNotMatch(source, /dispatch\??\.concurrency|autonomous\??\.maxAttempts/u);
      assert.equal(dispatchConcurrencyFromConfig({ config: { work: { dispatch: { concurrency: 7 } } } }), 7);
      const retry = await readFile(path.join(root, "src", "commands", "run-retry.mjs"), "utf8");
      assert.match(retry, /config\?\.work\?\.autonomous\?\.maxAttempts\s*\?\?\s*3/u);
    },
  },
];

// ── 61/00 · THE CLAMP ────────────────────────────────────────────────────────
//
// Traceability: 61/00/tasks/00_every-steppable-knob-has-a-range.feature,
// 01_a-key-that-is-two-bounds-is-refused-as-a-step.feature and
// 02_admissibility-is-the-resolvers-own-answer.feature. Every scenario and every
// Examples row of all three is exercised below, against the production leaf and
// against the real doors the bounds reach.
//
// The SOURCE legs — "no range is declared for the conflated key ANYWHERE", "the
// value-shaped map is derived from the callables", "the bounds that resolve from
// that key are counted from its call sites" — are FF-6111's, and live in
// `test/arch/loop/acd-loop-cap-single-home.test.mjs`, where the tree is read.

const REVIEW = "work.loop.reviewRounds";
const NO_PROGRESS = "work.loop.buildNoProgressRounds";
// The admitted key that is not one bound. It is DATA in this file and absent from
// the production leaf entirely — nothing branches on it, which is task 01's point.
const CONFLATED = "work.autonomous.maxAttempts";
const ATTEMPT_BOUND = "the attempt ceiling — how many times a failed run may be retried";
const DRIVE_BOUND = "the per-(ref, phase) drive-cycle ceiling — how many drive cycles one phase may spend";

const knobField = (key) => key.slice(key.lastIndexOf(".") + 1);
const workspaceFor = (key, value) => ({ config: { work: { loop: { [knobField(key)]: value } } } });
const valueInEffect = (key, workspace) => LOOP_BOUND_CONFIG_RESOLVERS[key](workspace);
const configuredAt = (key, value) => valueInEffect(key, workspaceFor(key, value));

// The contract's own numbers, pinned once and then CHECKED AGAINST THE RESOLVER's
// declaration below, so this table is a transcription of the .feature rather than a
// second authority that could come to disagree with the knob.
const RANGES = Object.freeze({
  [REVIEW]: Object.freeze({ floor: 1, ceiling: 3, fallback: 1 }),
  [NO_PROGRESS]: Object.freeze({ floor: 1, ceiling: 4, fallback: 2 }),
});

export const clampTests = [
  {
    name: "61/00/00 the steppable knobs' declared ranges are the resolvers' own, and the feature's numbers transcribe them",
    run() {
      assert.equal(RANGES[REVIEW].ceiling, MAX_REVIEW_ROUNDS);
      assert.equal(RANGES[REVIEW].fallback, DEFAULT_REVIEW_ROUNDS);
      assert.equal(RANGES[NO_PROGRESS].ceiling, MAX_BUILD_NO_PROGRESS_ROUNDS);
      assert.equal(RANGES[NO_PROGRESS].fallback, DEFAULT_BUILD_NO_PROGRESS_ROUNDS);
      // The clamp binds in both directions, which is what makes ADR-009 §2's probe
      // bound anything at all.
      for (const [key, range] of Object.entries(RANGES)) {
        assert.notEqual(configuredAt(key, range.ceiling + 1), range.ceiling + 1, `${key}: resolve(ceiling + 1) !== ceiling + 1`);
        assert.notEqual(configuredAt(key, range.floor - 1), range.floor - 1, `${key}: resolve(floor - 1) !== floor - 1`);
      }
    },
  },

  // Scenario Outline: a value inside the range takes effect exactly as configured.
  ...[
    [REVIEW, 1, "the floor"],
    [REVIEW, 2, "interior"],
    [REVIEW, 3, "the ceiling"],
    [NO_PROGRESS, 1, "the floor"],
    [NO_PROGRESS, 3, "interior"],
    [NO_PROGRESS, 4, "the ceiling"],
  ].map(([key, value, where]) => ({
    name: `61/00/00 inside the range — ${key} configured ${value} (${where}) takes effect exactly as configured`,
    run() {
      assert.equal(configuredAt(key, value), value);
    },
  })),

  // Scenario Outline: a value past either end is not honoured, and what takes
  // effect is inside the range.
  ...[
    [REVIEW, 0, "below the floor", 1, 1, 3],
    [REVIEW, 4, "above the ceiling", 3, 1, 3],
    [REVIEW, 99, "runaway", 3, 1, 3],
    [NO_PROGRESS, 0, "below the floor", 2, 1, 4],
    [NO_PROGRESS, 5, "above the ceiling", 4, 1, 4],
    [NO_PROGRESS, 99, "runaway", 4, 1, 4],
  ].map(([key, value, where, effect, floor, ceiling]) => ({
    name: `61/00/00 past the end — ${key} configured ${value} (${where}) is not honoured and lands at ${effect}`,
    run() {
      const landed = configuredAt(key, value);
      assert.notEqual(landed, value);
      assert.equal(landed, effect);
      assert.ok(landed >= floor && landed <= ceiling, `${landed} is no lower than ${floor} and no higher than ${ceiling}`);
    },
  })),

  // Scenario Outline: a setting that is not a whole positive number is not honoured
  // either — and it lands on the DEFAULT that knob has always had, not on its floor.
  ...[
    [REVIEW, 2.5, "not a whole number", 1],
    [REVIEW, "three", "not a number at all", 1],
    [NO_PROGRESS, -1, "not a positive number", 2],
    [NO_PROGRESS, [4], "not a number at all", 2],
  ].map(([key, value, why, effect]) => ({
    name: `61/00/00 malformed — ${key} configured ${JSON.stringify(value)} (${why}) falls back to ${effect}`,
    run() {
      const landed = configuredAt(key, value);
      assert.notEqual(landed, value);
      assert.equal(landed, effect);
      assert.equal(landed, RANGES[key].fallback, "the default that knob has always had");
    },
  })),

  // Scenario Outline: a knob nobody configured keeps the default it has always had.
  ...[[REVIEW, 1], [NO_PROGRESS, 2]].map(([key, fallback]) => ({
    name: `61/00/00 unconfigured — ${key} keeps its default of ${fallback}, which is inside its range`,
    run() {
      assert.equal(valueInEffect(key, { config: {} }), fallback);
      assert.ok(fallback >= RANGES[key].floor && fallback <= RANGES[key].ceiling);
    },
  })),

  {
    name: "61/00/00 a value above the ceiling comes back to the CEILING rather than to the default",
    run() {
      for (const [key, range] of Object.entries(RANGES)) {
        const landed = configuredAt(key, range.ceiling + 1);
        assert.equal(landed, range.ceiling, `${key}: above the ceiling lands on the ceiling`);
        assert.notEqual(landed, range.fallback, `${key}: and not on the default`);
      }
      // …and the two landings are genuinely different places, or the rows above
      // would pass over a knob whose ceiling happened to be its default.
      assert.notEqual(RANGES[REVIEW].ceiling, RANGES[REVIEW].fallback);
      assert.notEqual(RANGES[NO_PROGRESS].ceiling, RANGES[NO_PROGRESS].fallback);
    },
  },
  {
    name: "61/00/00 the two steppable knobs do not share one range — both configured at 4",
    run() {
      assert.equal(configuredAt(NO_PROGRESS, 4), 4, "the knob whose ceiling is 4 is in effect at 4");
      assert.equal(configuredAt(REVIEW, 4), 3, "the knob whose ceiling is 3 is in effect at 3");
    },
  },
  {
    name: "61/00/00 a ceiling bounds a knob without raising it — a value below the ceiling is kept",
    run() {
      assert.equal(configuredAt(NO_PROGRESS, 3), 3);
      assert.notEqual(configuredAt(NO_PROGRESS, 3), MAX_BUILD_NO_PROGRESS_ROUNDS);
    },
  },
  {
    name: "61/00/00 the ceiling holds wherever the bounded value is asked for — every no-progress decision is bounded at 4 and none of them sees 99",
    run() {
      const workspace = workspaceFor(NO_PROGRESS, 99);
      const policy = progressPolicyFromConfig(workspace);
      assert.equal(policy.maxStalls, 4);

      const sample = (at) => progressSample({ at, runId: "run-1", filesTouched: ["a.mjs"], linesChanged: 7, commitsMade: 0, failingScenarios: 3 });
      const stalled = ["10:00", "10:01", "10:02", "10:03", "10:04"].map((minute) => sample(`2026-08-30T${minute}:00.000Z`));
      const evaluated = evaluateProgressPolicy(stalled, { maxStalls: 99, maxResets: 2 });
      assert.notEqual(evaluated.action, "continue", "with the ceiling applied, four stalls are already past the bound");
      assert.equal(evaluated.stalls, 4);

      const decided = decideBuildProgress([5, 5, 5, 5, 5], { maxStalls: 99 });
      assert.equal(decided.action, "halt");
      assert.equal(decided.stop, "no-progress");
      assert.equal(decided.noProgressRounds, 4);

      for (const decision of [policy, evaluated, decided]) {
        assert.ok(!Object.values(decision).includes(99), `none of them sees 99: ${JSON.stringify(decision)}`);
      }
    },
  },
  {
    name: "61/00/00 the key that is not a single bound is given NO range here, and none is invented so that it has one",
    run() {
      assert.ok(!LOOP_BOUND_CONFIG_KEYS.includes(CONFLATED), "no config-shaped resolver declares it");
      assert.ok(!LOOP_BOUND_VALUE_KEYS.includes(CONFLATED), "and no value-shaped one does either");
      const probed = rangeProbe(CONFLATED, 4);
      assert.equal(probed.code, NO_DECLARED_RANGE);
      assert.equal(probed.inEffect, null, "no floor and no ceiling are declared for it, so there is nothing to answer with");
      assert.equal(probed.admissible, false);
    },
  },

  // ── task 01 · a key that is two bounds is refused as a step ────────────────
  // Scenario Outline: what a one-notch step on each admitted key is answered with.
  ...[
    [REVIEW, ["the review-round bound"], "one", false],
    [NO_PROGRESS, ["the no-progress-round bound"], "one", false],
    [CONFLATED, [ATTEMPT_BOUND, DRIVE_BOUND], "two", true],
  ].map(([key, bounds, count, refused]) => ({
    name: `61/00/01 a one-notch step on ${key} (${count} bound${count === "one" ? "" : "s"}) is ${refused ? "" : "not "}refused as a compound step`,
    run() {
      const refusal = compoundStepRefusal({ key, bounds });
      if (!refused) {
        assert.equal(refusal, null, "a single-bound key earns no compound refusal");
        return;
      }
      assert.equal(refusal?.code, STEP_WOULD_BE_COMPOUND);
    },
  })),
  {
    name: "61/00/01 the refusal is reported by its own name, is not a value that fell outside a range, and names the bounds the one write would have moved",
    run() {
      const refusal = compoundStepRefusal({ key: CONFLATED, bounds: [ATTEMPT_BOUND, DRIVE_BOUND] });
      assert.equal(refusal.code, "step-would-be-compound");
      assert.equal(refusal.code, STEP_WOULD_BE_COMPOUND);
      assert.notEqual(refusal.code, OUTSIDE_DECLARED_RANGE);
      assert.deepEqual(refusal.bounds, [ATTEMPT_BOUND, DRIVE_BOUND]);
      // …and it carries nothing range-shaped to be mistaken for one: no proposed
      // value, no value in effect, no floor and no ceiling.
      assert.deepEqual(Object.keys(refusal).sort(), ["bounds", "code", "key"]);
    },
  },
  {
    name: "61/00/01 the refusal is computed from the COUNT of bounds, not from the key's name — the same key resolving one bound is not refused",
    async run() {
      assert.equal(compoundStepRefusal({ key: CONFLATED, bounds: [ATTEMPT_BOUND] }), null);
      assert.equal(compoundStepRefusal({ key: CONFLATED, bounds: [] }), null);
      // And nothing has to be edited anywhere for the refusal to stop applying:
      // the production leaf holds no fact about the key's name, so there is no
      // record of it to remember to delete on the day it means one thing.
      const source = await readFile(path.join(root, "src", "loop-bounds.mjs"), "utf8");
      assert.doesNotMatch(source, /maxAttempts/u, "the leaf never spells the key");
    },
  },
  {
    name: "61/00/01 any key this machinery has never been told about that resolves to two bounds earns the same answer, from the same reasoning",
    run() {
      const unheard = compoundStepRefusal({ key: "work.something.nobodyDeclared", bounds: ["a bound", "another bound"] });
      const named = compoundStepRefusal({ key: CONFLATED, bounds: ["a bound", "another bound"] });
      assert.equal(unheard.code, STEP_WOULD_BE_COMPOUND);
      assert.deepEqual({ ...unheard, key: null }, { ...named, key: null }, "the same answer, differing only in the key it names");
    },
  },
  {
    name: "61/00/01 only the number of bounds can lift the refusal — more evidence, a larger budget and a moved configured value change nothing",
    run() {
      const base = { key: CONFLATED, bounds: [ATTEMPT_BOUND, DRIVE_BOUND] };
      const refusal = compoundStepRefusal(base);
      for (const context of [
        { ...base, evidence: 47, rulings: 8 },
        { ...base, budget: 1_000_000 },
        { ...base, configured: 4, proposed: 5 },
        { ...base, evidence: 4096, budget: Number.MAX_SAFE_INTEGER, configured: 99 },
      ]) {
        assert.deepEqual(compoundStepRefusal(context), refusal, "none of these is an input to the refusal");
      }
      assert.equal(compoundStepRefusal({ ...base, bounds: [ATTEMPT_BOUND] }), null, "the refusal lifts only where the key comes to resolve a single bound");
    },
  },
  {
    name: "61/00/01 the key stays proposable — the declared tunable set still names it, and this task removes nothing from that set",
    async run() {
      const record = await readFile(path.join(root, "src", "bundle", "loops", "speed-thoroughness-autonomy.md"), "utf8");
      const declared = /^parameter-tuning:\s*\[([^\]]*)\]/mu.exec(record);
      assert.ok(declared != null, "the arbiter record declares a parameter-tuning edge");
      const keys = declared[1].split(",").map((entry) => entry.trim());
      assert.deepEqual(keys, [`config:${REVIEW}`, `config:${NO_PROGRESS}`, `config:${CONFLATED}`]);
      assert.ok(keys.includes(`config:${CONFLATED}`), "what is refused is COMMITTING a step on the key, not proposing one");
    },
  },
  // Scenario Outline: refusing the step changes nothing about what the key does at
  // either door — first the retry-attempt door.
  ...[[99, 99], [4, 4], ["unset", 3]].map(([configured, effect]) => ({
    name: `61/00/01 door — configured ${configured}, how many times a failed run may be retried is ${effect}`,
    run() {
      const config = configured === "unset" ? { work: {} } : { work: { autonomous: { maxAttempts: configured } } };
      assert.equal(resolveAttemptCeiling(config), effect);
    },
  })),
  // …then the drive-cycle door, through the loop's own read-only probe.
  ...[[99, 99], [4, 4], ["unset", 3]].map(([configured, effect]) => ({
    name: `61/00/01 door — configured ${configured}, how many drive cycles one phase may spend is ${effect}`,
    async run() {
      const fx = await loopFixture();
      try {
        const config = configured === "unset"
          ? { work: { dir: "wiki/work" } }
          : { work: { dir: "wiki/work", autonomous: { maxAttempts: configured } } };
        const result = await loopCommand.run({ scope: "03" }, { workspace: { ...fx.workspace, config } });
        assert.equal(result.cap, effect);
      } finally {
        await fx.cleanup();
      }
    },
  })),
  {
    name: "61/00/01 a drive ceiling asked for explicitly is still exactly what was asked for — no bound derived from an attempt count has lowered it",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        const result = await loopCommand.run({ scope: "03", cap: 5 }, fx.ctx);
        assert.equal(result.cap, 5);
        assert.notEqual(result.cap, MAX_BUILD_NO_PROGRESS_ROUNDS, "the clamp landed on the no-progress knob, never on the drive ceiling");
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ── task 02 · admissibility is the resolver's own answer ───────────────────
  // Scenario Outline: a proposed value is admissible exactly when it resolves to
  // itself — the same number admissible for one knob and refused for another.
  ...[
    [REVIEW, 1, true],
    [REVIEW, 3, true],
    [REVIEW, 4, false],
    [REVIEW, 0, false],
    [NO_PROGRESS, 1, true],
    [NO_PROGRESS, 4, true],
    [NO_PROGRESS, 5, false],
    [NO_PROGRESS, 0, false],
    [NO_PROGRESS, 99, false],
  ].map(([key, proposed, admissible]) => ({
    name: `61/00/02 proposal — ${proposed} for ${key} is ${admissible ? "admissible" : "refused"}`,
    run() {
      const probed = rangeProbe(key, proposed);
      assert.equal(probed.admissible, admissible);
      assert.equal(probed.code, admissible ? null : OUTSIDE_DECLARED_RANGE);
    },
  })),
  // Scenario Outline: a one-notch step at the boundary is where the ratchet stops.
  ...[
    [REVIEW, 2, 1, true],
    [REVIEW, 3, 1, false],
    [REVIEW, 3, -1, true],
    [REVIEW, 1, -1, false],
    [NO_PROGRESS, 3, 1, true],
    [NO_PROGRESS, 4, 1, false],
    [NO_PROGRESS, 2, -1, true],
    [NO_PROGRESS, 1, -1, false],
  ].map(([key, current, step, admissible]) => ({
    name: `61/00/02 step — ${key} in effect at ${current}, a step of ${step > 0 ? "+1" : "-1"} is ${admissible ? "admissible" : "refused"}`,
    run() {
      const probed = stepProbe(key, current, step);
      assert.equal(probed.admissible, admissible);
      assert.equal(probed.from, current);
      assert.equal(probed.proposed, current + step);
    },
  })),
  {
    name: "61/00/02 the verdict and the value in effect never disagree — admissible exactly where the resolved value is the proposed one",
    run() {
      for (const key of Object.keys(RANGES)) {
        for (const proposed of [-2, -1, 0, 1, 2, 3, 4, 5, 8, 99, 2.5, "3", null, undefined]) {
          const probed = rangeProbe(key, proposed);
          assert.equal(probed.admissible, probed.inEffect === proposed, `${key} @ ${String(proposed)}: the verdict is the resolver's own answer`);
          assert.equal(probed.code, probed.admissible ? null : OUTSIDE_DECLARED_RANGE);
        }
      }
    },
  },
  {
    name: "61/00/02 every knob that resolves a configured value can also be asked about a proposed one, and nothing else answers",
    run() {
      assert.deepEqual([...LOOP_BOUND_VALUE_KEYS].sort(), [...LOOP_BOUND_CONFIG_KEYS].sort(), "the value-shaped key set equals the config-shaped one, in both directions");
      assert.ok(LOOP_BOUND_VALUE_KEYS.length >= 8, `the map is non-vacuous: ${LOOP_BOUND_VALUE_KEYS.length} knobs`);
      for (const key of LOOP_BOUND_VALUE_KEYS) {
        assert.equal(typeof LOOP_BOUND_VALUE_RESOLVERS[key], "function", `${key} answers`);
        assert.equal(typeof rangeProbe(key, 1).admissible, "boolean", `${key} answers a proposal`);
        assert.equal(typeof LOOP_BOUND_CONFIG_RESOLVERS[key], "function", `${key} has a configured value of its own`);
      }
    },
  },
  {
    name: "61/00/02 a key that declares no range is never answered admissible, and that answer is distinguishable from one refused for falling outside a range",
    run() {
      const silent = rangeProbe(CONFLATED, 4);
      const outside = rangeProbe(REVIEW, 4);
      assert.equal(silent.admissible, false);
      assert.equal(outside.admissible, false);
      assert.equal(silent.code, NO_DECLARED_RANGE);
      assert.equal(outside.code, OUTSIDE_DECLARED_RANGE);
      assert.notEqual(silent.code, outside.code, "silence and out-of-range are different answers");
      assert.equal(silent.inEffect, null, "there is no value to report instead");
      assert.equal(outside.inEffect, 3, "and here there is");
    },
  },
  {
    name: "61/00/02 over a knob with no ceiling the probe admits anything — which is why the range has to come first",
    run() {
      const absurd = 10 ** 12;
      const unbounded = rangeProbe("work.loop.startToCloseMs", absurd);
      assert.equal(unbounded.admissible, true, "an unbounded resolution returns whatever it is handed");
      assert.equal(rangeProbe(REVIEW, absurd).admissible, false, "the same value proposed for a knob that has a ceiling is refused");
      assert.equal(rangeProbe(NO_PROGRESS, absurd).admissible, false);
    },
  },
  {
    name: "61/00/02 a refusal reports the value that would take effect instead, and names the knob the answer came from",
    run() {
      const refused = rangeProbe(NO_PROGRESS, 99);
      assert.equal(refused.key, NO_PROGRESS);
      assert.equal(refused.proposed, 99);
      assert.equal(refused.inEffect, 4);
      assert.equal(refused.inEffect, configuredAt(NO_PROGRESS, 99), "the value reported is the one that would actually take effect");
    },
  },
  {
    name: "61/00/02 a record declaring a wider range does not widen it — there is nothing written down to edit",
    run() {
      const record = Object.freeze({ key: NO_PROGRESS, floor: 1, ceiling: 99, why: "a record that would like a wider range" });
      const withRecord = rangeProbe(record.key, 9);
      const without = rangeProbe(NO_PROGRESS, 9);
      assert.equal(withRecord.admissible, false, "inside the record's declared range and outside the knob's own — the knob wins");
      assert.deepEqual(withRecord, without, "the answer is the same as it is with no such record present");
      assert.equal(rangeProbe.length, 2, "the probe takes a key and a value; there is nowhere to hand it a range");
    },
  },
  {
    name: "61/00/02 a step is taken from the value in effect, never from what the config file says",
    run() {
      const workspace = workspaceFor(NO_PROGRESS, 99);
      assert.equal(valueInEffect(NO_PROGRESS, workspace), 4, "configured above its ceiling, the knob is in effect at the ceiling");
      const up = stepProbeFromConfig(workspace, NO_PROGRESS, 1);
      assert.equal(up.from, 4);
      assert.equal(up.proposed, 5);
      assert.equal(up.admissible, false);
      const down = stepProbeFromConfig(workspace, NO_PROGRESS, -1);
      assert.equal(down.proposed, 3, "one below the ceiling, not one below the configured value");
      assert.notEqual(down.proposed, 98);
      assert.equal(down.admissible, true);
      // …and a key with no declared range has no value in effect to step from.
      const silent = stepProbeFromConfig(workspace, CONFLATED, 1);
      assert.equal(silent.code, NO_DECLARED_RANGE);
      assert.equal(silent.from, null);
      assert.equal(silent.admissible, false);
    },
  },
  {
    name: "61/00/02 asking is a read — the value in effect is unchanged and no configuration is written",
    run() {
      const workspace = workspaceFor(NO_PROGRESS, 3);
      const before = JSON.stringify(workspace);
      const wasInEffect = valueInEffect(NO_PROGRESS, workspace);
      for (const proposed of [0, 1, 2, 3, 4, 5, 99]) {
        assert.equal(typeof rangeProbe(NO_PROGRESS, proposed).admissible, "boolean");
      }
      for (const step of [1, -1]) stepProbeFromConfig(workspace, NO_PROGRESS, step);
      assert.equal(JSON.stringify(workspace), before, "no configuration is written");
      assert.equal(valueInEffect(NO_PROGRESS, workspace), wasInEffect, "the value in effect for that knob is unchanged");
      assert.ok(Object.isFrozen(rangeProbe(NO_PROGRESS, 3)), "and the answer itself is immutable");
    },
  },

  // ── 129/01 task 00 · the concurrency MODE resolves in the bounds' one home ──
  //
  // Traceability: 129/01/tasks/00_the-mode-has-one-home.feature (129/ADR-001 §1; 69/ADR-001's
  // single home; 61/ADR-009 §2's probe). Every scenario and every Examples row is exercised
  // here, against the production leaf. The two record-side scenarios live where each record
  // side already is: the registry loader admitting the key is a grammar row of
  // `work-loops-resolved-ceilings.test.mjs` (the loader's home); a record citing it as a ceiling
  // carrying no string bound is in `loop-record-projection.test.mjs`, beside the projection.
  {
    name: "129/01/00 the mode list and the default are frozen facts",
    run() {
      assert.deepEqual([...LOOP_CONCURRENCY_MODES], ["sequential", "refine_first"]);
      assert.equal(Object.isFrozen(LOOP_CONCURRENCY_MODES), true);
      assert.equal(DEFAULT_LOOP_CONCURRENCY, "sequential");
    },
  },
  // Scenario Outline: the config reader answers the configured mode and sequential for everything else.
  ...[
    ["undefined", undefined, "sequential"],
    ["{}", {}, "sequential"],
    ["{ config: {} }", { config: {} }, "sequential"],
    ["{ config: { work: { loop: null } } }", { config: { work: { loop: null } } }, "sequential"],
    ["{ config: { work: { loop: {} } } }", { config: { work: { loop: {} } } }, "sequential"],
    ["concurrency: \"sequential\"", { config: { work: { loop: { concurrency: "sequential" } } } }, "sequential"],
    ["concurrency: \"refine_first\"", { config: { work: { loop: { concurrency: "refine_first" } } } }, "refine_first"],
    ["concurrency: \"parallel\"", { config: { work: { loop: { concurrency: "parallel" } } } }, "sequential"],
    ["concurrency: 2", { config: { work: { loop: { concurrency: 2 } } } }, "sequential"],
  ].map(([label, workspace, answer]) => ({
    name: `129/01/00 config reader — a workspace of ${label} answers "${answer}"`,
    run() {
      assert.equal(loopConcurrencyFromConfig(workspace), answer);
    },
  })),
  // Scenario Outline: the value resolver answers a member verbatim and the default otherwise —
  // no trim, no case-fold, no coercion, and never a throw.
  ...[
    ["\"sequential\"", "sequential", "sequential"],
    ["\"refine_first\"", "refine_first", "refine_first"],
    ["\"parallel\"", "parallel", "sequential"],
    ["\"REFINE_FIRST\"", "REFINE_FIRST", "sequential"],
    ["\"refine-first\"", "refine-first", "sequential"],
    ["\" refine_first\"", " refine_first", "sequential"],
    ["\"\"", "", "sequential"],
    ["undefined", undefined, "sequential"],
    ["null", null, "sequential"],
    ["1", 1, "sequential"],
    ["true", true, "sequential"],
    ["[\"refine_first\"]", ["refine_first"], "sequential"],
    ["{ }", {}, "sequential"],
  ].map(([label, value, answer]) => ({
    name: `129/01/00 value resolver — ${label} answers "${answer}" and does not throw`,
    run() {
      assert.doesNotThrow(() => resolveLoopConcurrency(value));
      assert.equal(resolveLoopConcurrency(value), answer);
    },
  })),
  {
    name: "129/01/00 the key is a member of BOTH resolver maps and of both key lists — nine keys, appended last",
    run() {
      assert.equal(LOOP_BOUND_VALUE_RESOLVERS["work.loop.concurrency"], resolveLoopConcurrency);
      assert.equal(LOOP_BOUND_CONFIG_RESOLVERS["work.loop.concurrency"], loopConcurrencyFromConfig);
      assert.deepEqual([...LOOP_BOUND_VALUE_KEYS].sort(), [...LOOP_BOUND_CONFIG_KEYS].sort());
      assert.equal(LOOP_BOUND_VALUE_KEYS.length, 9);
      assert.equal(LOOP_BOUND_CONFIG_KEYS.length, 9);
      // APPENDED LAST: the eight keys 69 and 61 declared keep their order in both lists.
      assert.equal(LOOP_BOUND_CONFIG_KEYS.at(-1), "work.loop.concurrency");
      assert.equal(LOOP_BOUND_VALUE_KEYS.at(-1), "work.loop.concurrency");
      assert.deepEqual(LOOP_BOUND_CONFIG_KEYS.slice(0, 8), Object.keys(defaults).map((field) => `work.loop.${field}`), "the eight before it are the deadline policy's, in its order");
      assert.equal(resolvesLoopBoundConfigKey("work.loop.concurrency"), true);
    },
  },
  // Scenario Outline: the range probe admits exactly the two modes — through the resolver
  // alone (`resolve(p) === p`), with no table anywhere to widen.
  ...[
    ["\"sequential\"", "sequential", true, null, "sequential"],
    ["\"refine_first\"", "refine_first", true, null, "refine_first"],
    ["\"parallel\"", "parallel", false, OUTSIDE_DECLARED_RANGE, "sequential"],
    ["\"Sequential\"", "Sequential", false, OUTSIDE_DECLARED_RANGE, "sequential"],
    ["3", 3, false, OUTSIDE_DECLARED_RANGE, "sequential"],
    ["undefined", undefined, false, OUTSIDE_DECLARED_RANGE, "sequential"],
    ["null", null, false, OUTSIDE_DECLARED_RANGE, "sequential"],
  ].map(([label, proposed, admissible, code, inEffect]) => ({
    name: `129/01/00 range probe — ${label} for work.loop.concurrency is ${admissible ? "admissible" : "refused"} (in effect "${inEffect}")`,
    run() {
      const probed = rangeProbe("work.loop.concurrency", proposed);
      assert.equal(probed.admissible, admissible);
      assert.equal(probed.code, code);
      assert.equal(probed.inEffect, inEffect);
      assert.equal(probed.key, "work.loop.concurrency");
      assert.equal(probed.admissible, probed.inEffect === proposed, "the verdict is the resolver's own answer");
    },
  })),
  // Scenario Outline: no one-notch step on the mode is admissible, from either mode in either
  // direction. `from + step` on a string is a string the resolver does not know, so the SAME
  // arithmetic that bounds a number refuses the mode — nothing is special-cased for it.
  ...[
    ["sequential", 1],
    ["sequential", -1],
    ["refine_first", 1],
    ["refine_first", -1],
  ].map(([from, step]) => ({
    name: `129/01/00 step probe — from "${from}" a step of ${step > 0 ? "+1" : "-1"} on work.loop.concurrency is refused`,
    run() {
      const probed = stepProbe("work.loop.concurrency", from, step);
      assert.equal(probed.admissible, false);
      assert.equal(probed.code, OUTSIDE_DECLARED_RANGE);
      assert.equal(probed.inEffect, "sequential");
      assert.equal(probed.from, from);
      assert.equal(probed.step, step);
    },
  })),
  {
    name: "129/01/00 a step taken from the configured mode is refused the same way",
    run() {
      const workspace = { config: { work: { loop: { concurrency: "refine_first" } } } };
      const probed = stepProbeFromConfig(workspace, "work.loop.concurrency", 1);
      assert.equal(probed.admissible, false);
      assert.equal(probed.code, OUTSIDE_DECLARED_RANGE);
      assert.equal(probed.from, "refine_first");
      assert.equal(probed.step, 1);
    },
  },
  {
    name: "129/01/00 the deadline policy gains no mode — loopBoundsFromConfig is eight keys, with or without the key configured",
    run() {
      const configured = loopBoundsFromConfig({ config: { work: { loop: { concurrency: "refine_first" } } } });
      assert.deepEqual(Object.keys(configured), [
        "startToCloseMs", "heartbeatMs", "scheduleToStartMs", "scheduleToCloseMs",
        "startupGraceMs", "reviewRounds", "buildNoProgressRounds", "progressMaxResets",
      ]);
      assert.equal(Object.keys(configured).includes("concurrency"), false);
      assert.deepEqual(configured, loopBoundsFromConfig({ config: {} }), "byte-identical to a workspace with no work.loop block");
      assert.deepEqual(configured, defaults);
    },
  },
];
