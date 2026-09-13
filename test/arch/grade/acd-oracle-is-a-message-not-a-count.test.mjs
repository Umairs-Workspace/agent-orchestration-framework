import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";

// FF-5706 (ADR-006). Milestone 56's decisive result is the whole reason this control exists:
// banking five REAL violations into a shrink-only ratchet's baseline made the arch set report one
// FEWER failure, 9 → 8. The gaming move does not evade a count oracle — it IMPROVES it. So ADR-006
// bans the count oracle structurally rather than by convention, in two places:
//
//   §1 — no module ADDED by this milestone may decide a gate's health by comparing a pass/fail
//        tally. Its oracles compare dispositions and MESSAGES.
//   §2 — no record in `src/bundle/loops/` may declare an arch-failure count as its `controlled:`
//        or its `counter:`, because a watcher measuring that number is measuring the one metric 56
//        proved is improved by the gaming move it exists to catch.
//
// SCOPE, STATED RATHER THAN IMPLIED. "Added by 57" is the four NEW modules ADR-007 §1 assigns to
// 57/03 and 57/04. The milestone's other four subject files (`src/work/loops.mjs`,
// `src/work/loops-checks.mjs`, `src/commands/loops-validate.mjs`, `src/feature-parse.mjs`) were
// WIDENED, not added, and each is pinned by its own control (FF-5701/5702/5703/5704). Widening the
// literal here would silently take ownership of assertions those four already make.
//
// THE §2 LEG DELIBERATELY OVERLAPS `acd-day-one-pairing-complete`'s third test, and the overlap is
// a decision rather than an oversight: FF-5706 is DECLARED as enforcing both legs, so the file its
// declaration cites has to enforce both. A control that silently delegates half of itself to
// another file reads as landed while half of it is unguarded — the exact shape `F-57-03-2` found.
//
// OWNERSHIP. `F-57-03-4` established that FF-5706 cannot belong to 57/03: §1 spans 57/03's AND
// 57/04's modules and §2 is over 57/05's `src/bundle/loops/`. It is a MILESTONE-level control, and
// it lands here, at the milestone gate, in its own labelled registration block.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const loopsDir = path.join(root, "src", "bundle", "loops");

// ADR-007 §1: the modules milestone 57 ADDED. 57/03 owns the first two, 57/04 the second two.
const ADDED_MODULES = Object.freeze([
  "src/work/ratchet.mjs",
  "src/commands/ratchet.mjs",
  "src/work/counters.mjs",
  "src/commands/counters.mjs",
]);

// LEG A — a test-runner surface. A module that runs the suite, or parses a runner's report, is one
// step from an oracle over its tallies whether or not it compares one today.
const RUNNER_SURFACE = /node:test\b|scripts.test\.mjs|--test\b|test-rubric|\btap\b|\bTAP\b/u;

// LEG B — a pass/fail TALLY IDENTIFIER. `failureReason`, `terminalFailure` and `state === "failed"`
// are deliberately NOT tallies: the vocabulary requires an explicit count noun welded to the
// pass/fail word, which is what makes this a count rather than a state.
const TALLY_IDENTIFIER = /\b(?:pass(?:ed|ing|es)?|fail(?:ed|ing|ures?|s)?|green|red|arch)(?:Count|Total|Tally|Num|Number)\b|\b(?:count|total|tally|num|number)Of(?:Pass|Fail|Green|Red|Arch)/iu;

// LEG C — a tally COMPARISON: the count of a failure/pass collection on either side of a relational
// or equality operator. This is the shape 56 measured — `after.failures < before.failures` reads
// green for the change that banked the violations.
const TALLY_LENGTH = String.raw`(?:pass(?:es|ed|ing)?|fail(?:ed|ing|ures?|s)?|greens?|reds?)\s*(?:\?\.|\.)\s*(?:length|size)`;
const COMPARISON = String.raw`(?:[<>]=?|[!=]==?)`;
const TALLY_COMPARISON_LEFT = new RegExp(String.raw`\b${TALLY_LENGTH}\s*${COMPARISON}`, "iu");
const TALLY_COMPARISON_RIGHT = new RegExp(String.raw`${COMPARISON}\s*\b${TALLY_LENGTH}`, "iu");

// ADR-006 §2 — the banned METRIC. Held identical to the phrasing `acd-day-one-pairing-complete`
// uses, deliberately: two controls asserting one ADR clause must not drift into two rules.
const ARCH_FAILURE_COUNT = /(?:arch.?failure|failing fitness|failed fitness).*(?:count|number|tally)|count.*(?:arch.?failure|failing fitness)/iu;

async function shippedFiles() {
  const names = (await readdir(loopsDir)).filter((name) => name.endsWith(".md"));
  assert.ok(names.length > 0, `the sweep of ${loopsDir} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
  const entries = await Promise.all(names.map(async (name) => [name, await readFile(path.join(loopsDir, name), "utf8")]));
  return Object.fromEntries(entries);
}

export const archTests = [
  {
    name: "arch/57 FF-5706: no module milestone 57 added decides a gate's health by a pass/fail tally (ADR-006 §1)",
    run: async () => {
      let scanned = 0;
      for (const rel of ADDED_MODULES) {
        const raw = await readFile(path.join(root, rel), "utf8");
        // NON-VACUITY, per module rather than per corpus: a renamed or emptied module must fail as
        // "nothing was read", never pass as "nothing was wrong".
        assert.ok(raw.length > 200, `${rel}: read ${raw.length} bytes — the module was actually walked`);
        scanned += 1;
        // Comments stripped: ADR-006 is CITED in these modules' headers, and a prose citation of the
        // ban is not a violation of it.
        const code = stripComments(raw);
        assert.doesNotMatch(code, RUNNER_SURFACE, `${rel}: names a test-runner surface — a module that reads a runner's report is one step from an oracle over its tallies (ADR-006 §1)`);
        assert.doesNotMatch(code, TALLY_IDENTIFIER, `${rel}: carries a pass/fail tally identifier — this milestone's oracles compare dispositions and messages, never counts (ADR-006 §1)`);
        assert.doesNotMatch(code, TALLY_COMPARISON_LEFT, `${rel}: compares the length of a pass/fail collection — the count oracle 56 measured as IMPROVED by the gaming move (ADR-006 §1)`);
        assert.doesNotMatch(code, TALLY_COMPARISON_RIGHT, `${rel}: compares against the length of a pass/fail collection — the count oracle 56 measured as IMPROVED by the gaming move (ADR-006 §1)`);
      }
      assert.equal(scanned, ADDED_MODULES.length, `all ${ADDED_MODULES.length} modules milestone 57 added were scanned`);
    },
  },
  {
    name: "arch/57 FF-5706: no shipped loop record declares an arch-failure count as its controlled variable or its counter (ADR-006 §2)",
    run: async () => {
      const files = await shippedFiles();
      await withLoopRegistry(files, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        // NON-VACUITY: the census names the shipped registry, so a registry that loaded nothing
        // cannot pass every leg below in silence.
        assert.ok(model.nodes.length >= 14, `the shipped registry loaded ${model.nodes.length} nodes`);
        let declared = 0;
        for (const node of model.nodes) {
          for (const field of ["controlled", "counter"]) {
            const value = node.fields[field]?.raw ?? "";
            if (value === "") continue;
            declared += 1;
            assert.doesNotMatch(value, ARCH_FAILURE_COUNT, `${node.id}: ${field} declares an arch-failure count — the one metric 56 proved is IMPROVED by banking real violations (ADR-006 §2)`);
          }
        }
        assert.ok(declared >= 10, `${declared} controlled/counter declarations were read — the sweep is non-vacuous`);
      });
    },
  },
];
