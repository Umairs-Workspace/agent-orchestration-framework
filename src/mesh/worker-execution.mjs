// src/mesh/worker-execution.mjs — the worker's ACCEPTED-DIRECTIVE handler (milestone
// 35 / story 02, ADR-004; tasks 00-03). This is the handler `client.onDirective(...)`
// registers (worker-stream-client.mjs, story 01): given a PARSED `{ kind:"directive",
// to, assignmentId, itemRef, workspaceId, at }` frame, it
//   (0) on a repo MISS, clones the repo into a SCOPED checkout and registers the
//       workspace so the guard then passes — a PREFIX, not a rewrite (milestone 38 /
//       story 01, ADR-005 — tasks 00-03 below);
//   (1) re-checks the worker actually HAS the repo for workspaceId — BEFORE any
//       worktree (task 01, SECURITY F3 acd-unpublished-repo-directive-refused);
//   (2) materializes a dedicated `git worktree add` under the ONE seam
//       `meshWorktreePath` (task 00, fitness #8 / SEC F4 acd-worktree-path-scoped);
//   (3) mints a node-partitioned run through the EXISTING run-store, drives the ref
//       to a terminal state via a BOUNDED headless runtime (an INJECTED spawn seam),
//       and completes the run (task 02, fitness #12 acd-assignment-run-store-mesh-blind);
//   (4) cleans up the worktree on `done`, retains it on `failed` (task 03, ADR-004).
// Streams `accepted -> running -> done|failed` up the channel via the SAME
// `sendAssignmentStatus` the worker-stream-client already exposes (ADR-002).
//
// MILESTONE 38 / STORY 01 (worker-repo-checkout, ADR-005/006) — clone-on-miss. On
// `!hasRepo` the handler no longer refuses outright: it resolves the clone SOURCE from
// `config.mesh.repo.cloneUrl` (raw optional-chain, task 00), clones into the ONE scoped
// `meshCheckoutPath(workspaceId)` seam under `<meshRoot>/checkouts/<workspaceId>/`
// (task 01), then writes BOTH repo-availability facts (`writeRepoPublishedMarker` +
// the narrow `global_node_workspaces` upsert) and RE-CHECKS `workerHasRepo` (task 02)
// before falling through to the UNCHANGED addWorktree->run flow below (ADR-006 — no
// second worktree call site). The credential (GIT_ASKPASS token, RESEARCH.md §1's
// recommended default) rides a per-invocation `env` on the CLONE exec ONLY — never
// `process.env`, so the later spawnRuntime agent child (full ambient-env inheritance)
// can never read it (task 03, SECURITY T1/T2/T3, F1/F2).
//
// MEMORY NEAR-MISS honored (recalled at build start via `aof work memory recall`; no
// milestone-35-specific near-miss existed in memory, so the general R2(m20) lesson —
// "a frozen+classified state-carrying key must name its producer" — is the one
// carried forward here): already closed structurally by assignment-record.mjs's
// ASSIGNMENT_STATE_PRODUCERS; this module never invents a second assignment-state
// authority — the worker is the sole SOURCE of accepted/running/done/failed
// (ADR-001), streamed purely over sendAssignmentStatus (ADR-002); control's write-
// through into the store is Story 01's ingest path, not this module's job.
//
// THE INJECTED RUNTIME-SPAWN SEAM (mirroring the transport/ticker injection idiom,
// STORY.md build notes) — `spawnRuntime(brief) => Promise<{ outcome: "done"|"failed",
// failureReason? }>`. THE CRITICAL INVARIANT (STORY.md "Windows child-cwd-at-cleanup —
// handled by SEQUENCING, not detection"): spawnRuntime's returned promise resolves
// ONLY after the child process has FULLY EXITED — never merely "stdout drained but the
// child is still alive". This is what makes task 03's cleanup-after-terminal safe on
// Windows: cleanup (git worktree remove) never races a still-running child whose cwd
// points inside the worktree, because terminal status (-> cleanup) is only ever
// observed strictly after spawnRuntime's promise settles, which the contract pins to
// full exit. Production default: DRIVER-PLUGGABLE, defaulting to `claude -p
// --output-format json` (RESEARCH.md §2/§3 measured; `stop_reason`/`terminal_reason`
// map to done/failed) spawned with cwd = the worktree path; `codex exec --json -o
// <file> --sandbox workspace-write --ask-for-approval never` is the documented
// fallback. The brief carries { itemRef, worktreeCwd, task } for ONE non-interactive
// turn — a BOUNDED proxy for the build half (STORY.md's documented-default scope
// call), NOT aof:continue's multi-agent depth. `@executable` coverage ALWAYS injects a
// scripted spawnRuntime (no real binary) — the real driver is exercised only by the
// task-05 @manual soak.
//
// MILESTONE 38 / STORY 07 (durable-worker-pushback, ADR-015, tasks 00-02) — the
// worker's output SURVIVES: a REAL branch (`meshItemBranchName`, mesh-worktree.mjs — one derivable branch per item since the m42 cure),
// not a detached HEAD (task 00); on `done`, `git push origin <branch>` runs BEFORE the
// worktree force-remove, reusing the SAME `buildAskpassShim` one-shot the clone uses
// (ADR-009's PULL, pointed at a push instead) — the worktree is retained, never
// force-removed, until the push succeeds; a FAILED push surfaces a loud coded
// `push-failed` and RETAINS the worktree for inspection/retry, never a silent clean
// `done` over unpushed commits (task 01, `pushWorktreeBranch` below). The WRITE
// credential is resolved through an INJECTED `requestWriteCredential(...)` seam
// (mirroring `requestCloneCredential`'s per-invocation-only discipline, SECURITY T4 —
// no static credential option exists here either); a caller supplying none makes no
// resolution attempt (an unauthenticated push, exactly the clone path's own
// no-resolver default). The MINT itself — a SEPARATE, single-repo, `contents:write`
// (+`pull_requests:write` only for auto-PR) token, NEVER a widened clone credential —
// is `createGithubAppPushMintProvider` (mesh-clone-credential-provider.mjs, task 02,
// SECURITY T15/T9). Production wiring of `requestWriteCredential` onto a real
// control<->worker frame-pair IS built (mirroring ADR-009's clone-credential-request):
// mesh-launcher.mjs supplies `requestWriteCredential` as a LITERAL production key
// (F12-guarded by acd-clone-credential-pull-not-pushed) via worker-stream-client.mjs's
// own DISTINCT `write-credential-request`/`write-credential` frame pair, which the
// control node answers through `applyWriteCredentialRequestFrame` under the SAME
// holder gates as the clone pull (T6 connection-bound node, F15 frame-workspace match,
// F16 active-assignment). What remains for task 03's `@manual` soak is the real
// two-machine GitHub push over that wire, not the wiring itself.
//
// MILESTONE 38 / STORY 05 (terminal-driven-worker-execution, ADR-013, tasks 00-03) —
// `claude -p` is GONE from the worker driver path: the worker now runs interactive
// `claude` in a node-pty PTY resolved through the EXISTING `terminal-providers` seam
// (task 00), driven by the assignment directive's WHOLE command string typed into
// that ONE long-lived session's PTY stdin as a single `pty.write` (task 01, never a
// `-p` prompt argv). An explicit `NEEDS_INPUT_SENTINEL` observed in the session's own
// PTY output yields a THIRD outcome, `needs-input` — distinct from, and never
// re-mapped to, `done` — which RETAINS its worktree exactly as `failed` already does
// (task 02, closing the RESEARCH §4.3 gap where a question-ended turn read as
// `done`). The session's `session_id` (discarded before this story) is threaded onto
// every `sendAssignmentStatus` call so a human can `claude --resume` it (task 03); a
// run that never resolves one degrades to null, never a crash.
//
// ADR-013 AMENDMENT (F-38.05, 2026-07-19) — BOTH of task 02/03's original mechanisms
// shipped their CONSUMER half with NO PRODUCER (a fitness function armed against the
// as-built, producerless shape had locked that gap in green). Corrected here:
// `session_id` is now resolved by a TRANSCRIPT-DIR WATCH (`defaultWatchTranscriptSessionId`
// below, reusing `claudeProjectsDir` from `work-observe.mjs`) — a real `claude`
// process, given `cwd = worktreeCwd`, writes its OWN transcript to
// `<claudeProjectsDir>/<session_id>.jsonl` with zero model cooperation required; the
// FIRST NEW `*.jsonl` basename to appear after spawn names the session, never a
// phantom PTY marker nothing emitted. `NEEDS_INPUT` now has a real producer too: a
// worker-scoped `--append-system-prompt NEEDS_INPUT_INSTRUCTION` on the interactive
// launch (`resolveInteractiveDriverLaunch` below) — never a human-session `/ws/terminal`
// concern, since that path never calls this launch resolver. See
// `driveInteractiveClaudeSession`/`resolveInteractiveDriverLaunch` below — armed by
// fitness `acd-worker-driver-no-headless-print`.
import path from "node:path";
import { execFile } from "node:child_process";
import { rename, readdir, stat } from "node:fs/promises";
import os from "node:os";
import { findWork, listItems, loadWorkspace } from "../work.mjs";
import { readRuns } from "../run-store.mjs";
import { buildRunAttribution } from "../otel-attribution.mjs";
import { captureSessionIdOnRecord } from "../run-session-capture.mjs";
// m42 wave (d) leg d2 (the sweep) — every terminal settle on this worker goes
// through the run store's ONE event-raiser: fact write + durable `run.completed`
// event + sync drain of its checkout/local reactors. This module can no longer
// call completeRun directly (acd-effects-ledger pins it): the cascade — status
// rollback on failed, projection publish where a workspace is passed — comes
// from the LEDGER (src/effects/table.mjs), not from whichever call site
// remembered it. A crash between the fact and the drain leaves PENDING journal
// steps the next drain (any face, any process) pays.
import { transitionRunComplete, transitionRunStart } from "../effects/run-transitions.mjs";
// m42 wave (d) leg d3 — a TERMINAL assignment report is a durable fact over the
// bridge (raise -> outbox -> ack), never a fire-once frame.
import { reportAssignmentSettled, reportTerminalResumeRefused } from "../effects/assignment-transitions.mjs";
import { createMeshParkResume } from "./park-resume.mjs";
import { addWorktree, reuseWorktreeOnBranch, removeWorktree, meshWorktreesRoot, meshWorktreePath, meshItemBranchName, localBranchExists, remoteBranchExists, adoptRemoteBranch, ensureCommitAvailable, advanceBranchToBase, commitWorktreeChanges } from "./worktree.mjs";
// 129/03 (item 83 seam 3, 129/ADR-008 §4) — the ref-in-worktree resolver and its work-dir
// helper moved to the lane's home. Imported INWARD for the handler's own two uses below (the
// active-worktree registration and the T3b scoping check); `resolveRefInWorktree` is ALSO
// re-exported further down, and a re-export binds no local name (ADR-010 §17a).
import { resolveRefInWorktree, worktreeWorkDir } from "../work/dispatch.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { resolveWorkspaceCloneUrl as defaultResolveWorkspaceCloneUrl } from "./presence.mjs";
// milestone 53 / story 00 (ADR-001) — the session driver moved to its own module and
// is re-exported below, so every one of this file's 49 dependents keeps the import
// line it already had. THREE of the moved names are also consumed INWARD by handler
// code that STAYED here — `defaultSpawnRuntime` is createMeshWorkerExecutionHandler's
// `spawnRuntime` default (:1097), and `driveInteractiveClaudeSession` is
// createMeshWorkerTerminalResumeHandler's `spawnRuntime` default (:2028) — and an
// `export … from` line binds no LOCAL name, so
// every one of those sites would be a ReferenceError without this import (ADR-010 §17a).
//
// VERIFICATION F-01 (53/00) — the third name was MISSING here on first delivery while the
// story's own census counted two, so `createMeshWorkerTerminalResumeHandler` threw
// `ReferenceError: driveInteractiveClaudeSession is not defined` at CONSTRUCTION unless the
// caller injected `spawnRuntime` — which the production wiring at mesh-launcher.mjs:1402
// does not. The census is no longer hand-counted: the door suite DERIVES the inward set from
// this file's own body and requires this clause to cover it (F-02), so a fourth inward
// consumer is caught by construction rather than by a name someone remembered to add.
import { defaultSpawnRuntime, driveInteractiveClaudeSession } from "../agent-session-driver.mjs";
// milestone 70 / story 00 (ADR-001/002) — the PHASE BRIEF reader, shared by this handler
// and the local drive command, so both spawn seams hand the compiled brief to the driver
// BY VALUE on the `brief` bag's additive `context` key.
import { compileBriefForItem } from "../phase-brief-read.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "../degrade.mjs";
import { loopBoundsFromConfig } from "../loop-bounds.mjs";
import { consumeHeartbeatQueue, readConsumedHeartbeatAt } from "../run-heartbeat-consumption.mjs";
// 119/04 (item 83 seam 2, ADR-007) — the launch composer and the directive's own `command` /
// `launch` readers, extracted to their own module. Imported INWARD because a re-export binds no
// local name and the handler below calls all three (the ADR-010 §17a shape, and 53/00's F-01).
import { composeDirectiveLaunchOptions, readDirectiveCommand, readDirectiveLaunch } from "./worker-launch.mjs";
// 119/04 (item 83 seam 1, ADR-007) — repo admission, extracted. Imported INWARD for the four
// consumers that STAYED: the two entry points the handler calls, `meshCheckoutPath` (the withdraw,
// terminal-resume and recovery-push handlers), `meshCheckoutsRoot`
// (`listStrandedWorktreeAssignments`), and `buildAskpassShim` / `redactCredentialFromText` for the
// PUSH path, which is seam 3 and stays here. A re-export binds no local name, so every one of
// these would be a ReferenceError without this line (ADR-010 §17a; 53/00's VERIFICATION F-01 is
// what that clause is made of).
import { admitWorkspaceRepo, resolveScopedCheckout, meshCheckoutPath, meshCheckoutsRoot, buildAskpassShim, redactCredentialFromText } from "./worker-repo-admission.mjs";

// ── the DIRECTIVE LAUNCH — EXTRACTED (119/04, item 83's seam 2; ADR-007, ADR-005, ADR-002) ──
//
// The composer, its two codes, and the two reads that take `command` and `launch` off the
// directive frame now live in `./worker-launch.mjs`. This was a SUBTRACTION, not a copy: this
// file no longer spells `directive.command`, `directive.launch` or
// `Object.hasOwn(directive, "launch")` anywhere, and `composeDirectiveLaunchOptions` has exactly
// one definition in the tree. The whole concern is 63/03's own +85 lines, fenced correctly when
// it landed and touching nothing the rest of this handler owns — which is what made it the
// cheapest of the four seams to cut first.
//
// The two codes ride the re-export below, so all 56 dependents keep the import line they already
// had, resolving to the SAME reference. The precedent is one screen down: seventeen driver names
// re-exported verbatim by 53/00 for exactly this reason.
export { ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS } from "./worker-launch.mjs";

// loopShapedTranscriptWatch(options) — 63/06 (ADR-013 §1, §3a; ADR-016). The two
// transcript-watch seam VALUES an UNATTENDED LOOP launch needs, or null for every session
// launch. The session-shaped default takes the first NEW `*.jsonl` under the run's own
// worktree — which for a loop is its own FIRST INNER session, killing the run ~10s in and
// reporting `done`. A loop PROCESS writes no transcript of its own, so both seams resolve
// null (each the driver's documented no-op) and settlement falls through to `term.onExit`.
// No machinery is edited and no new stop or completion signal exists; the reasoning and the
// rejected alternatives are in ADR-016, not repeated here.
function loopShapedTranscriptWatch(options) {
  if (options?.unattended == null) return null;
  return {
    watchTranscriptSessionId: async () => null,
    watchTranscriptCompletion: async () => null,
  };
}

// phaseBriefContext(itemRef, worktreeItem, directiveCommand) — milestone 70 / story 00
// (ADR-001/002). The mesh worker's spawn seam compiles the phase brief from the item's
// documents INSIDE the worktree it is about to build in (worktreeItem.dir) and returns the
// additive `context` key for the `brief` bag — never a rival payload, and never a failed
// spawn: a compile fault degrades to `{}` and the session runs exactly as before (absence
// stays benign). The brief NAMES the directive's own `itemRef` (the phase's subject), and
// the phase is read from the directive's own command string, never guessed by the caller.
async function phaseBriefContext(itemRef, worktreeItem, directiveCommand) {
  if (worktreeItem?.dir == null) return {};
  const command = typeof directiveCommand === "string" ? directiveCommand : "";
  const phase = command.includes("/aof:refine") ? "refine"
    : command.includes("/aof:verify") ? "verify"
    : "continue";
  try {
    const context = await compileBriefForItem({
      itemRef,
      phase,
      itemType: worktreeItem.type,
      itemDir: worktreeItem.dir,
      // A story lives under `<milestone>/stories/<story>`, so its milestone docs (SPEC.md,
      // ARCHITECTURE.md) sit TWO directories above the story dir.
      milestoneDir: worktreeItem.type === "story" ? path.dirname(path.dirname(worktreeItem.dir)) : worktreeItem.dir,
    });
    return { context };
  } catch (error) {
    reportDegrade("mesh-worker-execution", error);
    return {};
  }
}

// ── the LIVE worktree registry (VERIFICATION, 2026-07-25) ────────────────────
//
// A worker streams its LAUNCH workspace's work-state up the fabric on a ticker, but an
// assignment's real work happens in a per-assignment WORKTREE — so everything an agent
// produces was invisible to the control node until the run finished, committed and pushed,
// and the board read a scaffolded milestone as "0 stories" over a fully broken-down one.
// Reading the pushed BRANCH is not an answer: it cannot show work in flight, and it makes
// committing a precondition for visibility.
//
// This registry is how the worker streams its OWN worktree instead: the driver records the
// worktree the moment it materializes one and clears it the moment the run settles, and the
// launcher's stream ticker reads the registry each tick and streams those items up the
// connection it already holds. Module-level because the driver and the ticker are separate
// call paths in the SAME worker process; entries are ephemeral (never persisted) and are
// removed on every settle path, so a finished run stops streaming immediately.
const activeWorktrees = new Map();

export function registerActiveWorktree(assignmentId, entry) {
  if (typeof assignmentId !== "string" || assignmentId.length === 0) return;
  activeWorktrees.set(assignmentId, { assignmentId, ...entry });
}

export function clearActiveWorktree(assignmentId) {
  activeWorktrees.delete(assignmentId);
}

// listActiveWorktrees() — the launcher's read: every worktree currently being worked in.
export function listActiveWorktrees() {
  return [...activeWorktrees.values()];
}

// checkoutRootForWorktree(worktreePath) — the deterministic inverse of the worktree
// layout (<checkout>/.aof/mesh/worktrees/<assignmentId>): the CHECKOUT root a
// worktree belongs to. The run-lifecycle bracket writes its run records against the
// CHECKOUT's work dir (findWork(ws.workDir) at run-start), NOT the worktree's — so
// the content stream must read runs THERE (measured live: a run 20 minutes in had
// streamed 0 run rows because the reader only looked in the worktree).
export function checkoutRootForWorktree(worktreePath) {
  return path.resolve(worktreePath, "..", "..", "..", "..");
}

// listStrandedWorktreeAssignments(options) — m42 wave (b) / TECH_DEBT item 7 leg 2:
// the DURABLE startup view the in-memory registry above cannot give. Worktree
// DIRECTORIES persist across a daemon restart at
// <checkoutsRoot>/<workspaceId>/.aof/mesh/worktrees/<assignmentId>/ — and at startup
// every one of them belongs to a run whose PTY child no longer exists (this process
// just started). The launcher reports each as failed/daemon-restarted; the control's
// terminal-guard (a terminal row never regresses) makes the broadcast safe for
// retained-after-failure and already-withdrawn worktrees. Absent roots scan to [].
export async function listStrandedWorktreeAssignments(options = {}) {
  const out = [];
  const root = meshCheckoutsRoot(options.globalWorkStoreOptions ?? {});
  let workspaces = [];
  try {
    workspaces = await readdir(root, { withFileTypes: true });
  } catch {
    return out; // no checkouts yet — a fresh worker has nothing stranded
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue;
    const worktreesDir = path.join(root, workspace.name, ".aof", "mesh", "worktrees");
    let entries = [];
    try {
      entries = await readdir(worktreesDir, { withFileTypes: true });
    } catch {
      continue; // this checkout has no worktrees dir — nothing stranded here
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      out.push({
        assignmentId: entry.name,
        workspaceId: workspace.name,
        worktreePath: path.join(worktreesDir, entry.name),
      });
    }
  }
  return out;
}

// ── THE REF-IN-WORKTREE RESOLVER — MOVED (129/03; 129/ADR-008 §4, ADR-005 §5) ──────────
//
// `worktreeWorkDir` and `resolveRefInWorktree` (the T3b / F4b ref-scoping seam: ENUMERATE-
// then-filter through `findWork`, never a `path.join(worktreePath, itemRef)` built from
// directive text) now live in `../work/dispatch.mjs` — the lane's home. The loop's wave
// (`src/loop/wave.mjs`) resolves the item AS IT LIVES IN THE LANE before every run-record
// write, and importing the resolver from HERE would drag the PTY driver into the loop
// family; from `worktree.mjs` it would put `work.mjs` inside the session driver's pinned
// mesh-blind reach. `dispatch.mjs` already sits beside `resolveDispatchLane`, so the seam
// moved to the module that owns the lane. A SUBTRACTION, not a copy: neither name is defined
// here any more. `resolveRefInWorktree` rides the re-export below so every importer keeps
// its line; both are imported INWARD as well because the handler below still calls them and
// a re-export binds no local name (ADR-010 §17a; 53/00's VERIFICATION F-01).
export { resolveRefInWorktree } from "../work/dispatch.mjs";

// ── REPO ADMISSION — EXTRACTED (119/04, item 83's seam 1; ADR-007, ADR-005, ADR-002) ──────
//
// The marker/membership join, the clone-on-miss with its three source tiers, the askpass shim,
// the redaction, the scoped-checkout seam and the clone itself now live in
// `./worker-repo-admission.mjs` — 551 lines answering one question, *may this worker run this
// workspace's work, and where?*, which is not the same question as any other in this file.
//
// A SUBTRACTION, not a copy: none of these names is DEFINED here any more, which is the leg
// FF-11907 asserts per symbol (an absent definition paired with a present re-export is what
// distinguishes a move from a copy-paste). The nine exported names ride the re-export below, so
// `src/mesh/launcher.mjs`, `src/global-node-registry.mjs`, `src/mesh/clone-credential-provider.mjs`
// and `scripts/pin-checkout-id.mjs` keep the import lines they already had, resolving to the SAME
// references — the 53/00 precedent, seventeen names over.
//
// `redactCredentialFromText` is deliberately NOT among them: it was never exported here, and
// adding it would widen this file's surface, which FF-11907 treats as as much a defect as a
// missing name. The push path that stays behind (seam 3) imports it — and `buildAskpassShim` —
// INWARD from the new module, because two spellings of one credential discipline is the named
// failure mode of this cut.
export {
  workerHasRepo,
  resolveCloneUrl,
  parseRepoFromCloneUrl,
  meshCheckoutsRoot,
  meshCheckoutPath,
  isUnderMeshCheckoutsRoot,
  buildAskpassShim,
  cloneRepoForWorkspace,
  pinWorkspaceIdInCheckout,
} from "./worker-repo-admission.mjs";

// --------------------------------------- milestone 38 / story 07 (ADR-015, task 01) ----

// defaultPushExec(args, { cwd, env }) — the INJECTED push-exec seam, mirroring
// resolveCloneExec/defaultCloneExec's OWN shape verbatim (argv-form execFile, never a
// shell string; a per-invocation `env`, never process.env). Default is a real `git`
// spawn; `@executable` tests inject a FAKE that records argv/env/cwd + a scripted
// status (no real forge, no real credential, no network) OR — for task 01, which is
// explicitly RESOLVED to run over a REAL local bare repo as `origin` — exercise the
// real spawn against a disposable fixture (the DEFAULT — `pushExec` absent — IS the
// real spawn).
function defaultPushExec(args, { cwd, env, timeoutMs = 5 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, env, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error.code === "ENOENT" || error.killed || error.signal)) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
    });
  });
}

function resolvePushExec(options) {
  return typeof options?.pushExec === "function" ? options.pushExec : defaultPushExec;
}

// pushWorktreeBranch(projectRoot, worktreePath, branch, options) — `git push origin
// <branch>` FROM INSIDE the worktree, reusing `buildAskpassShim` verbatim (ADR-015
// decision 2/invariant 4) — the SAME `GIT_ASKPASS` one-shot the clone path uses
// (ADR-009's PULL), pointed at a push instead: the write credential (if any) rides a
// per-invocation env for THIS exec call ONLY — never process.env — the ambient
// `credential.helper` is reset (`-c credential.helper=`, SECURITY T7, mirroring the
// clone path) and `GIT_TERMINAL_PROMPT=0` so a missing/refused credential fails LOUDLY
// rather than hanging on a prompt or being silently rescued by the machine's own
// keychain. A non-zero exit or a spawn fault THROWS a coded `push-failed` error
// (credential-redacted, never forwarded raw) — the caller (handleDirective below)
// NEVER force-removes the worktree over a failed push; the askpass one-shot directory
// is always removed in a `finally`, so no token outlives this ONE call regardless of
// outcome. The shim's own scratch directory lives under `meshWorktreesRoot(projectRoot)`
// — a `.askpass/` sibling inside the repo's OWN `.aof/mesh/` (already git-ignored),
// never a bare `os.tmpdir()` (mirroring the clone path's F1 discipline at its own,
// global-mesh-home-rooted, scope).
export async function pushWorktreeBranch(projectRoot, worktreePath, branch, options = {}) {
  const exec = resolvePushExec(options);
  const credential = typeof options.credential === "string" && options.credential.length > 0 ? options.credential : null;
  let askpass = null;
  try {
    const pushEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C", LANG: "C" };
    if (credential != null) {
      askpass = await buildAskpassShim(meshWorktreesRoot(projectRoot), credential);
      pushEnv.GIT_ASKPASS = askpass.shimPath;
    }
    const result = await exec(["-c", "credential.helper=", "push", "origin", branch], { cwd: worktreePath, env: pushEnv });
    if (result.status !== 0) {
      const message = redactCredentialFromText(`git push failed for branch "${branch}": ${result.stderr || result.stdout}`, credential);
      const error = new Error(message);
      error.code = "push-failed";
      throw error;
    }
  } catch (error) {
    error.message = redactCredentialFromText(String(error?.message ?? error), credential);
    error.code = error.code ?? "push-failed";
    throw error;
  } finally {
    await askpass?.cleanup?.();
  }
}

// ── THE WORKTREE COMMIT — MOVED (129/03; 129/ADR-008 §4, TECH_DEBT item 83 seam 3) ──────
//
// `commitWorktreeChanges` — `git add -A`, the best-effort `reset -q -- .aof`, the staged
// check, the `--no-verify` commit under the mesh identity, `{ committed }` — now lives in
// `./worktree.mjs` beside its sibling git verbs, the home ADR-008 (m43) named for every git
// verb and the one the loop's lane commit reaches without this file. One verb of seam 3,
// paid the way seams 1 and 2 were: an ABSENT definition paired with a PRESENT re-export is
// what distinguishes a move from a copy. It resolves its runner as `options.exec ??
// options.pushExec`, so the two call sites below keep their lines (both pass `pushExec`, the
// ONE fake git a test scripts commit + push through), and it is imported INWARD at the top of
// this file because those call sites are here and a re-export binds no local name.
export { commitWorktreeChanges } from "./worktree.mjs";

// ------------------------------- task 01/02/03: the clone orchestration — EXTRACTED ----
//
// `writeNodeWorkspaceMembership`, `overlayRepoPublishedMarker`, `cloneRepoForWorkspace` and
// `pinWorkspaceIdInCheckout` moved to `./worker-repo-admission.mjs` with the guard they serve
// (119/04, item 83's seam 1). The two exported names ride the re-export above.

// ---------------------------------------------- the session driver, re-exported ----
//
// milestone 53 / story 00 (ADR-001, TECH_DEBT item 10's own prescribed split). The
// ~1,000 lines that used to sit here — the whole PTY/agent session driver — now live
// in `agent-session-driver.mjs`, which is mesh-blind by construction: five source
// imports against this file's twenty-one, and no run-store, no effects ledger, no
// SQLite opener. A local `aof work loop` can drive a session without loading the
// assignment lifecycle.
//
// EVERY ONE OF THE SEVENTEEN IS RE-EXPORTED VERBATIM — that is what makes the move a
// promotion rather than a rewrite: all 49 dependents of this file (43 suites, the two
// test/support fixture modules, and mesh-launcher.mjs / global-node-registry.mjs /
// mesh-clone-credential-provider.mjs / scripts/pin-checkout-id.mjs) keep the import
// line they already had, resolving to the SAME reference. The precedent is one
// function over: `ensureWorktreeTrusted` moved to claude-trust.mjs in 2026-07-26 and
// was re-exported from here "so every existing importer is untouched" — it rides this
// line now as the SEVENTEENTH member of the moved set (ADR-010 §18), which keeps the
// driver's own importers from needing this file at all.
//
// `defaultSpawnRuntime` and `driveInteractiveClaudeSession` are ALSO
// imported at the top of this file: a re-export binds no local name, and the handler code
// below consumes both inward (ADR-010 §17a; the second was VERIFICATION F-01).
export {
  NEEDS_INPUT_SENTINEL,
  NEEDS_INPUT_INSTRUCTION,
  DIRECTIVE_COMPLETE_SENTINEL,
  DIRECTIVE_COMPLETE_INSTRUCTION,
  WORKER_SESSION_INSTRUCTION,
  COMPLETION_IDLE_MS,
  DECLARED_COMPLETION_IDLE_MS,
  HUMAN_INPUT_TOOL_NAMES,
  INTERACTIVE_COMMAND_READY_DELAY_MS,
  defaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion,
  defaultPtySpawn,
  resolveInteractiveDriverLaunch,
  driveInteractiveClaudeSession,
  buildDriverCommand,
  defaultSpawnRuntime,
  ensureWorktreeTrusted,
} from "../agent-session-driver.mjs";

// ------------------------------------------------------- the orchestration ----

function assignmentError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

// logAssignmentFailure(assignmentId, code, detail) — review fix (live soak,
// 2026-07-17): EVERY failed-exit in handleDirective below streamed a coded
// `failed` status up the wire but printed NOTHING to this worker's OWN log — the
// worst case was assignmentError(...) actually constructing an Error carrying the
// real message and then discarding it via `void`, the message existing for one
// tick and then genuinely gone. Found live: an assignment failed on the very
// first real cross-machine dispatch ever attempted, and neither the control
// node's assignment row (state alone, no reason) nor the worker's own terminal
// (nothing at all) could say why.
function logAssignmentFailure(assignmentId, code, detail) {
  console.error(`[mesh-worker] assignment ${assignmentId} failed (${code}): ${detail}`);
}

// baseCommitUnavailableDetail(commit, branch) — ONE wording for
// `assignment-base-commit-unavailable`, now that m43/ADR-008 fires it at BOTH doors (the
// create door needs the commit to build the worktree; the reuse door needs it to advance
// the branch). ADR-010 R5.1 requires the refusal to NAME THE CURE: a coded failure whose
// remedy is unstated is exactly how TECH_DEBT item 2 reads, and the remedy here is always
// the same — the control checkout has commits it never pushed.
function baseCommitUnavailableDetail(commit, branch = null) {
  return `the dispatched base commit ${commit} is not reachable in this worker's checkout${branch != null ? ` (advancing branch "${branch}")` : ""} (fetched origin once) — an unpushed control checkout, or a stale clone that cannot see it. Cure: push the control checkout, then re-dispatch.`;
}

// gatePropagationRefusalDetail(advance, branch, worktreePath) — the SAME rule for the two
// refusals m43/ADR-008's reuse door adds (m43 / ADR-016/G8, which makes ADR-010 R5.1's clause
// GENERAL to every coded refusal this milestone adds, not specific to the one it was written
// about). The two codes have genuinely DIFFERENT cures, and one shared string named neither —
// nor the tree to look at, which is the sharper omission: an operator reading
// `aof mesh logs --node` was told a merge was refused and given no path to inspect. The
// worktree is RETAINED on both paths (`onCleanup(assignmentId, "failed", worktreePath)`), so
// naming it is naming something that is still there.
function gatePropagationRefusalDetail(advance, branch, worktreePath) {
  const named = advance.branch ?? branch ?? "the item branch";
  const head = `the gate-time advance of branch "${named}" to the dispatched base commit ${advance.base} was refused; the branch is unchanged at ${advance.tip}, and the worktree is RETAINED for inspection at ${worktreePath}.`;
  if (advance.code === "assignment-gate-propagation-dirty-worktree") {
    // Nothing was checked out and nothing merged — the uncommitted bytes are the one thing
    // git cannot recover, which is why this is a refusal rather than a stash.
    return `${head} Cause: that worktree has uncommitted changes (\`git -C ${worktreePath} status --porcelain\` is non-empty). Cure: commit them on "${named}", or clean the worktree, then re-dispatch.`;
  }
  if (advance.code === "assignment-gate-propagation-conflict") {
    // `git merge --abort` has already run, so the tree is exactly as it was found — the
    // operator is being asked to resolve on the branch, not to rescue a half-merged worktree.
    return `${head} Cause: merging the base into "${named}" conflicted; the merge was ABORTED, so no half-merged state was left behind. Cure: resolve the conflict on "${named}" yourself (merge ${advance.base} into it in ${worktreePath} or in the control checkout, commit, push), then re-dispatch.`;
  }
  return head;
}

// ── control-driven WITHDRAWAL (2026-07-27, the duplicate-run wall) ────────────
//
// Measured live: `aof mesh assign 18 --withdraw` flipped the control-side row and
// NOTHING ELSE — the worker's session kept running and its run record stayed
// `running`, so the run store's duplicate-run guard refused every future run for
// the item, deterministically, until an operator settled the record by hand. The
// control's dispatch tick now sends a withdraw DOWN-frame to the holder; these two
// module-scoped structures are how the frame reaches the live run:
//   - livePtyKills: assignmentId → a kill for the CURRENTLY live PTY (registered
//     by the execution bracket around its spawn, removed when the spawn settles);
//   - withdrawnByControl: assignmentIds whose withdrawal arrived — consumed by the
//     bracket (before spawn: never spawn; after settle: settle the run record as
//     cancelled and send no frame — the row is already terminal).
const livePtyKills = new Map();
const withdrawnByControl = new Set();

// ── interactive worker terminals (m42; SECURITY T14 operator-overridden) ──────
//
// The INPUT direction's registries, beside the kill registry they mirror:
//   - livePtyWrites: assignmentId → a write into the CURRENTLY live PTY
//     (registered by the bracket beside its kill, removed with it);
//   - liveSessionInputs: captured sessionId → that SAME write, bound the moment
//     the transcript watch resolves the session id. The browser routes on the
//     (nodeId, sessionId) tuple, so the session id — never the assignment id —
//     is the input frame's join key; a session whose id was never captured is
//     simply unreachable for input (exactly as it is unreachable for the mirror).
// Both cleared by clearLivePtyRegistries the moment the spawn settles — input
// can never reach a PTY whose bracket has moved on.
const livePtyWrites = new Map();
const liveSessionInputs = new Map();

// clearLivePtyRegistries(assignmentId) — the ONE settle-side sweep for every
// per-PTY registry (kill + write + any session binding pointing at that write).
// Value-identity scan for the session binding: the bracket knows its assignment
// id at settle, not necessarily its captured session id, and the registries are
// bounded by the handful of concurrently-live PTYs on one worker.
function clearLivePtyRegistries(assignmentId) {
  livePtyKills.delete(assignmentId);
  const write = livePtyWrites.get(assignmentId);
  livePtyWrites.delete(assignmentId);
  if (write != null) {
    for (const [sessionId, bound] of liveSessionInputs) {
      if (bound === write) liveSessionInputs.delete(sessionId);
    }
  }
}

// createMeshWorkerExecutionHandler(options) → handler(directive) — the function
// `client.onDirective(handler)` registers (worker-stream-client.mjs). Every
// collaborator is INJECTED (the transport/ticker injection idiom):
//   loadWs()                        — () => Promise<workspace>, default a real
//                                      loadWorkspace(process.cwd()); tests inject a
//                                      fixture workspace resolver.
//   nodeId                          — this worker's stable id (DATA passed to
//                                      startRun({ node }) — the run-store never learns
//                                      it is mesh).
//   sendAssignmentStatus(assignmentId, state, { runId }) — the worker-stream-client
//                                      up-channel emitter (ADR-002); tests inject a
//                                      recorder.
//   spawnRuntime(brief, opts)       — the runtime-spawn seam (default
//                                      defaultSpawnRuntime); tests ALWAYS inject a
//                                      scripted stub (no real binary).
//   now                             — () => string | string, the injected clock
//                                      threading every stamp (startRun/heartbeat/
//                                      completeRun all take it).
//   exec                            — the injected git exec (mesh-worktree.mjs's
//                                      seam) — passed through to addWorktree/
//                                      removeWorktree so a test's fake git never
//                                      needs a real binary either (task 02's
//                                      run-lifecycle scenarios only assert the
//                                      BRACKET, not worktree mechanics — tasks 00/03
//                                      exercise the real git).
//   onCleanup(assignmentId, outcome, worktreePath) — an observer hook (tests assert
//                                      cleanup/retention without re-deriving it).
//   openStore / globalWorkStoreOptions — passed through to workerHasRepo's local
//                                      global_node_workspaces read (tests point it at
//                                      a hermetic AOF_GLOBAL_HOME).
//   cloneExec(args, { cwd, env })   — milestone 38 story 01's INJECTED clone-exec
//                                      seam (default a real `git` spawn); tests inject
//                                      a FAKE that records argv + env and returns a
//                                      scripted status (no real forge/network).
//   requestCloneCredential(req)     — milestone 38 story 01 task 05, ADR-009 (the F12
//                                      fix): the PULLED clone-credential ASYNC
//                                      resolver — ({ assignmentId, workspaceId,
//                                      cloneUrl }) => Promise<string|null> — forwarded
//                                      to cloneRepoForWorkspace's OWN identically-named
//                                      option, which calls it ONLY on the clone-miss
//                                      path (per-clone by construction, SECURITY T4).
//                                      Production (mesh-launcher.mjs) supplies
//                                      `(request) => client.requestCloneCredential(request)`
//                                      as a LITERAL key at the createHandler({...}) call
//                                      site — the F12 guard: this collaborator is no
//                                      longer reachable ONLY through the
//                                      workerExecutionOptions test-injection spread.
//                                      THERE IS NO STATIC credential option — a static
//                                      string would be per-HANDLER (one per worker
//                                      process) and therefore structurally cannot be
//                                      per-clone; the type of this seam (an async
//                                      resolver, called fresh on every clone-miss) is
//                                      what enforces SECURITY T4, not a comment asking
//                                      politely. Absent for a public-repo clone (no
//                                      resolver call is even attempted).
//   pushExec(args, { cwd, env })    — milestone 38 story 07 task 01's INJECTED
//                                      push-exec seam (default a real `git` spawn,
//                                      defaultPushExec above); tests inject a FAKE that
//                                      records argv/env/order and returns a scripted
//                                      status, OR (task 01, RESOLVED to run over a REAL
//                                      local bare origin) let the default real spawn
//                                      run.
//   requestWriteCredential(req)     — story 07 task 01/02, ADR-015: the push-seam
//                                      write-credential ASYNC resolver — ({
//                                      assignmentId, workspaceId, branch }) =>
//                                      Promise<string|null> — called ONLY on a `done`
//                                      outcome, immediately before the push, mirroring
//                                      requestCloneCredential's OWN per-call-only
//                                      discipline (SECURITY T4 applied to the write
//                                      grant): no static credential option exists here
//                                      either. Production wiring EXISTS:
//                                      mesh-launcher.mjs supplies this resolver as a
//                                      LITERAL key — `requestWriteCredential: (request)
//                                      => client.requestWriteCredential(request)` —
//                                      over worker-stream-client.mjs's own DISTINCT
//                                      `write-credential-request`/`write-credential`
//                                      frame pair (F12-guarded). A caller that passes
//                                      none makes no resolution attempt (an
//                                      unauthenticated push, exactly the clone path's
//                                      own no-resolver default).
//   ptySpawn(bin, args, opts)       — milestone 38 story 05 (ADR-013): the INJECTED
//                                      node-pty spawn seam forwarded straight through
//                                      to spawnRuntime's OWN options (default absent,
//                                      so driveInteractiveClaudeSession falls to ITS
//                                      OWN default — the real
//                                      createTerminalSpawn(loadNodePty) factory,
//                                      EXACTLY the seam terminal-ws.mjs's `/ws/terminal`
//                                      spawns through). `@executable` coverage ALWAYS
//                                      injects a scripted ptySpawn (no real node-pty,
//                                      no real `claude`) — real only at the task-04
//                                      @manual soak.
//   which(bin, env)                 — story 05's INJECTED provider-binary-resolution
//                                      seam, forwarded straight through to
//                                      spawnRuntime's options (default absent, so
//                                      resolveInteractiveDriverLaunch falls to
//                                      terminal-providers.mjs's OWN real-PATH default).
//                                      `@executable` coverage injects a stubbed-
//                                      present/absent binary, mirroring
//                                      terminal-ws.mjs's OWN `which` injection idiom.
//
// Returns a handler `(directive) => Promise<void>` — never throws (a fault inside the
// handler streams a `failed` frame rather than crashing the worker's stream loop; the
// never-crash discipline every other mesh consumer keeps).
export function createMeshWorkerExecutionHandler(options = {}) {
  const {
    loadWs = () => loadWorkspace(process.cwd()),
    nodeId,
    sendAssignmentStatus,
    // m42 wave (d) leg d3 — the outbox transport. A TERMINAL report is a FACT and
    // rides the durable path (raise → pending step → ship → ack → paid), so a
    // dropped connection can no longer lose it. Ordinary posture frames
    // (accepted/running) stay on sendAssignmentStatus. The one non-terminal FACT,
    // running+needs-input, uses the durable path too because applying it releases
    // capacity; it is never published while the PTY is alive.
    sendEffectStep,
    spawnRuntime = defaultSpawnRuntime,
    now = () => new Date().toISOString(),
    exec,
    driver,
    onCleanup: onCleanupObserver = () => {},
    openStore,
    globalWorkStoreOptions,
    requestCloneCredential,
    cloneExec,
    pushExec,
    requestWriteCredential,
    // milestone 38 / story 05 fix (VERIFICATION F24) — the pre-spawn worktree-trust
    // seam, forwarded VERBATIM into spawnRuntime's options object (below). Production
    // (mesh-launcher) wires the real ensureWorktreeTrusted as a LITERAL key; a test
    // omits it, so no test run ever touches a real ~/.claude.json.
    trustWorktree,
    // milestone 38 / story 05 fix (VERIFICATION F27) — the injected delay before the
    // directive command is typed into claude's PTY, forwarded into spawnRuntime's own
    // options object (below). Production (mesh-launcher) wires the real value; a test
    // omits it and gets an immediate next-tick write (the pre-fix timing).
    commandDelayMs,
    // milestone 38 / story 05 (ADR-013) — forwarded VERBATIM into spawnRuntime's own
    // options object (below) so a test can drive the REAL defaultSpawnRuntime /
    // driveInteractiveClaudeSession through this ONE handler entry point (the SAME
    // "test through the real production seam, only the leaf spawn/PATH-lookup is
    // faked" discipline every other collaborator here keeps).
    ptySpawn,
    which,
    // milestone 38 / story 05 (ADR-013 AMENDMENT, F-38.05) — the session_id
    // transcript-dir-watch seam, forwarded VERBATIM into spawnRuntime's own options
    // object (below) beside ptySpawn/which — the SAME single handler entry point a
    // test injects a fake watch through, no second injection surface.
    watchTranscriptSessionId,
    // milestone 38 (F-38.06h) — the transcript COMPLETION watch, forwarded the same
    // way: the driver defaults to the real poller, a test injects a double.
    watchTranscriptCompletion,
    deadlinePolicy,
    readHeartbeatAt,
    // milestone 38 / story 06 (ADR-014, AMENDMENT 2026-07-19 — the HYBRID transport,
    // closing BLOCKER F-38.06) — the cross-machine terminal BRIDGE hook, forwarded
    // VERBATIM into spawnRuntime's own options object (below), exactly like
    // ptySpawn/which above: an OPTIONAL `(chunk, sessionId) => void` called for EVERY
    // PTY output chunk driveInteractiveClaudeSession observes (:1002-1017). Absent by
    // default — every pre-story-06 caller (every existing test, and a caller that
    // passes `workerExecution` options with no onOutputChunk) is byte-identical.
    //
    // AS-BUILT WIRING (the F-38.05/F-38.06 amendment resolved the open transport
    // question): mesh-launcher.mjs's worker branch NOW wires this as a LITERAL key at
    // the production createHandler call site to `client.sendTerminalFrame(sessionId,
    // String(chunk))` (mesh-launcher.mjs:846) — the CROSS-MACHINE leg rides the FABRIC
    // (worker-stream-client -> control-stream-server), the ONLY off-host-reachable
    // transport (serveRelay binds loopback only, so the worker CANNOT push straight to
    // the relay broker). control-stream-server branches the terminal-frame to its
    // onTerminalFrame sink and the CONTROL launcher fans it into a loopback relay for
    // the same-machine fleet-UI process. `createTerminalRelayPushTransport` is now
    // CONTROL-SIDE ONLY (the loopback push into that relay), never the worker's leg.
    onOutputChunk,
    // milestone 38 / story 06 / task 04 (BLOCKER F-38.06d; ADR-013 AMENDMENT
    // 2026-07-23, structural invariant 7) — the LIVE join-key report seam:
    // `(sessionId, { assignmentId, runId }) => void|Promise`, called ONCE, MID-RUN,
    // the moment the driver's transcript watch first resolves a session id.
    //
    // WHY IT EXISTS. The `running` frame that OPENS the run is sent BEFORE the driver
    // spawns and carries `{ runId }` only (correctly — no session exists yet), and
    // every OTHER session-carrying frame this handler sends is terminal
    // (`done`/`failed`; `needs-input` aside, which already reports mid-flight). So
    // `global_assignments.session_id` stayed NULL for the whole life of an ordinary
    // run: `projectAssignment` omitted the key, the fleet card resolved `no-session`,
    // and the join key landed only once the stream was dead.
    //
    // The DEFAULT is the report itself — a SECOND `running` frame (the shape the
    // amendment names) on this handler's OWN `sendAssignmentStatus` emitter, so the
    // T6 holder gate and the F17 connection-identity re-stamp both still apply, no
    // new frame kind exists, and the control node's absent-is-not-a-clear writer
    // takes it idempotently (`running` -> `running` re-stamps updatedAt and fills in
    // the session id; a later state-only frame can never erase it). Production
    // (mesh-launcher.mjs) ALSO supplies this as a LITERAL key at the createHandler
    // call site — deliberately equivalent to the default, and deliberately not only
    // the default: the F12/ADR-013-inv.7 discipline is that a producer must be wired
    // in the production call site's own text, never reachable ONLY through the
    // workerExecutionOptions test-injection spread.
    onSessionIdCaptured = (sessionId, { assignmentId, runId } = {}) => sendAssignmentStatus?.(assignmentId, "running", { runId, sessionId }),
    // milestone 38 / story 06 / task 04 (BLOCKER F-38.06e; ADR-014 AMENDMENT
    // 2026-07-23, structural invariant 8) — the END-OF-STREAM seam:
    // `(sessionId) => void|Promise`, forwarded VERBATIM into spawnRuntime's own
    // options object (below) beside `onOutputChunk`, whose SIBLING it is: the byte
    // hook says "more output", this one says "there will be no more".
    //
    // WHY IT EXISTS. The terminal-frame protocol had no end signal at all and the
    // fleet route unsubscribed only on the BROWSER's own close, so after a worker's
    // PTY exited an open terminal-view sat on `streaming`/`live:true`/`motion:
    // "pulse"` forever — DESIGN §Surface 3 V9's exact forbidden state ("a dead
    // stream must not masquerade as a live one"). The driver's `finish()` is the ONE
    // place that fact is known for all three outcomes.
    //
    // NO DEFAULT (unlike onSessionIdCaptured, whose default is a status frame this
    // handler can send itself): the end rides the TERMINAL-FRAME transport, not the
    // assignment-status one, so only the launcher — which holds the worker's stream
    // client — can wire it. Production (mesh-launcher.mjs) supplies it as a LITERAL
    // key at the createHandler({...}) call site, exactly like onOutputChunk (the F12
    // discipline: a producer reachable only through the workerExecutionOptions
    // test-injection spread is one revision from being inert in production).
    onSessionEnd,
    // resolveWorkspaceCloneUrl — INJECTED (the same idiom as every other
    // collaborator here), default the real mesh-presence.mjs seam. Reads the
    // WORKER's OWN local registry — kept as a last-resort, defense-in-depth check
    // (e.g. a shared-filesystem deployment), but CONFIRMED LIVE (2026-07-18) to
    // read nothing in the real cross-machine case: each node's SQLite file is
    // independently, only LOCALLY populated, so a worker that has never itself
    // published this workspace has no row to find here regardless.
    resolveWorkspaceCloneUrl = defaultResolveWorkspaceCloneUrl,
    // requestCloneUrl — review fix (ADR-010 Gap A extended, live soak 2026-07-18):
    // the PULL that actually closes the gap resolveWorkspaceCloneUrl above cannot
    // — asks the control node directly, over the SAME live stream the credential
    // PULL already uses (ADR-009's precedent), for the clone_url it has on record
    // for this workspace. INJECTED; production supplies client.requestCloneUrl
    // (mesh-launcher.mjs), a test may override it via workerExecutionOptions.
    requestCloneUrl,
  } = options;

  // VERIFICATION (live worktree streaming, 2026-07-25) — the ONE place a run's worktree
  // stops being live. Every settle path in the handler already calls `onCleanup`, so
  // wrapping it here releases the worktree from the streaming registry on done, failed,
  // needs-input AND every early refusal, with no per-call-site bookkeeping to forget.
  const onCleanup = (assignmentId, outcome, worktreePath) => {
    clearActiveWorktree(assignmentId);
    return onCleanupObserver(assignmentId, outcome, worktreePath);
  };

  const resolveNow = () => (typeof now === "function" ? now() : now);

  // reportSettled(assignmentId, state, extras) — m42 wave (d) leg d3: THE DURABLE
  // TERMINAL REPORT. Every place this handler used to stream a terminal
  // `sendAssignmentStatus` now raises `assignment.reported` into the worker's own
  // journal and ships it through the outbox, so the fact survives the connection
  // that was supposed to carry it (STATE 2026-07-27's measured fire-once defect: a
  // stranded worktree's `failed` report died on a dead socket and the control row
  // read `running` for 35+ minutes). In the connected case the drain runs right
  // here, so latency is unchanged; disconnected, the step stays owed and the next
  // drain redelivers it. sendAssignmentStatus remains the fallback for a journal
  // that cannot be opened — behaviour never gates on the ledger's health.
  const reportSettled = (assignmentId, state, extras = {}) =>
    reportAssignmentSettled(
      { assignmentId, state, ...extras, now: resolveNow() },
      {
        journalOptions: { env: globalWorkStoreOptions?.env },
        sendEffectStep,
        fallbackSend: sendAssignmentStatus,
      },
    );

  // reportAssignmentFailure — 2026-07-27 (the wrong-base retries): every coded
  // failure in this handler used to reach ONLY the daemon's stderr
  // (logAssignmentFailure's console.error — unreadable on a supervised daemon,
  // gone with a closed terminal), so a deterministic 2-second failure took an SSH
  // inspection to name. The SAME line now also rides the launcher's log channel
  // (durable sink + the stream forward into the control's node_logs ring).
  const reportAssignmentFailure = (assignmentId, code, detail) => {
    logAssignmentFailure(assignmentId, code, detail);
    try {
      options.onLog?.({ code, level: "warn", message: `assignment ${assignmentId} failed (${code}): ${detail}` });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };

  // milestone 35 / ADR-008 — the AUTHORITATIVE dispatch-once guard. The launcher's
  // in-memory "already dispatched" Set (mesh-launcher.mjs) is best-effort ONLY
  // (rebuilt empty on a control-node restart); THIS Set is what the system rests
  // on for correctness: an assignmentId is added the moment this handler starts
  // acting on it (BEFORE the repo guard, before "accepted" is even sent) and is
  // NEVER removed — a directive for an assignmentId already in this Set (in-flight
  // OR already-terminal on this worker) is ignored outright: no re-send of
  // "accepted", no second worktree/run, nothing re-executed. This is what makes a
  // post-restart re-dispatch (the control tick re-scanning a still-`assigned` row
  // whose worker already accepted it) SAFE.
  const seenAssignmentIds = new Set();

  return async function handleDirective(directive) {
    const assignmentId = directive?.assignmentId;
    const itemRef = directive?.itemRef;
    const workspaceId = directive?.workspaceId;
    // 119/04 (item 83 seam 2) — both directive reads have ONE home now, and it is not this file.
    // `readDirectiveCommand` keeps m38/05's degrade-to-null (a blank or absent command still spawns
    // the interactive session, simply with nothing typed into it), and `readDirectiveLaunch` keeps
    // 63/03's PRESENCE test rather than a truthiness one — answered as a pair so this caller cannot
    // take the value without the presence, which is how the `?? <empty>` species gets back in.
    const directiveCommand = readDirectiveCommand(directive);
    const { declared: launchDeclared, launch: directiveLaunch } = readDirectiveLaunch(directive);
    if (typeof assignmentId !== "string" || assignmentId.length === 0) return;
    if (seenAssignmentIds.has(assignmentId)) return; // duplicate directive — already held/acted on, ignore
    seenAssignmentIds.add(assignmentId);

    let ws;
    try {
      ws = await loadWs();
    } catch (error) {
      reportAssignmentFailure(assignmentId, "workspace-load-failed", String(error?.message ?? error));
      await reportSettled(assignmentId, "failed", { code: "workspace-load-failed" });
      return;
    }

    // 119/04 (item 83's seam 1, ADR-007) — REPO ADMISSION, extracted. The join, the
    // clone-on-miss and the scoped-checkout repoint left this handler together; what stayed is
    // the REPORTING. Both calls answer `{ ws }` or `{ refused, code, detail }` — never anything
    // this handler could still act on — and `reportAssignmentFailure` / `reportSettled` remain
    // this handler's alone, so every coded outcome is emitted from the same call site, in the
    // same order, before any worktree or run exists. The guard still PRECEDES the
    // `git worktree add` call site below (fitness #7 / SEC F3), which
    // `acd-assignment-repo-availability-loud` asserts across the split.
    const admission = await admitWorkspaceRepo(ws, {
      workspaceId,
      nodeId,
      assignmentId,
      openStore,
      globalWorkStoreOptions,
      cloneExec,
      requestCloneCredential,
      requestCloneUrl,
      resolveWorkspaceCloneUrl,
      resolveNow,
      // The clone-url PULL fault REPORTS and then falls through to tier 3; it is not a refusal,
      // so it needs a reporter rather than a return.
      reportFault: (code, detail) => reportAssignmentFailure(assignmentId, code, detail),
    });
    if (admission.refused === true) {
      reportAssignmentFailure(assignmentId, admission.code, admission.detail);
      await reportSettled(assignmentId, "failed", { code: admission.code });
      return;
    }
    ws = admission.ws;

    // accepted — the repo guard passed; the directive is genuinely being acted on.
    await sendAssignmentStatus?.(assignmentId, "accepted", {});

    // The repo the worker RUNS is scoped by workspaceId, NOT by the daemon's launch cwd (the
    // 2026-07-24 two-machine soak, VERIFICATION F23 — the reasoning is at the seam now). Sent
    // AFTER the `accepted` frame above, exactly as it was: a checkout that cannot be loaded
    // settles `accepted -> failed`, which is why this is a second call and not one.
    const scoped = await resolveScopedCheckout(ws, { workspaceId, globalWorkStoreOptions });
    if (scoped.refused === true) {
      reportAssignmentFailure(assignmentId, scoped.code, scoped.detail);
      await reportSettled(assignmentId, "failed", { code: scoped.code });
      return;
    }
    ws = scoped.ws;

    // 63/03 (ADR-012 §3) — COMPOSE THE UNATTENDED LAUNCH, from the declaration THIS NODE
    // installs. Read from the workspace root rather than from the dispatched worktree: the
    // envelope is a property of the machine that will run the launch, not of the branch it
    // was told to build, and a branch-carried declaration could widen its own envelope.
    // `ws` has just been repointed at the assigned workspace's checkout, so this is that
    // workspace's own declaration. Placed AFTER the repo guard and BEFORE any worktree or
    // run exists: a launch this worker cannot compose is refused with a code, spawns
    // nothing, types nothing in its place and starts no run. Every session-phase directive
    // skips this entirely and is byte-identical to a delivered tree's.
    let launchOptions = {};
    if (launchDeclared) {
      const composed = await composeDirectiveLaunchOptions(directiveLaunch, ws.projectRoot);
      if (composed.refused === true) {
        reportAssignmentFailure(assignmentId, composed.code, composed.detail);
        await reportSettled(assignmentId, "failed", { code: composed.code });
        return;
      }
      launchOptions = composed.options;
    }
    // 63/06 — computed HERE so the spawn bag reads no launch identifier of its own.
    const loopWatch = loopShapedTranscriptWatch(launchOptions);

    let worktreePath;
    let runRecord;
    let item;
    // story 07 task 00 (ADR-015) — the REAL branch this assignment's worktree is
    // checked out on, computed BEFORE addWorktree so both the checkout call and the
    // eventual push (below) name the SAME branch.
    //
    // M42 (the brittleness cure) — ONE derivable branch per item. A continue/verify
    // still carries `directive.baseBranch` (the control's cache-resolved answer,
    // which wins for continuity: a pre-cure item's work lives on its old suffixed
    // branch, a reindexed item's on its pre-rename name). A directive WITHOUT a
    // baseBranch — a refine, an item never pushed, or an older control — derives
    // the item's own `aof/mesh/<ref>`: the fallback now CONVERGES on the same line
    // instead of minting a divergent per-assignment fork only a side table could
    // remember (the 2026-07-27 wrong-base disease). The worktree PATH stays
    // assignmentId-keyed either way (SECURITY F4 untouched).
    const baseBranch = typeof directive.baseBranch === "string" && directive.baseBranch.length > 0 ? directive.baseBranch : null;
    const branch = baseBranch ?? meshItemBranchName(itemRef);
    try {
      // task 00 — materialize the dedicated worktree at the ONE seam, ON the REAL
      // branch above (ADR-015: HEAD lands on `branch`, never detached). A reused base
      // branch is checked out via reuseWorktreeOnBranch (release any holder + prune, then
      // check out the existing branch); a fresh branch is `-b <branch>` off the commitish.
      // M42: with one branch per item the derived name can already EXIST locally (a
      // re-refine after a prior run on the same item) — `-b` would refuse, so an
      // existing branch takes the reuse door: the item's line continues, never forks.
      const commitish = directive.commit ?? "HEAD";
      const localExists = baseBranch == null && (await localBranchExists(ws.projectRoot, branch, { exec }));
      // M43 / story 05, VERIFICATION F-05.3 — the item's line may exist ONLY on the
      // remote. A freshly built checkout (a second worker, or one rebuilt after cleanup)
      // has `refs/remotes/origin/<branch>` and no local head, so the local-only question
      // answered "no line" and the CREATE door forked the item off the pinned base,
      // discarding the previous phase's commits. Adopting the remote ref as a local head
      // routes it to the reuse door instead, where the advance already does the right
      // thing: a line that exists ANYWHERE must never be forked.
      let adoptedFromRemote = false;
      if (baseBranch == null && !localExists && (await remoteBranchExists(ws.projectRoot, branch, { exec }))) {
        adoptedFromRemote = await adoptRemoteBranch(ws.projectRoot, branch, { exec });
      }
      const branchExists = localExists || adoptedFromRemote;
      // M43 / story 05 (ADR-008): the REUSE DOOR — either door onto an existing line
      // (the directive's cache-resolved `baseBranch`, or the derived branch already
      // present locally). Named once so the pin, the materialization and the advance
      // below all read the SAME predicate.
      const reuseDoor = baseBranch != null || branchExists;
      // M42 base-commit pin (operator, 2026-08-01): a fresh worktree builds from
      // the EXACT commit the control assigned against — the directive carries the
      // control checkout's HEAD, and a clone that does not have it yet fetches
      // once. Unavailable after the fetch is a LOUD coded failure, never a silent
      // build from this clone's stale HEAD (the other half of the wrong-base
      // disease).
      // M43 / ADR-008 + ADR-010 R5.1: the pin gate no longer stops at the create
      // door. The reuse doors used to ignore it BY DESIGN ("an existing line
      // continues from where it is"), which is exactly why a control-side gate edit
      // never reached a CONTINUING item. The check below stays where it is because
      // the create door needs the commit to BUILD the worktree; the reuse door needs
      // it to ADVANCE the branch, so its own availability check runs after the
      // worktree exists (and therefore RETAINS that worktree on a refusal, as every
      // other `failed` outcome does).
      if (!reuseDoor && directive.commit != null) {
        const available = await ensureCommitAvailable(ws.projectRoot, directive.commit, { exec });
        if (!available) {
          reportAssignmentFailure(assignmentId, "assignment-base-commit-unavailable", baseCommitUnavailableDetail(directive.commit));
          await reportSettled(assignmentId, "failed", { code: "assignment-base-commit-unavailable" });
          return;
        }
      }
      worktreePath = reuseDoor
        ? await reuseWorktreeOnBranch(ws.projectRoot, assignmentId, branch, { exec })
        : await addWorktree(ws.projectRoot, assignmentId, commitish, { exec, branch });
      // 2026-07-27 (the wrong-base dispatch) — the worker's OWN half of the
      // decision record: which base this worktree was actually built from. Rides
      // the launcher's log channel (durable sink + the control's node_logs ring),
      // so "did it run on the item's branch or fresh off main" is one
      // `aof mesh logs --node` read, never an SSH inspection. Never blocks the run.
      try {
        options.onLog?.({
          code: "worker-worktree-base",
          level: "info",
          message: `assignment ${assignmentId} (${itemRef}): worktree on ${baseBranch != null ? `EXISTING branch ${baseBranch}` : adoptedFromRemote ? `EXISTING item branch ${branch} ADOPTED from origin` : branchExists ? `EXISTING item branch ${branch}` : `fresh branch ${branch} off ${commitish}`}`,
        });
      } catch (error) {
        reportDegrade("mesh-worker-execution", error);
      }

      // ── M43 / story 05 (ADR-008) — GATE-TIME PROPAGATION, the reuse door's own half ──
      // A CALL SITE, not a block: the branch-advance mechanics live in mesh-worktree.mjs,
      // which already owns every git verb (ADR-010 R5.2 / TECH_DEBT item 10). It runs HERE
      // — after the worktree is materialized, before the agent is spawned — so the phase
      // the operator is about to get starts from the base they pinned at the gate. Safe
      // precisely because it runs at a gate: ADR-003's item lock is what makes the line
      // quiescent at this moment (the lock creates the quiet window; the advance uses it).
      if (reuseDoor && directive.commit != null) {
        // The pin's availability check at THIS door (ADR-010 R5.1 — the refusal already
        // fires for a refine; only the reuse door silently proceeded, so this removes an
        // inconsistency rather than adding a refusal). Never a silent build from a stale
        // base.
        const available = await ensureCommitAvailable(ws.projectRoot, directive.commit, { exec });
        if (!available) {
          reportAssignmentFailure(assignmentId, "assignment-base-commit-unavailable", baseCommitUnavailableDetail(directive.commit, branch));
          await reportSettled(assignmentId, "failed", { code: "assignment-base-commit-unavailable" });
          onCleanup(assignmentId, "failed", worktreePath);
          return;
        }
        const advance = await advanceBranchToBase(worktreePath, directive.commit, { exec, node: nodeId });
        // The advance's own decision record, on the SAME channel `worker-worktree-base`
        // rides, carrying the outcome (or the refusal code) and BOTH commits — so "which
        // base did this phase actually run on" stays one `aof mesh logs --node` read even
        // when the answer is "it refused". Wrapped exactly as the line above it: a faulting
        // sink degrades, it never blocks the run.
        try {
          options.onLog?.({
            code: "worker-gate-propagation",
            level: advance.code != null ? "warn" : "info",
            message: `assignment ${assignmentId} (${itemRef}): gate-propagation ${advance.code ?? advance.outcome} on ${advance.branch ?? branch} — base ${advance.base}, tip ${advance.tip}`,
          });
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
        }
        if (advance.code != null) {
          // A coded refusal settles `failed` exactly as an unavailable base commit does,
          // and RETAINS the worktree for inspection — the agent is never started on a tree
          // the advance could not safely bring up to the pinned base.
          reportAssignmentFailure(assignmentId, advance.code, gatePropagationRefusalDetail(advance, branch, worktreePath));
          await reportSettled(assignmentId, "failed", { code: advance.code });
          onCleanup(assignmentId, "failed", worktreePath);
          return;
        }
      }

      // VERIFICATION (live worktree streaming, 2026-07-25) — from HERE the agent's output
      // lands in this worktree, so from here the worker streams it. Registered the moment
      // the worktree exists (not when the run ends) so the control node sees the work AS
      // IT IS PRODUCED — uncommitted, unpushed, no branch read required. Released on every
      // settle path by the onCleanup wrapper above.
      registerActiveWorktree(assignmentId, {
        worktreePath,
        workspaceId,
        itemRef,
        projectRoot: ws.projectRoot,
        workDir: worktreeWorkDir(ws.projectRoot, ws.workDir, worktreePath),
      });

      // T3b / F4b — the ref resolves INSIDE the worktree's OWN checkout via
      // enumerate-then-filter; a traversal ref yields no item there. This is the
      // SCOPING check the security fitness pins — it does NOT decide where the run
      // record lives (below).
      const worktreeItem = await resolveRefInWorktree(ws.projectRoot, ws.workDir, worktreePath, itemRef);
      if (worktreeItem == null) {
        // A structural miss (an unresolvable/traversal ref) is a `failed` terminal —
        // task 03's retain-on-failed rule applies here too: the worktree stays for
        // inspection (never removed), the same as every other failed outcome below.
        reportAssignmentFailure(assignmentId, "assignment-ref-unresolved", `itemRef "${itemRef}" did not resolve inside the worktree at ${worktreePath}`);
        await reportSettled(assignmentId, "failed", { code: "assignment-ref-unresolved" });
        onCleanup(assignmentId, "failed", worktreePath);
        return;
      }

      // task 02 — mint a NODE-PARTITIONED run through the EXISTING run-store, against
      // the item resolved in the worker's PRIMARY checkout (ws.workDir) — the run
      // record (runs/<node>/<runId>.json) is aof's own durable bookkeeping, keyed by
      // item.dir; it must survive the worktree's own cleanup (task 03 force-removes a
      // `done` worktree) and stay discoverable via the ordinary run-status/reclaim
      // seams (task 04's reclaim scan resolves the SAME primary-checkout item). The
      // worktree above already proved the ref resolves inside its own scoped checkout
      // (T3b) — this second resolve is the SAME enumerate-then-filter resolver,
      // applied to the primary tree, never a second path-construction strategy.
      item = await findWork(ws.workDir, itemRef).then((matches) => matches.find((row) => row.ref === itemRef) ?? matches[0] ?? null);
      if (item == null) {
        reportAssignmentFailure(assignmentId, "assignment-ref-unresolved", `itemRef "${itemRef}" did not resolve in the primary checkout at ${ws.workDir}`);
        await reportSettled(assignmentId, "failed", { code: "assignment-ref-unresolved" });
        onCleanup(assignmentId, "failed", worktreePath);
        return;
      }

      const nowIso = resolveNow();
      // The mint rides the transition seam (m42 wave (d) leg d4, port 1 — the
      // sweep's second half, matching d2's completeRun sweep): `run.started` is
      // journaled beside the fact. NO `workspace` is passed, exactly as the
      // worker's completion sites pass none — worker-side projection publishing
      // stays d3's settle-assignment territory, so the publish reactor skips on a
      // null workspaceRoot and worker behaviour is byte-unchanged.
      // m43 / ADR-003 — the mint names the assignment it is running UNDER, so the
      // seam's item lock admits it BY IDENTITY (never by a "worker is exempt"
      // branch): the assignment that holds this scope is the one minting. The id is
      // already on the brief; `opts.lock` carries it plus the directive's own
      // workspaceId — never a cwd-derived one (TECH_DEBT item 4).
      ({ record: runRecord } = await transitionRunStart(
        item,
        { now: nowIso, node: nodeId, brief: { assignmentId, itemRef } },
        {
          lock: { workspaceId, byAssignment: assignmentId, globalWorkStoreOptions: globalWorkStoreOptions ?? {} },
          journalOptions: { env: globalWorkStoreOptions?.env },
        },
      ));

      // running — the worktree is materialized, the run is minted; the assignment's
      // runId is this run's id (the ADR-004 link the frame carries).
      await sendAssignmentStatus?.(assignmentId, "running", { runId: runRecord.runId });

      // 2026-07-27 (withdraw notify) — a withdrawal that arrived BEFORE the spawn:
      // never spawn a session for a run the operator already withdrew; settle the
      // just-minted record as cancelled and retain the worktree.
      if (withdrawnByControl.delete(assignmentId)) {
        try {
          await transitionRunComplete(
            item,
            { runId: runRecord.runId, outcome: "cancelled", now: resolveNow() },
            { journalOptions: { env: globalWorkStoreOptions?.env } },
          );
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
        }
        onCleanup(assignmentId, "failed", worktreePath);
        return;
      }

      // Drive the ref to a terminal state via the driver (the INJECTED spawn seam) —
      // milestone 38 / story 05, ADR-013: the directive's WHOLE command string
      // (`brief.command`) is what the interactive session types into its own PTY
      // stdin (never a `-p` prompt argv). THE INVARIANT (unchanged from the old
      // headless driver): spawnRuntime resolves only after the session has reached a
      // terminal-FOR-THIS-INVOCATION state (fully exited, OR a detected NEEDS_INPUT
      // sentinel that this invocation deliberately ends on) — cleanup below never
      // races a live child whose cwd is inside the worktree.
      const outcome = await spawnRuntime(
        { itemRef, worktreeCwd: worktreePath, task: item?.title ?? itemRef, command: directiveCommand, ...(await phaseBriefContext(itemRef, worktreeItem, directiveCommand)) },
        {
          // 63/03 (ADR-006 §4, ADR-012 §5) — the ONLY thing that differs for a loop
          // assignment. `{}` for every session-phase directive, so this bag stays
          // byte-identical to a delivered tree's; for the one phase that resolves a loop it
          // carries the composed request and the declaration the seam admits against, and
          // nothing else moves. Terminal spawn, output chunking, completion detection and
          // the withdraw/reclaim paths all sit above `{ bin, args, env }` and are untouched.
          ...launchOptions,
          driver,
          ptySpawn,
          which,
          trustWorktree,
          commandDelayMs,
          onOutputChunk,
          // 63/06 (ADR-013 §3a) — the only two forwards that may be launch-conditional; an
          // INJECTED seam still wins, so only the session-shaped DEFAULT is replaced.
          watchTranscriptSessionId: watchTranscriptSessionId ?? loopWatch?.watchTranscriptSessionId,
          watchTranscriptCompletion: watchTranscriptCompletion ?? loopWatch?.watchTranscriptCompletion,
          // 68/ADR-005 §2 (story 68/01) — the OTel spawn attribution. `phase` is read
          // from the loop's declaration (ADR-002) and this assignment-scoped brief
          // carries none, so none is passed and none is fabricated.
          attribution: buildRunAttribution(item, {
            runId: runRecord.runId,
            machineId: nodeId ?? undefined,
            worktreeId: worktreePath ? path.basename(worktreePath) : undefined,
          }),
          heartbeat: { itemDir: item.dir, runId: runRecord.runId },
          deadlinePolicy: deadlinePolicy ?? loopBoundsFromConfig(ws),
          readHeartbeatAt: readHeartbeatAt ?? (() => readConsumedHeartbeatAt(item, runRecord.runId)),
          // 2026-07-27 (withdraw notify) — the driver hands back a kill for its
          // live PTY the moment it spawns; the withdraw handler uses it to end a
          // withdrawn run instead of leaving it grinding. Registered here (the one
          // place assignmentId is in scope) and removed the moment the spawn
          // settles below.
          onPtyLive: (kill, write) => {
            livePtyKills.set(assignmentId, kill);
            // m42 interactive worker terminals — the write registers beside its
            // kill; the session binding waits for the captured id below.
            if (typeof write === "function") livePtyWrites.set(assignmentId, write);
          },
          // milestone 38 / story 06 / task 04 (BLOCKER F-38.06d; ADR-013 AMENDMENT
          // 2026-07-23, structural invariant 7) — REPORT THE JOIN KEY WHILE THE RUN
          // IS LIVE. The driver calls this the instant its transcript watch resolves
          // a session id — mid-run, ONCE, and only for a real id (a run whose
          // transcript never appears reports nothing and still degrades to null).
          // THIS is the only place the per-directive context the report needs
          // (`assignmentId`, and the runId minted just above) is in scope, so the
          // handler-level seam above is bound to it here.
          // 68/01 (ADR-005 §1) — the persist-without-racing-the-settle shape lives in
          // run-session-capture.mjs (F-09): the id lands on the run record before the
          // settle, and the up-channel below is allSettled beside it, never gating it.
          onSessionIdCaptured: captureSessionIdOnRecord({
            item,
            runId: runRecord?.runId,
            source: "mesh-worker-execution",
            onCaptured: (sessionId) => {
              // m42 interactive worker terminals — the captured id is the input
              // frame's join key: bind it to this bracket's live-PTY write so a
              // routed keystroke can reach EXACTLY this session (and nothing else).
              const write = livePtyWrites.get(assignmentId);
              if (write != null && typeof sessionId === "string" && sessionId.length > 0) {
                liveSessionInputs.set(sessionId, write);
              }
              return onSessionIdCaptured?.(sessionId, { assignmentId, runId: runRecord.runId });
            },
          }),
          // milestone 38 / story 06 / task 04 (BLOCKER F-38.06e; ADR-014 AMENDMENT
          // 2026-07-23, structural invariant 8) — forwarded VERBATIM (no per-
          // directive context is needed: the end frame routes on the (nodeId,
          // sessionId) tuple the bytes already rode, never on the assignment).
          onSessionEnd,
          // A pending question is only a detector signal here. It must not publish
          // the capacity-moving needs-input code while this callback still sits in
          // the live PTY bracket. The single publish is below, after spawnRuntime's
          // exit-confirmed needs-input outcome.
        },
      );
      // task 03 (ADR-013 amendment) — the session_id the driver resolved via its
      // transcript-dir watch (`defaultWatchTranscriptSessionId`, never a PTY-output
      // marker). A run whose transcript never appears (or whose watch was aborted
      // before one did) degrades to null here, never a crash.
      const sessionId = typeof outcome?.sessionId === "string" && outcome.sessionId.length > 0 ? outcome.sessionId : null;

      // 2026-07-27 (withdraw notify) — the spawn settled: its kill (and, m42, its
      // input write + session binding) are dead weight.
      clearLivePtyRegistries(assignmentId);
      // A withdrawal that arrived DURING the run (the handler killed the PTY):
      // settle the record as cancelled — never `failed` — and send NO status frame
      // (the row is already terminal; the control's terminal-guard would refuse
      // it). The worktree takes the retain branch, same as failed.
      if (withdrawnByControl.delete(assignmentId)) {
        try {
          await transitionRunComplete(
            item,
            { runId: runRecord.runId, outcome: "cancelled", now: resolveNow() },
            { journalOptions: { env: globalWorkStoreOptions?.env } },
          );
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
        }
        onCleanup(assignmentId, "failed", worktreePath);
        return;
      }

      // task 02 (ADR-013 invariant 4) — a `needs-input` outcome branches out BEFORE
      // completeRun is ever called: run-store's OWN closed transition table (19/
      // ADR-001) legalizes only running->done/failed/cancelled — there is no
      // running->needs-input edge, and there should not be one: the underlying run
      // genuinely IS still running (paused pending a human), so forcing a run-store
      // transition here would misrepresent that. The worktree takes the SAME
      // retain branch `failed` already does (never `removeWorktree(..., {force:true})`
      // — that call site is reached ONLY from the `done` branch below). The
      // assignment-status frame stays within the ALREADY-legal "running" state (a
      // literal "needs-input" string is not in assignment-record.mjs's OWN closed
      // ASSIGNMENT_STATE_PRODUCERS enum — sending it as `state` would risk a
      // control-side assignment-state-invalid throw on a real deployment); the
      // sentinel instead rides the frame's OPTIONAL `code` key (mirroring the
      // failure-code pattern every other frame in this system already uses),
      // alongside the captured sessionId so a human can `claude --resume` it.
      if (outcome.outcome === "needs-input") {
        // This transition releases scheduler capacity. Put it on the existing
        // durable assignment-report outbox so {sent:false} means "still owed",
        // never "parked anyway".
        await reportSettled(assignmentId, "running", { runId: runRecord.runId, sessionId, code: "needs-input" });
        onCleanup(assignmentId, "needs-input", worktreePath);
        return;
      }

      // The bracket's settle — through the transition seam, so a FAILED outcome
      // rolls the primary checkout's item back to not-started via the declared
      // reactor (the "8 call sites, exactly 1 does the rollback" disease dies
      // here) and the event survives a crash between fact and cascade.
      const { record: completed } = await transitionRunComplete(
        item,
        {
          runId: runRecord.runId,
          outcome: outcome.outcome,
          failureReason: outcome.failureReason ?? null,
          now: resolveNow(),
        },
        { journalOptions: { env: globalWorkStoreOptions?.env } },
      );

      // task 03/07 — cleanup on done, retain on failed; on a `done` AGENT outcome,
      // story 07 (ADR-015) inserts a PUSH before that cleanup can ever run. `force:true`
      // on the (eventual) done-cleanup path: the headless runtime's own work inside the
      // worktree (build artifacts, dependency installs, any file it wrote —
      // RESEARCH.md §4's node_modules-per-worktree note) is untracked content
      // `git worktree remove` (no force) refuses to delete over (RESEARCH.md §4
      // measured: "contains modified or untracked files"). A cleanly-pushed `done`
      // worktree carries no content worth a human inspecting (that is exactly the
      // `failed`/retained-push-failure job — this run's OWN bookkeeping record lives in
      // the primary checkout's runs/<node>/, per the item resolved above, so it is
      // never lost to this removal), so force is the correct, documented default here
      // — never used on either retention path below.
      if (completed.state === "done") {
        // story 07 task 01 (ADR-015 decisions 2/3, invariants 3/4) — PUSH BEFORE the
        // worktree is EVER force-removed, reusing the ADR-009 askpass shim
        // (pushWorktreeBranch above). The worktree is NOT removed until the push
        // succeeds; a FAILED push (rejected / unreachable / auth-refused) RETAINS the
        // worktree and surfaces a LOUD coded `failed` — the agent's OWN run may have
        // completed `done`, but an unpushed diff means the ASSIGNMENT is not cleanly
        // done, so the "done" status frame is sent ONLY after the push itself succeeds.
        try {
          // story 07 COMPLETION (F-38.06i) — COMMIT the agent's diff BEFORE the push can
          // carry it home. Without this the push moves nothing (the branch sits at its
          // base commit) and the worker's work stays stranded in the worktree — the
          // live-soak finding. A coded `commit-failed` is caught below exactly like a
          // failed push (loud `failed`, worktree retained). A clean worktree is a no-op.
          const directiveLabel = typeof directiveCommand === "string" && directiveCommand.length > 0 ? directiveCommand : `run ${itemRef}`;
          await commitWorktreeChanges(worktreePath, {
            message: `aof(mesh): ${itemRef} — ${directiveLabel}\n\nAutonomous worker output (assignment ${assignmentId}, run ${runRecord.runId}, node ${nodeId}).`,
            node: nodeId,
            pushExec,
          });

          let writeCredential = null;
          if (typeof requestWriteCredential === "function") {
            const resolved = await requestWriteCredential({ assignmentId, workspaceId, branch });
            writeCredential = typeof resolved === "string" && resolved.length > 0 ? resolved : null;
          }
          await pushWorktreeBranch(ws.projectRoot, worktreePath, branch, { credential: writeCredential, pushExec });
          // VERIFICATION (continue-on-existing-branch, 2026-07-25) — report the ACTUAL
          // pushed branch on the done frame so control records this item's active branch
          // (the next continue/verify reuses it). For a reused base branch this IS that
          // branch; for a refine it is the fresh per-assignment branch.
          await reportSettled(assignmentId, "done", { runId: runRecord.runId, sessionId, branch });
          await removeWorktree(ws.projectRoot, assignmentId, { exec, force: true });
          onCleanup(assignmentId, "done", worktreePath);
        } catch (pushError) {
          const code = pushError?.code ?? "push-failed";
          reportAssignmentFailure(assignmentId, code, `push of branch "${branch}" failed for assignment ${assignmentId}: ${String(pushError?.message ?? pushError)}`);
          await reportSettled(assignmentId, "failed", { runId: runRecord.runId, code, sessionId });
          onCleanup(assignmentId, "failed", worktreePath);
        }
      } else {
        await reportSettled(assignmentId, completed.state, { runId: runRecord.runId, sessionId });
        onCleanup(assignmentId, "failed", worktreePath);
      }
    } catch (error) {
      // A genuine fault mid-execution (a worktree-add failure, a run-store fault, …)
      // still streams a loud `failed` — never an unhandled crash of the worker's
      // stream loop (the never-crash discipline every mesh consumer keeps; the
      // handler is invoked fire-and-forget from the transport's message listener,
      // worker-stream-client.mjs:133, so a rethrow here would surface only as an
      // unhandled rejection, never a caught fault — swallow it after the coded
      // status is streamed).
      clearLivePtyRegistries(assignmentId); // never leak a kill/write past its bracket
      await reportSettled(assignmentId, "failed", { runId: runRecord?.runId, code: error?.code ?? "assignment-execution-failed" });
      const constructed = assignmentError("assignment-execution-failed", String(error?.message ?? error));
      reportAssignmentFailure(assignmentId, constructed.code, `${constructed.message}${error?.stack ? `\n${error.stack}` : ""}`);
    }
  };
}

// settleStrandedRunRecords(stranded, options) — 2026-07-27, the ghost-record
// family's LAST member (measured the same day, on the first daemon restart after
// the withdraw fix shipped): the startup reclaim reported a stranded assignment
// `failed/daemon-restarted` and left its run record `running` — the duplicate-run
// guard then walls the item exactly as the withdraw case did. Run-record
// settlement is part of EVERY terminal path, and this is the startup path's
// settle: for each stranded worktree, resolve its checkout, find the running run
// record minted for that assignmentId (the bracket stamps brief.assignmentId),
// and complete it failed/runtime_offline — the retryable infra classification, the
// same one the autonomous loop's own reclaim uses for a crashed host. Idempotent
// (an absent or already-terminal record is a logged no-op) and NEVER throws — a
// settle fault is reported per entry and the next entry still settles.
export async function settleStrandedRunRecords(stranded, options = {}) {
  const { globalWorkStoreOptions, now, onLog } = options;
  const resolveNow = () => (typeof now === "function" ? now() : now ?? new Date().toISOString());
  const log = (level, message) => {
    try {
      onLog?.({ code: "startup-reclaim", level, message });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };
  for (const entry of Array.isArray(stranded) ? stranded : []) {
    const assignmentId = entry?.assignmentId;
    if (typeof assignmentId !== "string" || assignmentId.length === 0) continue;
    try {
      const checkoutRoot = checkoutRootForWorktree(entry.worktreePath);
      const ws = await loadWorkspace(checkoutRoot, undefined, { env: globalWorkStoreOptions?.env });
      const items = await listItems(ws.workDir);
      let settled = false;
      for (const item of items) {
        const ghost = (await readRuns(item)).find(
          (run) => run.state === "running" && run?.brief?.assignmentId === assignmentId,
        ) ?? null;
        if (ghost == null) continue;
        await transitionRunComplete(
          item,
          { runId: ghost.runId, outcome: "failed", failureReason: "runtime_offline", now: resolveNow() },
          { journalOptions: { env: globalWorkStoreOptions?.env } },
        );
        log("info", `stranded assignment ${assignmentId}: run ${ghost.runId} settled failed/runtime_offline (daemon restarted) — the duplicate-run guard is clear`);
        settled = true;
        break;
      }
      if (!settled) log("info", `stranded assignment ${assignmentId}: no running run record to settle`);
    } catch (error) {
      log("warn", `stranded assignment ${assignmentId}: settling its run record failed: ${String(error?.message ?? error)}`);
    }
  }
}

// createMeshWorkerWithdrawHandler(options) → handler(frame) — the function
// `client.onWithdraw(handler)` registers (worker-stream-client.mjs). 2026-07-27,
// the duplicate-run wall: a control-side withdrawal must reach the HOLDER — kill
// any live session for the assignment and settle its run record as `cancelled`
// (running>cancelled is a legal transition), so the run store's duplicate-run
// guard never walls the item's future runs behind a ghost. Two cases:
//   - a LIVE session on this daemon: mark withdrawnByControl + kill the PTY; the
//     execution bracket (which owns the run record) consumes the mark and settles
//     cancelled itself — one owner per record, no race.
//   - NO live session (a parked pre-restart run, or the record simply left
//     behind): settle the record directly, resolving the workspace through the
//     SAME launch-or-scoped-checkout repoint the execution handler uses.
// Idempotent and never-throwing: an unknown assignment, an absent record, or an
// already-terminal record is a logged no-op.
export function createMeshWorkerWithdrawHandler(options = {}) {
  const { loadWs, globalWorkStoreOptions, onLog, now } = options;
  const resolveNow = () => (typeof now === "function" ? now() : now ?? new Date().toISOString());
  const log = (level, message) => {
    try {
      onLog?.({ code: "withdraw-notify", level, message });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };
  return async function handleWithdraw(frame) {
    const assignmentId = typeof frame?.assignmentId === "string" && frame.assignmentId.length > 0 ? frame.assignmentId : null;
    if (assignmentId == null) return;
    const kill = livePtyKills.get(assignmentId);
    if (kill != null) {
      withdrawnByControl.add(assignmentId);
      try {
        kill();
      } catch (error) {
        reportDegrade("mesh-worker-execution", error);
      }
      log("info", `assignment ${assignmentId}: live session killed (withdrawn by control); its bracket settles the run record as cancelled`);
      return;
    }
    const runId = typeof frame?.runId === "string" && frame.runId.length > 0 ? frame.runId : null;
    const itemRef = typeof frame?.itemRef === "string" && frame.itemRef.length > 0 ? frame.itemRef : null;
    const workspaceId = typeof frame?.workspaceId === "string" && frame.workspaceId.length > 0 ? frame.workspaceId : null;
    if (runId == null || itemRef == null || workspaceId == null) {
      log("info", `assignment ${assignmentId}: withdrawn — no run/item on the frame, nothing to settle here`);
      return;
    }
    try {
      let ws = await loadWs();
      if (workspaceId !== resolveWorkspaceId(ws)) {
        ws = await loadWorkspace(meshCheckoutPath(workspaceId, globalWorkStoreOptions ?? {}), undefined, { env: globalWorkStoreOptions?.env });
      }
      const item = await findWork(ws.workDir, itemRef).then((matches) => matches.find((row) => row.ref === itemRef) ?? matches[0] ?? null);
      if (item == null) {
        log("warn", `assignment ${assignmentId}: itemRef "${itemRef}" does not resolve here — run ${runId} not settled`);
        return;
      }
      const run = (await readRuns(item)).find((record) => record.runId === runId) ?? null;
      if (run == null) {
        log("info", `assignment ${assignmentId}: run ${runId} has no record on this worker — nothing to settle`);
        return;
      }
      if (run.state !== "running" && run.state !== "queued") {
        log("info", `assignment ${assignmentId}: run ${runId} is already ${run.state} — nothing to settle`);
        return;
      }
      await transitionRunComplete(
        item,
        { runId, outcome: "cancelled", now: resolveNow() },
        { journalOptions: { env: globalWorkStoreOptions?.env } },
      );
      log("info", `assignment ${assignmentId}: run ${runId} settled cancelled (withdrawn by control) — the duplicate-run guard is clear`);
    } catch (error) {
      log("warn", `assignment ${assignmentId}: settling run ${runId} failed: ${String(error?.message ?? error)}`);
    }
  };
}

// createMeshWorkerTerminalInputHandler(options) → handler(frame) — the function
// `client.onTerminalInput(handler)` registers (worker-stream-client.mjs). m42
// "interactive worker terminals": an operator keystroke arrives as a
// terminal-input DOWN-frame ({ sessionId, bytes }) and may write EXACTLY ONE
// thing — the live PTY whose CAPTURED session id equals the frame's sessionId
// (liveSessionInputs, bound at session-id capture, cleared at settle). Everything
// else is a drop:
//   - no live PTY bound to that session (a parked needs-input session, a settled
//     run, a foreign/garbled id) → dropped, logged ONCE per session id (a human
//     typing at a dead session would otherwise log every keystroke);
//   - a malformed frame → dropped silently (the same shape-guard posture every
//     frame handler here keeps).
// Never throws; never logs the CONTENT of the bytes (an operator's answer may be
// sensitive — codes and session ids only).
export function createMeshWorkerTerminalInputHandler(options = {}) {
  const { onLog } = options;
  const reportedMisses = new Set();
  const log = (level, message) => {
    try {
      onLog?.({ code: "terminal-input", level, message });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };
  return function handleTerminalInput(frame) {
    const sessionId = typeof frame?.sessionId === "string" && frame.sessionId.length > 0 ? frame.sessionId : null;
    const bytes = typeof frame?.bytes === "string" && frame.bytes.length > 0 ? frame.bytes : null;
    if (sessionId == null || bytes == null) return;
    const write = liveSessionInputs.get(sessionId);
    if (write == null) {
      if (!reportedMisses.has(sessionId)) {
        reportedMisses.add(sessionId);
        log("info", `terminal input for session ${sessionId}: no live PTY with that captured session on this worker — dropped (a parked needs-input session is resumed with \`claude --resume\`, not typed into)`);
      }
      return;
    }
    reportedMisses.delete(sessionId);
    try {
      const delivered = write(bytes);
      // DELIVERY BREADCRUMB (2026-07-27 live debug, retained): the one unwitnessed
      // hop — every verified layer said "delivered" while the TUI never reacted, so
      // the write itself testifies, INCLUDING which pty pid it fed (the cycle-12
      // discriminator). Content is NEVER logged (an answer may be sensitive); byte
      // count + session + pid only. Retire this with STATE's OPEN FINDING, not
      // before — it is the correlation handle a resumed investigation needs.
      log("info", `delivered ${Buffer.byteLength(String(bytes))} byte(s) to session ${sessionId}'s live PTY (pid ${delivered?.pid ?? "?"})`);
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };
}

// createMeshWorkerTerminalResumeHandler(options) → handler(frame) — the function
// `client.onTerminalResume(handler)` registers (worker-stream-client.mjs). m42
// terminal-resume, REWORKED the same day it shipped (operator: the first cut was
// a side-channel PTY re-attach that left the WHOLE system lying — row `failed`,
// board offering Continue beside a live session, no run record, presence idle).
//
// A resume is a PARKED RUN CONTINUING, so it flows through the ONE lifecycle
// everything else already reads:
//   - the existing running run record is required and CONTINUED; this surface never
//     mints (ADR-007: a needs-input park is the same run and same attempt);
//   - the assignment row receives a worker-reported `running` frame with
//     `code: "resumed"`, replacing `needs-input` so the scheduler counts it again;
//   - the session is DRIVEN by the SAME driver as any run
//     (driveInteractiveClaudeSession + `resumeSessionId`): `claude --resume`
//     KEEPS the session id (measured — it appends the SAME transcript), so the
//     identity is known at spawn and injected, never derived; the board / fleet /
//     mirror / input registry are all on the one live tuple from the first byte;
//     the needs-input lanes (live question + sentinel) work exactly as on a
//     first run; completion settles the run record AND the row (done/failed),
//     or parks needs-input with the code visible.
// The worktree is always RETAINED (this bracket does not push; a resumed
// session's committed work goes home via `aof mesh recover-push` — one door per
// act). Idempotent: an assignment with a live PTY on this daemon is a logged
// no-op, never a second session.
export function createMeshWorkerTerminalResumeHandler(options = {}) {
  const { loadWs, globalWorkStoreOptions, onLog, onOutputChunk, onSessionEnd, sendAssignmentStatus, sendTerminalResumeRefusal, sendEffectStep } = options;
  const spawnRuntime = options.spawnRuntime ?? driveInteractiveClaudeSession;
  const readRunRecords = options.readRuns ?? readRuns;
  const findWorkRecords = options.findWork ?? findWork;
  // Claim synchronously, before the first await. The live-PTY registry is filled
  // only after spawn and cannot prevent two concurrent frames from both reaching it.
  const resumeInFlight = new Set();
  const resolveNow = () => (typeof options.now === "function" ? options.now() : options.now ?? new Date().toISOString());
  const log = (level, message) => {
    try {
      onLog?.({ code: "terminal-resume", level, message });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
    }
  };
  return async function handleTerminalResume(frame) {
    const sessionId = typeof frame?.sessionId === "string" && frame.sessionId.length > 0 ? frame.sessionId : null;
    const assignmentId = typeof frame?.assignmentId === "string" && frame.assignmentId.length > 0 ? frame.assignmentId : null;
    const workspaceId = typeof frame?.workspaceId === "string" && frame.workspaceId.length > 0 ? frame.workspaceId : null;
    const itemRef = typeof frame?.itemRef === "string" && frame.itemRef.length > 0 ? frame.itemRef : null;
    const parkId = typeof frame?.parkId === "string" && frame.parkId.length > 0 ? frame.parkId : null;
    const reservedAt = typeof frame?.reservedAt === "string" && frame.reservedAt.length > 0 ? frame.reservedAt : null;
    const targetNodeId = typeof frame?.targetNodeId === "string" && frame.targetNodeId.length > 0 ? frame.targetNodeId : (typeof frame?.to === "string" && frame.to.length > 0 ? frame.to : null);
    const previousNodeId = typeof frame?.previousNodeId === "string" && frame.previousNodeId.length > 0 ? frame.previousNodeId : null;
    if (sessionId == null || assignmentId == null || workspaceId == null || itemRef == null || (reservedAt != null && parkId == null)) {
      log("warn", "terminal-resume frame dropped: missing sessionId/assignmentId/workspaceId/itemRef");
      if (assignmentId != null && reservedAt != null && targetNodeId != null && previousNodeId != null) {
        try {
          await reportTerminalResumeRefused(
            { parkId, assignmentId, reservedAt, targetNodeId, previousNodeId, code: "terminal-resume-frame-invalid", now: resolveNow() },
            {
              journalOptions: { env: globalWorkStoreOptions?.env },
              sendEffectStep,
              fallbackSend: sendTerminalResumeRefusal,
            },
          );
        } catch (error) {
          reportDegrade("mesh-worker-execution", error);
        }
      }
      return;
    }
    if (livePtyKills.has(assignmentId)) {
      log("info", `assignment ${assignmentId} already has a live session on this worker — resume is a no-op`);
      return;
    }
    if (resumeInFlight.has(assignmentId)) {
      log("info", `assignment ${assignmentId} already has a resume in flight on this worker — duplicate frame is a no-op`);
      return;
    }
    resumeInFlight.add(assignmentId);
    let runRecord = null;
    let item = null;
    const resume = createMeshParkResume({
      assignmentId,
      sessionId,
      parkId, answer: frame.answer,
      reservation: { reservedAt, targetNodeId, previousNodeId },
      globalWorkStoreOptions,
      sendAssignmentStatus,
      sendTerminalResumeRefusal,
      sendEffectStep,
      now: resolveNow,
      log,
    });
    const checkpointCrashes = async (phase) => typeof options.onResumeCheckpoint === "function"
      && await options.onResumeCheckpoint({ phase, assignmentId, parkId }) === "crash";
    try {
      // Repoint to the assignment's OWN checkout — the recovery-push handler's
      // exact resolution, so resume and recovery never drift on where "here" is.
      let ws = await loadWs();
      if (workspaceId !== resolveWorkspaceId(ws)) {
        ws = await loadWorkspace(meshCheckoutPath(workspaceId, globalWorkStoreOptions ?? {}), undefined, { env: globalWorkStoreOptions?.env });
      }
      const worktreePath = meshWorktreePath(ws.projectRoot, assignmentId);
      let worktreeExists = false;
      try { worktreeExists = (await stat(worktreePath)).isDirectory(); } catch { worktreeExists = false; }
      if (!worktreeExists) {
        log("warn", `session ${sessionId}: assignment ${assignmentId}'s worktree is gone (${worktreePath}) — nothing to resume in (a cleanly-done run removes its worktree)`);
        await resume.refuse(null, "terminal-resume-worktree-missing", "worktree is gone");
        return;
      }
      item = await findWorkRecords(ws.workDir, itemRef).then((matches) => matches.find((row) => row.ref === itemRef) ?? matches[0] ?? null);
      if (item == null) {
        log("warn", `session ${sessionId}: itemRef "${itemRef}" does not resolve in ${ws.workDir} — resume refused`);
        await resume.refuse(null, "terminal-resume-item-unresolved", "item does not resolve");
        return;
      }

      // The RUN. A needs-input park leaves ITS record `running` — the run PAUSED,
      // it never ended. Therefore this door accepts only that exact record and
      // CONTINUES it (same runId, attempt and conversation). It never mints. This
      // is also the clean rejection for a late answer: if the assignment's latest
      // run is already terminal, name that attempt in the log and start nothing.
      const runs = await readRunRecords(item);
      const assignmentRuns = runs.filter((record) => record.brief?.assignmentId === assignmentId);
      const priorRunning = assignmentRuns.find((record) => record.state === "running") ?? null;
      const otherRunning = runs.find((record) => record.state === "running" && record.brief?.assignmentId !== assignmentId) ?? null;
      if (otherRunning != null) {
        log("warn", `session ${sessionId}: item ${itemRef} already has a running record (${otherRunning.runId}) held by assignment ${otherRunning.brief?.assignmentId ?? "?"} — resume refused`);
        await resume.refuse(null, "terminal-resume-another-run-active", "another run is active");
        return;
      }
      if (priorRunning == null) {
        const latest = assignmentRuns.at(-1) ?? null;
        log(
          "warn",
          latest == null
            ? `session ${sessionId}: assignment ${assignmentId} has no parked run to resume — no attempt was started`
            : `session ${sessionId}: run ${latest.runId} is already ${latest.state} at attempt ${latest.attempt} — answer rejected; nothing resumed`,
        );
        await resume.refuse(null, "terminal-resume-run-not-running", "the reserved assignment has no running run");
        return;
      }
      if (priorRunning.sessionId != null && priorRunning.sessionId !== sessionId) {
        log("warn", `session ${sessionId}: parked run ${priorRunning.runId} belongs to conversation ${priorRunning.sessionId} at attempt ${priorRunning.attempt} — answer rejected`);
        await resume.refuse(null, "terminal-resume-session-mismatch", "the conversation does not match the parked run");
        return;
      }
      // A continued run mints nothing (and raises no run.started fact).
      runRecord = priorRunning;
      if (!await resume.claim(runRecord)) {
        log("info", `session ${sessionId}: duplicate answer for park ${parkId} is a no-op; assignment ${assignmentId} already handled it`);
        return;
      }
      if (await checkpointCrashes("after-claim")) return;
      log("info", `session ${sessionId}: continuing PAUSED run ${priorRunning.runId} at attempt ${priorRunning.attempt} (a needs-input park is the same run resuming, never a second record)`);
      // Control's correlated reservation already changed needs-input -> resumed and
      // reacquired capacity before this frame existed. Do not rewrite updated_at
      // before spawn: every pre-spawn refusal must still match that exact CAS.
      // Direct legacy callers have no such reservation, so retain their old clear.
      if (reservedAt == null) {
        await sendAssignmentStatus?.(assignmentId, "running", { runId: runRecord.runId, code: "resumed" });
      }
      if (await checkpointCrashes("after-clear")) return;

      log("info", `session ${sessionId} RESUMING (assignment ${assignmentId}, item ${itemRef}, run ${runRecord.runId}): claude --resume in ${worktreePath}`);

      if (await checkpointCrashes("before-spawn")) return;
      const outcome = await spawnRuntime(
        // A resume re-attaches to the conversation; the operator's answer (131/04), when the frame
        // carries one, is the only thing typed. Without one the driver's null-guarded write is idle.
        { itemRef, worktreeCwd: worktreePath, task: item?.title ?? itemRef, command: frame.answer?.text ?? null },
        {
          ptySpawn: options.ptySpawn,
          which: options.which,
          env: options.env,
          resumeSessionId: sessionId,
          heartbeat: { itemDir: item.dir, runId: runRecord.runId },
          deadlinePolicy: options.deadlinePolicy ?? loopBoundsFromConfig(ws),
          readHeartbeatAt: options.readHeartbeatAt ?? (async () => {
            await consumeHeartbeatQueue(item);
            return (await readRunRecords(item)).find((record) => record.runId === runRecord.runId)?.heartbeatAt ?? null;
          }),
          commandDelayMs: options.commandDelayMs,
          livenessIntervalMs: options.livenessIntervalMs,
          onOutputChunk,
          // The session id is KNOWN AT SPAWN — `claude --resume` keeps the SAME
          // session id and appends the SAME transcript (measured on the Mac
          // 2026-07-27 15:26Z: 89d1f151….jsonl growing under the resumed
          // process). The default watch looks for a NEW transcript file, which
          // never appears on a resume — capturedSessionId stayed null, every
          // output frame was dropped unroutable, and input never bound: a live
          // session, fully invisible. A KNOWN fact is not derived (m42): resolve
          // instantly with the resumed id — frames stamp from the first byte,
          // input binds at once, and the completion watch reads the RIGHT file.
          watchTranscriptSessionId: async () => sessionId,
          watchTranscriptCompletion: options.watchTranscriptCompletion,
          onPtyLive: (kill, write) => {
            resume.markProcessStarted(item, runRecord);
            livePtyKills.set(assignmentId, kill);
            if (typeof write === "function") livePtyWrites.set(assignmentId, write);
            Promise.resolve(
              sendAssignmentStatus?.(assignmentId, "running", { runId: runRecord.runId, code: "resumed" }),
            ).catch((error) => reportDegrade("mesh-worker-execution", error));
          },
          // Fires immediately with the RESUMED id (injected above) — bind input
          // and re-affirm the id on the row's running frame.
          onSessionIdCaptured: (sid) => {
            const write = livePtyWrites.get(assignmentId);
            if (write != null && typeof sid === "string" && sid.length > 0) {
              liveSessionInputs.set(sid, write);
            }
            Promise.resolve(
              sendAssignmentStatus?.(assignmentId, "running", { runId: runRecord.runId, sessionId: sid, code: "resumed" }),
            ).catch((error) => reportDegrade("mesh-worker-execution", error));
          },
          // As on a fresh run, the pending detector does not publish a park from
          // inside the live PTY bracket. The exit-confirmed outcome below does.
          onSessionEnd,
        },
      );
      await resume.observeOutcome(outcome, item, runRecord);
      clearLivePtyRegistries(assignmentId);
      const forkedSessionId = typeof outcome?.sessionId === "string" && outcome.sessionId.length > 0 ? outcome.sessionId : null;
      await resume.settleOutcome(item, runRecord, outcome, forkedSessionId);
    } catch (error) {
      clearLivePtyRegistries(assignmentId);
      await resume.handleFault(error, item, runRecord);
    } finally {
      resumeInFlight.delete(assignmentId);
    }
  };
}

// createMeshRecoveryPushHandler(options) → handler(frame) — the function
// `client.onRecoveryPush(handler)` registers (worker-stream-client.mjs). VERIFICATION
// (control-driven recovery, live two-machine soak 2026-07-25). Story 07's push-home
// runs only on the ACTIVE assignment's own `done` seam; when a worker STALLS or an
// assignment is left terminal with its diff stranded in the worktree, there is no active
// flow to push it. This handler is that missing flow: control dispatches a `recovery-push`
// DOWN-frame (carrying a freshly minted one-shot write credential) and this commits +
// pushes the assignment's OWN worktree, exactly reusing the done-path's two exported
// seams (commitWorktreeChanges + pushWorktreeBranch), then replies with the result.
//
// It resolves the SAME projectRoot the assignment ran under — this worker's own
// workspace, or the scoped foreign checkout at meshCheckoutPath(workspaceId) — mirroring
// the driver's own repoint (:1806-1816), so the worktree/branch it acts on are byte-for-
// byte the ones the assignment created. Every collaborator is INJECTED (the same idiom
// as createMeshWorkerExecutionHandler):
//   loadWs, nodeId, exec, pushExec, globalWorkStoreOptions — as in the driver above.
//   sendRecoveryPushResult(assignmentId, { ok, code, branch }) — the worker-stream-client
//                                      UP-reply emitter; tests inject a recorder.
//
// Never throws (the never-crash discipline — a fault is reported as a `recovery-push-result`
// { ok:false, code }, never an unhandled rejection out of the transport message listener).
export function createMeshRecoveryPushHandler(options = {}) {
  const {
    loadWs = () => loadWorkspace(process.cwd()),
    nodeId,
    sendRecoveryPushResult,
    exec, // reserved for symmetry with the driver's worktree seam; the push uses pushExec
    pushExec,
    globalWorkStoreOptions,
  } = options;
  void exec;

  return async (frame) => {
    const assignmentId = typeof frame?.assignmentId === "string" && frame.assignmentId.length > 0 ? frame.assignmentId : null;
    const itemRef = typeof frame?.itemRef === "string" && frame.itemRef.length > 0 ? frame.itemRef : null;
    const workspaceId = typeof frame?.workspaceId === "string" && frame.workspaceId.length > 0 ? frame.workspaceId : null;
    const branch = typeof frame?.branch === "string" && frame.branch.length > 0
      ? frame.branch
      : (itemRef != null ? meshItemBranchName(itemRef) : null);
    const credential = typeof frame?.credential === "string" && frame.credential.length > 0 ? frame.credential : null;

    if (assignmentId == null || branch == null) {
      if (assignmentId != null) await sendRecoveryPushResult?.(assignmentId, { ok: false, code: "recovery-push-frame-invalid" });
      return;
    }

    try {
      // Repoint to the assignment's OWN checkout (own workspace vs scoped foreign clone),
      // the SAME resolution the driver performs before it ever touches a worktree.
      let ws = await loadWs();
      const ownWorkspaceId = resolveWorkspaceId(ws);
      if (workspaceId != null && workspaceId !== ownWorkspaceId) {
        const checkoutPath = meshCheckoutPath(workspaceId, globalWorkStoreOptions ?? {});
        ws = await loadWorkspace(checkoutPath, undefined, { env: globalWorkStoreOptions?.env });
      }
      const projectRoot = ws.projectRoot;
      const worktreePath = meshWorktreePath(projectRoot, assignmentId);

      // The worktree must still be on disk — a cleanly-`done` assignment force-removed
      // it, so there is nothing to recover (a clear coded result, never a crash).
      let worktreeExists = false;
      try { worktreeExists = (await stat(worktreePath)).isDirectory(); } catch { worktreeExists = false; }
      if (!worktreeExists) {
        await sendRecoveryPushResult?.(assignmentId, { ok: false, code: "recovery-worktree-missing", branch });
        return;
      }

      // COMMIT the stranded diff (a no-op if the agent/operator already committed), then
      // PUSH — the EXACT two seams the done-path uses, so recovery and the normal path
      // never drift. A commit-failed / push-failed throws a coded error, reported below.
      await commitWorktreeChanges(worktreePath, {
        message: `aof(mesh): ${itemRef ?? assignmentId} — recovery push\n\nControl-driven recovery of stranded worker output (assignment ${assignmentId}, node ${nodeId}).`,
        node: nodeId,
        pushExec,
      });
      await pushWorktreeBranch(projectRoot, worktreePath, branch, { credential, pushExec });
      await sendRecoveryPushResult?.(assignmentId, { ok: true, branch });
    } catch (error) {
      const code = error?.code ?? "recovery-push-failed";
      logAssignmentFailure(assignmentId, code, `recovery push of branch "${branch}" failed for assignment ${assignmentId}: ${String(error?.message ?? error)}`);
      await sendRecoveryPushResult?.(assignmentId, { ok: false, code, branch });
    }
  };
}
