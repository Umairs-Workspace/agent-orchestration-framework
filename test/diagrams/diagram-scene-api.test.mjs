import assert from "node:assert/strict";
import http from "node:http";
import { EventEmitter } from "node:events";
import { watch as fsWatch } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBoardApi } from "@aof/server/board-ui";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";

async function withApi(run) {
  const calls = [];
  let failure = null;
  const workspace = { projectRoot: "/fixture", config: {} };
  const api = createBoardApi({
    loadWorkspace: async () => workspace,
    resolveCacheStalenessSeconds: () => 30,
    invoke: async (id, input, ctx) => {
      calls.push({ id, input, ctx });
      if (failure) throw failure;
      return { delivered: true, id, input };
    },
  });
  const server = http.createServer(async (req, res) => {
    if (!await api.handleDiagramApi(req, res, { projectDir: "/fixture" })) {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const request = (method, target, { headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: address.port, method, path: target, headers }, (res) => {
      let text = "";
      res.setEncoding("utf8"); res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null }));
    });
    req.on("error", reject);
    // An array body is written part by part with a pause between, so the server reads separate chunks.
    if (Array.isArray(body)) {
      (async () => { for (const part of body) { req.write(part); await new Promise((r) => setTimeout(r, 50)); } req.end(); })().catch(reject);
      return;
    }
    if (body !== undefined) req.write(body); req.end();
  });
  try { await run({ calls, request, setFailure: (error) => { failure = error; }, port: address.port, workspace }); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

const sceneApiTests = [
  { name: "capability api: GET invokes diagram:capability with no input and answers it verbatim", run: () => withApi(async ({ calls, request, workspace }) => {
    const response = await request("GET", "/api/diagram/capability");
    assert.equal(response.status, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(calls, [{ id: "diagram:capability", input: {}, ctx: { workspace } }]);
    assert.deepEqual(response.body, { delivered: true, id: "diagram:capability", input: {} });
  }) },
  { name: "capability api: a build without the diagrams package answers absent, off, and no editor — 200, not an error", run: () => withApi(async ({ request, setFailure }) => {
    setFailure(new Error('Unknown command id "diagram:capability".'));
    const response = await request("GET", "/api/diagram/capability");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { absent: true, enabled: false, editor: false, generator: "off" });
  }) },
  { name: "capability api: any other failure keeps its status and code, and POST is not a capability read", run: () => withApi(async ({ calls, request, setFailure, port }) => {
    setFailure(Object.assign(new Error("config unreadable"), { status: 500, code: "config-invalid" }));
    const failed = await request("GET", "/api/diagram/capability");
    assert.equal(failed.status, 500); assert.deepEqual(failed.body, { ok: false, error: "config unreadable", code: "config-invalid" });
    const host = `127.0.0.1:${port}`;
    const posted = await request("POST", "/api/diagram/capability", { headers: { host, origin: `http://${host}`, "content-type": "application/json" }, body: "{}" });
    assert.equal(posted.status, 404);
    assert.equal(calls.length, 1);
  }) },
  { name: "scene api: GET invokes the scene reader with its exact query shape", run: () => withApi(async ({ calls, request, workspace }) => {
    const response = await request("GET", "/api/diagram/scene?ref=%2007%20&file=%20ADR-002-scene.excalidraw%20");
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ id: "diagram:scene", input: { ref: "07", file: "ADR-002-scene.excalidraw", action: "read" }, ctx: { workspace } }]);
    assert.equal(response.body.delivered, true);
  }) },
  { name: "scene api: POST admits only same-origin loopback JSON and forwards the body", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const response = await request("POST", "/api/diagram/scene?ref=07&file=ADR-002-scene.excalidraw", {
      headers: { host, origin: `http://${host}`, "content-type": "application/json" },
      body: JSON.stringify({ action: "save", baseRevision: null, scene: { type: "excalidraw" } }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0].input, { ref: "07", file: "ADR-002-scene.excalidraw", action: "save", baseRevision: null, scene: { type: "excalidraw" } });
  }) },
  { name: "scene api: refuses unsafe or malformed writes before invoking the command", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const rows = [
      ["PUT", { host }, undefined, 405, "method-not-allowed"],
      ["POST", { host, origin: "http://evil.test", "content-type": "application/json" }, "{}", 403, "cross-origin-refused"],
      ["POST", { host: "evil.test", origin: "http://evil.test", "content-type": "application/json" }, "{}", 403, "non-loopback-host"],
      ["POST", { host, origin: `http://${host}`, "content-type": "text/plain" }, "{}", 400, "invalid-content-type"],
      ["POST", { host, origin: `http://${host}`, "content-type": "application/json" }, "{broken", 400, "malformed-json"],
      ["POST", { host, origin: `http://${host}`, "content-type": "application/json" }, JSON.stringify({ payload: "x".repeat(16_000_001) }), 413, "payload-too-large"],
    ];
    for (const [method, headers, body, status, code] of rows) {
      const response = await request(method, "/api/diagram/scene", { headers, body });
      assert.equal(response.status, status); assert.equal(response.body.code, code);
    }
    assert.deepEqual(calls, []);
  }) },
  { name: "scene api: the diagram route alone admits a body over the board's 1 MB default (Publish carries an SVG and a PNG)", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const response = await request("POST", "/api/diagram/scene?ref=07&file=ADR-002-scene.excalidraw", { headers: { host, origin: `http://${host}`, "content-type": "application/json" }, body: JSON.stringify({ action: "publish", svg: "x".repeat(3_000_000) }) });
    assert.equal(response.status, 200);
    assert.equal(calls[0].input.svg.length, 3_000_000);
  }) },
  { name: "scene api: a multi-byte character split across two chunks reaches the command intact", run: () => withApi(async ({ calls, request, port }) => {
    const host = `127.0.0.1:${port}`;
    const bytes = Buffer.from(JSON.stringify({ action: "save", label: "Orders — café 東京" }), "utf8");
    const cut = bytes.indexOf(Buffer.from("—", "utf8")) + 1; // inside the dash's three bytes
    const response = await request("POST", "/api/diagram/scene?ref=07&file=ADR-002-scene.excalidraw", { headers: { host, origin: `http://${host}`, "content-type": "application/json", "content-length": String(bytes.length) }, body: [bytes.subarray(0, cut), bytes.subarray(cut)] });
    assert.equal(response.status, 200);
    assert.equal(calls[0].input.label, "Orders — café 東京");
  }) },
  { name: "scene api: command errors retain their 409 status and code", run: () => withApi(async ({ calls, request, port, setFailure }) => {
    setFailure(Object.assign(new Error("revision conflict"), { status: 409, code: "diagram-scene-conflict" }));
    const host = `127.0.0.1:${port}`;
    const response = await request("POST", "/api/diagram/scene", { headers: { host, origin: `http://${host}`, "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 409); assert.deepEqual(response.body, { ok: false, error: "revision conflict", code: "diagram-scene-conflict" });
    assert.equal(calls.length, 1);
  }) },
];

// ── milestone 171 / story 02 — `/api/diagram/events`, the "look now" stream (ADR-003) ─────────────
// The REAL face over the REAL scene command and a store on disk. Where a scenario names time (the
// tick, the safety re-stamp, the keepalive) the face is handed a clock and a watch to drive by hand;
// where it names a write reaching the client, the real recursive watch does it — handed to the face as
// core's binding hands it (`watchDirectory`), since the transport imports no filesystem of its own.
const STREAM_FILE = "ADR-003-push-stream.excalidraw";
const box = (id, extra = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", version: 1, ...extra });
const sceneOf = (elements) => ({ type: "excalidraw", version: 2, elements, appState: {}, files: {} });

// A clock the test advances: intervals and timeouts run when their time is reached, never otherwise.
function manualTimers() {
  let now = 0; let seq = 0;
  const due = new Map();
  const add = (fn, ms, every) => { const id = ++seq; due.set(id, { fn, at: now + ms, every }); return id; };
  return {
    timers: { setTimeout: (fn, ms) => add(fn, ms, null), clearTimeout: (id) => due.delete(id), setInterval: (fn, ms) => add(fn, ms, ms), clearInterval: (id) => due.delete(id) },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...due.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, t] = next;
        now = t.at;
        if (t.every) t.at += t.every; else due.delete(id);
        t.fn();
      }
      now = until;
    },
    get armed() { return due.size; },
  };
}
// A watch the test fires (or one that cannot start).
function manualWatch({ fails = false } = {}) {
  const armed = [];
  const watch = (directory, onChange) => {
    if (fails) throw Object.assign(new Error("watch unavailable"), { code: "EPERM" });
    const watcher = Object.assign(new EventEmitter(), { directory, onChange, closed: false, close() { this.closed = true; } });
    armed.push(watcher); return watcher;
  };
  return { watch, armed };
}

async function withStream(run, faceOptions = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-events-"));
  const item = path.join(root, "wiki", "work", "171_push");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), "# Push\n\n## ADR-003 — Push\n\n### Diagram\n\nDraw it.\n");
  const command = createDiagramSceneCommand({
    resolveItemExact: async (_ctx, ref) => (ref === "171" ? { ref: "171", dir: item, status: "in-progress" } : null),
    requireLocalCheckout() {}, resolveWorkDiagrams: () => ({ enabled: true, formats: ["svg"] }), resolveGlobalHome: () => null,
  }).diagramSceneCommand;
  const workspace = { root, projectRoot: root, config: {} };
  const scene = (action, input = {}) => command.run({ ref: "171", file: STREAM_FILE, action, ...input }, { workspace });
  const saved = await scene("save", { baseRevision: null, scene: sceneOf([box("e-api", { customData: { aof: { id: "API" } } })]) });
  const { request: note } = await scene("request", { baseRevision: saved.revision, selectedIds: ["API"], request: "Why?" });
  const api = createBoardApi({
    loadWorkspace: async () => workspace, resolveCacheStalenessSeconds: () => 30,
    watchDirectory: (directory, onChange) => fsWatch(directory, { recursive: true }, onChange),
    invoke: async (id, input, ctx) => { if (id !== "diagram:scene") throw new Error(`Unknown command id "${id}".`); return command.run(input, ctx); },
  });
  const server = http.createServer(async (req, res) => { if (!await api.handleDiagramApi(req, res, { projectDir: root, ...faceOptions })) res.writeHead(404).end(); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const open = [];
  // One client of the stream: its status and headers, the events by name, and the comment lines.
  const connect = (target = `/api/diagram/events?ref=171&file=${STREAM_FILE}`) => new Promise((resolve, reject) => {
    const client = { events: [], comments: 0, raw: "" };
    const req = http.get({ host: "127.0.0.1", port: server.address().port, path: target }, (res) => {
      client.status = res.statusCode; client.headers = res.headers;
      res.setEncoding("utf8");
      let buffer = "";
      res.on("data", (chunk) => {
        client.raw += chunk; buffer += chunk;
        let at;
        while ((at = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, at); buffer = buffer.slice(at + 2);
          if (block.startsWith(":")) { client.comments += 1; continue; }
          const event = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (event) client.events.push({ event, data: data ? JSON.parse(data) : null });
        }
      });
      if (res.statusCode !== 200) { res.on("end", () => { client.body = JSON.parse(client.raw); resolve(client); }); return; }
      const started = Date.now();
      const first = () => client.events.length ? resolve(client) : Date.now() - started > 5000 ? reject(new Error("no first event")) : setTimeout(first, 10);
      first();
    });
    req.on("error", (error) => { if (!client.closing) reject(error); });
    client.close = () => { client.closing = true; req.destroy(); };
    open.push(client);
  });
  const named = (client, name) => client.events.filter((e) => e.event === name);
  const waitFor = async (client, name, count, withinMs) => {
    const started = Date.now();
    while (named(client, name).length < count) {
      if (Date.now() - started > withinMs) throw new Error(`no ${name} event within ${withinMs} ms: ${JSON.stringify(client.events)}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
  try { await run({ scene, saved, note, connect, named, waitFor, settle }); }
  finally {
    for (const client of open) client.close?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}
const proposeFor = (scene, note, revision, summary) => scene("propose", { requestId: note.id, baseRevision: revision, summary, rationale: "Because.", text: 'flowchart LR\n  API["Gateway"]\n' });
// A scenario that drives the face's clock and watch by hand.
function handDriven(name, options, run) {
  return { name, run: () => { const clock = manualTimers(); const watch = manualWatch(options); return withStream((fx) => run({ ...fx, clock, watch }), { timers: clock.timers, watch: watch.watch }); } };
}

const eventsApiTests = [
  { name: "171/02 E11 · a written proposal is one review event carrying a stamp and no proposal text", run: () => withStream(async ({ scene, saved, note, connect, named, waitFor, settle }) => {
    const client = await connect();
    const first = client.events[0].data.review;
    await proposeFor(scene, note, saved.revision, "Split the gateway");
    await waitFor(client, "review", 1, 2000);
    await settle();
    assert.equal(named(client, "review").length, 1, JSON.stringify(client.events));
    assert.match(named(client, "review")[0].data.review, /^[0-9a-f]{64}$/);
    assert.notEqual(named(client, "review")[0].data.review, first, "the new review stamp");
    assert.doesNotMatch(client.raw, /Split the gateway/, "no event carries the proposal");
  }) },
  { name: "171/02 · a save is one scene event, carrying the new scene revision", run: () => withStream(async ({ scene, saved, connect, named, waitFor, settle }) => {
    const client = await connect();
    const next = await scene("save", { baseRevision: saved.revision, scene: sceneOf([box("e-api", { customData: { aof: { id: "API" } } }), box("e-db", { x: 300 })]) });
    await waitFor(client, "scene", 1, 2000);
    await settle();
    assert.equal(named(client, "scene").length, 1, JSON.stringify(client.events));
    assert.equal(named(client, "scene")[0].data.revision, next.revision);
  }) },
  { name: "171/02 · the stream answers as an event stream that is never cached, opening with the current stamps", run: () => withStream(async ({ scene, saved, connect }) => {
    const client = await connect();
    assert.equal(client.status, 200);
    assert.match(client.headers["content-type"], /^text\/event-stream/);
    assert.equal(client.headers["cache-control"], "no-store");
    const stamp = await scene("stamp");
    assert.deepEqual(client.events[0], { event: "stamp", data: { review: stamp.review, scene: stamp.scene, revision: saved.revision } });
  }) },
  ...[
    ["E12 · ", "ref=999&file=ADR-003-push-stream.excalidraw", 404, "ref-not-found"],
    ["", "ref=171&file=..%2Fsecret.excalidraw", 400, "diagram-scene-file-invalid"],
    ["", "ref=171&file=ADR-003-push-stream.svg", 400, "diagram-scene-file-invalid"],
  ].map(([example, query, status, code]) => handDriven(`171/02 ${example}· a stream that cannot name a diagram opens nothing: ${query}`, {}, async ({ connect, watch, clock }) => {
    const client = await connect(`/api/diagram/events?${query}`);
    assert.equal(client.status, status);
    assert.equal(client.body.code, code);
    assert.equal(watch.armed.length, 0, "no watch is armed");
    assert.equal(clock.armed, 0, "and no timer");
  })),
  handDriven("171/02 · a quiet stream is kept open by a comment line every 25 seconds", {}, async ({ connect, clock, settle }) => {
    const client = await connect();
    const events = client.events.length;
    clock.advance(25_000);
    await settle(200);
    assert.equal(client.comments, 1);
    assert.equal(client.events.length, events, "and no event");
  }),
  handDriven("171/02 · a closed connection closes its watch and its timers", {}, async ({ connect, clock, watch, settle }) => {
    const client = await connect();
    assert.ok(watch.armed.length >= 1 && clock.armed >= 2, "a watch and its timers were armed");
    client.close();
    await settle(200);
    assert.ok(watch.armed.every((watcher) => watcher.closed), "every watch closed");
    assert.equal(clock.armed, 0, "every timer cleared");
  }),
  handDriven("171/02 E9 · when the folder cannot be watched, the face ticks every 2 seconds", { fails: true }, async ({ scene, note, connect, named, waitFor, clock }) => {
    const client = await connect();
    await scene("respond", { requestId: note.id, answer: "Because." });
    clock.advance(2_000);
    await waitFor(client, "review", 1, 4000);
    assert.equal(named(client, "review").length, 1);
  }),
  handDriven("171/02 · a missed watch event is caught by the 30-second safety re-stamp", {}, async ({ scene, note, connect, named, waitFor, clock, settle }) => {
    const client = await connect();
    await scene("respond", { requestId: note.id, answer: "Because." });
    clock.advance(29_000);
    await settle(200);
    assert.equal(named(client, "review").length, 0, "the watch reported nothing, and nothing re-stamps before the safety");
    clock.advance(1_000);
    await waitFor(client, "review", 1, 2000);
  }),
];

export const diagramSceneApiTests = [...sceneApiTests, ...eventsApiTests];
