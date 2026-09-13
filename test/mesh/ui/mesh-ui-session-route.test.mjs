// Traceability wiring for milestone 50 / story 02 — tasks 00 + 02
// (tasks/00_spawn-route-handler.feature, tasks/02_honest-failure-responses.feature,
// both @executable). Task 01 is a fitness-function update and is armed in
// test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs, not here.
//
// ARCHITECTURE 50/ADR-001 (the route's shape), 50/ADR-002 (the directive), and
// 50/ADR-006 — which SUPERSEDES ADR-001 decision 4 and is the reason this file drives
// the REAL loopback-relay bridge rather than a `sendDirective` handle: `aof mesh ui`
// (the only production `serveMeshUi` caller) runs in a DIFFERENT OS PROCESS from
// `aof mesh serve` (the only owner of the control stream and its `directiveTargets`
// registry), so an options-bag dispatch callback would be satisfiable only here, in a
// test, and `undefined` in the shipped daemon.
//
// SO "a session-spawn directive was dispatched to n1" IS PROVEN THROUGH THE PRODUCTION
// CHAIN, not from the response body: the route's envelope is captured off the SAME
// `terminalInputPush` seam `src/commands/mesh-ui.mjs` wires literally, then handed to
// the REAL `createTerminalInputRouter` (which the serve process feeds from its own
// broker subscription, mesh-launcher.mjs), which dispatches through a REAL
// `startControlStreamServer` to a REAL worker stream client's `onSessionSpawn` lane.
// The only leg not exercised in-process is the relay broker's own socket — the same
// leg every other relay lane leaves to the @manual two-machine soak.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { serveMeshUi, meshUiDist } from "../../../src/mesh/ui-serve.mjs";
// The closed set the route validates `assistant` against, read from its ONE home so this
// suite cannot drift from the module the face imports (ADR-002 decision 2's
// `"claude"|"codex"|"gemini"`; ADR-007 decision 3 keeps it closed as a session-key LABEL).
import { PROVIDER_IDS } from "../../../src/terminal-providers.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../../src/mesh/store.mjs";
import { publishPresenceRecord } from "../../../src/mesh/presence.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { createTerminalInputRouter } from "../../../src/mesh/terminal-input.mjs";
import { SESSION_SPAWN_KIND } from "../../../src/mesh/session-spawn-directive.mjs";
import { startControlStreamServer } from "../../../src/control-stream-server.mjs";
import { createWorkerStreamClient, createWorkerWsTransport } from "../../../src/worker-stream-client.mjs";

// A v4 UUID, the shape `crypto.randomUUID()` mints (ADR-002 decision 2 — the session's
// routable address, minted CONTROL-side so the 200 can carry it).
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// The fixture pins its workspace ids through `config.mesh.workspaceId` — the REAL
// production precedence (`src/workspace-identity.mjs`: an explicit pin outranks the
// path derivation, and is what a scoped clone carries), so the locked scenarios'
// `workspaceId: "ws-aof"` is the id the projection actually holds rather than a
// sha256 of a temp path the feature file could never name.
async function writeRepo(root, { name, workspaceId, controlNodeId }) {
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const mesh = { workspaceId, ...(controlNodeId == null ? {} : { nodeId: controlNodeId }) };
  await writeFile(
    path.join(root, ".aof", "aof.config.json"),
    `${JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh }, null, 2)}\n`,
    "utf8",
  );
}

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>\n",
    "utf8",
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

// withSessionRouteFixture(fn, opts) — the REAL fleet face over an isolated
// AOF_GLOBAL_HOME projection, with:
//   · one repo per `workspaces` entry, PUBLISHED through the real publisher (so the
//     `workspaces[]` row carries a real project_root — the row the route resolves);
//   · one node per `nodes` entry, published as a real node record; `live: true` also
//     publishes a presence record heartbeating NOW, which is what makes the registry
//     read `freshness: "live"` — i.e. exactly the fact the grid renders as "online"
//     and the fact ADR-006 decision 7 answers `session-target-not-connected` from.
//     `live: false` publishes a heartbeat well outside the 60s window (the honest
//     producer for a node that has stopped talking), and a node listed in NEITHER
//     place is the never-seen case;
//   · `vanish: true` on a workspace deletes its checkout AFTER publishing — the
//     ordinary shape of a row another machine published into a synced projection;
//   · `relay: false` withholds the loopback push transport entirely, which is exactly
//     what `createTerminalRelayPushTransport(config)` returns when no
//     `mesh.relay.url` is configured (ADR-006 decision 5);
//   · `pushError: <Error>` gives the face a relay transport whose `push()` THROWS —
//     the CONFIGURED-but-unreachable relay, which is a different fact from `relay:
//     false` (configured-and-absent) and the one the route answers
//     `503 session-dispatch-failed` for. The default error carries a real transport
//     message shape (`relay socket ECONNREFUSED 127.0.0.1:4180`) because half of what
//     that lane asserts is that this string does NOT reach the browser.
//
// It yields `pushed` — every envelope the route handed the relay, in order — so a lane
// can assert what CROSSED THE BRIDGE rather than what the response body claimed. A
// `pushError` transport records NOTHING: a hand-off that threw crossed no bridge.
async function withSessionRouteFixture(fn, {
  workspaces = [{ id: "ws-aof", name: "aof" }],
  nodes = [{ nodeId: "n1", live: true }],
  controlNodeId = "control-a",
  relay = true,
  pushError = null,
} = {}) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-session-"));
  const home = path.join(tmp, "home");
  const distRoot = path.join(tmp, "dist");
  const env = { AOF_GLOBAL_HOME: home };
  const globalStoreOptions = { env };
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  try {
    const roots = new Map();
    for (const spec of workspaces) {
      const root = path.join(tmp, `repo-${spec.id}`);
      await writeRepo(root, { name: spec.name ?? spec.id, workspaceId: spec.id, controlNodeId });
      roots.set(spec.id, root);
    }
    await writeDist(meshUiDist(distRoot));

    const primaryRoot = roots.get(workspaces[0].id);
    const primary = await loadWorkspace(primaryRoot, undefined, { env });

    // Node records + presence are MACHINE-WIDE facts (mesh-store/mesh-presence write
    // under the global home), so publishing them through any loaded workspace is the
    // real path; the registry snapshot below enrols whatever exists at the moment it
    // is taken.
    for (const node of nodes) {
      await publishNodeRecord(primary, node.nodeId, {
        nodeId: node.nodeId,
        host: node.nodeId,
        os: "linux",
        runtimes: [],
        skills: [],
        aofVersion: "0.1.0",
        publishedAt: now,
      });
      if (node.live !== null) {
        await publishPresenceRecord(primary, node.nodeId, {
          nodeId: node.nodeId,
          heartbeatAt: node.live ? now : stale,
          activeRuns: [],
          sessions: [],
          aofVersion: "0.1.0",
        });
      }
    }

    const store = await openGlobalWorkProjectionStore(globalStoreOptions);
    try {
      for (const spec of workspaces) {
        const workspace = await loadWorkspace(roots.get(spec.id), undefined, { env });
        await store.publishWorkspaceSnapshot(workspace, { now });
        await publishGlobalRegistryDescriptorsToStore(store, workspace, { now });
      }
    } finally {
      store.close();
    }

    for (const spec of workspaces) {
      if (spec.vanish === true) await rm(roots.get(spec.id), { recursive: true, force: true });
    }

    const pushed = [];
    const terminalInputPush = relay
      ? {
        async push(envelope) {
          if (pushError != null) throw pushError;
          pushed.push(envelope);
        },
        close() {},
      }
      : null;

    const { server, url } = await serveMeshUi({
      projectDir: primaryRoot,
      port: 0,
      repoRoot: distRoot,
      scope: "global",
      globalStoreOptions,
      terminalInputPush,
    });
    try {
      return await fn({ url, home, pushed, roots, globalStoreOptions });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// A REAL same-origin application/json POST — the exact envelope a same-origin browser
// fetch sends, which is what the SECURITY T13 admission guard admits.
//
// `origin` IS A SENTINEL, NEVER A RAW VALUE, and the spelling matters (the assign
// fixture's REVIEW FIX F-C, learned the hard way one milestone over): `"SAME"` is this
// server's own origin, `"NONE"` sends NO Origin header at all (the bare cross-site
// form-POST), and anything else rides through verbatim. `undefined` cannot mean
// "omit" here — a JS default parameter cannot tell an omitted key from an explicit
// `undefined`, so the natural spelling of "don't send it" would silently send the
// RIGHT one and a cross-origin lane would pass while proving nothing. It is spelled.
function postSession(url, payload, { origin = "SAME", contentType = "application/json", rawBody } = {}) {
  const headers = {};
  if (origin !== "NONE") headers.origin = origin === "SAME" ? new URL(url).origin : origin;
  if (contentType !== undefined) headers["content-type"] = contentType;
  return fetch(new URL("/api/mesh/session", url), {
    method: "POST",
    headers,
    body: rawBody !== undefined ? rawBody : JSON.stringify(payload),
  });
}

// routeCapturedEnvelope(envelope) — the CONTROL-SIDE half of the production bridge,
// run for real: the serve process hands every inbound relay frame to
// `createTerminalInputRouter` (mesh-launcher.mjs wires exactly this, with
// `dispatchDirective: (directive) => streamServer.dispatchDirective(directive)`), and
// the router is what turns the envelope back into the ADR-002 down-frame. Capturing
// the DIRECTIVE it dispatches is how a lane reads "the dispatched frame" without
// inventing a seam the daemon does not have.
function routeCapturedEnvelope(envelope, { sent = true } = {}) {
  const dispatched = [];
  const logs = [];
  const router = createTerminalInputRouter({
    dispatchDirective: (directive) => {
      dispatched.push(directive);
      return sent ? { sent: true } : { sent: false, code: "target-not-connected" };
    },
    now: () => "2026-08-14T00:00:00.000Z",
    onLog: (entry) => logs.push(entry),
  });
  const routed = router.apply(envelope);
  return { routed, dispatched, logs };
}

function waitFor(predicate, { timeoutMs = 4000, label = "condition" } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) { resolve(); return; }
      if (Date.now() - startedAt > timeoutMs) { reject(new Error(`timed out waiting for ${label}`)); return; }
      setTimeout(tick, 5);
    };
    tick();
  });
}

export const meshUiSessionRouteTests = [
  // ═══ Task 00 — the spawn route handler ═════════════════════════════════════════

  // ══ Scenario: a valid spawn request returns 200 with the minted sessionId ══
  //
  // …and the directive really reaches the worker. This lane runs the WHOLE ADR-006
  // chain in-process: fleet route → relay envelope → the real router → a REAL
  // control-stream server → a REAL worker stream client's onSessionSpawn handler.
  {
    name: "mesh-ui-session-route/00 a valid same-origin POST /api/mesh/session returns 200 with a minted sessionId, and the directive reaches the target worker through the REAL relay-router → control-stream → worker chain",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed, globalStoreOptions }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        const body = await response.json();
        assert.equal(response.status, 200, `the spawn is accepted — got ${response.status} ${JSON.stringify(body)}`);
        assert.equal(body.ok, true);
        assert.match(body.sessionId, UUID_V4, "the response carries a minted v4 sessionId");
        assert.equal(body.nodeId, "n1");
        assert.equal(body.workspaceId, "ws-aof");

        // The FACE performed exactly one relay push, on the FROZEN envelope
        // ({ kind, nodeId, signal }) — never a fourth top-level key.
        assert.equal(pushed.length, 1, "exactly one envelope crossed the loopback relay");
        assert.deepEqual(Object.keys(pushed[0]).sort(), ["kind", "nodeId", "signal"], "the relay envelope stays the frozen three keys");
        assert.equal(pushed[0].kind, SESSION_SPAWN_KIND, "the envelope kind is the ONE session-spawn literal (no second constant)");
        assert.equal(pushed[0].nodeId, "n1", "the envelope is addressed to the TARGET worker");
        assert.equal(pushed[0].signal.sessionId, body.sessionId, "the frame's fields ride INSIDE signal");

        // …and now the SERVE-process half, for real.
        const stream = await startControlStreamServer({
          peerNodeIds: ["n1"],
          peersByAddress: [{ nodeId: "n1", dialAddress: "127.0.0.1" }],
          storeOptions: globalStoreOptions,
        });
        let client = null;
        try {
          const received = [];
          client = createWorkerStreamClient({
            transport: createWorkerWsTransport(`ws://127.0.0.1:${stream.server.address().port}/`),
            nodeId: "n1",
            workspaceId: "ws-aof",
          });
          client.onSessionSpawn((frame) => received.push(frame));
          assert.equal(await client.ensureConnected(), true);
          await waitFor(() => stream.directiveTargets.get("n1") != null, { label: "worker target registration" });

          const router = createTerminalInputRouter({
            dispatchDirective: (directive) => stream.dispatchDirective(directive),
            now: () => "2026-08-14T00:00:00.000Z",
          });
          assert.equal(router.apply(pushed[0]), true, "the serve process's router accepts the session-spawn envelope and reports it routed");

          await waitFor(() => received.length === 1, { label: "the worker's session-spawn handler" });
          assert.equal(received[0].kind, "session-spawn", "the worker received a session-spawn down-frame");
          assert.equal(received[0].to, "n1", "…addressed to n1");
          assert.equal(
            received[0].sessionId,
            body.sessionId,
            "…and the dispatched frame's sessionId is the SAME id the 200 handed the browser — one address, minted once, control-side",
          );
          assert.equal(received[0].workspaceId, "ws-aof");
        } finally {
          client?.stop();
          stream.stop();
        }
      });
    },
  },

  // ══ Scenario: the optional assistant field is forwarded ══
  {
    name: "mesh-ui-session-route/00 the optional `assistant` rides through to the dispatched frame",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", assistant: "codex" });
        assert.equal(response.status, 200, `the spawn is accepted — got ${JSON.stringify(await response.json())}`);
        const { dispatched } = routeCapturedEnvelope(pushed[0]);
        assert.equal(dispatched.length, 1);
        assert.equal(dispatched[0].assistant, "codex", "the dispatched frame's assistant is \"codex\"");
      });
    },
  },

  // ══ Scenario: the optional itemRef field is forwarded ══
  {
    name: "mesh-ui-session-route/00 the optional `itemRef` rides through to the dispatched frame",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", itemRef: "50" });
        assert.equal(response.status, 200, `the spawn is accepted — got ${JSON.stringify(await response.json())}`);
        const { dispatched } = routeCapturedEnvelope(pushed[0]);
        assert.equal(dispatched[0].itemRef, "50", "the dispatched frame's itemRef is \"50\"");
      });
    },
  },

  // ══ Scenario: absent assistant defaults to "claude" ══
  {
    name: "mesh-ui-session-route/00 an absent `assistant` defaults to \"claude\" on the dispatched frame (the default has ONE home — the frame builder)",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        assert.equal(response.status, 200);
        const { dispatched } = routeCapturedEnvelope(pushed[0]);
        assert.equal(dispatched[0].assistant, "claude");
        assert.equal(dispatched[0].itemRef, null, "…and an absent itemRef is null, never a fabricated ref");
      });
    },
  },

  // ══ Scenario: GET on the spawn path returns 405 ══
  {
    name: "mesh-ui-session-route/00 GET /api/mesh/session is a clean 405 with Allow: POST (and every other non-POST method too)",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
          const response = await fetch(new URL("/api/mesh/session", url), { method });
          assert.equal(response.status, 405, `${method} /api/mesh/session is a 405`);
          assert.equal(response.headers.get("allow"), "POST", `${method} /api/mesh/session carries Allow: POST`);
          const body = await response.json();
          assert.equal(body.code, "method-not-allowed");
        }
        assert.equal(pushed.length, 0, "no refusal dispatched anything");
      });
    },
  },

  // ══ Scenario: cross-origin POST is refused with 403 ══
  {
    name: "mesh-ui-session-route/00 a cross-origin POST is refused 403 cross-origin-refused, before the body is read",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const foreign = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" }, { origin: "http://evil.example" });
        assert.equal(foreign.status, 403);
        assert.equal((await foreign.json()).code, "cross-origin-refused");

        // The bare/no-Origin form (a simple cross-site form POST) is the same refusal.
        const bare = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" }, { origin: "NONE" });
        assert.equal(bare.status, 403);
        assert.equal((await bare.json()).code, "cross-origin-refused");
        assert.equal(pushed.length, 0, "neither refusal dispatched anything");
      });
    },
  },

  // ══ Scenario: non-JSON content-type is refused with 400 ══
  {
    name: "mesh-ui-session-route/00 a non-JSON Content-Type is refused 400 invalid-content-type",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" }, { contentType: "text/plain" });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).code, "invalid-content-type");
        assert.equal(pushed.length, 0, "the refusal dispatched nothing");
      });
    },
  },

  // ══ Scenario Outline: the Examples table, driven row by row ══
  //
  // Row 3 (`n2` / `ws-test`) is why the fixture takes lists: a single-node,
  // single-workspace fixture cannot tell "the posted target rode through" from "the
  // only value there was" — the assign route's own F21 lesson, one milestone on.
  {
    name: "mesh-ui-session-route/00 every Examples row spawns 200 and dispatches ITS OWN (nodeId, workspaceId, assistant, itemRef) — never a default and never the other row's",
    async run() {
      const rows = [
        { nodeId: "n1", workspaceId: "ws-aof", assistant: "claude", itemRef: null, expectedStatus: 200 },
        { nodeId: "n1", workspaceId: "ws-aof", assistant: "codex", itemRef: "50", expectedStatus: 200 },
        { nodeId: "n2", workspaceId: "ws-test", assistant: "claude", itemRef: null, expectedStatus: 200 },
      ];
      await withSessionRouteFixture(async ({ url, pushed }) => {
        for (const row of rows) {
          const payload = { nodeId: row.nodeId, workspaceId: row.workspaceId };
          if (row.assistant != null) payload.assistant = row.assistant;
          if (row.itemRef != null) payload.itemRef = row.itemRef;
          const response = await postSession(url, payload);
          const body = await response.json();
          assert.equal(response.status, row.expectedStatus, `${row.nodeId}/${row.workspaceId} → ${row.expectedStatus} (got ${response.status} ${JSON.stringify(body)})`);
          assert.match(body.sessionId, UUID_V4);

          const envelope = pushed[pushed.length - 1];
          assert.equal(envelope.nodeId, row.nodeId, "the envelope targets the POSTED node");
          const { dispatched } = routeCapturedEnvelope(envelope);
          assert.equal(dispatched[0].to, row.nodeId);
          assert.equal(dispatched[0].workspaceId, row.workspaceId);
          assert.equal(dispatched[0].assistant, row.assistant);
          assert.equal(dispatched[0].itemRef, row.itemRef);
          assert.equal(dispatched[0].sessionId, body.sessionId);
        }
        assert.equal(pushed.length, rows.length, "one push per accepted row — no re-dispatch, no swallowed row");
        assert.equal(
          new Set(pushed.map((envelope) => envelope.signal.sessionId)).size,
          rows.length,
          "every spawn minted its OWN sessionId — an address that resolves to two sessions is not an address",
        );
      }, {
        workspaces: [{ id: "ws-aof", name: "aof" }, { id: "ws-test", name: "test" }],
        nodes: [{ nodeId: "n1", live: true }, { nodeId: "n2", live: true }],
      });
    },
  },

  // ═══ Task 02 — honest failure responses ════════════════════════════════════════

  // ══ Scenario: missing nodeId returns 400 invalid-body ══
  {
    name: "mesh-ui-session-route/02 a missing nodeId is 400 invalid-body, and the error NAMES the missing field",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { workspaceId: "ws-aof" });
        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.code, "invalid-body");
        assert.match(body.error, /nodeId/, "the refusal names the missing field — a coded 400 that says only \"invalid body\" leaves the operator guessing");
        assert.equal(pushed.length, 0, "nothing was dispatched");
      });
    },
  },

  // ══ Scenario: missing workspaceId returns 400 invalid-body ══
  {
    name: "mesh-ui-session-route/02 a missing workspaceId is 400 invalid-body (there is NO fallback to the daemon's own workspace)",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1" });
        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.code, "invalid-body");
        assert.match(body.error, /workspaceId/);
        assert.equal(pushed.length, 0, "an omitted workspace never silently becomes the daemon's own — the F21 class, closed by construction");

        // A blank string is the same refusal, not a pass-through.
        const blank = await postSession(url, { nodeId: "n1", workspaceId: "   " });
        assert.equal(blank.status, 400);
        assert.equal((await blank.json()).code, "invalid-body");

        // …and a malformed body is a coded 400 too, never a stack trace.
        const malformed = await postSession(url, null, { rawBody: "{not json" });
        assert.equal(malformed.status, 400);
        assert.equal((await malformed.json()).code, "invalid-body");
        assert.equal(pushed.length, 0);
      });
    },
  },

  // ══ Scenario: unknown workspace returns 404 workspace-not-found ══
  {
    name: "mesh-ui-session-route/02 an unknown workspace is 404 workspace-not-found",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-unknown" });
        const body = await response.json();
        assert.equal(response.status, 404, `got ${response.status} ${JSON.stringify(body)}`);
        assert.equal(body.code, "workspace-not-found");
        assert.equal(pushed.length, 0);
      });
    },
  },

  // ══ Scenario: workspace not local returns 409 workspace-not-local ══
  //
  // PRODUCED, never painted: the row is published by the REAL publisher and the
  // checkout is then removed — the ordinary shape of a row another machine published
  // into a synced projection (m47/ADR-011's own producer).
  {
    name: "mesh-ui-session-route/02 a workspace whose checkout is not on this machine is 409 workspace-not-local — the same code, for the same fact, as the assign and board-url routes",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-remote" });
        const body = await response.json();
        assert.equal(response.status, 409, `got ${response.status} ${JSON.stringify(body)}`);
        assert.equal(body.code, "workspace-not-local");
        assert.equal(pushed.length, 0);

        // …and the LOCAL workspace on the same face still spawns, so the refusal is
        // about that row and not about the face being broken.
        const ok = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        assert.equal(ok.status, 200);
        assert.equal(pushed.length, 1);
      }, {
        workspaces: [{ id: "ws-aof", name: "aof" }, { id: "ws-remote", name: "remote", vanish: true }],
      });
    },
  },

  // ══ Scenario: target node not connected returns 503 session-target-not-connected ══
  //
  // ADR-006 decision 7 — answered from the `queryGlobalMeshStatus` projection's node
  // presence liveness (the fact the grid renders as "online"), NOT from the dispatch:
  // the relay push is fan-out and yields no synchronous delivery result, and a session
  // spawn writes no store row it could be delivered from later.
  {
    name: "mesh-ui-session-route/02 a target that is not live is 503 session-target-not-connected — for a stale node AND for a node the roster has never seen",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        for (const nodeId of ["n2", "never-seen"]) {
          const response = await postSession(url, { nodeId, workspaceId: "ws-aof" });
          const body = await response.json();
          assert.equal(response.status, 503, `${nodeId} → 503 (got ${response.status} ${JSON.stringify(body)})`);
          assert.equal(body.code, "session-target-not-connected");
        }
        assert.equal(pushed.length, 0, "a not-connected target dispatches NOTHING — no ghost session, no ghost grid slot");

        // Non-vacuity: the LIVE node on the same face spawns, so the 503s above are
        // about those targets rather than about a face that refuses everything.
        const live = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        assert.equal(live.status, 200, `the live node still spawns — got ${JSON.stringify(await live.clone().json())}`);
        assert.equal(pushed.length, 1);
      }, {
        nodes: [{ nodeId: "n1", live: true }, { nodeId: "n2", live: false }],
      });
    },
  },

  // ══ Scenario: control has no mesh identity returns 409 control-identity-unknown ══
  {
    name: "mesh-ui-session-route/02 a control node with NO mesh identity refuses 409 control-identity-unknown — never an uncoded 500",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        const body = await response.json();
        assert.notEqual(response.status, 500, `every failure on this path names its own cause — got ${JSON.stringify(body)}`);
        assert.equal(response.status, 409);
        assert.equal(body.code, "control-identity-unknown");
        assert.equal(pushed.length, 0);
      }, { controlNodeId: null });
    },
  },

  // ══ ADR-006 decision 5 — an unconfigured relay is an honest refusal ══
  //
  // Not in the locked task features (they predate ADR-006) but ruled by it in terms:
  // "never a 200 for a session that can never spawn". `terminalInputPush == null` IS
  // `loopbackRelayUrl(config) == null` as the production wiring constructs it
  // (createTerminalRelayPushTransport returns null for an absent/malformed relay url).
  {
    name: "mesh-ui-session-route/02 a face with NO relay configured refuses 503 session-dispatch-unavailable rather than returning a 200 for a session that can never spawn",
    async run() {
      await withSessionRouteFixture(async ({ url }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        const body = await response.json();
        assert.equal(response.status, 503, `got ${response.status} ${JSON.stringify(body)}`);
        assert.equal(body.code, "session-dispatch-unavailable");
        assert.notEqual(body.ok, true);
      }, { relay: false });
    },
  },

  // ══ A PRESENT-BUT-WRONG-TYPED optional field is a coded refusal, never a silent drop ══
  //
  // REVIEW FIX (2026-08-14), measured against the REAL face before the fix:
  //     itemRef as NUMBER 50  -> 200 ok :: dispatched itemRef=null
  //     itemRef as object     -> 200 ok :: dispatched itemRef=null
  //     assistant as NUMBER   -> 200 ok :: dispatched assistant="claude"
  // `50` is the NATURAL spelling of an item ref (the locked Examples table's own row
  // sends `"50"`), so an operator asking for a session on item 50 got a bare
  // checkout-root shell and an `ok: true`. On a route whose feature is titled "Honest
  // failure responses" that is the contract inverted: the field must name itself.
  {
    name: "mesh-ui-session-route/02 a PRESENT but wrong-typed `itemRef`/`assistant` is 400 invalid-body NAMING the field — never silently dropped behind a 200",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const rows = [
          { field: "itemRef", value: 50, label: "a NUMBER — the natural spelling of an item ref" },
          { field: "itemRef", value: { ref: "50" }, label: "an object" },
          { field: "itemRef", value: ["50"], label: "an array" },
          { field: "itemRef", value: true, label: "a boolean" },
          { field: "assistant", value: 1, label: "a NUMBER" },
          { field: "assistant", value: { id: "claude" }, label: "an object" },
          { field: "assistant", value: ["claude"], label: "an array" },
        ];
        for (const row of rows) {
          const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", [row.field]: row.value });
          const body = await response.json();
          assert.equal(response.status, 400, `${row.field} as ${row.label} → 400 (got ${response.status} ${JSON.stringify(body)})`);
          assert.equal(body.code, "invalid-body");
          assert.match(body.error, new RegExp(row.field), `the refusal NAMES the offending field (${row.field})`);
          assert.notEqual(body.ok, true);
        }
        assert.equal(pushed.length, 0, "not one wrong-typed request dispatched anything");

        // NON-VACUITY, and the locked contract's own half: ABSENT STAYS ABSENT. The
        // scenario "absent assistant defaults to claude" and the Examples row
        // `itemRef: null` are green through the SAME face that refuses the rows above,
        // and an explicit `null` is "not supplied" rather than a wrong type.
        const absent = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        assert.equal(absent.status, 200, `an ABSENT optional field is still a 200 — got ${JSON.stringify(await absent.clone().json())}`);
        const explicitNull = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", assistant: null, itemRef: null });
        assert.equal(explicitNull.status, 200, `an explicit null is "not supplied", not a wrong type — got ${JSON.stringify(await explicitNull.clone().json())}`);
        assert.equal(pushed.length, 2, "both accepted requests dispatched exactly once each");
        for (const envelope of pushed) {
          const { dispatched } = routeCapturedEnvelope(envelope);
          assert.equal(dispatched[0].assistant, "claude", "…defaulted by the frame builder, its ONE home");
          assert.equal(dispatched[0].itemRef, null, "…and a fabricated ref is never invented");
        }
      });
    },
  },

  // ══ `assistant` is a CLOSED SET, not free text (ADR-002 dec 2 / ADR-007 dec 3) ══
  //
  // REVIEW FIX (2026-08-14): the route forwarded ANYTHING — `"not-a-provider"`,
  // `"../../../etc/passwd"`, a 4096-character string — to the worker. Traversal is closed
  // downstream by `safeSegment` (src/mesh/session.mjs), but LENGTH is not, and the value
  // becomes a filename segment of the worker's session leaf: an over-long `assistant` can
  // fail the worker's session-record write AFTER the PTY is already alive, i.e. a live
  // shell with no grid record. The set is validated at the door, from its one home.
  {
    name: "mesh-ui-session-route/02 a present `assistant` outside the closed {claude, codex, gemini} set is 400 invalid-body — traversal, free text and a 4096-char segment all refused at the door",
    async run() {
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const rejected = [
          "not-a-provider",
          "../../../etc/passwd",
          "..",
          "claude/../codex",
          "Claude",
          "x".repeat(4096),
        ];
        for (const assistant of rejected) {
          const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", assistant });
          const body = await response.json();
          const shown = assistant.length > 24 ? `${assistant.slice(0, 12)}…(${assistant.length} chars)` : assistant;
          assert.equal(response.status, 400, `assistant ${JSON.stringify(shown)} → 400 (got ${response.status} ${JSON.stringify(body)})`);
          assert.equal(body.code, "invalid-body");
          assert.match(body.error, /assistant/, "the refusal names the field…");
          assert.match(body.error, /claude/, "…and states the vocabulary it must come from");
        }
        assert.equal(pushed.length, 0, "no out-of-set assistant ever reached the relay");

        // …and EVERY member of the set is still accepted, driven from the set itself so a
        // future provider added to PROVIDER_IDS is covered here the day it lands.
        for (const assistant of PROVIDER_IDS) {
          const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof", assistant });
          assert.equal(response.status, 200, `assistant "${assistant}" is a member of the set — got ${JSON.stringify(await response.clone().json())}`);
          const { dispatched } = routeCapturedEnvelope(pushed[pushed.length - 1]);
          assert.equal(dispatched[0].assistant, assistant, "…and it rides through VERBATIM, never substituted for a default");
        }
        assert.equal(pushed.length, PROVIDER_IDS.length, "one dispatch per accepted member, none for the refusals");
      });
    },
  },

  // ══ A relay hand-off that THROWS is 503 session-dispatch-failed, and leaks nothing ══
  //
  // REVIEW FIX (2026-08-14) — this branch had NO test at all: nothing injected a throwing
  // `push()`, so the one code that names "the bridge itself failed" was never exercised.
  // Two properties, both load-bearing:
  //   1. nothing crossed the bridge (a 503 that had already dispatched would be a ghost
  //      session the operator was told never started);
  //   2. the TRANSPORT's own message stays out of the HTTP body. It names the relay's
  //      host and port verbatim; the browser has no use for that and no business
  //      learning it. It goes to `reportDegrade`, beside the daemons' own logs.
  {
    name: "mesh-ui-session-route/02 a relay push that THROWS is 503 session-dispatch-failed with ZERO envelopes recorded — and the transport's host:port message never reaches the response body",
    async run() {
      const transportError = new Error("relay socket ECONNREFUSED 127.0.0.1:4180");
      await withSessionRouteFixture(async ({ url, pushed }) => {
        const response = await postSession(url, { nodeId: "n1", workspaceId: "ws-aof" });
        const body = await response.json();
        assert.equal(response.status, 503, `a relay hand-off that threw is a coded 503 — got ${response.status} ${JSON.stringify(body)}`);
        assert.equal(body.code, "session-dispatch-failed", "…the code that means exactly 'the relay hand-off threw'");
        assert.notEqual(body.ok, true);
        assert.equal(pushed.length, 0, "a hand-off that threw recorded NO envelope — nothing crossed the bridge");

        const rendered = JSON.stringify(body);
        assert.ok(!/ECONNREFUSED/.test(rendered), `the transport error class is not returned — got ${rendered}`);
        assert.ok(!/127\.0\.0\.1|4180/.test(rendered), `the relay host/port is not returned — got ${rendered}`);
        assert.match(body.error, /relay/i, "the refusal still names its own cause in the face's own words");

        // The face survives it, and a later GET still answers.
        const survived = await fetch(new URL("/api/mesh/status", url));
        assert.equal(survived.status, 200);
      }, { pushError: transportError });
    },
  },

  // ══ ONE CODE, ONE FACT: the catch-all is not a second spelling of the relay failure ══
  //
  // `session-dispatch-failed` was minted TWICE — once for the relay `push()` that threw
  // (503) and once as the route's uncoded catch-all (500) — so two different faults were
  // indistinguishable to a client reading the code. The catch-all now carries its own
  // name, following the siblings' `<route>-failed` shape (`assign-failed`,
  // `board-url-failed`), and deliberately NOT `session-spawn-failed`, which story 03's
  // WORKER ack already claims (ADR-007 decision 4) on the far side of the stream.
  //
  // Read off the SOURCE because the catch-all's own trigger is an unexpected fault on the
  // resolution path — a store read or fs probe that throws — which no fixture can produce
  // honestly without faking the seam it is meant to be measuring.
  {
    name: "mesh-ui-session-route/02 the session route's catch-all has its OWN code — `session-dispatch-failed` is spelled exactly once (the relay hand-off), and the catch-all is neither it nor story 03's `session-spawn-failed`",
    async run() {
      const source = await readFile(new URL("../../../src/mesh/ui-serve.mjs", import.meta.url), "utf8");
      const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const dispatchFailedCount = (code.match(/"session-dispatch-failed"/g) ?? []).length;
      assert.equal(dispatchFailedCount, 1, "`session-dispatch-failed` names ONE fact — the relay hand-off that threw — and is spelled once");
      const catchAll = /error\.code\s*\?\?\s*"([a-z-]+)"/g;
      const catchAlls = [...code.matchAll(catchAll)].map((match) => match[1]);
      assert.ok(catchAlls.includes("session-route-failed"), `the session route's catch-all carries its own name — found ${JSON.stringify(catchAlls)}`);
      assert.ok(!catchAlls.includes("session-dispatch-failed"), "the catch-all is NOT a second spelling of the relay-hand-off code");
      assert.ok(!/"session-spawn-failed"/.test(code), "…and never borrows story 03's worker-ack code, which is minted on the WORKER");
      assert.equal(new Set(catchAlls).size, catchAlls.length, `every route's catch-all is distinct — found ${JSON.stringify(catchAlls)}`);
    },
  },

  // ══ The face survives every refusal, and writes nothing ══
  {
    name: "mesh-ui-session-route/02 every refusal leaves the face serving — a follow-up GET /api/mesh/status still answers 200",
    async run() {
      await withSessionRouteFixture(async ({ url }) => {
        const probes = [
          () => postSession(url, { workspaceId: "ws-aof" }),
          () => postSession(url, { nodeId: "n1" }),
          () => postSession(url, { nodeId: "n1", workspaceId: "ws-unknown" }),
          () => postSession(url, { nodeId: "ghost", workspaceId: "ws-aof" }),
          () => postSession(url, { nodeId: "n1", workspaceId: "ws-aof" }, { contentType: "text/plain" }),
          // the two body-shape refusals added by the 2026-08-14 review fixes
          () => postSession(url, { nodeId: "n1", workspaceId: "ws-aof", itemRef: 50 }),
          () => postSession(url, { nodeId: "n1", workspaceId: "ws-aof", assistant: "not-a-provider" }),
          () => fetch(new URL("/api/mesh/session", url), { method: "DELETE" }),
        ];
        for (const probe of probes) {
          const response = await probe();
          assert.notEqual(response.status, 200, "no refusal is ever a 200");
          assert.notEqual((await response.json()).ok, true);
        }
        const survived = await fetch(new URL("/api/mesh/status", url));
        assert.equal(survived.status, 200, "the face survived every refusal");
      });
    },
  },

  // ═══ The ROUTER's own shape validation (ADR-006 decision 3) ═══════════════════
  //
  // The control-side router validates SHAPE ONLY and stays kind-blind to everything
  // else. These lanes drive the REAL router directly — the envelope the route pushes
  // is not the only thing that can arrive on that socket.
  {
    name: "mesh-ui-session-route/00 the relay router routes a well-formed session-spawn, drops one missing nodeId/sessionId/workspaceId, and ignores a foreign kind entirely",
    run() {
      const wellFormed = {
        kind: SESSION_SPAWN_KIND,
        nodeId: "n1",
        signal: { sessionId: "s-1", workspaceId: "ws-aof", assistant: "codex", itemRef: "50", at: "2026-08-14T10:00:00.000Z" },
      };
      const good = routeCapturedEnvelope(wellFormed);
      assert.equal(good.routed, true);
      assert.deepEqual(good.dispatched[0], {
        kind: "session-spawn",
        to: "n1",
        sessionId: "s-1",
        workspaceId: "ws-aof",
        assistant: "codex",
        itemRef: "50",
        at: "2026-08-14T10:00:00.000Z",
      }, "the router rebuilds the ADR-002 down-frame through the lane's own builder, carrying the control's mint instant");

      for (const [label, signal] of [
        ["no sessionId", { workspaceId: "ws-aof" }],
        ["no workspaceId", { sessionId: "s-1" }],
        ["empty signal", {}],
      ]) {
        const dropped = routeCapturedEnvelope({ kind: SESSION_SPAWN_KIND, nodeId: "n1", signal });
        assert.equal(dropped.routed, false, `${label} is dropped`);
        assert.equal(dropped.dispatched.length, 0, `${label} dispatches nothing`);
        assert.equal(dropped.logs[0]?.code, "session-spawn-invalid", `${label} is reported by code`);
      }

      const noNode = routeCapturedEnvelope({ kind: SESSION_SPAWN_KIND, nodeId: "", signal: { sessionId: "s-1", workspaceId: "ws-aof" } });
      assert.equal(noNode.routed, false, "a blank target nodeId is dropped");
      assert.equal(noNode.dispatched.length, 0);

      // A NOT-CONNECTED target: `dispatchDirective` reports it, and the router reports
      // the drop by code rather than claiming a delivery it did not make.
      const missed = routeCapturedEnvelope(wellFormed, { sent: false });
      assert.equal(missed.routed, false);
      assert.equal(missed.logs.at(-1)?.code, "session-spawn-target-not-connected");

      // KIND-BLIND: a terminal-frame on the same subscriber socket is untouched.
      const foreign = routeCapturedEnvelope({ kind: "terminal-frame", nodeId: "n1", signal: { sessionId: "s-1", bytes: "hi" } });
      assert.equal(foreign.routed, false);
      assert.equal(foreign.dispatched.length, 0);
      assert.equal(foreign.logs.length, 0, "a foreign kind is not even logged — it belongs to another consumer");
    },
  },
];
