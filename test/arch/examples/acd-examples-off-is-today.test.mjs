import { defaultApplication as _aofApplication } from "aof/default-application";
// FF-13403 — with the examples gate off, the doctor and the continue door are exactly what they are
// today (milestone 134 / story 04, ADR-006 §3).
//
// Covers EVERY @executable scenario in
//   tasks/03_off-is-today.feature
//
// The gate has three code readers — the snapshot probe, the lane and the continue door — and this
// control holds all three at once over the worst map a story could carry, so a reader that forgets
// to ask the resolver is caught here rather than by a project whose stream turns red the day it
// upgrades. The fixture is story 04's (`test/examples/doctor-examples-lane.test.mjs`): a project
// in a fresh temp directory with its own global home and Claude config directory. Its red probe is
// recorded in the milestone `VERIFICATION.md` fitness register.
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { EXAMPLES_DOC } from "@aof/specification-by-example/map";
import { E, Q, QUESTIONS, R, mapOf, pinMtimes, snapshotOf, withExamplesProject, writeTasks } from "../../examples/doctor-examples-lane.test.mjs";
import { featureText, rule, scenario } from "../../../packages/specification-by-example/test/example-trace.suite.mjs";

const doctorWork = _aofApplication.work.doctor.doctorWork;
const EXAMPLE_LANE_CODES = _aofApplication.work.doctorExamples.EXAMPLE_LANE_CODES;

const NOW = Date.parse("2026-09-25T09:00:00.000Z");
// Noon of the day 134/04's date-only `updated` names (2026-09-24), in local time.
const NOON = new Date(2026, 8, 24, 12, 0, 0);

// The worst map a story could carry, 60 lines: an open business question, a `[confirmed]` example
// no answer stands behind, a malformed line, a rule with no example and five rules. Since 135/04 it
// rides with WORST_CONTRACT, a contract formulated from the map that carries none of its examples,
// so the trace's `example-untraced` is held off by the gate too.
const WORST_CONTRACT = { "tasks/00_worst.feature": featureText("worst", rule("R1 · rule 1", scenario("an example with no id"))) };
const WORST = (() => {
  const body = [
    ...R(1, E(1, "[confirmed]")),
    ...R(2, E(2), "- E3 · x [confirmd]"),
    ...R(3, E(4)),
    ...R(4, E(5)),
    ...R(5),
    ...QUESTIONS(Q(1, "business", "open")),
  ];
  const padding = Array.from({ length: 60 - 1 - body.length }, (_, index) => `<!-- padding ${index + 1} -->`);
  return mapOf(body, padding);
})();

const OFF = [
  ["absent", undefined],
  ["false", { enabled: false }],
  ["a string", { enabled: "yes" }],
  ["a misspelt key", { enable: true }],
  ["not an object", true],
];

const exampleCodes = (findings) => findings.filter((finding) => finding.code.startsWith("example-"));
const overBudgetMaps = (findings) => findings.filter((finding) => finding.code === "doc-over-budget" && finding.path.endsWith(EXAMPLES_DOC));

export const archTests = [
  {
    name: "arch/134 FF-13403: the gate off yields no example finding, no map on the row and no refusal (outline: 5 configs)",
    run: async () => {
      for (const [label, examples] of OFF) {
        await withExamplesProject(examples === undefined ? {} : { examples }, async (fx) => {
          await fx.writeMap(fx.s04, WORST);
          await writeTasks(fx, WORST_CONTRACT);
          const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
          assert.deepEqual(exampleCodes(findings), [], `${label}: no example-* finding`);
          assert.deepEqual(overBudgetMaps(findings), [], `${label}: no doc-over-budget names EXAMPLES.md`);
          const row = (await snapshotOf(fx)).items.find((item) => item.ref === "134/04");
          assert.equal(row.extensions?.examples ?? null, null, label);
          assert.equal(EXAMPLES_DOC in row.docSizes, false, label);
          const door = fx.cli("work", "continue", "134/04", "--json");
          assert.equal(door.json?.ok, true, `${label}: the continue is not refused — ${door.stdout || door.stderr}`);
        }).catch((error) => { error.message = `${label}: ${error.message}`; throw error; });
      }
    },
  },
  {
    name: "arch/134 FF-13403: the same fixture with the gate on is caught, so the control is not vacuous",
    run: () => withExamplesProject({ examples: { enabled: true } }, async (fx) => {
      await fx.writeMap(fx.s04, WORST);
      await writeTasks(fx, WORST_CONTRACT);
      const findings = await doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
      const codes = new Set(exampleCodes(findings).filter((finding) => finding.message.startsWith("134/04:")).map((finding) => finding.code));
      assert.deepEqual([...codes].sort(), [...EXAMPLE_LANE_CODES].sort(), "every example-* code is reported for 134/04");
      assert.equal(overBudgetMaps(findings).length, 1, "one doc-over-budget names EXAMPLES.md");
      const door = fx.cli("work", "continue", "134/04", "--json");
      assert.equal(door.json?.code, "examples-question-open", door.stdout || door.stderr);
    }),
  },
  {
    name: "arch/134 FF-13403: the gate off leaves the doctor's findings exactly those of a stream with no map",
    run: () => withExamplesProject({}, async (fx) => {
      const run = async () => {
        await pinMtimes(fx.s04.dir, NOON);
        return doctorWork(fx.workDir, fx.config, undefined, { now: NOW, projectRoot: fx.project, projectsDir: fx.projectsDir });
      };
      await fx.writeMap(fx.s04, WORST);
      const withMap = await run();
      await rm(path.join(fx.s04.dir, EXAMPLES_DOC));
      const withoutMap = await run();
      assert.ok(withMap.length > 0, "non-vacuity: the stream has findings to compare");
      assert.deepEqual(withMap, withoutMap);
    }),
  },
];
