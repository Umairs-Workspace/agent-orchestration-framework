// Fitness function: FF-6304 — A DECLARED LEVEL IS A CEILING REQUEST, AND ADMISSION STAYS IN ONE
// HOME (63/ADR-004, ADR-010 §7, §11).
//
// Nine legs. Each fails for a different reason, and each is one a cheap conforming edit would
// otherwise satisfy while holding nothing:
//
//   1 · THE LEAF HOLDS NO GATE. `src/work-trigger/level.mjs` contains no score threshold, no
//       `100`, no groundedness predicate, no component-state literal and NO LEVEL LITERAL AT ALL —
//       not even the one an `if (level === the gated rung)` branch would have needed, because the
//       leaf asks the GATE whether a rung is gated instead of knowing. Asserted over the source
//       with comments stripped, because the ban is on code and this file's header has to be able
//       to name what it forbids.
//   2 · THE ONE HOME IS REACHED BY IMPORT, AND IT IS THE SAME HOME THE LOOP GATES WITH.
//       `resolveLoopLevel` and `resolveLoopLevelGate` are the leaf's ONLY imports, and
//       `src/commands/loop.mjs` gates at fire time through that same `resolveLoopLevelGate` — so
//       "the loop's own gate" and "the pre-flight's gate" are provably one function rather than
//       two that happen to agree today.
//   3 · THE FACTS ARE HANDED IN. No filesystem read, no `invoke`, no clock and no cwd anywhere in
//       the leaf — and the pair of fact names the leaf reports as missing is asserted to be
//       EXACTLY what the real gate consults, driven through a RECORDING PROXY, so the pair cannot
//       drift into a private copy that names a reading the gate stopped reading.
//   4 · NO COMPILED TRIGGER CARRIES AN ADMISSION VERDICT, asserted over the compiled object's own
//       keys and over the SHIPPED declaration, so a declaration-time answer has nowhere to cache.
//   5 · THE NO-SILENT-DOWNGRADE LEG IS DRIVEN POSITIVELY. Over a fixture whose gate fails, a
//       trigger declaring the gated rung resolves to a REFUSAL naming the failing half, and the
//       resolved set contains NO entry for that trigger at ANY level — a downgrade cannot hide as
//       a successful resolution one rung down.
//   6 · THE FAILING-HALF VOCABULARY IS THE GATE'S OWN OBJECT, not a re-phrasing: the halves, the
//       score payload and the groundedness payload are compared value-for-value against what
//       `resolveLoopLevelGate` returned for the same facts.
//   7 · RESOLUTION IS A PURE FUNCTION OF THE FACTS HANDED IN — the same trigger with two different
//       readings yields two different answers WITHIN ONE PROCESS, which is what "never cached"
//       means operationally.
//   8 · A FACT NEVER SUPPLIED AND A FACT THAT FAILED ARE DIFFERENT ANSWERS (ADR-010 §7).
//       `l3ScoreFailure` and `l3GroundednessFailure` render them identically, so the leaf is the
//       only place the difference survives: the two refusals must differ in CODE, and the check
//       that produces the first must compute no score, threshold or component verdict — a
//       precondition, not the second gate this row forbids.
//   9 · A READING NO GATE HALF CAN BE READ FROM IS THE EXIT-0 SIDE (ADR-010 §11). A resolution WAS
//       produced and its content is a refusal: each affected trigger is refused by name, carries
//       no resolution at any level, and nothing throws. This is distinguished from FF-6303's
//       non-zero side, where no resolution was produced at all.
//
// LEG 1's bans are each driven against a PLANTED violation, so a regex that stopped matching
// anything is not mistaken for a file that stopped containing anything, and LEG 2's import parse
// is driven against every import FORM it must not be blind to. Legs 3-9 are non-vacuous by
// POSITIVE ASSERTION instead: each drives the real resolver over real facts and requires a
// specific answer, so there is no shape in which they assert nothing. The two methods are named
// apart here because a header claiming one method for all nine would be the same species of
// overstatement these controls exist to catch.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertFamilyPurity } from "../../support/module-family.mjs";

import {
  TRIGGER_GATE_FACTS,
  TRIGGER_LEVEL_FACTS_NOT_SUPPLIED,
  resolveTriggerLevel,
  resolveTriggerLevels,
} from "../../../src/work-trigger/level.mjs";
import { bundledTriggerDeclaration, compileTriggerDeclaration } from "../../../src/work-trigger/declaration.mjs";
import { L3_SCORE_THRESHOLD, LOOP_LEVELS, resolveLoopLevelGate } from "../../../src/work/loop.mjs";
// LINE COMMENTS FIRST, THEN BLOCKS — and that ORDER is the whole reason this is imported rather
// than written here. The first cut of this control cloned the three-line function with the two
// passes INVERTED, which is TECH_DEBT item 24's measured defect: a `//` comment containing `/*`
// opens a block-comment run for a block-first stripper, and everything to the next `*/` is
// deleted — 9,192 characters of `src/mesh/ui-serve.mjs`, including its whole route table. Leg 1
// sweeps the REMAINDER, so that deletion makes every ban below report green over a region it
// never read, with all three of leg 1's own non-vacuity guards still passing. The one home is
// `test/support/source-slice.mjs`; 52 gates already read it from there and this is the 53rd.
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEAF_PATH = path.join(REPO_ROOT, "src", "work-trigger", "level.mjs");
const LOOP_COMMAND_PATH = path.join(REPO_ROOT, "src", "commands", "loop.mjs");

const read = (file) => readFileSync(file, "utf8");

// EVERY module a file reaches, in EVERY form the language offers — named, bare, default,
// namespace, mixed, re-export, dynamic `import()` and `require()`. Leg 2's whole argument is that
// the leaf's import CLOSURE is two files and therefore reaches no filesystem, no clock and no
// registry, and that argument is sound ONLY if this list is complete. The first cut of leg 2 saw
// named and bare imports and nothing else, so `import nodePath from "node:path"` was invisible to
// it and the closure claim rested on a parse blind to half the ways of adding to the closure.
function moduleSpecifiers(code) {
  return [...new Set(importSpecifiers(code).map((entry) => entry.specifier))].sort();
}

// THE GATED RUNG, DISCOVERED RATHER THAN SPELLED. A rung that needs facts refuses when handed
// none; a rung that needs none admits. This is the same question the leaf asks, so if the ladder
// ever gates a second rung, this control follows it instead of pinning yesterday's.
const gatedRungs = () => LOOP_LEVELS.filter((level) => resolveLoopLevelGate(level, {}).admitted !== true);
const GATED_RUNG = gatedRungs()[0];

// ─── fixtures: the readings a doctor and a groundedness report actually return ──────────
const passingFacts = () => ({
  loopReady: {
    score: L3_SCORE_THRESHOLD,
    clears: GATED_RUNG,
    checks: [{ id: "loops-declared", state: "pass" }],
    blocking: [],
  },
  groundedness: { state: "reported", present: true, components: [], authorities: [] },
});

const failingFacts = () => ({
  loopReady: {
    score: L3_SCORE_THRESHOLD - 1,
    clears: "L2",
    checks: [{ id: "anchors-declared", state: "fail" }],
    blocking: ["anchors-declared"],
  },
  groundedness: {
    state: "reported",
    present: true,
    components: [{ verdict: "stale", members: ["loop:build"], groundClasses: [], staleAuthorities: [{ anchor: "a", pointer: "p" }] }],
    authorities: [{ anchor: "a", pointer: "p", resolved: false }],
  },
});

// The registry answered, and what it answered cannot be read from (ADR-010 §11).
const unusableFacts = () => ({
  loopReady: { score: null, clears: "none", checks: [{ id: "loops-declared", state: "not-applicable" }], blocking: [] },
  groundedness: { state: "unavailable", present: false, components: [], authorities: [], error: "not reachable" },
});

const member = (overrides = {}) => ({
  id: "t-0",
  protects: "the driver from stalling unattended",
  source: "cron",
  scope: "63",
  level: GATED_RUNG,
  ...overrides,
});

export const archTests = [
  {
    name: "FF-6304/1 the leaf holds no threshold, no groundedness predicate, no component-state literal and no level literal at all",
    run: () => {
      const code = stripComments(read(LEAF_PATH));

      // Non-vacuity FIRST: the stripper removed comments and left the module.
      assert.match(code, /export function resolveTriggerLevel\(/, "the stripped source is still the module");
      assert.match(code, /resolveLoopLevelGate\(level, facts\)/, "…including the delegation this control is about");
      assert.equal(/CEILING REQUEST/.test(code), false, "…and the comments really were stripped");

      const bans = [
        [/\b100\b/, "a bare score threshold", "if (score >= 100) return true;"],
        [/L3_SCORE_THRESHOLD/, "the threshold constant", "import { L3_SCORE_THRESHOLD } from '../work/loop.mjs';"],
        // Relational comparison of a score, or ANY comparison of one against a number — the two
        // shapes a copied threshold has. A nullish check on a reading the gate already refused is
        // neither, and is what rendering a refusal the gate produced actually needs.
        [/\.score\s*[<>]/, "score arithmetic", "if (facts.loopReady.score < threshold) return null;"],
        [/score\s*[<>=!]==?\s*-?\d/, "a score compared against a number", "if (loopReady.score === 100) return admit();"],
        // A RUNG ANYWHERE, not only a rung that is the WHOLE string. The first cut banned
        // `(["'`])L\d+\1`, which matches a level literal standing alone and nothing else — so
        // hard-coding the rung INSIDE the interpolated refusal message at `level.mjs:106` passed
        // it. The comments are stripped above, so any surviving `L<n>` token is a rung this file
        // holds, wherever it sits: in a longer string, inside an interpolation, or in code.
        [/\bL\d+\b/, "a level literal", [
          'if (level === "L3") return refuse();',
          'return `L3 is gated, and the gate facts were not handed in: ${missing}`;',
          "const reason = 'the rung L3 needs both halves';",
          "const top = LOOP_LEVELS.includes(L3) ? L3 : null;",
        ]],
        [/["'`](self-referential|stale|exogenous-only|grounded)["'`]/, "a component-state literal", 'components.filter((row) => row.verdict === "stale")'],
        [/\.verdict\s*[=!]==?/, "a groundedness predicate", "if (component.verdict !== 'grounded') return false;"],
        [/\.(present|components)\s*[=!]==?/, "a groundedness predicate", "if (report.present !== true) return refuse();"],
        [/\bthreshold\s*[=:]\s*\d/, "a threshold of its own", "const threshold = 100;"],
        [/LOOP_LEVELS|LOCKED_LOOP_LEVELS/, "a ladder read the leaf has no use for", "const top = LOOP_LEVELS[2];"],
        [/node:fs|readFile|readFileSync|existsSync|writeFile/, "a filesystem read", 'import { readFile } from "node:fs/promises";'],
        [/\binvoke\w*\(/, "a registry call", 'await invokeRegistered("work:doctor", {}, ctx);'],
        [/Date\.now\(|new Date\(|process\.(cwd|env)/, "a clock or an ambient reading", "const now = Date.now();"],
      ];
      for (const [pattern, what, planted] of bans) {
        assert.equal(pattern.test(code), false, `src/work-trigger/level.mjs contains ${what}`);
        for (const sample of [].concat(planted)) {
          assert.equal(pattern.test(sample), true, `the ban on ${what} would catch a planted \`${sample}\``);
        }
      }
    },
  },

  {
    name: "FF-6304/2 the one home is reached by IMPORT, and it is the same home the loop gates with at fire time",
    run: async () => {
      const code = stripComments(read(LEAF_PATH));

      // The closure, parsed in EVERY form — this is the list the "no file is read" argument rests
      // on, so a form it cannot see is a hole in the argument rather than a gap in the sweep.
      assert.deepEqual(moduleSpecifiers(code), ["../work/loop.mjs"],
        "the leaf reaches the one gate home and nothing else at all, by any import form");

      const named = /\bimport\s*\{([^}]*)\}\s*from\s*["']\.\.\/work\/loop\.mjs["']/.exec(code);
      assert.ok(named, "…and it reaches it through a NAMED import, so no namespace binding is in scope");
      assert.deepEqual(
        named[1].split(",").map((name) => name.trim()).filter(Boolean).sort(),
        ["resolveLoopLevel", "resolveLoopLevelGate"],
        "…importing exactly the two deciders, so nothing else could be re-derived from it",
      );

      // …and no route to a module that bypasses the import list at all.
      for (const [pattern, what] of [
        [/\brequire\s*\(/, "a CJS require"],
        [/\bimport\s*\(/, "a dynamic import"],
        [/createRequire/, "a require bridge"],
        [/\beval\s*\(/, "an eval"],
        [/new\s+Function\s*\(/, "the Function constructor"],
        [/process\.binding/, "a process binding"],
      ]) {
        assert.equal(pattern.test(code), false, `the leaf holds ${what}`);
      }

      // Non-vacuity: every form the first cut of this parse was BLIND to is seen now.
      for (const [planted, expected] of [
        ['import nodePath from "node:path";', "node:path"],
        ['import * as fs from "node:fs";', "node:fs"],
        ['import def, { readFile } from "node:fs/promises";', "node:fs/promises"],
        ['import def, * as ns from "node:os";', "node:os"],
        ['const fs = await import("node:fs");', "node:fs"],
        ['const fs = require("node:fs");', "node:fs"],
        ['export { readFile } from "node:fs/promises";', "node:fs/promises"],
        ['import "node:fs";', "node:fs"],
        ['import { resolveLoopLevel } from "../work/loop.mjs";', "../work/loop.mjs"],
      ]) {
        assert.ok(moduleSpecifiers(planted).includes(expected), `a planted \`${planted}\` is seen`);
      }

      // The SAME function is what `src/commands/loop.mjs` gates with when the loop is entered, so
      // the pre-flight and the fire-time gate cannot be two implementations that agree today.
      const loopCommand = read(LOOP_COMMAND_PATH);
      assert.match(loopCommand, /^\s*resolveLoopLevelGate,\s*$/m, "the loop command imports the same gate");
      assert.match(loopCommand, /requireDecision\(resolveLoopLevelGate\(/, "…and gates the level through it at fire time");

      // THE WHOLE IMPORT CLOSURE, not just the leaf's own line. `src/work/loop.mjs` imports
      // nothing at all — its own contract, pinned by `acd-loop-module-import-boundary` — so the
      // closure is two files and NEITHER can reach a filesystem, a registry or a clock. That is
      // "no file is read" proven statically and completely rather than spot-checked.
      const engine = stripComments(read(path.join(REPO_ROOT, "src", "work", "loop.mjs")));
      // PURITY IS EXTERNAL (119/ADR-002): the closure ends here because the gate home depends on
      // nothing outside itself, which is a claim about its specifiers rather than about its file
      // count. Splitting the gate home stays legal; reaching out of it does not.
      await assertFamilyPurity(assert, REPO_ROOT, "src/work/loop");
      assert.match(engine, /export function resolveLoopLevelGate\(/, "…and it really is the gate home");
    },
  },

  {
    name: "FF-6304/3 the gate facts are HANDED IN, and the pair the leaf names is exactly the pair the real gate consults",
    run: () => {
      // A recording proxy through the REAL gate: whatever it reads is what a caller must hand in,
      // and is what a refusal must be able to name as missing.
      const consulted = [];
      resolveLoopLevelGate(GATED_RUNG, new Proxy({}, {
        get(_target, key) { consulted.push(String(key)); return undefined; },
      }));
      assert.deepEqual(
        [...new Set(consulted)].sort(),
        [...TRIGGER_GATE_FACTS].sort(),
        "TRIGGER_GATE_FACTS is the gate's own pair, not a private copy that could drift",
      );
      assert.equal(TRIGGER_GATE_FACTS.length, 2, "…and it is the two halves, not one of them");
      assert.ok(Object.isFrozen(TRIGGER_GATE_FACTS));

      // Exactly one rung is gated, which is what makes the leaf's probe ("put it to the gate with
      // no facts") a complete answer rather than a coincidence.
      assert.deepEqual(gatedRungs(), [GATED_RUNG], "exactly one rung needs facts");
    },
  },

  {
    name: "FF-6304/4 no compiled trigger carries an admission verdict — over a fixture and over the SHIPPED declaration",
    run: () => {
      const admissionVocabulary = [
        "admitted", "admission", "refusal", "refused", "resolved", "resolvedLevel", "resolvedFor",
        "preflight", "requestedLevel", "code", "failingHalves", "missing", "gate", "loopReady", "groundedness",
      ];
      const sets = [compileTriggerDeclaration({ version: 1, members: [member(), member({ id: "t-1", level: "L1" })] })];
      if (existsSync(path.join(REPO_ROOT, "src", "bundle", "triggers.jsonc"))) {
        sets.push(compileTriggerDeclaration(bundledTriggerDeclaration()));
      }
      let compiledCount = 0;
      for (const compiled of sets) {
        assert.ok(compiled.triggers.length > 0, "a compiled set with no members would assert nothing");
        for (const entry of compiled.triggers) {
          compiledCount += 1;
          for (const word of admissionVocabulary) {
            assert.equal(word in entry, false, `a compiled trigger carries no ${word}`);
          }
          assert.equal(typeof entry.level, "string", "it carries only the level it was DECLARED with");
        }
      }
      assert.ok(compiledCount >= 2, "the leg ran over real compiled triggers");
    },
  },

  {
    name: "FF-6304/5 no silent downgrade — driven POSITIVELY: over failing facts the resolved set carries no entry at any level",
    run: () => {
      const compiled = compileTriggerDeclaration({ version: 1, members: [member({ id: "asks-for-the-rung" })] });
      const resolution = resolveTriggerLevels(compiled.triggers, failingFacts());

      assert.deepEqual(resolution.resolved, [], "the resolved set carries no entry for it");
      for (const level of LOOP_LEVELS) {
        assert.equal(resolution.resolved.some((row) => row.level === level), false, `no entry at ${level}`);
      }
      assert.equal(resolution.refused.length, 1);
      const refusal = resolution.refused[0];
      assert.equal(refusal.code, "loop-level-gate", "…and the refusal names the failing half");
      assert.deepEqual(refusal.failingHalves, ["score", "groundedness"]);
      assert.equal("level" in refusal, false, "a refusal answers to NO level, so a downgrade has nowhere to hide");
      assert.equal(refusal.requestedLevel, GATED_RUNG, "…while the rung it asked for is still named");

      // Non-vacuity: the same trigger over passing facts DOES resolve, so the empty resolved set
      // above is a refusal and not a resolver that resolves nothing.
      assert.equal(resolveTriggerLevels(compiled.triggers, passingFacts()).resolved.length, 1);
    },
  },

  {
    name: "FF-6304/6 the failing-half vocabulary is the GATE'S OWN OBJECT, never a re-phrasing",
    run: () => {
      const handed = failingFacts();
      const gate = resolveLoopLevelGate(GATED_RUNG, handed);
      const preflight = resolveTriggerLevel({ id: "t-0", level: GATED_RUNG }, handed);

      for (const key of ["code", "reason", "failingHalves", "score", "groundedness"]) {
        assert.deepStrictEqual(preflight[key], gate[key], `${key} is carried through verbatim`);
      }
      assert.equal(preflight.requestedLevel, gate.level, "and the requested rung is the gate's own level, re-keyed");
      // Nothing else about the gate reaches the pre-flight, and nothing the pre-flight adds is a
      // fact about the gate.
      const added = Object.keys(preflight).filter((key) => !(key in gate)).sort();
      assert.deepEqual(added, ["requestedLevel", "triggerId"], "the pre-flight adds only identity and the re-key");
      assert.deepEqual(Object.keys(gate).filter((key) => !(key in preflight)), ["level"]);
    },
  },

  {
    name: "FF-6304/7 resolution is a PURE FUNCTION of the facts handed in — two readings, two answers, one process",
    run: () => {
      const subject = { id: "t-0", level: GATED_RUNG };
      const admitted = resolveTriggerLevel(subject, passingFacts());
      const refused = resolveTriggerLevel(subject, failingFacts());
      const admittedAgain = resolveTriggerLevel(subject, passingFacts());

      assert.equal(admitted.resolved, true);
      assert.equal(refused.code, "loop-level-gate");
      assert.deepStrictEqual(admittedAgain, admitted, "and the third reading returns to the first answer");
      assert.deepStrictEqual(admitted, { ...admitted }, "nothing was memoised onto the answer");
      // Nothing was written back to the trigger: a cached verdict would have to live somewhere.
      assert.deepEqual(Object.keys(subject).sort(), ["id", "level"]);
    },
  },

  {
    name: "FF-6304/8 a fact never SUPPLIED and a fact that FAILED are different answers, and the presence check computes nothing",
    run: () => {
      const notSupplied = resolveTriggerLevel({ id: "t-0", level: GATED_RUNG }, undefined);
      const failed = resolveTriggerLevel({ id: "t-0", level: GATED_RUNG }, failingFacts());

      assert.notEqual(notSupplied.code, failed.code, "the two refusals differ in CODE");
      assert.equal(notSupplied.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
      assert.equal(failed.code, "loop-level-gate");
      assert.deepEqual(notSupplied.missing, [...TRIGGER_GATE_FACTS], "…and the absent refusal names which reading was missing");

      // One half at a time, so "missing" is a reading rather than a mood.
      for (const [fact, handed] of [["groundedness", { loopReady: passingFacts().loopReady }], ["loopReady", { groundedness: passingFacts().groundedness }]]) {
        const half = resolveTriggerLevel({ id: "t-0", level: GATED_RUNG }, handed);
        assert.equal(half.code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
        assert.deepEqual(half.missing, [fact]);
      }

      // The check is a PRECONDITION, not the second gate: it reports no score, no threshold and no
      // component verdict, because it read none.
      for (const word of ["score", "groundedness", "failingHalves", "threshold"]) {
        assert.equal(word in notSupplied, false, `the not-supplied refusal reports no ${word}`);
      }
      // …and it does not block a rung that never needed facts.
      assert.equal(resolveTriggerLevel({ id: "t-0", level: "L1" }, undefined).level, "L1");
    },
  },

  {
    name: "FF-6304/9 a reading no gate half can be read from produces a RESOLUTION whose content is a refusal — the exit-0 side",
    run: () => {
      const compiled = compileTriggerDeclaration({
        version: 1,
        members: [member({ id: "affected" }), member({ id: "unaffected", level: "L1" })],
      });
      let resolution = "NOTHING-WAS-RETURNED";
      assert.doesNotThrow(() => { resolution = resolveTriggerLevels(compiled.triggers, unusableFacts()); },
        "an unusable reading is an answer, not an exception");
      assert.notEqual(resolution, "NOTHING-WAS-RETURNED", "a resolution WAS produced");

      assert.deepEqual(resolution.refused.map((row) => row.triggerId), ["affected"], "the affected trigger is refused BY NAME");
      assert.deepEqual(resolution.resolved.map((row) => row.triggerId), ["unaffected"], "…and only it");
      assert.equal(resolution.refused[0].code, "loop-level-gate", "the reading was supplied, so it is a gate refusal");
      assert.deepEqual(resolution.refused[0].failingHalves, ["score", "groundedness"]);
      assert.equal(resolution.refused[0].score.score, null, "and it says the score was never read");
      assert.equal("level" in resolution.refused[0], false, "it carries no resolution at any level");
      // Distinguished from the not-supplied side, which is a different refusal entirely.
      assert.notEqual(resolution.refused[0].code, TRIGGER_LEVEL_FACTS_NOT_SUPPLIED);
    },
  },
];
