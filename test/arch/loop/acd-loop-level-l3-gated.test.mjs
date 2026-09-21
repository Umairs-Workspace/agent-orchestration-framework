import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  L3_SCORE_THRESHOLD,
  LOCKED_LOOP_LEVELS,
  LOOP_LEVELS,
  resolveLoopLevelGate,
} from "../../../src/work/loop.mjs";
import { loopCommand } from "../../../src/commands/loop.mjs";
import { loopFixture } from "../../loop/loop-command-probe.test.mjs";
import { cleanL3Gate, makeQualifiedL3Repo } from "../../support/l3-gate-fixture.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/55 FF-5508 extension (acd-loop-level-l3-gated): the frozen ladder is L1/L2/L3 and its locked set is empty",
    run: () => {
      assert.deepEqual(LOOP_LEVELS, ["L1", "L2", "L3"]);
      assert.deepEqual(LOCKED_LOOP_LEVELS, {});
      assert.equal(L3_SCORE_THRESHOLD, 100);
      assert.equal(Object.isFrozen(LOOP_LEVELS), true);
      assert.equal(Object.isFrozen(LOCKED_LOOP_LEVELS), true);
      assert.throws(() => LOOP_LEVELS.push("L4"), TypeError);
      assert.throws(() => { LOCKED_LOOP_LEVELS.L4 = {}; }, TypeError);
    },
  },
  {
    name: "arch/55 FF-5508 extension (acd-loop-level-l3-gated): admission reads only injected score and groundedness facts",
    run: async () => {
      const engine = stripComments(await readFile(path.join(root, "src", "work", "loop.mjs"), "utf8"));
      const gateBody = functionBody(engine, "resolveLoopLevelGate");
      assert.ok(gateBody.length > 200, "the real gate body was read");
      assert.doesNotMatch(gateBody, /\bconfig\b|process\.env|\benv\b|\bflag\b/u);
      assert.match(gateBody, /gate\?\.loopReady/u);
      assert.match(gateBody, /gate\?\.groundedness/u);
      assert.deepEqual(resolveLoopLevelGate("L3", cleanL3Gate()), { admitted: true, level: "L3" });
      assert.equal(resolveLoopLevelGate("L3", cleanL3Gate({ loopReady: { score: 99, clears: "L1" } })).code, "loop-level-gate");
    },
  },
  {
    name: "arch/55 FF-5508 extension (acd-loop-level-l3-gated): the command gathers both halves through registered commands before any drive",
    run: async () => {
      const source = stripComments(await readFile(path.join(root, "src", "commands", "loop.mjs"), "utf8"));
      const body = functionBody(source, "resolveInvocation");
      assert.match(body, /invokeRegistered\(\s*["']work:doctor["']/u);
      assert.match(body, /invokeRegistered\(\s*["']work:loops-groundedness["']/u);
      assert.match(body, /resolveLoopLevelGate\(resolved\.level, l3Gate\)/u);
      // 126/00 task03 (ADR-002 §6) adds `quiet` — the flag lands in the schema, `cli.spec.flags`
      // and `cli.argv`, or it does not exist. An expected succession of this pin, not a drift:
      // the schema is still closed, `required` is still `["scope"]`, and the gathering this
      // control is actually about is untouched. 130/02 (ADR-002 §1) adds `stop` by the same rule.
      assert.deepEqual(
        Object.keys(loopCommand.input.properties),
        ["scope", "level", "resume", "cap", "reviewClaims", "dryRun", "quiet", "supervised", "stop"],
      );
      assert.equal(loopCommand.input.additionalProperties, false);
    },
  },
  {
    name: "arch/55 FF-5508 extension (acd-loop-level-l3-gated): the real command admits earned L3 and refuses configured imitation",
    run: async () => {
      const qualified = await makeQualifiedL3Repo();
      try {
        const result = await loopCommand.run({ scope: "07", level: "L3" }, qualified.ctx);
        assert.equal(result.level, "L3");
      } finally {
        await qualified.cleanup();
      }

      const refused = await loopFixture();
      try {
        refused.workspace.config.work.loop = { allowL3: true };
        await assert.rejects(
          () => loopCommand.run({ scope: "03", level: "L3" }, refused.ctx),
          (error) => error?.code === "loop-level-gate"
            && Array.isArray(error?.detail?.failingHalves)
            && error.detail.failingHalves.length > 0,
        );
      } finally {
        await refused.cleanup();
      }
    },
  },
  {
    name: "arch/55 FF-5508 extension (acd-loop-level-l3-gated): the obsolete no-L3-branch proxy is deleted",
    run: () => {
      assert.equal(existsSync(path.join(root, "test", "arch", "acd-loop-level-l3-locked.test.mjs")), false);
    },
  },
];
