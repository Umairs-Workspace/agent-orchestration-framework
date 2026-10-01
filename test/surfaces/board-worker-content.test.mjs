import { defaultApplication as _aofApplication } from "aof/default-application";
// schema v5 (TECH_DEBT item 6 — finish the board bridge): the board's drill-downs
// answer from the worker-streamed projection when the LOCAL checkout cannot.
//
// THE DEFECT (measured live, 2026-07-26): the worker→control stream bridged an
// item's ROWS, so the board correctly listed a milestone's seven streamed stories —
// then every drill-down read the control node's local disk and dead-ended:
//   - clicking a streamed story → `Could not load STORY: No item resolves to ref "18/03"`
//   - the RUNS tab read the local runs/ dir → "No runs yet", for an item RUNNING remotely
// The board asserted a state it could not evidence. These tests pin the fix at the
// command layer (work:doc / work:run-status — every face gains the fallback):
//   - a ref the local checkout has never seen answers from the streamed projection,
//     marked fromWorker + reportedBy (whose view this is)
//   - a locally-resolved item whose doc file is absent answers from the projection
//   - the local disk WINS whenever it can answer (local-first, like the row merge)
//   - nothing streamed → behaviour is byte-identical to before (404 / absent / [])
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const loadWorkspace = _aofApplication.loadWorkspace;
const invoke = _aofApplication.invoke;
// m43 / story 06 (ADR-005 rule 3) — the ONE statement of what this milestone may add to an
// m42-era frozen envelope, and of what it may not. Three exact-key `deepEqual`s below were
// RED against the delivered 43/06 build (found 2026-08-04, at the ADR-016 must-fix pass, and
// attributed by re-running with that pass's own edits reverted). They are amended with the
// SAME instrument ADR-016/G9 verified across the other five collateral suites, which asserts
// MORE than the deepEqual it replaces: every frozen key still present, the only additions the
// three named answering-side keys, PLUS the stamp's two-value domain.
import { assertFrozenShape, assertAnswersFrom } from "../support/answering-side.mjs";
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const upsertWorkItemContent = _aofApplication.mesh.store.upsertWorkItemContent;

const WORKSPACE_ID = "ws-board-content";
const NOW = "2026-07-26T10:00:00.000Z";

function frontmatter(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

// A control-node-shaped fixture: the milestone resolves locally as a pre-run
// scaffold (SPEC only — no stories/, no runs/), exactly the item-18 shape measured
// live. The workspace pins mesh.workspaceId so the command's projection lookup and
// the seeded store speak the same id (the item-4 identity lesson).
async function makeRepo(root) {
  const repo = path.join(root, "repo");
  const workDir = path.join(repo, "wiki", "work");
  const mDir = path.join(workDir, "18_milestone_integration-descriptor");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(mDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { workspaceId: WORKSPACE_ID } }, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(mDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "18", slug: "integration-descriptor", status: "in-progress", title: '"Integration descriptor"', created: "2026-07-01", updated: "2026-07-01" }) + "# local scaffold SPEC\n",
    "utf8",
  );
  return repo;
}

async function withFixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-board-content-"));
  try {
    const home = path.join(root, "global-home");
    const repo = await makeRepo(root);
    const env = { AOF_GLOBAL_HOME: home };
    const ctx = { workspace: await loadWorkspace(repo), globalWorkStoreOptions: { env } };
    return await fn({ ctx, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedStreamedContent(env, { docs = [], runs = [] }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    upsertWorkItemContent(store, WORKSPACE_ID, { docs, runs, nodeId: "umamis-mac-mini" }, { now: NOW });
  } finally {
    store.close();
  }
}

const RUN_RECORD = { runId: "run-1", itemRef: "18", state: "running", attempt: 1, createdAt: NOW, updatedAt: NOW };

export const boardWorkerContentTests = [
  {
    name: "board-worker-content/v5 a streamed story's doc answers from the projection where it used to dead-end ref-not-found",
    async run() {
      await withFixture(async ({ ctx, env }) => {
        await seedStreamedContent(env, { docs: [{ ref: "18/03", doc: "STORY", body: "# the worker's story\n" }] });
        const result = await invoke("work:doc", { ref: "18/03", doc: "STORY" }, ctx);
        assert.equal(result.present, true);
        assert.equal(result.body, "# the worker's story\n");
        assert.equal(result.fromWorker, true, "the surface can say this is the worker's view");
        assert.equal(result.reportedBy, "umamis-mac-mini", "…and whose view it is");
      });
    },
  },
  {
    name: "board-worker-content/v5 a locally-resolved item with an absent doc file answers from the projection; a locally-present doc wins",
    async run() {
      await withFixture(async ({ ctx, env }) => {
        await seedStreamedContent(env, {
          docs: [
            { ref: "18", doc: "VERIFICATION", body: "# worker verification\n" },
            { ref: "18", doc: "SPEC", body: "# worker SPEC — must NOT shadow the local file\n" },
          ],
        });
        const verification = await invoke("work:doc", { ref: "18", doc: "VERIFICATION" }, ctx);
        assert.equal(verification.present, true, "the absent local file falls back to the streamed body");
        assert.equal(verification.body, "# worker verification\n");
        assert.equal(verification.fromWorker, true);

        const spec = await invoke("work:doc", { ref: "18", doc: "SPEC" }, ctx);
        assert.equal(spec.fromWorker, undefined, "a doc the local disk holds is answered locally");
        assert.ok(spec.body.includes("# local scaffold SPEC"), "local disk wins whenever it can answer");
      });
    },
  },
  {
    name: "board-worker-content/v5 nothing streamed → work:doc behaviour is unchanged (404 for an unknown ref, absent for a missing doc)",
    async run() {
      await withFixture(async ({ ctx }) => {
        await assert.rejects(
          invoke("work:doc", { ref: "18/03", doc: "STORY" }, ctx),
          (error) => error.code === "ref-not-found" && error.status === 404,
          "an unknown ref with no streamed body is still ref-not-found",
        );
        const result = await invoke("work:doc", { ref: "18", doc: "VERIFICATION" }, ctx);
        assertFrozenShape(result, ["ref", "doc", "present", "body"], "work:doc for a missing doc");
        assert.deepEqual(
          { ref: result.ref, doc: result.doc, present: result.present, body: result.body },
          { ref: "18", doc: "VERIFICATION", present: false, body: "" },
          "a missing doc with no streamed body is still absent-not-error",
        );
        assertAnswersFrom(result, "disk", "…answered by this node's own disk (m43/06)");
      });
    },
  },
  {
    name: "board-worker-content/v5 the RUNS view answers streamed run records for an item running remotely (and for a streamed-only ref)",
    async run() {
      await withFixture(async ({ ctx, env }) => {
        await seedStreamedContent(env, { runs: [{ ref: "18", runId: "run-1", record: RUN_RECORD }, { ref: "18/03", runId: "run-1", record: { ...RUN_RECORD, itemRef: "18/03" } }] });

        // The item resolves locally but has no runs/ dir — it used to render
        // "No runs yet" for an item running on the worker at that moment.
        const milestone = await invoke("work:run-status", { ref: "18" }, ctx);
        assert.equal(milestone.runs.length, 1);
        assert.deepEqual(milestone.runs[0], RUN_RECORD, "the worker's run record is the answer, not the empty local dir");
        assert.equal(milestone.fromWorker, true);
        assert.equal(milestone.reportedBy, "umamis-mac-mini");

        // The streamed story does not resolve locally at all.
        const story = await invoke("work:run-status", { ref: "18/03" }, ctx);
        assert.equal(story.runs[0].itemRef, "18/03");
        assert.equal(story.fromWorker, true);
      });
    },
  },
  {
    // The m42 RETHINK (operator-forced after the third read shipped the same
    // disease): for a streamed item the local filesystem is not the truth for ANY
    // read. An item the worker streams EXISTS — absent data answers EMPTY, never
    // ref-not-found; runs honour the execution scope (a story's run context is
    // its milestone's).
    name: "board-worker-content/rethink a STREAMED item never 404s on any read — tasks answer empty, docs answer absent, runs answer at SCOPE",
    async run() {
      await withFixture(async ({ ctx, env }) => {
        // The item row itself streams (the board lists it) — no docs, no runs yet.
        const { upsertWorkItemContent, openGlobalWorkProjectionStore } = await Promise.resolve(Object.freeze({
  GLOBAL_WORK_SCHEMA_VERSION: _aofApplication.mesh.store.GLOBAL_WORK_SCHEMA_VERSION,
  globalStoreError: _aofApplication.mesh.store.globalStoreError,
  workspaceIdFor: _aofApplication.mesh.store.workspaceIdFor,
  wholesaleDelete: _aofApplication.mesh.store.wholesaleDelete,
  openGlobalWorkProjectionStore: _aofApplication.mesh.store.openGlobalWorkProjectionStore,
  remapWorkspaceProjectionRefs: _aofApplication.mesh.store.remapWorkspaceProjectionRefs,
  remapWorkspaceFactRefs: _aofApplication.mesh.store.remapWorkspaceFactRefs,
  UPSERT_AUTHORITIES: _aofApplication.mesh.store.UPSERT_AUTHORITIES,
  upsertWorkItems: _aofApplication.mesh.store.upsertWorkItems,
  removeWorkspaceFromCache: _aofApplication.mesh.store.removeWorkspaceFromCache,
  publishWorkspaceSnapshot: _aofApplication.mesh.store.publishWorkspaceSnapshot,
  recordWorkspaceProjectionError: _aofApplication.mesh.store.recordWorkspaceProjectionError,
  readWorkspaceProjectionItems: _aofApplication.mesh.store.readWorkspaceProjectionItems,
  readWorkspaceItems: _aofApplication.mesh.store.readWorkspaceItems,
  readWorkspaceItemProvenance: _aofApplication.mesh.store.readWorkspaceItemProvenance,
  upsertWorkItemContent: _aofApplication.mesh.store.upsertWorkItemContent,
  readWorkItemDoc: _aofApplication.mesh.store.readWorkItemDoc,
  readWorkItemDocMembers: _aofApplication.mesh.store.readWorkItemDocMembers,
  readWorkItemRuns: _aofApplication.mesh.store.readWorkItemRuns,
  NODE_LOG_KEEP: _aofApplication.mesh.store.NODE_LOG_KEEP,
  appendNodeLogEntries: _aofApplication.mesh.store.appendNodeLogEntries,
  readNodeLogEntries: _aofApplication.mesh.store.readNodeLogEntries,
  queryGlobalWorkProjection: _aofApplication.mesh.store.queryGlobalWorkProjection,
  WORK_ITEM_DOC_FILES: _aofApplication.mesh.store.WORK_ITEM_DOC_FILES,
  REQUIRED_ITEM_FIELDS: _aofApplication.mesh.store.REQUIRED_ITEM_FIELDS,
  OPTIONAL_ITEM_FIELDS: _aofApplication.mesh.store.OPTIONAL_ITEM_FIELDS,
  itemRowFault: _aofApplication.mesh.store.itemRowFault,
  isCompleteItemRow: _aofApplication.mesh.store.isCompleteItemRow,
}));
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          store.db.prepare(
            "INSERT INTO work_items (workspace_id, ref, type, slug, status, title, parent, source_path) VALUES (?, '18/04', 'story', 'fetch-cache', 'in-progress', 'Fetch cache', '18', '/w/18/04/STORY.md')"
          ).run(WORKSPACE_ID);
          // Runs recorded at SCOPE (the milestone), as the worker actually writes them.
          upsertWorkItemContent(store, WORKSPACE_ID, {
            runs: [{ ref: "18", runId: "run-14", record: { runId: "run-14", itemRef: "18", state: "running" } }],
            nodeId: "umamis-mac-mini",
          }, { now: NOW });
        } finally {
          store.close();
        }

        const tasks = await invoke("work:tasks", { ref: "18/04" }, ctx);
        assertFrozenShape(tasks, ["ref", "tasks", "fromWorker"], "work:tasks for a streamed-only item");
        assert.deepEqual(
          { ref: tasks.ref, tasks: tasks.tasks, fromWorker: tasks.fromWorker },
          { ref: "18/04", tasks: [], fromWorker: true },
          "tasks: EMPTY for a streamed item, never ref-not-found",
        );
        assertAnswersFrom(tasks, "cache", "…and the empty answer says the CACHE produced it (m43/06)");

        const doc = await invoke("work:doc", { ref: "18/04", doc: "VERIFICATION" }, ctx);
        assert.equal(doc.present, false, "doc: absent-not-error for a streamed item with no streamed copy");
        assert.equal(doc.fromWorker, true);

        const runs = await invoke("work:run-status", { ref: "18/04" }, ctx);
        assert.equal(runs.runs.length, 1, "runs: a story answers its SCOPE's streamed run (runs are recorded at the milestone)");
        assert.equal(runs.runs[0].runId, "run-14");
        assert.equal(runs.fromWorker, true);
      });
    },
  },
  {
    name: "board-worker-content/rethink checkoutRootForWorktree inverts the worktree layout",
    async run() {
      const { checkoutRootForWorktree } = await Promise.resolve(Object.freeze({
  ASSIGNMENT_LOOP_LAUNCH_UNDECLARED: _aofApplication.mesh.worker.ASSIGNMENT_LOOP_LAUNCH_UNDECLARED,
  ASSIGNMENT_LOOP_LAUNCH_SCOPELESS: _aofApplication.mesh.worker.ASSIGNMENT_LOOP_LAUNCH_SCOPELESS,
  resolveRefInWorktree: _aofApplication.mesh.worker.resolveRefInWorktree,
  workerHasRepo: _aofApplication.mesh.worker.workerHasRepo,
  resolveCloneUrl: _aofApplication.mesh.worker.resolveCloneUrl,
  parseRepoFromCloneUrl: _aofApplication.mesh.worker.parseRepoFromCloneUrl,
  meshCheckoutsRoot: _aofApplication.mesh.worker.meshCheckoutsRoot,
  meshCheckoutPath: _aofApplication.mesh.worker.meshCheckoutPath,
  isUnderMeshCheckoutsRoot: _aofApplication.mesh.worker.isUnderMeshCheckoutsRoot,
  buildAskpassShim: _aofApplication.mesh.worker.buildAskpassShim,
  cloneRepoForWorkspace: _aofApplication.mesh.worker.cloneRepoForWorkspace,
  pinWorkspaceIdInCheckout: _aofApplication.mesh.worker.pinWorkspaceIdInCheckout,
  commitWorktreeChanges: _aofApplication.mesh.worker.commitWorktreeChanges,
  NEEDS_INPUT_SENTINEL: _aofApplication.mesh.worker.NEEDS_INPUT_SENTINEL,
  NEEDS_INPUT_INSTRUCTION: _aofApplication.mesh.worker.NEEDS_INPUT_INSTRUCTION,
  DIRECTIVE_COMPLETE_SENTINEL: _aofApplication.mesh.worker.DIRECTIVE_COMPLETE_SENTINEL,
  DIRECTIVE_COMPLETE_INSTRUCTION: _aofApplication.mesh.worker.DIRECTIVE_COMPLETE_INSTRUCTION,
  WORKER_SESSION_INSTRUCTION: _aofApplication.mesh.worker.WORKER_SESSION_INSTRUCTION,
  COMPLETION_IDLE_MS: _aofApplication.mesh.worker.COMPLETION_IDLE_MS,
  DECLARED_COMPLETION_IDLE_MS: _aofApplication.mesh.worker.DECLARED_COMPLETION_IDLE_MS,
  HUMAN_INPUT_TOOL_NAMES: _aofApplication.mesh.worker.HUMAN_INPUT_TOOL_NAMES,
  INTERACTIVE_COMMAND_READY_DELAY_MS: _aofApplication.mesh.worker.INTERACTIVE_COMMAND_READY_DELAY_MS,
  defaultWatchTranscriptSessionId: _aofApplication.mesh.worker.defaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion: _aofApplication.mesh.worker.defaultWatchTranscriptCompletion,
  defaultPtySpawn: _aofApplication.mesh.worker.defaultPtySpawn,
  resolveInteractiveDriverLaunch: _aofApplication.mesh.worker.resolveInteractiveDriverLaunch,
  driveInteractiveClaudeSession: _aofApplication.mesh.worker.driveInteractiveClaudeSession,
  buildDriverCommand: _aofApplication.mesh.worker.buildDriverCommand,
  defaultSpawnRuntime: _aofApplication.mesh.worker.defaultSpawnRuntime,
  ensureWorktreeTrusted: _aofApplication.mesh.worker.ensureWorktreeTrusted,
  registerActiveWorktree: _aofApplication.mesh.worker.registerActiveWorktree,
  clearActiveWorktree: _aofApplication.mesh.worker.clearActiveWorktree,
  listActiveWorktrees: _aofApplication.mesh.worker.listActiveWorktrees,
  checkoutRootForWorktree: _aofApplication.mesh.worker.checkoutRootForWorktree,
  listStrandedWorktreeAssignments: _aofApplication.mesh.worker.listStrandedWorktreeAssignments,
  pushWorktreeBranch: _aofApplication.mesh.worker.pushWorktreeBranch,
  createMeshWorkerExecutionHandler: _aofApplication.mesh.worker.createMeshWorkerExecutionHandler,
  settleStrandedRunRecords: _aofApplication.mesh.worker.settleStrandedRunRecords,
  createMeshWorkerWithdrawHandler: _aofApplication.mesh.worker.createMeshWorkerWithdrawHandler,
  createMeshWorkerTerminalInputHandler: _aofApplication.mesh.worker.createMeshWorkerTerminalInputHandler,
  createMeshWorkerTerminalResumeHandler: _aofApplication.mesh.worker.createMeshWorkerTerminalResumeHandler,
  createMeshRecoveryPushHandler: _aofApplication.mesh.worker.createMeshRecoveryPushHandler,
}));
      const path = (await import("node:path")).default;
      const checkout = path.resolve("/home/u/.aof/mesh/checkouts/1f164bd03ea535da");
      const worktree = path.join(checkout, ".aof", "mesh", "worktrees", "asg-1");
      assert.equal(checkoutRootForWorktree(worktree), checkout, "the checkout root the run bracket writes under");
    },
  },
  {
    name: "board-worker-content/v5 nothing streamed → work:run-status behaviour is unchanged (404 / empty history)",
    async run() {
      await withFixture(async ({ ctx }) => {
        await assert.rejects(
          invoke("work:run-status", { ref: "18/03" }, ctx),
          (error) => error.code === "ref-not-found" && error.status === 404,
        );
        const result = await invoke("work:run-status", { ref: "18" }, ctx);
        assertFrozenShape(result, ["ref", "runs"], "work:run-status for an item with no runs");
        assert.deepEqual(
          { ref: result.ref, runs: result.runs },
          { ref: "18", runs: [] },
          "an item with no runs anywhere is still an empty history, not an error",
        );
        assertAnswersFrom(result, "disk", "…answered by this node's own disk (m43/06)");
      });
    },
  },
];
