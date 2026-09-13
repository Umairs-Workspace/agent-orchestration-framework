import assert from "node:assert/strict";

import { computeLoopReady } from "../../src/work/doctor-loop-ready.mjs";
import { loopRecord } from "../support/loop-registry-fixture.mjs";
import {
  invokeDoctor,
  invokeLoopsValidate,
  parseJson,
  row,
  runDoctorCli,
  runLoopsCli,
  withLoopReadyRepo,
} from "../support/loop-ready-fixture.mjs";

const IDS = ["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"];

function composed(counts, { present = true, error = 0, warn = 0 } = {}) {
  return computeLoopReady({
    findings: [],
    config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } },
    snapshot: { items: [] },
    loops: {
      present,
      summary: {
        error,
        warn,
        checks: Object.fromEntries(IDS.map((id, index) => [id, { ran: present, findings: counts[index] ?? 0 }])),
      },
    },
  });
}

export const loopReadyComposedTests = [
  {
    name: "loop-ready/02 composed states and evidence are a total verbatim projection of ran and findings",
    run() {
      for (const count of [0, 1, 3, 12]) {
        const ready = composed([count, 0, 0, 0, 0], { error: 2, warn: 7 });
        assert.equal(row(ready, "grounding").state, count === 0 ? "pass" : "fail");
        assert.match(row(ready, "grounding").evidence, new RegExp(`\\b${count}\\b`));
        assert.deepEqual(ready.registry, { present: true, composed: true, error: 2, warn: 7 });
        assert.equal(ready.applicable, 10);
      }
      const absent = composed([0, 0, 0, 0, 0], { present: false });
      assert.ok(absent.checks.slice(4).every((check) => check.state === "not-applicable"));
    },
  },
  {
    name: "loop-ready/02 finding counts are thresholds rather than weights and blockers keep CHECK_IDS order",
    run() {
      const one = composed([1, 0, 0, 0, 0]);
      const twelve = composed([12, 0, 0, 0, 0]);
      assert.equal(one.score, twelve.score);
      assert.equal(one.passed, twelve.passed);
      const mixed = composed([9, 0, 3, 5, 3, 0]);
      assert.deepEqual(mixed.blocking, ["grounding", "pairing", "reference-ownership", "actuator-arbitration"]);
      assert.equal(mixed.applicable, 10);
      assert.deepEqual(composed([0, 2, 0, 0, 0, 0]).blocking, ["anchor-grounding"]);
    },
  },
  {
    name: "loop-ready/02 real doctor and loops-validate commands agree on every composed count",
    async run() {
      await withLoopReadyRepo({ loops: {} }, async (fx) => {
        const doctor = await invokeDoctor(fx);
        const loops = await invokeLoopsValidate(fx);
        for (const id of IDS) {
          const check = row(doctor.loopReady, id);
          assert.equal(check.state, loops.summary.checks[id].findings === 0 ? "pass" : "fail");
          assert.match(check.evidence, new RegExp(`\\b${loops.summary.checks[id].findings}\\b`));
        }
        assert.equal(doctor.loopReady.registry.error, loops.summary.error);
        assert.equal(doctor.loopReady.registry.warn, loops.summary.warn);
      });
    },
  },
  {
    name: "loop-ready/02 spawned CLI faces preserve the same composed summary",
    async run() {
      await withLoopReadyRepo({ loops: {} }, async (fx) => {
        const doctor = parseJson(runDoctorCli(fx));
        const loops = parseJson(runLoopsCli(fx));
        for (const id of IDS) {
          assert.equal(row(doctor.loopReady, id).state, loops.summary.checks[id].findings === 0 ? "pass" : "fail");
        }
        assert.equal(doctor.loopReady.registry.error, loops.summary.error);
        assert.equal(doctor.loopReady.registry.warn, loops.summary.warn);
      });
    },
  },
  {
    name: "loop-ready/02 loader findings remain registry counters and never become an extra row",
    async run() {
      await withLoopReadyRepo({ loops: { "broken.md": "# no frontmatter\n" } }, async (fx) => {
        const doctor = await invokeDoctor(fx);
        const loops = await invokeLoopsValidate(fx);
        assert.ok(loops.findings.some((finding) => finding.code === "loop-record-unparseable" && finding.severity === "error"));
        assert.equal(doctor.loopReady.registry.error, loops.summary.error);
        assert.equal(doctor.loopReady.checks.length, 10);
        for (const id of IDS) {
          assert.equal(row(doctor.loopReady, id).state, loops.summary.checks[id].findings === 0 ? "pass" : "fail");
        }
      });
    },
  },
  {
    name: "loop-ready/02 unreadable registry degrades to absent without moving doctor health",
    async run() {
      const results = [];
      for (const loops of [null, "file"]) {
        await withLoopReadyRepo({ loops }, async (fx) => results.push(await invokeDoctor(fx)));
      }
      assert.deepEqual(results[0].findings, results[1].findings);
      assert.deepEqual(results[1].loopReady.registry, { present: false, composed: false, error: 0, warn: 0 });
      assert.equal(results[1].loopReady.applicable, 4);
      for (const id of IDS) {
        assert.equal(row(results[1].loopReady, id).state, "not-applicable");
        assert.match(row(results[1].loopReady, id).evidence, /could not be read/i);
      }
    },
  },
  {
    name: "loop-ready/02 a real valid registry is present and scope never changes graph rows",
    async run() {
      const loops = { "sample.md": loopRecord() };
      await withLoopReadyRepo({ loops }, async (fx) => {
        const unscoped = (await invokeDoctor(fx)).loopReady;
        const scoped = (await invokeDoctor(fx, "07/00")).loopReady;
        assert.equal(unscoped.registry.present, true);
        assert.deepEqual(unscoped.checks.slice(4), scoped.checks.slice(4));
        assert.deepEqual(unscoped.registry, scoped.registry);
      });
    },
  },
];
