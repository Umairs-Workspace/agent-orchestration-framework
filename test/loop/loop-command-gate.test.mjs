import assert from "node:assert/strict";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture, replaceStatus } from "./loop-command-probe.test.mjs";

const invalidFeature = `Feature: Invalid
  Scenario: missing lane
    Given a fixture
`;
const validFeature = `@executable
Feature: Repaired
  Scenario: repaired
    Given a fixture
    When it runs
    Then it passes
`;

export const loopCommandGateTests = [
  {
    name: "loop command gate — a red registered validate result re-drives continue before verify",
    async run() {
      const fx = await loopFixture();
      try {
        const feature = path.join(fx.storyDir, "tasks", "00_ready.feature");
        writeFileSync(feature, invalidFeature);
        let continues = 0;
        const driver = completingDriver(fx, {
          onCommand(command) {
            if (command === "/aof:continue 03/01" && ++continues === 2) writeFileSync(feature, validFeature);
            if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
            if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
          },
        });
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.deepEqual(driver.typed.slice(0, 3).map((t) => t.split("\n\n")[0]), ["/aof:continue 03/01", "/aof:continue 03/01", "/aof:verify 03/01"]);
        assert.deepEqual(state.driven.filter((row) => row.phase === "continue").map((row) => row.cycle), [1, 2]);
        assert.equal(state.state, "done");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command gate — the declared review cap bounds a permanently red gate independently of engine cycles",
    async run() {
      const fx = await loopFixture({ cap: 3 });
      try {
        writeFileSync(path.join(fx.storyDir, "tasks", "00_ready.feature"), invalidFeature);
        const driver = completingDriver(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.deepEqual(driver.typed.map((t) => t.split("\n\n")[0]), ["/aof:continue 03/01", "/aof:continue 03/01"]);
        assert.equal(state.state, "halted");
        assert.equal(state.cap, 3, "the engine cap remains a separate value");
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "review:rounds>=cap");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
