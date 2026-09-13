import assert from "node:assert/strict";

import { computeLoopReady } from "../../src/work/doctor-loop-ready.mjs";
import {
  invokeDoctor,
  row,
  withLoopReadyRepo,
} from "../support/loop-ready-fixture.mjs";

const COMPOSED = ["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"];

function injectedBase(states) {
  return computeLoopReady({
    findings: states[0] === "fail" ? [{ severity: "error" }] : [],
    config: {
      work: { autonomous: states[1] === "pass" ? { maxAttempts: 3 } : {} },
      memory: states[2] === "pass" ? { backend: "local" } : {},
    },
    snapshot: {
      items: [{ type: "story", ref: "07/00", number: "00", parent: "07", slug: "spine", path: "/fixture", hasTasks: states[3] === "pass" }],
    },
    loops: { present: false, summary: { checks: {}, error: 0, warn: 0 } },
  });
}

export const loopReadyRegistryAbsentTests = [
  {
    name: "loop-ready/01 absent registry is explicit, non-applicable, and outside the denominator",
    async run() {
      await withLoopReadyRepo({ config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } } }, async (fx) => {
        const { loopReady } = await invokeDoctor(fx);
        assert.deepEqual(loopReady.registry, { present: false, composed: false, error: 0, warn: 0 });
        assert.equal(loopReady.applicable, 4);
        assert.equal(loopReady.passed, 4);
        assert.equal(loopReady.score, 100);
        assert.equal(loopReady.clears, "L2");
        assert.deepEqual(loopReady.blocking, []);
        for (const id of COMPOSED) {
          assert.equal(row(loopReady, id).state, "not-applicable");
          assert.match(row(loopReady, id).evidence, /No loop registry is declared/i);
        }
      });
    },
  },
  {
    name: "loop-ready/01 every base pass-fail combination keeps applicable at four",
    run() {
      for (let mask = 0; mask < 16; mask += 1) {
        const states = Array.from({ length: 4 }, (_, index) => (mask & (1 << index)) ? "pass" : "fail");
        const ready = injectedBase(states);
        const passed = states.filter((state) => state === "pass").length;
        assert.equal(ready.applicable, 4);
        assert.equal(ready.passed, passed);
        assert.equal(ready.score, passed * 25);
        assert.ok(ready.checks.slice(4).every((check) => check.state === "not-applicable"));
        assert.ok(ready.blocking.every((id) => !COMPOSED.includes(id)));
      }
    },
  },
  {
    name: "loop-ready/01 empty and non-markdown-only registries are present and compose six passes",
    async run() {
      for (const loops of [{}, { "README.txt": "notes", "notes.json": "{}" }]) {
        await withLoopReadyRepo({
          loops,
          config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } },
        }, async (fx) => {
          const { loopReady } = await invokeDoctor(fx);
          assert.deepEqual(loopReady.registry, { present: true, composed: true, error: 0, warn: 0 });
          assert.equal(loopReady.applicable, 10);
          assert.ok(COMPOSED.every((id) => row(loopReady, id).state === "pass"));
        });
      }
    },
  },
  {
    name: "loop-ready/01 registry presence changes only loopReady, never doctor findings or health",
    async run() {
      const results = [];
      for (const loops of [null, {}]) {
        await withLoopReadyRepo({ loops }, async (fx) => results.push(await invokeDoctor(fx)));
      }
      assert.deepEqual(results[0].findings, results[1].findings);
      assert.notDeepEqual(results[0].loopReady, results[1].loopReady);
    },
  },
  {
    name: "loop-ready/01 absence and its denominator are invariant under doctor scope",
    async run() {
      await withLoopReadyRepo({
        milestones: [
          { number: "07", slug: "alpha", stories: [{ number: "00", slug: "one", tasks: ["00.feature"] }] },
          { number: "08", slug: "beta", stories: [{ number: "00", slug: "two", tasks: ["00.feature"] }] },
        ],
      }, async (fx) => {
        for (const scope of [undefined, "07", "07/00"]) {
          const { loopReady } = await invokeDoctor(fx, scope);
          assert.equal(loopReady.registry.present, false);
          assert.equal(loopReady.applicable, 4);
          assert.ok(COMPOSED.every((id) => row(loopReady, id).state === "not-applicable"));
        }
      });
    },
  },
];
