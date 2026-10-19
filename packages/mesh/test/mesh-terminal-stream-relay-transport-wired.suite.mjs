// test/mesh/terminal/mesh-terminal-stream-relay-transport-wired.test.mjs — producer-fed behavioural
// coverage for the milestone 38 / story 06 ADR-014 AMENDMENT (2026-07-19, closing
// BLOCKER F-38.06 — the HYBRID transport). The fitness
// `acd-terminal-stream-transport-wired` pins the SOURCE SHAPE (the worker's
// onOutputChunk wired to client.sendTerminalFrame, control's onTerminalFrame branch +
// known-port loopback broker, the fleet's loopback subscriber). It cannot itself prove
// a frame actually TRAVERSES the two legs — that is what this module closes, entirely
// in-process, entirely against the REAL production modules (the milestone's defining
// producer-fed rule, F1/F4/F12/F-38.05: a consumer proven only against a convenient
// fixture ships green-but-inert).
//
// THE HYBRID, each leg on the transport its bind fits:
//   - CROSS-MACHINE (worker -> control): the FABRIC. A REAL createWorkerStreamClient
//     over a REAL createWorkerWsTransport -> a REAL startControlStreamServer; the
//     worker's terminal-frame reaches control's onTerminalFrame sink with the
//     CONNECTION-bound nodeId (T6), and is NEVER store-applied (ADR-014 inv.3 — the
//     REAL global store is queried and stays empty).
//   - SAME-MACHINE (control -> the fleet-UI process): a LOOPBACK relay. control's
//     onTerminalFrame pushes each fabric-received frame into a REAL serveRelay() broker
//     (EXACTLY the launcher wiring: onTerminalFrame: (frame) => controlTerminalPush?.push(frame)),
//     a REAL createTerminalMirrorSubscriberTransport feeds a REAL createTerminalMirror,
//     and a REAL serveMeshUi `/ws/terminal-view` client observes the exact bytes.
// The full chain is driven end-to-end so the transport genuinely carries a frame; an
// unroutable frame is proven dropped over that same real chain.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { controlStreamServerServices, globalWorkStoreServices, meshRelayServices, meshTerminalMirrorServices, meshTerminalRelayBridgeServices, meshUiServeServices, workerStreamClientServices } from "./support/mesh-services.mjs";
import { createMeshStore } from "../src/store.mjs";
const { serveRelay } = meshRelayServices().relay;
const { startControlStreamServer } = controlStreamServerServices();
const { createWorkerStreamClient, createWorkerWsTransport } = workerStreamClientServices();
const { createTerminalMirror, createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber } = meshTerminalMirrorServices();
const { createTerminalRelayPushTransport } = meshTerminalRelayBridgeServices();
const { serveMeshUi, meshUiDist } = meshUiServeServices();
const { openGlobalWorkProjectionStore, queryGlobalWorkProjection } = globalWorkStoreServices();

const NOW = "2026-07-19T10:00:00.000Z";

function waitFor(predicate, { timeoutMs = 2500, label = "condition" } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      let ok = false;
      try { ok = predicate(); } catch { ok = false; }
      if (ok) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error(`waitFor(${label}) timeout`));
      setTimeout(tick, 5);
    };
    tick();
  });
}

const settle = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n",
    "utf8",
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
}

// openTerminalView(baseUrl, { nodeId, sessionId }) — a REAL ws client opening the REAL
// `/ws/terminal-view` route (mirrors test/mesh/fleet/mesh-fleet-terminal-view-mirror.test.mjs).
function openTerminalView(baseUrl, { nodeId, sessionId, timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const wsUrl = new URL("/ws/terminal-view", baseUrl.replace(/^http/, "ws"));
    if (nodeId != null) wsUrl.searchParams.set("nodeId", nodeId);
    if (sessionId != null) wsUrl.searchParams.set("sessionId", sessionId);
    const ws = new WebSocket(wsUrl);
    const frames = [];
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve({ opened: false, ws: null, frames }); } }, timeoutMs);
    ws.on("open", () => { if (!settled) { settled = true; clearTimeout(timer); resolve({ opened: true, ws, frames }); } });
    ws.on("message", (data) => frames.push(data.toString()));
    ws.on("error", () => { if (!settled) { settled = true; clearTimeout(timer); resolve({ opened: false, ws: null, frames }); } });
  });
}

export const meshTerminalStreamRelayTransportWiredTests = [
  // --- CROSS-MACHINE leg: worker -> control over the REAL fabric; reaches
  //     onTerminalFrame with the connection-bound nodeId, never store-applied ---
  {
    name: "38-06/ADR-014-AMENDMENT fabric leg: a worker's terminal-frame rides UP the REAL stream client to the REAL control-stream-server, reaches onTerminalFrame with the CONNECTION-bound nodeId (T6), and is NEVER store-applied (ADR-014 inv.3)",
    async run() {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-terminal-fabric-"));
      const received = [];
      const server = await startControlStreamServer({
        peerNodeIds: ["worker-conn"],
        // The connection resolves to "worker-conn" regardless of what the worker
        // self-declares — the admission/attribution identity (T6).
        resolveOrigin: () => ({ nodeId: "worker-conn" }),
        storeOptions: { env: { AOF_GLOBAL_HOME: home } },
        onTerminalFrame: (frame, meta) => received.push({ frame, meta }),
      });
      let client;
      try {
        const port = server.server.address().port;
        const transport = createWorkerWsTransport(`ws://127.0.0.1:${port}/`);
        // The worker self-declares a DIFFERENT nodeId than its connection resolves to —
        // so the T6 assertion below (onTerminalFrame is handed the connection-bound id)
        // is non-vacuous.
        client = createWorkerStreamClient({ transport, nodeId: "worker-self-declared", workspaceId: "ws-1", now: () => NOW });
        assert.equal(await client.ensureConnected(), true, "the worker connects to the REAL control-stream server");

        const sent = await client.sendTerminalFrame("sess-1", "live pty bytes over the fabric\n");
        assert.equal(sent.sent, true, "the terminal-frame was sent up the fabric connection");
        await waitFor(() => received.length >= 1, { label: "control receives the terminal-frame on its onTerminalFrame sink" });

        const { frame, meta } = received[0];
        assert.equal(frame.kind, "terminal-frame", "the branched frame is the terminal-frame kind");
        assert.equal(frame.signal.sessionId, "sess-1", "the sessionId rides inside the opaque signal");
        assert.equal(frame.signal.bytes, "live pty bytes over the fabric\n", "the exact PTY bytes crossed the fabric byte-for-byte");
        // T6: the sink is handed the CONNECTION-bound nodeId, never the self-declared one.
        assert.equal(meta.nodeId, "worker-conn", "onTerminalFrame is handed the CONNECTION-bound nodeId (T6), never the worker's self-declared frame.nodeId");
        assert.equal(frame.nodeId, "worker-self-declared", "the frame still self-declares the worker's own nodeId — which the sink deliberately ignores");

        // (b) NEVER persisted — the terminal-frame branched BEFORE applyStreamFrame, so
        // the REAL global store was never touched.
        const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          assert.equal(queryGlobalWorkProjection(store).items.length, 0, "the terminal-frame wrote NOTHING to the global store (never store-applied — ADR-014 inv.3)");
        } finally {
          store.close();
        }
      } finally {
        client?.stop?.();
        server.stop();
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  // --- FULL HYBRID end-to-end: worker -> fabric -> control -> loopback relay ->
  //     mirror -> /ws/terminal-view client; plus the unroutable-drop over that chain ---
  {
    name: "38-06/ADR-014-AMENDMENT full hybrid end-to-end: worker sendTerminalFrame -> REAL control onTerminalFrame -> REAL serveRelay loopback broker -> REAL mirror subscriber -> a /ws/terminal-view client observes the exact bytes; an unroutable frame is DROPPED and the live stream keeps working",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-terminal-hybrid-"));
      const distRoot = path.join(tmp, "dist");
      const home = path.join(tmp, "home");
      const root = path.join(tmp, "repo");
      await mkdir(path.join(root, ".aof"), { recursive: true });
      await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
      await writeDist(meshUiDist(distRoot));

      // The SAME-MACHINE loopback relay leg, keyed by config.mesh.relay.url (exactly the
      // production seam createTerminalRelayPushTransport / createTerminalMirrorSubscriberTransport
      // both read).
      const relay = await serveRelay({ port: 0 });
      const config = { mesh: { relay: { url: relay.url } } };
      // control's loopback push into the broker — the SAME transport the launcher's
      // onTerminalFrame closes over.
      const controlPush = createTerminalRelayPushTransport(config);

      // The REAL fabric control server: its onTerminalFrame bridges fabric->loopback,
      // byte-for-byte the launcher's `onTerminalFrame: (frame) => controlTerminalPush?.push(frame)`.
      const controlServer = await startControlStreamServer({
        peerNodeIds: ["worker-a"],
        resolveOrigin: () => ({ nodeId: "worker-a" }),
        storeOptions: { env: { AOF_GLOBAL_HOME: home } },
        onTerminalFrame: (frame) => controlPush.push(frame),
      });

      // The REAL fleet mirror, fed by the REAL loopback subscriber transport.
      const mirror = createTerminalMirror();
      const subscriber = await startTerminalMirrorSubscriber({ transport: createTerminalMirrorSubscriberTransport(config), mirror });
      assert.ok(subscriber.connected, "the fleet subscriber connects to the REAL loopback relay broker");

      const session = await serveMeshUi({ projectDir: root, port: 0, repoRoot: distRoot, globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } }, terminalMirror: mirror });

      let client;
      let viewer;
      try {
        viewer = await openTerminalView(session.url, { nodeId: "worker-a", sessionId: "sess-1" });
        assert.ok(viewer.opened, "the /ws/terminal-view card for (worker-a, sess-1) opens");

        const port = controlServer.server.address().port;
        client = createWorkerStreamClient({ transport: createWorkerWsTransport(`ws://127.0.0.1:${port}/`), nodeId: "worker-a", workspaceId: "ws-1", now: () => NOW });
        assert.equal(await client.ensureConnected(), true, "the worker connects to the REAL control-stream server");

        // The whole chain, end-to-end.
        await client.sendTerminalFrame("sess-1", "hello across the hybrid\n");
        await waitFor(() => viewer.frames.length >= 1, { label: "the /ws/terminal-view client observes the streamed bytes end-to-end" });
        assert.equal(viewer.frames[0], "hello across the hybrid\n", "the exact PTY bytes traversed worker -> fabric -> control -> loopback relay -> mirror -> browser");

        // An UNROUTABLE frame (a session no card is open for) is dropped over the SAME
        // real chain — never delivered to the (worker-a, sess-1) card.
        await client.sendTerminalFrame("sess-UNKNOWN", "should never reach the sess-1 card\n");
        await settle();
        assert.equal(viewer.frames.length, 1, "an unroutable terminal-frame is DROPPED — never delivered to the (worker-a, sess-1) card");

        // …and the live stream keeps working after the unroutable frame.
        await client.sendTerminalFrame("sess-1", "still streaming\n");
        await waitFor(() => viewer.frames.length >= 2, { label: "the open card still receives its own frames after the unroutable one" });
        assert.equal(viewer.frames[1], "still streaming\n");
      } finally {
        client?.stop?.();
        try { viewer?.ws?.close?.(); } catch { /* noop */ }
        await new Promise((resolve) => session.server.close(resolve));
        subscriber.stop();
        controlPush.close();
        controlServer.stop();
        await relay.stop();
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  // ═══ 162 task 00 — a loop-driven session streams to its card, through its node's OWN daemon ═══
  // The drive child is played by the REAL ingress client; the daemon by the REAL ingress with the
  // launcher's exact forward for its role; the rest of the chain is the m38 one, unchanged.
  {
    name: "loop-session-streams-to-its-card/00 E1 · a sequential loop drive's session streams live on the control node — the mirror receives a terminal frame for the control node and that session carrying exactly the chunk",
    async run() {
      await withControlChain(async ({ ingress, view, readAddress }) => {
        const viewer = await view({ nodeId: CONTROL_NODE, sessionId: "89b1d500" });
        assert.ok(viewer.opened, "the card for (control, session) opens");
        const child = openTerminalIngressClient({ readAddress });
        child.frame("89b1d500", "refining 03/07 …\r\n");
        assert.equal(await child.admitted, true, "the child's connection is admitted by the control daemon's ingress");
        await waitFor(() => viewer.frames.length >= 1, { label: "the card receives the loop's chunk" });
        assert.deepEqual(viewer.frames, ["refining 03/07 …\r\n"], "exactly the chunk, byte for byte");
        await child.close();
        assert.ok(ingress.forwarded.every(([, nodeId]) => nodeId === CONTROL_NODE), "every envelope was built with the control daemon's own id");
      });
    },
  },
  {
    name: "loop-session-streams-to-its-card/00 E2 · each wave lane's session streams only its own output — two lanes' chunks land each under its own session, and neither card shows the other's bytes",
    async run() {
      await withControlChain(async ({ view, readAddress }) => {
        const one = await view({ nodeId: CONTROL_NODE, sessionId: "lane-01" });
        const two = await view({ nodeId: CONTROL_NODE, sessionId: "lane-02" });
        const laneOne = openTerminalIngressClient({ readAddress });
        const laneTwo = openTerminalIngressClient({ readAddress });
        laneOne.frame("lane-01", "01 output\n");
        laneTwo.frame("lane-02", "02 output\n");
        await waitFor(() => one.frames.length >= 1 && two.frames.length >= 1, { label: "both cards receive their own chunk" });
        await settle(100);
        assert.deepEqual(one.frames, ["01 output\n"], "lane 01's card holds only lane 01's bytes");
        assert.deepEqual(two.frames, ["02 output\n"], "lane 02's card holds only lane 02's bytes");
        await Promise.all([laneOne.close(), laneTwo.close()]);
      });
    },
  },
  {
    name: "loop-session-streams-to-its-card/00 E4 · a finished drive ends its session's stream — the end marker is sent exactly once for that session, and the card's stream closes",
    async run() {
      await withControlChain(async ({ ingress, view, readAddress }) => {
        const viewer = await view({ nodeId: CONTROL_NODE, sessionId: "89b1d500" });
        const closed = new Promise((resolve) => viewer.ws.once("close", resolve));
        const child = openTerminalIngressClient({ readAddress });
        child.frame("89b1d500", "last words\n");
        child.end("89b1d500");
        await child.close();
        await closed;
        assert.equal(ingress.ends.filter((sessionId) => sessionId === "89b1d500").length, 1, "the end marker crossed the ingress exactly once");
        assert.deepEqual(viewer.frames, ["last words\n"], "the bytes arrived before the end");
      });
    },
  },
  {
    name: "loop-session-streams-to-its-card/00 E5 · a loop on a worker node streams through that worker's own stream — the worker sends the chunk up its admitted stream and the control relays it under the worker's CONNECTION-bound node id",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-ingress-worker-"));
      const home = path.join(tmp, "home");
      const chain = await controlChainParts(tmp, home);
      // The REAL control stream server, re-stamping exactly as the launcher's `onTerminalFrame` does.
      const controlServer = await startControlStreamServer({
        peerNodeIds: ["node-2976"],
        resolveOrigin: () => ({ nodeId: "node-2976" }),
        storeOptions: { env: { AOF_GLOBAL_HOME: home } },
        onTerminalFrame: (frame, { nodeId }) => chain.controlPush.push({ ...frame, nodeId }),
      });
      let client;
      let workerIngress;
      try {
        const viewer = await chain.view({ nodeId: "node-2976", sessionId: "wsl-sess" });
        assert.ok(viewer.opened, "the card for (worker, session) opens on the control UI");
        client = createWorkerStreamClient({ transport: createWorkerWsTransport(`ws://127.0.0.1:${controlServer.server.address().port}/`), nodeId: "worker-self-declared", workspaceId: "ws-1", now: () => NOW });
        assert.equal(await client.ensureConnected(), true, "the worker's admitted stream is up");
        // The WORKER daemon's ingress, with the launcher's worker forward verbatim.
        const workerStore = storeAt(path.join(tmp, "worker-home", "mesh"));
        workerIngress = await startTerminalIngress({
          forward: { frame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes), end: (sessionId) => client.sendTerminalEnd(sessionId) },
          publish: (address) => workerStore.publishTerminalIngress(null, address),
          withdraw: (token) => workerStore.withdrawTerminalIngress(null, token),
        });
        const child = openTerminalIngressClient({ readAddress: () => workerStore.readTerminalIngress() });
        child.frame("wsl-sess", "a worker loop's screen\n");
        await waitFor(() => viewer.frames.length >= 1, { label: "the worker loop's chunk reaches the control UI" });
        assert.deepEqual(viewer.frames, ["a worker loop's screen\n"], "the bytes rode the worker's own stream, then the control's relay");
        await child.close();
      } finally {
        await workerIngress?.stop();
        client?.stop?.();
        controlServer.stop();
        await chain.stop();
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "loop-session-streams-to-its-card/00 the ingress stamps the daemon's own node id on every frame — a frame naming another node's id reaches the mirror under the control node's own id, and never under the id the client named",
    async run() {
      await withControlChain(async ({ view, store }) => {
        const own = await view({ nodeId: CONTROL_NODE, sessionId: "s-forge" });
        const victim = await view({ nodeId: "node-victim", sessionId: "s-forge" });
        const address = await store.readTerminalIngress();
        const raw = new WebSocket(`ws://127.0.0.1:${address.port}/`, { headers: { "x-aof-ingress-token": address.token } });
        await new Promise((resolve) => raw.once("message", resolve));
        raw.send(JSON.stringify({ type: "frame", sessionId: "s-forge", bytes: "forged?\n", nodeId: "node-victim" }));
        await waitFor(() => own.frames.length >= 1, { label: "the frame reaches the control's own card" });
        await settle(150);
        assert.deepEqual(own.frames, ["forged?\n"], "routed under the daemon's own id");
        assert.deepEqual(victim.frames, [], "never routed under the id the client named");
        raw.close();
      });
    },
  },
  {
    name: "loop-session-streams-to-its-card/00 [outline] a failing ingress never slows or fails the drive — absent file, refused token, closed after the first chunk: the client never throws, frames go only where a live door took them, and at most one coded degrade event (3 rows)",
    async run() {
      // Row 1 — the file is absent because no daemon runs.
      {
        const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-ingress-absent-"));
        const degrades = [];
        try {
          const child = openTerminalIngressClient({ readAddress: () => storeAt(path.join(tmp, "mesh")).readTerminalIngress(), onDegrade: (code) => degrades.push(code) });
          for (let i = 0; i < 5; i += 1) assert.doesNotThrow(() => child.frame("s1", `chunk ${i}`), "row 1: a frame never throws");
          child.end("s1");
          assert.equal(await child.admitted, false, "row 1: never admitted");
          await child.close();
          assert.deepEqual(degrades, ["terminal-ingress-absent"], "row 1: one coded degrade for the whole drive");
        } finally {
          await rm(tmp, { recursive: true, force: true });
        }
      }
      // Row 2 — the ingress refuses the token the child presents: no frame is read.
      await withControlChain(async ({ ingress, store }) => {
        const address = await store.readTerminalIngress();
        await store.publishTerminalIngress(null, { ...address, token: "0".repeat(address.token.length) });
        const degrades = [];
        const child = openTerminalIngressClient({ readAddress: () => store.readTerminalIngress(), onDegrade: (code) => degrades.push(code) });
        child.frame("s1", "never read");
        child.frame("s1", "nor this");
        assert.equal(await child.admitted, false, "row 2: refused at the upgrade");
        await child.close();
        await settle(100);
        assert.deepEqual(ingress.forwarded, [], "row 2: no terminal frame was read from the connection");
        assert.deepEqual(degrades, ["terminal-ingress-refused"], "row 2: one coded degrade");
      });
      // Row 3 — the ingress closes after the first chunk: only the first reaches the mirror.
      await withControlChain(async ({ ingress, view, readAddress }) => {
        const viewer = await view({ nodeId: CONTROL_NODE, sessionId: "s1" });
        const degrades = [];
        const child = openTerminalIngressClient({ readAddress, onDegrade: (code) => degrades.push(code) });
        child.frame("s1", "first\n");
        await waitFor(() => viewer.frames.length >= 1, { label: "the first chunk arrives" });
        await ingress.stop();
        await settle(100);
        for (const chunk of ["second\n", "third\n"]) assert.doesNotThrow(() => child.frame("s1", chunk), "row 3: a frame after the close never throws");
        await child.close();
        await settle(100);
        assert.deepEqual(viewer.frames, ["first\n"], "row 3: only the first chunk reached the mirror");
        assert.ok(degrades.length <= 1, `row 3: at most one coded degrade — got ${JSON.stringify(degrades)}`);
      });
    },
  },
];

// ── 162 task 00 harness ───────────────────────────────────────────────────────────────────────
const CONTROL_NODE = "node-7297";
const { startTerminalIngress, openTerminalIngressClient, buildTerminalFrameEnvelope, buildTerminalEndEnvelope } = meshTerminalRelayBridgeServices();
// The mesh store at one mesh root: where a daemon publishes its ingress and a child reads it.
const storeAt = (meshRoot) => createMeshStore({ globalMeshPaths: () => ({ meshRoot }) });

// The same-machine half of the chain: a REAL relay, the control's REAL loopback push, the REAL
// mirror and subscriber, and the REAL fleet face whose `/ws/terminal-view` a card opens.
async function controlChainParts(tmp, home) {
  const distRoot = path.join(tmp, "dist");
  const root = path.join(tmp, "repo");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "demo", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await writeDist(meshUiDist(distRoot));
  const relay = await serveRelay({ port: 0 });
  const config = { mesh: { relay: { url: relay.url } } };
  const controlPush = createTerminalRelayPushTransport(config);
  const mirror = createTerminalMirror();
  const subscriber = await startTerminalMirrorSubscriber({ transport: createTerminalMirrorSubscriberTransport(config), mirror });
  const session = await serveMeshUi({ projectDir: root, port: 0, repoRoot: distRoot, globalStoreOptions: { env: { AOF_GLOBAL_HOME: home } }, terminalMirror: mirror });
  const viewers = [];
  return {
    controlPush,
    async view(tuple) {
      const viewer = await openTerminalView(session.url, tuple);
      viewers.push(viewer);
      return viewer;
    },
    async stop() {
      for (const viewer of viewers) {
        try { viewer.ws?.close?.(); } catch { /* noop */ }
      }
      await new Promise((resolve) => session.server.close(resolve));
      subscriber.stop();
      controlPush.close();
      await relay.stop();
    },
  };
}

// The CONTROL daemon's ingress over that chain, with the launcher's control forward verbatim —
// the envelope built with the control's own node id — and a spy on what crossed it.
async function withControlChain(body) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-ingress-control-"));
  const home = path.join(tmp, "home");
  const chain = await controlChainParts(tmp, home);
  const store = storeAt(path.join(home, "mesh"));
  const forwarded = [];
  const ends = [];
  const started = await startTerminalIngress({
    publish: (address) => store.publishTerminalIngress(null, address),
    withdraw: (token) => store.withdrawTerminalIngress(null, token),
    forward: {
      frame: (sessionId, bytes) => {
        const envelope = buildTerminalFrameEnvelope(CONTROL_NODE, sessionId, bytes);
        forwarded.push([sessionId, envelope.nodeId]);
        return chain.controlPush.push(envelope);
      },
      end: (sessionId) => {
        ends.push(sessionId);
        return chain.controlPush.push(buildTerminalEndEnvelope(CONTROL_NODE, sessionId));
      },
    },
  });
  let stopped = false;
  const ingress = { forwarded, ends, async stop() { if (!stopped) { stopped = true; await started.stop(); } } };
  try {
    await body({ ingress, store, readAddress: () => store.readTerminalIngress(), view: chain.view });
  } finally {
    await ingress.stop();
    await chain.stop();
    await rm(tmp, { recursive: true, force: true });
  }
}
