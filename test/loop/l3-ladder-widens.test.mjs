import assert from "node:assert/strict";

import { LOCKED_LOOP_LEVELS, LOOP_LEVELS, decideLoop, resolveLoopLevel } from "../../src/work/loop.mjs";
import { loopCommand } from "../../src/commands/loop.mjs";
import { cleanL3Gate, makeQualifiedL3Repo } from "../support/l3-gate-fixture.mjs";

const ready = {
  scope: "07",
  cap: 3,
  next: { state: "ready", ref: "07/00", type: "story", status: "in-progress" },
  tasks: { tasks: [{ counts: { uat: 0 } }] },
};

export const l3LadderWidensTests = [
  {
    name: "l3-unlocked/00 the frozen ladder contains L3 and no level remains locked",
    run() {
      assert.deepEqual(LOOP_LEVELS, ["L1", "L2", "L3"]);
      assert.deepEqual(LOCKED_LOOP_LEVELS, {});
      assert.equal(Object.isFrozen(LOOP_LEVELS), true);
      assert.equal(Object.isFrozen(LOCKED_LOOP_LEVELS), true);
      const l2 = decideLoop({ ...ready, level: "L2" });
      const l3 = decideLoop({ ...ready, level: "L3", l3Gate: cleanL3Gate() });
      assert.deepEqual(l3.act, l2.act);
      assert.equal(l3.level, "L3");
      const unknown = resolveLoopLevel("L4");
      assert.equal(unknown.code, "loop-level-unknown");
      assert.deepEqual(unknown.known, ["L1", "L2", "L3"]);
      assert.deepEqual(unknown.locked, []);
    },
  },
  {
    name: "l3-unlocked/00 a qualifying workspace reaches the real command probe at L3",
    async run() {
      const fx = await makeQualifiedL3Repo();
      try {
        const result = await loopCommand.run({ scope: "07", level: "L3" }, fx.ctx);
        assert.equal(result.level, "L3");
        assert.equal(result.act.act, "drive");
        assert.equal(result.act.phase, "continue");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
