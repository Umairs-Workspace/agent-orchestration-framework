// test/ui/board-mesh-execution.test.mjs — VERIFICATION (board mesh-execution overlay,
// live two-machine soak 2026-07-25).
//
// THE DEFECT (operator-reported): the board showed milestone 18 as "not started" while a
// WORKER node was executing it, and kept saying so after it finished. The board reads the
// CONTROL node's own local record-doc frontmatter, which genuinely says `not-started` —
// the work happened on another machine, on a mesh branch this checkout does not have. The
// overlay answers the operator's three steps: (1) is it executing, (2) show THAT, (3) else
// fall back to local.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { assembleAssignmentRecord, insertAssignment, updateAssignmentState } from "../../src/assignment-record.mjs";
import { setItemBranch } from "../../src/mesh/assignment-directive.mjs";
import { readExecutionOverlay, applyExecutionOverlay, resolveScopedExecution } from "../../src/board-mesh-execution.mjs";
import { resolveContinueDecision, resolveDirectivePhase } from "../../src/commands/continue.mjs";
import { mergeWorkerItems, applyCachedProvenance } from "../../src/cache-read.mjs";
import { listCommand, applyAskOverlay } from "../../src/commands/list.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { loopAsksDir, openAsk, parkAsk, answerAsk, clearAsk, askRequestPath } from "../../src/loop/ask-request.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { stripComments } from "../support/source-slice.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const WS = "ws-board-1";

async function withStore(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-board-overlay-"));
  const env = { AOF_GLOBAL_HOME: home };
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    return await fn({ store, env, home });
  } finally {
    store.close?.();
    await rm(home, { recursive: true, force: true });
  }
}

function seed(store, { assignmentId, itemRef, state = "assigned", node = "umamis-mac-mini", now = "2026-07-25T09:00:00.000Z" }) {
  insertAssignment(store, assembleAssignmentRecord({
    assignmentId, itemRef, workspaceId: WS, targetNodeId: node, issuer: "control", state: "assigned", now,
  }));
  if (state !== "assigned") updateAssignmentState(store, assignmentId, state, { now });
}

// The rows listStream produces (only the fields the overlay touches).
const localRows = () => ([
  { ref: "18", type: "milestone", slug: "homedata", status: "not-started", title: "Homedata", parent: null, dir: "/x/18" },
  { ref: "20", type: "milestone", slug: "other", status: "not-started", title: "Other", parent: null, dir: "/x/20" },
]);

export const boardMeshExecutionTests = [
  {
    name: "board-overlay/step 1+2: an item a worker is RUNNING reports in-progress with the executing node, session and branch — never the local `not-started`",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "running" });
      setItemBranch(store, WS, "18", "aof/mesh/18-73ab17b2");

      const overlay = await readExecutionOverlay({ projectRoot: "/x", workDir: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      const rows = applyExecutionOverlay(localRows(), overlay);
      const row18 = rows.find((r) => r.ref === "18");

      assert.equal(row18.status, "in-progress", "the board no longer reports the local `not-started` over a live worker run");
      assert.equal(row18.execution.active, true, "step 1: it IS being executed");
      assert.equal(row18.execution.nodeId, "umamis-mac-mini", "step 2: by THIS node");
      assert.equal(row18.execution.branch, "aof/mesh/18-73ab17b2", "…and the work lives on THIS branch (what the local checkout lacks)");

      // Step 3: an item with no mesh execution is untouched, byte-identical.
      const row20 = rows.find((r) => r.ref === "20");
      assert.equal(row20.status, "not-started", "an item with no execution keeps its LOCAL status");
      assert.equal(row20.execution, undefined, "…and gains nothing at all");
    }),
  },
  {
    name: "board-overlay: a QUEUED (assigned) item does NOT claim progress — the local status stands, with the execution facts alongside",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "assigned" });
      const overlay = await readExecutionOverlay({ projectRoot: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      const row18 = applyExecutionOverlay(localRows(), overlay).find((r) => r.ref === "18");
      assert.equal(row18.status, "not-started", "a merely-QUEUED item must not claim progress the worker has not made");
      assert.equal(row18.execution.active, true);
      assert.equal(row18.execution.state, "assigned", "…but the surface can still say `queued on <node>`");
    }),
  },
  {
    name: "board-overlay: a FINISHED mesh run is reported as active:false WITH its branch — the board can explain where completed work went instead of silently reading `not-started`",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "done" });
      setItemBranch(store, WS, "18", "aof/mesh/18-73ab17b2");
      const overlay = await readExecutionOverlay({ projectRoot: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      const row18 = applyExecutionOverlay(localRows(), overlay).find((r) => r.ref === "18");
      assert.equal(row18.execution.active, false, "a finished run never claims a LIVE execution");
      assert.equal(row18.status, "not-started", "…and never overrides the local status on its own");
      assert.equal(row18.execution.state, "done");
      assert.equal(row18.execution.branch, "aof/mesh/18-73ab17b2", "the operator can see WHERE the completed work is");
    }),
  },
  {
    name: "board-overlay: the MOST RECENT assignment wins — a re-assignment after a failure reports the run that matters now, never a stale earlier one",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "old", itemRef: "18", state: "failed", node: "old-node", now: "2026-07-25T09:00:00.000Z" });
      seed(store, { assignmentId: "new", itemRef: "18", state: "running", node: "umamis-mac-mini", now: "2026-07-25T10:00:00.000Z" });
      const overlay = await readExecutionOverlay({ projectRoot: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      const row18 = applyExecutionOverlay(localRows(), overlay).find((r) => r.ref === "18");
      assert.equal(row18.execution.nodeId, "umamis-mac-mini");
      assert.equal(row18.execution.state, "running");
      assert.equal(row18.status, "in-progress");
    }),
  },
  {
    name: "board-overlay/step 3: an unreadable/absent projection degrades to the LOCAL rows — a broken store can never break the board",
    run: async () => {
      const overlay = await readExecutionOverlay({ projectRoot: "/x" }, {
        openStore: async () => { throw new Error("projection unavailable"); },
      });
      assert.equal(overlay.size, 0, "a store fault yields no overlay");
      const rows = localRows();
      assert.deepEqual(applyExecutionOverlay(rows, overlay), rows, "…and the rows pass through byte-identical (the local view)");
    },
  },
  {
    name: "board-overlay: work:list is OPT-IN — the plain CLI call returns local rows and opens no store; only `mesh:true` overlays",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "running" });
      const ctx = {
        workspace: { projectRoot: "/x", workDir: "/x", config: { mesh: { workspaceId: WS } } },
        globalWorkStoreOptions: { env },
      };
      // listStream is stubbed by pointing workDir at an empty temp dir; the assertion here
      // is the SHAPE of the opt-in, not the row content.
      const plain = await listCommand.run({}, ctx);
      assert.ok(Array.isArray(plain), "the CLI form returns rows");
      assert.ok(plain.every((r) => r.execution === undefined), "…with NO execution overlay (no store opened)");
      assert.equal(listCommand.input.properties.mesh.type, "boolean", "`mesh` is a declared, opt-in input");
      assert.equal(listCommand.input.additionalProperties, false, "…on an otherwise closed input");
    }),
  },

  // ── the WORKER's own view (operator: "no stories are coming through") ───────
  //
  // The board showed "0 stories" over a milestone the agent had broken into seven,
  // because this checkout holds only the pre-run scaffold. The truth comes from the
  // WORKER — which streams the work-state of the worktree it is actually working in,
  // continuously, over the fabric — NOT from a git branch: a branch exists only after a
  // run commits and pushes, so branch-reading is blind for the whole run.
  {
    name: "worker-view: the worker's own rows REPLACE the local ones (its status/title win) and its EXTRA stories are inserted under the milestone — the breakdown this checkout has never seen",
    run: async () => {
      const local = [
        { ref: "18", type: "milestone", slug: "homedata", status: "not-started", title: "Homedata", parent: null, dir: "/x/18" },
        { ref: "20", type: "milestone", slug: "other", status: "not-started", title: "Other", parent: null, dir: "/x/20" },
      ];
      const worker = new Map([
        ["18", { ref: "18", type: "milestone", slug: "homedata", status: "in-progress", title: "Homedata", parent: null }],
        ["18/00", { ref: "18/00", type: "story", slug: "alpha", status: "in-review", title: "Alpha", parent: "18", sourcePath: "/wt/wiki/work/18_m/stories/00_story_alpha/STORY.md" }],
        ["18/01", { ref: "18/01", type: "story", slug: "beta", status: "not-started", title: "Beta", parent: "18", sourcePath: "/wt/wiki/work/18_m/stories/01_story_beta/STORY.md" }],
      ]);
      const merged = mergeWorkerItems(local, worker);

      assert.deepEqual(merged.map((r) => r.ref), ["18", "18/00", "18/01", "20"], "the worker's stories land under their milestone; unrelated items keep their place");
      assert.equal(merged[0].status, "in-progress", "the WORKER's status wins over the local not-started");
      assert.equal(merged[0].fromWorker, true, "…and the row is marked as the worker's view");
      assert.equal(merged[1].title, "Alpha");
      assert.equal(merged[3].status, "not-started", "an item the worker says nothing about is untouched");

      // AMENDED at 43/04's structural review (m43/ADR-014/E4). This line used to assert
      // `merged[1].reportedBy === "umamis-mac-mini"`, sourced from the ASSIGNMENT overlay's
      // target node — "which node was this item ASSIGNED to" wearing the wire key that means
      // "which node REPORTED this row". Two facts, one key: the merge's value happened to
      // agree whenever the assignee was also the reporter, and was wrong whenever it was not
      // (a control-published child under a worker's assignment), surviving only because the
      // provenance stamp overwrote it downstream. The MERGE now attributes nothing…
      assert.ok(!("reportedBy" in merged[1]), "the merge asserts nothing about who reported an inserted child — that is not a fact it holds");
      assert.ok(!("syncedAt" in merged[1]), "…and never a lone reportedBy without the instant beside it");
      // …and the ONE application point is what supplies both keys, from the cache's own
      // per-row author, for merged and inserted rows alike. Sourced from the SAME provenance
      // map `commands/list.mjs` builds, so this is the production composition, not a mock of
      // it — and the assignee here is deliberately a DIFFERENT node from the reporter, which
      // is exactly the case the old assertion got wrong.
      const stamped = applyCachedProvenance(merged, new Map([
        ["18/00", { reportedBy: "aof-control", syncedAt: "2026-08-03T11:59:00.000Z" }],
      ]));
      assert.equal(stamped[1].reportedBy, "aof-control", "attribution comes from the cache row's own author, not from who the item was assigned to");
      assert.equal(stamped[1].syncedAt, "2026-08-03T11:59:00.000Z", "…with its instant, always together");
      assert.ok(!("reportedBy" in stamped[2]), "a row the cache does not hold stays byte-identical — 'never published' is not 'author unknown'");
    },
  },
  {
    name: "worker-view: no worker rows ⇒ the local rows pass through byte-identical (local-first for every non-mesh item and workspace)",
    run: async () => {
      const local = localRows();
      assert.deepEqual(mergeWorkerItems(local, new Map()), local);
      assert.deepEqual(mergeWorkerItems(local, null), local);
    },
  },
  {
    name: "worker-view: a story the worker reports that ALSO exists locally is replaced, never duplicated",
    run: async () => {
      const local = [
        { ref: "18", type: "milestone", status: "not-started", dir: "/x/18" },
        { ref: "18/00", type: "story", status: "not-started", title: "stale local", parent: "18", dir: "/x/18/00" },
      ];
      const worker = new Map([
        ["18", { ref: "18", status: "in-progress" }],
        ["18/00", { ref: "18/00", status: "in-review", title: "from worker", parent: "18" }],
      ]);
      const merged = mergeWorkerItems(local, worker);
      assert.equal(merged.filter((r) => r.ref === "18/00").length, 1, "no duplicate row");
      assert.equal(merged.find((r) => r.ref === "18/00").status, "in-review", "the worker's row wins");
    },
  },
  // --- EXECUTION SCOPE (operator, 2026-07-26 — the story-continue defect): runs are
  // recorded at the TOP-LEVEL item, so a child ref inherits its scope's execution.
  // ONE rule, two consumers: the row overlay (below) and the continue decision. ---
  {
    name: "exec-scope: a STORY row inherits its milestone's execution (so the affordance says Running-on-node), WITHOUT a status override",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "running" });
      const overlay = await readExecutionOverlay({ projectRoot: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      const rows = applyExecutionOverlay([
        ...localRows(),
        { ref: "18/02", type: "story", slug: "uprn", status: "not-started", title: "UPRN", parent: "18", dir: "/x/18/02" },
      ], overlay);

      const story = rows.find((r) => r.ref === "18/02");
      assert.equal(story.execution?.active, true, "the story carries its milestone's live execution");
      assert.equal(story.execution?.nodeId, "umamis-mac-mini");
      assert.equal(story.execution?.scopeRef, "18", "…marked as inherited from the SCOPE, not its own");
      assert.equal(story.status, "not-started", "the story's OWN status is never overridden — the milestone runs, this story may be untouched");

      const milestone = rows.find((r) => r.ref === "18");
      assert.equal(milestone.execution?.scopeRef, "18", "an own-execution row carries scopeRef = itself");
      assert.equal(milestone.status, "in-progress", "the running milestone itself still reports progress");
    }),
  },
  {
    name: "exec-scope: resolveScopedExecution — own execution wins over the scope's; no execution anywhere → null",
    run: async () => {
      const overlay = new Map([
        ["18", { nodeId: "mac", active: true }],
        ["18/03", { nodeId: "other-node", active: false }],
      ]);
      assert.equal(resolveScopedExecution(overlay, "18/03").execution.nodeId, "other-node", "an own row wins");
      assert.equal(resolveScopedExecution(overlay, "18/03").scopeRef, "18/03");
      assert.equal(resolveScopedExecution(overlay, "18/02").execution.nodeId, "mac", "a story without its own row inherits the milestone's");
      assert.equal(resolveScopedExecution(overlay, "18/02").scopeRef, "18");
      assert.equal(resolveScopedExecution(overlay, "20"), null, "never-run → null (the local default)");
      assert.equal(resolveScopedExecution(new Map(), "18/02"), null);
    },
  },
  {
    name: "exec-scope: WORKER-ONLY story rows of a running milestone carry the inherited execution — overlay applies AFTER the worker merge (the reported defect: local checkout has no stories/, so the inserted rows skipped the overlay and still offered Continue)",
    run: async () => withStore(async ({ store, env }) => {
      seed(store, { assignmentId: "a1", itemRef: "18", state: "running" });
      const overlay = await readExecutionOverlay({ projectRoot: "/x", config: { mesh: { workspaceId: WS } } }, { globalWorkStoreOptions: { env } });
      // The control checkout holds ONLY the milestone scaffold; every story row comes
      // from the worker stream (the item-18 shape measured live 2026-07-26).
      const local = [{ ref: "18", type: "milestone", slug: "homedata", status: "not-started", title: "Homedata", parent: null, dir: "/x/18" }];
      const worker = new Map([
        ["18", { ref: "18", type: "milestone", slug: "homedata", status: "in-progress", title: "Homedata", parent: null, sourcePath: "/w/18/SPEC.md" }],
        ["18/02", { ref: "18/02", type: "story", slug: "uprn", status: "not-started", title: "UPRN", parent: "18", sourcePath: "/w/18/stories/02/STORY.md" }],
      ]);

      // The EXACT list.mjs composition: merge first, overlay last.
      const rows = applyExecutionOverlay(mergeWorkerItems(local, worker), overlay);

      const story = rows.find((r) => r.ref === "18/02");
      assert.ok(story, "the worker-only story row is present");
      assert.equal(story.fromWorker, true);
      assert.equal(story.execution?.active, true, "the inserted story carries the milestone's live execution — the affordance can now say Running-on-node");
      assert.equal(story.execution?.scopeRef, "18");
      assert.equal(story.status, "not-started", "its own streamed status is untouched");

      const milestone = rows.find((r) => r.ref === "18");
      assert.equal(milestone.execution?.active, true);
      assert.equal(milestone.status, "in-progress", "the fromWorker milestone keeps the WORKER's streamed status (the live truth), not a blanket override");
    }),
  },
  {
    name: "continue-decision: a story whose milestone is RUNNING answers 'running' — never local, never a second dispatch (the reported defect)",
    run: () => {
      const overlay = new Map([["18", { nodeId: "umamis-mac-mini", active: true, state: "running", assignmentId: "a1" }]]);
      const d = resolveContinueDecision(overlay, "18/02", { localNodeId: "control-node" });
      assert.equal(d.where, "running", "clicking Continue on a story of a live milestone spawns NOTHING");
      assert.equal(d.node, "umamis-mac-mini");
      assert.equal(d.scopeRef, "18");
      assert.equal(d.resolvedBy, "active-run");
      // …and the milestone itself answers the same.
      assert.equal(resolveContinueDecision(overlay, "18", { localNodeId: "control-node" }).where, "running");
    },
  },
  {
    name: "continue-decision: a story whose milestone LAST RAN remotely routes remote AT THE SCOPE ref (one branch/worktree per top-level item)",
    run: () => {
      const overlay = new Map([["18", { nodeId: "umamis-mac-mini", active: false, state: "done" }]]);
      const d = resolveContinueDecision(overlay, "18/02", { localNodeId: "control-node" });
      assert.equal(d.where, "remote");
      assert.equal(d.node, "umamis-mac-mini", "the node that last worked the scope");
      assert.equal(d.dispatchRef, "18", "dispatched at the SCOPE — assigning the child ref would mint a divergent second branch");
      assert.equal(d.resolvedBy, "last-node");
    },
  },
  {
    name: "continue-decision: never-ran stays local at the EXACT ref; last-ran-here stays local; an explicit node wins and dispatches at scope",
    run: () => {
      const empty = new Map();
      const local = resolveContinueDecision(empty, "18/02", { localNodeId: "control-node" });
      assert.equal(local.where, "local");
      assert.equal(local.dispatchRef, "18/02", "a local continue keeps the exact ref — a session can continue one story directly");
      assert.equal(local.resolvedBy, "no-prior-run");

      const ranHere = new Map([["18", { nodeId: "control-node", active: false, state: "done" }]]);
      assert.equal(resolveContinueDecision(ranHere, "18/02", { localNodeId: "control-node" }).where, "local", "last node IS this node → local");

      const explicit = resolveContinueDecision(empty, "18/02", { requestedNode: "umamis-mac-mini", localNodeId: "control-node" });
      assert.equal(explicit.where, "remote");
      assert.equal(explicit.dispatchRef, "18", "an explicit remote target still dispatches at the scope ref");
      assert.equal(explicit.resolvedBy, "requested");
    },
  },

  // ── the DIRECTIVE phase (operator, 2026-07-26: "continue xy should be a continuation
  // of the entire milestone. All stories. Why is it not CONTINUING UNTIL COMPLETION") ──
  //
  // WHAT continuing an item means: a MILESTONE continue resolves to the `autonomous`
  // cascade (drive every story refine → build → verify until the milestone is done);
  // a story/task continue and every refine/verify keep their single-phase directive.
  {
    name: "directive-phase: a MILESTONE continue resolves to the autonomous cascade; a story continue stays single-phase",
    run: async () => {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-directive-phase-"));
      try {
        const workDir = path.join(home, "wiki", "work");
        const msDir = path.join(workDir, "18_milestone_homedata");
        await mkdir(path.join(msDir, "stories", "02_story_tenants", "tasks"), { recursive: true });
        await writeFile(path.join(msDir, "SPEC.md"), `---\ntype: milestone\nnumber: "18"\nslug: homedata\nstatus: in-progress\n---\n# 18\n`, "utf8");
        await writeFile(
          path.join(msDir, "stories", "02_story_tenants", "STORY.md"),
          `---\ntype: story\nnumber: "02"\nslug: tenants\nstatus: not-started\nparent: "18"\n---\n# 18/02\n`,
          "utf8",
        );
        const workspace = { projectRoot: home, workDir, config: {} };

        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "18", { env: { AOF_GLOBAL_HOME: home } }),
          "autonomous",
          "continuing a milestone means continuing the WHOLE milestone — the cascade, never one slice",
        );
        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "18/02", { env: { AOF_GLOBAL_HOME: home } }),
          "continue",
          "a single story continue keeps its single-phase directive",
        );
        assert.equal(
          await resolveDirectivePhase(workspace, "verify", "18", { env: { AOF_GLOBAL_HOME: home } }),
          "verify",
          "refine/verify are never rewritten — only what CONTINUE means changes with the item type",
        );
        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "99", { env: { AOF_GLOBAL_HOME: home } }),
          "continue",
          "an unresolvable ref degrades to the single phase — the act is never blocked by a type lookup",
        );
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    // The OWED lane from m42's soak day (STATE.md §MISSING TESTS): the STREAMED-row
    // fallback. A control checkout often does not hold a worker's items locally —
    // the type then comes from the worker-streamed `work_items` row (the SAME
    // local-then-streamed order every read command uses), so a milestone continue
    // dispatched from a control node that never checked the milestone out still
    // resolves to the autonomous cascade.
    name: "directive-phase: the STREAMED-row fallback — a locally-absent milestone resolves through the worker-streamed row; a streamed story stays single-phase",
    run: async () => {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-directive-phase-streamed-"));
      try {
        const workDir = path.join(home, "wiki", "work");
        await mkdir(workDir, { recursive: true });
        const workspace = { projectRoot: home, workDir, config: {} };
        const env = { AOF_GLOBAL_HOME: home };

        // Seed the worker-streamed rows for refs the local index has NEVER held.
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          const { resolveWorkspaceId } = await import("../../src/workspace-identity.mjs");
          const workspaceId = resolveWorkspaceId(workspace);
          const insert = store.db.prepare(
            "INSERT INTO work_items (workspace_id, ref, type, slug, status, title, parent, source_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          );
          insert.run(workspaceId, "44", "milestone", "remote-ms", "in-progress", "Remote milestone", null, "streamed/44");
          insert.run(workspaceId, "44/01", "story", "remote-story", "not-started", "Remote story", "44", "streamed/44-01");
        } finally {
          store.close();
        }

        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "44", { env }),
          "autonomous",
          "a milestone the local index misses resolves through the STREAMED row — the cascade still fires",
        );
        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "44/01", { env }),
          "continue",
          "a streamed STORY keeps its single-phase directive",
        );
        assert.equal(
          await resolveDirectivePhase(workspace, "continue", "45", { env }),
          "continue",
          "no local item AND no streamed row degrades to the single phase",
        );
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // 131/04 — hoisted below.
  ...askOverlayTests(),
];

// ---- 131/05 task 00 — the list row carries the ask fact (ADR-006 §2) ------------------------------
//
// W is an on-disk workspace pinned `mesh.workspaceId: "w1"` holding 03 (stories 03/01, 03/02) and
// 04, under an isolated aof home H per case. Asks are written through 01's writers, and mesh rows
// through the assignment store's own writers; the `extra` and `{ not json` rows are raw files.
const ASK_KEYS = ["runId", "state", "question", "phase", "askedAt", "parkedAt", "answeredAt", "by", "answer", "node", "local", "sessionId", "scope"];
const ASK_QUESTION = "Decision needed: move the residue?";

async function askWorld(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ask-overlay-"));
  const repo = path.join(root, "W");
  const home = path.join(root, "H");
  const env = { AOF_GLOBAL_HOME: home };
  try {
    await mkdir(path.join(repo, ".aof"), { recursive: true });
    await mkdir(home, { recursive: true });
    await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify({ name: "ask-fixture", work: { dir: "./wiki/work" }, mesh: { enabled: true, workspaceId: "w1" } }, null, 2), "utf8");
    const work = path.join(repo, "wiki", "work");
    for (const [number, slug] of [["03", "residue"], ["04", "later"]]) {
      await mkdir(path.join(work, `${number}_milestone_${slug}`), { recursive: true });
      await writeFile(path.join(work, `${number}_milestone_${slug}`, "SPEC.md"), `---\ntype: milestone\nnumber: "${number}"\nslug: ${slug}\nstatus: in-progress\ntitle: "M${number}"\n---\n# ${number}\n`, "utf8");
    }
    for (const [number, slug] of [["01", "first"], ["02", "second"]]) {
      const dir = path.join(work, "03_milestone_residue", "stories", `${number}_story_${slug}`);
      await mkdir(path.join(dir, "tasks"), { recursive: true });
      await writeFile(path.join(dir, "STORY.md"), `---\ntype: story\nnumber: "${number}"\nslug: ${slug}\nstatus: in-progress\ntitle: "S${number}"\nparent: "03"\n---\n# ${number}\n`, "utf8");
    }
    const dir = loopAsksDir(env);
    const list = async (input = { mesh: true }) => listCommand.run(input, { workspace: await loadWorkspace(repo, undefined, { env }), globalWorkStoreOptions: { env } });
    const open = (runId, ref, fields = {}) => openAsk(dir, {
      runId, workspaceId: "w1", ref, phase: "build", scope: "03", node: "node-7297", sessionId: `sess-${runId}`, question: ASK_QUESTION,
      now: () => new Date("2026-09-23T17:00:00.000Z"), ...fields,
    });
    const execution = async (itemRef, { workspaceId = "w1", state = "running", code = "needs-input", sessionId = "S9", node = "node-2976", at = "2026-09-23T17:05:00.000Z" } = {}) => {
      const store = await openGlobalWorkProjectionStore({ env });
      try {
        const record = assembleAssignmentRecord({ itemRef, workspaceId, targetNodeId: node, issuer: "control", now: at });
        insertAssignment(store, record);
        if (state !== "assigned") updateAssignmentState(store, record.assignmentId, state, { now: at, sessionId, code });
      } finally {
        store.close?.();
      }
    };
    return await body({ repo, home, env, dir, list, open, execution });
  } finally {
    setDegradeSinkForTest(undefined);
    await rm(root, { recursive: true, force: true });
  }
}

const rowOf = (rows, ref) => rows.find((row) => row.ref === ref);
const carriers = (rows) => rows.filter((row) => "ask" in row).map((row) => row.ref).sort();
const fact = (fields = {}) => ({
  runId: "R1", state: "waiting", question: ASK_QUESTION, phase: "build", askedAt: "2026-09-23T17:00:00.000Z", parkedAt: null,
  answeredAt: null, by: null, answer: null, node: "node-7297", local: true, sessionId: "sess-R1", scope: "03", ...fields,
});
const workerFact = (fields = {}) => ({
  runId: null, state: "waiting", question: null, phase: null, askedAt: "2026-09-23T17:05:00.000Z", parkedAt: null,
  answeredAt: null, by: null, answer: null, node: "node-2976", local: false, sessionId: "S9", scope: "03", ...fields,
});
const withoutAsk = ({ ask, ...rest }) => rest;
function askDegrades() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return events;
}

function askOverlayTests() {
  return [
    {
      name: "131/05 task00 — a local lane's waiting ask rides its row, and no other row changes",
      run: () => askWorld(async ({ list, open }) => {
        const before = await list();
        await open("R1", "03/01");
        const rows = await list();
        const ask = rowOf(rows, "03/01").ask;
        assert.deepEqual(Object.keys(ask), ASK_KEYS, "thirteen keys, in order");
        assert.deepEqual(ask, fact());
        for (const ref of ["03", "03/02", "04"]) {
          assert.ok(!("ask" in rowOf(rows, ref)), `${ref} carries no ask key`);
          assert.deepEqual(rowOf(rows, ref), rowOf(before, ref), `${ref} is the no-ask run's row`);
        }
        assert.deepEqual(withoutAsk(rowOf(rows, "03/01")), rowOf(before, "03/01"), "03/01 differs only by its ask");
      }),
    },
    {
      name: "131/05 task00 — every state the file holds is carried, so the receipt outlives the answer (seven rows)",
      run: async () => {
        const UB = { actor: "umami", via: "board", node: "node-7297" };
        const YOU = { actor: "you", via: "cli", node: "node-7297" };
        const rows = [
          ["parked", async ({ dir, open }) => { await open("R1", "03/01"); await parkAsk(dir, "R1", { now: () => new Date("2026-09-23T18:00:00.000Z") }); },
            fact({ state: "parked", parkedAt: "2026-09-23T18:00:00.000Z" })],
          ["answered", async ({ dir, open }) => { await open("R1", "03/01"); await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take b —\n  keep the tests", by: UB, now: () => new Date("2026-09-23T17:12:00.000Z") }); },
            fact({ state: "answered", answeredAt: "2026-09-23T17:12:00.000Z", by: UB, answer: "take b —\n  keep the tests" })],
          ["parked then answered", async ({ dir, open }) => {
            await open("R1", "03/01");
            await parkAsk(dir, "R1", { now: () => new Date("2026-09-23T18:00:00.000Z") });
            await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take b", by: YOU, now: () => new Date("2026-09-23T19:00:00.000Z") });
          }, fact({ state: "answered", parkedAt: "2026-09-23T18:00:00.000Z", answeredAt: "2026-09-23T19:00:00.000Z", by: YOU, answer: "take b" })],
          ["answered then re-opened", async ({ dir, open }) => {
            await open("R1", "03/01");
            await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take b", by: YOU });
            await open("R1", "03/01", { question: "Decision needed: Y", now: () => new Date("2026-09-23T18:30:00.000Z") });
          }, fact({ question: "Decision needed: Y", askedAt: "2026-09-23T18:30:00.000Z" })],
          ["scope and sessionId omitted", async ({ open }) => { await open("R1", "03/01", { scope: undefined, sessionId: undefined }); },
            fact({ scope: null, sessionId: null })],
          ["an extra key by hand", async ({ dir, open }) => {
            await open("R1", "03/01");
            const record = JSON.parse(await readFile(askRequestPath(dir, "R1"), "utf8"));
            await writeFile(askRequestPath(dir, "R1"), JSON.stringify({ ...record, extra: 1 }), "utf8");
          }, fact()],
          ["cleared after its answer", async ({ dir, open }) => {
            await open("R1", "03/01");
            await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "take b", by: YOU });
            await clearAsk(dir, "R1");
          }, null],
        ];
        for (const [label, prepare, expected] of rows) {
          await askWorld(async (world) => {
            const before = await world.list();
            await prepare(world);
            const row = rowOf(await world.list(), "03/01");
            if (expected == null) {
              assert.ok(!("ask" in row), `${label}: no ask key`);
              assert.deepEqual(row, rowOf(before, "03/01"), `${label}: the no-ask run's row`);
            } else {
              assert.deepEqual(Object.keys(row.ask), ASK_KEYS, `${label}: exactly thirteen keys`);
              assert.deepEqual(row.ask, expected, label);
            }
          });
        }
      },
    },
    {
      name: "131/05 task00 — a worker waiting on a human carries an ask with no question, wherever the verb would accept the answer",
      run: () => askWorld(async ({ list, execution }) => {
        await execution("03");
        const rows = await list();
        assert.deepEqual(rowOf(rows, "03").ask, workerFact());
        assert.deepEqual(rowOf(rows, "03/01").ask, workerFact(), "a story inherits its milestone's worker ask");
        assert.deepEqual(rowOf(rows, "03/02").ask, workerFact());
        assert.ok(!("ask" in rowOf(rows, "04")));
      }),
    },
    {
      name: "131/05 task00 — an execution row that the verb would not answer carries no ask (ten rows)",
      run: async () => {
        const rows = [
          { code: null }, { code: "resumed" }, { state: "assigned", code: null, sessionId: null }, { state: "accepted" },
          { state: "done" }, { state: "failed" }, { sessionId: null }, { sessionId: "" }, { code: "NEEDS-INPUT" }, { workspaceId: "w2" },
        ];
        for (const [index, override] of rows.entries()) {
          await askWorld(async ({ list, execution }) => {
            await execution("03", override);
            assert.deepEqual(carriers(await list()), [], `row ${index}: no row carries an ask (${JSON.stringify(override)})`);
          });
        }
      },
    },
    {
      name: "131/05 task00 — of the asks for a workspace, the row takes its own ref's latest, and nothing else (thirteen rows)",
      run: async () => {
        const at = (clock) => ({ now: () => new Date(`2026-09-23T${clock}:00.000Z`) });
        const UMAMI = { actor: "umami", via: "cli", node: null };
        const rows = [
          ["R1 03/01 waiting, R2 03/02 parked", async ({ dir, open }) => { await open("R1", "03/01"); await open("R2", "03/02", at("17:01")); await parkAsk(dir, "R2"); },
            (rows) => { assert.equal(rowOf(rows, "03/01").ask.runId, "R1"); assert.equal(rowOf(rows, "03/02").ask.state, "parked"); assert.deepEqual(carriers(rows), ["03/01", "03/02"]); }],
          ["R1 answered, R3 later waiting", async ({ dir, open }) => { await open("R1", "03/01"); await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "a", by: UMAMI }); await open("R3", "03/01", at("17:05")); },
            (rows) => { assert.equal(rowOf(rows, "03/01").ask.runId, "R3"); assert.equal(rowOf(rows, "03/01").ask.state, "waiting"); }],
          ["R1 waiting, R3 later answered", async ({ dir, open }) => { await open("R1", "03/01"); await open("R3", "03/01", at("17:05")); await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: "a", by: UMAMI }); },
            (rows) => { assert.equal(rowOf(rows, "03/01").ask.runId, "R3"); assert.equal(rowOf(rows, "03/01").ask.state, "answered"); }],
          ["R1 and R3 tied at 17:00", async ({ open }) => { await open("R1", "03/01"); await open("R3", "03/01"); },
            (rows) => assert.equal(rowOf(rows, "03/01").ask.runId, "R3")],
          ["only R3 in w2", async ({ open }) => { await open("R3", "03/01", { workspaceId: "w2" }); }, (rows) => assert.deepEqual(carriers(rows), [])],
          ["only R3 with a null workspace", async ({ open }) => { await open("R3", "03/01", { workspaceId: null }); }, (rows) => assert.deepEqual(carriers(rows), [])],
          ["R1 w1 and R3 w2 later", async ({ open }) => { await open("R1", "03/01"); await open("R3", "03/01", { workspaceId: "w2", ...at("17:05") }); },
            (rows) => assert.equal(rowOf(rows, "03/01").ask.runId, "R1")],
          ["only R5 on a ref with no row", async ({ open }) => { await open("R5", "09/01"); }, (rows, before) => { assert.deepEqual(carriers(rows), []); assert.deepEqual(rows, before, "none is added"); }],
          ["only R1 on 03", async ({ open }) => { await open("R1", "03"); }, (rows) => assert.deepEqual(carriers(rows), ["03"], "never to a child")],
          ["only R1 on 03/1", async ({ open }) => { await open("R1", "03/1"); }, (rows) => assert.deepEqual(carriers(rows), [], "the ref is matched exactly")],
          ["a needs-input 03 and 03/01's own done row", async ({ execution }) => { await execution("03"); await execution("03/01", { state: "done", code: null, at: "2026-09-23T17:06:00.000Z" }); },
            (rows) => assert.deepEqual(carriers(rows), ["03", "03/02"])],
          ["03/01's own needs-input row", async ({ execution }) => { await execution("03/01", { sessionId: "S7" }); },
            (rows) => { assert.deepEqual(carriers(rows), ["03/01"]); assert.equal(rowOf(rows, "03/01").ask.sessionId, "S7"); assert.equal(rowOf(rows, "03/01").ask.scope, "03/01"); }],
          ["R2 on 03/01 and a needs-input 03", async ({ open, execution }) => { await open("R2", "03/01"); await execution("03"); },
            (rows) => {
              assert.equal(rowOf(rows, "03/01").ask.runId, "R2");
              assert.equal(rowOf(rows, "03/01").ask.local, true);
              assert.equal(rowOf(rows, "03").ask.sessionId, "S9");
              assert.equal(rowOf(rows, "03/02").ask.sessionId, "S9");
            }],
        ];
        assert.equal(rows.length, 13);
        for (const [label, prepare, check] of rows) {
          await askWorld(async (world) => {
            const before = await world.list();
            await prepare(world);
            try {
              check(await world.list(), before);
            } catch (error) {
              error.message = `${label}: ${error.message}`;
              throw error;
            }
          });
        }
      },
    },
    {
      name: "131/05 task00 — the overlay carries a null the store cannot hold (two rows)",
      run() {
        const execution = { active: true, state: "running", code: "needs-input", nodeId: "node-2976", sessionId: "S9", updatedAt: "2026-09-23T17:05:00.000Z", scopeRef: "03" };
        const shape = (override) => ["03", "03/01", "03/02"].map((ref) => ({ ref, execution: { ...execution, ...override } }));
        const nullUpdated = applyAskOverlay(shape({ updatedAt: null }), { asks: [], workspaceId: "w1" });
        for (const row of nullUpdated) assert.equal(row.ask.askedAt, null, `${row.ref}: askedAt null`);
        const nullNode = applyAskOverlay(shape({ nodeId: null }), { asks: [], workspaceId: "w1" });
        assert.equal(nullNode[0].ask.node, null);
        assert.equal(nullNode[0].ask.local, false);
      },
    },
    {
      name: "131/05 task00 — a local ask wins over a worker's on the same row",
      run: () => askWorld(async ({ list, open, execution }) => {
        await open("R1", "03");
        await execution("03");
        const ask = rowOf(await list(), "03").ask;
        assert.equal(ask.runId, "R1");
        assert.equal(ask.local, true);
      }),
    },
    {
      name: "131/05 task00 — the CLI's list is byte-identical with asks on disk",
      run: () => askWorld(async ({ repo, home, dir, list, open }) => {
        await open("R1", "03/01");
        const cli = () => spawnSync(process.execPath, [path.join(REPO_ROOT, "src", "cli.mjs"), "work", "list", "--json"], {
          cwd: repo, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" },
        });
        const withAsk = cli();
        const plain = await list({});
        assert.equal(withAsk.status, 0, withAsk.stderr);
        assert.ok(JSON.parse(withAsk.stdout).length >= 4, "the CLI listed the stream");
        await rm(dir, { recursive: true, force: true });
        const without = cli();
        assert.equal(withAsk.stdout, without.stdout, "byte-identical with and without the ask file");
        assert.deepEqual(plain, await list({}), "work:list with no mesh is the same call with dir removed");
      }),
    },
    {
      name: "131/05 task00 — an unreadable ask store never costs the list a row (seven rows)",
      run: async () => {
        const rows = [
          ["does not exist", async () => {}, [], 0],
          ["exists and is empty", async ({ dir }) => { await mkdir(dir, { recursive: true }); }, [], 0],
          ["only { not json", async ({ dir }) => { await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, "R6.json"), "{ not json", "utf8"); }, [], 1],
          ["only a temp file", async ({ dir }) => { await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, ".tmp-R1.json-1-2-x"), '{"runId":"R1","ref":"03/01"', "utf8"); }, [], 0],
          ["only a record in state done", async ({ dir }) => {
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(dir, "R1.json"), JSON.stringify({ runId: "R1", ref: "03/01", workspaceId: "w1", state: "done" }), "utf8");
          }, [], 1],
          ["{ not json beside a waiting ask", async ({ dir, open }) => { await open("R1", "03/01"); await writeFile(path.join(dir, "R6.json"), "{ not json", "utf8"); }, ["03/01"], 1],
          ["a regular file", async ({ dir }) => { await mkdir(path.dirname(dir), { recursive: true }); await writeFile(dir, "not a directory", "utf8"); }, [], null],
        ];
        for (const [label, prepare, carrying, degrades] of rows) {
          await askWorld(async (world) => {
            const before = await world.list();
            await prepare(world);
            const events = askDegrades();
            const rows = await world.list();
            assert.deepEqual(rows.map((row) => row.ref), before.map((row) => row.ref), `${label}: every row`);
            assert.deepEqual(carriers(rows), carrying, `${label}: carriers`);
            if (degrades != null) assert.equal(events.filter((event) => event.code === "loop-ask-request").length, degrades, `${label}: loop-ask-request degrades`);
          });
        }
      },
    },
    {
      name: "131/05 task00 — the list reads the ask through its one home",
      async run() {
        const source = stripComments(await readFile(path.join(REPO_ROOT, "src", "commands", "list.mjs"), "utf8"));
        assert.match(source, /import \{[^}]*\bASK_STATES\b[^}]*\} from "\.\.\/loop\/ask-request\.mjs"/u);
        for (const name of ["readAsks", "loopAsksDir"]) assert.match(source, new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "\\.\\./loop/ask-request\\.mjs"`, "u"), name);
        for (const word of ['"waiting"', '"parked"', '"answered"', "loop-asks"]) assert.ok(!source.includes(word), `list.mjs spells no ${word}`);
        assert.match(source, /export function applyAskOverlay\(/u);
      },
    },
  ];
}
