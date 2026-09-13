// FF-5408 (milestone 54 / ADR-006) — THE SUBJECT IS EMITTED, NEVER INFERRED.
//
// This is the milestone's own thesis pointed at its own code. `68/03` retired a regex
// classifier over runner output — *"the regex retired, and a classifier that reports what a
// result EMITS"* — and `acd-loop-probe-contract` already forbids that shape in the loop
// shell. 54 adds two new places it could come back: a report normaliser that could read a
// case's NAME for its status, and a traceability lane that could guess which scenario a case
// meant. Neither does, and this is where that stops being a promise.
//
// Three claims, each with a measured reason:
//
//   IDENTITY comes from the parsed report's own MARKER FIELDS. `node-mixed.tap` (54/00's
//   committed capture) carries a PASSING case whose name contains "fail" and a FAILING one
//   whose name contains "ok" — captured from a real run precisely so this cannot be got right
//   by accident. A normaliser reading names would invert both.
//
//   THE SCENARIO PAIRING is a name CONTAINMENT over scenarios parsed by the repository's one
//   feature parser, with an `unjoined` result REPORTED rather than guessed. Measured across
//   this tree: 0 exact matches between 4,744 scenario names and 5,725 test names, 1,203
//   containment hits. A fallback that guesses is worse than a gap (`68/ADR-005`).
//
//   THE LOOP SHELL'S NO-PROSE-MATCH PROPERTY HOLDS OVER THE GRADE PATH. `acd-loop-probe-contract`
//   asserts the shell never attributes a stop by matching rendered prose; the same rule now
//   binds the modules the grade added.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { normaliseTap, CASE_STATUSES } from "../../../src/work/grade.mjs";
import { joinCases, executableScenariosOf } from "../../../src/work/doctor-rubric.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules the grade path added, plus the lane that joins over it. The scan is over this
// family rather than over one file (`m15/R3`: a fitness grep must scan the whole module
// family it governs) — a classifier added to the command instead of the compiler would
// otherwise walk straight past.
const GRADE_PATH = Object.freeze([
  "src/work/grade.mjs",
  "src/commands/grade.mjs",
  "src/work/doctor-rubric.mjs",
]);

// Deriving a STATUS from a case's free text. The shapes a classifier actually takes: a
// name/message tested for a status word, or a status assigned from such a test.
const PROSE_STATUS_MATCH = [
  /\b(?:name|message|text|line|title)\b[^;\n]{0,40}\.(?:includes|match|test|indexOf|search)\s*\(\s*["'`/][^"'`/\n]*(?:fail|pass|skip|error|ok)\b/iu,
  /\/[^/\n]*\b(?:fail|pass|skip)(?:ed|ing)?\b[^/\n]*\/[gimsuy]*\.test\s*\(\s*(?:name|message|text|title)/iu,
];

export const archTests = [
  {
    name: "arch/FF-5408: identity and status come from the format's own marker fields, never from the words in a name",
    run: () => {
      // THE CAPTURE THIS RULE EXISTS FOR, driven through the real normaliser: a PASSING case
      // whose name says "fail", and a FAILING one whose name says "ok".
      const misleading = [
        "TAP version 13",
        "ok 1 - a case that will fail if the parser reads names",
        "not ok 2 - ok, this one is really a failure",
        "1..2",
      ].join("\n");
      const parsed = normaliseTap(misleading);
      assert.equal(parsed.ok, true, "guard: the text really is TAP");
      assert.equal(parsed.cases.length, 2, "guard: both cases were enumerated");

      const byName = Object.fromEntries(parsed.cases.map((entry) => [entry.name, entry.status]));
      assert.equal(byName["a case that will fail if the parser reads names"], "passed", "a case NAMED fail is read as PASSED, from its marker");
      assert.equal(byName["ok, this one is really a failure"], "failed", "…and a case NAMED ok as FAILED");
      for (const entry of parsed.cases) {
        assert.ok(entry.status === null || CASE_STATUSES.includes(entry.status), `${entry.name}: the status is a member of the frozen vocabulary`);
      }
    },
  },

  {
    name: "arch/FF-5408: no module on the grade path derives a status from a case's free text",
    run: async () => {
      const offenders = [];
      for (const module of GRADE_PATH) {
        const body = stripComments(await readFile(path.join(repoRoot, module), "utf8"));
        for (const pattern of PROSE_STATUS_MATCH) {
          if (pattern.test(body)) offenders.push(`${module} matches ${pattern}`);
        }
      }
      assert.deepEqual(offenders, [], `a status is derived from free text in: ${offenders.join("; ")}`);

      // NON-VACUITY: the detector has teeth. Both planted shapes are the real thing a
      // classifier looks like, and both are caught.
      const planted = [
        'const status = name.includes("fail") ? "failed" : "passed";',
        'if (/failed|failing/.test(message)) return "failed";',
      ];
      for (const shape of planted) {
        assert.ok(PROSE_STATUS_MATCH.some((pattern) => pattern.test(shape)), `a planted classifier is detected: ${shape}`);
      }
    },
  },

  {
    name: "arch/FF-5408: the scenario pairing is containment over PARSED scenarios, and an unjoined result is reported rather than guessed",
    run: async () => {
      // CONTAINMENT, AND NOTHING WEAKER: a near-match is a miss, and the miss is REPORTED.
      const scenarios = [{ name: "the ratchet is the backstop", file: "tasks/00.feature" }];
      const near = joinCases(scenarios, [{ name: "the ratchet is a backstop", status: "passed" }]);
      assert.deepEqual(near.joins, [], "a near-match joins nothing");
      assert.equal(near.unjoinedCases.length, 1, "…the case is reported unjoined");
      assert.equal(near.unjoinedScenarios.length, 1, "…and so is the scenario");

      // THE SCENARIOS ARE PARSED, NOT GREPPED: an `@executable` scenario is one the parser
      // resolved to that lane, so a `@manual` scenario never enters the join however its
      // name reads.
      const parsedOnly = executableScenariosOf({
        featureTexts: {
          "tasks/00.feature": "@manual\nFeature: F\n\n  Scenario: a manual scenario\n    Given a\n    When b\n    Then c\n",
        },
      });
      assert.deepEqual(parsedOnly, [], "a @manual scenario is not offered to the join");

      // NO FUZZY FALLBACK ANYWHERE ON THE PATH. A guess is worse than a gap (`68/ADR-005`),
      // so the shapes a guess takes must be absent.
      for (const module of GRADE_PATH) {
        const body = stripComments(await readFile(path.join(repoRoot, module), "utf8"));
        for (const guess of ["levenshtein", "editDistance", "fuzzy", "similarity", "closestMatch", "bestMatch"]) {
          assert.ok(!new RegExp(guess, "iu").test(body), `${module} carries no fuzzy fallback (found ${guess})`);
        }
      }
    },
  },

  {
    name: "arch/FF-5408: the loop shell's no-prose-match property holds over the grade path",
    run: async () => {
      // `acd-loop-probe-contract` asserts the SHELL never attributes a stop by matching
      // rendered prose (`message.includes(` / `message.match(`). The same rule binds the
      // modules the grade added — a producer decided from a message is the same defect one
      // layer down.
      for (const module of GRADE_PATH) {
        const body = stripComments(await readFile(path.join(repoRoot, module), "utf8"));
        assert.doesNotMatch(body, /message\.(?:includes|match)\s*\(/u, `${module} attributes nothing by matching rendered prose`);
      }
      // …AND THE SHELL ITSELF STILL HOLDS IT, over the rungs 54/02 added.
      const shell = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
      assert.doesNotMatch(shell, /message\.(?:includes|match)\s*\(/u, "the loop shell's own property is unchanged by the new gate rungs");
    },
  },
];
