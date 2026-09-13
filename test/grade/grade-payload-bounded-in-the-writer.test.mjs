// Traceability wiring for story 81, task `01_the-payload-is-bounded-in-the-writer`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/81_story_bounds-under-a-real-grader/tasks/01_the-payload-is-bounded-in-the-writer.feature
//
// THE GAP, AS 54 DECLARED IT: *"the operator line slices to 20; the run record's
// `brief.grade`, the cap-exhausted report line and the fix transport's `## REVIEW FINDINGS`
// each carry the record whole."* Three writers with no bound and one reader with one — the
// bound in exactly the one place it does not matter, because a human can stop reading and a
// run record, a report line and a maker's prompt cannot.
//
// `70/ADR-003` IS THE PRECEDENT AND IT IS FOLLOWED VERBATIM: the ceiling lives in the WRITE
// PATH, the writer REFUSES to emit an over-ceiling payload, it STATES in the payload that it
// truncated and what it dropped, and it NEVER returns an empty payload. Its own rejected
// alternative — warn and ship — is rejected again here: a budget nothing enforces has already
// been exceeded.
//
// EVERY ASSERTION BELOW IS ON A DOCUMENT THE SHELL PRODUCED — a run record it wrote, a report
// line it printed, the input a driver received, the text the renderer returned — never on the
// source of the code that was supposed to produce it.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { gradeCommand } from "../../src/commands/grade.mjs";
import { PHASE_BRIEF_MAX_CHARS } from "../../src/phase-brief.mjs";
import {
  GRADE_FAILURE_MAX_ENTRIES, GRADE_TRUNCATION_KEY, boundGradeFailures, compileGrade,
} from "../../src/work/grade.mjs";
import { readSrcFiles } from "../support/read-src-files.mjs";
import { completingDriver, loopFixture, replaceStatus } from "../loop/loop-command-probe.test.mjs";
import {
  capturingReport, emitsFailing, emitsPassing, failingTap, findingsFrom, gradingCtx,
  gradingFixture, lastLine, stubRubric,
} from "../support/loop-grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** More failing cases than the ENTRY ceiling admits. */
const manyFailures = (count) => Array.from(
  { length: count },
  (_unused, index) => [`case-${index + 1}`, `case ${index + 1} did not close`],
);

/** Failing cases whose messages together exceed the CHARACTER ceiling. */
const loudFailures = (count, chars) => Array.from(
  { length: count },
  (_unused, index) => [`case-${index + 1}`, "x".repeat(chars)],
);

const completingThrough = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

/** The `## REVIEW FINDINGS` block of a driver input, as text and as the entries it carried. */
function findingsBlock(input) {
  const body = String(input ?? "").split("## REVIEW FINDINGS")[1];
  if (body == null) return { text: "", entries: [] };
  const text = body.split(/\n(?=## )/u)[0];
  const entries = text
    .split(/\n\n(?=\{)/u)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("{"))
    .map((chunk) => JSON.parse(chunk));
  return { text, entries };
}

/** Drive one loop over a graded fixture and answer everything the surfaces were written to. */
async function loopOver(plan, { cap = 2, reviewRounds = 9, rubric = {} } = {}) {
  const fx = await gradingFixture({ cap, reviewRounds, rubric });
  const driver = completingThrough(fx);
  const report = capturingReport();
  const spawn = stubRubric(plan);
  const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report, spawn }));
  const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
  return { fx, state, report, driver, runs };
}

/** Every entry a truncation statement can be told from a runner-emitted case by. */
const truncationOf = (entries) => (Array.isArray(entries) ? entries : []).find((entry) => entry?.[GRADE_TRUNCATION_KEY] != null);

export const gradePayloadBoundedInTheWriterTests = [
  // ==================================================== THE DURABLE RECORD ============
  {
    name: "81/01 the durable record on a re-driven run carries a bounded payload",
    run: async () => {
      const over = GRADE_FAILURE_MAX_ENTRIES + 10;
      const { fx, runs } = await loopOver(emitsFailing(manyFailures(over), ["alpha"]));
      try {
        const graded = runs.filter((run) => run?.brief?.grade != null);
        assert.ok(graded.length > 0, "guard: a run really carries the grade");
        const grade = graded[0].brief.grade;

        // BOUNDED.
        assert.ok(grade.failures.length <= GRADE_FAILURE_MAX_ENTRIES + 1, "the brief's grade carries a bounded failure list");
        assert.ok(grade.failures.length < over, "…strictly fewer than the runner emitted");

        // AND IT SAYS SO, NAMING WHAT WAS DROPPED.
        const statement = truncationOf(grade.failures);
        assert.ok(statement, "the payload states that it was truncated");
        assert.match(statement[GRADE_TRUNCATION_KEY], /10 dropped/u, "…and how many failures were dropped");
        assert.match(statement[GRADE_TRUNCATION_KEY], new RegExp(`of ${over} failing`, "u"), "…out of how many there were");

        // THE RUN RECORD GAINED NO TOP-LEVEL KEY. Measured against a run this same shell
        // wrote with no grade on it, rather than against a list written down here.
        const ungraded = runs.find((run) => run?.brief?.grade == null);
        assert.ok(ungraded, "guard: the loop also wrote a run with no grade");
        assert.deepEqual(
          Object.keys(graded[0]).filter((key) => !Object.keys(ungraded).includes(key)),
          [],
          "the run record gained no top-level key",
        );

        // AND THE BRIEF'S LOOP DECLARATION IS UNCHANGED.
        assert.deepEqual(
          Object.keys(graded[0].brief.loop).sort(),
          Object.keys(ungraded.brief.loop).sort(),
          "the brief's loop declaration is unchanged",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ==================================================== THE CAP-EXHAUSTED LINE ============
  {
    name: "81/01 the cap-exhausted report line carries a bounded record",
    run: async () => {
      const over = GRADE_FAILURE_MAX_ENTRIES + 7;
      const fx = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        const report = capturingReport();
        const spawn = stubRubric(emitsFailing(manyFailures(over), ["alpha"]));
        const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, {
          driver: completingDriver(fx),
          report,
          spawn,
        }));

        assert.equal(state.act.stop, "cap-exhausted", "guard: the loop exhausted its cycle cap");
        const record = findingsFrom(lastLine(report));
        assert.ok(Array.isArray(record) && record.length > 0, "the halt still carries a record");
        // THE HALT STILL NAMES ITS STOP AND ITS PRODUCER — unchanged by the bound. The
        // producer is the engine's own cap decision, not the grade rung: the bound touches
        // what the halt REPORTS, never what decided it.
        assert.equal(typeof state.act.producer, "string", "the halt still names its producer");
        assert.ok(state.act.producer.length > 0, "…and names one, rather than reporting an empty attribution");
        assert.equal(state.act.producer, "engine:cycle>=cap", "…the same producer it named before the bound");

        for (const entry of record) {
          assert.ok(entry.failures.length <= GRADE_FAILURE_MAX_ENTRIES + 1, "the reported findings are bounded by the same ceiling");
          const statement = truncationOf(entry.failures);
          assert.ok(statement, "…and the report line states what was dropped");
          assert.match(statement[GRADE_TRUNCATION_KEY], /dropped/u, "…naming the drop");
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ==================================================== THE FIX TRANSPORT ============
  {
    name: "81/01 the fix transport hands the maker a bounded payload, and it is not empty",
    run: async () => {
      const { fx, driver } = await loopOver(emitsFailing(loudFailures(12, 3000), ["alpha"]));
      try {
        const fixInput = driver.typed.find((input) => input.includes("## REVIEW FINDINGS"));
        assert.ok(fixInput, "guard: the maker really was re-driven with a findings block");
        const { text, entries } = findingsBlock(fixInput);

        // WITHIN THE CEILING.
        assert.ok(text.length <= PHASE_BRIEF_MAX_CHARS, `the rendered block is within the ceiling (${text.length} <= ${PHASE_BRIEF_MAX_CHARS})`);
        // IT NAMES HOW MANY WERE DROPPED.
        const statement = truncationOf(entries);
        assert.ok(statement, "the block states that it was truncated");
        assert.match(statement[GRADE_TRUNCATION_KEY], /dropped|cut/u, "…and names what it dropped or cut");
        // AND IT IS NOT EMPTY — a phase handed nothing is strictly worse than one handed a
        // truncated something (`70/ADR-003`).
        assert.ok(entries.length > 1, "the block is not empty — it carries failing cases beside the statement");
        assert.ok(entries.some((entry) => entry.case != null), "…real cases the runner named");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/01 a single enormous failure message is cut rather than dropped whole",
    run: async () => {
      // ONE case whose message alone exceeds the whole ceiling.
      const bound = boundGradeFailures(
        [{ case: "the-one-case", message: "y".repeat(PHASE_BRIEF_MAX_CHARS * 3), scenario: null }],
        { maxChars: PHASE_BRIEF_MAX_CHARS },
      );

      assert.equal(bound.truncated, true, "it was truncated");
      assert.equal(bound.dropped, 0, "…and nothing was dropped whole");
      assert.equal(bound.cut, 1, "…the one entry was cut");
      const kept = bound.failures.find((entry) => entry.case != null);
      assert.ok(kept, "the payload still names that case");
      assert.equal(kept.case, "the-one-case", "…by the name the runner gave it");
      assert.ok(kept.message.length < PHASE_BRIEF_MAX_CHARS * 3, "the message is cut to fit");
      assert.ok(truncationOf(bound.failures), "the payload states that it was cut");
      assert.match(bound.statement, /cut to fit/u, "…and says it was a cut rather than a drop");
      assert.ok(bound.failures.length > 0, "the payload is not empty");
      assert.ok(
        bound.failures.reduce((total, entry) => total + JSON.stringify(entry).length, 0) <= PHASE_BRIEF_MAX_CHARS,
        "and what is written is within the ceiling",
      );
    },
  },

  // ==================================================== EVERY SURFACE ============
  {
    name: "81/01 [outline] the writer refuses to emit an over-ceiling payload at every surface (4 surfaces)",
    run: async () => {
      const over = GRADE_FAILURE_MAX_ENTRIES + 12;
      const within = (entries) => entries.length <= GRADE_FAILURE_MAX_ENTRIES + 1;

      const { fx, driver, report } = await loopOver(emitsFailing(manyFailures(over), ["alpha"]), { cap: 2 });
      try {
        const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;

        // SURFACE 1 — the re-driven run's `brief.grade`.
        const brief = runs.find((run) => run?.brief?.grade != null)?.brief?.grade;
        assert.ok(brief, "guard: surface 1 was written");
        assert.ok(within(brief.failures), "[brief.grade] what is written is within the ceiling");
        assert.ok(truncationOf(brief.failures), "[brief.grade] …and it declares that it was truncated");

        // SURFACE 2 — the fix transport's findings block.
        const fixInput = driver.typed.find((input) => input.includes("## REVIEW FINDINGS"));
        assert.ok(fixInput, "guard: surface 2 was written");
        const block = findingsBlock(fixInput);
        assert.ok(block.text.length <= PHASE_BRIEF_MAX_CHARS, "[fix transport] what is written is within the ceiling");
        assert.ok(truncationOf(block.entries), "[fix transport] …and it declares that it was truncated");
        assert.equal(
          truncationOf(block.entries).gate,
          "work:grade",
          "[fix transport] …and the statement names its producing gate like every other entry",
        );
        assert.ok(report.gradeLines().length > 0, "guard: the grade rung really answered");
      } finally {
        await fx.cleanup();
      }

      // SURFACE 3 — the cap-exhausted report line.
      const capped = await gradingFixture({ cap: 2, reviewRounds: 9 });
      try {
        const report = capturingReport();
        const state = await runLoopBody({ scope: "03" }, gradingCtx(capped, {
          driver: completingDriver(capped),
          report,
          spawn: stubRubric(emitsFailing(manyFailures(over), ["alpha"])),
        }));
        assert.equal(state.act.stop, "cap-exhausted", "guard: surface 3 was written");
        for (const entry of findingsFrom(lastLine(report))) {
          assert.ok(within(entry.failures), "[cap-exhausted line] what is written is within the ceiling");
          assert.ok(truncationOf(entry.failures), "[cap-exhausted line] …and it declares that it was truncated");
        }
      } finally {
        await capped.cleanup();
      }

      // SURFACE 4 — the operator's rendered verdict, asked of the renderer itself.
      const grade = compileGrade({
        ref: "03/01",
        gradedAt: "2026-09-01T00:00:00.000Z",
        rubric: { report: { format: "tap", path: null, floor: 1 } },
        runner: { command: ["node"], cwd: "/repo", exit: 1, durationMs: 1, outcome: "completed", detail: null },
        report: { present: true, text: failingTap(manyFailures(over), ["alpha"]), source: "capture" },
      });
      assert.equal(grade.verdict, "fail", "guard: the record really is a red one");
      assert.equal(grade.failures.length, over, "guard: the RECORD carries every failure, whole");
      const rendered = gradeCommand.cli.render({ ref: "03/01", ran: true, message: "graded", grade, plan: null });
      const shown = rendered.split("\n").filter((line) => line.trimStart().startsWith("✗"));
      assert.ok(shown.length <= GRADE_FAILURE_MAX_ENTRIES, "[operator render] what is written is within the ceiling");
      assert.match(rendered, /dropped to fit the payload ceiling/u, "[operator render] …and it declares that it was truncated");
    },
  },

  {
    name: "81/01 [outline] a payload that already fits is passed through unchanged and says nothing (0, 1, 20)",
    run: async () => {
      for (const count of [0, 1, GRADE_FAILURE_MAX_ENTRIES]) {
        const failures = Array.from(
          { length: count },
          (_unused, index) => ({ case: `case-${index + 1}`, message: "a short red", scenario: null }),
        );
        const bound = boundGradeFailures(failures, { maxChars: PHASE_BRIEF_MAX_CHARS });

        assert.equal(bound.truncated, false, `[${count}] a payload that fits is not truncated`);
        assert.deepEqual([...bound.failures], failures, `[${count}] every failure is carried, unchanged`);
        assert.equal(bound.statement, null, `[${count}] the payload makes no truncation statement`);
        assert.equal(truncationOf(bound.failures), undefined, `[${count}] …and carries no statement entry`);
        assert.equal(bound.dropped, 0, `[${count}] nothing was dropped`);
        assert.equal(bound.cut, 0, `[${count}] …and nothing was cut`);
      }
    },
  },

  // ==================================================== ONE BOUND, ONE HOME ============
  {
    name: "81/01 there is exactly one bound, and the render reads it rather than repeating it",
    run: async () => {
      const strip = (text) => text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

      // EXACTLY ONE FUNCTION BOUNDS A GRADE PAYLOAD, and exactly one module declares its
      // entry ceiling — asked of the whole `src/**` family, not of the modules this task
      // happened to edit (`m15/R3`).
      const declaring = [];
      const bounding = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const code = strip(await readFile(file.path, "utf8"));
        if (/export function boundGradeFailures\b/.test(code)) bounding.push(file.rel);
        if (/GRADE_FAILURE_MAX_ENTRIES\s*=/.test(code)) declaring.push(file.rel);
      }
      assert.deepEqual(bounding, ["work/grade.mjs"], "exactly one function bounds a grade payload");
      assert.deepEqual(declaring, ["work/grade.mjs"], "…and exactly one module declares its ceiling");

      // IT LIVES IN THE PURE LEAF AND IMPORTS NOTHING FROM `src/` (FF-5406, unchanged).
      const leaf = strip(await readFile(path.join(repoRoot, "src", "work", "grade.mjs"), "utf8"));
      const imports = [...leaf.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
      assert.deepEqual(imports, ["../claim-provenance.mjs"], "the bound lives in the pure leaf, which still imports only the pure provenance compiler");
      assert.ok(!leaf.includes("PHASE_BRIEF_MAX_CHARS"), "…so the character ceiling is HANDED IN rather than reached for");

      // THE OPERATOR RENDER CALLS IT INSTEAD OF SLICING TO A LITERAL OF ITS OWN.
      const grade = strip(await readFile(path.join(repoRoot, "src", "commands", "grade.mjs"), "utf8"));
      assert.match(grade, /boundGradeFailures\(/u, "the operator render calls the bound");
      assert.ok(!/failures\.slice\(/u.test(grade), "…instead of slicing to a literal of its own");

      // AND NO MODULE HARD-CODES A SECOND FAILURE CEILING.
      const second = [];
      for (const file of await readSrcFiles(repoRoot)) {
        const code = strip(await readFile(file.path, "utf8"));
        if (/failures\s*\.\s*slice\s*\(\s*0\s*,\s*\d/.test(code)) second.push(file.rel);
      }
      assert.deepEqual(second, [], "no module hard-codes a second failure ceiling");
    },
  },

  {
    name: "81/01 the record itself is unchanged, and the machine face still carries the whole truth",
    run: async () => {
      const over = GRADE_FAILURE_MAX_ENTRIES + 15;
      const fx = await gradingFixture({});
      try {
        const spawn = stubRubric(emitsFailing(manyFailures(over), ["alpha", "beta"]));
        const result = await invoke("work:grade", { ref: "03/01", run: true }, gradingCtx(fx, { spawn }));

        // THE RECORD CARRIES EVERY FAILURE THE RUNNER EMITTED.
        assert.equal(result.grade.failures.length, over, "the record carries every failure the runner emitted");
        assert.equal(truncationOf(result.grade.failures), undefined, "…and no statement was written into it");

        // ITS KEY SET IS EXACTLY THE ONE IT CARRIES TODAY — measured against a record
        // compiled through the same compiler with a payload that never needed bounding.
        const small = await invoke("work:grade", { ref: "03/01", run: true }, gradingCtx(fx, {
          spawn: stubRubric(emitsFailing([["only", "one red"]], ["alpha"])),
        }));
        assert.deepEqual(Object.keys(result.grade), Object.keys(small.grade), "the record's key set is exactly the one it carries today");

        // AND ITS `cases` COUNTS ARE THE ONES THE RUNNER REPORTED.
        assert.equal(result.grade.cases.failed, over, "its cases.failed is the count the runner reported");
        assert.equal(result.grade.cases.total, over + 2, "…and its cases.total counts the passing ones too");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/01 a repository that declares no rubric writes no payload and no statement",
    run: async () => {
      const fx = await loopFixture({ cap: 2, reviewRounds: 9 });
      try {
        // A RED VALIDATE GATE, so a re-drive really happens and really carries findings.
        const driver = completingThrough(fx);
        const spawn = stubRubric(emitsPassing());
        await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));

        assert.equal(spawn.calls.length, 0, "guard: nothing was graded, because nothing was declared");
        const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
        for (const run of runs) {
          assert.equal(run?.brief?.grade, undefined, "no grade key is written to the run's brief");
        }
        for (const input of driver.typed) {
          assert.ok(!input.includes(GRADE_TRUNCATION_KEY), "no truncation statement appears anywhere");
        }
      } finally {
        await fx.cleanup();
      }
    },
  },
];
