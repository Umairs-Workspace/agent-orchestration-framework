import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { runLoopBody } from "../../../src/commands/loop.mjs";
import { completingDriver, loopFixture } from "../../loop/loop-command-probe.test.mjs";

async function snapshot(root) {
  const files = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else files.set(path.relative(root, target), await readFile(target));
    }
  }
  await walk(root);
  return files;
}

function compare(before, after) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), "L1 added, removed, or renamed a path");
  for (const [name, bytes] of before) assert.deepEqual(after.get(name), bytes, `${name}: L1 moved bytes`);
}

export const archTests = [
  {
    name: "arch/53 FF-5306 (acd-loop-l1-read-only): a full L1 drive reports acts while preserving every fixture path and byte",
    run: async () => {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const lines = [];
        const before = await snapshot(fx.projectRoot);
        assert.ok(before.size >= 3, `fixture snapshot was non-vacuous: ${before.size} files`);
        const state = await runLoopBody(
          { scope: "03", level: "L1" },
          { ...fx.ctx, agentSessionDriverOptions: fake.options, report: (line) => lines.push(line) },
        );
        const after = await snapshot(fx.projectRoot);
        assert.deepEqual(lines, ["03 — drive verify", "03/01 — drive continue"], "L1 reports one act per in-scope actionable item through the report channel");
        assert.deepEqual(state.driven, [], "L1 mints no run records, so the frozen driven account remains empty");
        assert.deepEqual(
          Object.keys(state).sort(),
          ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"].sort(),
          "the report-channel account never grows an eleventh LoopState key",
        );
        assert.equal(fake.spawnCalls.length, 0);
        compare(before, after);
        assert.equal([...after.keys()].some((name) => name.includes(`${path.sep}runs${path.sep}`) || name.startsWith("runs")), false, "L1 minted no run record");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/53 FF-5306 (acd-loop-l1-read-only): the byte instrument catches an in-place rewrite that a file-list comparison cannot",
    run: async () => {
      const before = new Map([["STORY.md", Buffer.from("status: in-progress\n")]]);
      const after = new Map([["STORY.md", Buffer.from("status: done\n")]]);
      assert.deepEqual([...after.keys()], [...before.keys()], "the planted file lists are deliberately equal");
      assert.throws(() => compare(before, after), /STORY\.md/u);
    },
  },
];
