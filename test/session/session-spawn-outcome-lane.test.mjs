// Traceability wiring for milestone 50 / story 04 — task 00
// (tasks/00_spawn-outcome-and-producer-fact.feature, @executable), LANES A and B.
//
// ARCHITECTURE 50/ADR-008: the ack lane (decisions 1-7) and the producer fact
// (decisions 8-9). The five fitness functions this task owes live in their own files
// (acd-session-spawn-ack-has-reader, acd-wire-kind-has-both-ends,
// acd-session-producer-fact-survives-the-wire, the four route-table detectors, and the
// amended acd-terminal-output-signal-source); this file is the BEHAVIOURAL half.
//
// ═══ WHAT "END TO END" MEANS HERE, AND WHERE IT STOPS ═════════════════════════════════
// The defect this story closes is precisely that BOTH HALVES WERE GREEN WHILE THE LANE DID
// NOT EXIST: the worker built and sent a `session-spawn-ack` with a passing unit test, and
// the control had a working `applyStreamFrame`, and nothing joined them. So no scenario
// below calls a sink directly and calls that a lane. A worker frame is driven in at the
// control stream server's OWN message seam — a real admitted WebSocket into a real
// `startControlStreamServer` — and the envelope that comes out the other side is handed to
// the REAL `serveMeshUi` process's relay-subscriber consumer, then read back over the REAL
// HTTP route.
//
// The ONE leg not exercised in-process is the relay BROKER's own socket, which is the same
// leg every other relay lane in this repo leaves to the @manual two-machine soak (and the
// same leg mesh-ui-session-route.test.mjs stops at for the DOWN direction). Everything on
// either side of it is real code here.
//
// ISOLATION: every scenario runs under a fresh `AOF_GLOBAL_HOME` (the guard hook requires
// it, and lane B writes real session records). No scenario binds :4181 or :4182.
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { suitePathByBasename } from "../support/registration/registration-surface.mjs";

import { serveMeshUi, meshUiDist } from "../../src/mesh/ui-serve.mjs";
import { startControlStreamServer, applyStreamFrame, applyPresenceFrame, sendDirective } from "../../src/control-stream-server.mjs";
import { createTerminalInputRouter } from "../../src/mesh/terminal-input.mjs";
import {
  SESSION_SPAWN_KIND,
  SESSION_SPAWN_ACK_KIND,
  buildSessionSpawnFrame,
  buildSessionSpawnAckFrame,
  buildSessionSpawnEnvelope,
  buildSessionSpawnAckEnvelope,
} from "../../src/mesh/session-spawn-directive.mjs";
import {
  createSpawnOutcomeRegistry,
  MAX_SPAWN_OUTCOMES,
  SPAWN_OUTCOME_RETENTION_MS,
} from "../../src/mesh/session-spawn-outcome.mjs";
import { startSession, pingSession, endSession, readSessionRecord, assembleSessionRecord } from "../../src/mesh/session.mjs";
import { readLiveSessions } from "../../src/mesh/presence.mjs";
import { buildSessionIndex } from "../../src/global-mesh-query.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { createMeshWorkerSessionSpawnHandler } from "../../src/mesh/session-spawn-handler.mjs";
import { workerHasRepo, meshCheckoutPath } from "../../src/mesh/worker-execution.mjs";
import {
  withMeshWorkerExecFixture,
  markRepoPublished,
  seedNodeWorkspaceMembership,
} from "../support/mesh-worker-exec-fixture.mjs";
import { homeGridRows, dialableTiles } from "../../ui/src/home/grid.mjs";
import { homeSessionMount } from "../../ui/src/home/session-mount.mjs";
import { feedAxisFor, FEED_PRODUCER_KNOWN, FEED_NO_PRODUCER, FEED_AXIS_VALUES } from "../../ui/src/home/feed-axis.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NODE_ID = "worker-a";
const NOW = "2026-08-14T12:00:00.000Z";

// ─────────────────────────────────────────────────────────── lane A fixtures ────

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(path.join(dir, "index.html"), "<!doctype html><html><body><div id=\"root\"></div></body></html>\n", "utf8");
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

async function writeRepo(root) {
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { workspaceId: "ws-aof" } }, null, 2)}\n`,
    "utf8",
  );
}

// withOutcomeFace(fn, { connected }) — the REAL fleet face, with its ONE relay subscriber
// seam wired the way `commands/mesh-ui.mjs` wires it: an async function handed the
// consumer and returning a handle with a live `connected` getter. Capturing the CONSUMER
// is what makes this a lane test rather than a route test — a frame goes in where the
// broker would deliver it, and comes out of the HTTP route.
//
// `connected` is a getter on the handle, mirroring `startTerminalMirrorSubscriber`'s own
// (mesh-terminal-mirror.mjs), so the "lane cannot hear" row reads the CURRENT state rather
// than a boot-time snapshot.
async function withOutcomeFace(fn, { connected = true } = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-spawn-outcome-"));
  const home = path.join(tmp, "home");
  const distRoot = path.join(tmp, "dist");
  const projectDir = path.join(tmp, "repo");
  let server;
  try {
    await writeRepo(projectDir);
    await writeDist(meshUiDist(distRoot));
    let consumer = null;
    let live = connected;
    const started = await serveMeshUi({
      projectDir,
      port: 0,
      repoRoot: distRoot,
      scope: "global",
      globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
      startTerminalRelaySubscriber: async (handed) => {
        consumer = handed;
        return { get connected() { return live; }, stop() {} };
      },
    });
    server = started.server;
    return await fn({
      url: started.url,
      spawnOutcomes: started.spawnOutcomes,
      // `deliver` is the broker's far side: what the relay would hand the subscriber.
      deliver: (envelope) => consumer.apply(envelope),
      setConnected: (value) => { live = value; },
      outcome: async (nodeId, sessionId, init) => {
        const target = new URL("/api/mesh/session-outcome", started.url);
        if (nodeId != null) target.searchParams.set("nodeId", nodeId);
        if (sessionId != null) target.searchParams.set("sessionId", sessionId);
        return fetch(target, init);
      },
      request: async (query, init) => fetch(new URL(`/api/mesh/session-outcome${query}`, started.url), init),
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(tmp, { recursive: true, force: true });
  }
}

// withControlSocket(fn, { onSessionSpawnAck }) — a REAL control stream server with a REAL
// admitted worker socket. The wiring expression handed in is the LAUNCHER'S OWN, verbatim,
// so what this drives is the production shape and not a paraphrase of it.
async function withControlSocket(fn, { nodeId = "n1", onSessionSpawnAck, onFrameSkipped = () => {} } = {}) {
  const server = await startControlStreamServer({
    port: 0,
    bindAddress: "127.0.0.1",
    resolveOrigin: () => ({ authoritative: true, nodeId }),
    onSessionSpawnAck,
    onFrameSkipped,
  });
  const socket = new WebSocket(`ws://127.0.0.1:${server.server.address().port}/`);
  try {
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return await fn({ socket });
  } finally {
    try { socket.close(); } catch { /* already closing */ }
    await server.stop?.();
  }
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

// ─────────────────────────────────────────────────────────── lane B fixtures ────

function createFakePty({ pid = 4242 } = {}) {
  const dataListeners = new Set();
  const exitListeners = new Set();
  return {
    pid,
    onData(cb) { dataListeners.add(cb); return { dispose() { dataListeners.delete(cb); } }; },
    onExit(cb) { exitListeners.add(cb); return { dispose() { exitListeners.delete(cb); } }; },
    write() {},
    kill() {},
    fireExit(exitCode = 0) { for (const cb of [...exitListeners]) cb({ exitCode }); },
  };
}

function createManualIntervals() {
  const intervals = [];
  return {
    intervals,
    setIntervalImpl(fn, ms) { const handle = { fn, ms, cleared: false }; intervals.push(handle); return handle; },
    clearIntervalImpl(handle) { if (handle != null) handle.cleared = true; },
    async fire(index = 0) { await intervals[index].fn(); },
  };
}

async function withSpawnFixture(fn) {
  return withMeshWorkerExecFixture(async (fixture) => {
    await markRepoPublished(fixture.root, { workspaceId: fixture.workspaceId });
    await seedNodeWorkspaceMembership({ home: fixture.home }, { nodeId: NODE_ID, workspaceId: fixture.workspaceId });
    const workspace = await loadWorkspace(fixture.root, undefined, { env: fixture.env });
    return fn({ ...fixture, workspace });
  }, { milestoneNumber: "50", storySlug: "outcome", storyNumber: "04" });
}

export const sessionSpawnOutcomeLaneTests = [
  // ═══════════════ LANE A · THE ACK REACHES A READER ═══════════════════════════════

  {
    // THE HEADLINE, and it is end-to-end over the seams that already carry bytes because
    // the defect this closes is precisely that each half was green while the lane did not
    // exist.
    name: "50/04 task 00 lane A: a worker's failed spawn ack travels the shipped relay and is readable at the outcome route",
    async run() {
      await withOutcomeFace(async ({ deliver, outcome, spawnOutcomes }) => {
        const pushed = [];
        await withControlSocket(async ({ socket }) => {
          socket.send(JSON.stringify(buildSessionSpawnAckFrame({
            sessionId: "s-1",
            nodeId: "n1",
            ok: false,
            code: "session-repo-unavailable",
          })));
          await waitFor(() => pushed.length === 1, { label: "the control to push one relay envelope" });
        }, {
          nodeId: "n1",
          // THE LAUNCHER'S PRODUCTION EXPRESSION, verbatim (mesh-launcher.mjs's literal key):
          // re-stamp with the CONNECTION-bound nodeId and push the envelope into the broker.
          onSessionSpawnAck: (frame, { nodeId }) => pushed.push(buildSessionSpawnAckEnvelope(nodeId, frame)),
        });

        assert.equal(pushed.length, 1, "the control pushed EXACTLY ONE relay envelope");
        assert.deepEqual(
          Object.keys(pushed[0]),
          ["kind", "nodeId", "signal"],
          "the envelope is the FROZEN three-key shape — no fourth TOP-LEVEL key, because the relay's parseEnvelope reads only { kind, nodeId } (ADR-014 invariant 2)",
        );
        assert.deepEqual(
          pushed[0],
          { kind: SESSION_SPAWN_ACK_KIND, nodeId: "n1", signal: { sessionId: "s-1", ok: false, code: "session-repo-unavailable" } },
          "…with sessionId, ok and code all INSIDE `signal`",
        );

        // THE BROKER'S FAR SIDE: the mesh-ui process's one subscriber hands it on.
        assert.equal(deliver(pushed[0]), true, "the registry's apply accepts the envelope and returns true");

        const response = await outcome("n1", "s-1");
        assert.equal(response.status, 200, "the outcome route answers 200");
        const body = await response.json();
        assert.deepEqual(
          { ok: body.ok, nodeId: body.nodeId, sessionId: body.sessionId, state: body.state, code: body.code },
          { ok: true, nodeId: "n1", sessionId: "s-1", state: "failed", code: "session-repo-unavailable" },
          "…with the worker's own coded reason, at the tuple the browser is waiting on",
        );
        assert.ok(typeof body.at === "string" && Number.isFinite(Date.parse(body.at)), "…and the ack's instant");

        // NOTHING WAS WRITTEN. The registry holds the outcome in memory and the process
        // owns no record for it — a fresh registry answers null for the same tuple, which
        // is the ephemerality claim stated as a behaviour rather than as a comment.
        assert.notEqual(spawnOutcomes.read("n1", "s-1"), null, "the face's OWN registry is the one that answered (not a rebuilt twin)");
        assert.equal(createSpawnOutcomeRegistry().read("n1", "s-1"), null, "a freshly constructed registry knows nothing — there is no store behind this lane");
      });
    },
  },

  {
    // THE FALSE DIAGNOSTIC THE MILESTONE SHIPS TODAY, DELETED — asserted as a BEHAVIOUR
    // rather than as a diff, because the sentence is what an operator reads.
    name: "50/04 task 00 lane A: the ack is branched before any store apply, so it never reaches the unknown-kind path",
    async run() {
      const acks = [];
      const skips = [];
      await withControlSocket(async ({ socket }) => {
        socket.send(JSON.stringify(buildSessionSpawnAckFrame({ sessionId: "s-1", nodeId: "n1", ok: false, code: "session-worktree-failed" })));
        await waitFor(() => acks.length === 1, { label: "the ack sink" });
        // Give the (absent) store-apply path a generous window to fire its diagnostic. A
        // negative assertion taken in the same tick would be green for the wrong reason.
        await new Promise((resolve) => setTimeout(resolve, 50));
      }, {
        nodeId: "n1",
        onSessionSpawnAck: (frame, meta) => acks.push({ frame, meta }),
        onFrameSkipped: (skip) => skips.push(skip),
      });

      assert.equal(acks.length, 1, "the ack sink is called EXACTLY ONCE");
      assert.equal(acks[0].frame.kind, SESSION_SPAWN_ACK_KIND, "…with the frame");
      assert.equal(acks[0].meta.nodeId, "n1", "…and the connection's nodeId");
      assert.deepEqual(skips, [], "the frame-skipped sink is NOT called — the ack never reaches applyStreamFrame's refusal path");

      // …AND THE WARNING THE LAUNCHER WOULD HAVE EMITTED. The sentence is reconstructed
      // from the launcher's own template so this asserts the OPERATOR-VISIBLE string, not
      // merely the callback count: with no skip, there is nothing to build it from.
      const sentences = skips.map((skip) => `Refused a ${skip?.kind ?? "stream"} frame from ${skip?.nodeId ?? "an unknown node"} for workspace ${skip?.workspaceId ?? "(none)"} — this node has no registered descriptor for that workspace, so the frame's items were DISCARDED.`);
      assert.deepEqual(sentences, [], "no warning containing \"items were DISCARDED\" or \"no registered descriptor\" is emitted — three of that sentence's four claims were false (there is no workspace on this frame, no descriptor is required for it, and it carries no items)");

      // THE NEGATIVE HALF: the fix is a BRANCH BEFORE the apply, never a new row in the
      // persist table. ADR-002 decision 6's no-persist clause and ADR-004 decision 5's
      // "only the worker writes a session record" both stand.
      const applied = await applyStreamFrame({ paths: {} }, buildSessionSpawnAckFrame({ sessionId: "s-1", nodeId: "n1", ok: false, code: "session-worktree-failed" }), { now: NOW, nodeId: "n1" });
      assert.deepEqual(
        applied,
        { published: false, skipped: true, code: "unknown-frame-kind" },
        "applyStreamFrame's kind table STILL does not recognise the ack — a direct call answers unknown-frame-kind, which is what makes the branch the fix",
      );
    },
  },

  {
    // F17, AT A SECOND ADDRESS. The byte lane already re-stamps; a lane that did not would
    // let any admitted worker refuse another node's pending spawn.
    name: "50/04 task 00 lane A: an admitted worker cannot resolve another node's pending spawn",
    async run() {
      await withOutcomeFace(async ({ deliver, outcome }) => {
        const pushed = [];
        // The browser is waiting on ("n1","s-1"); the connection is bound to "n2".
        await withControlSocket(async ({ socket }) => {
          socket.send(JSON.stringify(buildSessionSpawnAckFrame({ sessionId: "s-1", nodeId: "n1", ok: false, code: "session-spawn-failed" })));
          await waitFor(() => pushed.length === 1, { label: "the control to push the envelope" });
        }, {
          nodeId: "n2",
          onSessionSpawnAck: (frame, { nodeId }) => pushed.push(buildSessionSpawnAckEnvelope(nodeId, frame)),
        });

        assert.equal(pushed[0].nodeId, "n2", "the envelope carries the CONNECTION-bound identity — the worker's self-declared \"n1\" is discarded");
        deliver(pushed[0]);

        const forged = await (await outcome("n2", "s-1")).json();
        assert.equal(forged.state, "failed", "the registry holds an entry at (\"n2\", \"s-1\")");
        const victim = await (await outcome("n1", "s-1")).json();
        assert.equal(victim.state, "pending", "…and NOTHING at (\"n1\", \"s-1\") — the outcome route still answers pending for the tuple the browser is waiting on");
        assert.equal(victim.code, null, "…with no code");
      });
    },
  },

  {
    // THE ONE OUTCOME ONLY THE CONTROL CAN SEE (decision 3). The presence-lie window
    // closed: presence said `live` inside its 60s ramp, the stream was already gone, and
    // the only trace was a log line in a process no browser talks to.
    name: "50/04 task 00 lane A: a dispatch the router could not route becomes a synthesised refusal on the same lane",
    async run() {
      await withOutcomeFace(async ({ deliver, outcome }) => {
        const refusals = [];
        const pushed = [];
        const router = createTerminalInputRouter({
          // The dispatch seam reports NOT SENT — the target's admitted stream is gone.
          dispatchDirective: () => ({ sent: false, code: "session-target-not-connected" }),
          now: () => NOW,
          onLog: () => {},
          // THE LAUNCHER'S PRODUCTION EXPRESSION for this key, verbatim.
          onSessionSpawnRefused: (refusal) => {
            refusals.push(refusal);
            pushed.push(buildSessionSpawnAckEnvelope(refusal.nodeId, { sessionId: refusal.sessionId, ok: false, code: refusal.code }));
          },
        });

        const applied = router.apply(buildSessionSpawnEnvelope("n1", buildSessionSpawnFrame("n1", {
          sessionId: "s-1",
          workspaceId: "ws-aof",
          assistant: "claude",
          itemRef: null,
          at: NOW,
        })));
        assert.equal(applied, false, "the router reports the frame unrouted");
        assert.deepEqual(
          refusals,
          [{ nodeId: "n1", sessionId: "s-1", code: "session-target-not-connected" }],
          "`onSessionSpawnRefused` is called ONCE with the tuple and the code",
        );

        assert.deepEqual(
          pushed,
          [{ kind: SESSION_SPAWN_ACK_KIND, nodeId: "n1", signal: { sessionId: "s-1", ok: false, code: "session-target-not-connected" } }],
          "the launcher's wiring pushes a session-spawn-ack envelope with ok:false and that code — the SAME kind, the SAME envelope and the SAME registry as a worker's own ack, so the browser needs exactly ONE reader for both",
        );
        deliver(pushed[0]);

        const body = await (await outcome("n1", "s-1")).json();
        assert.equal(body.state, "failed", "the outcome route answers failed for that tuple");
        assert.equal(body.code, "session-target-not-connected", "…with the control-synthesised code");

        // NO `source` FIELD DISTINGUISHES IT, and none is needed: this code is one no worker
        // can mint (the worker's four are disjoint from it), so the two producers stay
        // distinguishable by CODE rather than by a claim the registry would have to trust.
        assert.deepEqual(
          Object.keys(pushed[0].signal).sort(),
          ["code", "ok", "sessionId"],
          "the synthesised envelope carries no `source`/`origin`/`author` field — a worker's ack and the control's are byte-identical in shape",
        );
        const workerCodes = ["session-repo-unavailable", "session-already-active", "session-worktree-failed", "session-spawn-failed"];
        assert.ok(!workerCodes.includes("session-target-not-connected"), "…and the code itself is disjoint from every code a worker can mint");
      });
    },
  },

  {
    // THE SECOND FAILURE EXIT, and it is driven through the REAL `sendDirective` rather than
    // a hand-thrown error, because the whole question is whether the throw is REACHABLE.
    //
    // It is: `sendDirective` (control-stream-server.mjs) tests `ws.readyState !== OPEN` and
    // THEN calls `ws.send(...)`. A socket that transitions OPEN -> CLOSING between those two
    // statements passes the guard and throws out of the send. So the socket below is OPEN to
    // the guard and throws on `send` — that is the race, not a fabrication of it.
    //
    // Before the architect's ruling (review 2026-08-14) this path reported a degrade and
    // returned false: the control observed the fault and told nobody, and the browser waited
    // out its full window and then rendered "the node has reported nothing" — a false
    // sentence about a fact this process held. The refusal now rides the SAME lane, with the
    // SAME code, so the browser still needs exactly one reader.
    name: "50/04 task 00 lane A: a dispatch that THROWS mid-send becomes the same synthesised refusal on the same lane",
    async run() {
      await withOutcomeFace(async ({ deliver, outcome }) => {
        const refusals = [];
        const pushed = [];
        // The targeting map's socket: OPEN when `sendDirective` looks, dead when it writes.
        const closingSocket = {
          readyState: WebSocket.OPEN,
          send() { throw new Error("WebSocket is not open: readyState 2 (CLOSING)"); },
        };
        const targets = new Map([["n1", closingSocket]]);

        // NON-VACUITY: the REAL seam really does throw on this shape — if a future
        // `sendDirective` caught it internally, the row below would be testing nothing.
        assert.throws(
          () => sendDirective(targets, "n1", { kind: "session-spawn", to: "n1" }),
          /readyState 2/,
          "the REAL sendDirective throws when the socket dies between the readyState guard and the send — this is the reachable race, not a synthetic error",
        );

        const router = createTerminalInputRouter({
          dispatchDirective: (directive) => sendDirective(targets, directive.to, directive),
          now: () => NOW,
          onLog: () => {},
          // THE LAUNCHER'S PRODUCTION EXPRESSION for this key, verbatim — the same one the
          // not-sent row above drives, because the point of the ruling is that these two
          // exits are ONE fact for the browser.
          onSessionSpawnRefused: (refusal) => {
            refusals.push(refusal);
            pushed.push(buildSessionSpawnAckEnvelope(refusal.nodeId, { sessionId: refusal.sessionId, ok: false, code: refusal.code }));
          },
        });

        let applied;
        assert.doesNotThrow(() => {
          applied = router.apply(buildSessionSpawnEnvelope("n1", buildSessionSpawnFrame("n1", {
            sessionId: "s-throw",
            workspaceId: "ws-aof",
            assistant: "claude",
            itemRef: null,
            at: NOW,
          })));
        }, "the dispatch's exception never escapes apply — the never-throws discipline is unchanged");
        assert.equal(applied, false, "the router reports the frame unrouted");

        assert.deepEqual(
          refusals,
          [{ nodeId: "n1", sessionId: "s-throw", code: "session-target-not-connected" }],
          "`onSessionSpawnRefused` fires ONCE from the THROW path too, with the same tuple and the SAME code — the send failed because the target's socket is unusable, which is what that code means",
        );

        deliver(pushed[0]);
        const body = await (await outcome("n1", "s-throw")).json();
        assert.equal(body.state, "failed", "the outcome route answers failed for that tuple — the browser reads an ANSWER rather than waiting out its window into `no answer`");
        assert.equal(body.code, "session-target-not-connected", "…with the control-synthesised code, byte-identical to the not-sent exit's");

        // …AND THE FAILURE MAP NEEDS NO NEW ROW: the two exits are indistinguishable to the
        // browser, which is the whole reason the ruling reused the code rather than minting
        // a `session-dispatch-threw` sibling.
        assert.deepEqual(
          Object.keys(pushed[0].signal).sort(),
          ["code", "ok", "sessionId"],
          "the synthesised envelope carries no field naming WHICH exit produced it",
        );
      });
    },
  },

  {
    // QA-DESIGNED BOUNDARY, stated because ADR-008 does not: the router ALSO returns false
    // on a malformed envelope (before any dispatch) and on a dispatch that THROWS. Only the
    // malformed rows stop before a dispatch outcome exists to report.
    name: "50/04 task 00 lane A: a session-spawn envelope the router refuses never fabricates a success (five rows)",
    async run() {
      const validSignal = { sessionId: "s-1", workspaceId: "ws-aof", assistant: "claude", itemRef: null, at: NOW };
      const rows = [
        {
          label: "the target has no live stream connection",
          envelope: buildSessionSpawnEnvelope("n1", validSignal),
          dispatch: () => ({ sent: false, code: "session-target-not-connected" }),
          refusal: "yes",
        },
        {
          label: "dispatch throws",
          envelope: buildSessionSpawnEnvelope("n1", validSignal),
          dispatch: () => { throw new Error("the dispatch seam blew up"); },
          // ROW 2 WAS DELIBERATELY UNRULED by the locked feature and was routed as a finding:
          // ADR-008 decision 3 placed the callback in the `result?.sent !== true` branch
          // ONLY, so a THROW left the browser to wait out its own window. THE RULING CAME
          // (review 2026-08-14): both failure exits announce, with the same code, because the
          // control knows the frame did not land either way and the browser must not be told
          // "the node has reported nothing" about a fault this process observed. The row is
          // now RULED, so it asserts rather than accepting either answer.
          refusal: "yes",
        },
        {
          label: "no sessionId in `signal`",
          envelope: { kind: SESSION_SPAWN_KIND, nodeId: "n1", signal: { workspaceId: "ws-aof" } },
          dispatch: () => ({ sent: true }),
          refusal: "no",
        },
        {
          label: "no workspaceId in `signal`",
          envelope: { kind: SESSION_SPAWN_KIND, nodeId: "n1", signal: { sessionId: "s-1" } },
          dispatch: () => ({ sent: true }),
          refusal: "no",
        },
        {
          label: "a foreign kind",
          envelope: { kind: "presence", nodeId: "n1", signal: { sessionId: "s-1", workspaceId: "ws-aof" } },
          dispatch: () => ({ sent: true }),
          refusal: "no",
        },
      ];

      for (const row of rows) {
        const registry = createSpawnOutcomeRegistry({ now: () => NOW });
        const refusals = [];
        const router = createTerminalInputRouter({
          dispatchDirective: row.dispatch,
          now: () => NOW,
          onLog: () => {},
          onSessionSpawnRefused: (refusal) => {
            refusals.push(refusal);
            registry.apply(buildSessionSpawnAckEnvelope(refusal.nodeId, { sessionId: refusal.sessionId, ok: false, code: refusal.code }));
          },
        });

        let applied;
        assert.doesNotThrow(() => { applied = router.apply(row.envelope); }, `row "${row.label}": no exception escapes apply`);
        assert.equal(applied, false, `row "${row.label}": apply returns false`);

        if (row.refusal === "yes") assert.equal(refusals.length, 1, `row "${row.label}": the refusal sink IS called`);
        if (row.refusal === "no") assert.equal(refusals.length, 0, `row "${row.label}": the refusal sink is NOT called — there is no tuple to key an outcome on, or the frame is dropped before dispatch, or the router is kind-blind to it`);

        const held = registry.read("n1", "s-1");
        assert.ok(held == null || held.ok === false, `row "${row.label}": no outcome with ok:true is EVER registered for that tuple`);
      }
    },
  },

  {
    // THE REGISTRY'S OWN CONTRACT — ephemeral, tuple-keyed, bounded, and with no lifecycle.
    name: "50/04 task 00 lane A: the registry is a bounded in-memory map with no timer, no handle and no store",
    async run() {
      let clock = Date.parse(NOW);
      const registry = createSpawnOutcomeRegistry({ now: () => new Date(clock).toISOString() });

      // 65 DISTINCT OUTCOMES IN ORDER. At most 64 are retained and the LEAST-RECENTLY-USED
      // tuple is the one that went — named, not merely counted, because "one of them is
      // gone" would be satisfied by evicting the newest.
      for (let i = 0; i < MAX_SPAWN_OUTCOMES + 1; i += 1) {
        clock += 1;
        assert.equal(registry.apply(buildSessionSpawnAckEnvelope("n1", { sessionId: `s-${i}`, ok: false, code: "session-spawn-failed" })), true, "each distinct outcome is accepted");
      }
      assert.equal(registry.read("n1", "s-0"), null, "the least-recently-used tuple was evicted");
      let retained = 0;
      for (let i = 0; i < MAX_SPAWN_OUTCOMES + 1; i += 1) if (registry.read("n1", `s-${i}`) != null) retained += 1;
      assert.equal(retained, MAX_SPAWN_OUTCOMES, `at most ${MAX_SPAWN_OUTCOMES} entries are retained`);

      // EXPIRY ON ACCESS, not on a timer. An entry older than the retention window reads
      // as ABSENT — i.e. `pending` again, which is the honest answer to a question nobody
      // asked for two minutes.
      const expiring = createSpawnOutcomeRegistry({ now: () => new Date(clock).toISOString() });
      expiring.apply(buildSessionSpawnAckEnvelope("n1", { sessionId: "s-old", ok: true }));
      assert.notEqual(expiring.read("n1", "s-old"), null, "…present inside the window");
      clock += SPAWN_OUTCOME_RETENTION_MS + 1;
      assert.equal(expiring.read("n1", "s-old"), null, `an entry older than ${SPAWN_OUTCOME_RETENTION_MS}ms reads as absent`);

      // NO LIFECYCLE. The pruning above happened inside `read`, with no timer having run —
      // which is exactly what a registry with nothing to dispose looks like.
      assert.deepEqual(Object.keys(registry).sort(), ["apply", "read"], "the registry exposes ONLY apply/read — no dispose, no stop, no close, so there is no handle for server.close to get wrong");
      for (const forbidden of ["dispose", "stop", "close", "start", "flush"]) {
        assert.equal(registry[forbidden], undefined, `the registry exposes no \`${forbidden}\``);
      }

      // NO fs, NO STORE, NO NETWORK — read off the module's own import list rather than
      // trusted. One import, and it is the wire kind's home.
      const source = (await readFile(path.join(repoRoot, "src", "mesh", "session-spawn-outcome.mjs"), "utf8")).replace(/\r\n/g, "\n");
      const imports = [...source.matchAll(/^import\s[^\n]*from\s+["']([^"']+)["'];/gm)].map((match) => match[1]);
      assert.deepEqual(imports, ["./session-spawn-directive.mjs"], "the registry imports exactly ONE module — the lane's contract home — and no fs, store or network module");
      assert.ok(!/setInterval|setTimeout/.test(source), "…and holds no interval or timer handle: pruning happens inside apply/read");

      // A FRESHLY CONSTRUCTED REGISTRY KNOWS NOTHING. A restarted process loses the
      // EXPLANATION of a spawn, never data — nothing was written to lose.
      const fresh = createSpawnOutcomeRegistry();
      for (const tuple of [["n1", "s-1"], ["n2", "s-2"], ["", ""]]) assert.equal(fresh.read(...tuple), null, "a fresh registry answers null for every tuple");

      // `read` NEVER THROWS, for any input.
      for (const args of [[null, null], [undefined, undefined], ["n1", 7], [7, "s-1"], [Object.freeze({}), Object.freeze([])], [["n1"], { sessionId: "s" }], ["n1", null]]) {
        assert.doesNotThrow(() => fresh.read(...args), `read(${JSON.stringify(args)}) does not throw`);
        assert.equal(fresh.read(...args), null, "…and answers null");
      }
      // …and `apply` is total too: the mirror's own never-throws contract, one lane over.
      for (const envelope of [null, undefined, 7, "frame", [], Object.freeze({ kind: SESSION_SPAWN_ACK_KIND }), { kind: SESSION_SPAWN_ACK_KIND, nodeId: "n1", signal: null }]) {
        assert.doesNotThrow(() => fresh.apply(envelope), `apply(${JSON.stringify(envelope)}) does not throw`);
        assert.equal(fresh.apply(envelope), false, "…and drops the frame");
      }
    },
  },

  {
    name: "50/04 task 00 lane A: the outcome route answers a state for every tuple and never a 404 (six rows)",
    async run() {
      const rows = [
        { label: "nothing has arrived yet", seed: null, connected: true, state: "pending", code: null },
        { label: "the PTY opened", seed: { ok: true }, connected: true, state: "started", code: null },
        { label: "the worker refused", seed: { ok: false, code: "session-spawn-failed" }, connected: true, state: "failed", code: "session-spawn-failed" },
        { label: "the control synthesised a refusal", seed: { ok: false, code: "session-target-not-connected" }, connected: true, state: "failed", code: "session-target-not-connected" },
        { label: "this control node cannot hear at all", seed: null, connected: false, state: "unknown", code: "spawn-outcome-lane-unavailable" },
        // THE QA RULING ADR-008 leaves implicit: a RETAINED outcome outranks the lane's
        // connectivity. Answering `unknown` over an answer already in hand would throw away
        // the only honest thing the lane ever produced.
        { label: "an answer arrived, then the lane dropped", seed: { ok: false, code: "session-worktree-failed" }, connected: "dropped", state: "failed", code: "session-worktree-failed" },
      ];

      for (const row of rows) {
        await withOutcomeFace(async ({ deliver, outcome, setConnected }) => {
          if (row.seed != null) deliver(buildSessionSpawnAckEnvelope("n1", { sessionId: "s-1", ...row.seed }));
          if (row.connected === "dropped") setConnected(false);
          const response = await outcome("n1", "s-1");
          assert.equal(response.status, 200, `row "${row.label}": the response is 200 and NEVER a 404 — the registry cannot distinguish "this session never existed" from "the ack has not arrived yet", and a 404 would assert the first`);
          const body = await response.json();
          assert.equal(body.ok, true, `row "${row.label}": ok:true`);
          assert.equal(body.nodeId, "n1", `row "${row.label}": the tuple is echoed`);
          assert.equal(body.sessionId, "s-1", `row "${row.label}": …both halves of it`);
          assert.equal(body.state, row.state, `row "${row.label}": state`);
          assert.equal(body.code, row.code, `row "${row.label}": code`);
          assert.ok(
            ["pending", "started", "failed", "unknown"].includes(body.state),
            `row "${row.label}": the state is a member of the closed set — the route never invents a terminal state it cannot observe (it does not own the timeout: only the client knows when it dispatched)`,
          );
        }, { connected: row.connected === true || row.connected === "dropped" });
      }
    },
  },

  {
    name: "50/04 task 00 lane A: the outcome route refuses a malformed query and every non-read method (eight rows)",
    async run() {
      await withOutcomeFace(async ({ request, url }) => {
        const bad = [
          { label: "no nodeId", query: "?sessionId=s-1" },
          { label: "no sessionId", query: "?nodeId=n1" },
          { label: "blank nodeId", query: "?nodeId=&sessionId=s-1" },
          { label: "whitespace sessionId", query: "?nodeId=n1&sessionId=%20" },
          { label: "no query at all", query: "" },
        ];
        for (const row of bad) {
          const response = await request(row.query);
          assert.equal(response.status, 400, `row "${row.label}": 400`);
          const body = await response.json();
          assert.equal(body.code, "invalid-query", `row "${row.label}": code invalid-query (the invalid-scope vocabulary, not invalid-body — there is no body)`);
        }

        const head = await request("?nodeId=n1&sessionId=s-1", { method: "HEAD" });
        assert.equal(head.status, 200, "row \"HEAD\": 200, with no error body");
        assert.equal((await head.text()), "", "…and HEAD carries no body");

        for (const method of ["POST", "DELETE"]) {
          const response = await request("?nodeId=n1&sessionId=s-1", { method });
          assert.equal(response.status, 405, `row "${method}": 405`);
          assert.equal((await response.json()).code, "method-not-allowed", `row "${method}": code method-not-allowed`);
          assert.equal(response.headers.get("allow"), "GET, HEAD", `row "${method}": a 405 carries an Allow header of "GET, HEAD"`);
        }
        assert.ok(url.startsWith("http://127.0.0.1:"), "the face is bound on loopback (no fixed port is taken)");
      });
    },
  },

  {
    // THE BOUND DID NOT MOVE, WHICH IS THE STORY'S OWN ACCEPTANCE CRITERION VERBATIM.
    // The four route-table detectors are the gates; this clause is the traceability
    // statement over the shipped source AND over the detectors themselves — a detector
    // that was never taught the new name is a detector whose green means nothing.
    name: "50/04 task 00 lane A: the fleet face gains a READ route and its write allowlist stays exactly two",
    async run() {
      const face = (await readFile(path.join(repoRoot, "src", "mesh", "ui-serve.mjs"), "utf8"))
        .replace(/\r\n/g, "\n")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      const declared = [...new Set([...face.matchAll(/pathname\s*===\s*["']\/api\/mesh\/([^"']+)["']/g)].map((match) => match[1]))].sort();
      assert.deepEqual(
        declared,
        ["assign", "board-url", "session", "session-outcome", "status"],
        "the declared /api/mesh/* routes are exactly the five, enumerated by name",
      );

      // THE WRITE ROUTES ARE STILL EXACTLY TWO, read as the routes that guard themselves to
      // POST. The outcome route guards itself to GET/HEAD, so it cannot join this set by
      // accident.
      const postGuarded = declared.filter((name) => {
        const anchor = new RegExp(`if\\s*\\(\\s*pathname\\s*===\\s*["']/api/mesh/${name}["']\\s*\\)\\s*\\{`).exec(face);
        if (anchor == null) return false;
        const head = face.slice(anchor.index, anchor.index + 400);
        return /request\.method\s*!==\s*["']POST["']/.test(head);
      });
      assert.deepEqual(postGuarded.sort(), ["assign", "session"], "the WRITE routes are still exactly {assign, session}");

      // AND EACH OF THE FOUR DETECTORS WAS ACTUALLY TAUGHT THE NAME. A route added to the
      // face while a detector still enumerates four is a detector reading green about a
      // table it no longer describes.
      for (const detector of [
        "acd-mesh-ui-write-isolation.test.mjs",
        "acd-mesh-ui-read-only.test.mjs",
        "acd-fleet-face-single-mutation-route.test.mjs",
        "acd-fleet-board-link-resolved.test.mjs",
      ]) {
        // 119/03 — RESOLVED from a walk of `test/arch/`, not joined onto it. These four are named by
        // BASENAME, which is right: the name is the detector's identity and it survived the move
        // into subject directories; the flat `test/arch/<name>` join did not. The detectors now sit
        // under `test/arch/mesh/` and `test/arch/ui/`, and joining a bare name would go on failing
        // at `readFile` every time one of them moves again.
        const source = await readFile(path.join(repoRoot, await suitePathByBasename(repoRoot, detector)), "utf8");
        assert.ok(source.includes("session-outcome"), `${detector} enumerates session-outcome BY NAME — never relaxed to a pattern`);
      }
      const writeIsolation = await readFile(path.join(repoRoot, await suitePathByBasename(repoRoot, "acd-mesh-ui-write-isolation.test.mjs")), "utf8");
      assert.match(writeIsolation, /const READ_ROUTES = Object\.freeze\(\["board-url", "session-outcome", "status"\]\)/, "…in acd-mesh-ui-write-isolation's READ set");
      assert.match(writeIsolation, /const WRITE_ROUTES = Object\.freeze\(\["assign", "session"\]\)/, "…and in NONE of its write sets");

      // THE FACE STILL PERFORMS ZERO FS WRITE AND NO SHELL-OUT — the posture clause the
      // gates hold file-wide, restated here because it is half of the acceptance criterion.
      for (const verb of ["writeFile", "appendFile", "mkdir", "rm", "unlink", "rename", "spawn", "exec", "execSync"]) {
        assert.ok(!new RegExp(`\\b${verb}\\s*\\(`).test(face), `the face makes no ${verb}( call`);
      }
    },
  },

  // ═══════════════ LANE B · THE PRODUCER FACT ══════════════════════════════════════

  {
    name: "50/04 task 00 lane B: the worker states the fact, and only the worker",
    async run() {
      await withSpawnFixture(async (fixture) => {
        const intervals = createManualIntervals();
        const startCalls = [];
        const pingCalls = [];
        const pty = createFakePty();
        const handler = createMeshWorkerSessionSpawnHandler({
          loadWs: () => Promise.resolve(fixture.workspace),
          nodeId: NODE_ID,
          workerHasRepo,
          meshCheckoutPath,
          globalWorkStoreOptions: { env: fixture.env },
          sendTerminalFrame: async () => ({ sent: true }),
          sendTerminalEnd: async () => ({ sent: true }),
          sendSessionSpawnAck: async () => ({ sent: true }),
          ptySpawn: async () => pty,
          now: () => NOW,
          setIntervalImpl: intervals.setIntervalImpl,
          clearIntervalImpl: intervals.clearIntervalImpl,
        });

        // The record write is the handler's OWN — captured by reading what landed on disk
        // rather than by stubbing `startSession`, so the assertion is about the RECORD and
        // not about a call the module might route around.
        await handler(buildSessionSpawnFrame(NODE_ID, { sessionId: "s-1", workspaceId: fixture.workspaceId, assistant: "claude", itemRef: null, at: NOW }));

        const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s-1" };
        const record = await readSessionRecord(fixture.workspace, key);
        assert.ok(record != null, "the handler registered the session");
        assert.equal(record.relaying, true, "`startSession` was called with relaying: true alongside the existing 4-part key and `repo`");
        assert.deepEqual(
          Object.keys(record),
          ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying"],
          "the written record contains relaying: true BESIDE the seven keys the frozen schema already carries — an APPEND, never a reorder",
        );

        // EVERY PING TOO. The handler's ticker is injected, so the 30s cadence is a fact of
        // this test rather than of wall time.
        await intervals.fire(0);
        const afterPing = await readSessionRecord(fixture.workspace, key);
        assert.equal(afterPing.relaying, true, "every ping for that session also carries relaying: true");
        assert.notEqual(afterPing.lastPingAt, undefined, "…and the ping really wrote");

        // NOTHING IN THE CONTROL'S PROCESS WRITES, DERIVES OR INFERS THIS FIELD FOR ANOTHER
        // NODE. Read off the control-side modules: the wire hop passes it through, the index
        // reads it, and neither MINTS it.
        for (const file of ["control-stream-server.mjs", "global-mesh-query.mjs", "mesh/ui-serve.mjs"]) {
          const source = (await readFile(path.join(repoRoot, "src", file), "utf8"))
            .replace(/\r\n/g, "\n")
            .replace(/\/\/[^\n]*/g, "")
            .replace(/\/\*[\s\S]*?\*\//g, "");
          assert.ok(!/relaying\s*:\s*true/.test(source), `src/${file} never SETS relaying: true — the fact is stated where it is known (the worker that owns the bridge), never derived where it is read`);
        }
        startCalls.push("checked");
        pingCalls.push("checked");
      });
    },
  },

  {
    // STICKY ON PING, mirroring `pingSession`'s existing `repo: existing?.repo ?? repo`
    // carry-forward. A ping that omits it must never demote a live pane to `no live output`
    // mid-session.
    name: "50/04 task 00 lane B: a ping resolves `relaying` as the disjunction of what it states and what is on disk (five rows)",
    async run() {
      await withSpawnFixture(async (fixture) => {
        const rows = [
          { label: "the launcher's own ping", onDisk: true, states: true, result: true },
          { label: "a ping that forgot the field", onDisk: true, states: undefined, result: true },
          { label: "a hook-registered session, unchanged", onDisk: undefined, states: undefined, result: false },
          { label: "a bridge that started mid-session", onDisk: undefined, states: true, result: true },
          // THE QA RULING: ADR-008 decision 8 spells the rule
          // `relaying === true || existing?.relaying === true`, which makes an explicit
          // `false` NON-DEMOTING. That is the honest reading of "sticky", and it is what
          // keeps a pane typeable across a ping.
          { label: "an explicit false cannot demote", onDisk: true, states: false, result: true },
        ];

        for (const [index, row] of rows.entries()) {
          const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: `s-${index}` };
          const started = await startSession(fixture.workspace, {
            ...key,
            repo: "aof",
            ...(row.onDisk === undefined ? {} : { relaying: row.onDisk }),
            now: NOW,
          });
          assert.equal(started.relaying, row.onDisk === true, `row "${row.label}": the record on disk states what the row says`);

          const later = new Date(Date.parse(NOW) + 30_000).toISOString();
          const pinged = await pingSession(fixture.workspace, {
            ...key,
            repo: "aof",
            ...(row.states === undefined ? {} : { relaying: row.states }),
            now: later,
          });
          assert.equal(pinged.relaying, row.result, `row "${row.label}": the record's relaying reads ${row.result}`);
          assert.equal(pinged.startedAt, NOW, `row "${row.label}": startedAt is unchanged`);
          assert.equal(pinged.lastPingAt, later, `row "${row.label}": lastPingAt advances`);
        }
      });
    },
  },

  {
    name: "50/04 task 00 lane B: the fact survives all four hops, and the hop that must NOT change does not",
    async run() {
      await withSpawnFixture(async (fixture) => {
        const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s-1" };
        await startSession(fixture.workspace, { ...key, repo: "aof", relaying: true, now: NOW });

        // HOP 2 — the presence projection.
        const live = await readLiveSessions(fixture.workspace, NODE_ID, { now: NOW, ttlSeconds: 120 });
        assert.equal(live.length, 1, "the session projects");
        assert.deepEqual(
          Object.keys(live[0]),
          ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "relaying"],
          "readLiveSessions' projected entry carries `relaying` appended at the TAIL of its frozen six — never a reorder",
        );
        assert.equal(live[0].relaying, true, "…and it carries the stated value");

        // HOP 3 — THE ONE THAT MUST NOT CHANGE, driven through the REAL applyPresenceFrame.
        // A key the control has never heard of rides beside `relaying`: if `safeSessionArray`
        // ever grew a whitelist, this is the assertion that would go red, and it would go red
        // for BOTH the future key and the present one.
        const meshRoot = path.join(fixture.home, "mesh-hop3");
        const applied = await applyPresenceFrame(
          { paths: { meshRoot } },
          {
            kind: "presence",
            nodeId: NODE_ID,
            presence: {
              nodeId: NODE_ID,
              heartbeatAt: NOW,
              activeRuns: [],
              sessions: [{ ...live[0], aKeyFromTheFuture: 7 }],
              aofVersion: "0.1.0",
            },
          },
          { now: NOW, nodeId: NODE_ID, presenceWorkspace: { globalMeshRoot: meshRoot } },
        );
        assert.equal(applied.published, true, "the presence frame crossed the control's wire hop");
        assert.deepEqual(
          applied.record.sessions,
          [{ ...live[0], aKeyFromTheFuture: 7 }],
          "safeSessionArray still passes each entry object VERBATIM and holds no key whitelist — including a key it has never heard of, which is the property that keeps the next session field from needing an edit here",
        );

        // HOP 4 — the session index, built from the projected presence.
        const { sessions: index } = buildSessionIndex({
          nodes: [{ nodeId: NODE_ID, freshness: "live", presence: applied.record }],
          assignments: [],
        });
        assert.equal(index.length, 1, "the index holds the session");
        assert.deepEqual(
          Object.keys(index[0]),
          ["nodeId", "sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "workItem", "relaying"],
          "buildSessionIndex's entry carries `relaying` appended AFTER `workItem`, unconditionally",
        );
        assert.equal(index[0].relaying, true, "…with the stated value");

        // A NODE THAT STATES NOTHING reads false on the wire rather than throwing or
        // omitting the key — the strict `=== true` read, one hop from the browser.
        const { sessions: silent } = buildSessionIndex({
          nodes: [{ nodeId: "n-old", freshness: "live", presence: { sessions: [{ sessionId: "s-old", workspaceId: "ws", repo: "r", assistant: "claude", lastPingAt: NOW }] } }],
          assignments: [],
        });
        assert.equal(silent[0].relaying, false, "a node that states nothing reads relaying:false on the wire rather than throwing or omitting the key");
        assert.ok("relaying" in silent[0], "…and the key is PRESENT, so a reader can tell a build that does not state it from a session with no bridge");
      });
    },
  },

  {
    // THE HEADLINE OF DG-50-1, AS ARITHMETIC RATHER THAN AS COPY.
    name: "50/04 task 00 lane B: the feed axis is the disjunction of two positive statements, and fails closed (ten rows)",
    async run() {
      const throwingRelaying = {};
      Object.defineProperty(throwingRelaying, "relaying", { get() { throw new Error("a malformed row"); }, enumerable: true });

      const rows = [
        { label: "a launched session", row: { nodeId: "n1", sessionId: "s-1", workItem: null, relaying: true }, axis: FEED_PRODUCER_KNOWN },
        { label: "an assignment session, untouched", row: { nodeId: "n1", sessionId: "s-1", workItem: { ref: "50/04", assignmentId: "a-1" } }, axis: FEED_PRODUCER_KNOWN },
        { label: "both statements", row: { nodeId: "n1", sessionId: "s-1", workItem: { ref: "50/04", assignmentId: "a-1" }, relaying: true }, axis: FEED_PRODUCER_KNOWN },
        { label: "a hook-registered free session nothing relays", row: { nodeId: "n1", sessionId: "s-1", workItem: null }, axis: FEED_NO_PRODUCER },
        { label: "the same, explicitly stated false", row: { nodeId: "n1", sessionId: "s-1", workItem: null, relaying: false }, axis: FEED_NO_PRODUCER },
        { label: "an older node that states the string \"true\"", row: { nodeId: "n1", sessionId: "s-1", workItem: null, relaying: "true" }, axis: FEED_NO_PRODUCER },
        { label: "a numeric 1", row: { nodeId: "n1", sessionId: "s-1", workItem: null, relaying: 1 }, axis: FEED_NO_PRODUCER },
        { label: "a blank workItem pair with no relaying", row: { nodeId: "n1", sessionId: "s-1", workItem: { ref: "", assignmentId: "" } }, axis: FEED_NO_PRODUCER },
        { label: "a blank workItem pair WITH relaying", row: { nodeId: "n1", sessionId: "s-1", workItem: { ref: "", assignmentId: "" }, relaying: true }, axis: FEED_PRODUCER_KNOWN },
        { label: "a getter that throws", row: Object.assign(throwingRelaying, { nodeId: "n1", sessionId: "s-1", workItem: null }), axis: FEED_NO_PRODUCER },
      ];

      for (const row of rows) {
        let axis;
        assert.doesNotThrow(() => { axis = feedAxisFor(row.row, null); }, `row "${row.label}": no error is thrown`);
        assert.equal(axis, row.axis, `row "${row.label}": the axis value is exactly ${row.axis}`);
        assert.ok(FEED_AXIS_VALUES.includes(axis), `row "${row.label}": the axis is still one of exactly producer-known, no-producer, roster-gone`);
      }
      assert.deepEqual([...FEED_AXIS_VALUES], ["producer-known", "no-producer", "roster-gone"], "the closed set did not grow — the derivation gained an INPUT, not a state word");
    },
  },

  {
    name: "50/04 task 00 lane B: a launched session's pane is subscribable, interactive and indistinguishable from any other",
    async run() {
      // A `/api/mesh/status` payload carrying one launched session and one assignment-owned
      // session. `relaying` is the ONLY thing that differs, and it is a boolean.
      const status = {
        sessions: [
          { nodeId: "n1", sessionId: "s-launched", workspaceId: "ws-aof", repo: "aof", assistant: "claude", lastPingAt: NOW, workspaceHasRun: false, workItem: null, relaying: true },
          { nodeId: "n1", sessionId: "s-assigned", workspaceId: "ws-aof", repo: "aof", assistant: "claude", lastPingAt: NOW, workspaceHasRun: false, workItem: { ref: "50/04", assignmentId: "a-1" }, relaying: false },
        ],
        items: [],
      };

      const tiles = homeGridRows(status, {});
      assert.equal(tiles.length, 2, "both sessions become tiles");
      const dialable = dialableTiles(tiles);
      assert.deepEqual(
        dialable.map((tile) => tile.sessionId).sort(),
        ["s-assigned", "s-launched"],
        "both tiles are handed to the socket arbiter as dialable — the launched one no longer loses its socket to a `no-producer` axis",
      );

      for (const row of status.sessions) {
        const mount = homeSessionMount(row, { context: { latest: status.sessions, previous: [] } });
        assert.equal(mount.bound, true, `${row.sessionId}: the mount reports bound: true`);
        assert.equal(mount.posture, "interactive", `${row.sessionId}: …and the interactive posture`);
        assert.equal(mount.reason, null, `${row.sessionId}: …with no read-only cause and no injected "no live output" reason`);
      }

      // NOTHING IN THE PAYLOAD DISTINGUISHES THE TWO POPULATIONS. The wire carries a
      // BOOLEAN; a renderer handed these two rows has no string to branch on, which is what
      // makes no-second-class structural rather than a rule someone must remember.
      for (const row of status.sessions) {
        for (const [key, value] of Object.entries(row)) {
          assert.ok(
            !(typeof value === "string" && ["producer", "launched", "launcher", "kind", "source"].includes(key)),
            `no \`${key}\` string appears on a session entry — the wire carries a BOOLEAN`,
          );
        }
      }
      assert.deepEqual(
        Object.keys(status.sessions[0]),
        Object.keys(status.sessions[1]),
        "the two entries have the SAME key set — they differ only in the value of one boolean",
      );

      // THE ORDER IS THE EXISTING (nodeId, repo, sessionId) CODEPOINT SORT, unchanged by how
      // either session was started.
      assert.deepEqual(
        tiles.map((tile) => tile.sessionId),
        ["s-assigned", "s-launched"],
        "the tiles' order is the existing (nodeId, repo, sessionId) codepoint sort — \"s-assigned\" < \"s-launched\", and nothing about the launcher moved it",
      );
    },
  },

  {
    name: "50/04 task 00 lane B: the fact never outlives the bridge",
    async run() {
      await withSpawnFixture(async (fixture) => {
        const key = { nodeId: NODE_ID, workspaceId: fixture.workspaceId, assistant: "claude", sessionId: "s-1" };
        await startSession(fixture.workspace, { ...key, repo: "aof", relaying: true, now: NOW });
        // A SIBLING session that states nothing, so "the fact is gone" cannot be satisfied
        // by the whole projection being empty.
        await startSession(fixture.workspace, { ...key, sessionId: "s-2", repo: "aof", now: NOW });

        assert.equal((await readLiveSessions(fixture.workspace, NODE_ID, { now: NOW, ttlSeconds: 120 })).length, 2, "both sessions project while both are live");

        // THE PTY EXITS AND THE HANDLER SETTLES — which is `endSession`, the handler's own
        // settle path (its `release()` + `endSession(ws, sessionKey)` pair).
        await endSession(fixture.workspace, key);

        const projected = await readLiveSessions(fixture.workspace, NODE_ID, { now: NOW, ttlSeconds: 120 });
        assert.deepEqual(
          projected.map((entry) => entry.sessionId),
          ["s-2"],
          "endSession removes the record, so the next presence projection carries NO entry for it at all",
        );
        const { sessions: index } = buildSessionIndex({
          nodes: [{ nodeId: NODE_ID, freshness: "live", presence: { sessions: projected } }],
          assignments: [],
        });
        assert.deepEqual(index.map((entry) => entry.sessionId), ["s-2"], "a session index built after that projection contains no row for the tuple");
        assert.deepEqual(
          index.map((entry) => entry.relaying),
          [false],
          "…and no `relaying` fact is left behind on any other record",
        );
      });
    },
  },

  {
    // The producer-site ceiling and its re-derivation are owned by
    // acd-terminal-output-signal-source (FF-E) and driven there with planted violations.
    // This clause is the TRACEABILITY statement: the number is at the delivered count, the
    // third site is sanctioned by an ENUMERATED second shape, and the re-derivation is
    // written into the gate's own header — which is what that gate's contract demands of a
    // raise.
    name: "50/04 task 00 lane B: the producer-site ceiling is raised to three, with all three sites sanctioned by name",
    async run() {
      const gate = (await readFile(path.join(repoRoot, "test", "arch", "session", "acd-terminal-output-signal-source.test.mjs"), "utf8")).replace(/\r\n/g, "\n");
      assert.match(gate, /const SANCTIONED_PRODUCER_SITES = 3;/, "the ceiling is 3 — AT the delivered count, never above it");
      assert.match(gate, /RAISED 2 → 3 BY m50\/ADR-008 DECISION 9/, "…and the raise names its ADR in the gate's own header");
      assert.match(gate, /the reverse direction no longer rests on the count at all/i, "…carrying decision 9's RE-DERIVATION: the reverse implication now rests on every non-assignment producer STATING relaying: true");
      assert.match(gate, /survives as the TRIPWIRE/, "…and states what the count still proxies");

      // THE SECOND SHAPE IS AN ENUMERATION, never a relaxed pattern.
      assert.match(gate, /const SANCTIONED_PRODUCER_SHAPES = Object\.freeze\(\[/, "the sanctioned hosts are an enumeration");
      assert.match(gate, /SANCTIONED_OUTPUT_BRIDGE_KEY\s*=\s*\/\^\\\(/, "…whose second member is an EXACT regex for the bridge key, not a widened first one");
      assert.match(gate, /SANCTIONED_OUTPUT_CHUNK_ARROW\s*=\s*\/\^\\\(\\s\*chunk/, "…and whose first member is m46's arrow, untouched");

      // The THIRD SITE, named, at the shape the ADR sanctions.
      const launcher = (await readFile(path.join(repoRoot, "src", "mesh", "launcher.mjs"), "utf8")).replace(/\r\n/g, "\n");
      assert.match(
        launcher,
        /sendTerminalFrame: \(sessionId, bytes\) => client\.sendTerminalFrame\(sessionId, bytes\),/,
        "the third call site is the spawn-handler bridge key at exactly the sanctioned spelling",
      );

      // `feedAxisFor` STILL TAKES NO BYTE PARAMETER, optional or otherwise.
      const axis = (await readFile(path.join(repoRoot, "ui", "src", "home", "feed-axis.mjs"), "utf8")).replace(/\r\n/g, "\n");
      const signature = /export function feedAxisFor\(([^)]*)\)/.exec(axis);
      assert.ok(signature != null, "feedAxisFor is still exported as a function");
      assert.equal(signature[1].trim(), "row, context", "…taking exactly (row, context) — no byte parameter, optional or otherwise");

      // …and the handler passes the fact to BOTH write verbs.
      const handler = (await readFile(path.join(repoRoot, "src", "mesh", "session-spawn-handler.mjs"), "utf8")).replace(/\r\n/g, "\n");
      assert.match(handler, /startSession\(ws, \{ \.\.\.sessionKey, repo, relaying: true, now: resolveNow\(\) \}\)/, "mesh-session-spawn-handler passes relaying: true to startSession(");
      assert.match(handler, /pingSession\(ws, \{ \.\.\.sessionKey, repo, relaying: true, now: resolveNow\(\) \}\)/, "…and to pingSession(");

      // A sanity read of the record assembler, so this clause cannot be green over a tree
      // where the field exists only in the two call sites above.
      assert.equal(assembleSessionRecord({ nodeId: "n1", relaying: true }).relaying, true, "…and the record assembler carries it");
    },
  },
];
