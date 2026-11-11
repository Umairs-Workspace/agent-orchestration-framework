import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// m42 wave (b) / TECH_DEBT item 4 — the CLONE-TIME IDENTITY PIN. A scoped checkout's
// identity used to be re-derived from ITS OWN path on each machine (a different id
// per machine for the same repo): the Mac's checkout of lark-guard answered
// 14d86b2b… while the fleet's canonical id was 1f164bd0… — the worker's
// launch-workspace frames were refused and workspace-workdir-unresolvable spammed
// every 5s, forever. The id the assignment arrived under is pinned into the fresh
// checkout's own config at clone time, so resolveWorkspaceId answers the SAME id on
// every machine from then on.
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
const cloneRepoForWorkspace = _aofApplication.mesh.worker.cloneRepoForWorkspace;
const workerHasRepo = _aofApplication.mesh.worker.workerHasRepo;
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
import { withMeshWorkerExecFixture, seedNodeWorkspaceMembership } from "../../support/mesh-worker-exec-fixture.mjs";

const NOW = "2026-07-26T12:00:00.000Z";
const CANONICAL_ID = "1f164bd03ea535da";

// A clone fake that materialises a plausible cloned repo: the target dir with a
// COMMITTED .aof/aof.config.json carrying the repo's own keys (but NO pinned id —
// the pre-fix reality for every real workspace).
function fakeCloneExec({ committedConfig } = {}) {
  const calls = [];
  return {
    calls,
    exec: async (args) => {
      calls.push(args);
      const target = args[args.length - 1];
      await mkdir(path.join(target, ".aof"), { recursive: true });
      await mkdir(path.join(target, ".git"), { recursive: true });
      if (committedConfig !== null) {
        await writeFile(
          path.join(target, ".aof", "aof.config.json"),
          `${JSON.stringify(committedConfig ?? { name: "lark-guard-portal", work: { dir: "./wiki/work" } }, null, 2)}\n`,
          "utf8",
        );
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  };
}

export const meshCloneIdentityPinTests = [
  {
    name: "clone-identity-pin/item-4 a fresh checkout is pinned with the ASSIGNMENT's workspaceId — resolveWorkspaceId answers the canonical id, and the committed config's own keys survive the merge",
    async run() {
      await withMeshWorkerExecFixture(async (fx) => {
        const clone = fakeCloneExec();
        const checkoutPath = await cloneRepoForWorkspace(fx.workspace, {
          workspaceId: CANONICAL_ID,
          nodeId: "worker-a",
          assignmentId: "asg-pin-1",
          cloneUrl: "https://example.com/lark-guard-portal.git",
          now: NOW,
          options: { cloneExec: clone.exec, globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions },
        });

        const config = JSON.parse(await readFile(path.join(checkoutPath, ".aof", "aof.config.json"), "utf8"));
        assert.equal(config.mesh.workspaceId, CANONICAL_ID, "the assignment's id is pinned into the checkout's own config");
        assert.equal(config.name, "lark-guard-portal", "the committed config's own keys survive the merge");

        // THE point, end-to-end: a workspace loaded from this checkout resolves the
        // CANONICAL id — never this machine's path derivation.
        const checkoutWs = await loadWorkspace(checkoutPath, undefined, { env: fx.env });
        assert.equal(resolveWorkspaceId(checkoutWs), CANONICAL_ID, "resolveWorkspaceId answers the fleet's id on THIS machine");
      });
    },
  },
  {
    name: "clone-identity-pin/item-4 a repo with NO committed aof config still gets pinned (fresh { mesh } config) — the pin is the fact that matters",
    async run() {
      await withMeshWorkerExecFixture(async (fx) => {
        const clone = fakeCloneExec({ committedConfig: null });
        const checkoutPath = await cloneRepoForWorkspace(fx.workspace, {
          workspaceId: CANONICAL_ID,
          nodeId: "worker-a",
          assignmentId: "asg-pin-2",
          cloneUrl: "https://example.com/bare-repo.git",
          now: NOW,
          options: { cloneExec: clone.exec, globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions },
        });
        const config = JSON.parse(await readFile(path.join(checkoutPath, ".aof", "aof.config.json"), "utf8"));
        assert.equal(config.mesh.workspaceId, CANONICAL_ID);
      });
    },
  },
  {
    // TECH_DEBT 21: a workspace was dispatchable exactly once per worker checkout. The second
    // dispatch's clone-on-miss ran `git clone` into the existing checkout and failed with
    // "destination path … already exists and is not an empty directory".
    name: "clone-identity-pin/item-21 a clone-on-miss onto a checkout that already pins this workspace reuses it: no git clone, and the membership row is re-asserted",
    async run() {
      await withMeshWorkerExecFixture(async (fx) => {
        const first = fakeCloneExec();
        const args = { workspaceId: CANONICAL_ID, nodeId: "worker-a", assignmentId: "asg-21-a", cloneUrl: "https://example.com/lark-guard-portal.git", now: NOW };
        const opts = { globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions };
        const checkoutPath = await cloneRepoForWorkspace(fx.workspace, { ...args, options: { ...opts, cloneExec: first.exec } });
        assert.equal(first.calls.length, 1, "the first dispatch clones");

        const second = fakeCloneExec();
        const again = await cloneRepoForWorkspace(fx.workspace, { ...args, assignmentId: "asg-21-b", options: { ...opts, cloneExec: second.exec } });
        assert.equal(again, checkoutPath, "the same checkout answers");
        assert.equal(second.calls.length, 0, "no git clone into the existing checkout");
      });
    },
  },
  {
    // TECH_DEBT 4 (D): launchd starts the daemons in `/`. The clone wrote its repo marker into the
    // launch folder's config, `/.aof/aof.config.json`, which cannot be written, so clone-on-miss
    // failed for any launchd-started worker. A launch folder that is not a workspace gets no marker;
    // the checkout's own pin is the availability fact.
    name: "clone-identity-pin/item-4 a launch folder with no aof config gets no marker written, and the cloned repo still reads as available from its pinned checkout",
    async run() {
      await withMeshWorkerExecFixture(async (fx) => {
        const launch = path.join(path.dirname(fx.root), "launch-not-a-workspace");
        await mkdir(launch, { recursive: true });
        const launchWs = await loadWorkspace(launch, undefined, { env: fx.env });
        await cloneRepoForWorkspace(launchWs, {
          workspaceId: CANONICAL_ID, nodeId: "worker-a", assignmentId: "asg-launchd", cloneUrl: "https://example.com/lark-guard-portal.git", now: NOW,
          options: { cloneExec: fakeCloneExec().exec, globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions },
        });
        await assert.rejects(access(path.join(launch, ".aof", "aof.config.json")), "nothing is written into the launch folder");
        const fresh = await loadWorkspace(launch, undefined, { env: fx.env });
        assert.equal(await workerHasRepo(fresh, CANONICAL_ID, "worker-a", { globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions }), true,
          "a freshly loaded launch workspace (no marker) still sees the repo, from its pinned checkout and the membership row");
      });
    },
  },
  {
    name: "clone-identity-pin/item-4 a checkout pinned to ANOTHER workspace, or not a git checkout, is not this workspace's repo",
    async run() {
      await withMeshWorkerExecFixture(async (fx) => {
        const opts = { globalWorkStoreOptions: fx.ctx.globalWorkStoreOptions };
        await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: "worker-a", workspaceId: CANONICAL_ID });
        const launch = path.join(path.dirname(fx.root), "launch-bare");
        await mkdir(launch, { recursive: true });
        const ws = await loadWorkspace(launch, undefined, { env: fx.env });
        const checkoutPath = await cloneRepoForWorkspace(ws, { workspaceId: CANONICAL_ID, nodeId: "worker-a", assignmentId: "asg-x", cloneUrl: "https://example.com/x.git", now: NOW, options: { ...opts, cloneExec: fakeCloneExec().exec } });
        const configPath = path.join(checkoutPath, ".aof", "aof.config.json");
        const pinned = JSON.parse(await readFile(configPath, "utf8"));
        await writeFile(configPath, JSON.stringify({ ...pinned, mesh: { workspaceId: "0ther0000000000" } }), "utf8");
        assert.equal(await workerHasRepo(ws, CANONICAL_ID, "worker-a", opts), false, "pinned to another id");
      });
    },
  },
];
