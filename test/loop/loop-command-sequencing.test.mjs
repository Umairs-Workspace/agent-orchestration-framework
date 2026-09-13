import assert from "node:assert/strict";
import path from "node:path";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";

export const loopCommandSequencingTests = [{
  name: "loop command sequencing — work:next drives continue, gate, verify, then the milestone in stream order",
  async run() {
    const fx = await loopFixture();
    try {
      const driver = completingDriver(fx, {
        onCommand(command) {
          if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
          if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
        },
      });
      const state = await runLoopBody(
        { scope: "03" },
        { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} },
      );
      assert.deepEqual(driver.typed.map((t) => t.split("\n\n")[0]), ["/aof:continue 03/01", "/aof:verify 03/01", "/aof:verify 03"], "each driven phase leads its first input with its own directive (70/00's compiled brief follows)");
      assert.equal(state.state, "done");
      assert.deepEqual(state.driven.map(({ ref, phase, cycle }) => ({ ref, phase, cycle })), [
        { ref: "03/01", phase: "continue", cycle: 1 },
        { ref: "03/01", phase: "verify", cycle: 1 },
        { ref: "03", phase: "verify", cycle: 1 },
      ]);
    } finally {
      await fx.cleanup();
    }
  },
}];
