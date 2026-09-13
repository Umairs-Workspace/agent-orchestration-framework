import assert from "node:assert/strict";
import {
  LOCKED_LOOP_LEVELS,
  LOOP_LEVELS,
  decideLoop,
  resolveLoopLevel,
  resolveLoopLevelGate,
} from "../../src/work/loop.mjs";
import { workLoopStoryFixturesFor } from "../support/work-loop-story-fixtures.mjs";

export const workLoopLevelLadderTests = [
  {
    name: "loop level ladder — the shared story fixtures stay executable",
    run() {
      for (const { name, args, expected } of workLoopStoryFixturesFor("level-ladder")) {
        assert.deepEqual(resolveLoopLevel(...args), expected, name);
      }
    },
  },
  {
    name: "loop level ladder — L1 through L3 are executable, absence defaults to L2",
    run() {
      assert.equal(Object.isFrozen(LOOP_LEVELS), true);
      assert.equal(Object.isFrozen(LOCKED_LOOP_LEVELS), true);
      assert.deepEqual(LOOP_LEVELS, ["L1", "L2", "L3"]);
      assert.deepEqual(Object.keys(LOCKED_LOOP_LEVELS), []);
      assert.deepEqual(resolveLoopLevel("L1"), { admitted: true, level: "L1" });
      assert.deepEqual(resolveLoopLevel("L2"), { admitted: true, level: "L2" });
      assert.deepEqual(resolveLoopLevel("L3"), { admitted: true, level: "L3" });
      assert.deepEqual(resolveLoopLevel(), { admitted: true, level: "L2" });
      assert.deepEqual(resolveLoopLevel(null), resolveLoopLevel());
    },
  },
  {
    name: "loop level ladder — L3 is computed-gated and near misses are unknown without coercion",
    run() {
      assert.equal(resolveLoopLevelGate("L3").code, "loop-level-gate");
      for (const level of ["", "l1", "l2", "l3", "L3 ", " L3", "L3\t", "L1 ", "   ", "L0", "L4", "L23", "1", "2", "3", 1, 2, 3, true, false, ["L2"], { level: "L2" }, "L1,L2", "L2 L1"]) {
        const result = resolveLoopLevel(level);
        assert.equal(result.code, "loop-level-unknown", String(level));
        assert.deepEqual(result.level, level);
        assert.deepEqual(result.known, ["L1", "L2", "L3"]);
        assert.deepEqual(result.locked, []);
      }
      assert.equal(resolveLoopLevel(["L3"]).code, "loop-level-unknown", "property-key coercion must not unlock the locked branch");
      const objectLevel = { z: [1], a: "L4" };
      const first = resolveLoopLevel(objectLevel);
      const second = resolveLoopLevel(objectLevel);
      assert.notEqual(first.level, objectLevel);
      assert.notEqual(first.level, second.level);
      first.level.z.push(2);
      assert.deepEqual(objectLevel, { z: [1], a: "L4" });
      assert.deepEqual(second.level, { a: "L4", z: [1] });
    },
  },
  {
    name: "loop level ladder — levels choose the same action and every admitted decision reports its level",
    run() {
      const base = {
        scope: "53",
        cap: 3,
        next: { state: "ready", ref: "53/01", type: "story", status: "in-progress" },
        tasks: { tasks: [{ counts: { uat: 0 } }] },
      };
      const l1 = decideLoop({ ...base, level: "L1" });
      const l2 = decideLoop({ ...base, level: "L2" });
      const l3 = decideLoop({
        ...base,
        level: "L3",
        l3Gate: {
          loopReady: { score: 100, clears: "L3" },
          groundedness: { present: true, state: "reported", components: [] },
        },
      });
      assert.deepEqual(l1.act, l2.act);
      assert.deepEqual(l2.act, l3.act);
      assert.equal(l1.level, "L1");
      assert.equal(l2.level, "L2");
      assert.equal(l3.level, "L3");
      assert.equal(l1.act.act, "drive");
      assert.equal(decideLoop({ scope: "bad", level: "L4" }).code, "loop-level-unknown");
    },
  },
];
