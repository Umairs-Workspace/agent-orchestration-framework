import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { completingDriver, loopFixture, treeFiles } from "./loop-command-probe.test.mjs";

async function refusal(fn, code) {
  await assert.rejects(fn, (error) => error?.code === code);
}

export const loopCommandRefusalTests = [{
  name: "loop command refusals — unsupported scope, inverted range, computed-gated/unknown levels, and invalid cap are inert and coded",
  async run() {
    const fx = await loopFixture();
    try {
      const before = await treeFiles(fx.projectRoot);
      await refusal(() => loopCommand.run({ scope: "03/01" }, fx.ctx), "loop-scope-unsupported");
      await refusal(() => loopCommand.run({ scope: "03-02" }, fx.ctx), "loop-scope-unsupported");
      await refusal(() => loopCommand.run({ scope: "03", level: "L3" }, fx.ctx), "loop-level-gate");
      await refusal(() => loopCommand.run({ scope: "03", level: "L9" }, fx.ctx), "loop-level-unknown");
      await refusal(() => loopCommand.run({ scope: "03", cap: 0 }, fx.ctx), "loop-bound-unresolved");
      assert.deepEqual(await treeFiles(fx.projectRoot), before);
    } finally {
      await fx.cleanup();
    }
  },
}, {
  name: "loop command inert L1 — reports hypothetical acts without recording a drive or changing fixture bytes",
  async run() {
    const fx = await loopFixture();
    try {
      const driver = completingDriver(fx);
      const reports = [];
      const beforeFiles = await treeFiles(fx.projectRoot);
      const before = new Map(await Promise.all(beforeFiles.map(async (file) => [file, await readFile(`${fx.projectRoot}/${file}`)])));
      const state = await runLoopBody(
        { scope: "03", level: "L1" },
        { ...fx.ctx, agentSessionDriverOptions: driver.options, report: (line) => reports.push(line) },
      );
      assert.equal(driver.spawnCalls.length, 0);
      assert.deepEqual(Object.keys(state), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
      assert.deepEqual(state.driven, []);
      assert.equal("reports" in state, false);
      assert.ok(reports.length >= 1);
      assert.ok(reports.includes("03/01 — drive continue"));
      assert.deepEqual(await treeFiles(fx.projectRoot), beforeFiles);
      for (const [file, bytes] of before) assert.deepEqual(await readFile(`${fx.projectRoot}/${file}`), bytes);
    } finally {
      await fx.cleanup();
    }
  },
}];
