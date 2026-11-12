import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultSessionHooks as _aofHooks } from "aof/session-hooks";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// Traceability wiring for milestone 50 / story 03 — the worker-side spawn handler.
// Covers every @executable scenario (and every Examples row) of:
//   tasks/00_spawn-handler-module.feature
//   tasks/01_session-registration-lifecycle.feature
//   tasks/02_pty-output-bridging.feature
//   tasks/03_failure-and-cleanup.feature
//
// FED BY REAL PRODUCERS WHEREVER ONE EXISTS (m02/R5 — "offline simulation seams leave
// the real spawn path uncovered"). Only the PTY itself is a double, because a real
// node-pty cannot be spawned in CI on three platforms. Everything around it is the
// shipped seam:
//   - the repo guard is the REAL `workerHasRepo` (mesh-worker-execution.mjs), joined
//     over a REAL local marker + a REAL `global_node_workspaces` row;
//   - the worktree is a REAL `git worktree add` in a REAL git fixture repo;
//   - registration is the REAL startSession/pingSession/endSession, read back off
//     disk, projected through the REAL readLiveSessions and swept by the REAL reaper;
//   - the terminal bridge is the REAL worker-stream client, so the assertions are on
//     the ACTUAL wire envelope (kind + signal), not on a recorder's echo;
//   - the launcher wiring is proven by STARTING THE LAUNCHER and delivering a real
//     session-spawn frame over its client's receive lane — not only by reading source.
//
// ADR-007 is the ruling this story is built to: a launched session runs the
// OPERATOR'S DEFAULT SHELL, `resolveProvider` is not on the spawn path, and
// `assistant` is a key/label only.
//
// ISOLATION IS MANDATORY: every scenario runs inside withMeshWorkerExecFixture, whose
// AOF_GLOBAL_HOME is a disposable temp dir — real session records are written here.
import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dependencySpecifiers } from "../../support/workspace/configured-source.mjs";

const createMeshWorkerSessionSpawnHandler = _aofApplication.mesh.sessionSpawnHandler.createMeshWorkerSessionSpawnHandler;
const resolveDefaultShell = _aofApplication.mesh.sessionSpawnHandler.resolveDefaultShell;
const SESSION_PING_INTERVAL_MS = _aofApplication.mesh.sessionSpawnHandler.SESSION_PING_INTERVAL_MS;
const createTerminalSpawn = _aofApplication.server.terminalWs.createTerminalSpawn;
const workerHasRepo = _aofApplication.mesh.worker.workerHasRepo;
const meshCheckoutPath = _aofApplication.mesh.worker.meshCheckoutPath;
const addWorktree = _aofApplication.mesh.worktree.addWorktree;
const meshItemBranchName = _aofApplication.mesh.worktree.meshItemBranchName;
const meshWorktreePath = _aofApplication.mesh.worktree.meshWorktreePath;
const meshWorktreesRoot = _aofApplication.mesh.worktree.meshWorktreesRoot;
const isUnderMeshWorktreesRoot = _aofApplication.mesh.worktree.isUnderMeshWorktreesRoot;
const meshSessionWorktreePath = _aofApplication.mesh.worktree.meshSessionWorktreePath;
const meshSessionWorktreesRoot = _aofApplication.mesh.worktree.meshSessionWorktreesRoot;
const isUnderMeshSessionWorktreesRoot = _aofApplication.mesh.worktree.isUnderMeshSessionWorktreesRoot;
const readSessionRecord = _aofHooks.meshSession.readSessionRecord;
const reapExpiredSessions = _aofHooks.meshSession.reapExpiredSessions;
const sessionRecordPath = _aofHooks.meshSession.sessionRecordPath;
const DEFAULT_SESSION_TTL_SECONDS = _aofHooks.meshSession.DEFAULT_SESSION_TTL_SECONDS;
const readLiveSessions = _aofApplication.mesh.presence.readLiveSessions;
const createWorkerStreamClient = _aofApplication.mesh.workerStreamClient.createWorkerStreamClient;
import { buildSessionSpawnFrame, buildSessionSpawnEnvelope, SESSION_SPAWN_ACK_KIND } from "@aof/mesh/session-spawn-directive";
const TERMINAL_FRAME_KIND = _aofApplication.mesh.terminalRelayBridge.TERMINAL_FRAME_KIND;
const TERMINAL_INPUT_KIND = _aofApplication.mesh.terminalRelayBridge.TERMINAL_INPUT_KIND;
const buildTerminalInputEnvelope = _aofApplication.mesh.terminalRelayBridge.buildTerminalInputEnvelope;
const createTerminalInputRouter = _aofApplication.mesh.terminalInput.createTerminalInputRouter;
const startLauncher = _aofApplication.mesh.launcher.startLauncher;
const publishNodeRecord = _aofHooks.meshStore.publishNodeRecord;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const meshSessionCommand = _aofHooks.commandsMeshSession.meshSessionCommand;
const buildSessionIndex = _aofApplication.mesh.globalMeshQuery.buildSessionIndex;
import { LAUNCH_COLUMNS, launchCommandLine, launchSessionName, createSessionSpawnServices } from "@aof/mesh/session-spawn-handler";
import { buildSessionEndEnvelope, buildSessionEndFrame } from "@aof/mesh/session-spawn-directive";
import { createMeshSessionVerbs } from "@aof/mesh/commands/session";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import {
  withMeshWorkerExecFixture,
  markRepoPublished,
  seedNodeWorkspaceMembership,
} from "../../support/mesh-worker-exec-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NODE_ID = "worker-a";
const NOW = "2026-08-14T12:00:00.000Z";

// ─────────────────────────────────────────────────────────────── doubles ────

// The ONE double: a PTY handle with node-pty's own surface (onData/onExit return
// disposables, write/kill/pid). It records what was written into it and reports
// whether its subscriptions were disposed — which is how "the handler releases any
// references to the PTY" is proven rather than asserted.
function createFakePty({ pid = 4242 } = {}) {
  const dataListeners = new Set();
  const exitListeners = new Set();
  const writes = [];
  let killed = false;
  return {
    pid,
    writes,
    get killed() { return killed; },
    get dataListenerCount() { return dataListeners.size; },
    get exitListenerCount() { return exitListeners.size; },
    onData(cb) {
      dataListeners.add(cb);
      return { dispose() { dataListeners.delete(cb); } };
    },
    onExit(cb) {
      exitListeners.add(cb);
      return { dispose() { exitListeners.delete(cb); } };
    },
    write(bytes) { writes.push(String(bytes)); },
    kill() { killed = true; },
    emit(chunk) { for (const cb of [...dataListeners]) cb(chunk); },
    fireExit(exitCode = 0) { for (const cb of [...exitListeners]) cb({ exitCode }); },
  };
}

// A recording stand-in for `createTerminalSpawn(loadNodePty)`'s spawnWithLoader:
// (bin, args, options) => pty. Records every call so the shell/cwd/env assertions read
// what the handler ACTUALLY asked for.
function createRecordingPtySpawn({ pty, throws = null } = {}) {
  const calls = [];
  const spawn = async (bin, args, options) => {
    calls.push({ bin, args, options });
    if (throws != null) throw throws;
    return pty ?? createFakePty();
  };
  spawn.calls = calls;
  return spawn;
}

function createWireRecorder() {
  const frames = [];
  const ends = [];
  const acks = [];
  return {
    frames,
    ends,
    acks,
    sendTerminalFrame: async (sessionId, bytes) => { frames.push({ sessionId, bytes }); return { sent: true }; },
    sendTerminalEnd: async (sessionId) => { ends.push({ sessionId }); return { sent: true }; },
    sendSessionSpawnAck: async (result) => { acks.push(result); return { sent: true }; },
  };
}

// The injected ticker: the 30s cadence becomes a fact of the test, never of wall time.
function createManualIntervals() {
  const intervals = [];
  return {
    intervals,
    setIntervalImpl(fn, ms) {
      const handle = { fn, ms, cleared: false };
      intervals.push(handle);
      return handle;
    },
    clearIntervalImpl(handle) { if (handle != null) handle.cleared = true; },
    async fire(index = 0, times = 1) {
      for (let i = 0; i < times; i += 1) await intervals[index].fn();
    },
  };
}

// A transport double for the REAL worker-stream client: records the envelopes that
// actually went out and can deliver a DOWN-frame into the client's receive listener.
function createFakeTransport() {
  const frames = [];
  let messageHandler = null;
  return {
    frames,
    async connect() { return "handle"; },
    async send(_handle, frame) { frames.push(frame); },
    close() {},
    onDrop() {},
    onMessage(handler) { messageHandler = handler; },
    deliver(frame) { messageHandler?.(JSON.stringify(frame)); },
  };
}

function manualTicker() {
  return {
    start(intervalSeconds, onTick) { return { intervalSeconds, onTick, stopped: false }; },
    stop(handle) { handle.stopped = true; },
  };
}

function waitFor(predicate, { timeoutMs = 2000, label = "condition" } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let ok = false;
      try { ok = predicate(); } catch { ok = false; }
      if (ok) { resolve(); return; }
      if (Date.now() - startedAt > timeoutMs) { reject(new Error(`timed out waiting for ${label}`)); return; }
      setTimeout(tick, 5);
    };
    tick();
  });
}

function plusSeconds(iso, seconds) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

// ────────────────────────────────────────────────────────── the fixture ────

// withSpawnFixture(fn, { available }) — a REAL git repo + isolated global home, with
// BOTH halves of the real repo-availability join seeded (or deliberately not, so the
// refusal path is a genuine miss rather than a stubbed `false`).
async function withSpawnFixture(fn, { available = true } = {}) {
  return withMeshWorkerExecFixture(async (fixture) => {
    if (available) {
      await markRepoPublished(fixture.root, { workspaceId: fixture.workspaceId });
      await seedNodeWorkspaceMembership({ home: fixture.home }, { nodeId: NODE_ID, workspaceId: fixture.workspaceId });
    }
    // Re-load so the workspace object carries the marker just written.
    const workspace = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
    // The fixture's home is THE global home for the body. A real launcher's first tick runs the sync
    // pass, whose registry publish rebuilds this workspace's membership from the node records under
    // the process's global home (164/ADR-004); read from another home, it finds none and unlinks
    // this node. That publish used to throw on an injected clock, which hid the mismatch (167/03).
    const prior = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = fixture.home;
    try {
      return await fn({ ...fixture, workspace });
    } finally {
      if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    }
  }, { milestoneNumber: "50", storySlug: "spawn", storyNumber: "03" });
}

// withControlNode(fixture, controlNodeId) — pin a DIFFERENT node as the control so
// `meshRole` resolves this fixture as a WORKER (the role whose branch registers the
// session-spawn lane). Returns the reloaded workspace.
async function withControlNode(fixture, controlNodeId) {
  const configPath = path.join(fixture.root, ".aof", "aof.config.json");
  const onDisk = JSON.parse(await readFile(configPath, "utf8"));
  onDisk.mesh = {
    ...onDisk.mesh,
    // `direct` needs no tailscale probe and no exec seam — a declared address makes
    // the fabric healthy by itself, which is all this scenario needs from it.
    fabric: "direct",
    address: "127.0.0.1",
    relay: { controlNode: controlNodeId, url: `ws://${controlNodeId}:4182/ws/relay` },
  };
  await writeFile(configPath, `${JSON.stringify(onDisk, null, 2)}\n`, "utf8");
  return loadWorkspace(fixture.root, undefined, { env: fixture.env });
}

// buildHandler(fixture, overrides) — the handler wired EXACTLY as mesh-launcher.mjs
// wires it in production (the real workerHasRepo + the real meshCheckoutPath as
// literal keys), with only the PTY, the clock and the ticker injected.
function buildHandler(fixture, overrides = {}) {
  const wire = overrides.wire ?? createWireRecorder();
  const intervals = overrides.intervals ?? createManualIntervals();
  const handler = createMeshWorkerSessionSpawnHandler({
    loadWs: () => Promise.resolve(fixture.workspace),
    nodeId: NODE_ID,
    workerHasRepo,
    meshCheckoutPath,
    globalWorkStoreOptions: { env: fixture.env },
    sendTerminalFrame: wire.sendTerminalFrame,
    sendTerminalEnd: wire.sendTerminalEnd,
    sendSessionSpawnAck: wire.sendSessionSpawnAck,
    now: overrides.now ?? (() => NOW),
    setIntervalImpl: intervals.setIntervalImpl,
    clearIntervalImpl: intervals.clearIntervalImpl,
    ...overrides.options,
  });
  return { handler, wire, intervals };
}

function spawnFrame(fixture, overrides = {}) {
  return buildSessionSpawnFrame(NODE_ID, {
    sessionId: "s1",
    workspaceId: fixture.workspaceId,
    assistant: "claude",
    itemRef: null,
    at: NOW,
    ...overrides,
  });
}

export const meshSessionSpawnHandlerTests = [
  // ═══ Task 00: the spawn handler module ═════════════════════════════════════

  {
    name: "session-spawn-handler/00 a session-spawn directive opens a PTY in the workspace's checkout root (Examples row 1: ws-aof, itemRef null → the checkout root)",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const ptySpawn = createRecordingPtySpawn({ pty });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture));

      assert.equal(ptySpawn.calls.length, 1, "exactly one PTY is spawned");
      assert.equal(ptySpawn.calls[0].options.cwd, fixture.root, "the PTY's cwd is the workspace's checkout root");
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: true, code: undefined }], "the spawn is acknowledged as ok");
    }),
  },

  {
    name: "session-spawn-handler/00 the PTY's shell is the SYSTEM DEFAULT, never a claude/codex/gemini CLI — even though the directive's assistant is \"claude\" (ADR-007)",
    run: async () => withSpawnFixture(async (fixture) => {
      // win32: ComSpec.
      const winSpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const win = buildHandler(fixture, {
        options: { ptySpawn: winSpawn, platform: "win32", env: { ComSpec: "C:\\WINDOWS\\system32\\cmd.exe" } },
      });
      await win.handler(spawnFrame(fixture, { sessionId: "s-win", assistant: "claude" }));
      assert.equal(winSpawn.calls[0].bin, "C:\\WINDOWS\\system32\\cmd.exe", "win32 spawns process.env.ComSpec");

      // POSIX: SHELL.
      const posixSpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const posix = buildHandler(fixture, {
        options: { ptySpawn: posixSpawn, platform: "linux", env: { SHELL: "/bin/zsh" } },
      });
      await posix.handler(spawnFrame(fixture, { sessionId: "s-posix", assistant: "codex" }));
      assert.equal(posixSpawn.calls[0].bin, "/bin/zsh", "POSIX spawns process.env.SHELL");

      for (const call of [winSpawn.calls[0], posixSpawn.calls[0]]) {
        assert.deepEqual(call.args, [], "the shell is spawned bare — no CLI argv");
        assert.ok(
          !/\b(claude|codex|gemini)\b/i.test(call.bin),
          `the spawned binary must not be an assistant CLI (got ${call.bin})`,
        );
      }

      // The rule itself, including both documented fallbacks.
      assert.equal(resolveDefaultShell({}, "win32"), "cmd.exe", "a stripped win32 env still opens cmd.exe");
      assert.equal(resolveDefaultShell({}, "linux"), "/bin/bash", "a stripped POSIX env still opens /bin/bash");
    }),
  },

  {
    name: "session-spawn-handler/00 the spawned shell inherits the FULL ambient environment (ADR-003: an operator shell, not a sandboxed agent)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler } = buildHandler(fixture, { options: { ptySpawn } });
      await handler(spawnFrame(fixture));
      assert.equal(ptySpawn.calls[0].options.env, process.env, "env is process.env itself — full inheritance, no filtered copy");
    }),
  },

  {
    name: "session-spawn-handler/00 an itemRef with NO live assignment tree resolves-or-creates a SESSION worktree, in the session lane's OWN root, and the PTY's cwd IS that worktree (Examples row 2: ws-aof, itemRef \"50\") — a REAL git worktree add",
    run: async () => withSpawnFixture(async (fixture) => {
      const first = createRecordingPtySpawn({ pty: createFakePty() });
      const created = buildHandler(fixture, { options: { ptySpawn: first } });
      await created.handler(spawnFrame(fixture, { sessionId: "s-wt-1", itemRef: "50" }));

      const expected = meshSessionWorktreePath(fixture.root, "50");
      assert.equal(created.wire.acks[0].ok, true, `the spawn succeeded (acks: ${JSON.stringify(created.wire.acks)})`);
      assert.equal(first.calls[0].options.cwd, expected, "the PTY's cwd is the item's session worktree path");
      assert.ok(isUnderMeshSessionWorktreesRoot(fixture.root, expected), "the worktree is under the session lane's ONE root");
      assert.ok(existsSync(expected), "a REAL git worktree was materialised on disk");
      assert.ok(expected.startsWith(meshSessionWorktreesRoot(fixture.root)), "…and it is a prefix-child of that root");

      // RESOLVED, not re-created: a second session on the SAME item reuses the worktree
      // — no `git worktree add` runs at all. (`git worktree list` DOES run: it is door 1,
      // the live-assignment-tree lookup, which finds nothing here.)
      const gitCalls = [];
      const second = createRecordingPtySpawn({ pty: createFakePty() });
      const reused = buildHandler(fixture, {
        options: {
          ptySpawn: second,
          exec: async (args) => {
            gitCalls.push(args);
            if (args[0] === "worktree" && args[1] === "add") throw new Error("git worktree add must not run for an already-materialised worktree");
            return { stdout: "", stderr: "", status: 0 };
          },
        },
      });
      await reused.handler(spawnFrame(fixture, { sessionId: "s-wt-2", itemRef: "50" }));
      assert.equal(reused.wire.acks[0].ok, true, "the second session spawns too");
      assert.equal(second.calls[0].options.cwd, expected, "…in the SAME resolved worktree");
      assert.deepEqual(
        gitCalls.filter((args) => args[0] === "worktree" && args[1] === "add"),
        [],
        "no second `git worktree add` — the existing tree is reused as-is",
      );
    }),
  },

  {
    name: "session-spawn-handler/00 an itemRef whose LIVE ASSIGNMENT WORKTREE exists opens the PTY THERE — the item's real work tree, found by its branch through `git worktree list`, never a fresh detached copy (operator ruling 2026-08-14)",
    run: async () => withSpawnFixture(async (fixture) => {
      // A REAL assignment-lane worktree for item "50", checked out ON the item's one
      // derivable branch — exactly what mesh-worker-execution.mjs's dispatch produces
      // (ADR-015: never detached). Built with the REAL addWorktree + REAL git.
      const assignmentTree = await addWorktree(fixture.root, "asg-live-50", "HEAD", { branch: meshItemBranchName("50") });

      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });
      await handler(spawnFrame(fixture, { sessionId: "s-live", itemRef: "50" }));

      assert.equal(wire.acks[0].ok, true, `the spawn succeeded (acks: ${JSON.stringify(wire.acks)})`);
      assert.equal(
        // Compared by REAL path: `git worktree list` answers with the resolved path, and on macOS
        // the temp root `/var/folders/...` is a symlink to `/private/var/folders/...`.
        realpathSync(ptySpawn.calls[0].options.cwd),
        realpathSync(assignmentTree),
        "the shell opens in the item's LIVE assignment worktree — where the work actually is",
      );
      assert.equal(
        existsSync(meshSessionWorktreePath(fixture.root, "50")),
        false,
        "…and NO session-owned tree is created: there was nothing to fall back to",
      );
    }),
  },

  {
    name: "session-spawn-handler/00 a session worktree is NEVER materialised in the ASSIGNMENT lane's keyspace — the root the startup reclaim enumerates and trusts every directory name in (TECH_DEBT item 47)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });
      await handler(spawnFrame(fixture, { sessionId: "s-keyspace", itemRef: "50" }));

      assert.equal(wire.acks[0].ok, true, "the spawn succeeded");
      const cwd = ptySpawn.calls[0].options.cwd;
      assert.ok(isUnderMeshSessionWorktreesRoot(fixture.root, cwd), "the session's tree is under the SESSION root");
      assert.equal(
        isUnderMeshWorktreesRoot(fixture.root, cwd),
        false,
        "…and NOT under the assignment root, whose every directory name listStrandedWorktreeAssignments reports as a failed/daemon-restarted assignment at each worker start",
      );
      assert.equal(
        existsSync(meshWorktreePath(fixture.root, "session-50")),
        false,
        "the `session-50` directory that made the launcher fabricate a stranded assignment does not exist",
      );
      // The scan's own read, asked directly: the assignment root holds nothing at all.
      assert.equal(
        existsSync(meshWorktreesRoot(fixture.root)),
        false,
        "the assignment lane's root was never even created by a session spawn",
      );
    }),
  },

  {
    name: "session-spawn-handler/00 a traversal-shaped itemRef cannot escape the session worktrees root (SECURITY T3b/F4 — the path is never composed from raw directive text)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });
      await handler(spawnFrame(fixture, { sessionId: "s-traversal", itemRef: "../../../etc/passwd" }));
      // Whether it spawns or fails is not the point; that no path ESCAPES is. BOTH
      // branches assert: a future refusal must not silently turn this into a test that
      // asserts nothing at all.
      if (ptySpawn.calls.length > 0) {
        assert.ok(
          isUnderMeshSessionWorktreesRoot(fixture.root, ptySpawn.calls[0].options.cwd),
          `a hostile ref produced a cwd outside the session worktrees root: ${ptySpawn.calls[0].options.cwd}`,
        );
      } else {
        assert.deepEqual(
          wire.acks.map((a) => [a.ok, a.code]),
          [[false, "session-worktree-failed"]],
          "a hostile ref that does NOT spawn must be a stated coded refusal — never a silent drop",
        );
        assert.equal(
          existsSync(path.join(fixture.root, "..", "..", "..", "etc")),
          false,
          "…and nothing was materialised outside the repo",
        );
      }
    }),
  },

  {
    name: "session-spawn-handler/00 mesh-launcher.mjs registers the handler via client.onSessionSpawn (source), and the REGISTERED handler genuinely spawns when a session-spawn frame arrives on a started worker launcher (behaviour)",
    run: async () => withSpawnFixture(async (fixture) => {
      // (a) the structural half — the registration exists, on the real lane, with the
      //     handler built by the real factory from the real sibling module.
      const implementation = await readFile(path.join(repoRoot, "packages", "mesh", "src", "launcher.mjs"), "utf8");
      const adapter = await readFile(path.join(repoRoot, "packages/core/src/application/bindings/mesh/launcher.mjs"), "utf8");
      for (const text of [implementation, adapter]) assert.match(text, /createMeshLauncher\(\{[^}]*createMeshWorkerSessionSpawnHandler/su);
      const launcherSource = adapter + "\n" + implementation;
      assert.ok(
        /const\s*\{[^}]*createMeshWorkerSessionSpawnHandler[^}]*\}\s*=\s*meshSessionSpawnHandlerServices/.test(adapter)
          && dependencySpecifiers(adapter).some(edge => edge.parameter === "meshSessionSpawnHandlerServices" && edge.specifier === "./session-spawn-handler.mjs"),
        "mesh-launcher.mjs receives createMeshWorkerSessionSpawnHandler from its configured sibling",
      );
      assert.ok(/client\.onSessionSpawn\s*\??\.?\(/.test(launcherSource), "mesh-launcher.mjs calls client.onSessionSpawn(...)");
      assert.ok(
        /createSessionSpawnHandler\s*\(\s*\{[\s\S]*?\bworkerHasRepo,[\s\S]*?\bmeshCheckoutPath,/.test(launcherSource),
        "production supplies the REAL workerHasRepo + meshCheckoutPath as literal keys (the F12 discipline — never test-only seams)",
      );

      // (b) the behavioural half — start the worker launcher, deliver a REAL
      //     session-spawn DOWN-frame over its own client's receive lane, and watch a
      //     PTY open. Nothing about the registration is taken on trust.
      const workspace = await withControlNode(fixture, "control-a");
      await publishNodeRecord(workspace, NODE_ID, { nodeId: NODE_ID, host: NODE_ID, os: "linux", runtimes: [], skills: [], aofVersion: "1.0.0", publishedAt: NOW });
      const transport = createFakeTransport();
      const pty = createFakePty();
      const ptySpawn = createRecordingPtySpawn({ pty });
      const handle = await startLauncher(workspace, {
        ticker: manualTicker(),
        peerPollTicker: manualTicker(),
        globalWorkStoreOptions: { env: fixture.env },
        resolveWorkerStreamTarget: async () => ({ target: "127.0.0.1" }),
        createWorkerWsTransport: () => transport,
        now: () => NOW,
        sessionSpawnHandlerOptions: { ptySpawn },
      });
      try {
        assert.equal(handle.role, "worker", "the fixture node resolves as a worker");
        assert.ok(handle.streamClient != null, "a worker-stream client was constructed");

        transport.deliver(spawnFrame(fixture, { sessionId: "s-launcher" }));
        await waitFor(() => ptySpawn.calls.length === 1, { label: "the launcher-registered handler to spawn a PTY" });

        assert.equal(ptySpawn.calls[0].options.cwd, fixture.root, "the launcher-registered handler opened the PTY in the workspace root");
        await waitFor(
          () => transport.frames.some((f) => f.kind === SESSION_SPAWN_ACK_KIND && f.sessionId === "s-launcher" && f.ok === true),
          { label: "the ok ack to ride the real client's up-channel" },
        );

        // The operator's keystrokes reach it through the launcher's OWN single
        // onTerminalInput registration — the ordering edit, exercised for real.
        transport.deliver({ kind: TERMINAL_INPUT_KIND, sessionId: "s-launcher", bytes: "ls\n" });
        await waitFor(() => pty.writes.length === 1, { label: "the keystroke to reach the launched PTY" });
        assert.deepEqual(pty.writes, ["ls\n"]);

        // …and the OTHER half of that one registration, which no test drove before: a
        // frame for a session the launched lane does NOT own must still reach the
        // ASSIGNMENT input handler. Proven through the REAL handler's own observable —
        // its once-per-session dropped-input log, which the launcher routes into
        // handle.warnings on the `terminal-input` channel.
        transport.deliver({ kind: TERMINAL_INPUT_KIND, sessionId: "s-not-launched", bytes: "y\n" });
        await waitFor(
          () => handle.warnings.some((w) => w.code === "terminal-input" && w.message.includes("s-not-launched")),
          { label: "the unclaimed frame to reach the ASSIGNMENT input handler" },
        );
        assert.equal(pty.writes.length, 1, "…and it never reached the launched PTY");

        // End it through the real lifecycle: this also releases the REAL 30s ping
        // interval production arms, so the launcher leaves no live timer behind.
        pty.fireExit(0);
        await waitFor(
          () => transport.frames.some((f) => f.kind === TERMINAL_FRAME_KIND && f.signal?.sessionId === "s-launcher" && f.signal?.end === true),
          { label: "the end marker from the launcher-wired session" },
        );
      } finally {
        handle.stop();
      }
    }),
  },

  {
    name: "session-spawn-handler/00 a workspace NOT available on this node refuses: no PTY, and a session-spawn-ack { ok:false, code:\"session-repo-unavailable\" } (Examples row 3: ws-unknown → spawn refused)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture, { workspaceId: "ws-unknown" }));

      assert.equal(ptySpawn.calls.length, 0, "no PTY is spawned");
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-repo-unavailable" }]);
    }, { available: false }),
  },

  // ═══ Task 01: session registration lifecycle ═══════════════════════════════

  {
    name: "session-spawn-handler/01 startSession is called immediately after a successful spawn, with the 4-part key (nodeId, workspaceId, assistant, sessionId) and a repo derived from the workspace — read back off disk",
    run: async () => withSpawnFixture(async (fixture) => {
      const { handler } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) } });
      await handler(spawnFrame(fixture));

      const record = await readSessionRecord(fixture.workspace, {
        nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1",
      });
      assert.ok(record != null, "a session record exists at the 4-part key");
      assert.equal(record.nodeId, NODE_ID);
      assert.equal(record.workspaceId, fixture.workspaceId);
      assert.equal(record.assistant, "claude");
      assert.equal(record.sessionId, "s1", "the control-minted sessionId is the fourth key component, not null");
      assert.equal(record.repo, "demo", "repo is derived from the workspace (config.name — the canonical registry field)");
    }),
  },

  {
    name: "session-spawn-handler/01 the session record has the standard 7-key schema — byte-identical in shape to a hook-registered session (no second class)",
    run: async () => withSpawnFixture(async (fixture) => {
      const { handler } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) } });
      await handler(spawnFrame(fixture));
      const record = await readSessionRecord(fixture.workspace, {
        nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1",
      });
      assert.deepEqual(
        Object.keys(record),
        // …plus m50/ADR-008 decision 8's APPENDED eighth. This handler is the THIRD
        // `.sendTerminalFrame(` producer in `packages/core/src/`, so it is exactly the module that must
        // state `relaying: true`: story 03's locked scenario says the record "contains" the
        // seven, and an additive eighth satisfies it as written.
        ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying", "loopRunId"],
        "the frozen 7-key schema, in order",
      );
      assert.equal(record.startedAt, NOW);
      assert.equal(record.lastPingAt, NOW);
    }),
  },

  {
    name: "session-spawn-handler/01 pingSession fires on a 30-SECOND cadence for the PTY's lifetime — and again every subsequent 30s (Examples: s1/s2, 30s ping, 120s TTL)",
    run: async () => withSpawnFixture(async (fixture) => {
      for (const sessionId of ["s1", "s2"]) {
        let clock = NOW;
        const intervals = createManualIntervals();
        const { handler } = buildHandler(fixture, {
          intervals,
          now: () => clock,
          options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) },
        });
        await handler(spawnFrame(fixture, { sessionId }));

        assert.equal(intervals.intervals.length, 1, "exactly one ping interval is armed");
        assert.equal(intervals.intervals[0].ms, 30_000, "the cadence is 30 seconds");
        assert.equal(SESSION_PING_INTERVAL_MS, 30_000, "…sourced from the exported constant, not a duplicated literal");
        assert.equal(DEFAULT_SESSION_TTL_SECONDS, 120, "…four ping windows inside the documented 120s TTL");

        const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId };
        clock = plusSeconds(NOW, 30);
        await intervals.fire();
        assert.equal((await readSessionRecord(fixture.workspace, key)).lastPingAt, clock, "the first tick pings the SAME 4-part key");

        clock = plusSeconds(NOW, 60);
        await intervals.fire();
        const record = await readSessionRecord(fixture.workspace, key);
        assert.equal(record.lastPingAt, clock, "and again every subsequent 30 seconds");
        assert.equal(record.startedAt, NOW, "startedAt is preserved across pings");
      }
    }),
  },

  {
    name: "session-spawn-handler/01 endSession is called on PTY exit and the ping interval is cleared",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const intervals = createManualIntervals();
      const { handler, wire } = buildHandler(fixture, { intervals, options: { ptySpawn: createRecordingPtySpawn({ pty }) } });
      await handler(spawnFrame(fixture));

      const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" };
      assert.ok(await readSessionRecord(fixture.workspace, key), "the record exists while the PTY is live");

      pty.fireExit(0);
      await waitFor(() => wire.ends.length === 1, { label: "the settle to complete" });

      assert.equal(await readSessionRecord(fixture.workspace, key), null, "endSession removed the record");
      assert.equal(intervals.intervals[0].cleared, true, "the ping interval is cleared");
    }),
  },

  {
    name: "session-spawn-handler/01 the launched session appears in the presence sessions[] array the ticker assembles — no extra wiring, no second class",
    run: async () => withSpawnFixture(async (fixture) => {
      const { handler } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) } });
      await handler(spawnFrame(fixture));

      const live = await readLiveSessions(fixture.workspace, NODE_ID, { now: plusSeconds(NOW, 5) });
      const entry = live.find((session) => session.sessionId === "s1");
      assert.ok(entry != null, `sessions[] carries the launched session (got ${JSON.stringify(live)})`);
      assert.equal(entry.workspaceId, fixture.workspaceId);
      assert.equal(entry.assistant, "claude");
      assert.equal(entry.repo, "demo");
    }),
  },

  {
    name: "session-spawn-handler/01 TTL expiry is the backstop for a crashed handler: 120s with no ping and the REAL reaper removes the record",
    run: async () => withSpawnFixture(async (fixture) => {
      const { handler } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) } });
      await handler(spawnFrame(fixture));
      const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" };

      // The handler "crashes": no endSession, no further pings, just time passing.
      const stillLiveAtTtl = await readLiveSessions(fixture.workspace, NODE_ID, { now: plusSeconds(NOW, 120) });
      assert.ok(stillLiveAtTtl.some((s) => s.sessionId === "s1"), "a session AT the TTL is still live (strict >)");

      const reaped = await reapExpiredSessions(fixture.workspace, NODE_ID, { now: plusSeconds(NOW, 121) });
      assert.equal(reaped, 1, "the reaper removed exactly one expired leaf");
      assert.equal(await readSessionRecord(fixture.workspace, key), null, "the crashed handler's session record is gone");
    }),
  },

  // ═══ Task 02: PTY output bridging ══════════════════════════════════════════

  {
    name: "session-spawn-handler/02 PTY output bytes ride sendTerminalFrame under the session's own id, and the REAL wire envelope reaches the control mirror's (nodeId, sessionId) routing tuple",
    run: async () => withSpawnFixture(async (fixture) => {
      // The REAL worker-stream client over a fake transport: the assertions are on the
      // envelope that actually went out, not on a recorder's echo.
      const transport = createFakeTransport();
      const client = createWorkerStreamClient({ transport, nodeId: NODE_ID, workspaceId: fixture.workspaceId, now: () => NOW });
      await client.ensureConnected();

      const pty = createFakePty();
      const handler = createMeshWorkerSessionSpawnHandler({
        loadWs: () => Promise.resolve(fixture.workspace),
        nodeId: NODE_ID,
        workerHasRepo,
        meshCheckoutPath,
        globalWorkStoreOptions: { env: fixture.env },
        sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),
        sendTerminalEnd: (sessionId) => client.sendTerminalEnd(sessionId),
        sendSessionSpawnAck: (result) => client.sendSessionSpawnAck(result),
        ptySpawn: createRecordingPtySpawn({ pty }),
        now: () => NOW,
        setIntervalImpl: createManualIntervals().setIntervalImpl,
      });
      await handler(spawnFrame(fixture));

      pty.emit("hello world");
      await waitFor(() => transport.frames.some((f) => f.kind === TERMINAL_FRAME_KIND), { label: "a terminal frame on the wire" });

      const frame = transport.frames.find((f) => f.kind === TERMINAL_FRAME_KIND);
      assert.equal(frame.nodeId, NODE_ID, "the frame is stamped with THIS node — the mirror routes on (nodeId, sessionId)");
      assert.equal(frame.signal.sessionId, "s1");
      assert.equal(frame.signal.bytes, "hello world", "the bytes ride verbatim");
    }),
  },

  {
    name: "session-spawn-handler/02 multiple output chunks are sent in order (Examples: \"hello\" / \"$ ls\\n\" ride as bytes; the empty-bytes row is the end marker below)",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty }) } });
      await handler(spawnFrame(fixture));

      for (const chunk of ["aaa", "bbb", "ccc"]) pty.emit(chunk);
      await waitFor(() => wire.frames.length === 3, { label: "three terminal frames" });

      assert.deepEqual(
        wire.frames,
        [
          { sessionId: "s1", bytes: "aaa" },
          { sessionId: "s1", bytes: "bbb" },
          { sessionId: "s1", bytes: "ccc" },
        ],
        "three sends, in the order the PTY emitted them",
      );
    }),
  },

  {
    name: "session-spawn-handler/02 on PTY exit the end-of-stream marker fires — the REAL envelope is { sessionId, end: true } on the same terminal-frame kind, so subscribers to (nodeId, \"s1\") receive it (Examples row 2: bytes \"\", end true)",
    run: async () => withSpawnFixture(async (fixture) => {
      const transport = createFakeTransport();
      const client = createWorkerStreamClient({ transport, nodeId: NODE_ID, workspaceId: fixture.workspaceId, now: () => NOW });
      await client.ensureConnected();

      const pty = createFakePty();
      const handler = createMeshWorkerSessionSpawnHandler({
        loadWs: () => Promise.resolve(fixture.workspace),
        nodeId: NODE_ID,
        workerHasRepo,
        meshCheckoutPath,
        globalWorkStoreOptions: { env: fixture.env },
        sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes),
        sendTerminalEnd: (sessionId) => client.sendTerminalEnd(sessionId),
        sendSessionSpawnAck: (result) => client.sendSessionSpawnAck(result),
        ptySpawn: createRecordingPtySpawn({ pty }),
        now: () => NOW,
        setIntervalImpl: createManualIntervals().setIntervalImpl,
      });
      await handler(spawnFrame(fixture));

      pty.fireExit(0);
      await waitFor(
        () => transport.frames.some((f) => f.kind === TERMINAL_FRAME_KIND && f.signal?.end === true),
        { label: "the end marker on the wire" },
      );

      const end = transport.frames.find((f) => f.kind === TERMINAL_FRAME_KIND && f.signal?.end === true);
      assert.equal(end.nodeId, NODE_ID);
      assert.equal(end.signal.sessionId, "s1", "the marker routes to exactly this stream's subscribers");
      assert.equal(end.signal.bytes, undefined, "an end is a fact about the stream, never terminal content");
    }),
  },

  {
    name: "session-spawn-handler/02 a terminal-input frame for this session reaches the PTY (pty.write), and one for a DIFFERENT sessionId does not",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const { handler } = buildHandler(fixture, { options: { ptySpawn: createRecordingPtySpawn({ pty }) } });
      await handler(spawnFrame(fixture));

      assert.equal(handler.handleTerminalInput({ kind: TERMINAL_INPUT_KIND, sessionId: "s1", bytes: "ls\n" }), true, "the frame is claimed by this session's lane");
      assert.deepEqual(pty.writes, ["ls\n"], "pty.write is called with the operator's bytes");

      assert.equal(handler.handleTerminalInput({ kind: TERMINAL_INPUT_KIND, sessionId: "other", bytes: "x" }), false, "a foreign sessionId is NOT claimed (it falls through to the assignment lane)");
      assert.deepEqual(pty.writes, ["ls\n"], "…and never reaches this PTY");
    }),
  },

  {
    name: "session-spawn-handler/02 a BROKEN launched-session lane cannot starve the assignment lane: the launched handler throws on every input frame and every keystroke STILL reaches the assignment input handler (the shipped lane never goes out with the new one)",
    run: async () => withSpawnFixture(async (fixture) => {
      // The measured failure mode this locks: the launched lane was called unguarded
      // inside the SAME try as the fall-through, so a TypeError there became a degrade
      // event AND dropped every assignment keystroke for the daemon's lifetime — a defect
      // in the NEW lane taking out the SHIPPED one, silently.
      for (const [label, brokenHandler] of [
        ["a handler whose input lane THROWS", () => Object.assign(
          async () => {},
          { handleTerminalInput: () => { throw new TypeError("the launched lane is broken"); } },
        )],
        ["a handler with NO input lane at all", () => async () => {}],
      ]) {
        const workspace = await withControlNode(fixture, "control-a");
        await publishNodeRecord(workspace, NODE_ID, { nodeId: NODE_ID, host: NODE_ID, os: "linux", runtimes: [], skills: [], aofVersion: "1.0.0", publishedAt: NOW });
        const transport = createFakeTransport();
        const handle = await startLauncher(workspace, {
          ticker: manualTicker(),
          peerPollTicker: manualTicker(),
          globalWorkStoreOptions: { env: fixture.env },
          resolveWorkerStreamTarget: async () => ({ target: "127.0.0.1" }),
          createWorkerWsTransport: () => transport,
          now: () => NOW,
          createMeshWorkerSessionSpawnHandler: brokenHandler,
        });
        try {
          transport.deliver({ kind: TERMINAL_INPUT_KIND, sessionId: `s-assignment-${label.length}`, bytes: "y\n" });
          await waitFor(
            () => handle.warnings.some((w) => w.code === "terminal-input" && w.message.includes(`s-assignment-${label.length}`)),
            { label: `the assignment lane to still receive the frame with ${label}` },
          );
        } finally {
          handle.stop();
        }
      }
    }),
  },

  // ═══ Task 03: failure and cleanup ══════════════════════════════════════════

  {
    name: "session-spawn-handler/03 workspace not available → no PTY, NO startSession, ack { ok:false, code:\"session-repo-unavailable\" } (Examples row 1)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture, { workspaceId: fixture.workspaceId }));

      assert.equal(ptySpawn.calls.length, 0, "no PTY is spawned");
      assert.equal(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        null,
        "no session is registered",
      );
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-repo-unavailable" }]);
    }, { available: false }),
  },

  {
    name: "session-spawn-handler/03 the node-pty native module fails to load → no session registered, ack { ok:false, code:\"session-spawn-failed\" } (Examples row 2) — driven through the REAL createTerminalSpawn factory with a failing loader",
    run: async () => withSpawnFixture(async (fixture) => {
      // The REAL factory, the REAL failure shape: the loader is what throws, exactly
      // as an unloadable/absent native addon does inside spawnWithLoader.
      const ptySpawn = createTerminalSpawn(() => {
        throw Object.assign(new Error("Cannot find module 'node-pty'"), { code: "MODULE_NOT_FOUND" });
      });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture));

      assert.equal(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        null,
        "no session is registered",
      );
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-spawn-failed" }]);
    }),
  },

  {
    name: "session-spawn-handler/03 pty.spawn throws → no session registered, ack { ok:false, code:\"session-spawn-failed\" } (Examples row 3)",
    run: async () => withSpawnFixture(async (fixture) => {
      // The loader RESOLVES; the spawn itself throws — the second, distinct failure
      // mode, driven through the same real factory.
      const ptySpawn = createTerminalSpawn(async () => ({
        spawn() { throw new Error("posix_spawnp failed"); },
      }));
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture));

      assert.equal(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        null,
        "no session is registered",
      );
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-spawn-failed" }]);
    }),
  },

  {
    name: "session-spawn-handler/03 worktree creation fails for an itemRef → no PTY, no session registered, ack { ok:false, code:\"session-worktree-failed\" } (Examples row 4)",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptySpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const { handler, wire } = buildHandler(fixture, {
        options: {
          ptySpawn,
          // The git exec addWorktree runs, failing exactly as a real `git worktree
          // add` does on a bad base — addWorktree turns a non-zero status into its
          // own coded throw.
          exec: async () => ({ stdout: "", stderr: "fatal: invalid reference: HEAD", status: 128 }),
        },
      });

      await handler(spawnFrame(fixture, { itemRef: "50" }));

      assert.equal(ptySpawn.calls.length, 0, "no PTY is spawned");
      assert.equal(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        null,
        "no session is registered",
      );
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-worktree-failed" }]);
    }),
  },

  {
    name: "session-spawn-handler/03 PTY exit cleans up ALL state: endSession, interval cleared, end:true sent, and every reference to the PTY released (late output rides nothing; the id is spawnable again)",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const intervals = createManualIntervals();
      const wire = createWireRecorder();
      const { handler } = buildHandler(fixture, { wire, intervals, options: { ptySpawn: createRecordingPtySpawn({ pty }) } });
      await handler(spawnFrame(fixture));

      const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" };
      pty.fireExit(0);
      await waitFor(() => wire.ends.length === 1, { label: "the settle to complete" });

      assert.equal(await readSessionRecord(fixture.workspace, key), null, "endSession removed the record");
      assert.equal(intervals.intervals[0].cleared, true, "the ping interval is cleared");
      assert.deepEqual(wire.ends, [{ sessionId: "s1" }], "the end marker is sent exactly once");

      // References released, proven behaviourally rather than by introspection:
      assert.equal(pty.dataListenerCount, 0, "the output subscription is disposed");
      assert.equal(pty.exitListenerCount, 0, "the exit subscription is disposed");
      const framesBefore = wire.frames.length;
      pty.emit("a dying process's last gasp");
      assert.equal(wire.frames.length, framesBefore, "a chunk after the end marker rides nothing");
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "x" }), false, "input can no longer reach the dead PTY");

      // …and the address is free again: the SAME handler accepts the same sessionId
      // rather than refusing it as already-active, which is only true if the registry
      // entry was genuinely released.
      await handler(spawnFrame(fixture));
      assert.deepEqual(
        wire.acks.map((a) => a.ok),
        [true, true],
        "the exited session's id is spawnable again on the SAME handler — nothing was leaked",
      );
    }),
  },

  {
    name: "session-spawn-handler/03 a second session-spawn for the SAME sessionId is refused as { ok:false, code:\"session-already-active\" } — no duplicate PTY, the existing session kept (Examples row 5)",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const ptySpawn = createRecordingPtySpawn({ pty });
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn } });

      await handler(spawnFrame(fixture));
      await handler(spawnFrame(fixture));

      assert.equal(ptySpawn.calls.length, 1, "no duplicate PTY");
      assert.deepEqual(
        wire.acks,
        [
          { sessionId: "s1", ok: true, code: undefined },
          { sessionId: "s1", ok: false, code: "session-already-active" },
        ],
        "the first spawn is acknowledged, the duplicate refused with a stated code",
      );
      assert.ok(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        "the EXISTING session's record is kept, untouched",
      );
      assert.equal(pty.killed, false, "the live PTY is not disturbed by the refused duplicate");
    }),
  },

  {
    name: "session-spawn-handler/03 every refusal path registers NO session and every code is one of the four this story defines",
    run: async () => withSpawnFixture(async (fixture) => {
      const codes = new Set();
      const { handler: unavailable, wire: unavailableWire } = buildHandler(fixture, {
        options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }), workerHasRepo: async () => false },
      });
      await unavailable(spawnFrame(fixture, { sessionId: "s-a" }));
      for (const ack of unavailableWire.acks) codes.add(ack.code);

      const { handler: spawnFailed, wire: spawnFailedWire } = buildHandler(fixture, {
        options: { ptySpawn: createTerminalSpawn(() => { throw new Error("no addon"); }) },
      });
      await spawnFailed(spawnFrame(fixture, { sessionId: "s-b" }));
      for (const ack of spawnFailedWire.acks) codes.add(ack.code);

      const { handler: worktreeFailed, wire: worktreeFailedWire } = buildHandler(fixture, {
        options: {
          ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }),
          exec: async () => ({ stdout: "", stderr: "boom", status: 1 }),
        },
      });
      await worktreeFailed(spawnFrame(fixture, { sessionId: "s-c", itemRef: "50" }));
      for (const ack of worktreeFailedWire.acks) codes.add(ack.code);

      const { handler: duplicate, wire: duplicateWire } = buildHandler(fixture, {
        options: { ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }) },
      });
      await duplicate(spawnFrame(fixture, { sessionId: "s-d" }));
      await duplicate(spawnFrame(fixture, { sessionId: "s-d" }));
      for (const ack of duplicateWire.acks) if (ack.code != null) codes.add(ack.code);

      assert.deepEqual(
        [...codes].sort(),
        ["session-already-active", "session-repo-unavailable", "session-spawn-failed", "session-worktree-failed"],
        "the four coded refusals, and no invented fifth",
      );
      for (const sessionId of ["s-a", "s-b", "s-c"]) {
        assert.equal(
          await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId }),
          null,
          `${sessionId}: a refused spawn registers no session`,
        );
      }
    }),
  },

  {
    name: "session-spawn-handler/03 TWO session-spawns for the SAME sessionId arriving CONCURRENTLY (the way the launcher dispatches them — fire-and-forget, both in one tick) yield exactly ONE PTY, ONE session record, ONE ping interval, and one ok + one session-already-active ack",
    run: async () => withSpawnFixture(async (fixture) => {
      // THE SHAPE THAT WAS BROKEN, and it is the launcher's own: `client.onSessionSpawn`
      // calls this handler WITHOUT awaiting, so two frames in one tick both ran the
      // `liveSessions.has()` check before either had spawned anything. Measured before
      // the fix: 2 PTYs, 2 ok acks, 2 intervals armed and 0 cleared, one PTY orphaned —
      // unreachable for input, still bridging output onto the same sessionId, and its
      // interval pinging (which UPSERTS) forever after the other exited.
      const ptys = [createFakePty({ pid: 1 }), createFakePty({ pid: 2 })];
      let spawned = 0;
      const ptySpawn = createRecordingPtySpawn({});
      const spawnNext = async (bin, args, options) => {
        ptySpawn.calls.push({ bin, args, options });
        // Yield once, as a real async spawn does — the interleaving window itself.
        await Promise.resolve();
        return ptys[spawned++] ?? createFakePty();
      };
      spawnNext.calls = ptySpawn.calls;

      const intervals = createManualIntervals();
      const { handler, wire } = buildHandler(fixture, { intervals, options: { ptySpawn: spawnNext } });

      const frame = spawnFrame(fixture);
      await Promise.all([handler(frame), handler(frame)]);

      assert.equal(spawnNext.calls.length, 1, `exactly ONE PTY is spawned for one sessionId (got ${spawnNext.calls.length})`);
      assert.equal(intervals.intervals.length, 1, `exactly ONE ping interval is armed (got ${intervals.intervals.length}) — a second, orphaned interval resurrects the record every 30s forever`);
      assert.deepEqual(
        [...wire.acks].sort((a, b) => Number(b.ok) - Number(a.ok)),
        [
          { sessionId: "s1", ok: true, code: undefined },
          { sessionId: "s1", ok: false, code: "session-already-active" },
        ],
        "one spawn is acknowledged and the concurrent duplicate is refused with the stated code",
      );

      const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" };
      assert.ok(await readSessionRecord(fixture.workspace, key), "exactly one session record exists");
      assert.equal(ptys[1].dataListenerCount, 0, "the loser never subscribed a second output bridge onto the same sessionId");

      // …and the ONE PTY is the reachable one: input goes where the bytes come from.
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "ls\n" }), true, "the session is claimed for input");
      assert.deepEqual(ptys[0].writes, ["ls\n"], "the keystroke reached the live PTY");
      assert.deepEqual(ptys[1].writes, [], "…and no second, unaddressable PTY exists to strand it in");

      // The whole session tears down cleanly — no interval survives to ping a record back.
      ptys[0].fireExit(0);
      await waitFor(() => wire.ends.length === 1, { label: "the settle to complete" });
      assert.equal(await readSessionRecord(fixture.workspace, key), null, "endSession removed the record…");
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [true], "…and every armed interval is cleared");
    }),
  },

  {
    name: "session-spawn-handler/03 the PTY opens but startSession FAILS → the PTY is killed, no interval is armed, no subscriptions are wired, the ack is { ok:false, code:\"session-spawn-failed\" }, and input for that id is refused",
    run: async () => withSpawnFixture(async (fixture) => {
      const pty = createFakePty();
      const intervals = createManualIntervals();
      // startSession is NOT stubbed — it is the REAL one, made to fail for a real reason:
      // the scoped checkout this FOREIGN-workspace directive repoints to resolves to a
      // workspace whose mesh partition root is an existing FILE, so the record write's
      // own `mkdir` throws exactly as a broken/unwritable store does. Everything on the
      // path (the repoint, the spawn, the registration) is the shipped code.
      const brokenWs = { ...fixture.workspace, globalMeshRoot: path.join(fixture.root, ".gitignore") };
      const { handler, wire } = buildHandler(fixture, {
        intervals,
        options: {
          ptySpawn: createRecordingPtySpawn({ pty }),
          workerHasRepo: async () => true,
          loadWorkspaceImpl: () => Promise.resolve(brokenWs),
        },
      });

      await handler(spawnFrame(fixture, { workspaceId: "ws-foreign" }));

      assert.equal(pty.killed, true, "the PTY is killed — a live shell nobody can see or reach is worse than no shell");
      assert.equal(intervals.intervals.length, 0, "no ping interval is armed for a session that was never registered");
      assert.equal(pty.dataListenerCount, 0, "no output bridge is wired");
      assert.equal(pty.exitListenerCount, 0, "no exit subscription is wired");
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-spawn-failed" }]);
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "x" }), false, "input for the failed session is refused, never written into the killed PTY");
      assert.deepEqual(pty.writes, [], "…and nothing was written into it");
    }),
  },

  {
    name: "session-spawn-handler/03 the worktree IS created and THEN pty.spawn throws → ack { ok:false, code:\"session-spawn-failed\" }, no session registered, no interval — the worktree's success does not launder the spawn's failure",
    run: async () => withSpawnFixture(async (fixture) => {
      const intervals = createManualIntervals();
      const { handler, wire } = buildHandler(fixture, {
        intervals,
        options: { ptySpawn: createTerminalSpawn(async () => ({ spawn() { throw new Error("posix_spawnp failed"); } })) },
      });

      await handler(spawnFrame(fixture, { itemRef: "50" }));

      const worktree = meshSessionWorktreePath(fixture.root, "50");
      assert.ok(existsSync(worktree), "the REAL worktree was materialised first — this is the ordering the scenario needs");
      assert.deepEqual(wire.acks, [{ sessionId: "s1", ok: false, code: "session-spawn-failed" }], "the refusal names the SPAWN, not the worktree");
      assert.equal(
        await readSessionRecord(fixture.workspace, { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s1" }),
        null,
        "no session is registered",
      );
      assert.equal(intervals.intervals.length, 0, "no ping interval is armed");
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "x" }), false, "the id owns nothing");
    }),
  },

  {
    name: "session-spawn-handler/03 TWO DIFFERENT sessions are live at once on ONE handler (task 02's s2 Examples row): each PTY gets its own bytes, its own record, its own interval, and one exiting leaves the other untouched",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptyOne = createFakePty({ pid: 11 });
      const ptyTwo = createFakePty({ pid: 22 });
      let next = 0;
      const spawnBoth = async () => [ptyOne, ptyTwo][next++];
      spawnBoth.calls = [];
      const intervals = createManualIntervals();
      const { handler, wire } = buildHandler(fixture, { intervals, options: { ptySpawn: spawnBoth } });

      await handler(spawnFrame(fixture, { sessionId: "s1" }));
      await handler(spawnFrame(fixture, { sessionId: "s2" }));

      const keyOf = (sessionId) => ({ nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId });
      assert.deepEqual(wire.acks.map((a) => [a.sessionId, a.ok]), [["s1", true], ["s2", true]], "both spawns are acknowledged");
      assert.ok(await readSessionRecord(fixture.workspace, keyOf("s1")), "s1 has its own record");
      assert.ok(await readSessionRecord(fixture.workspace, keyOf("s2")), "s2 has its own record");
      assert.equal(intervals.intervals.length, 2, "two live sessions arm two intervals");

      // INPUT is session-exact in both directions.
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "one\n" }), true);
      assert.equal(handler.handleTerminalInput({ sessionId: "s2", bytes: "two\n" }), true);
      assert.deepEqual(ptyOne.writes, ["one\n"], "s1's PTY got only s1's bytes");
      assert.deepEqual(ptyTwo.writes, ["two\n"], "s2's PTY got only s2's bytes");

      // OUTPUT rides each session's own id.
      ptyOne.emit("from-one");
      ptyTwo.emit("from-two");
      await waitFor(() => wire.frames.length === 2, { label: "both output frames" });
      assert.deepEqual(wire.frames, [{ sessionId: "s1", bytes: "from-one" }, { sessionId: "s2", bytes: "from-two" }]);

      // …and one exiting is a fact about ONE session.
      ptyOne.fireExit(0);
      await waitFor(() => wire.ends.length === 1, { label: "s1's settle" });
      assert.deepEqual(wire.ends, [{ sessionId: "s1" }], "only s1's end marker is sent");
      assert.equal(await readSessionRecord(fixture.workspace, keyOf("s1")), null, "s1's record is gone");
      assert.ok(await readSessionRecord(fixture.workspace, keyOf("s2")), "s2's record is untouched");
      assert.equal(handler.handleTerminalInput({ sessionId: "s2", bytes: "still\n" }), true, "s2 is still reachable");
      assert.deepEqual(ptyTwo.writes, ["two\n", "still\n"]);
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [true, false], "only s1's interval is cleared");
    }),
  },

  {
    name: "session-spawn-handler/03 stopAll() is the GRACEFUL-SHUTDOWN door: every launched PTY killed, every ping interval cleared SYNCHRONOUSLY (before it yields), every session record ended and every end marker sent — the daemon can exit with a launched shell open",
    run: async () => withSpawnFixture(async (fixture) => {
      const ptyOne = createFakePty({ pid: 11 });
      const ptyTwo = createFakePty({ pid: 22 });
      let next = 0;
      const spawnBoth = async () => [ptyOne, ptyTwo][next++];
      const intervals = createManualIntervals();
      const { handler, wire } = buildHandler(fixture, { intervals, options: { ptySpawn: spawnBoth } });

      await handler(spawnFrame(fixture, { sessionId: "s1" }));
      await handler(spawnFrame(fixture, { sessionId: "s2" }));
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [false, false], "both intervals are armed while the shells are open");

      // The SYNCHRONOUS half must be done before stopAll's promise is even inspected —
      // stop() is synchronous by contract, and an interval cleared only in a later
      // microtask keeps the event loop alive on a daemon that is trying to exit.
      const pending = handler.stopAll();
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [true, true], "EVERY ping interval is cleared before stopAll yields");
      assert.equal(ptyOne.killed, true, "s1's PTY is killed before stopAll yields");
      assert.equal(ptyTwo.killed, true, "s2's PTY is killed before stopAll yields");
      assert.equal(ptyOne.dataListenerCount, 0, "s1's output subscription is disposed");
      assert.equal(ptyTwo.exitListenerCount, 0, "s2's exit subscription is disposed");

      await pending;

      const keyOf = (sessionId) => ({ nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId });
      assert.equal(await readSessionRecord(fixture.workspace, keyOf("s1")), null, "s1's record is ended, not left to TTL");
      assert.equal(await readSessionRecord(fixture.workspace, keyOf("s2")), null, "s2's record is ended, not left to TTL");
      assert.deepEqual(
        wire.ends.map((e) => e.sessionId).sort(),
        ["s1", "s2"],
        "each stream's subscribers are told it ended",
      );
      assert.equal(handler.handleTerminalInput({ sessionId: "s1", bytes: "x" }), false, "nothing is reachable afterwards");
      // Idempotent: a second stop (a double SIGTERM, or stop() after a natural exit) is a no-op.
      await handler.stopAll();
      assert.equal(wire.ends.length, 2, "a second stopAll sends no second end marker");
    }),
  },

  {
    name: "session-spawn-handler/03 mesh-launcher's stop() tears down a LAUNCHED shell: a real launcher, a real spawn frame, then stop() — the PTY is killed, the record is ended and the end marker is sent (no orphaned shell, no armed 30s timer holding the daemon open)",
    run: async () => withSpawnFixture(async (fixture) => {
      const workspace = await withControlNode(fixture, "control-a");
      await publishNodeRecord(workspace, NODE_ID, { nodeId: NODE_ID, host: NODE_ID, os: "linux", runtimes: [], skills: [], aofVersion: "1.0.0", publishedAt: NOW });
      const transport = createFakeTransport();
      const pty = createFakePty();
      const intervals = createManualIntervals();
      const handle = await startLauncher(workspace, {
        ticker: manualTicker(),
        peerPollTicker: manualTicker(),
        globalWorkStoreOptions: { env: fixture.env },
        resolveWorkerStreamTarget: async () => ({ target: "127.0.0.1" }),
        createWorkerWsTransport: () => transport,
        now: () => NOW,
        sessionSpawnHandlerOptions: {
          ptySpawn: createRecordingPtySpawn({ pty }),
          setIntervalImpl: intervals.setIntervalImpl,
          clearIntervalImpl: intervals.clearIntervalImpl,
        },
      });

      transport.deliver(spawnFrame(fixture, { sessionId: "s-shutdown" }));
      await waitFor(
        () => transport.frames.some((f) => f.kind === SESSION_SPAWN_ACK_KIND && f.sessionId === "s-shutdown" && f.ok === true),
        { label: "the launched session to come up" },
      );
      const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s-shutdown" };
      assert.ok(await readSessionRecord(workspace, key), "the record exists while the shell is open");
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [false], "the 30s ping interval is armed");

      handle.stop();

      // The synchronous half is done inside stop() itself — this is what lets the process exit.
      assert.equal(pty.killed, true, "stop() killed the launched PTY");
      assert.deepEqual(intervals.intervals.map((i) => i.cleared), [true], "stop() cleared the ping interval");
      // On the SHUTDOWN path the end marker is sent synchronously (before the stream
      // client is stopped) and the record removal is the deferred tail — so the two are
      // waited for independently, each on its own observable.
      await waitFor(
        () => transport.frames.some((f) => f.kind === TERMINAL_FRAME_KIND && f.signal?.sessionId === "s-shutdown" && f.signal?.end === true),
        { label: "the end marker from the shutdown teardown" },
      );
      await waitFor(
        () => !existsSync(sessionRecordPath(workspace, key)),
        { label: "stop() to end the session record rather than leaving it to TTL" },
      );
      assert.equal(await readSessionRecord(workspace, key), null, "stop() ended the session record rather than leaving it to TTL");
    }),
  },

  {
    name: "session-spawn-handler/03 two sessions launched CONCURRENTLY on the SAME item both open — the loser of the `git worktree add` race RESOLVES to the winner's tree instead of being refused session-worktree-failed (the design's headline shared-worktree case)",
    run: async () => withSpawnFixture(async (fixture) => {
      // ONE handler, two frames in one tick, driving the REAL `git worktree add` against
      // the REAL fixture repo — the launcher's own shape (it builds exactly one handler
      // and dispatches fire-and-forget). Measured before the fix:
      //   [{s-b, ok:false, code:"session-worktree-failed"}, {s-a, ok:true}]
      const spawns = createRecordingPtySpawn({});
      const spawnNext = async (bin, args, options) => {
        spawns.calls.push({ bin, args, options });
        return createFakePty();
      };
      spawnNext.calls = spawns.calls;
      const { handler, wire } = buildHandler(fixture, { options: { ptySpawn: spawnNext } });

      await Promise.all([
        handler(spawnFrame(fixture, { sessionId: "s-a", itemRef: "50" })),
        handler(spawnFrame(fixture, { sessionId: "s-b", itemRef: "50" })),
      ]);

      assert.deepEqual(
        wire.acks.map((ack) => ack.ok).sort(),
        [true, true],
        `both concurrent sessions on one item open (acks: ${JSON.stringify(wire.acks)})`,
      );
      const expected = meshSessionWorktreePath(fixture.root, "50");
      assert.deepEqual(
        spawns.calls.map((call) => call.options.cwd),
        [expected, expected],
        "…and both open in the SAME shared worktree, which is what two terminals on one item means",
      );
      assert.ok(existsSync(expected), "the worktree really is on disk");

      // …and the CROSS-PROCESS half, deterministically. Inside one process the resolve is
      // coalesced (above), so no loser exists to observe; a race against ANOTHER process
      // still can, and this drives that branch head-on: a `git worktree add` that creates
      // the directory and THEN exits non-zero, exactly as the second of two concurrent
      // adds does ("fatal: '<path>' already exists"). The tree at the key's path is the
      // postcondition, so the session resolves to it.
      const { mkdirSync, rmSync } = await import("node:fs");
      const loserPath = meshSessionWorktreePath(fixture.root, "77");
      const loserSpawn = createRecordingPtySpawn({ pty: createFakePty() });
      const loser = buildHandler(fixture, {
        options: {
          ptySpawn: loserSpawn,
          exec: async (args) => {
            if (args[0] === "worktree" && args[1] === "add") {
              mkdirSync(loserPath, { recursive: true });
              return { stdout: "", stderr: `fatal: '${loserPath}' already exists`, status: 128 };
            }
            return { stdout: "", stderr: "", status: 0 };
          },
        },
      });
      await loser.handler(spawnFrame(fixture, { sessionId: "s-loser", itemRef: "77" }));
      assert.deepEqual(
        loser.wire.acks,
        [{ sessionId: "s-loser", ok: true, code: undefined }],
        "an add that raced and lost is a RESOLVE, not a session-worktree-failed refusal",
      );
      assert.equal(loserSpawn.calls[0].options.cwd, loserPath, "…and the shell opens in the tree the winner made");

      // The refusal SURVIVES for a genuine failure: a `worktree add` that creates nothing
      // is still session-worktree-failed. (Same injected shape, minus the mkdir.)
      rmSync(loserPath, { recursive: true, force: true });
      const genuine = buildHandler(fixture, {
        options: {
          ptySpawn: createRecordingPtySpawn({ pty: createFakePty() }),
          exec: async (args) => (args[0] === "worktree" && args[1] === "add"
            ? { stdout: "", stderr: "fatal: invalid reference: HEAD", status: 128 }
            : { stdout: "", stderr: "", status: 0 }),
        },
      });
      await genuine.handler(spawnFrame(fixture, { sessionId: "s-genuine", itemRef: "77" }));
      assert.deepEqual(
        genuine.wire.acks,
        [{ sessionId: "s-genuine", ok: false, code: "session-worktree-failed" }],
        "a real add failure that materialises nothing is still refused with a stated code — the tolerance is the POSTCONDITION, never a blanket ignore",
      );
    }),
  },
  // 191/00 task 00 — a spawn for the control's own node opens a local session. Hoisted below.
  ...controlHostsLaunchedSessionTests(),
  // 191/01 tasks 00–02 — a launched session runs Claude with Remote Control on. Hoisted below.
  ...launchedClaudeSessionTests(),
  // 191/03 task 01 (and task 02's E5) — a node ends only a session it launched. Hoisted below.
  ...endLaunchedSessionTests(),
];

// ═══ 191/00 task 00: the control node hosts a launched session (191/ADR-001) ══════════════════
//
// A REAL launcher started as the control node "ctl-1" with a configured relay. Only the edges that
// would bind a socket are injected — the stream server, the relay broker, the loopback push (a
// recorder) and the self-subscription (which hands the test the REAL router the launcher built,
// so delivering an envelope into it is exactly what the subscriber does after parse) — plus the
// PTY, as in every scenario above. The handler, the repo guard, the session records and the
// router are the shipped ones.
const CTL_ID = "ctl-1";
const CTL_WS = "ws-a";
const CTL_SESSION = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";

async function withControlFixture(fn, { relay = true } = {}) {
  return withMeshWorkerExecFixture(async (fixture) => {
    const configPath = path.join(fixture.root, ".aof", "aof.config.json");
    const onDisk = JSON.parse(await readFile(configPath, "utf8"));
    onDisk.mesh = {
      ...onDisk.mesh,
      nodeId: CTL_ID,
      workspaceId: CTL_WS,
      fabric: "direct",
      address: "127.0.0.1",
      relay: { controlNode: CTL_ID, ...(relay ? { url: "ws://127.0.0.1:4999/ws/relay" } : {}) },
    };
    await writeFile(configPath, `${JSON.stringify(onDisk, null, 2)}\n`, "utf8");
    await markRepoPublished(fixture.root, { workspaceId: CTL_WS });
    await seedNodeWorkspaceMembership({ home: fixture.home }, { nodeId: CTL_ID, workspaceId: CTL_WS });
    const workspace = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
    await publishNodeRecord(workspace, CTL_ID, { nodeId: CTL_ID, host: CTL_ID, os: "linux", runtimes: [], skills: [], aofVersion: "1.0.0", publishedAt: NOW });
    const prior = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = fixture.home;
    try {
      return await fn({ ...fixture, workspace });
    } finally {
      if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    }
  }, { milestoneNumber: "191", storySlug: "ctl", storyNumber: "00" });
}

// startControl(fixture, overrides) — the control launcher, with a recorder on every edge.
async function startControl(fixture, { pty = createFakePty(), factory } = {}) {
  const pushes = [];
  const dispatched = [];
  const routers = [];
  const ptySpawn = createRecordingPtySpawn({ pty });
  const intervals = createManualIntervals();
  const handle = await startLauncher(fixture.workspace, {
    ticker: manualTicker(),
    peerPollTicker: manualTicker(),
    propagationTicker: manualTicker(),
    costTicker: manualTicker(),
    controlDispatchReclaimTicker: false,
    terminalIngress: false,
    globalWorkStoreOptions: { env: fixture.env },
    now: () => NOW,
    startControlStreamServer: async () => ({
      stop() {},
      updatePeers() {},
      dispatchDirective: (directive) => { dispatched.push(directive); return { sent: false, code: "target-not-connected" }; },
    }),
    relayMode: async () => ({ stop() {} }),
    createTerminalRelayPushTransport: () => ({ push: (envelope) => { pushes.push(envelope); }, close() {} }),
    startTerminalInputSubscriber: async (router) => { routers.push(router); return { stop() {} }; },
    ...(factory ? { createMeshWorkerSessionSpawnHandler: factory } : {}),
    sessionSpawnHandlerOptions: {
      ptySpawn,
      setIntervalImpl: intervals.setIntervalImpl,
      clearIntervalImpl: intervals.clearIntervalImpl,
    },
  });
  return { handle, pushes, dispatched, routers, ptySpawn, intervals, pty };
}

const CTL_KEY = { nodeId: CTL_ID, workspaceId: CTL_WS, assistant: "claude", sessionId: CTL_SESSION };
const ctlSpawnEnvelope = (nodeId = CTL_ID, sessionId = CTL_SESSION) =>
  buildSessionSpawnEnvelope(nodeId, { sessionId, workspaceId: CTL_WS, assistant: "claude", itemRef: null, at: NOW });
const isOkAck = (sessionId) => (envelope) => envelope.kind === SESSION_SPAWN_ACK_KIND
  && envelope.nodeId === CTL_ID && envelope.signal?.sessionId === sessionId && envelope.signal?.ok === true;

// openLocalSession(control) — deliver the spawn on the relay and wait for its ok ack.
async function openLocalSession(control) {
  assert.equal(control.routers.length, 1, "the launcher subscribed ONE input router to its own broker");
  control.routers[0].apply(ctlSpawnEnvelope());
  await waitFor(() => control.pushes.some(isOkAck(CTL_SESSION)), { label: "the local session's ok ack on the loopback push" });
}

function controlHostsLaunchedSessionTests() {
  return [
    {
      name: "191/00 task00 — a spawn for the control's own node opens a PTY at the workspace's checkout, writes the (ctl-1, ws-a, claude, id) session record and pushes an ok session-spawn-ack to the loopback relay — never dispatchDirective",
      run: async () => withControlFixture(async (fixture) => {
        const control = await startControl(fixture);
        try {
          assert.equal(control.handle.role, "control", "the fixture node resolves as the control");
          await openLocalSession(control);

          assert.equal(control.ptySpawn.calls.length, 1, "one PTY is spawned");
          assert.equal(path.resolve(control.ptySpawn.calls[0].options.cwd), path.resolve(fixture.root), "its cwd is the checkout of ws-a");
          const record = await readSessionRecord(fixture.workspace, CTL_KEY);
          assert.ok(record, "a session record keyed (ctl-1, ws-a, claude, id) is written");
          assert.equal(record.nodeId, CTL_ID);
          assert.equal(record.workspaceId, CTL_WS);
          assert.deepEqual(
            control.pushes.filter((envelope) => envelope.kind === SESSION_SPAWN_ACK_KIND),
            [{ kind: SESSION_SPAWN_ACK_KIND, nodeId: CTL_ID, signal: { sessionId: CTL_SESSION, ok: true, code: null } }],
            "exactly one ok ack, the envelope a worker's ack becomes, under the control's own id",
          );
          assert.equal(control.dispatched.length, 0, "the control's own frame never reaches dispatchDirective");

          // …and the same lane for ANOTHER node still goes down that node's stream, opening nothing here.
          control.routers[0].apply(ctlSpawnEnvelope("wsl-2", "11111111-2222-4333-8444-555555555555"));
          assert.equal(control.dispatched.length, 1, "a frame for another node is dispatched");
          assert.equal(control.dispatched[0].to, "wsl-2");
          assert.equal(control.ptySpawn.calls.length, 1, "…and opens no local PTY");
        } finally {
          control.handle.stop();
        }
      }),
    },
    {
      name: "191/00 task00 — the local session's output reaches the fleet view through the loopback push, and its exit pushes the end marker and ends the record",
      run: async () => withControlFixture(async (fixture) => {
        const control = await startControl(fixture);
        try {
          await openLocalSession(control);
          control.pty.emit("hello");
          await waitFor(
            () => control.pushes.some((e) => e.kind === TERMINAL_FRAME_KIND && e.nodeId === CTL_ID && e.signal?.sessionId === CTL_SESSION && e.signal?.bytes === "hello"),
            { label: "the terminal-frame envelope carrying hello" },
          );
          control.pty.fireExit(0);
          await waitFor(
            () => control.pushes.some((e) => e.kind === TERMINAL_FRAME_KIND && e.nodeId === CTL_ID && e.signal?.sessionId === CTL_SESSION && e.signal?.end === true),
            { label: "the terminal-end envelope for the tuple" },
          );
          await waitFor(() => !existsSync(sessionRecordPath(fixture.workspace, CTL_KEY)), { label: "the session record to be ended" });
          assert.equal(await readSessionRecord(fixture.workspace, CTL_KEY), null, "the session record is ended");
        } finally {
          control.handle.stop();
        }
      }),
    },
    {
      name: "191/00 task00 — keys typed into a local session reach its PTY",
      run: async () => withControlFixture(async (fixture) => {
        const control = await startControl(fixture);
        try {
          await openLocalSession(control);
          control.routers[0].apply(buildTerminalInputEnvelope(CTL_ID, CTL_SESSION, "ls\r"));
          await waitFor(() => control.pty.writes.length === 1, { label: "the keystrokes to reach the local PTY" });
          assert.deepEqual(control.pty.writes, ["ls\r"], "the PTY of the session receives exactly ls\\r");
          assert.equal(control.dispatched.length, 0, "the keys never went down a stream");
        } finally {
          control.handle.stop();
        }
      }),
    },
    {
      name: "191/00 task00 — a control with no mesh.relay.url hosts nothing locally: no handler, no PTY, and a spawn for its own node is refused as before",
      run: async () => withControlFixture(async (fixture) => {
        let built = 0;
        const factory = (...args) => { built += 1; return createMeshWorkerSessionSpawnHandler(...args); };
        const control = await startControl(fixture, { factory });
        try {
          assert.equal(control.handle.role, "control");
          assert.equal(built, 0, "no local session-spawn handler is built without a relay");
          assert.equal(control.routers.length, 0, "and no self-subscription exists for a frame to arrive on");
          assert.equal(control.ptySpawn.calls.length, 0, "no PTY is spawned");
        } finally {
          control.handle.stop();
        }
        // The router as it stands without a local port — the shape every relay-less control had —
        // still refuses the spawn for that session on the outcome lane.
        const refusals = [];
        const router = createTerminalInputRouter({
          dispatchDirective: () => ({ sent: false, code: "target-not-connected" }),
          now: () => NOW,
          onSessionSpawnRefused: (detail) => refusals.push(detail),
        });
        assert.equal(router.apply(ctlSpawnEnvelope()), false);
        assert.deepEqual(refusals, [{ nodeId: CTL_ID, sessionId: CTL_SESSION, code: "session-target-not-connected" }], "the spawn is reported refused for that session, as it was before this story");
      }, { relay: false }),
    },
    {
      name: "191/00 task00 — stopping the control daemon halts its local session: the PTY is killed, its ping interval cleared and its record ended",
      run: async () => withControlFixture(async (fixture) => {
        const control = await startControl(fixture);
        await openLocalSession(control);
        assert.deepEqual(control.intervals.intervals.map((i) => i.cleared), [false], "the 30s ping interval is armed");
        control.handle.stop();
        assert.equal(control.pty.killed, true, "stop() killed the PTY");
        assert.deepEqual(control.intervals.intervals.map((i) => i.cleared), [true], "stop() cleared its ping interval");
        await waitFor(() => !existsSync(sessionRecordPath(fixture.workspace, CTL_KEY)), { label: "stop() to end the session record" });
        assert.equal(await readSessionRecord(fixture.workspace, CTL_KEY), null, "the session record is ended");
        assert.ok(
          control.pushes.some((e) => e.kind === TERMINAL_FRAME_KIND && e.signal?.sessionId === CTL_SESSION && e.signal?.end === true),
          "the end marker reached the loopback push before it closed",
        );
      }),
    },
  ];
}

// ═══ 191/01: a launched session runs Claude with Remote Control on (191/ADR-002) ═════════════════
//
// The node "wsl-2" serving workspace "ws-a", through the SHIPPED handler, repo guard and session
// API — only the PTY, the clock and the ticker are doubles, exactly as above. The typed bytes are
// asserted against the literal lines of the contract (E1/E2), never only against the function
// that produced them.
const LAUNCH_NODE = "wsl-2";
const LAUNCH_WS = "ws-a";
const LAUNCH_ID = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";
const CLAUDE_RC = "claude-remote-control";
const LAUNCH_KEY = { nodeId: LAUNCH_NODE, workspaceId: LAUNCH_WS, assistant: "claude", sessionId: LAUNCH_ID };
const E1_LINE = `exec claude --remote-control aof-0b9e6c1e --session-id ${LAUNCH_ID}\n`;
const E2_LINE = `claude --remote-control aof-0b9e6c1e --session-id ${LAUNCH_ID} & exit\r\n`;

async function withLaunchFixture(fn, { name = "aof" } = {}) {
  return withMeshWorkerExecFixture(async (fixture) => {
    const configPath = path.join(fixture.root, ".aof", "aof.config.json");
    const onDisk = JSON.parse(await readFile(configPath, "utf8"));
    onDisk.name = name;
    onDisk.mesh = { ...onDisk.mesh, nodeId: LAUNCH_NODE, workspaceId: LAUNCH_WS };
    await writeFile(configPath, `${JSON.stringify(onDisk, null, 2)}\n`, "utf8");
    await markRepoPublished(fixture.root, { workspaceId: LAUNCH_WS });
    await seedNodeWorkspaceMembership({ home: fixture.home }, { nodeId: LAUNCH_NODE, workspaceId: LAUNCH_WS });
    const workspace = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
    const prior = process.env.AOF_GLOBAL_HOME;
    process.env.AOF_GLOBAL_HOME = fixture.home;
    try {
      return await fn({ ...fixture, workspace, workspaceId: LAUNCH_WS });
    } finally {
      if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    }
  }, { milestoneNumber: "191", storySlug: "launch", storyNumber: "01" });
}

// A PTY and a wire that write into ONE ordered log, so "the write precedes the ok ack" is read off
// the order things happened in rather than inferred.
function orderedLaunchHandler(fixture, { platform = "darwin", env = { SHELL: "/bin/zsh" }, pty = createFakePty(), options = {} } = {}) {
  const events = [];
  const write = pty.write.bind(pty);
  pty.write = (bytes) => { events.push({ write: String(bytes) }); write(bytes); };
  const ptySpawn = createRecordingPtySpawn({ pty });
  const wire = createWireRecorder();
  const sendAck = wire.sendSessionSpawnAck;
  wire.sendSessionSpawnAck = async (result) => { events.push({ ack: result }); return sendAck(result); };
  const built = buildHandler(fixture, { wire, options: { nodeId: LAUNCH_NODE, ptySpawn, platform, env, ...options } });
  return { ...built, events, pty, ptySpawn };
}

const launchFrame = (overrides = {}) => buildSessionSpawnFrame(LAUNCH_NODE, {
  sessionId: LAUNCH_ID, workspaceId: LAUNCH_WS, assistant: "claude", itemRef: null, launch: CLAUDE_RC, at: NOW, ...overrides,
});

// runHook(args, ctx) — the REAL `aof session` face, its one-line envelope captured off stdout.
async function runHook(args, ctx) {
  const lines = [];
  const original = console.log;
  const originalExitCode = process.exitCode;
  console.log = (line) => lines.push(line);
  try {
    await meshSessionCommand(args, ctx);
  } finally {
    console.log = original;
    process.exitCode = originalExitCode;
  }
  return JSON.parse(lines[lines.length - 1]);
}

function launchedClaudeSessionTests() {
  return [
    // ── task 00 ──
    {
      name: "191/01 task00 — the relay envelope and the router's rebuild carry launch through: a session-spawn envelope for \"wsl-2\" with launch \"claude-remote-control\" is dispatched to wsl-2 carrying it, and a value outside the set is dropped by the rebuild",
      run: async () => {
        const dispatched = [];
        const router = createTerminalInputRouter({ dispatchDirective: (directive) => { dispatched.push(directive); return { sent: true }; }, now: () => NOW });
        router.apply(buildSessionSpawnEnvelope(LAUNCH_NODE, { sessionId: LAUNCH_ID, workspaceId: LAUNCH_WS, assistant: "claude", itemRef: null, launch: CLAUDE_RC, at: NOW }));
        assert.equal(dispatched.length, 1, "one frame dispatched");
        assert.equal(dispatched[0].to, LAUNCH_NODE, "…to wsl-2");
        assert.equal(dispatched[0].launch, CLAUDE_RC, "…carrying the launch");

        // A hand-made envelope that smuggles text past the envelope builder: the router rebuilds
        // through the frame builder, so the frame it dispatches carries no launch at all.
        const smuggled = buildSessionSpawnEnvelope(LAUNCH_NODE, { sessionId: "s-2", workspaceId: LAUNCH_WS, assistant: "claude", itemRef: null, at: NOW });
        smuggled.signal.launch = "bash -i";
        router.apply(smuggled);
        assert.equal(dispatched.length, 2, "the smuggled envelope is still a spawn");
        assert.ok(!Object.hasOwn(dispatched[1], "launch"), "…but its launch is dropped by the rebuild");
      },
    },
    {
      name: "191/01 task00 — E3 · a launch that names anything else opens a bare shell with nothing typed: the built frame has no launch, and a RAW wire frame carrying launch \"bash -i\" opens the operator's shell at 80×24 and receives no write",
      run: async () => withLaunchFixture(async (fixture) => {
        assert.ok(!Object.hasOwn(launchFrame({ launch: "bash -i" }), "launch"), "the frame's launch is absent once built");

        // The worker's receive lane hands the RAW frame on, so the handler applies the set itself.
        const raw = { ...launchFrame({ launch: undefined }), launch: "bash -i" };
        const { handler, wire, ptySpawn, pty } = orderedLaunchHandler(fixture);
        await handler(raw);
        assert.equal(ptySpawn.calls.length, 1, "a PTY opens");
        assert.equal(ptySpawn.calls[0].bin, "/bin/zsh", "…running the operator's shell");
        assert.deepEqual(ptySpawn.calls[0].args, [], "…bare");
        assert.equal(ptySpawn.calls[0].options.cols, 80, "…at the bare-shell width");
        assert.deepEqual(pty.writes, [], "and nothing is typed into it");
        assert.deepEqual(wire.acks, [{ sessionId: LAUNCH_ID, ok: true, code: undefined }], "the spawn is ok — a bare shell, not a refusal");
        await handler.stopAll();
      }),
    },

    // ── task 01 ──
    {
      name: "191/01 task01 — the handler types the line once, before the ok ack: on darwin the PTY receives exactly one write, the darwin line, which precedes the ok session-spawn-ack, and the PTY was opened 200 columns wide",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, events, ptySpawn, pty } = orderedLaunchHandler(fixture, { platform: "darwin" });
        await handler(launchFrame());
        assert.deepEqual(pty.writes, [E1_LINE], "exactly one write, the darwin line (E1)");
        assert.deepEqual(events.map((event) => Object.keys(event)[0]), ["write", "ack"], "the write precedes the ack");
        assert.equal(events[1].ack.ok, true, "…and the ack is ok");
        assert.equal(ptySpawn.calls[0].options.cols, 200, "the PTY was opened 200 columns wide");
        assert.equal(LAUNCH_COLUMNS, 200, "…the width ADR-002 §6 names");
        assert.equal(ptySpawn.calls[0].bin, "/bin/zsh", "the line is typed into the operator's shell — the PTY's program is still the shell (50/ADR-007)");
        await handler.stopAll();
      }),
    },
    {
      name: "191/01 task01 — on win32 the handler types the cmd.exe line (E2) into ComSpec",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, ptySpawn, pty } = orderedLaunchHandler(fixture, { platform: "win32", env: { ComSpec: "C:\\WINDOWS\\system32\\cmd.exe" } });
        await handler(launchFrame());
        assert.equal(ptySpawn.calls[0].bin, "C:\\WINDOWS\\system32\\cmd.exe");
        assert.deepEqual(pty.writes, [E2_LINE]);
        await handler.stopAll();
      }),
    },
    {
      name: "191/01 task01 — a bare-shell spawn types nothing and keeps 80 columns: a frame with no launch → no write, the PTY opened 80 columns by 24 rows",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, ptySpawn, pty } = orderedLaunchHandler(fixture);
        await handler(launchFrame({ launch: undefined }));
        assert.deepEqual(pty.writes, [], "the PTY receives no write");
        assert.equal(ptySpawn.calls[0].options.cols, 80);
        assert.equal(ptySpawn.calls[0].options.rows, 24);
        await handler.stopAll();
      }),
    },
    {
      name: "191/01 task01 — a launch whose line cannot be built refuses and leaves nothing behind: session id \"not-a-uuid\" → a session-spawn-failed ack, no PTY opened, no session record written",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, wire, ptySpawn, intervals } = orderedLaunchHandler(fixture);
        await handler(launchFrame({ sessionId: "not-a-uuid" }));
        assert.deepEqual(wire.acks, [{ sessionId: "not-a-uuid", ok: false, code: "session-spawn-failed" }]);
        assert.equal(ptySpawn.calls.length, 0, "no PTY is opened, so none is left open");
        assert.equal(intervals.intervals.length, 0, "no ping interval is armed");
        assert.equal(await readSessionRecord(fixture.workspace, { ...LAUNCH_KEY, sessionId: "not-a-uuid" }), null, "no session record is written");
        assert.equal(handler.handleTerminalInput({ sessionId: "not-a-uuid", bytes: "x" }), false, "and nothing answers for the id");
      }),
    },
    {
      name: "191/01 task01 — a launch line the PTY refuses to take is session-spawn-failed: the PTY is killed and no record is left",
      run: async () => withLaunchFixture(async (fixture) => {
        const pty = createFakePty();
        pty.write = () => { throw new Error("EIO"); };
        const { handler, wire, intervals } = orderedLaunchHandler(fixture, { pty });
        await handler(launchFrame());
        assert.deepEqual(wire.acks, [{ sessionId: LAUNCH_ID, ok: false, code: "session-spawn-failed" }]);
        assert.equal(pty.killed, true, "the PTY is torn down");
        assert.equal(intervals.intervals.length, 0, "no ping interval is armed");
        assert.equal(await readSessionRecord(fixture.workspace, LAUNCH_KEY), null, "no session record is left");
      }),
    },
    {
      name: "191/01 task01 — E1 · on macOS the node types an exec of claude with Remote Control; E2 · on Windows it types claude and closes the shell after it; on Linux the line is the POSIX one",
      run() {
        const args = { sessionId: LAUNCH_ID, name: "aof-0b9e6c1e" };
        assert.equal(launchCommandLine(CLAUDE_RC, { ...args, platform: "darwin" }), E1_LINE, "E1");
        assert.equal(launchCommandLine(CLAUDE_RC, { ...args, platform: "win32" }), E2_LINE, "E2");
        assert.equal(launchCommandLine(CLAUDE_RC, { ...args, platform: "linux" }), E1_LINE, "Linux is the POSIX line");
      },
    },
    {
      name: "191/01 task01 — it refuses anything it cannot type safely (Examples: a non-UUID id, a name with a shell metacharacter, an empty name, a launch of \"bash\") — and a name that would read as a flag",
      run() {
        const rows = [
          [CLAUDE_RC, "not-a-uuid", "aof-0b9e6c1e"],
          [CLAUDE_RC, LAUNCH_ID, "aof; rm -rf ~"],
          [CLAUDE_RC, LAUNCH_ID, ""],
          ["bash", LAUNCH_ID, "aof-0b9e6c1e"],
          // Beyond the table: `--remote-control [name]` takes an optional value, so a leading dash
          // would be read by claude as an option of its own.
          [CLAUDE_RC, LAUNCH_ID, "--dangerously-skip-permissions"],
        ];
        for (const [launch, sessionId, name] of rows) {
          for (const platform of ["darwin", "win32", "linux"]) {
            assert.equal(launchCommandLine(launch, { sessionId, name, platform }), null, `${launch} / ${sessionId} / ${JSON.stringify(name)} on ${platform} → null`);
          }
        }
      },
    },
    {
      name: "191/01 task01 — E5 · characters outside the class become dashes: a workspace named \"my project!\" names session 0b9e6c1e… \"my-project--0b9e6c1e\", and that is the name the handler types",
      run: async () => withLaunchFixture(async (fixture) => {
        assert.equal(launchSessionName("my project!", LAUNCH_ID), "my-project--0b9e6c1e");
        const { handler, pty } = orderedLaunchHandler(fixture);
        await handler(launchFrame());
        assert.deepEqual(pty.writes, [`exec claude --remote-control my-project--0b9e6c1e --session-id ${LAUNCH_ID}\n`], "the handler derives the name from the workspace it loaded");
        await handler.stopAll();
      }, { name: "my project!" }),
    },
    {
      name: "191/01 task01 — E6 · a long folder name is clipped to 64 and keeps the id; a plain folder name is kept as it is; and the name is readable from the session record alone",
      run: async () => {
        const long = launchSessionName("a".repeat(90), LAUNCH_ID);
        assert.equal(long.length, 64, "64 characters long");
        assert.ok(long.endsWith("-0b9e6c1e"), "…ending -0b9e6c1e");
        assert.equal(launchSessionName("aof", LAUNCH_ID), "aof-0b9e6c1e", "a plain folder name is kept");
        assert.equal(launchSessionName("-rf", LAUNCH_ID), "rf-0b9e6c1e", "a leading dash never survives into the name");
        await withLaunchFixture(async (fixture) => {
          const { handler } = orderedLaunchHandler(fixture);
          await handler(launchFrame());
          const record = await readSessionRecord(fixture.workspace, LAUNCH_KEY);
          assert.equal(launchSessionName(record.repo, record.sessionId), "aof-0b9e6c1e", "the record's repo and id name the session (ADR-002 §3)");
          await handler.stopAll();
        });
      },
    },

    // ── task 02 ──
    {
      name: "191/01 task02 — Claude's hook ping lands on the launcher's record: a launched session registered as (wsl-2, ws-a, claude, id), then the REAL `aof session ping` hook path from that session's cwd → the session index holds exactly one record for ws-a on wsl-2",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, ptySpawn } = orderedLaunchHandler(fixture);
        await handler(launchFrame());
        assert.ok(await readSessionRecord(fixture.workspace, LAUNCH_KEY), "the launcher registered (wsl-2, ws-a, claude, id)");

        // Claude's UserPromptSubmit hook: the payload Claude Code sends — its session id (the one
        // the launcher handed it with --session-id) and its cwd — and nothing else. The node id
        // and workspace id are resolved by the hook path itself, from that cwd.
        const hookCwd = ptySpawn.calls[0].options.cwd;
        const envelope = await runHook(["ping", "--json"], {
          cwd: hookCwd,
          env: fixture.env,
          stdinText: JSON.stringify({ session_id: LAUNCH_ID, cwd: hookCwd, hook_event_name: "UserPromptSubmit" }),
          now: () => plusSeconds(NOW, 5),
          loadWorkspace: (cwd, config) => loadWorkspace(cwd, config, { env: fixture.env }),
        });
        assert.equal(envelope.ok, true, `the hook ping succeeded: ${JSON.stringify(envelope)}`);
        assert.equal(envelope.nodeId, LAUNCH_NODE, "the hook resolved this node");
        assert.equal(envelope.workspaceId, LAUNCH_WS, "…and the launcher's workspace id from the session's cwd");
        assert.equal(envelope.sessionId, LAUNCH_ID, "…under the control-minted id");

        const sessions = await readLiveSessions(fixture.workspace, LAUNCH_NODE, { now: plusSeconds(NOW, 6), config: fixture.workspace.config });
        const index = buildSessionIndex({ nodes: [{ nodeId: LAUNCH_NODE, freshness: "live", presence: { sessions } }] });
        const forWs = index.sessions.filter((entry) => entry.nodeId === LAUNCH_NODE && entry.workspaceId === LAUNCH_WS);
        assert.equal(forWs.length, 1, `exactly one record for ws-a on wsl-2: ${JSON.stringify(forWs)}`);
        assert.equal(forWs[0].sessionId, LAUNCH_ID, "…the launched session, one slot");
        await handler.stopAll();
      }),
    },
    {
      name: "191/01 task02 — E4 · Claude exiting ends the PTY and the session record: the exec'd claude exits 0 → endSession for its key, its ping interval cleared and one terminal end sent",
      run: async () => withLaunchFixture(async (fixture) => {
        const { handler, wire, intervals, pty } = orderedLaunchHandler(fixture);
        await handler(launchFrame());
        assert.ok(await readSessionRecord(fixture.workspace, LAUNCH_KEY), "the launched Claude session is open");
        pty.fireExit(0);
        await waitFor(() => wire.ends.length > 0, { label: "the terminal end" });
        assert.equal(await readSessionRecord(fixture.workspace, LAUNCH_KEY), null, "endSession removed the record for its key");
        assert.equal(intervals.intervals[0].cleared, true, "its ping interval is cleared");
        pty.fireExit(0);
        await Promise.resolve();
        assert.deepEqual(wire.ends, [{ sessionId: LAUNCH_ID }], "exactly one terminal end is sent");
        assert.equal(handler.handleTerminalInput({ sessionId: LAUNCH_ID, bytes: "x" }), false, "nothing is left to type into — no bare shell behind the exec");
      }),
    },
  ];
}

// ═══ 191/03 task 01: a node ends only a session it launched (191/ADR-004 §2) ═════════════════════
//
// The handler is built from the SHIPPED factory (`createSessionSpawnServices`) over the shipped
// session API, with ONE change: `endSession` is wrapped so its calls are counted before they reach
// the real one. "endSession called once" is then a count, and the record on disk is still the real
// outcome. The PTY, the clock and the ticker are doubles, exactly as above.
const END_NODE = "wsl-2";
const END_WS = "ws-a";
const END_A = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";
const END_B = "5d2a7f40-1c3e-4b6a-9e8d-0f1a2b3c4d5e";
const END_STRANGER = "9f8e7d6c-5b4a-4321-8fed-cba987654321";
const endKey = (sessionId) => ({ nodeId: END_NODE, workspaceId: END_WS, assistant: "claude", sessionId });

// endHandler(fixture, { now, ptys }) — a handler whose `endSession` calls are recorded. `clock.at`
// overrides the handler's clock from the moment a lane sets it.
function endHandler(fixture, { now = () => NOW, ptys = [createFakePty({ pid: 11 }), createFakePty({ pid: 22 })], ptySpawn } = {}) {
  const clock = { at: null };
  const endCalls = [];
  const logs = [];
  const { createMeshWorkerSessionSpawnHandler: createCountingHandler } = createSessionSpawnServices({
    createTerminalSpawn,
    loadNodePty: _aofApplication.server.terminalWs.loadNodePty,
    addSessionWorktree: _aofApplication.mesh.worktree.addSessionWorktree,
    meshSessionWorktreePath,
    sessionWorktreeSlug: _aofApplication.mesh.worktree.sessionWorktreeSlug,
    findItemWorktree: _aofApplication.mesh.worktree.findItemWorktree,
    startSession: _aofHooks.meshSession.startSession,
    pingSession: _aofHooks.meshSession.pingSession,
    endSession: async (workspace, key) => {
      endCalls.push(key.sessionId);
      return _aofHooks.meshSession.endSession(workspace, key);
    },
    loadWorkspace,
    resolveWorkspaceId,
    reportDegrade: () => {},
  });
  let next = 0;
  const wire = createWireRecorder();
  const intervals = createManualIntervals();
  const handler = createCountingHandler({
    loadWs: () => Promise.resolve(fixture.workspace),
    nodeId: END_NODE,
    workerHasRepo,
    meshCheckoutPath,
    globalWorkStoreOptions: { env: fixture.env },
    sendTerminalFrame: wire.sendTerminalFrame,
    sendTerminalEnd: wire.sendTerminalEnd,
    sendSessionSpawnAck: wire.sendSessionSpawnAck,
    onLog: (entry) => logs.push(entry),
    now: () => clock.at ?? now(),
    setIntervalImpl: intervals.setIntervalImpl,
    clearIntervalImpl: intervals.clearIntervalImpl,
    ptySpawn: ptySpawn ?? (async () => ptys[next++]),
    platform: "darwin",
    env: { SHELL: "/bin/zsh" },
  });
  const notLaunched = () => logs.filter((entry) => entry.code === "session-end-not-launched");
  return { handler, wire, intervals, ptys, endCalls, logs, notLaunched, clock };
}

// The Background: a handler with launched sessions A and B, each a Claude launch on its own PTY.
async function withTwoLaunched(fn, options) {
  return withLaunchFixture(async (fixture) => {
    const built = endHandler(fixture, options);
    await built.handler(launchFrame({ sessionId: END_A }));
    await built.handler(launchFrame({ sessionId: END_B }));
    assert.deepEqual(built.wire.acks.map((ack) => [ack.sessionId, ack.ok]), [[END_A, true], [END_B, true]], "Background: both sessions are launched");
    return fn({ fixture, ...built });
  });
}

function endLaunchedSessionTests() {
  return [
    // ══ Scenario: ending one session ends only that one ══
    {
      name: "191/03 task01 — ending one session ends only that one: its PTY is killed, its ping interval cleared, its terminal end sent and endSession called once — and the other session is still open and still pinging",
      run: async () => withTwoLaunched(async ({ fixture, handler, wire, intervals, ptys, endCalls, notLaunched, clock }) => {
        const pending = handler.end(END_A);
        // The halt is the shutdown path's own SYNCHRONOUS half: done before `end` yields.
        assert.equal(ptys[0].killed, true, "that session's PTY is killed");
        assert.equal(intervals.intervals[0].cleared, true, "its ping interval is cleared");
        assert.deepEqual(wire.ends, [{ sessionId: END_A }], "its terminal end is sent");
        assert.equal(await pending, true, "end answers that it ended a session it owned");
        assert.deepEqual(endCalls, [END_A], "endSession is called once, for that session");
        assert.equal(await readSessionRecord(fixture.workspace, endKey(END_A)), null, "its record is ended");
        assert.equal(ptys[0].dataListenerCount + ptys[0].exitListenerCount, 0, "every reference to its PTY is released");
        assert.equal(handler.handleTerminalInput({ sessionId: END_A, bytes: "x" }), false, "nothing is left to type into");

        // …and B is untouched: open, reachable, and still pinging.
        assert.equal(ptys[1].killed, false, "the other session's PTY is still open");
        assert.equal(intervals.intervals[1].cleared, false, "the other session's ping interval is still armed");
        assert.ok(await readSessionRecord(fixture.workspace, endKey(END_B)), "the other session's record is still there");
        assert.equal(handler.handleTerminalInput({ sessionId: END_B, bytes: "still\n" }), true, "the other session still takes keys");
        // Its next 30 s ping lands on its own record, at the instant the clock now reads.
        assert.equal((await readSessionRecord(fixture.workspace, endKey(END_B))).lastPingAt, NOW);
        clock.at = plusSeconds(NOW, 30);
        await intervals.intervals[1].fn();
        assert.equal((await readSessionRecord(fixture.workspace, endKey(END_B))).lastPingAt, plusSeconds(NOW, 30), "the other session is still pinging");
        assert.equal(await readSessionRecord(fixture.workspace, endKey(END_A)), null, "…and the ended session's record stays ended");
        assert.deepEqual(wire.ends, [{ sessionId: END_A }], "no end marker is sent for the other session");
        assert.deepEqual(notLaunched(), [], "nothing is logged as not-launched");
        await handler.stopAll();
      }),
    },

    // ══ Scenario: a second end of the same session does nothing more ══
    {
      name: "191/03 task01 — a second end of the same session does nothing more: endSession is still called only once, and session-end-not-launched is logged",
      run: async () => withTwoLaunched(async ({ handler, wire, ptys, endCalls, notLaunched }) => {
        assert.equal(await handler.end(END_A), true, "Given: the handler has ended the session");
        assert.equal(await handler.end(END_A), false, "the second end answers that it ended nothing");
        assert.deepEqual(endCalls, [END_A], "endSession is still called only once");
        assert.deepEqual(wire.ends, [{ sessionId: END_A }], "no second end marker");
        assert.equal(notLaunched().length, 1, "session-end-not-launched is logged");
        assert.match(notLaunched()[0].message, new RegExp(END_A), "…naming the id");
        assert.equal(ptys[1].killed, false, "the other session is untouched by either end");
        await handler.stopAll();
      }),
    },

    // ══ Rule R1 · E4: the id of a terminal-started Claude is not ended ══
    {
      name: "191/03 task01 — E4 · the id of a terminal-started Claude is not ended: a session record written by claude's own hooks, with no launcher PTY → nothing is killed, no record is ended, and session-end-not-launched is logged once",
      run: async () => withTwoLaunched(async ({ fixture, handler, wire, intervals, ptys, endCalls, notLaunched }) => {
        // The record `claude`'s own SessionStart hook writes, through the REAL `aof session` face.
        const hookCwd = fixture.root;
        const started = await runHook(["start", "--json"], {
          cwd: hookCwd,
          env: fixture.env,
          stdinText: JSON.stringify({ session_id: END_STRANGER, cwd: hookCwd, hook_event_name: "SessionStart" }),
          now: () => NOW,
          loadWorkspace: (cwd, config) => loadWorkspace(cwd, config, { env: fixture.env }),
        });
        assert.equal(started.ok, true, JSON.stringify(started));
        const strangerKey = { nodeId: END_NODE, workspaceId: started.workspaceId, assistant: started.assistant, sessionId: END_STRANGER };
        assert.ok(await readSessionRecord(fixture.workspace, strangerKey), "Given: the terminal-started session has a record on this node");

        assert.equal(await handler.end(END_STRANGER), false);

        assert.deepEqual(ptys.map((pty) => pty.killed), [false, false], "nothing is killed");
        assert.deepEqual(endCalls, [], "no record is ended — endSession is never called");
        assert.ok(await readSessionRecord(fixture.workspace, strangerKey), "the terminal-started session's record is still there");
        assert.deepEqual(intervals.intervals.map((interval) => interval.cleared), [false, false], "no ping interval is cleared");
        assert.deepEqual(wire.ends, [], "no end marker is sent");
        assert.equal(notLaunched().length, 1, "session-end-not-launched is logged once");
        await handler.stopAll();
      }),
    },

    // ══ PLAN's known trap: the end must not race the spawn ══
    {
      name: "191/03 task01 — an end for a session whose spawn is still in flight is not owned: it is logged, it is not queued, and the session then opens as if no end had been sent",
      run: async () => withLaunchFixture(async (fixture) => {
        // The spawn is held open INSIDE the handler, at its PTY factory, so the session id is
        // reserved (`pendingSessions`) and nothing is live yet.
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        let entered = false;
        const pty = createFakePty();
        const { handler, wire, endCalls, notLaunched } = endHandler(fixture, {
          ptySpawn: async () => { entered = true; await gate; return pty; },
        });
        const spawning = handler(launchFrame({ sessionId: END_A }));
        await waitFor(() => entered, { label: "the spawn to reach its PTY factory" });
        assert.equal(await handler.end(END_A), false, "the end arrives before the spawn has opened anything");
        assert.equal(notLaunched().length, 1, "it is logged as not launched");
        release();
        await spawning;
        assert.deepEqual(wire.acks.map((ack) => [ack.sessionId, ack.ok]), [[END_A, true]], "the spawn still succeeds");
        assert.equal(pty.killed, false, "the end was not queued: the session is open");
        assert.deepEqual(endCalls, [], "…and its record was never ended");
        assert.ok(await readSessionRecord(fixture.workspace, endKey(END_A)));
        await handler.stopAll();
      }),
    },

    // ══ ADR-004 §1 — both launcher branches hand a received end to the handler's end lane ══
    {
      name: "191/03 task01 — a WORKER launcher registers onSessionEnd: a session-end frame on its stream ends the launched session (PTY killed, record ended, end marker sent), and one for an id it never launched ends nothing",
      run: async () => withSpawnFixture(async (fixture) => {
        const workspace = await withControlNode(fixture, "control-a");
        await publishNodeRecord(workspace, NODE_ID, { nodeId: NODE_ID, host: NODE_ID, os: "linux", runtimes: [], skills: [], aofVersion: "1.0.0", publishedAt: NOW });
        const transport = createFakeTransport();
        const pty = createFakePty();
        const intervals = createManualIntervals();
        const handle = await startLauncher(workspace, {
          ticker: manualTicker(),
          peerPollTicker: manualTicker(),
          globalWorkStoreOptions: { env: fixture.env },
          resolveWorkerStreamTarget: async () => ({ target: "127.0.0.1" }),
          createWorkerWsTransport: () => transport,
          now: () => NOW,
          sessionSpawnHandlerOptions: {
            ptySpawn: createRecordingPtySpawn({ pty }),
            setIntervalImpl: intervals.setIntervalImpl,
            clearIntervalImpl: intervals.clearIntervalImpl,
          },
        });
        try {
          assert.equal(handle.role, "worker", "the fixture node resolves as a worker");
          const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: END_A };
          const notLaunched = () => handle.warnings.filter((warning) => warning.code === "session-end-not-launched");
          transport.deliver(spawnFrame(fixture, { sessionId: END_A }));
          await waitFor(() => existsSync(sessionRecordPath(workspace, key)), { label: "the launched session's record" });

          transport.deliver(buildSessionEndFrame(NODE_ID, { sessionId: END_STRANGER, at: NOW }));
          await waitFor(() => notLaunched().length === 1, { label: "the not-launched log" });
          assert.equal(pty.killed, false, "an end for an id this node never launched kills nothing");
          assert.ok(existsSync(sessionRecordPath(workspace, key)), "…and ends no record");

          transport.deliver(buildSessionEndFrame(NODE_ID, { sessionId: END_A, at: NOW }));
          await waitFor(() => !existsSync(sessionRecordPath(workspace, key)), { label: "the end to remove the session record" });
          assert.equal(pty.killed, true, "the launched session's PTY is killed");
          assert.deepEqual(intervals.intervals.map((interval) => interval.cleared), [true], "its ping interval is cleared");
          assert.ok(
            transport.frames.some((frame) => frame.kind === TERMINAL_FRAME_KIND && frame.signal?.sessionId === END_A && frame.signal?.end === true),
            "the end marker went up the worker's stream",
          );
          assert.equal(notLaunched().length, 1, "only the stranger's id was logged as not launched");
        } finally {
          handle.stop();
        }
      }),
    },
    {
      name: "191/03 task01 — the CONTROL's router ends a local session: a session-end envelope for ctl-1 reaches the local handler's end and never dispatchDirective — the PTY is killed, the record ended and the end marker pushed",
      run: async () => withControlFixture(async (fixture) => {
        const control = await startControl(fixture);
        try {
          await openLocalSession(control);
          assert.equal(control.routers[0].apply(buildSessionEndEnvelope(CTL_ID, { sessionId: CTL_SESSION, at: NOW })), true);
          assert.equal(control.pty.killed, true, "the local session's PTY is killed");
          assert.deepEqual(control.intervals.intervals.map((interval) => interval.cleared), [true], "its ping interval is cleared");
          await waitFor(() => !existsSync(sessionRecordPath(fixture.workspace, CTL_KEY)), { label: "the end to remove the session record" });
          assert.ok(
            control.pushes.some((envelope) => envelope.kind === TERMINAL_FRAME_KIND && envelope.signal?.sessionId === CTL_SESSION && envelope.signal?.end === true),
            "the end marker reached the loopback push",
          );
          assert.deepEqual(control.dispatched, [], "a frame for the control's own node never reaches dispatchDirective");
          // …and an end for another node still goes down that node's stream, never to the local handler.
          control.routers[0].apply(buildSessionEndEnvelope("wsl-2", { sessionId: END_B, at: NOW }));
          assert.deepEqual(control.dispatched, [buildSessionEndFrame("wsl-2", { sessionId: END_B, at: NOW })]);
        } finally {
          control.handle.stop();
        }
      }),
    },

    // ══ 191/03 task02 · Rule R2 · E5: an untouched session is still running and listed the next morning ══
    {
      name: "191/03 task02 — E5 · an untouched session is still running and listed the next morning: started at 09:00 with no input or output since, at 08:00 the next day the handler has not ended it and mesh:session-list still answers it",
      run: async () => withLaunchFixture(async (fixture) => {
        const START = Date.parse("2026-11-12T09:00:00.000Z");
        const MORNING = Date.parse("2026-11-13T08:00:00.000Z");
        let clockMs = START;
        const { handler, wire, intervals, ptys, endCalls } = endHandler(fixture, { now: () => new Date(clockMs).toISOString() });
        await handler(launchFrame({ sessionId: END_A }));
        assert.equal(intervals.intervals.length, 1, "the ping interval is the only timer a launched session arms");

        // 23 hours pass with no key typed and no byte painted: the only thing that runs is the
        // 30 s ping, on its own cadence, every time.
        const typedAtLaunch = ptys[0].writes.length;
        for (clockMs = START + SESSION_PING_INTERVAL_MS; clockMs <= MORNING; clockMs += SESSION_PING_INTERVAL_MS) {
          await intervals.intervals[0].fn();
        }
        clockMs = MORNING;

        assert.equal(ptys[0].killed, false, "the handler has not killed its PTY");
        assert.equal(intervals.intervals[0].cleared, false, "its ping interval is still armed");
        assert.equal(intervals.intervals.length, 1, "…and no second timer was ever armed");
        assert.deepEqual(endCalls, [], "the handler has not ended it");
        assert.deepEqual(wire.ends, [], "no end marker was sent");
        assert.equal(ptys[0].writes.length, typedAtLaunch, "nothing was typed into it either");
        const source = await readFile(path.join(repoRoot, "packages", "mesh", "src", "session-spawn-handler.mjs"), "utf8");
        const code = source.replace(/\/\/[^\n]*/g, "");
        assert.doesNotMatch(code, /setTimeout\s*\(|idle/i, "the handler module arms no timeout and names no idle limit (ADR-004 §5)");

        // `mesh:session-list`, over the presence this node would publish at 08:00.
        const nowIso = new Date(MORNING).toISOString();
        const sessions = (await readLiveSessions(fixture.workspace, END_NODE, { now: nowIso })).map((entry) => ({ ...entry, nodeId: END_NODE }));
        assert.ok(sessions.some((entry) => entry.sessionId === END_A), `the node's presence still carries it (got ${JSON.stringify(sessions)})`);
        const realNow = Date.now;
        Date.now = () => MORNING;
        try {
          const { meshSessionListCommand } = createMeshSessionVerbs({
            queryGlobalMeshStatus: async () => ({
              workspaces: [{ workspaceId: END_WS, projectRoot: fixture.root, name: "aof" }],
              nodes: [{ nodeId: END_NODE, freshness: "live", presence: { sessions } }],
              sessions,
            }),
            isSessionLive: _aofHooks.meshSession.isSessionLive,
            resolveSessionTtlSeconds: _aofHooks.meshSession.resolveSessionTtlSeconds,
            reportDegrade: () => {},
          });
          const listed = await meshSessionListCommand.run({}, { workspace: { config: {} } });
          assert.deepEqual(listed.sessions.map((entry) => entry.sessionId), [END_A], "mesh:session-list still answers it");
          assert.equal(listed.sessions[0].name, launchSessionName("aof", END_A), "…by the name `/session end` takes");
        } finally {
          Date.now = realNow;
        }
        // …so `/session end` is how it is ended: the end lane still owns it, a day later.
        assert.equal(await handler.end(END_A), true);
        assert.equal(ptys[0].killed, true);
        assert.deepEqual(endCalls, [END_A]);
      }),
    },
  ];
}
