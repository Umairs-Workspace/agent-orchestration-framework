// Behavioural evidence for milestone 77 / story 03 — the declared bounds.
//
//   tasks/01_a-declared-bound-is-joined-against-the-reference.feature
//   tasks/02_the-refresh-is-hand-run-and-the-view-is-generated.feature (its determinism rows)
//
// The structural rows of both features — the network census over the family's import closure, the
// doors that must not open onto the refresh, and the reach for the registry module — are the
// control's, and live in `test/arch/grade/acd-reference-corpus-offline-and-sourced.test.mjs`.
//
// EVERY LOOP MODEL HERE IS PARSED BY THE SHIPPED LOADER over records on disk, rather than
// hand-shaped as an object. The lane takes the model INJECTED and must never care where it came
// from — but a fixture that invents the model's shape would drive the arithmetic and skip the one
// thing most likely to be wrong: that a `ceiling:` line as an author writes it becomes the entry
// this lane classifies. The absence cases are the loader's own answers too, for the same reason.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import { loopRecord, makeLoopRegistry, withLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { readFinding } from "../../../src/work-audit/reads.mjs";
import {
  BOUND_CONFIG_KEYS,
  DECLARED_BOUNDS_FINDING_CODES,
  DECLARED_BOUNDS_SWEEPS,
  DEFAULT_REFERENCE_STALE_WINDOW_MS,
  boundConfigKeyProblems,
  boundRange,
  declaredBoundValues,
  runDeclaredBounds,
} from "../../../src/work-audit/declared-bounds.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// A fixed instant, and a window short enough that a case can straddle it in one line.
const NOW = Date.parse("2026-06-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const WINDOW = 30 * DAY;
const dateDaysBefore = (days) => new Date(NOW - days * DAY).toISOString().slice(0, 10);

const refRow = (over = {}) => ({
  id: "reference-row",
  bound: "a step ceiling",
  value: 10,
  system: "Some System",
  source: "https://example.invalid/docs",
  checked: dateDaysBefore(1),
  ...over,
});

// The lane, with every input pinned so a case varies exactly one of them.
const lane = (over = {}) => runDeclaredBounds({
  model: { present: true, source: "<registry>", nodes: [], findings: [] },
  rows: [],
  declaredBounds: {},
  now: NOW,
  staleWindowMs: WINDOW,
  ...over,
});

const codes = (result, code) => result.findings.filter((finding) => finding.code === code);

/** One loop record with the given `ceiling:` line, parsed by the shipped loader. */
async function modelWithCeiling(ceiling, extra = {}) {
  return withLoopRegistry(
    { "one.md": loopRecord({ fields: { ceiling } }), ...extra },
    async (fixture) => ({ model: await loadLoops(fixture.workDir), recordPath: fixture.pathOf("one.md") }),
  );
}

export const declaredBoundsTests = [
  // ── THE LOOP SIDE ──────────────────────────────────────────────────────────────────────────
  {
    name: "declared-bounds: an uncapped or unknown ceiling is reported at error; a declared one is not",
    async run() {
      const rows = [
        ["uncapped", 1, "declared uncapped"],
        ["unknown", 1, "declared unknown"],
        ["none", 0, "declared none, the answer of a loop that terminates by construction"],
        // A POINTER IS AUTHORED AS A LIST — the loader admits `ceiling:` as a sentinel word or as a
        // list of pointers, and a bare `config:…` is `loop-bad-value`. The fixtures use the form a
        // shipped record uses, so the entry this lane classifies is the entry an author produces.
        ["[config:work.loop.reviewRounds]", 0, "a config: pointer naming a key the bounds home resolves"],
        ["[module:mod.mjs#SYM]", 0, "a module: pointer naming a symbol its module exports"],
      ];
      for (const [ceiling, count, what] of rows) {
        const extra = ceiling.includes("module:") ? { "mod.mjs": "export const SYM = 5;\n" } : {};
        const { model, recordPath } = await modelWithCeiling(ceiling, extra);
        const result = lane({ model });
        const undeclared = codes(result, "audit-bound-undeclared");
        assert.equal(undeclared.length, count, `${what} yields ${count} audit-bound-undeclared finding(s)`);
        for (const finding of undeclared) {
          assert.equal(finding.severity, "error", "…at error");
          assert.equal(finding.path, recordPath, "…naming the record it was read from");
          assert.match(finding.message, /loop:one/u, "…naming that loop");
          assert.match(finding.message, /ceiling/u, "…and the ceiling field");
        }
      }
    },
  },
  {
    name: "declared-bounds: the registry's own uncapped warning is neither moved nor re-emitted",
    async run() {
      const { model } = await modelWithCeiling("uncapped");
      const result = lane({ model });
      assert.equal(
        result.findings.some((finding) => finding.code === "loop-ceiling-uncapped"),
        false,
        "no finding this lane returns carries the code the registry validation emits",
      );
      const registry = model.findings.filter((finding) => finding.code === "loop-ceiling-uncapped");
      assert.equal(registry.length, 1, "and running the registry validation over that same record still returns it");
      assert.equal(registry[0].severity, "warn", "…at warn");
    },
  },
  {
    name: "declared-bounds: a bound the reference declares and this project declares nowhere is reported at warn",
    run() {
      const rows = [
        ["a step ceiling", null, 1],
        ["a step ceiling", 10, 0],
        ["a spend ceiling", null, 1],
        ["a spend ceiling", 3, 0],
      ];
      for (const [bound, declared, count] of rows) {
        const result = lane({
          rows: [refRow({ id: `row-for-${bound.replace(/\s/gu, "-")}`, bound })],
          declaredBounds: declared == null ? {} : { [bound]: declared },
        });
        const undeclared = codes(result, "audit-bound-undeclared");
        assert.equal(undeclared.length, count, `${bound} declared ${declared == null ? "nowhere" : declared} yields ${count} finding(s)`);
        for (const finding of undeclared) {
          assert.equal(finding.severity, "warn", "…at warn");
          assert.match(finding.message, /row-for-/u, "…naming the reference row");
          assert.match(finding.message, /Some System/u, "…and the system that ships it");
        }
      }
    },
  },
  {
    name: "declared-bounds: a declared bound outside the reference range is an argument the lane states, and both edges are inside it",
    run() {
      const spread = (values) => values.map((value, position) => refRow({ id: `row-${position}`, value, system: `System ${position}` }));
      const rows = [
        [[8, 12], 6, 1],
        [[8, 12], 8, 0],
        [[8, 12], 10, 0],
        [[8, 12], 12, 0],
        [[8, 12], 14, 1],
        [[10], 10, 0],
        [[10], 9, 1],
        [[10], 11, 1],
      ];
      for (const [reference, declared, count] of rows) {
        const result = lane({ rows: spread(reference), declaredBounds: { "a step ceiling": declared } });
        const off = codes(result, "audit-bound-off-reference");
        assert.equal(off.length, count, `reference ${reference.join(" and ")} against a declared ${declared} yields ${count} finding(s)`);
        for (const finding of off) {
          assert.equal(finding.severity, "warn", "…at warn");
          assert.match(finding.message, new RegExp(`declares ${declared}\\b`, "u"), "…naming the declared value");
          const edge = declared < Math.min(...reference) ? Math.min(...reference) : Math.max(...reference);
          assert.match(finding.message, new RegExp(`ships ${edge}\\b`, "u"), "…the reference value it sits outside of");
          assert.match(finding.message, /System \d/u, "…and the system that ships it");
        }
      }
    },
  },
  {
    name: "declared-bounds: one bound with two rows outside the range is one argument, not two",
    run() {
      const result = lane({
        rows: [refRow({ id: "row-0", value: 8 }), refRow({ id: "row-1", value: 12 })],
        declaredBounds: { "a step ceiling": 6 },
      });
      assert.equal(codes(result, "audit-bound-off-reference").length, 1, "the range is the bound's, so the finding is the bound's");
    },
  },
  {
    name: "declared-bounds: a reference row older than the window says so, and the boundary is stated",
    run() {
      const rows = [
        [0, 0, "the instant of the run"],
        [29, 0, "one day newer than the window"],
        [30, 0, "exactly the window"],
        [31, 1, "one day older than the window"],
      ];
      for (const [age, count, what] of rows) {
        const row = refRow({ checked: dateDaysBefore(age) });
        const result = lane({ rows: [row], declaredBounds: { "a step ceiling": 10 } });
        const stale = codes(result, "audit-reference-stale");
        assert.equal(stale.length, count, `${what} yields ${count} audit-reference-stale finding(s)`);
        for (const finding of stale) {
          assert.equal(finding.severity, "warn", "…at warn");
          assert.match(finding.message, /reference-row/u, "…naming the row");
          assert.match(finding.message, new RegExp(row.checked, "u"), "…its checked date");
          assert.match(finding.message, /30-day window/u, "…and the window it exceeded");
        }
      }
    },
  },
  {
    name: "declared-bounds: staleness is the payload speaking, not the audited project",
    async run() {
      const stale = refRow({ id: "old-row", checked: dateDaysBefore(400) });
      for (const project of ["project-alpha", "project-beta"]) {
        const { model } = await modelWithCeiling("none");
        const result = lane({ model, rows: [stale], declaredBounds: { "a step ceiling": 10 } });
        const findings = codes(result, "audit-reference-stale");
        assert.equal(findings.length, 1, `${project} is told about the stale row`);
        assert.equal(findings[0].severity, "warn", "…at warn");
        assert.match(findings[0].message, /old-row/u, "…naming that row");
        assert.match(findings[0].message, /installed aof payload/u, "…and naming the payload as whose fact it is");
        assert.equal(findings[0].message.includes(project), false, "…and never the audited project as the cause");
      }
    },
  },

  // ── THE JOIN'S OWN HONESTY ─────────────────────────────────────────────────────────────────
  {
    name: "declared-bounds: a registry with every ceiling declared returns nothing at error",
    async run() {
      const { model } = await withLoopRegistry(
        {
          "a.md": loopRecord({ fields: { ceiling: "[config:work.loop.reviewRounds]" } }),
          "b.md": loopRecord({ fields: { ceiling: "[config:work.loop.buildNoProgressRounds]" } }),
        },
        async (fixture) => ({ model: await loadLoops(fixture.workDir) }),
      );
      const result = lane({ model });
      assert.equal(result.findings.filter((finding) => finding.severity === "error").length, 0, "no error-severity finding");
      assert.equal(result.resolvedLoops.length, 2, "the loops it reports as declaring a resolved bound number every loop in that model");

      // THE REPOSITORY THAT IS ALREADY IN IT: two of its ceiling pointers name
      // `work.autonomous.maxAttempts`, which the bounds home does not hold.
      const shipped = await loadLoops({ aofDir: path.join(repoRoot, "src", "bundle"), projectRoot: repoRoot });
      const own = lane({ model: shipped });
      assert.equal(own.findings.filter((finding) => finding.severity === "error").length, 0, "this repository's own registry returns nothing at error");
      const limit = own.limits.find((entry) => entry.sweep === DECLARED_BOUNDS_SWEEPS[0].id);
      assert.match(limit.consequence, /work\.autonomous\.maxAttempts/u, "every loop whose pointer names a key the bounds home does not hold is named in the stated limit");
      for (const pointer of own.unresolvedPointers) {
        assert.equal(own.resolvedLoops.includes(pointer.split(" ")[0]), false, "…never counted as declaring one");
      }
    },
  },
  {
    name: "declared-bounds: an unresolved config pointer is an answer the lane states, not a silent pass",
    async run() {
      const rows = [
        ["[config:work.loop.reviewRounds]", 1, false],
        ["[config:work.nothing.reads.this]", 0, true],
        // AN EMPTY KEY IS HAND-SHAPED, and that is the honest way to drive it: the loader refuses
        // `ceiling: [config:]` outright as `loop-bad-value`, so no record on disk can produce this
        // entry. The lane must still answer for one, because a model reaches it from anywhere.
        [{ key: "ceiling", raw: "config:", kind: "pointer", pointer: { scheme: "config", operand: "" } }, 0, true],
      ];
      for (const [ceiling, resolved, named] of rows) {
        const { model } = typeof ceiling === "string"
          ? await modelWithCeiling(ceiling)
          : { model: { present: true, source: "<handed in>", findings: [], nodes: [{ id: "loop:one", kind: "loop", path: "<handed in>", fields: { ceiling: [ceiling] }, edges: {} }] } };
        const result = lane({ model });
        assert.equal(result.resolvedLoops.length, resolved, `${ceiling} resolves ${resolved} loop(s)`);
        const limit = result.limits.find((entry) => entry.sweep === DECLARED_BOUNDS_SWEEPS[0].id);
        if (!named) {
          assert.equal(result.unresolvedPointers.length, 0, "no unresolved pointer is named");
          assert.match(limit.consequence, /0 ceiling pointer\(s\)/u, "…and the limit says so");
          continue;
        }
        assert.equal(result.unresolvedPointers.length, 1, "the loop and the pointer key are named");
        assert.match(result.unresolvedPointers[0], /loop:one/u, "…that loop");
        assert.match(limit.consequence, /loop:one/u, "…in the stated limit");
      }
    },
  },
  {
    name: "declared-bounds: the lane invents no code for the unresolved pointer",
    async run() {
      const { model } = await modelWithCeiling("config:work.nothing.reads.this");
      const result = lane({ model, rows: [refRow()], declaredBounds: {} });
      for (const finding of result.findings) {
        assert.equal(DECLARED_BOUNDS_FINDING_CODES.includes(finding.code), true, `${finding.code} is one of this lane's three codes`);
      }
      assert.equal(
        result.findings.some((finding) => finding.code === "loop-ceiling-pointer-unresolved"),
        false,
        "and none carries the code the registry validation already emits for an unresolved pointer",
      );
    },
  },
  {
    name: "declared-bounds: the model is what the lane reads, and the disk is not",
    async run() {
      // The handed model declares every ceiling. Each case below puts a CONTRADICTING registry on
      // disk and makes it the process's working directory, so a lane that read disk instead of its
      // argument would answer differently — and none of them changes the answer.
      const { model: declared } = await modelWithCeiling("none");
      const previous = process.cwd();
      const homes = [];
      try {
        const contradicting = await makeLoopRegistry({ "one.md": loopRecord({ fields: { ceiling: "uncapped" } }) });
        homes.push(contradicting);
        const absent = await makeLoopRegistry(null);
        homes.push(absent);
        const unreadable = await makeLoopRegistry(null);
        homes.push(unreadable);
        // A FILE where the loops directory should be: on disk, and not readable as a registry.
        writeFileSync(path.join(unreadable.temp, "work", "loops"), "not a directory\n");

        const cases = [
          [contradicting, "carries records declaring uncapped ceilings"],
          [absent, "is absent altogether"],
          [unreadable, "cannot be read"],
        ];
        for (const [fixture, what] of cases) {
          process.chdir(fixture.temp);
          const result = lane({ model: declared });
          assert.equal(codes(result, "audit-bound-undeclared").length, 0, `with a registry on disk that ${what}, no loop finding is returned`);
          assert.equal(result.resolvedLoops.length, 1, "…and the answer is the answer for the model it was handed");
        }
      } finally {
        process.chdir(previous);
        for (const home of homes) await home.cleanup();
      }
    },
  },
  {
    name: "declared-bounds: the same model read twice gives the same answer",
    async run() {
      const { model } = await modelWithCeiling("uncapped");
      const rows = [refRow(), refRow({ id: "second", bound: "a spend ceiling", value: 3 })];
      const before = JSON.stringify({ model, rows });
      const first = lane({ model, rows });
      const second = lane({ model, rows });
      assert.deepEqual(second.findings, first.findings, "the two answers carry the same findings in the same order");
      assert.equal(JSON.stringify({ model, rows }), before, "and neither run changed the model or the rows");
    },
  },
  {
    name: "declared-bounds: the lane says what it swept, so found-nothing is never mistaken for looked-at-nothing",
    async run() {
      const six = await withLoopRegistry(
        Object.fromEntries([0, 1, 2, 3, 4, 5].map((at) => [`loop-${at}.md`, loopRecord({ fields: { ceiling: "none" } })])),
        async (fixture) => loadLoops(fixture.workDir),
      );
      const one = (await modelWithCeiling("none")).model;
      const none = { present: true, source: "<empty>", nodes: [], findings: [] };
      const four = [0, 1, 2, 3].map((at) => refRow({ id: `row-${at}` }));
      const rows = [
        [six, four, 6, 4],
        [one, [refRow()], 1, 1],
        [none, four, 0, 4],
      ];
      for (const [model, reference, loops, references] of rows) {
        const result = lane({ model, rows: reference, declaredBounds: { "a step ceiling": 10 } });
        assert.equal(result.reads.length, 2, "a read record for the loops swept and one for the reference rows swept");
        const [loopRead, referenceRead] = result.reads;
        assert.equal(loopRead.count, loops, `the loops swept number ${loops}`);
        assert.equal(referenceRead.count, references, `the reference rows swept number ${references}`);
        for (const read of result.reads) assert.equal(read.floor > 0, true, `the "${read.sweep}" read declares a floor greater than zero`);
      }
    },
  },
  {
    name: "declared-bounds: a project with no loop registry is a stated limit, not a clean result",
    async run() {
      const absent = { source: "<none>", present: false, nodes: [], findings: [] };
      const empty = await withLoopRegistry({}, async (fixture) => loadLoops(fixture.workDir));
      const unparseable = await withLoopRegistry(
        { "broken.md": "no frontmatter here at all\n" },
        async (fixture) => loadLoops(fixture.workDir),
      );
      const rows = [
        [absent, /no loop registry at all/u, "does not exist"],
        [empty, /holds no loop records/u, "holds no loop records at all"],
        [unparseable, /could not be parsed/u, "could not be parsed"],
      ];
      for (const [model, why, what] of rows) {
        const result = lane({ model, rows: [refRow()], declaredBounds: { "a step ceiling": 10 } });
        const limit = result.limits.find((entry) => entry.sweep === DECLARED_BOUNDS_SWEEPS[0].id);
        assert.match(limit.consequence, /went unanswered/u, `a registry that ${what} yields a stated limit`);
        assert.match(limit.consequence, why, "…and says why");
        assert.equal(codes(result, "audit-bound-undeclared").filter((finding) => finding.severity === "error").length, 0, "…with no loop-side finding");
        assert.equal(result.reads[1].count, 1, "…and the reference side of the join is still answered");
        // The floor is still declared and still compared: an unswept loop side is reported by the
        // registry's own backstop rather than passing as a clean lane.
        assert.notEqual(readFinding(result.reads[0]), null, "…and the empty loop sweep is below its floor, which is said out loud");
      }
    },
  },

  // ── DETERMINISM (task 02) ──────────────────────────────────────────────────────────────────
  {
    name: "declared-bounds: two runs on two days differ only by what the corpus's own dates did",
    async run() {
      const { model } = await modelWithCeiling("none");
      const later = NOW + 10 * DAY;
      const cases = [
        ["does not cross", dateDaysBefore(1), 0],
        ["crosses", dateDaysBefore(WINDOW / DAY - 5), 1],
      ];
      for (const [crossing, checked, difference] of cases) {
        const rows = [refRow({ checked })];
        const declaredBounds = { "a step ceiling": 10 };
        const first = runDeclaredBounds({ model, rows, declaredBounds, now: NOW, staleWindowMs: WINDOW });
        const second = runDeclaredBounds({ model, rows, declaredBounds, now: later, staleWindowMs: WINDOW });
        const added = second.findings.filter((finding) => !first.findings.some((earlier) => earlier.message === finding.message));
        assert.equal(added.length, difference, `a row whose checked date ${crossing} the window differs by ${difference}`);
        for (const finding of added) assert.equal(finding.code, "audit-reference-stale", "…and the difference is exactly one stale finding naming that row");
      }
    },
  },
  {
    name: "declared-bounds: nothing but the corpus and the project decides the answer",
    async run() {
      const { model } = await modelWithCeiling("uncapped");
      const rows = [refRow()];
      const previous = process.cwd();
      try {
        const answers = [];
        for (const directory of [repoRoot, path.dirname(repoRoot)]) {
          process.chdir(directory);
          answers.push(lane({ model, rows, declaredBounds: {} }));
        }
        assert.deepEqual(answers[1].findings, answers[0].findings, "the two answers carry the same findings in the same order");
        for (const finding of answers[0].findings) {
          assert.equal(/was contacted|fetched|http/iu.test(finding.message), false, "and neither answer names a source that was contacted");
        }
      } finally {
        process.chdir(previous);
      }
    },
  },

  // ── THE MAPPING ONTO THIS PROJECT'S OWN KNOBS ──────────────────────────────────────────────
  {
    name: "declared-bounds: the bound-to-knob map names only keys the bounds home declares",
    run() {
      assert.deepEqual(boundConfigKeyProblems(), [], "every mapped key is one the bounds home resolves");
      assert.equal(Object.keys(BOUND_CONFIG_KEYS).length > 0, true, "and the map is non-vacuous, so the check is not passing over nothing");
      assert.deepEqual(
        boundConfigKeyProblems({ "a bound": "work.loop.notAKnob" }),
        ["the bound \"a bound\" maps to \"work.loop.notAKnob\", which is not a key the bounds home declares — a mapping onto a knob nobody reads compares a reference row against nothing"],
        "a mapping onto a knob nobody reads is refused",
      );
    },
  },
  {
    name: "declared-bounds: the values this project declares are resolved through the bounds home's own callables",
    run() {
      const declared = declaredBoundValues({ config: { work: { loop: { progressMaxResets: 7 } } } });
      assert.equal(declared["retry attempt ceiling (attempts)"], 7, "a configured value is the declared value");
      const byDefault = declaredBoundValues({});
      assert.equal(typeof byDefault["retry attempt ceiling (attempts)"], "number", "and an unconfigured project declares the home's default rather than nothing");
    },
  },
  {
    name: "declared-bounds: the lane reads no clock, so the instant must be supplied",
    run() {
      assert.throws(() => runDeclaredBounds({ model: null, rows: [] }), /reads no clock/u, "a run with no instant is refused rather than dated silently");
      assert.equal(DEFAULT_REFERENCE_STALE_WINDOW_MS > 0, true, "and the default window is a real span");
      assert.equal(boundRange([refRow({ value: 4 }), refRow({ value: 9 })], "a step ceiling").low.value, 4, "the range's low edge is the lowest row");
    },
  },
];
