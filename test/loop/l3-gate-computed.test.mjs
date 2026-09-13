import assert from "node:assert/strict";

import { resolveLoopLevelGate } from "../../src/work/loop.mjs";
import { loopCommand } from "../../src/commands/loop.mjs";
import { loopFixture } from "./loop-command-probe.test.mjs";
import { cleanL3Gate } from "../support/l3-gate-fixture.mjs";

export const l3GateComputedTests = [
  {
    name: "l3-unlocked/01 both computed halves are required by the pure gate",
    run() {
      const clean = cleanL3Gate();
      assert.deepEqual(resolveLoopLevelGate("L3", clean), { admitted: true, level: "L3" });
      const rows = [
        [cleanL3Gate({ loopReady: { score: 90, clears: "L1", blocking: ["grounding"] } }), ["score"]],
        [cleanL3Gate({ groundedness: { components: [{ verdict: "exogenous-only", members: ["actor:operator", "loop:a"], groundClasses: ["exogenous"], staleAuthorities: [] }] } }), ["groundedness"]],
        [cleanL3Gate({ groundedness: { components: [{ verdict: "self-referential", members: ["loop:a"], groundClasses: [], staleAuthorities: [] }] } }), ["groundedness"]],
        [cleanL3Gate({ groundedness: { components: [{ verdict: "stale", members: ["loop:a"], groundClasses: ["build-stamp"], staleAuthorities: ["module:missing.mjs#stamp"] }] } }), ["groundedness"]],
        [cleanL3Gate({ loopReady: { score: 90, clears: "L1", blocking: ["grounding"] }, groundedness: { components: [{ verdict: "self-referential", members: ["loop:a"], groundClasses: [], staleAuthorities: [] }] } }), ["score", "groundedness"]],
      ];
      for (const [gate, failingHalves] of rows) {
        const result = resolveLoopLevelGate("L3", gate);
        assert.equal(result.code, "loop-level-gate");
        assert.deepEqual(result.failingHalves, failingHalves);
      }
    },
  },
  {
    name: "l3-unlocked/01 settings cannot admit a workspace that fails the computed gate",
    async run() {
      const fx = await loopFixture();
      try {
        fx.workspace.config.work.loop = { allowL3: true, enabled: true, unattended: true };
        fx.workspace.config.work.allowL3 = true;
        await assert.rejects(
          () => loopCommand.run({ scope: "03", level: "L3" }, fx.ctx),
          (error) => error?.code === "loop-level-gate",
        );
      } finally {
        await fx.cleanup();
      }
    },
  },
];
