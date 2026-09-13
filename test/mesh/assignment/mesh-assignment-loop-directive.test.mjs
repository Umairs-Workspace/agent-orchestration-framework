// test/mesh/assignment/mesh-assignment-loop-directive.test.mjs — milestone 63 / story 03
// (`a-mesh-assignment-resolves-to-a-loop-call`), tasks 00, 01, 02 and 04.
//
// The one dispatchable phase with an orchestrator session to remove — `autonomous` —
// stops being `/aof:autonomous <ref>` typed into an interactive PTY and becomes a LOOP
// LAUNCH: a scope the code-owned `work:loop` walks, carried as an additive field on the
// directive frame beside `baseBranch` and `commit`. The other three phases keep the exact
// bytes a delivered tree sends.
//
// WHAT THESE LANES ARE FOR, in the order the risk actually sits:
//   · the three session phases still work whatever happens here, so a smoke test says
//     nothing — the byte-identity of their directives is asserted against the delivered
//     producer (`buildDirectiveFrame`, which this story does not edit) rather than against
//     a retyped string;
//   · the launch must arrive at the driver AS SENT, including a key this worker has no
//     opinion about, because a field read in three places is a field re-derived in two;
//   · a story-shaped ref must be refused AT THE CONTROL before a directive is sent, and
//     the SAME ref on `continue`/`verify` must keep working, so the refusal is proven
//     scoped to one phase rather than a new gate on story assignment;
//   · and the machinery ABOVE the launch — leasing, routing, the terminal spawn, output
//     chunking, withdraw and the NEEDS_INPUT path — is driven twice, once on a session
//     assignment and once on a loop one, and must answer the same answer both times.
//
// No program name and no argv token is spelled in this file. The declared launch is read
// through the compiler the worker itself uses, so a test that agreed with a retyped
// literal instead of with the declaration could not catch the disagreement this whole
// enforcement point exists to make impossible.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import {
  assembleAssignmentRecord,
  insertAssignment,
  listAllAssignments,
  updateAssignmentState,
  ASSIGNMENT_STATES,
} from "../../../src/assignment-record.mjs";
import { runControlDispatchReclaimTick } from "../../../src/mesh/assignment-reclaim.mjs";
import { buildDirectiveFrame } from "../../../src/control-stream-server.mjs";
import {
  ASSIGNMENT_PHASES,
  DEFAULT_ASSIGNMENT_PHASE,
  ASSIGNMENT_LAUNCH_LOOP,
  ASSIGNMENT_LAUNCH_SESSION,
  ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED,
  assignmentDirectiveCommand,
  assignmentDirectiveResolution,
  assignmentDirectiveLaunch,
  isAssignmentPhase,
  phaseRunsOnItemBranch,
  setAssignmentPhase,
  setItemBranch,
} from "../../../src/mesh/assignment-directive.mjs";
import {
  createMeshWorkerExecutionHandler,
  NEEDS_INPUT_SENTINEL,
  ASSIGNMENT_LOOP_LAUNCH_UNDECLARED,
  ASSIGNMENT_LOOP_LAUNCH_SCOPELESS,
} from "../../../src/mesh/worker-execution.mjs";
import { bundledFrozenSet, compileFrozenSet } from "../../../src/frozen-set.mjs";
// 63/06 (ADR-013 §1) — the SESSION-SHAPED default and the directory it reads, imported
// so the lane below can prove the defect is reachable before proving it is gone. A leg
// that only asserted "the seam resolves null" would pass over a watch that never had
// anything to find.
import { defaultWatchTranscriptSessionId } from "../../../src/agent-session-driver.mjs";
import { claudeProjectsDir } from "../../../src/work/observe.mjs";
import { LOOP_STOPS, LOOP_SCOPE_FORMS, resolveLoopLevel } from "../../../src/work/loop.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import {
  withMeshWorkerExecFixture,
  markRepoPublished,
  seedNodeWorkspaceMembership,
  createStatusRecorder,
  scriptedPushExec,
} from "../../support/mesh-worker-exec-fixture.mjs";
import { createFakeWhich, createFakePtySpawn } from "../../support/mesh-worker-terminal-fixture.mjs";

const NODE_ID = "worker-a";

// The env keys the launch seam scrubs, planted by the terminal lane so its scrub
// assertion catches something rather than agreeing with an empty environment.
const PLANTED_ATTACHMENT_KEYS = ["CLAUDECODE", "CLAUDE_PID", "TERM_PROGRAM", "VSCODE_GIT_ASKPASS_MAIN", "CLAUDE_CODE_SSE_PORT"];

// The DECLARED launch, read the way the worker reads it. Everything this suite asserts
// about the program and the leading argv is derived from here.
const DECLARED = compileFrozenSet(bundledFrozenSet()).unattendedLaunch;

const ESC = String.fromCharCode(27);
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

async function withIsolatedStore(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-loop-directive-"));
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return await fn({ store, home });
  } finally {
    store.close?.();
    await rm(home, { recursive: true, force: true });
  }
}

function noClose(store) {
  return { db: store.db, paths: store.paths, close() {} };
}

function fakeStreamServer({ connected = ["worker-a"] } = {}) {
  const conn = new Set(connected);
  const dispatched = [];
  return {
    dispatched,
    directiveTargets: { get: (nodeId) => (conn.has(nodeId) ? { fake: true } : null) },
    dispatchDirective: (frame) => { dispatched.push(frame); return { sent: true }; },
    updatePeers() {},
    stop() {},
  };
}

function seedAssigned(store, { assignmentId, itemRef, workspaceId = "ws-1", targetNodeId = NODE_ID, now = "2026-09-02T09:00:00.000Z" }) {
  insertAssignment(store, assembleAssignmentRecord({
    assignmentId, itemRef, workspaceId, targetNodeId, issuer: "control-a", state: "assigned", now,
  }));
}

// tick(...) — the production dispatch tick over an isolated store, with the REAL
// `buildDirectiveFrame` (this story edits neither it nor its module). The dispatch bound
// is raised out of the way by default so a lane about DIRECTIVES is not silently truncated
// by a lane about capacity; the one lane whose subject IS the bound sets its own.
const UNBOUNDED = { workDir: "/tmp/none", projectRoot: "/tmp/none", config: { work: { dispatch: { concurrency: 99 } } } };

async function tick(store, streamServer, overrides = {}) {
  const logs = [];
  await runControlDispatchReclaimTick(
    overrides.ws ?? UNBOUNDED,
    streamServer,
    {
      workspaceId: "ws-1",
      now: "2026-09-02T09:00:05.000Z",
      openStore: async () => noClose(store),
      buildDirectiveFrame,
      dispatchedIds: overrides.dispatchedIds ?? new Set(),
      onDispatchLog: (entry) => logs.push(entry),
      ...(overrides.tickOptions ?? {}),
    },
  );
  return { logs, byId: new Map(streamServer.dispatched.map((f) => [f.assignmentId, f])) };
}

// A worker handler over the real fixture, with a scripted PTY. A loop launch types
// NOTHING into its session, so nothing triggers the write-driven exit the session lanes
// use — the pty is settled on the tick after it is spawned instead, which is the honest
// stand-in for "the program ran and exited on its own".
// The shared scripted pty hands its `emitData`/`emitExit` emitters ONLY to its write hook,
// and a loop launch writes nothing — so a lane that needs a loop run to PRINT pokes the pty
// with this token and then removes that one synthetic entry again, because `pty.writes` has
// to keep meaning "what the driver typed" for the lanes that assert it is empty.
const PTY_POKE = "\u0000aof-63-03-poke";

function workerHarness(fx, ws, { onWrite, exitAfterSpawn = true, pokeAfterSpawn = false, handlerOptions = {} } = {}) {
  const recorder = createStatusRecorder();
  const which = createFakeWhich(["claude"]);
  const base = createFakePtySpawn({ onWrite: onWrite ?? (({ emitExit }) => emitExit(0)) });
  const spawn = async (bin, args, options) => {
    const pty = await base.spawn(bin, args, options);
    if (pokeAfterSpawn) {
      setImmediate(() => {
        try {
          pty.write(PTY_POKE);
          const at = pty.writes.indexOf(PTY_POKE);
          if (at !== -1) pty.writes.splice(at, 1);
        } catch { /* already gone */ }
      });
    }
    if (exitAfterSpawn) setImmediate(() => { try { pty.kill(); } catch { /* already gone */ } });
    return pty;
  };
  const handler = createMeshWorkerExecutionHandler({
    pushExec: scriptedPushExec(),
    loadWs: () => Promise.resolve(ws),
    nodeId: NODE_ID,
    sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
    now: () => "2026-09-02T09:00:00.000Z",
    globalWorkStoreOptions: { env: fx.env },
    ptySpawn: spawn,
    which,
    ...handlerOptions,
  });
  return { handler, recorder, spawnCalls: base.spawnCalls, ptys: base.ptys };
}

function directive(fields) {
  return {
    kind: "directive",
    to: NODE_ID,
    at: "2026-09-02T09:00:00.000Z",
    ...fields,
  };
}

export const meshAssignmentLoopDirectiveTests = [
  // ─────────────────────────────────────────────────────────── task 00 ──────────
  {
    name: "63/03 task00 — an autonomous assignment goes out as a LOOP LAUNCH naming the scope, with no slash-command beside it, and no other assignment's directive changes",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-auto", itemRef: "63" });
      seedAssigned(store, { assignmentId: "asg-refine", itemRef: "64" });
      seedAssigned(store, { assignmentId: "asg-verify", itemRef: "65" });
      setAssignmentPhase(store, "asg-auto", "autonomous");
      setAssignmentPhase(store, "asg-verify", "verify");

      const server = fakeStreamServer();
      const { byId } = await tick(store, server);

      assert.deepEqual(byId.get("asg-auto")?.launch, { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "63" }, "the launch is a LOOP and it names the assigned scope");
      assert.equal("command" in byId.get("asg-auto"), false, "no slash-command string rides that assignment's directive");
      // The two neighbours are untouched — both the kind and the exact command bytes.
      assert.equal(byId.get("asg-refine")?.command, assignmentDirectiveCommand("refine", "64"));
      assert.equal(byId.get("asg-verify")?.command, assignmentDirectiveCommand("verify", "65"));
      for (const id of ["asg-refine", "asg-verify"]) {
        assert.equal("launch" in byId.get(id), false, `${id} carries no launch key at all`);
      }
    }),
  },
  {
    name: "63/03 task00 — the worker runs the DECLARED launch and nothing is typed into the session: no `/aof:` text reaches any PTY for that assignment",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const { handler, spawnCalls, ptys } = workerHarness(fx, ws);

      await handler(directive({
        assignmentId: "asg-loop-run",
        itemRef: fx.itemRef,
        workspaceId: fx.workspaceId,
        launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" },
      }));

      assert.equal(spawnCalls.length, 1, "one process is spawned for the assignment");
      assert.equal(spawnCalls[0].bin, DECLARED.program, "the program is the one the DECLARATION names — this path spells none of its own");
      assert.deepEqual(spawnCalls[0].args, [...DECLARED.args, "35"], "the argv is the declared leading arguments plus the scope the control sent, and nothing else");
      assert.deepEqual(ptys[0].writes, [], "nothing is typed into that session — no directive, no prompt, no `/aof:` text");
      assert.ok(!JSON.stringify(spawnCalls[0].args).includes("/aof:"), "and no slash command is smuggled into the argv either");
      assert.ok(!spawnCalls[0].args.includes("-p"), "never a headless `-p` prompt argument");
    }),
  },
  {
    name: "63/03 task00 Scenario Outline — the assignment path states NO level, and neither a workspace config key, nor an environment variable on the control, nor a stray field on the assignment row introduces one (4 rows)",
    run: async () => withIsolatedStore(async ({ store }) => {
      const baseline = await (async () => {
        seedAssigned(store, { assignmentId: "asg-l-none", itemRef: "63" });
        setAssignmentPhase(store, "asg-l-none", "autonomous");
        const server = fakeStreamServer();
        const { byId } = await tick(store, server);
        return byId.get("asg-l-none").launch;
      })();
      assert.deepEqual(Object.keys(baseline).sort(), ["kind", "scope"], "the launch carries a kind and a scope and NOTHING else — there is no level key to fill");

      const rows = [
        {
          declaration: "a config key in the workspace asking for L3",
          apply: () => ({ ws: { ...UNBOUNDED, config: { ...UNBOUNDED.config, work: { ...UNBOUNDED.config.work, loop: { level: "L3" } } } } }),
        },
        {
          declaration: "an environment variable on the control asking for L3",
          apply: () => { process.env.AOF_LOOP_LEVEL = "L3"; return {}; },
          undo: () => { delete process.env.AOF_LOOP_LEVEL; },
        },
        {
          declaration: "an extra argument passed to the assign verb asking for L3",
          // The assign verb records only a phase; a level would need a NEW carrier. This
          // row plants one anyway — a stray field riding the row — and requires the
          // dispatch to be blind to it.
          apply: (id) => { store.db.prepare("UPDATE global_assignments SET issuer = ? WHERE assignment_id = ?").run("control-a --level L3", id); return {}; },
        },
      ];

      for (const [index, row] of rows.entries()) {
        const id = `asg-l-${index}`;
        seedAssigned(store, { assignmentId: id, itemRef: "63" });
        setAssignmentPhase(store, id, "autonomous");
        const overrides = row.apply(id);
        try {
          const server = fakeStreamServer();
          const { byId } = await tick(store, server, overrides);
          const launch = byId.get(id)?.launch;
          assert.deepEqual(launch, baseline, `[${row.declaration}] the launch is unchanged — no level of any kind reaches it`);
          assert.ok(!JSON.stringify(byId.get(id)).includes("L3"), `[${row.declaration}] no level token appears anywhere on the frame`);
        } finally {
          row.undo?.();
        }
      }

      // "the run proceeds at the loop's own default" — the launch names no level, so the
      // level that applies is the one the loop resolves for an absent declaration.
      assert.deepEqual(resolveLoopLevel(undefined), { admitted: true, level: "L2" }, "the default is READ FROM THE LOOP, never restated on this path");
    }),
  },
  {
    name: "63/03 task00 — the launch is the declared argv plus the scope and nothing more, so a change to the loop's own default changes this run with no edit on the assignment path",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const { handler, spawnCalls } = workerHarness(fx, ws);
      await handler(directive({
        assignmentId: "asg-no-level",
        itemRef: fx.itemRef,
        workspaceId: fx.workspaceId,
        launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" },
      }));
      const argv = spawnCalls[0].args;
      assert.equal(argv.length, DECLARED.args.length + 1, "exactly one token is appended to the declared argv: the scope");
      assert.ok(!argv.some((token) => /^--level/.test(token)), "no `--level` flag is passed at all");
      assert.ok(!argv.some((token) => /^L[123]$/.test(token)), "and no bare level value either — the loop defaults for itself");
    }),
  },
  {
    name: "63/03 task00 Scenario Outline — the scope is the ref that was assigned: a milestone travels character for character, and a story-shaped ref launches nothing (3 rows)",
    run: async () => withIsolatedStore(async ({ store }) => {
      const rows = [
        { id: "asg-s-milestone", ref: "63", scope: "63" },
        { id: "asg-s-unrefined", ref: "64", scope: "64" },
        { id: "asg-s-story", ref: "63/03", scope: null },
      ];
      for (const row of rows) {
        seedAssigned(store, { assignmentId: row.id, itemRef: row.ref });
        setAssignmentPhase(store, row.id, "autonomous");
      }
      const server = fakeStreamServer();
      const { byId, logs } = await tick(store, server);

      for (const row of rows.filter((r) => r.scope != null)) {
        assert.equal(byId.get(row.id)?.launch?.scope, row.scope, `[${row.ref}] the launch carries the assigned ref character for character`);
        assert.equal(byId.get(row.id)?.launch?.scope, row.ref, `[${row.ref}] never widened to something the operator did not name, never narrowed to a story under it`);
      }
      assert.equal(byId.has("asg-s-story"), false, "a story-shaped ref launches NOTHING — no loop over a scope the loop declares no form for");
      const refusal = logs.find((entry) => entry.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED);
      assert.ok(refusal, "the refusal is recorded with a code");
      assert.ok(refusal.message.includes("63/03"), "…and names the scope it refused");
      // A whole-stream walk over `63` is exactly what the refusal exists to prevent.
      assert.ok(!server.dispatched.some((f) => f.launch?.scope === "63" && f.assignmentId === "asg-s-story"), "no run over the milestone above it is substituted");
    }),
  },
  {
    name: "63/03 task00 — the refusal happens BEFORE anything is sent: no directive of any kind leaves the control for that assignment, and it is not retried in silence",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-refused", itemRef: "63/03" });
      setAssignmentPhase(store, "asg-refused", "autonomous");
      const server = fakeStreamServer();
      const escalated = new Set();
      const { logs } = await tick(store, server, { tickOptions: { pickupEscalatedIds: escalated } });

      assert.deepEqual(server.dispatched, [], "no frame of any kind is written for that assignment");
      assert.equal(logs.filter((e) => e.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED).length, 1, "the reason is recorded where the operator already looks");
      assert.ok(escalated.has("asg-refused"), "the row is escalated to the operator rather than left indistinguishable from a worker that never answered");

      // A second tick neither re-sends nor re-logs: the escalation holds.
      const second = await tick(store, server, { tickOptions: { pickupEscalatedIds: escalated } });
      assert.deepEqual(server.dispatched, [], "still nothing sent");
      assert.equal(second.logs.filter((e) => e.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED).length, 0, "and it is reported once, not every tick");

      const row = listAllAssignments(store).find((r) => r.assignmentId === "asg-refused");
      assert.equal(row.runId, null, "no run was minted for it");
      assert.equal(row.state, "assigned", "no worktree, no deadline — the row never left `assigned`");
    }),
  },
  {
    // MEASURED AT REVIEW. The refusal is connectivity-independent — the resolver reads only
    // the phase and the ref — but it used to be evaluated BELOW the not-connected guard, so a
    // story-shaped ref assigned to a worker that had not connected yet was swallowed: the tick
    // `continue`d in silence every pass, the pickup deadline elapsed first, and the row
    // escalated as `assignment-pickup-deadline-exceeded` ("operator action is required") while
    // the actual cause — a ref matching no declared scope form — was never reported at all. A
    // refusal a later guard can re-label is a refusal reported under the wrong code.
    name: "63/03 task00 — the refusal OUTRANKS the connectivity and bound guards: an unconnected (and an over-bound) target still gets the SCOPE refusal by its own code, never a pickup-deadline escalation in its place",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-offline-story", itemRef: "63/03", targetNodeId: "worker-offline" });
      seedAssigned(store, { assignmentId: "asg-offline-session", itemRef: "63/04", targetNodeId: "worker-offline" });
      setAssignmentPhase(store, "asg-offline-story", "autonomous");
      setAssignmentPhase(store, "asg-offline-session", "verify");

      const offline = fakeStreamServer({ connected: [] });
      const escalated = new Set();
      const first = await tick(store, offline, { tickOptions: { pickupEscalatedIds: escalated } });

      assert.deepEqual(offline.dispatched, [], "nothing is dispatched to a target that is not connected — unchanged");
      const refusal = first.logs.find((entry) => entry.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED);
      assert.ok(refusal, "…but the scope refusal is STILL reported, on the very first tick");
      assert.ok(refusal.message.includes("63/03"), "…naming the scope it refused");
      assert.deepEqual(first.logs.filter((entry) => entry.code === "assignment-pickup-deadline-exceeded"), [], "and it is never re-labelled as a pickup deadline");
      assert.ok(escalated.has("asg-offline-story"), "the refused row is escalated to the operator");
      assert.equal(escalated.has("asg-offline-session"), false, "…while the session-phase row beside it stays quiet on a disconnected target, exactly as today");

      // Reported ONCE, and the deadline can no longer win the race that produced the wrong
      // code: a later tick, well past the pickup deadline, re-reports nothing at all.
      const later = await tick(store, offline, { tickOptions: { pickupEscalatedIds: escalated, now: "2026-09-09T09:00:00.000Z" } });
      assert.deepEqual(later.logs.filter((entry) => entry.message.includes("asg-offline-story")), [], "the escalation holds for the refused row — neither its refusal nor a deadline is logged again");
      // And the CONTRAST that makes the ordering visible: the session-phase row beside it,
      // which is never refused, escalates on the delivered pickup-deadline path instead —
      // the very code the refused row used to be reported under.
      assert.ok(
        later.logs.some((entry) => entry.code === "assignment-pickup-deadline-exceeded" && entry.message.includes("asg-offline-session")),
        "the unrefused row still takes the delivered pickup-deadline escalation, unchanged",
      );

      // The same over the BOUND rather than over connectivity: a target already holding as
      // many runs as the bound allows still gets the refusal by its own code.
      seedAssigned(store, { assignmentId: "asg-bound-holder", itemRef: "80", targetNodeId: "worker-busy" });
      updateAssignmentState(store, "asg-bound-holder", "accepted", { now: "2026-09-02T09:00:01.000Z" });
      seedAssigned(store, { assignmentId: "asg-bound-story", itemRef: "63/05", targetNodeId: "worker-busy" });
      setAssignmentPhase(store, "asg-bound-story", "autonomous");
      const busy = fakeStreamServer({ connected: ["worker-busy"] });
      const bound = await tick(store, busy, {
        ws: { workDir: "/tmp/none", projectRoot: "/tmp/none", config: { work: { dispatch: { concurrency: 1 } } } },
      });
      assert.deepEqual(busy.dispatched, [], "over the bound, nothing is dispatched");
      assert.ok(bound.logs.some((entry) => entry.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED && entry.message.includes("63/05")), "…and the scope refusal is still reported by its own code");
    }),
  },
  {
    name: "63/03 task00 — the refusal is scoped to the phase that resolves a loop: the SAME story-shaped ref on continue and on verify produces its directive exactly as today",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-c", itemRef: "63/03" });
      seedAssigned(store, { assignmentId: "asg-v", itemRef: "63/03", workspaceId: "ws-1" });
      setAssignmentPhase(store, "asg-c", "continue");
      setAssignmentPhase(store, "asg-v", "verify");
      const server = fakeStreamServer();
      const { byId, logs } = await tick(store, server);

      assert.equal(byId.get("asg-c")?.command, assignmentDirectiveCommand("continue", "63/03"), "a story on continue resolves exactly as it does today");
      assert.equal(byId.get("asg-v")?.command, assignmentDirectiveCommand("verify", "63/03"), "…and on verify too");
      assert.deepEqual(logs.filter((e) => e.code === ASSIGNMENT_LOOP_SCOPE_UNSUPPORTED), [], "neither is refused for the SHAPE of its ref");
      // The resolver itself says the same thing, per phase, driven from the vocabulary.
      for (const phase of ASSIGNMENT_PHASES.filter((p) => p !== "autonomous")) {
        assert.equal(assignmentDirectiveResolution(phase, "63/03").refused, undefined, `${phase} never refuses a story-shaped ref`);
      }
    }),
  },
  {
    name: "63/03 task00 — the launch is resolved AT DISPATCH and never remembered: the record carries no scope, level or launch, and a second dispatch resolves again",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-fresh", itemRef: "63" });
      setAssignmentPhase(store, "asg-fresh", "autonomous");
      const minted = listAllAssignments(store).find((r) => r.assignmentId === "asg-fresh");
      for (const key of ["scope", "level", "launch"]) {
        assert.equal(key in minted, false, `nothing recorded at mint time carries a ${key}`);
      }

      const server = fakeStreamServer();
      const first = await tick(store, server);
      assert.deepEqual(first.byId.get("asg-fresh")?.launch, { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "63" });

      // Change the phase and dispatch again with a fresh once-guard: the answer is
      // re-resolved, never replayed from the first dispatch.
      setAssignmentPhase(store, "asg-fresh", "verify");
      const second = await tick(store, fakeStreamServer());
      assert.equal(second.byId.get("asg-fresh")?.command, assignmentDirectiveCommand("verify", "63"), "the second dispatch resolves again");
      assert.equal("launch" in second.byId.get("asg-fresh"), false, "…rather than replaying the first answer");
    }),
  },
  {
    name: "63/03 task00 — the loop launch and the typed command are ALTERNATIVES: no directive on any dispatchable phase carries both",
    run: async () => withIsolatedStore(async ({ store }) => {
      for (const [index, phase] of ASSIGNMENT_PHASES.entries()) {
        seedAssigned(store, { assignmentId: `asg-alt-${index}`, itemRef: "63" });
        setAssignmentPhase(store, `asg-alt-${index}`, phase);
      }
      const server = fakeStreamServer();
      const { byId } = await tick(store, server);
      let withLaunch = 0;
      for (const [index, phase] of ASSIGNMENT_PHASES.entries()) {
        const frame = byId.get(`asg-alt-${index}`);
        assert.ok(frame, `${phase} dispatched`);
        assert.ok(!("launch" in frame && "command" in frame), `${phase}: never both a launch and a command to type`);
        if ("launch" in frame) { withLaunch += 1; assert.equal(phase, "autonomous", "the one that carries a launch is the autonomous phase's"); }
      }
      assert.equal(withLaunch, 1, "…and only that one");
    }),
  },

  // ─────────────────────────────────────────────────────────── task 01 ──────────
  {
    name: "63/03 task01 Scenario Outline — every dispatchable phase, its directive kind, the command it types and the branch it runs on (5 rows, driven from ASSIGNMENT_PHASES)",
    run: async () => withIsolatedStore(async ({ store }) => {
      const rows = [
        { phase: "refine", kind: ASSIGNMENT_LAUNCH_SESSION, command: "/aof:refine 63 --autonomous", branch: false },
        { phase: "continue", kind: ASSIGNMENT_LAUNCH_SESSION, command: "/aof:continue 63", branch: true },
        { phase: "verify", kind: ASSIGNMENT_LAUNCH_SESSION, command: "/aof:verify 63", branch: true },
        { phase: "autonomous", kind: ASSIGNMENT_LAUNCH_LOOP, command: null, branch: true },
        { phase: "an unrecognised one", kind: ASSIGNMENT_LAUNCH_SESSION, command: "/aof:refine 63 --autonomous", branch: false },
      ];
      // The table's four real phases ARE the vocabulary — a fifth member could not be
      // added silently without this failing.
      assert.deepEqual(rows.filter((r) => isAssignmentPhase(r.phase)).map((r) => r.phase), [...ASSIGNMENT_PHASES], "the table answers for exactly the closed set");

      for (const row of rows) {
        const resolution = assignmentDirectiveResolution(row.phase, "63");
        assert.equal(resolution.kind, row.kind, `[${row.phase}] kind`);
        assert.equal(resolution.command, row.command, `[${row.phase}] command`);
        assert.equal(phaseRunsOnItemBranch(row.phase), row.branch, `[${row.phase}] runs on the item's existing branch`);
      }

      // …and the same five answers through the REAL tick, on the wire.
      for (const [index, row] of rows.entries()) {
        const id = `asg-t1-${index}`;
        seedAssigned(store, { assignmentId: id, itemRef: "63" });
        if (isAssignmentPhase(row.phase)) setAssignmentPhase(store, id, row.phase);
        else store.db.prepare("INSERT OR REPLACE INTO global_assignment_directives (assignment_id, phase, created_at) VALUES (?, ?, ?)").run(id, row.phase, "2026-09-02T09:00:00.000Z");
      }
      setItemBranch(store, "ws-1", "63", "aof/mesh/63");
      const server = fakeStreamServer();
      const { byId } = await tick(store, server);
      for (const [index, row] of rows.entries()) {
        const frame = byId.get(`asg-t1-${index}`);
        assert.equal(frame.command ?? null, row.command, `[${row.phase}] the wire carries the same command`);
        assert.equal("launch" in frame, row.kind === ASSIGNMENT_LAUNCH_LOOP, `[${row.phase}] the wire carries a launch only for the loop kind`);
        assert.equal(frame.baseBranch ?? null, row.branch ? "aof/mesh/63" : null, `[${row.phase}] the branch answer is the one this table states`);
      }
    }),
  },
  {
    name: "63/03 task01 — an assignment with NO phase recorded is byte-identical to what it is today: the refine command, no launch, no base branch",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-noph", itemRef: "63" });
      setItemBranch(store, "ws-1", "63", "aof/mesh/63");
      const server = fakeStreamServer();
      const { byId } = await tick(store, server);
      const frame = byId.get("asg-noph");
      assert.equal(frame.command, assignmentDirectiveCommand(DEFAULT_ASSIGNMENT_PHASE, "63"), "the refine command exactly as a delivered tree sends it");
      assert.equal("launch" in frame, false, "no loop launch");
      assert.equal("baseBranch" in frame, false, "it resolves no base branch, exactly as a refine does not");
    }),
  },
  {
    name: "63/03 task01 — the two spellings of \"autonomous\" stay different things, and neither answer is reached by matching the word in the other's command",
    run: async () => {
      const refine = assignmentDirectiveResolution("refine", "63");
      const auto = assignmentDirectiveResolution("autonomous", "63");
      assert.equal(refine.kind, ASSIGNMENT_LAUNCH_SESSION, "refine --autonomous is a SESSION, deliberately");
      assert.ok(refine.command.includes("--autonomous"), "…told to type its delivered command, flag included");
      assert.equal(auto.kind, ASSIGNMENT_LAUNCH_LOOP, "the autonomous PHASE is a loop launch");
      assert.equal(auto.command, null, "…that types nothing");
      // The mapper's own answer for the autonomous phase still exists and is unchanged —
      // so the loop answer cannot have been reached by matching the word in a string.
      assert.equal(assignmentDirectiveCommand("autonomous", "63"), "/aof:autonomous 63", "the delivered mapper is byte-unchanged for all four phases");
      assert.notEqual(refine.kind, auto.kind, "the two spellings resolve to different kinds");
    },
  },
  {
    name: "63/03 task01 — the three session directives are field-for-field what the DELIVERED producer builds, and a pre-story worker would behave identically on either",
    run: async () => withIsolatedStore(async ({ store }) => {
      const phases = ["refine", "continue", "verify"];
      for (const [index, phase] of phases.entries()) {
        seedAssigned(store, { assignmentId: `asg-bytes-${index}`, itemRef: "63" });
        setAssignmentPhase(store, `asg-bytes-${index}`, phase);
      }
      setItemBranch(store, "ws-1", "63", "aof/mesh/63");
      const server = fakeStreamServer();
      const { byId } = await tick(store, server, { tickOptions: { resolveDispatchCommit: async () => "abc123def4567890abc123def4567890abc123de" } });

      for (const [index, phase] of phases.entries()) {
        const actual = byId.get(`asg-bytes-${index}`);
        // The delivered shape, produced by the UNEDITED frame builder from the same
        // inputs a delivered tree resolves for this phase.
        const expected = buildDirectiveFrame(NODE_ID, {
          assignmentId: `asg-bytes-${index}`,
          itemRef: "63",
          workspaceId: "ws-1",
          at: "2026-09-02T09:00:05.000Z",
          command: assignmentDirectiveCommand(phase, "63"),
          baseBranch: phaseRunsOnItemBranch(phase) ? "aof/mesh/63" : null,
          commit: "abc123def4567890abc123def4567890abc123de",
        });
        assert.deepEqual(actual, expected, `[${phase}] every field a worker reads is the same in both, in the same order`);
        assert.equal("launch" in actual, false, `[${phase}] no loop launch appears on it`);
      }
    }),
  },
  {
    name: "63/03 task01 — the phase vocabulary is still closed, and the set the assign face accepts is the set the dispatch answers for",
    run: async () => withIsolatedStore(async ({ store }) => {
      for (const bad of ["", "Refine", "build", "loop", "autonomous ", null, 3]) {
        assert.equal(isAssignmentPhase(bad), false, `${String(bad)} is outside the closed set`);
        assert.throws(() => setAssignmentPhase(store, "asg-x", bad), (e) => e.code === "assignment-phase-invalid", `${String(bad)} is refused at the face, exactly as today`);
        // The dispatch coerces the same way the face refuses: never a fifth kind.
        assert.equal(assignmentDirectiveResolution(bad, "63").kind, ASSIGNMENT_LAUNCH_SESSION, `${String(bad)} degrades to the refine default at the dispatch`);
      }
      // Every member the face accepts gets an answer at the dispatch, and its branch
      // answer is the one home's answer — no member answered in one and not the other.
      for (const phase of ASSIGNMENT_PHASES) {
        const resolution = assignmentDirectiveResolution(phase, "63");
        assert.ok([ASSIGNMENT_LAUNCH_SESSION, ASSIGNMENT_LAUNCH_LOOP].includes(resolution.kind), `${phase} resolves to a known kind`);
        assert.equal(phaseRunsOnItemBranch(phase), phase !== "refine", `${phase} keeps its delivered branch answer`);
      }
    }),
  },

  // ─────────────────────────────────────────────────────────── task 02 ──────────
  {
    name: "63/03 task02 Scenario Outline — what each dispatched directive carries, field by field: launch, command, base branch and base commit (6 rows)",
    run: async () => withIsolatedStore(async ({ store }) => {
      const PIN = "abc123def4567890abc123def4567890abc123de";
      const rows = [
        { id: "r-refine", phase: "refine", ref: "70", branch: null, launch: false, commit: PIN },
        { id: "r-continue", phase: "continue", ref: "71", branch: "aof/mesh/71-x", launch: false, commit: PIN },
        { id: "r-verify", phase: "verify", ref: "72", branch: "aof/mesh/72-x", launch: false, commit: PIN },
        { id: "r-auto-branch", phase: "autonomous", ref: "73", branch: "aof/mesh/73-x", launch: true, commit: PIN },
        { id: "r-auto-nobranch", phase: "autonomous", ref: "74", branch: null, launch: true, commit: PIN },
        { id: "r-auto-nocommit", phase: "autonomous", ref: "75", branch: "aof/mesh/75-x", launch: true, commit: null },
      ];
      for (const row of rows) {
        seedAssigned(store, { assignmentId: row.id, itemRef: row.ref });
        setAssignmentPhase(store, row.id, row.phase);
        if (row.branch != null) setItemBranch(store, "ws-1", row.ref, row.branch);
      }
      const server = fakeStreamServer();
      const { byId } = await tick(store, server, {
        tickOptions: { resolveDispatchCommit: async (r) => (r.itemRef === "75" ? null : PIN) },
      });

      for (const row of rows) {
        const frame = byId.get(row.id);
        assert.equal("launch" in frame, row.launch, `[${row.id}] loop launch present`);
        if (row.launch) assert.deepEqual(frame.launch, { kind: ASSIGNMENT_LAUNCH_LOOP, scope: row.ref }, `[${row.id}] the launch names the assigned scope`);
        assert.equal(frame.command ?? null, row.launch ? null : assignmentDirectiveCommand(row.phase, row.ref), `[${row.id}] command`);
        assert.equal(frame.baseBranch ?? null, row.branch, `[${row.id}] base branch — the neighbour the launch must not disturb`);
        assert.equal(frame.commit ?? null, row.commit, `[${row.id}] base commit — the other neighbour`);
      }
    }),
  },
  {
    name: "63/03 task02 Scenario Outline — the assignment record is the SAME ten keys, in the same order, on every phase and after the autonomous directive has been dispatched (5 rows)",
    run: async () => withIsolatedStore(async ({ store }) => {
      const FROZEN_TEN = Object.keys(assembleAssignmentRecord({ itemRef: "1", workspaceId: "ws-1", targetNodeId: NODE_ID, issuer: "i" }));
      assert.equal(FROZEN_TEN.length, 10, "the assembler's own shape is the frozen ten");

      for (const [index, phase] of ASSIGNMENT_PHASES.entries()) {
        const record = assembleAssignmentRecord({ assignmentId: `rec-${index}`, itemRef: "63", workspaceId: "ws-1", targetNodeId: NODE_ID, issuer: "control-a" });
        assert.deepEqual(Object.keys(record), FROZEN_TEN, `[${phase}] exactly ten keys, in the order it has always carried them`);
        for (const forbidden of ["scope", "level", "launch"]) {
          assert.equal(forbidden in record, false, `[${phase}] none of them is a ${forbidden}`);
        }
        insertAssignment(store, record);
        setAssignmentPhase(store, `rec-${index}`, phase);
      }

      // …and again AFTER the autonomous row's directive has actually been dispatched.
      const server = fakeStreamServer();
      await tick(store, server);
      const dispatchedRow = listAllAssignments(store).find((r) => r.assignmentId === "rec-3");
      for (const forbidden of ["scope", "level", "launch"]) {
        assert.equal(forbidden in dispatchedRow, false, `after dispatch, the record still carries no ${forbidden}`);
      }
    }),
  },
  {
    name: "63/03 task02 — what a reader gets back from the store is unchanged too: an autonomous row that has been dispatched and reported running answers with the same keys a session row does",
    run: async () => withIsolatedStore(async ({ store }) => {
      seedAssigned(store, { assignmentId: "asg-read-auto", itemRef: "63" });
      seedAssigned(store, { assignmentId: "asg-read-sess", itemRef: "64" });
      setAssignmentPhase(store, "asg-read-auto", "autonomous");
      setAssignmentPhase(store, "asg-read-sess", "verify");
      await tick(store, fakeStreamServer());
      for (const id of ["asg-read-auto", "asg-read-sess"]) {
        updateAssignmentState(store, id, "running", { now: "2026-09-02T09:01:00.000Z" });
      }
      const rows = listAllAssignments(store);
      const auto = rows.find((r) => r.assignmentId === "asg-read-auto");
      const sess = rows.find((r) => r.assignmentId === "asg-read-sess");
      assert.deepEqual(Object.keys(auto).sort(), Object.keys(sess).sort(), "the reader every consumer shares answers with the same keys for both");
      assert.ok(!JSON.stringify(auto).includes("\"launch\""), "nothing about the launch has been persisted anywhere the record can be read from");
      assert.ok(!JSON.stringify(auto).includes("\"scope\""), "…and no scope either");
    }),
  },
  {
    name: "63/03 task02 — the launch reaches the driver AS IT WAS SENT, including a part this worker has no opinion about, and nothing else in the options bag differs from a session assignment's",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      const seen = [];
      const spawnRuntime = async (brief, options) => { seen.push({ brief, options }); return { outcome: "done", sessionId: null }; };

      const loopHarness = workerHarness(fx, ws, { handlerOptions: { spawnRuntime } });
      const sentLaunch = { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35", carriedByAFutureControl: "opaque-to-this-worker" };
      await loopHarness.handler(directive({ assignmentId: "asg-opaque", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: sentLaunch }));

      const loopOptions = seen[0].options;
      assert.equal(loopOptions.unattended.carriedByAFutureControl, "opaque-to-this-worker", "the part this worker has no opinion about arrives intact");
      assert.equal(loopOptions.unattended.kind, ASSIGNMENT_LAUNCH_LOOP, "…as does every other key the control put on it");
      assert.equal(loopOptions.unattended.scope, "35", "the scope is forwarded, never re-derived");
      assert.deepEqual(loopOptions.unattended.args, [...DECLARED.args, "35"], "and the argv is the declaration's plus that scope");
      assert.deepEqual(loopOptions.declaredLaunch, DECLARED, "the compiled declaration is SUPPLIED, so the seam never has to refuse for want of one");
      assert.equal("level" in loopOptions.unattended, false, "no level was decided on the way through");

      // The same handler over a SESSION directive: the options bag differs by exactly the
      // two keys the loop kind adds, and by nothing else.
      const sessionHarness = workerHarness(fx, ws, { handlerOptions: { spawnRuntime } });
      await sessionHarness.handler(directive({ assignmentId: "asg-session", itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: "/aof:verify 35/00" }));
      const sessionOptions = seen[1].options;
      const delta = Object.keys(loopOptions).filter((key) => !Object.keys(sessionOptions).includes(key));
      assert.deepEqual(delta.sort(), ["declaredLaunch", "unattended"], "exactly two option keys are added for a loop assignment, and nothing else in the bag moves");
      assert.deepEqual(Object.keys(sessionOptions).sort(), Object.keys(loopOptions).filter((k) => !delta.includes(k)).sort(), "every other key is present on both");
    }),
  },
  {
    name: "63/03 task02 — a directive with NO launch behaves exactly as one always has: the session is spawned, the command is typed, and the absence is not an error, a warning or a refusal",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const { handler, recorder, spawnCalls, ptys } = workerHarness(fx, ws, {
        onWrite: ({ emitExit }) => emitExit(0),
        exitAfterSpawn: false,
      });
      await handler(directive({ assignmentId: "asg-nolaunch", itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: "/aof:verify 35/00" }));

      assert.equal(spawnCalls.length, 1, "the session is spawned");
      assert.ok(spawnCalls[0].bin !== DECLARED.program || !spawnCalls[0].args.includes(DECLARED.args[0]), "…through the session launch, not the declared unattended one");
      const raw = ptys[0].writes[0];
      assert.ok(raw.startsWith(PASTE_START) && raw.endsWith(PASTE_END), "the command crosses as one bracketed paste, exactly as today");
      assert.ok(raw.slice(PASTE_START.length).startsWith("/aof:verify 35/00"), "…and it is the directive's own command");
      assert.deepEqual(recorder.frames.filter((f) => f.state === "failed"), [], "no refusal, no failure — the absence of the field is benign");
    }),
  },
  {
    name: "63/03 task02 — a launch this worker cannot compose is REPORTED with its code, never replaced: no command typed in its place, no run started, no process spawned",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      // A launch that names no scope — the shape a skewed or tampering control would
      // send. There is no session to fall back to and the worker never invents one.
      const scopeless = workerHarness(fx, ws);
      await scopeless.handler(directive({ assignmentId: "asg-scopeless", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: { kind: ASSIGNMENT_LAUNCH_LOOP } }));
      const refusal = scopeless.recorder.frames.find((f) => f.state === "failed");
      assert.ok(refusal, "the refusal is reported for that assignment");
      assert.equal(refusal.code, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, "…carrying its code");
      assert.equal(scopeless.spawnCalls.length, 0, "nothing is spawned");
      assert.equal(scopeless.recorder.frames.filter((f) => f.state === "running").length, 0, "and no run is started for that assignment");

      // A workspace whose compiled declaration admits NO unattended launch: a DIFFERENT
      // answer with a DIFFERENT code, planted rather than described — an unattended run is
      // never started against a declaration that names none, and never quietly becomes a
      // session instead.
      // Planted into THIS workspace's own `.aof/`, which is where the worker reads it —
      // pointing a second projectRoot at a different tree would change the workspace
      // identity and take a different door entirely.
      await mkdir(path.join(fx.root, ".aof"), { recursive: true });
      await writeFile(
        path.join(fx.root, ".aof", "frozen-set.jsonc"),
        JSON.stringify({ version: 1, members: [] }, null, 2),
        "utf8",
      );
      const stripped = workerHarness(fx, ws, {});
      await stripped.handler(directive({ assignmentId: "asg-undeclared", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }));
      const undeclared = stripped.recorder.frames.find((f) => f.state === "failed");
      assert.ok(undeclared, "a workspace declaring no unattended launch refuses the assignment");
      assert.equal(undeclared.code, ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, "…with its own code");
      assert.notEqual(undeclared.code, refusal.code, "a declaration that admits nothing and a launch that names nothing are never the same answer");
      assert.equal(stripped.spawnCalls.length, 0, "and nothing is spawned for it either");
    }),
  },

  {
    // THE GUARD ADR-012 §1 NAMES, PINNED AT THE CALLER. Collapsing this worker's
    // `Object.hasOwn(directive, "launch")` to a truthiness test (`Boolean(directive.launch)`,
    // `directive.launch != null`) leaves every other lane in this suite green and changes
    // behaviour on exactly these four shapes: a DECLARED-but-falsy launch stops being a coded
    // refusal and becomes a spawned `claude` session reported `running` with no code — an
    // attended run standing in for an unattended one, with nothing anywhere saying it was
    // refused. That is the `?? <empty>` species at the one seam where its consequence is a run
    // nobody granted, and it is why PRESENCE rather than truthiness decides here.
    //
    // The seam's own twin of this guard is pinned in 63/02's suite; this is the caller half,
    // which had none.
    name: "63/03 task02 — PRESENCE, not truthiness: a directive that DECLARES a launch carrying nothing usable is refused with a code and spawns nothing, while a directive that declares none is the delivered session path (4 falsy shapes + the absent key)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      for (const [label, value] of [["null", null], ["false", false], ["zero", 0], ["empty-string", ""]]) {
        const harness = workerHarness(fx, ws);
        await harness.handler(directive({ assignmentId: `asg-falsy-${label}`, itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: value }));
        const failed = harness.recorder.frames.find((frame) => frame.state === "failed");
        assert.ok(failed, `[launch: ${label}] a DECLARED launch carrying nothing usable is refused, never silently treated as absent`);
        assert.equal(failed.code, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, `[launch: ${label}] …with the code that says the launch named no scope`);
        assert.equal(harness.spawnCalls.length, 0, `[launch: ${label}] and NOTHING is spawned — no session stands in for the loop that could not be composed`);
        assert.equal(harness.recorder.frames.some((frame) => frame.state === "running"), false, `[launch: ${label}] and no run is reported running for it either`);
      }

      // The OTHER answer, from the same handler: the key ABSENT is the delivered session
      // path. That is what makes the four above a different answer rather than a stricter
      // one — a truthiness test gives these two cases the same answer, presence does not.
      const absent = workerHarness(fx, ws, { exitAfterSpawn: false });
      await absent.handler(directive({ assignmentId: "asg-absent-launch", itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: "/aof:verify 35/00" }));
      assert.equal(absent.spawnCalls.length, 1, "a directive declaring no launch spawns its session exactly as it always has");
      assert.deepEqual(absent.recorder.frames.filter((frame) => frame.code === ASSIGNMENT_LOOP_LAUNCH_SCOPELESS), [], "…and is never refused for a launch it never claimed to carry");
    }),
  },

  // ─────────────────────────────────────────────────────────── task 04 ──────────
  {
    name: "63/03 task04 Scenario Outline — leasing, routing and the once-guard answer identically for a session assignment and an autonomous one (3 control-side rows)",
    run: async () => withIsolatedStore(async ({ store }) => {
      // (1) a target already holding as many runs as the bound allows: the row is left
      //     assigned, no queue or lease state is made, and a later tick retries it.
      seedAssigned(store, { assignmentId: "busy-holder", itemRef: "80" });
      updateAssignmentState(store, "busy-holder", "accepted", { now: "2026-09-02T09:00:01.000Z" });
      seedAssigned(store, { assignmentId: "over-session", itemRef: "81" });
      seedAssigned(store, { assignmentId: "over-loop", itemRef: "82" });
      setAssignmentPhase(store, "over-loop", "autonomous");
      const bound = fakeStreamServer();
      await tick(store, bound, { ws: { workDir: "/tmp/none", projectRoot: "/tmp/none", config: { work: { dispatch: { concurrency: 1 } } } } });
      assert.deepEqual(bound.dispatched.map((f) => f.assignmentId), [], "over the bound, NEITHER kind is dispatched");
      for (const id of ["over-session", "over-loop"]) {
        assert.equal(listAllAssignments(store).find((r) => r.assignmentId === id).state, "assigned", `${id} is left assigned for a later tick`);
      }

      // (2) a target that is not connected: nothing dispatched, nothing marked sent.
      const disconnected = fakeStreamServer({ connected: [] });
      const sent = new Set();
      await tick(store, disconnected, { tickOptions: { dispatchedIds: sent } });
      assert.deepEqual(disconnected.dispatched, [], "an unconnected target receives neither kind");
      assert.equal(sent.size, 0, "and neither is marked sent, so a later tick retries both");

      // (3) the once-guard: a second tick with the same Set re-sends neither kind.
      const live = fakeStreamServer();
      const guard = new Set();
      await tick(store, live, { tickOptions: { dispatchedIds: guard } });
      const firstCount = live.dispatched.length;
      assert.ok(firstCount >= 2, "both kinds went out on the first tick");
      await tick(store, live, { tickOptions: { dispatchedIds: guard } });
      assert.equal(live.dispatched.length, firstCount, "neither kind is dispatched twice");
    }),
  },
  {
    name: "63/03 task04 — the worker answers the same for both kinds: a second directive is ignored outright, and a worker without the repo refuses with its code before any worktree exists",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      // The repo guard fires FIRST, for both kinds, with the same code — the launch
      // composition never gets in front of it.
      for (const [label, extra] of [["session", { command: "/aof:verify 35/00" }], ["loop", { launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }]]) {
        const { handler, recorder, spawnCalls } = workerHarness(fx, ws);
        await handler(directive({ assignmentId: `asg-norepo-${label}`, itemRef: fx.itemRef, workspaceId: fx.workspaceId, ...extra }));
        const failed = recorder.frames.find((f) => f.state === "failed");
        assert.equal(failed?.code, "assignment-repo-unavailable", `[${label}] the repo guard answers first, with its own code`);
        assert.equal(spawnCalls.length, 0, `[${label}] and nothing is spawned`);
      }

      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      const published = await loadWorkspace(fx.root, undefined, { env: fx.env });
      for (const [label, extra] of [["session", { command: "/aof:verify 35/00" }], ["loop", { launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }]]) {
        const { handler, spawnCalls } = workerHarness(fx, published, { exitAfterSpawn: true });
        const frame = directive({ assignmentId: `asg-dup-${label}`, itemRef: fx.itemRef, workspaceId: fx.workspaceId, ...extra });
        await handler(frame);
        const afterFirst = spawnCalls.length;
        await handler(frame);
        assert.equal(spawnCalls.length, afterFirst, `[${label}] a second directive for an assignment already acted on is ignored outright — no second run`);
      }
    }),
  },
  {
    name: "63/03 task04 — the terminal is spawned the same way for both kinds, with the same environment scrubbing, and never as a prompt argument; output is chunked and streamed in the same shape",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      // Plant the attachment vector so the scrub assertion below catches something.
      const restore = {};
      for (const key of PLANTED_ATTACHMENT_KEYS) { restore[key] = process.env[key]; process.env[key] = "planted"; }

      const runs = {};
      for (const [label, extra, pokeAfterSpawn] of [
        // The session arm prints when the directive is typed into it. The loop arm types
        // nothing, so its run is POKED into printing the same payload — the Outline's
        // `When` says "and again on an autonomous one", and a row driven on one arm only
        // is an unasserted row rather than a passing one.
        ["session", { command: "/aof:verify 35/00" }, false],
        ["loop", { launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }, true],
      ]) {
        const chunks = [];
        const harness = workerHarness(fx, ws, {
          exitAfterSpawn: false,
          pokeAfterSpawn,
          onWrite: ({ emitData, emitExit }) => { emitData("hello from the run\n"); emitExit(0); },
          handlerOptions: { onOutputChunk: (chunk, sessionId) => chunks.push({ chunk: String(chunk), sessionId }) },
        });
        await harness.handler(directive({ assignmentId: `asg-term-${label}`, itemRef: fx.itemRef, workspaceId: fx.workspaceId, ...extra }));
        runs[label] = { ...harness, chunks };
      }
      for (const [key, value] of Object.entries(restore)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }

      const sessionSpawn = runs.session.spawnCalls[0];
      const loopSpawn = runs.loop.spawnCalls[0];
      assert.deepEqual(
        { name: loopSpawn.options.name, cols: loopSpawn.options.cols, rows: loopSpawn.options.rows },
        { name: sessionSpawn.options.name, cols: sessionSpawn.options.cols, rows: sessionSpawn.options.rows },
        "the terminal is spawned with the same geometry and terminal type for both kinds",
      );
      // Each assignment gets its OWN worktree, so the two cwds differ by assignment id and
      // by nothing else: same root, same naming rule, same lane.
      assert.equal(path.dirname(loopSpawn.options.cwd), path.dirname(sessionSpawn.options.cwd), "both kinds are spawned into the same per-assignment worktree root");
      assert.equal(path.basename(loopSpawn.options.cwd), "asg-term-loop", "…each into the worktree named for its own assignment");
      assert.equal(path.basename(sessionSpawn.options.cwd), "asg-term-session", "…by the same rule, for both kinds");
      // The SESSION-ATTACHMENT vector is scrubbed for both, by the same predicate. The
      // planted keys above are what make this non-vacuous: an environment with nothing to
      // scrub proves nothing about the scrub.
      for (const [label, spawnCall] of [["session", sessionSpawn], ["loop", loopSpawn]]) {
        const env = spawnCall.options.env ?? {};
        for (const key of PLANTED_ATTACHMENT_KEYS) {
          assert.equal(key in env, false, `[${label}] ${key} — the session-attachment vector is scrubbed identically for both kinds`);
        }
      }
      // …and the unattended environment gains NOTHING a session's gains: no provider
      // marker, no session telemetry key, nothing at all that says "session".
      const loopSessionMarkers = Object.keys(loopSpawn.options.env ?? {}).filter((key) => key.startsWith("CLAUDE_"));
      assert.deepEqual(loopSessionMarkers, [], "an unattended launch's environment carries no session identity at all");
      assert.ok(!JSON.stringify(loopSpawn.args).includes("/aof:"), "the loop's argv is never a prompt argument");
      // OUTPUT, ON BOTH ARMS. The row is the same row for a session run and a loop run, so
      // it is asserted twice and the two answers are compared to each other, not merely
      // each to "more than zero".
      assert.ok(runs.session.chunks.length > 0, "a session run's output is chunked and streamed");
      assert.ok(runs.loop.chunks.length > 0, "…and so is a loop run's — the streaming sits above `{ bin, args, env }` and does not know which kind it carries");
      assert.deepEqual(
        runs.loop.chunks.map((entry) => entry.chunk),
        runs.session.chunks.map((entry) => entry.chunk),
        "identical payloads, chunked in the same shape, for both kinds",
      );
      assert.deepEqual(runs.loop.ptys[0].writes, [], "…and the loop run still typed nothing: its output was produced, never provoked by a directive");
    }),
  },
  {
    name: "63/03 task04 — the halt vocabulary is 53's frozen twelve plus only the three lane stops 129/01 appended after them, and the assignment states are unchanged: this story invented nothing to carry a loop's stop, and no signal means \"a loop finished\"",
    run: async () => {
      // 129/01 (129/ADR-008 §5) appended three LANE stops as members 13-15, in the loop's own
      // home; the twelve 63 froze against keep their names and their order, and the mesh still
      // authors none of the fifteen (`acd-assignment-resolves-to-a-loop-call` reads the tree).
      assert.deepEqual([...LOOP_STOPS], [
        "uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted",
        "progress-exhausted", "no-progress", "grade-indeterminate", "session-needs-input",
        "run-not-retryable", "retry-parked", "unmapped-item-type", "operator-interrupt",
        "lane-open-failed", "lane-merge-refused", "lane-merge-conflict",
      ], "the loop's stops are 53's twelve, member for member and in order, then 129's three lane stops");
      assert.equal(LOOP_STOPS.length, 15, "fifteen: 63 added none, 129/01 appended three");
      for (const stop of ["uat-gate", "cap-exhausted", "deadline-exhausted", "session-needs-input", "operator-interrupt"]) {
        assert.ok(LOOP_STOPS.includes(stop), `the halt named by this story's own outline (${stop}) is a member of the frozen set`);
      }
      assert.deepEqual([...ASSIGNMENT_STATES], ["assigned", "accepted", "running", "done", "failed", "withdrawn", "reclaimed"], "the assignment states are the same set, member for member");
      // The loop's scope grammar is likewise imported, not restated: a story-shaped ref
      // is refused because LOOP_SCOPE_FORMS says so, not because this story said so.
      assert.equal(LOOP_SCOPE_FORMS.some((form) => form.pattern.test("63/03")), false, "no declared scope form admits a story-shaped ref");
      assert.equal(LOOP_SCOPE_FORMS.some((form) => form.pattern.test("63")), true, "…and the milestone form admits the one this story sends");
    },
  },
  {
    name: "63/03 task04 — a loop run produces no NEEDS_INPUT sentinel and nothing waits for one: it leaves the roster on the SAME reporting path a session exit uses",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      const loop = workerHarness(fx, ws);
      await loop.handler(directive({ assignmentId: "asg-halt-loop", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }));
      const loopTerminal = loop.recorder.frames.filter((f) => ["done", "failed"].includes(f.state));
      assert.equal(loopTerminal.length, 1, "the loop run leaves the roster exactly once, on the ordinary terminal path");
      assert.equal(loop.recorder.frames.some((f) => f.code === "needs-input"), false, "no needs-input is reported for it — the sentinel belongs to sessions");
      // The sentinel's PRODUCER is the attended argv's appended system prompt. An
      // unattended launch carries no argv the declaration did not name, so the sentinel
      // is not produced, rather than produced and missed.
      assert.ok(!JSON.stringify(loop.spawnCalls[0].args).includes(NEEDS_INPUT_SENTINEL), "the unattended argv carries no needs-input instruction at all");

      // A session run on the same worker still emits and reports the sentinel, unchanged.
      const session = workerHarness(fx, ws, {
        exitAfterSpawn: false,
        onWrite: ({ emitData }) => emitData(`${NEEDS_INPUT_SENTINEL}\n`),
      });
      await session.handler(directive({ assignmentId: "asg-halt-session", itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: "/aof:verify 35/00" }));
      assert.ok(session.recorder.frames.some((f) => f.code === "needs-input"), "the needs-input path itself is untouched: a session that emits the sentinel is reported exactly as today");
      assert.ok(JSON.stringify(session.spawnCalls[0].args).includes(NEEDS_INPUT_SENTINEL), "…because the ATTENDED argv is the sentinel's producer, and it is unchanged");
    }),
  },
  {
    name: "63/03 task04 — a withdraw arriving while a loop run is live notifies its holder exactly once and ends the live child, exactly as it does for a session run",
    run: async () => withIsolatedStore(async ({ store }) => {
      for (const [id, phase] of [["wd-session", "verify"], ["wd-loop", "autonomous"]]) {
        seedAssigned(store, { assignmentId: id, itemRef: id === "wd-loop" ? "90" : "91" });
        setAssignmentPhase(store, id, phase);
        updateAssignmentState(store, id, "running", { now: "2026-09-02T09:01:00.000Z" });
        updateAssignmentState(store, id, "withdrawn", { now: "2026-09-02T09:02:00.000Z" });
      }
      const server = fakeStreamServer();
      const notified = new Set();
      await tick(store, server, { tickOptions: { withdrawNotifiedIds: notified } });
      const withdraws = server.dispatched.filter((f) => f.kind === "withdraw");
      assert.deepEqual(withdraws.map((f) => f.assignmentId).sort(), ["wd-loop", "wd-session"], "both kinds are notified");
      await tick(store, server, { tickOptions: { withdrawNotifiedIds: notified } });
      assert.equal(server.dispatched.filter((f) => f.kind === "withdraw").length, 2, "each exactly once — the loop kind gains no second lifecycle");
      for (const frame of withdraws) {
        assert.equal("launch" in frame, false, "a withdraw frame is the delivered shape, unchanged by this story");
      }
    }),
  },
  {
    name: "63/06 task00 (ADR-013 §1) — a loop launch is NOT handed the session-shaped transcript watch over the worktree the loop itself writes sessions into, and the default that WOULD have bound it is the lane's own positive control",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      const seen = [];
      const spawnRuntime = async (brief, options) => { seen.push({ brief, options }); return { outcome: "done", sessionId: null }; };

      // One loop assignment and one session assignment through the SAME handler shape, so
      // the difference below is the launch kind and nothing else.
      const loopHarness = workerHarness(fx, ws, { handlerOptions: { spawnRuntime } });
      await loopHarness.handler(directive({ assignmentId: "asg-watch-loop", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }));
      const sessionHarness = workerHarness(fx, ws, { handlerOptions: { spawnRuntime } });
      await sessionHarness.handler(directive({ assignmentId: "asg-watch-sess", itemRef: fx.itemRef, workspaceId: fx.workspaceId, command: "/aof:verify 35/00" }));

      const loopOptions = seen[0].options;
      const sessionOptions = seen[1].options;
      const worktreeCwd = seen[0].brief.worktreeCwd;
      assert.ok(typeof worktreeCwd === "string" && worktreeCwd.length > 0, "the loop run has a worktree of its own — the directory the defect reads");

      // THE POSITIVE CONTROL. Plant the transcript an INNER session of the loop writes into
      // the run's own worktree, then run the session-shaped default over that same cwd: it
      // resolves that basename. This is the binding that killed the run ten seconds later
      // and reported `done`, and it is proven reachable here rather than described.
      const env = { ...fx.env, CLAUDE_CONFIG_DIR: await mkdtemp(path.join(os.tmpdir(), "aof-loopwatch-")) };
      const projects = claudeProjectsDir({ cwd: worktreeCwd, env });
      await mkdir(projects, { recursive: true });
      const planted = await defaultWatchTranscriptSessionId({ cwd: worktreeCwd, env, maxWaitMs: 4000 })
        .then((id) => id, () => null);
      // (the watch above snapshots an EMPTY dir on its first tick, so write the inner
      // session's transcript only after arming a second one)
      const armed = defaultWatchTranscriptSessionId({ cwd: worktreeCwd, env, maxWaitMs: 4000 });
      await new Promise((r) => setTimeout(r, 250));
      await writeFile(path.join(projects, "inner-session-of-the-loop.jsonl"), "{}\n", "utf8");
      assert.equal(planted, null, "an empty projects dir resolves nothing — the control is measuring the write, not the directory");
      assert.equal(await armed, "inner-session-of-the-loop", "the SESSION-SHAPED default binds this run to the loop's own inner session — the defect, reachable");

      // THE FIX. The seam the worker actually hands the driver for a loop launch answers
      // null over that very same cwd: there is no session transcript belonging to a loop
      // PROCESS, and settlement falls through to term.onExit.
      assert.equal(typeof loopOptions.watchTranscriptSessionId, "function", "a loop launch is handed a watch of its own");
      assert.notEqual(loopOptions.watchTranscriptSessionId, defaultWatchTranscriptSessionId, "…and it is not the session-shaped default");
      assert.equal(
        await loopOptions.watchTranscriptSessionId({ cwd: worktreeCwd, env }),
        null,
        "over the very directory the default just bound, the loop's watch binds nothing",
      );
      assert.equal(typeof loopOptions.watchTranscriptCompletion, "function", "and its completion seam is loop-shaped too");
      assert.equal(await loopOptions.watchTranscriptCompletion({ cwd: worktreeCwd, env, sessionId: "inner-session-of-the-loop" }), null, "…settling on nothing the loop's inner sessions write");

      // THE FENCE, the other way. A SESSION assignment is handed exactly what a delivered
      // tree hands it — nothing — so the driver reaches its own default, unchanged.
      assert.equal(sessionOptions.watchTranscriptSessionId, undefined, "a session assignment is handed no watch at all, exactly as today");
      assert.equal(sessionOptions.watchTranscriptCompletion, undefined, "…on both seams");
      await rm(env.CLAUDE_CONFIG_DIR, { recursive: true, force: true });
    }),
  },
  {
    name: "63/06 task00 — an INJECTED watch still wins over the loop shape, so a launch kind can never make a supplied seam inert",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });

      const seen = [];
      const spawnRuntime = async (brief, options) => { seen.push({ brief, options }); return { outcome: "done", sessionId: null }; };
      const injectedSessionId = async () => "injected-by-the-caller";
      const injectedCompletion = async () => ({ outcome: "done" });
      const harness = workerHarness(fx, ws, {
        handlerOptions: { spawnRuntime, watchTranscriptSessionId: injectedSessionId, watchTranscriptCompletion: injectedCompletion },
      });
      await harness.handler(directive({ assignmentId: "asg-watch-injected", itemRef: fx.itemRef, workspaceId: fx.workspaceId, launch: { kind: ASSIGNMENT_LAUNCH_LOOP, scope: "35" } }));

      const options = seen[0].options;
      assert.equal(options.watchTranscriptSessionId, injectedSessionId, "the caller's own seam reaches the driver untouched");
      assert.equal(options.watchTranscriptCompletion, injectedCompletion, "…on both seams");
      assert.equal(await options.watchTranscriptSessionId(), "injected-by-the-caller", "and it is the caller's answer that is given");
    }),
  },
];
