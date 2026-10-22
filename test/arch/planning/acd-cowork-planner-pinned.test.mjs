// Fitness function FF-16504 for milestone 165 / ADR-003:
// "A planner package is produced only from a tree whose HEAD equals the resolved 40-hex
//  sha, cloned over HTTPS at MARKETPLACE_REF; pm-ai-shipping is never packaged; every
//  package carries LICENSE."
//
// Proofs:
//  1. The live clone's argv is a shallow HTTPS clone at the release tag — never the SSH
//     shorthand, never a bare sha as the ref (m02 ADR-007, ADR-008).
//  2. A tree whose HEAD is not the sha produces no package, and neither does a ref that is
//     not a 40-hex commit (checked before any clone).
//  3. Over a tree that holds pm-ai-shipping, with the optional set on, it is never packaged,
//     and every package that is produced carries the root LICENSE byte for byte.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { packagePlanner, plannerCloneArgv } from "../../../packages/core/src/planning/cowork-planner.mjs";
import { MARKETPLACE_REF } from "../../../packages/core/src/planning-init.mjs";

const SHA = "5042ff6169e0df49086c846f69bf7b6cdb67a6de";
const LICENSE = "MIT License\n";

async function fixtureTree() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-arch-planner-"));
  for (const name of ["pm-execution", "pm-product-discovery", "pm-product-strategy", "pm-market-research", "pm-ai-shipping"]) {
    await mkdir(path.join(dir, name, ".claude-plugin"), { recursive: true });
    await writeFile(path.join(dir, name, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  }
  await writeFile(path.join(dir, "LICENSE"), LICENSE);
  return dir;
}

export const archTests = [
  {
    name: "arch/FF-16504: the live planner clone is a shallow HTTPS clone at the release tag",
    run: () => {
      const argv = plannerCloneArgv("/tmp/x");
      assert.deepEqual(argv.slice(0, 4), ["-c", "core.autocrlf=false", "-c", "core.eol=lf"], "the checkout keeps the commit's bytes");
      assert.deepEqual(argv.slice(4, 9), ["clone", "--depth", "1", "--branch", MARKETPLACE_REF]);
      assert.match(MARKETPLACE_REF, /^v\d/, "the ref is the release tag, not a sha");
      assert.match(argv[9], /^https:\/\/github\.com\/phuryn\/pm-skills\.git$/, "cloned over HTTPS");
      assert.equal(argv[10], "/tmp/x");
    }
  },
  {
    name: "arch/FF-16504: no package comes from a tree whose HEAD is not the sha, or for a ref that is not a commit",
    run: async () => {
      const dir = await fixtureTree();
      try {
        const moved = await packagePlanner({ sha: SHA, source: { dir, head: "0".repeat(40) } });
        assert.equal(moved.ok, false);
        assert.deepEqual(moved.packages, []);
        let cloned = false;
        const floating = await packagePlanner({ sha: MARKETPLACE_REF, clone: () => { cloned = true; return { ok: false }; } });
        assert.equal(floating.reason, "sha-not-pinned");
        assert.equal(cloned, false, "refused before any clone");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  },
  {
    name: "arch/FF-16504: pm-ai-shipping is never packaged, and every package carries the root LICENSE",
    run: async () => {
      const dir = await fixtureTree();
      try {
        const result = await packagePlanner({ sha: SHA, withOptional: true, source: { dir, head: SHA } });
        assert.equal(result.ok, true);
        assert.ok(result.packages.length > 0);
        assert.ok(!result.packages.some((entry) => entry.name === "pm-ai-shipping"), "pm-ai-shipping is never packaged");
        for (const entry of result.packages) {
          assert.equal(Buffer.from(entry.files.LICENSE ?? "").toString("utf8"), LICENSE, `${entry.name} carries LICENSE`);
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  }
];
