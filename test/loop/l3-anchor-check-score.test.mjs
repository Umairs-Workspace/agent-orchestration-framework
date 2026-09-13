import assert from "node:assert/strict";

import { COMPOSED_CHECK_IDS, computeLoopReady } from "../../src/work/doctor-loop-ready.mjs";

const base = ["stream-coherent", "cap-declared", "memory-on", "tasks-authored"];

function score(composedState = "pass", registry = { present: true, composed: true, error: 0, warn: 0 }) {
  return computeLoopReady({
    registry,
    checks: [
      ...base.map((id) => ({ id, state: "pass", evidence: "pass" })),
      ...COMPOSED_CHECK_IDS.map((id) => ({ id, state: composedState, evidence: composedState })),
    ],
  });
}

export const l3AnchorCheckScoreTests = [
  {
    name: "l3-unlocked/03 anchor-grounding is composed once and a fully green registry clears L3",
    run() {
      assert.deepEqual(COMPOSED_CHECK_IDS, ["grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"]);
      const result = score();
      assert.equal(result.checks.filter((row) => row.id === "anchor-grounding").length, 1);
      assert.equal(result.passed, 10);
      assert.equal(result.applicable, 10);
      assert.equal(result.score, 100);
      assert.equal(result.clears, "L3");
    },
  },
  {
    name: "l3-unlocked/03 unavailable registry rows remain not-applicable and never clear L3",
    run() {
      const result = computeLoopReady({
        findings: [],
        config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } },
        snapshot: { items: [] },
        loops: null,
        registryFault: "registry unreadable",
      });
      const composed = result.checks.filter((row) => COMPOSED_CHECK_IDS.includes(row.id));
      assert.equal(composed.length, 6);
      assert.ok(composed.every((row) => row.state === "not-applicable"));
      assert.ok(composed.every((row) => /unreadable/u.test(row.evidence)));
      assert.equal(result.clears, "L2");
    },
  },
  {
    name: "l3-unlocked/03 every score row retains equal weight after the additive check",
    run() {
      const all = score();
      for (const id of all.checks.map((row) => row.id)) {
        const checks = all.checks.map((row) => ({ ...row, state: row.id === id ? "fail" : "pass" }));
        const result = computeLoopReady({ registry: all.registry, checks });
        assert.equal(result.score, 90, id);
        assert.deepEqual(result.blocking, [id], id);
      }
    },
  },
];
