import assert from "node:assert/strict";

import { computeLoopReady } from "../../src/work/doctor-loop-ready.mjs";

const IDS = ["stream-coherent", "cap-declared", "memory-on", "tasks-authored", "grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale"];
const registry = { present: false, composed: false, error: 0, warn: 0 };

function score(states) {
  return computeLoopReady({
    registry,
    checks: states.map((state, index) => ({ id: IDS[index], state, evidence: `${IDS[index]} ${state}` })),
  });
}

export const loopReadyScoreTests = [
  {
    name: "loop-ready/04 equal weights count pass and applicable rows exactly",
    run() {
      const result = score(["pass", "fail", "not-applicable", "pass"]);
      assert.equal(result.passed, 2);
      assert.equal(result.applicable, 3);
      assert.equal(result.score, 67);
      assert.deepEqual(result.blocking, ["cap-declared"]);
    },
  },
  {
    name: "loop-ready/04 all sixteen base combinations have exact arithmetic and rung semantics",
    run() {
      for (let mask = 0; mask < 16; mask += 1) {
        const states = Array.from({ length: 4 }, (_, index) => (mask & (1 << index)) ? "pass" : "fail");
        const result = score(states);
        const passed = states.filter((state) => state === "pass").length;
        assert.equal(result.passed, passed);
        assert.equal(result.applicable, 4);
        assert.equal(result.score, passed * 25);
        assert.equal(result.clears, states[0] === "fail" ? "none" : passed === 4 ? "L2" : "L1");
        assert.deepEqual(result.blocking, states.flatMap((state, index) => state === "fail" ? [IDS[index]] : []));
        assert.equal(result.blocking.length === 0, result.clears === "L2");
      }
    },
  },
  {
    name: "loop-ready/04 registry denominator ten counts every passed row equally",
    run() {
      const expected = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      for (let passed = 0; passed <= 10; passed += 1) {
        const states = Array.from({ length: 10 }, (_, index) => index < passed ? "pass" : "fail");
        const result = score(states);
        assert.equal(result.score, expected[passed]);
        assert.ok(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100);
      }
    },
  },
  {
    name: "loop-ready/04 non-ten-row projections retain integer rounding",
    run() {
      for (const [passed, expected] of [[1, 13], [3, 38], [5, 63], [7, 88]]) {
        const states = Array.from({ length: 8 }, (_, index) => index < passed ? "pass" : "fail");
        assert.equal(score(states).score, expected);
      }
      assert.equal(score(["pass", "fail", "fail"]).score, 33);
      assert.equal(score(["pass", "pass", "fail"]).score, 67);
    },
  },
  {
    name: "loop-ready/04 zero applicable rows fail closed with total arithmetic",
    run() {
      const result = score(Array(10).fill("not-applicable"));
      assert.equal(result.passed, 0);
      assert.equal(result.applicable, 0);
      assert.equal(result.score, 0);
      assert.equal(result.clears, "none");
      assert.deepEqual(result.blocking, []);
      assert.ok(Number.isInteger(result.score));
    },
  },
  {
    name: "loop-ready/04 the failing row changes blockers and rung but never equal-weight score",
    run() {
      const results = Array.from({ length: 4 }, (_, failing) => score(Array.from({ length: 4 }, (_, index) => index === failing ? "fail" : "pass")));
      assert.deepEqual(results.map((result) => result.score), [75, 75, 75, 75]);
      assert.deepEqual(results.map((result) => result.passed), [3, 3, 3, 3]);
      assert.deepEqual(results.map((result) => result.clears), ["none", "L1", "L1", "L1"]);
    },
  },
  {
    name: "loop-ready/04 composed failures hold L2 down and blockers remain frozen-order complete",
    run() {
      const grounding = score(["pass", "pass", "pass", "pass", "fail", "pass", "pass", "pass", "pass", "pass"]);
      assert.equal(grounding.passed, 9);
      assert.equal(grounding.applicable, 10);
      assert.equal(grounding.score, 90);
      assert.equal(grounding.clears, "L1");
      assert.deepEqual(grounding.blocking, ["grounding"]);

      const mixed = score(["fail", "pass", "fail", "pass", "pass", "pass", "pass", "pass", "pass", "fail"]);
      assert.deepEqual(mixed.blocking, ["stream-coherent", "memory-on", "timescale"]);
      assert.equal(mixed.clears, "none");
      assert.equal(JSON.stringify(mixed).includes("L3"), false);
    },
  },
];
