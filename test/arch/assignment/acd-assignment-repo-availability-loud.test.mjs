// Fitness function: acd-assignment-repo-availability-loud (milestone 35 / ADR-004 /
// 34-ADR-008, fitness #7 — WORKER half) — "the worker execution path checks repo
// availability BEFORE creating a worktree, and on a miss emits a coded
// assignment-repo-unavailable failed up the channel; the guard precedes the git
// worktree add call site and the coded literal is emitted on the miss branch."
// (The control-side assign-time gate half is Story 00 — already armed by that
// story's own suite; this file is the WORKER-side re-check Story 02 owns.)
//
// This is the ARCHITECTURE-named half of a single invariant shared with SECURITY's F3
// (acd-unpublished-repo-directive-refused, T3a) — the SECURITY sibling file
// enumerates/references THIS file's assertions rather than duplicating the assertion
// body (the repo's "enumerate the re-armed X" house style).
//
// Proofs:
//  1. Structural — the worker execution handler's repo-guard branch (workerHasRepo)
//     sits BEFORE the addWorktree( call site in source order, and the miss branch
//     emits the literal "assignment-repo-unavailable" code.
//  2. Behavioural — an assignment for an unpublished/unmapped repo streams a failed
//     frame carrying that code, and creates no worktree.
//  Self-check (m03 non-vacuous): a planted worktree-create-before-guard ordering (or a
//  miss branch with no coded literal) fails the SAME detector the real (guarded)
//  source passes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorkspace } from "../../../src/work.mjs";
import { createMeshWorkerExecutionHandler } from "../../../src/mesh/worker-execution.mjs";
import { listWorktrees } from "../../../src/mesh/worktree.mjs";
import { withMeshWorkerExecFixture, createStatusRecorder, scriptedSpawnRuntime, scriptedPushExec } from "../../support/mesh-worker-exec-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// 119/04 (item 83's seam 1) — TWO SUBJECTS NOW, because the invariant is two claims and the split
// separated them. The HANDLER still owns the ordering (the guard precedes `addWorktree(`) and the
// reporting (the refusal's code is settled); the module the admission decision moved to owns the
// JOIN and the coded miss. Reading only the handler after the split would have left the coded-miss
// legs sweeping a file that no longer decides a miss.
const executionSourcePath = path.join(repoRoot, "src", "mesh", "worker-execution.mjs");
const admissionSourcePath = path.join(repoRoot, "src", "mesh", "worker-repo-admission.mjs");

// The guard call, as the HANDLER now spells it or as it spelled it before the split. Both are
// admitted on purpose: the planted violations below spell the pre-split form, and a detector whose
// plants exercise a different pattern than the real subject is a detector nobody has run.
const GUARD_CALL = /(?:workerHasRepo|admitWorkspaceRepo)\s*\(/;

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// The guard-precedes-worktree ordering, the join, and the coded-literal-on-miss checks, across the
// two subjects the split produced. Driven with the SAME arguments by the real tree and by every
// plant below.
function assertStructural(handler, admission) {
  const problems = [];
  // 119/04 — the vacuity leg. Every claim below is a search over a subject; a subject that emptied
  // (a file whose body moved out from under this control) would satisfy none of them and report
  // nothing, which is how a structural control goes quiet across a refactor.
  if (handler.trim().length === 0) problems.push("the handler subject is EMPTY — every leg below would assert over nothing");
  if (admission.trim().length === 0) problems.push("the admission subject is EMPTY — every leg below would assert over nothing");

  // 1. ORDERING, in the handler: the admission call still precedes the worktree.
  const guardOffset = handler.search(GUARD_CALL);
  const addOffset = handler.search(/addWorktree\s*\(/);
  if (guardOffset === -1) problems.push("no repo-admission guard call found (workerHasRepo( / admitWorkspaceRepo()");
  if (addOffset === -1) problems.push("no addWorktree( call found");
  if (guardOffset !== -1 && addOffset !== -1 && !(guardOffset < addOffset)) {
    problems.push("the repo guard does not precede the addWorktree( call site");
  }

  // 2. THE GUARD IS THE JOIN, wherever it lives. `admitWorkspaceRepo(` in the handler says an
  //    admission happens; only `workerHasRepo(` in the deciding module says WHAT it asks.
  if (!/workerHasRepo\s*\(/.test(admission)) {
    problems.push("the admission subject never calls workerHasRepo( — the marker/membership join IS the guard");
  }

  // 3. THE CODE, in whichever module now decides the miss.
  if (!/assignment-repo-unavailable/.test(admission)) {
    problems.push('no "assignment-repo-unavailable" coded literal found on the miss branch');
  }

  // 4. The miss must be REPORTED, not just spelled as dead text.
  //
  // m42 wave (d) leg d3 — a TERMINAL report is DURABLE now: raised into this node's journal and
  // shipped by the outbox (`reportSettled`) rather than streamed as a fire-once status frame. The
  // invariant is unchanged, so the detector accepts either emitter instead of pinning the retired
  // transport.
  //
  // 119/04 — and it accepts the refusal FORWARDED (`code: admission.code`) as well as spelled,
  // because the decision now answers a code rather than settling one itself. What it still refuses
  // is a miss branch that settles nothing.
  if (!/(?:sendAssignmentStatus\??\.|reportSettled)\([^)]*code:\s*(?:["']assignment-repo-unavailable["']|[A-Za-z_$][\w$]*\.code)/.test(handler)) {
    problems.push('the miss is not reported (sendAssignmentStatus / reportSettled) with a code — neither the "assignment-repo-unavailable" literal nor a forwarded refusal code reaches a settle');
  }

  // 5. And the refusal the handler forwards must be one the deciding module can actually answer:
  //    a refusal shape carrying the code, rather than a throw the handler happens to catch.
  if (!/refused:\s*true,\s*code:/.test(admission) && !/(?:sendAssignmentStatus\??\.|reportSettled)\([^)]*code:\s*["']assignment-repo-unavailable["']/.test(admission)) {
    problems.push("the admission subject neither answers a coded refusal nor settles one itself — nothing carries the miss out of the decision");
  }

  return problems;
}

export const archTests = [
  {
    name: "arch/35 ADR-004 / 34-ADR-008 (acd-assignment-repo-availability-loud, worker half): the repo guard precedes the git worktree add call site and the coded literal is emitted on the miss branch (structural)",
    run: async () => {
      const handler = stripComments(await readFile(executionSourcePath, "utf8"));
      const admission = stripComments(await readFile(admissionSourcePath, "utf8"));
      const problems = assertStructural(handler, admission);
      assert.deepEqual(problems, [], `structural problems: ${JSON.stringify(problems)}`);
    },
  },
  {
    name: "arch/35 ADR-004 / 34-ADR-008 (acd-assignment-repo-availability-loud, worker half): an assignment for an absent repo streams failed coded assignment-repo-unavailable, no worktree created (behavioural)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const handler = createMeshWorkerExecutionHandler({
        pushExec: scriptedPushExec(),
        loadWs: () => Promise.resolve(ws),
        nodeId: "worker-a",
        sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
        spawnRuntime: scriptedSpawnRuntime("done"),
        now: () => "2026-07-09T10:00:00.000Z",
        globalWorkStoreOptions: { env: fx.env },
      });
      await handler({ kind: "directive", to: "worker-a", assignmentId: "arch-f7-miss", itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: "2026-07-09T10:00:00.000Z" });

      assert.equal(recorder.frames.length, 1);
      assert.equal(recorder.frames[0].state, "failed");
      assert.equal(recorder.frames[0].code, "assignment-repo-unavailable");
      const entries = await listWorktrees(fx.root);
      assert.equal(entries.length, 1, "only the primary checkout is registered — no worktree created");
    }),
  },
  {
    name: "arch/35 ADR-004 / 34-ADR-008 (acd-assignment-repo-availability-loud, worker half): self-check — a planted worktree-before-guard ordering trips the detector; the real (guard-first) source passes",
    run: async () => {
      const handler = stripComments(await readFile(executionSourcePath, "utf8"));
      const admission = stripComments(await readFile(admissionSourcePath, "utf8"));
      assert.deepEqual(assertStructural(handler, admission), [], "the real source is clean");

      // The pre-split plants, unchanged and still driven through the SAME detector. Each is passed
      // as BOTH subjects, which is what a single-file worker was.
      const plantedOrdering = "await addWorktree(ws.projectRoot, assignmentId, commitish);\nconst hasRepo = await workerHasRepo(ws, workspaceId, nodeId);\nsendAssignmentStatus(assignmentId, 'failed', { code: 'assignment-repo-unavailable' });";
      assert.ok(assertStructural(plantedOrdering, plantedOrdering).length > 0, "a planted worktree-before-guard ordering trips the detector");

      const plantedNoCode = "const hasRepo = await workerHasRepo(ws, workspaceId, nodeId);\nif (!hasRepo) { sendAssignmentStatus(assignmentId, 'failed', {}); return; }\nawait addWorktree(ws.projectRoot, assignmentId, commitish);";
      assert.ok(assertStructural(plantedNoCode, plantedNoCode).length > 0, "a miss branch with no coded literal trips the detector");

      // 119/04 — the plants the SPLIT owes, and the vacuity one is the reason this control was
      // rewritten rather than repointed. A real handler paired with an EMPTY decision module is
      // precisely what "the code moved and the control did not" looks like, and before this leg the
      // coded-miss checks would have swept that empty subject and reported nothing.
      assert.ok(assertStructural(handler, "").length > 0, "an emptied admission subject trips the detector rather than passing over nothing");
      assert.ok(assertStructural("", admission).length > 0, "…and so does an emptied handler subject");

      const admissionWithoutJoin = "export async function admitWorkspaceRepo(ws) {\n  return { refused: true, code: 'assignment-repo-unavailable', detail: 'x' };\n}";
      assert.ok(assertStructural(handler, admissionWithoutJoin).length > 0, "an admission that answers the code without ever asking the join trips the detector");

      const admissionWithoutCode = "export async function admitWorkspaceRepo(ws) {\n  const hasRepo = await workerHasRepo(ws);\n  if (!hasRepo) return { refused: true, code: 'something-else' };\n  return { ws };\n}";
      assert.ok(assertStructural(handler, admissionWithoutCode).length > 0, "an admission whose miss carries a different code trips the detector");

      const handlerThatSwallows = "const admission = await admitWorkspaceRepo(ws, {});\nif (admission.refused === true) return;\nawait addWorktree(ws.projectRoot, assignmentId, commitish);";
      assert.ok(assertStructural(handlerThatSwallows, admission).length > 0, "a handler that takes the refusal and settles nothing trips the detector");

      // …and the correct post-split pair stays clean, so the legs above are refusing a defect
      // rather than refusing the shape of the split itself.
      const cleanHandler = "const admission = await admitWorkspaceRepo(ws, {});\nif (admission.refused === true) { await reportSettled(assignmentId, 'failed', { code: admission.code }); return; }\nawait addWorktree(ws.projectRoot, assignmentId, commitish);";
      assert.deepEqual(assertStructural(cleanHandler, admission), [], "the delivered post-split shape is clean");
    },
  },
];
