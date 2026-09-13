// Traceability wiring for story 81, task `03_the-transport-carries-what-the-transport-needs`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/81_story_bounds-under-a-real-grader/tasks/03_the-transport-carries-what-the-transport-needs.feature
//
// THE GAP, AS 54/03 DECLARED IT: *"`pendingFixes` carries the whole `GradeRecord` into
// `ctx.loopDrive.fix`; `composeFixInput` destructures only `findings` and `changeUnderReview`
// and the registered input schema is unchanged, so the rule holds in LETTER while the bag
// holds a second milestone's document."*
//
// WHY SOME OF THIS PROOF IS STRUCTURAL, AND WHY THAT IS THE RIGHT INSTRUMENT RATHER THAN A
// COMPROMISE. The defect is precisely that the extra key was BEHAVIOURALLY INVISIBLE: a bag
// carrying a `GradeRecord` nobody reads produces byte-identical output to one that does not,
// which is how the letter-only compliance survived a review in the first place. A test that
// could only observe the maker's input would therefore pass against the defect — so the
// claims about the BAG'S SHAPE are taken where the shape is decided (its one constructor, and
// the sites that must go through it), and the claims about what reaches the MAKER are taken
// from the input a driver actually received. Two instruments, each pointed at the thing it
// can actually see.
import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import {
  LOOP_FIX_TRANSPORT_KEYS, fixTransport, runLoopBody,
} from "../../src/commands/loop.mjs";
import { createPhaseDriverCommand } from "../../src/commands/drive.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";
import {
  capturingReport, emitsFailing, gradingCtx, gradingFixture, stubRubric,
} from "../support/loop-grade-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const strip = (text) => text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const loopSource = async () => strip(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));

const INVALID_FEATURE = "Feature: Invalid\n  Scenario: missing lane\n    Given a fixture\n";
const seedInvalid = (fx) => writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), INVALID_FEATURE);

const completingThrough = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

/** The `## REVIEW FINDINGS` block of a driver input, as text and as parsed entries. */
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

/** Drive one loop over a graded fixture and answer what the maker and the store received. */
async function loopOver(plan, { fixture = gradingFixture, options = { cap: 2, reviewRounds: 9 }, seed = null } = {}) {
  const fx = await fixture(options);
  if (seed) seed(fx);
  const driver = completingThrough(fx);
  const spawn = plan == null ? undefined : stubRubric(plan);
  const state = await runLoopBody({ scope: "03" }, gradingCtx(fx, { driver, report: capturingReport(), spawn }));
  const runs = (await invoke("work:run-status", { ref: "03/01" }, fx.ctx)).runs;
  const fixInput = driver.typed.find((input) => input.includes("## REVIEW FINDINGS"));
  return { fx, state, driver, spawn, runs, fixInput };
}

export const loopFixTransportShapeTests = [
  {
    name: "81/03 the object the driver receives carries exactly the transport's own keys",
    run: async () => {
      // THE BAG'S SHAPE, AT ITS ONE CONSTRUCTOR. A transport built from a call that also
      // hands it a grade carries exactly the declared keys and no grade: the constructor
      // destructures its declaration, so a caller cannot widen the bag by supplying a fifth
      // key — the same discipline `compileProvenance` uses on the provenance envelope.
      const bag = fixTransport({
        buildRun: { runId: "r1" },
        findings: [{ gate: "work:grade", case: "alpha" }],
        grade: { verdict: "fail", failures: [{ case: "alpha" }] },
        provenance: { node: "n" },
      });
      assert.deepEqual(Object.keys(bag), [...LOOP_FIX_TRANSPORT_KEYS], "the object carries exactly the keys the transport declares");
      assert.equal(bag.grade, undefined, "no grade record is among them");
      assert.equal(
        Object.keys(bag).some((key) => /grade|provenance/iu.test(key)),
        false,
        "…and no key of a neighbouring milestone's document either",
      );

      // AND EVERY SITE THAT PREPARES A PENDING FIX GOES THROUGH IT, so the bag the driver
      // receives can only ever be that shape — `pendingFixes.get` is its one source.
      const code = await loopSource();
      const sites = [...code.matchAll(/pendingFixes\.set\(/g)].length;
      const throughConstructor = [...code.matchAll(/pendingFixes\.set\([^,]+,\s*fixTransport\(/g)].length;
      assert.ok(sites > 0, "guard: the shell really does prepare pending fixes");
      assert.equal(throughConstructor, sites, `every one of the ${sites} sites prepares the transport through its one constructor`);

      // THE DRIVER'S REGISTERED INPUT SCHEMA CARRIES NO FIX PAYLOAD — the transport never
      // rides the closed input (`54/ADR-009 §3`). 129/02 (ADR-005 §2) widened the schema by
      // exactly the two strings a CHILD drive needs across the process boundary: `run`, the
      // lent id, and `fix`, the PATH of a file holding this transport — the transport itself
      // still never enters the input.
      assert.deepEqual(createPhaseDriverCommand("continue").input, {
        type: "object",
        properties: { ref: { type: "string" }, dryRun: { type: "boolean" }, run: { type: "string" }, fix: { type: "string" } },
        required: ["ref"],
        additionalProperties: false,
      }, "the driver's registered input schema is the four-key one 129/02 declared, and holds no transport");
    },
  },

  {
    name: "81/03 the durable record still lands on the run the grade re-drove",
    run: async () => {
      const { fx, runs } = await loopOver(emitsFailing([["alpha", "alpha failed"], ["beta", "beta failed"]], ["gamma"]));
      try {
        const graded = runs.filter((run) => run?.brief?.grade != null);
        assert.ok(graded.length > 0, "that run's brief carries the grade");
        // BESIDE THE LOOP DECLARATION, through the SAME SEAM that writes it — one brief,
        // two sibling keys, written by one `transitionRunStart`.
        assert.ok(graded[0].brief.loop != null, "…beside the loop declaration");
        assert.equal(graded[0].brief.grade.verdict, "fail", "…carrying the verdict that caused the re-drive");

        // THE RUN RECORD GAINED NO TOP-LEVEL KEY.
        const ungraded = runs.find((run) => run?.brief?.grade == null);
        assert.ok(ungraded, "guard: the loop also wrote a run with no grade");
        assert.deepEqual(
          Object.keys(graded[0]).filter((key) => !Object.keys(ungraded).includes(key)),
          [],
          "the run record gained no top-level key",
        );
      } finally {
        await fx.cleanup();
      }

      // AND NO PERSISTENCE MODULE WAS EDITED TO CARRY IT. Both are passed THROUGH: neither
      // reads the grade, branches on it, or names it anywhere except the one pre-existing
      // provenance guard 54 already placed on every stamped claim.
      for (const rel of [["src", "run-store.mjs"], ["src", "effects", "run-transitions.mjs"]]) {
        const code = strip(await readFile(path.join(repoRoot, ...rel), "utf8"));
        const mentions = [...code.matchAll(/\bgrade\b/gu)].length;
        const guarded = [...code.matchAll(/assertStampedClaim\(brief\.grade\)/gu)].length;
        assert.equal(
          mentions - guarded * 2,
          0,
          `${rel.join("/")} names the grade nowhere except 54's own stamped-claim guard`,
        );
      }
    },
  },

  {
    name: "81/03 the rendered findings block carries the failing cases and not the record",
    run: async () => {
      const { fx, fixInput } = await loopOver(emitsFailing([["alpha", "alpha did not close"], ["beta", "beta did not close"]], ["gamma"]));
      try {
        assert.ok(fixInput, "guard: the maker really was re-driven");
        const { text, entries } = findingsBlock(fixInput);

        // BOTH FAILING CASES, AND WHAT THE RUNNER SAID.
        const cases = entries.map((entry) => entry.case).filter(Boolean);
        assert.deepEqual(cases.sort(), ["alpha", "beta"], "the block names both failing cases");
        assert.match(text, /alpha did not close/u, "…and what the runner said about the first");
        assert.match(text, /beta did not close/u, "…and about the second");

        // AND NOT THE GRADE'S PROVENANCE, RUNNER ARGV, CWD OR DURATION.
        for (const forbidden of ["provenance", "durationMs", "cwd", "gradedAt"]) {
          assert.ok(!text.includes(forbidden), `the block does not carry the grade's ${forbidden}`);
        }
        // NOR THE DECLARED REPORT SHAPE.
        for (const forbidden of ["floor", "report.tap", '"format"']) {
          assert.ok(!text.includes(forbidden), `the block does not carry the declared report shape (${forbidden})`);
        }
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/03 [outline] every site that prepares a re-drive prepares the same transport (4 causes)",
    run: async () => {
      const code = await loopSource();

      // THE FOUR CAUSES, AS THE SHELL'S OWN CALL SITES. Each is one `pendingFixes.set`, and
      // the property under test is that they are INDISTINGUISHABLE in the shape they produce
      // — which is a claim about the call sites, so it is measured at the call sites.
      const calls = [...code.matchAll(/pendingFixes\.set\([^;]*?\}\)\);/gsu)].map((match) => match[0]);
      assert.ok(calls.length >= 4, `guard: the four causes are all present (found ${calls.length} sites)`);
      for (const call of calls) {
        assert.match(call, /fixTransport\(\{/u, "the payload carries exactly the transport's declared keys");
        assert.ok(!/\bgrade\s*:/u.test(call), "…and no grade record rides the bag at any site");
      }

      // AND NO SITE PUTS THE RUNNER'S RAW FAILURES ON THE BAG. That was the progress
      // `continue` branch, whose entries named no producing gate at all — so the same maker,
      // re-driven for the same reason, was handed two different documents depending on which
      // branch decided it.
      assert.ok(
        !/findings:\s*gradeResult\?\.grade\?\.failures/u.test(code),
        "no site puts the runner's raw failures on the transport",
      );
      // EVERY GRADED ENTRY IS DERIVED FROM THE ONE PLACE THAT TAGS IT.
      assert.equal([...code.matchAll(/gradeFindings\(gradeResult\)/gu)].length, 1, "the graded entries are derived exactly once");

      // AND THE BEHAVIOURAL HALF: the gate branch really does tag them, and the grade really
      // does still reach the re-driven run's brief.
      const { fx, fixInput, runs } = await loopOver(emitsFailing([["alpha", "alpha failed"]], ["gamma"]));
      try {
        const { entries } = findingsBlock(fixInput);
        const graded = entries.filter((entry) => entry.case != null);
        assert.ok(graded.length > 0, "guard: graded entries really were carried");
        assert.equal(graded.every((entry) => entry.gate === "work:grade"), true, "every graded entry names work:grade as its producing gate");
        assert.ok(runs.some((run) => run?.brief?.grade != null), "the grade, when one was taken, still reaches the re-driven run's brief");
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/03 a validate finding and a graded case are told apart by a key, on every branch",
    run: async () => {
      const { fx, fixInput } = await loopOver(
        emitsFailing([["alpha", "alpha did not close"]], ["gamma"]),
        { seed: seedInvalid },
      );
      try {
        assert.ok(fixInput, "guard: the maker really was re-driven");
        const { entries } = findingsBlock(fixInput);

        const byGate = new Map();
        for (const entry of entries) byGate.set(entry.gate, [...(byGate.get(entry.gate) ?? []), entry]);

        // BOTH ENTRIES ARE CARRIED.
        assert.ok((byGate.get("work:validate") ?? []).length > 0, "the validate finding is carried");
        assert.ok((byGate.get("work:grade") ?? []).length > 0, "…and so is the graded case");

        // EACH NAMES THE GATE THAT PRODUCED IT.
        assert.equal(entries.every((entry) => typeof entry.gate === "string" && entry.gate.length > 0), true, "each names the gate that produced it");

        // AND NO READER HAS TO PARSE PROSE TO TELL THEM APART.
        assert.deepEqual(
          [...byGate.keys()].sort(),
          ["work:grade", "work:validate"],
          "no reader has to parse prose to tell them apart — the key is the discriminator",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },

  {
    name: "81/03 the grade map is read once, where the record is written, and nowhere else",
    run: async () => {
      const code = await loopSource();

      // HELD IN ITS OWN MAP, KEYED BY REF.
      assert.match(code, /const pendingGrades = new Map\(\);/u, "the grade for a pending re-drive is held in its own map keyed by ref");

      // READ EXACTLY ONCE.
      const reads = [...code.matchAll(/pendingGrades\.get\(/gu)].length;
      assert.equal(reads, 1, "it is read exactly once");

      // AND THAT ONE READ IS AT THE SEAM THAT WRITES THE RUN'S BRIEF. Measured by locating
      // the read and the `runBrief(...)` call it feeds, rather than by trusting a comment.
      const readAt = code.indexOf("pendingGrades.get(");
      const briefAt = code.indexOf("const brief = runBrief(", readAt);
      assert.ok(briefAt > readAt, "…and it is read only at the seam that writes the run's brief");
      assert.match(code.slice(briefAt, code.indexOf("});", briefAt)), /grade:\s*pendingGrade/u, "…which is what the brief is given");

      // `ctx.loopDrive.fix` IS NEVER THE CARRIER FOR IT.
      assert.ok(!/\bfix\?\.grade\b/u.test(code), "ctx.loopDrive.fix is never the carrier for it");
      assert.ok(!/\bfix\.grade\b/u.test(code), "…on any read path");
      assert.ok(!LOOP_FIX_TRANSPORT_KEYS.includes("grade"), "…and the transport does not declare it");
    },
  },

  {
    name: "81/03 an unconfigured repository's transport is the one it carries today",
    run: async () => {
      const { fx, fixInput, runs, state } = await loopOver(null, {
        fixture: loopFixture,
        options: { cap: 2, reviewRounds: 9 },
        seed: seedInvalid,
      });
      try {
        assert.ok(fixInput, "guard: the maker really was re-driven off the validate gate");
        const { entries } = findingsBlock(fixInput);

        // THE PAYLOAD CARRIES EXACTLY THE VALIDATE FINDINGS AND NOTHING ELSE.
        assert.ok(entries.length > 0, "the fix payload carries the validate findings");
        assert.equal(
          entries.every((entry) => entry.gate === undefined || entry.gate === "work:validate"),
          true,
          "…and nothing else",
        );
        assert.equal(entries.some((entry) => entry.gate === "work:grade"), false, "no graded entry appears");

        // AND NO GRADE MAP ENTRY EXISTS FOR THAT STORY — observable as the absence of a
        // grade on every run the loop wrote.
        for (const run of runs) {
          assert.equal(run?.brief?.grade, undefined, "no grade map entry exists for that story");
        }
        assert.ok(state.driven.length > 0, "guard: the loop really drove something");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
