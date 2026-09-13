// task 01 — the worker's repo-availability guard runs BEFORE any worktree: a repo it
// has proceeds, a repo it lacks streams a coded assignment-repo-unavailable failed and
// creates no worktree (milestone 35 / story 02, ADR-004, SECURITY T3a/F3). Exercised
// over the worker execution handler in a TEMP fixture repo with the local
// mesh.repo.published marker present/absent AND the worker's OWN local
// global_node_workspaces membership row present/absent (the STORY.md-directed JOIN —
// "use the LOCAL marker joined with the node-workspace mapping"), an injected status
// recorder, an injected clock, and an injected scripted spawnRuntime (never reached on
// a guard miss).
import assert from "node:assert/strict";
import { loadWorkspace } from "../../../src/work.mjs";
import { createMeshWorkerExecutionHandler, workerHasRepo } from "../../../src/mesh/worker-execution.mjs";
import { listWorktrees } from "../../../src/mesh/worktree.mjs";
import { withMeshWorkerExecFixture, markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder, scriptedSpawnRuntime, scriptedPushExec } from "../../support/mesh-worker-exec-fixture.mjs";

const NOW = "2026-07-09T10:00:00.000Z";
const NODE_ID = "worker-a";

function directive({ assignmentId = "asg-guard", itemRef, workspaceId }) {
  return { kind: "directive", to: NODE_ID, assignmentId, itemRef, workspaceId, at: NOW };
}

async function makeHandler(fx, ws, recorder, spawnOutcome = "done") {
  return createMeshWorkerExecutionHandler({
    pushExec: scriptedPushExec(),
    loadWs: () => Promise.resolve(ws),
    nodeId: NODE_ID,
    sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
    spawnRuntime: scriptedSpawnRuntime(spawnOutcome),
    now: () => NOW,
    globalWorkStoreOptions: { env: fx.env },
  });
}

export const meshWorkerRepoGuardTests = [
  {
    name: "worker-repo-guard/00 a repo the worker has (marker present, membership present) passes the guard and proceeds to materialization, streaming no assignment-repo-unavailable failure",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const handler = await makeHandler(fx, ws, recorder);
      await handler(directive({ itemRef: fx.itemRef, workspaceId: fx.workspaceId }));

      assert.ok(recorder.frames.some((f) => f.state === "accepted"), "the guard passes; an accepted frame is emitted (the worker proceeds to materialize a worktree)");
      assert.ok(!recorder.frames.some((f) => f.code === "assignment-repo-unavailable"), 'no "assignment-repo-unavailable" failure is streamed');
    }),
  },
  {
    name: "worker-repo-guard/00 a repo the worker lacks (neither fact seeded) streams a coded assignment-repo-unavailable failed frame, a structured miss never an opaque throw",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      // Neither the local mesh.repo.published marker nor the local global_node_workspaces row is seeded.
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const handler = await makeHandler(fx, ws, recorder);
      await assert.doesNotReject(() => handler(directive({ itemRef: fx.itemRef, workspaceId: fx.workspaceId })), "a repo-availability miss never throws (a structured coded miss, not an opaque crash)");

      assert.equal(recorder.frames.length, 1, "exactly one frame is streamed");
      assert.equal(recorder.frames[0].state, "failed");
      assert.equal(recorder.frames[0].code, "assignment-repo-unavailable");
    }),
  },
  {
    name: "worker-repo-guard/00 the guard runs before any worktree create — a miss creates no worktree and the mesh worktrees root holds no entry for the assignmentId",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const handler = await makeHandler(fx, ws, recorder);
      await handler(directive({ assignmentId: "asg-no-worktree", itemRef: fx.itemRef, workspaceId: fx.workspaceId }));

      const entries = await listWorktrees(fx.root);
      assert.equal(entries.length, 1, "only the primary working copy is registered — no worktree entry exists");
      assert.ok(!entries.some((e) => e.path.includes("asg-no-worktree")), 'the ".aof/mesh/worktrees/" root holds no entry for the assignmentId');
    }),
  },
  {
    name: "worker-repo-guard/00 repo availability is the JOIN of the node-workspace mapping and the local published marker — Scenario Outline (4 rows)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const rows = [
        { mapping: "present", marker: "present", outcome: "proceeds" },
        { mapping: "present", marker: "absent", outcome: "refused" },
        { mapping: "absent", marker: "present", outcome: "refused" },
        { mapping: "absent", marker: "absent", outcome: "refused" },
      ];
      for (const row of rows) {
        await withMeshWorkerExecFixture(async (inner) => {
          if (row.marker === "present") await markRepoPublished(inner.root, { workspaceId: inner.workspaceId });
          if (row.mapping === "present") await seedNodeWorkspaceMembership({ home: inner.home }, { nodeId: NODE_ID, workspaceId: inner.workspaceId });
          const ws = await loadWorkspace(inner.root, undefined, { env: inner.env });
          const result = await workerHasRepo(ws, inner.workspaceId, NODE_ID, { globalWorkStoreOptions: { env: inner.env } });
          if (row.outcome === "proceeds") {
            assert.equal(result, true, `[mapping=${row.mapping} marker=${row.marker}] proceeds to materialize a worktree`);
          } else {
            assert.equal(result, false, `[mapping=${row.mapping} marker=${row.marker}] streams a "failed" frame coded "assignment-repo-unavailable"`);
          }
        });
      }
    }),
  },
  {
    // 119/04 (task 01, the admission-join Scenario Outline) — THE THREE ROWS THE DELIVERED OUTLINE
    // ABOVE NEVER HAD. The four rows it does have vary presence/absence of the two facts; the
    // contract's table also varies the marker's own workspaceId and the store's readability, and
    // those three branches of `localMeshRepoPublished` / `localNodeWorkspaceMembership` had no test
    // at all. They are exactly the branches the seam-1 extraction moved, so "admission answers the
    // same way it answers today" was, for a third of its table, a claim nothing checked.
    name: "worker-repo-guard/00 the marker's OWN workspaceId, and an unreadable membership store — Scenario Outline (the 3 rows the join's table names and the four above do not)",
    run: async () => {
      // A marker published for a DIFFERENT workspace is not "this workspace's repo is available",
      // even with the membership row present.
      await withMeshWorkerExecFixture(async (fx) => {
        await markRepoPublished(fx.root, { workspaceId: "some-other-workspace" });
        await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
        const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
        assert.equal(
          await workerHasRepo(ws, fx.workspaceId, NODE_ID, { globalWorkStoreOptions: { env: fx.env } }),
          false,
          "[marker=other-workspace mapping=present] a marker published for a DIFFERENT workspaceId is a miss",
        );
      });

      // A PRE-workspaceId marker (published:true, no workspaceId key) is tolerated as a proceed —
      // absence-is-benign for an additive key, never a stricter regression.
      await withMeshWorkerExecFixture(async (fx) => {
        await markRepoPublished(fx.root, { workspaceId: undefined });
        await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
        const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
        assert.equal(ws.config?.mesh?.repo?.workspaceId, undefined, "the fixture really wrote a marker with no workspaceId key");
        assert.equal(
          await workerHasRepo(ws, fx.workspaceId, NODE_ID, { globalWorkStoreOptions: { env: fx.env } }),
          true,
          "[marker=no-workspaceId-key mapping=present] a pre-workspaceId marker still admits",
        );
      });

      // A membership store that will not open is a MISS, never a thrown fault out of the guard.
      await withMeshWorkerExecFixture(async (fx) => {
        await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
        const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
        const refusing = () => { throw new Error("the local projection store is unreachable"); };
        assert.equal(
          await workerHasRepo(ws, fx.workspaceId, NODE_ID, { openStore: refusing, globalWorkStoreOptions: { env: fx.env } }),
          false,
          "[marker=present store=unreadable] an unreachable local store degrades to a miss",
        );
      });
    },
  },
];
