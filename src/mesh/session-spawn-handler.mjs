// src/mesh/session-spawn-handler.mjs — the WORKER-SIDE session-spawn handler
// (milestone 50 / story 03; ADR-003 + ADR-004, as amended by ADR-007).
//
// A SIBLING to mesh-worker-execution.mjs, NEVER an extension of it. That module is
// the widest hub in src/ (47 dependents) and is entangled with the ASSIGNMENT
// lifecycle — worktree + run record + state machine + terminal reports. A bare
// session has NONE of that: no assignmentId, no run, no phase, no settle. So this
// module does not import it (task 00's locked scenario asserts exactly that), and
// mesh-worker-execution.mjs is not edited by this story.
//
// WHAT A LAUNCHED SESSION ACTUALLY IS (ADR-007, the operator's ruling — it
// SUPERSEDES ADR-003 decision 2's `resolveProvider` bullet). ADR-003 contradicted
// itself: it asked for `resolveProvider(assistant)` (spawn the Claude/Codex CLI) and
// then justified full ambient env inheritance because "this is an operator shell, not
// a sandboxed agent". The operator ruled for the SHELL reading, which is also what
// SPEC's "a bare shell" and task 00's locked scenario ("the PTY's shell is the system
// default (not a claude/codex CLI)") say. Consequences, all load-bearing:
//   - the PTY runs `process.env.ComSpec` on win32 / `process.env.SHELL` on POSIX;
//   - `terminal-providers.mjs` is NOT imported here and `resolveProvider` is NOT on
//     the spawn path — the spawn goes through `createTerminalSpawn(loadNodePty)`'s
//     `spawnWithLoader(bin, args, options)`, which takes the binary from US;
//   - `assistant` still rides the wire frame and is still the THIRD component of the
//     m48 session key — as a LABEL (which lane of the grid this renders in), never as
//     a spawn instruction. ADR-002's frame shape and ADR-004's key are unchanged.
//   - An operator who wants an assistant types its name into the shell (m03/ADR-006's
//     "the board types a command into a PTY" idiom).
//
// REGISTRATION IS THE ORDINARY ONE (ADR-004). `startSession`/`pingSession`/
// `endSession` from mesh-session.mjs — the SAME API every hook-fired session uses, the
// SAME 7-key record, the SAME TTL, the SAME reaper backstop. There is no
// `launcherSession` type and no flag: "a launcher that produces a second class of
// session defeats its own purpose" (SPEC). The presence ticker picks the record up
// within one cadence with no extra wiring.
//
// TWO COLLABORATORS ARE INJECTED RATHER THAN IMPORTED, and the reason is structural,
// not stylistic: `workerHasRepo` and `meshCheckoutPath` both live IN
// mesh-worker-execution.mjs, which task 00 forbids this module from importing. They
// are the ONE repo-availability check and the ONE scoped-checkout seam on this
// machine (fitness acd-worker-clone-target-scoped pins the latter), so re-implementing
// either here would create exactly the second, drifting spelling those seams exist to
// prevent. The launcher — which already imports that module — supplies both as
// LITERAL keys at the production call site (the F12 discipline every other worker seam
// there follows). Absent, this handler FAILS CLOSED: no check means not available.
import path from "node:path";
import { existsSync } from "node:fs";
// ADR-007 decision 2's three imports: the PTY factory, the worktree seam, the session
// API. `terminal-providers.mjs` is deliberately NOT among them.
import { createTerminalSpawn, loadNodePty } from "../terminal-ws.mjs";
import { addSessionWorktree, meshSessionWorktreePath, sessionWorktreeSlug, findItemWorktree } from "./worktree.mjs";
import { startSession, pingSession, endSession } from "./session.mjs";
// The canonical workspace loader + id resolver (the SAME pair mesh-worker-execution's
// own foreign-workspace repoint uses) — leaves, importable, no cycle.
import { loadWorkspace } from "../work.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
// m42 item 3 — every swallowed fault reports a coded degrade event, never silence.
import { reportDegrade } from "../degrade.mjs";

// The DOCUMENTED ping cadence (ADR-004 decision 2). Exported so a test asserts the
// constant rather than a duplicated literal, and so the 30s/120s-TTL relationship
// (four ping windows inside one TTL) has one home.
export const SESSION_PING_INTERVAL_MS = 30_000;

// The REAL PTY spawner — `createTerminalSpawn(loadNodePty)`, the SAME factory
// terminal-ws.mjs's own /ws/terminal route and mesh-worker-execution's assignment
// driver spawn through. The node-pty load happens INSIDE the call (never at this
// module's top level), so importing this module never needs the native addon and a
// missing/unloadable sidecar can never crash worker startup — it surfaces as this
// story's `session-spawn-failed` instead.
const defaultPtySpawn = createTerminalSpawn(loadNodePty);

// resolveDefaultShell(env, platform) — ADR-007 decision 1, the whole spawn-target
// rule in one pure function. `ComSpec` is Windows' own name for the operator's
// command processor and is present in every normal Windows environment; `SHELL` is
// POSIX's. Each falls back to the platform's universal floor so a stripped
// environment still opens a shell rather than failing the spawn. Exported so the
// rule is testable directly on both platforms from either one.
export function resolveDefaultShell(env = process.env, platform = process.platform) {
  if (platform === "win32") {
    const comspec = env?.ComSpec ?? env?.COMSPEC;
    return typeof comspec === "string" && comspec.length > 0 ? comspec : "cmd.exe";
  }
  const shell = env?.SHELL;
  return typeof shell === "string" && shell.length > 0 ? shell : "/bin/bash";
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

// resolveSessionWorktree(projectRoot, itemRef, options) — WHICH TREE DOES `itemRef` OPEN?
//
// THREE DOORS, IN THIS ORDER (the operator's ruling of 2026-08-14). The reason an operator
// attaches an item ref is to LOOK AT — or unstick — that item's work, so the shell opens
// in the item's LIVE work tree wherever one exists. A fresh detached tree at HEAD shows
// them none of it, which is the defect this order exists to fix.
//
//   (1) THE ASSIGNMENT LANE'S TREE FOR THE ITEM, when one is checked out. Located as a
//       GIT-LEVEL FACT — `findItemWorktree` matches `git worktree list --porcelain`'s
//       entry on `refs/heads/aof/mesh/<ref>` (m42's one derivable line per item, which
//       every dispatch is checked out on) — never by a directory name and never by a
//       store lookup. The lookup is BEST-EFFORT: a git fault here is reported and falls
//       to door 2, because a checkout that cannot be listed is a checkout with no live
//       tree to find, and refusing the session would deny the fallback that still works.
//
//       *** THIS IS A DELIBERATE SHARED WORKING TREE. *** The operator's shell then shares
//       a working tree AND an index with a possibly-running agent: their `git checkout`,
//       their staged file, their `npm install` are all visible to it, and its edits are
//       visible to them. That is the intended trade — it is exactly what "give me a
//       terminal on item 50" means, and a private copy would make the terminal useless for
//       the thing it is opened for. It is recorded here so it stays a decision rather than
//       becoming a surprise.
//
//   (2) AN EXISTING SESSION-OWNED TREE at the item's key, reused AS-IS with no git call.
//       CAVEAT, and it is a real one: because `existsSync` short-circuits, a second session
//       on the same item lands on the commit this tree was DETACHED AT WHEN IT WAS FIRST
//       CREATED — it is never refreshed, never fast-forwarded, and can be arbitrarily far
//       behind. (Door 1 has no such caveat: a live assignment tree is wherever its agent
//       has moved it.)
//
//   (3) A FRESH SESSION-OWNED TREE, `addSessionWorktree` detached at HEAD, under the
//       session lane's OWN root (`.aof/mesh/session-worktrees/`, never the assignment
//       lane's — TECH_DEBT item 47).
//
// Throws only when door 3's `git worktree add` genuinely failed AND left nothing usable;
// the caller turns that into `session-worktree-failed`.
async function resolveSessionWorktree(projectRoot, itemRef, options = {}) {
  // Door 1 — the item's live assignment tree.
  try {
    const live = await findItemWorktree(projectRoot, itemRef, { exec: options.exec });
    if (live != null && existsSync(live)) return live;
  } catch (error) {
    reportDegrade("mesh-session-spawn-handler", error);
  }

  // Doors 2 and 3 — the session lane's own tree, resolved or created.
  const worktreePath = meshSessionWorktreePath(projectRoot, itemRef);
  if (existsSync(worktreePath)) return worktreePath;
  try {
    return await addSessionWorktree(projectRoot, itemRef, options.commitish ?? "HEAD", { exec: options.exec });
  } catch (error) {
    // TWO SESSIONS ON ONE ITEM, LAUNCHED IN THE SAME MOMENT (the design's HEADLINE case —
    // "what an operator opening a second terminal expects"), both saw `existsSync ===
    // false` and both ran `git worktree add`. One wins; the loser's git exits non-zero
    // with "already exists" and used to be refused `session-worktree-failed`. But the
    // postcondition door 2 tests is now TRUE, and it is the same rule one microsecond
    // later: a tree is at the key's path, so this session RESOLVES to it — sharing the
    // worktree is the outcome both callers asked for. A genuine add failure (a bad base,
    // a broken repo) creates nothing, so `existsSync` stays false and the throw stands.
    if (existsSync(worktreePath)) {
      reportDegrade("mesh-session-spawn-handler", error);
      return worktreePath;
    }
    throw error;
  }
}

// createMeshWorkerSessionSpawnHandler(options) → handleSessionSpawn(frame)
//
// The function `client.onSessionSpawn(handler)` registers (worker-stream-client.mjs,
// story 01). Every collaborator is injected, in the idiom
// `createMeshWorkerExecutionHandler` established:
//   loadWs()                 — () => Promise<workspace>, this worker's OWN launch
//                              workspace (the launcher wires `() => ws`).
//   nodeId                   — this worker's stable id; the FIRST session-key part.
//   workerHasRepo(ws, workspaceId, nodeId, opts)
//                            — THE repo-availability check, injected (see the header).
//                              Absent → every spawn refuses `session-repo-unavailable`.
//   meshCheckoutPath(workspaceId, opts)
//                            — THE scoped-checkout seam, injected (see the header).
//                              Absent → a FOREIGN workspace refuses; this worker's own
//                              workspace still spawns (its projectRoot IS its repo).
//   sendTerminalFrame(sessionId, bytes) / sendTerminalEnd(sessionId)
//                            — the existing cross-machine terminal leg (ADR-014). The
//                              end marker rides the SAME terminal-frame kind with
//                              `end: true` inside `signal`; no new transport.
//   sendSessionSpawnAck({ sessionId, ok, code })
//                            — ADR-002 decision 6's diagnostic UP-frame.
//   ptySpawn(bin, args, opts) — the injected spawn seam (default `defaultPtySpawn`).
//   exec                     — the injected git exec threaded into addWorktree.
//   now / setIntervalImpl / clearIntervalImpl / pingIntervalMs
//                            — the clock and ticker seams, so the 30s cadence is a
//                              fact of the test rather than of wall time.
//   env / platform           — the ambient environment the PTY inherits (ADR-003:
//                              FULL inheritance — an operator shell, not a sandbox)
//                              and the platform whose default shell is resolved.
//
// The returned handler NEVER throws (the never-crash receive-lane discipline every
// frame handler on this client keeps) and carries TWO properties:
//   handler.handleTerminalInput(frame) → boolean
// the input lane for the PTYs THIS handler owns. It returns `true` when it wrote (so
// the launcher can fall through to the assignment input handler otherwise);
//   handler.stopAll() → Promise
// the GRACEFUL-SHUTDOWN door the launcher's own stop() calls (see below).
// Both are properties rather than a module-level registry on purpose: the live-PTY map
// stays per-handler, so nothing leaks between two handlers (or two tests) and there is no
// module-global mutable state to reset.
export function createMeshWorkerSessionSpawnHandler(options = {}) {
  const {
    loadWs,
    nodeId,
    workerHasRepo,
    meshCheckoutPath,
    sendTerminalFrame,
    sendTerminalEnd,
    sendSessionSpawnAck,
    ptySpawn = defaultPtySpawn,
    exec,
    openStore,
    globalWorkStoreOptions,
    now,
    onLog,
    pingIntervalMs = SESSION_PING_INTERVAL_MS,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
    env = process.env,
    platform = process.platform,
    loadWorkspaceImpl = loadWorkspace,
  } = options;

  // sessionId → { write, halt, settle } for every PTY this handler currently owns.
  const liveSessions = new Map();

  // …and the OTHER half of the idempotency guard: sessionIds whose spawn is IN FLIGHT.
  //
  // WHY A SECOND SET EXISTS (measured 2026-08-14). `liveSessions` is only populated after
  // FIVE awaits — loadWs, workerHasRepo, resolveSessionWorktree, ptySpawn, startSession —
  // and the launcher dispatches this handler FIRE-AND-FORGET, so two frames arriving in
  // one tick both passed a `liveSessions.has()` check that could not yet be true:
  //
  //     PTYs spawned for ONE sessionId (concurrent): 2
  //     acks: [{"sessionId":"s1","ok":true},{"sessionId":"s1","ok":true}]
  //     ping intervals armed: 2  cleared: 0
  //     input claimed: true -> pty0 writes: 0  pty1 writes: 1
  //
  // The loser's PTY is then ORPHANED — unreachable for input, still bridging its output
  // onto the same sessionId (two shells interleaved in one view), and its still-armed 30s
  // interval keeps calling `pingSession`, which UPSERTS: the record is resurrected every
  // 30 seconds forever, after the reachable PTY's exit already ended it. A permanent grid
  // slot for a session nobody can reach or kill.
  //
  // A check-then-act guard across five awaits defends only the case that cannot happen (a
  // duplicate arriving after everything settled) and fails both cases the guard's own
  // rationale names — "a control retry, a duplicated relay envelope". So the id is
  // RESERVED SYNCHRONOUSLY, before the first await, and released on every exit path.
  const pendingSessions = new Set();

  // (projectRoot, item) → the IN-FLIGHT worktree resolve for that item.
  //
  // The design's headline case is TWO SESSIONS ON ONE ITEM SHARING ONE WORKTREE — "what
  // an operator opening a second terminal expects" — and it is precisely what broke when
  // they were opened quickly: both saw `existsSync === false`, both ran `git worktree
  // add`, and one was refused `session-worktree-failed`. Measured:
  //   [{s-b, ok:false, code:"session-worktree-failed"}, {s-a, ok:true}]
  //
  // `resolveSessionWorktree` tolerates a lost race AFTER the fact (see its own note), and
  // that half is what covers a race against ANOTHER process. But within THIS process the
  // race need not happen at all, and tolerating it is strictly weaker: git registers a
  // worktree's admin metadata BEFORE it creates the directory, so a loser can arrive in
  // the window where neither the add nor the postcondition holds. One handler serves
  // every launched session on this worker (the launcher builds exactly one), so the
  // second arrival AWAITS THE FIRST'S RESOLVE and gets its answer — one `git worktree
  // add`, one tree, both shells in it. The entry is dropped when the resolve settles, so
  // a later session takes the ordinary `existsSync` fast path.
  const worktreeResolves = new Map();

  // resolveSessionWorktreeOnce(...) — the coalescing door in front of the resolver. Every
  // concurrent arrival for the SAME (checkout, item) shares ONE resolve, including its
  // failure: if the add genuinely fails, both sessions are refused for the same stated
  // reason, which is the honest answer rather than a second doomed attempt.
  const resolveSessionWorktreeOnce = (projectRoot, itemRef, options) => {
    const key = `${projectRoot} ${sessionWorktreeSlug(itemRef)}`;
    const inflight = worktreeResolves.get(key);
    if (inflight != null) return inflight;
    const pending = resolveSessionWorktree(projectRoot, itemRef, options).finally(() => {
      worktreeResolves.delete(key);
    });
    worktreeResolves.set(key, pending);
    return pending;
  };

  const resolveNow = () => (typeof now === "function" ? now() : now);

  const log = (level, message) => {
    try {
      onLog?.({ code: "session-spawn", level, message });
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
    }
  };

  // The ack is best-effort by contract (ADR-002 decision 6: purely diagnostic, the
  // control does not persist it and the fleet face does not wait for it) — a transport
  // fault here must never change what the worker actually did.
  const ack = async (sessionId, ok, code) => {
    try {
      await sendSessionSpawnAck?.({ sessionId, ok, code });
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
    }
  };

  const refuse = async (sessionId, code, message) => {
    log("warn", `session ${sessionId ?? "<no id>"}: ${code} — ${message}`);
    await ack(sessionId, false, code);
  };

  // handleSessionSpawn(frame) — THE GUARD, and nothing else, so that everything it
  // guards is unmistakably behind it. Every statement here is SYNCHRONOUS up to and
  // including the reservation: the first `await` in this function is the one inside the
  // refusal that has already decided not to spawn.
  async function handleSessionSpawn(frame) {
    const sessionId = nonEmptyString(frame?.sessionId);

    // A frame with no session id has no address to ack on and no key to register
    // under — dropped, exactly like every other malformed frame on this client.
    if (sessionId == null) return;

    // Task 03's idempotency: FIRST, before any work — and the reservation is what makes
    // "first" true under concurrency (see `pendingSessions` above). A re-dispatched
    // directive (a control retry, a duplicated relay envelope, two frames in ONE tick)
    // must not open a second PTY on the same routable address — the existing/in-flight
    // session is kept and the duplicate refused.
    if (liveSessions.has(sessionId) || pendingSessions.has(sessionId)) {
      await refuse(sessionId, "session-already-active", "a PTY is already live for this session id on this node, or a spawn for it is already in flight");
      return;
    }
    pendingSessions.add(sessionId);
    try {
      await spawnSession(sessionId, frame);
    } finally {
      // RELEASED ON EVERY PATH — every refusal, every throw, and the success path too
      // (where `liveSessions` has already taken over the reservation before this runs).
      pendingSessions.delete(sessionId);
    }
  }

  async function spawnSession(sessionId, frame) {
    const workspaceId = nonEmptyString(frame?.workspaceId);
    // ADR-007 decision 3 — a LABEL. It selects the session key's third component (and
    // therefore which lane of the grid this renders in); it selects no binary.
    const assistant = nonEmptyString(frame?.assistant) ?? "claude";
    const itemRef = nonEmptyString(frame?.itemRef);

    if (workspaceId == null) {
      await refuse(sessionId, "session-repo-unavailable", "the directive names no workspace");
      return;
    }

    let ws;
    try {
      ws = await loadWs();
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
      await refuse(sessionId, "session-repo-unavailable", `this worker's own workspace could not be loaded: ${String(error?.message ?? error)}`);
      return;
    }

    // THE REPO GUARD, before any worktree or PTY. Same check, same options bag, same
    // meaning as the assignment path's — injected, never re-implemented.
    let hasRepo = false;
    try {
      hasRepo = typeof workerHasRepo === "function"
        ? await workerHasRepo(ws, workspaceId, nodeId, { openStore, globalWorkStoreOptions })
        : false;
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
      hasRepo = false;
    }
    if (!hasRepo) {
      await refuse(sessionId, "session-repo-unavailable", `workspace ${workspaceId} is not available on node ${nodeId}`);
      return;
    }

    // A FOREIGN workspace's repo lives at the scoped checkout seam, never at this
    // daemon's launch cwd — the same repoint the assignment path makes (and the same
    // defect it exists to prevent: opening a shell in the WRONG repo off a
    // correct-looking directive).
    if (workspaceId !== resolveWorkspaceId(ws)) {
      if (typeof meshCheckoutPath !== "function") {
        await refuse(sessionId, "session-repo-unavailable", `workspace ${workspaceId} is not this node's own workspace and no scoped-checkout seam is wired`);
        return;
      }
      const checkoutPath = meshCheckoutPath(workspaceId, globalWorkStoreOptions ?? {});
      try {
        ws = await loadWorkspaceImpl(checkoutPath, undefined, { env: globalWorkStoreOptions?.env });
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
        await refuse(sessionId, "session-repo-unavailable", `the scoped checkout for workspace ${workspaceId} at ${checkoutPath} could not be loaded: ${String(error?.message ?? error)}`);
        return;
      }
    }

    // cwd: the checkout root, or the item's worktree when the directive names one.
    let cwd = ws?.projectRoot ?? null;
    if (itemRef != null) {
      try {
        cwd = await resolveSessionWorktreeOnce(ws.projectRoot, itemRef, { exec });
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
        await refuse(sessionId, "session-worktree-failed", `a worktree for item ${itemRef} could not be resolved or created: ${String(error?.message ?? error)}`);
        return;
      }
    }

    // THE SPAWN (ADR-007 decision 1). The operator's default shell, full ambient env.
    // Both failure modes this story recognises land in ONE catch: the node-pty native
    // module failing to load (the loader runs inside spawnWithLoader) and pty.spawn
    // itself throwing.
    const shell = resolveDefaultShell(env, platform);
    let term;
    try {
      term = await ptySpawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd,
        env,
      });
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
      await refuse(sessionId, "session-spawn-failed", `the PTY did not open: ${String(error?.message ?? error)}`);
      return;
    }
    if (term == null) {
      await refuse(sessionId, "session-spawn-failed", "the PTY spawner returned no terminal");
      return;
    }

    const killTerm = () => {
      try {
        term.kill?.();
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
    };

    // REGISTER IMMEDIATELY on a successful spawn (ADR-004 decision 1). The record is
    // byte-identical in schema to a hook-registered one; `repo` uses the canonical
    // `config.name` the workspace registry/descriptor themselves store, falling back to
    // the checkout's directory name so the field is never empty.
    const sessionKey = { nodeId, workspaceId, assistant, sessionId };
    const repo = nonEmptyString(ws?.config?.name) ?? (ws?.projectRoot != null ? path.basename(ws.projectRoot) : null);
    try {
      // `relaying: true` — 50/ADR-008 decision 8. THE WORKER STATES IT, AND ONLY THE
      // WORKER: this handler bridges the PTY's output up this node's stream (the
      // `sendTerminalFrame` seam below), which is exactly what the field means. The
      // control neither writes nor infers it for another node — a fact about a process on
      // another machine is stated where it is known, never guessed where it is read.
      await startSession(ws, { ...sessionKey, repo, relaying: true, now: resolveNow() });
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
      // A live PTY nobody can see or reach is worse than no PTY: kill it and fail
      // honestly rather than leaving an unaddressable process behind.
      killTerm();
      await refuse(sessionId, "session-spawn-failed", `the session record could not be written: ${String(error?.message ?? error)}`);
      return;
    }

    // TTL refresh for the PTY's lifetime (ADR-004 decision 2), on the SAME TTL window
    // every other session lives under. A ping fault is reported and swallowed — a
    // transient store fault must not tear down a live terminal; the TTL reaper is the
    // backstop if pings genuinely stop.
    // The callback RETURNS its promise: `setInterval` ignores a return value, so
    // production is unchanged, and a test driving an injected ticker can await the
    // ping it just fired instead of racing it.
    const pingHandle = setIntervalImpl(
      () => Promise.resolve()
        // …and EVERY ping re-states it (50/ADR-008 decision 8). `pingSession` is sticky, so
        // this is belt and braces rather than the mechanism — but a ping that states the
        // fact is what makes a mid-session record rebuild (a crash-recovered upsert with
        // no prior record on disk) still land `relaying: true` instead of demoting a live
        // pane the operator is typing into.
        .then(() => pingSession(ws, { ...sessionKey, repo, relaying: true, now: resolveNow() }))
        .catch((error) => reportDegrade("mesh-session-spawn-handler", error)),
      pingIntervalMs,
    );

    let dataSub = null;
    let exitSub = null;
    let settled = false;

    // release() — the SYNCHRONOUS half of settling: the timer, the subscriptions, the
    // registry entry, the PTY reference. Split out of `settle` (rather than living
    // inside it) for ONE reason, and it is the shutdown path: `stopAll` below must leave
    // the event loop free BEFORE it yields, and an `await` between two sessions' teardown
    // would leave the second one's 30s interval armed until a microtask that a dying
    // daemon may never run. Idempotent by construction — clearing a cleared handle,
    // disposing a nulled subscription and deleting an absent key are all no-ops.
    const release = () => {
      try {
        clearIntervalImpl(pingHandle);
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
      // Release every reference to the PTY: the subscriptions first (so a late chunk
      // from a dying process cannot ride a stream the control has already been told
      // ended), then the registry entry (so input can never reach a dead PTY, and so
      // the same sessionId is spawnable again).
      try {
        dataSub?.dispose?.();
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
      try {
        exitSub?.dispose?.();
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
      dataSub = null;
      exitSub = null;
      liveSessions.delete(sessionId);
      term = null;
    };

    // ONE settle point, idempotent: whichever of onExit / a later fault / stopAll gets
    // here first does all of it, and a second call is a no-op.
    // sendEnd() — the stream's end marker, sent AT MOST ONCE however this session ends.
    //
    // It is separable from `settle` for one reason, and it is the graceful-shutdown path:
    // `sendTerminalEnd` delivers only while the worker's stream client reports itself
    // CONNECTED, and it checks that synchronously on entry — while the launcher's stop()
    // stops that client in the same synchronous block in which it calls `stopAll` below.
    // A marker invoked from settle's async tail on that path is therefore a marker
    // DROPPED, and the fleet keeps a dead session's last frame on screen with nothing to
    // say it ended. So `halt()` fires it synchronously, and `settle` — the ordinary
    // PTY-exit path, where the record is removed first exactly as before — finds it
    // already sent and does not repeat it.
    let endSent = false;
    const sendEnd = () => {
      if (endSent) return undefined;
      endSent = true;
      try {
        return sendTerminalEnd?.(sessionId);
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
        return undefined;
      }
    };

    const settle = async () => {
      if (settled) return;
      settled = true;
      release();
      try {
        await endSession(ws, sessionKey);
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
      try {
        await sendEnd();
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
      log("info", `session ${sessionId}: PTY exited — session record removed and the stream's end marker sent`);
    };

    liveSessions.set(sessionId, {
      write: (bytes) => {
        term.write(String(bytes));
        return { pid: term.pid ?? null };
      },
      // halt() — the SYNCHRONOUS shutdown half: kill the child, release every handle,
      // and get the stream's end marker onto the socket while it is still up (see
      // sendEnd). Ordered kill-then-release because `release` nulls `term`, which
      // `killTerm` reads. The returned send promise is handed back so the caller can
      // await it with the rest of the teardown.
      halt: () => {
        killTerm();
        release();
        return sendEnd();
      },
      settle: () => settle(),
    });

    // The output bridge: every chunk rides the EXISTING terminal-frame wire under
    // this session's own id, in the order the PTY emitted it. Best-effort and
    // fire-and-forget by construction (sendTerminalFrame sends only on a live socket,
    // swallows faults, and never touches the reconnect bookkeeping) — a live PTY must
    // never be able to thrash the worker's stream state.
    dataSub = term.onData?.((chunk) => {
      try {
        Promise.resolve(sendTerminalFrame?.(sessionId, String(chunk))).catch((error) => reportDegrade("mesh-session-spawn-handler", error));
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
    });
    exitSub = term.onExit?.(() => {
      settle().catch((error) => reportDegrade("mesh-session-spawn-handler", error));
    });

    log("info", `session ${sessionId}: ${shell} opened in ${cwd} (workspace ${workspaceId}, assistant label "${assistant}")`);
    await ack(sessionId, true);
  }

  // The input lane for the PTYs THIS handler owns. Returns true iff it wrote, so the
  // launcher's one `onTerminalInput` registration can try this first and fall through
  // to the assignment input handler for everything else. Never throws; never logs the
  // CONTENT of the bytes (an operator's keystrokes may be sensitive — ids and byte
  // counts only), exactly like the assignment lane it sits beside.
  handleSessionSpawn.handleTerminalInput = function handleTerminalInput(frame) {
    const sessionId = nonEmptyString(frame?.sessionId);
    const bytes = nonEmptyString(frame?.bytes);
    if (sessionId == null || bytes == null) return false;
    const session = liveSessions.get(sessionId);
    if (session == null) return false;
    try {
      const delivered = session.write(bytes);
      log("info", `delivered ${Buffer.byteLength(String(bytes))} byte(s) to launched session ${sessionId}'s PTY (pid ${delivered?.pid ?? "?"})`);
      return true;
    } catch (error) {
      reportDegrade("mesh-session-spawn-handler", error);
      return true;
    }
  };

  // stopAll() — THE GRACEFUL-SHUTDOWN DOOR, called by mesh-launcher.mjs's own stop().
  //
  // WHY IT HAS TO EXIST. Until it did, `stop()` could reach a launched session's PTY, its
  // 30s `setInterval` and its session record through NOTHING: the handler was a bare
  // function with one attached property, and the launcher held no other reference. On
  // SIGTERM with a launched shell open, the armed interval — never `.unref()`'d — kept
  // the event loop alive, so the daemon did not exit; the shell was orphaned; and the
  // record lived to TTL. ADR-004 decision 3 names the reaper as the backstop for a
  // CRASHED handler; this is a GRACEFUL shutdown, and it deserves a clean path rather
  // than the crash backstop.
  //
  // THE SYNCHRONOUS HALF RUNS FIRST, FOR ALL SESSIONS, BEFORE THIS FUNCTION YIELDS —
  // every child killed, every timer cleared, every end marker on the socket. That
  // ordering is the whole point: a caller that never awaits the returned promise (stop()
  // is synchronous by contract) still gets a free event loop and a control that was told
  // each stream ended, inside its own call. Only the record-removal tail is deferred; it
  // runs for every session in parallel, and a fault in one never blocks another.
  handleSessionSpawn.stopAll = function stopAll() {
    const entries = [...liveSessions.values()];
    const halted = [];
    for (const entry of entries) {
      try {
        halted.push(entry.halt());
      } catch (error) {
        reportDegrade("mesh-session-spawn-handler", error);
      }
    }
    const settled = entries.map((entry) => {
      try {
        return Promise.resolve(entry.settle());
      } catch (error) {
        return Promise.reject(error);
      }
    });
    return Promise.all(
      [...halted, ...settled].map((pending) =>
        Promise.resolve(pending).catch((error) => reportDegrade("mesh-session-spawn-handler", error)),
      ),
    );
  };

  return handleSessionSpawn;
}
