// FF-15404 / ADR-005: Codex shared files must pass ownership preflight.
// Ownership is a store boundary; the frozen bundle parity directory is not expanded.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRenderPlan, planApplyActions, executeApplyActions } from "../../../packages/core/src/render-plan.mjs";

export function ownershipProblems(actions) {
  return actions.filter(action => action.runtime === "codex" && ["create", "update", "delete"].includes(action.action)
    && action.expectedCurrentHash === undefined).map(action => `Codex mutation lacks a recorded preflight baseline: ${action.path}`);
}

export const archTests = [
  { name: "FF-15404 Codex output ownership: shared guidance merges and native collisions refuse before mutation",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff15404-"));
      try {
        await mkdir(path.join(root, ".codex/agents"), { recursive: true });
        await writeFile(path.join(root, "AGENTS.md"), "operator guidance\n");
        await writeFile(path.join(root, ".codex/agents/review.toml"), "operator agent\n");
        const outputs = await createRenderPlan({ resources: [
          { id: "review", kind: "agent", runtimes: ["codex"], body: "Review." },
          { id: "guidance", kind: "rule", runtimes: ["codex"], body: "Owned guidance." }
        ], workflows: [], packages: [] }, { targetDir: root, runtimes: ["codex"] });
        const actions = await planApplyActions(outputs, null, { targetDir: root, force: true });
        assert.equal(actions.find(action => action.resource.kind === "agent").action, "conflict");
        assert.match(actions.find(action => action.resource.kind === "rule").content, /^operator guidance\n/);
        assert.deepEqual(ownershipProblems(actions), []);
        await assert.rejects(executeApplyActions(actions), /unowned target/);
        assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), "operator guidance\n");
        assert.equal(await readFile(path.join(root, ".codex/agents/review.toml"), "utf8"), "operator agent\n");
      } finally { await rm(root, { recursive: true, force: true }); }
    } },
  { name: "FF-15404 self-check: planted unchecked overwrites and deletions trip the control",
    run: async () => {
      for (const action of ["create", "update", "delete"]) {
        assert.equal(ownershipProblems([{ runtime: "codex", path: "AGENTS.md", action }]).length, 1);
        assert.deepEqual(ownershipProblems([{ runtime: "codex", path: "AGENTS.md", action, expectedCurrentHash: null }]), []);
      }
    } }
];
