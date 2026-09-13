import assert from "node:assert/strict";

import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { resolveLoopLevelGate } from "../../src/work/loop.mjs";
import { completingDriver, loopFixture, treeFiles } from "./loop-command-probe.test.mjs";
import { cleanL3Gate } from "../support/l3-gate-fixture.mjs";

export const l3GateRefusalTests = [
  {
    name: "l3-unlocked/02 score, floating component, and stale authority particulars are structured",
    run() {
      const refusal = resolveLoopLevelGate("L3", cleanL3Gate({
        loopReady: { score: 80, clears: "L1", blocking: ["anchor-grounding", "timescale"] },
        groundedness: {
          components: [
            { verdict: "self-referential", members: ["loop:a", "loop:b"], groundClasses: [], staleAuthorities: [] },
            { verdict: "stale", members: ["loop:c"], groundClasses: ["build-stamp"], staleAuthorities: ["module:missing.mjs#stamp"] },
          ],
          authorities: [{ anchor: "anchor:stamp", pointer: "module:missing.mjs#stamp", resolved: false }],
        },
      }));
      assert.equal(refusal.code, "loop-level-gate");
      assert.deepEqual(refusal.failingHalves, ["score", "groundedness"]);
      assert.deepEqual(refusal.score.blocking, ["anchor-grounding", "timescale"]);
      assert.deepEqual(refusal.groundedness.components[0].members, ["loop:a", "loop:b"]);
      assert.deepEqual(refusal.groundedness.staleAuthorities, [{ anchor: "anchor:stamp", pointer: "module:missing.mjs#stamp" }]);
    },
  },
  {
    name: "l3-unlocked/02 a real refused request is coded, inert, and starts no session or run",
    async run() {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(fx.projectRoot);
        await assert.rejects(
          () => runLoopBody({ scope: "03", level: "L3" }, ctx),
          (error) => {
            assert.equal(error.code, "loop-level-gate");
            assert.ok(Array.isArray(error.detail.failingHalves));
            assert.ok(error.detail.failingHalves.length > 0);
            return true;
          },
        );
        assert.equal(fake.spawnCalls.length, 0);
        assert.deepEqual(await treeFiles(fx.projectRoot), before);
        await assert.rejects(() => loopCommand.run({ scope: "03", level: "L3" }, fx.ctx), { code: "loop-level-gate" });
      } finally {
        await fx.cleanup();
      }
    },
  },
];
