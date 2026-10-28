// milestone 172 / story 00 / task 02 — the board delivers a request to the architect's session and
// streams its turn on the diagram's events stream (ADR-002). The REAL face over the REAL scene command
// and a store on disk; the `conversations` port is a recording one, so what the face hands it and what
// it forwards are both observed. The session module itself is driven in @aof/execution's suite.
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBoardApi } from "@aof/server/board-ui";
import { createDiagramSceneCommand } from "@aof/diagrams/commands/scene";

const FILE = "ADR-003-push-stream.excalidraw";
const OTHER = "ADR-001-overlay.excalidraw";
const TOOLS = ["Read", "Grep", "Glob", "Write", "Bash(aof diagram scene:*)"];
const box = (id, extra = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 60, strokeColor: "#1e1e1e", backgroundColor: "transparent", version: 1, ...extra });
const sceneOf = (elements) => ({ type: "excalidraw", version: 2, elements, appState: {}, files: {} });

// A port that records what it is handed and lets the test emit a session's events.
function recordingPort({ snapshot = () => ({ type: "snapshot", state: "none", requestId: null, text: "", queued: 0 }), outcome = "started" } = {}) {
  const delivered = [];
  const subscribers = new Map();
  return {
    delivered,
    subscriberCount: (key) => subscribers.get(key)?.size ?? 0,
    emit: (key, event) => { for (const listener of subscribers.get(key) ?? []) listener(event); },
    async deliver(key, delivery) { delivered.push({ key, ...delivery }); return { outcome }; },
    subscribe(key, listener) {
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key).add(listener);
      return () => subscribers.get(key)?.delete(listener);
    },
    snapshot,
  };
}

async function withBoard(run, { port = recordingPort(), composed = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-conversation-api-"));
  const item = path.join(root, "wiki", "work", "171_push");
  await mkdir(path.join(item, "diagrams"), { recursive: true });
  await writeFile(path.join(item, "ARCHITECTURE.md"), "# Push\n\n## ADR-001 — Overlay\n\n## ADR-003 — Push\n\n### Diagram\n\nDraw it.\n");
  const command = createDiagramSceneCommand({
    resolveItemExact: async (_ctx, ref) => (ref === "171" ? { ref: "171", dir: item, status: "in-progress" } : null),
    requireLocalCheckout() {}, resolveWorkDiagrams: () => ({ enabled: true, formats: ["svg"] }), resolveGlobalHome: () => null,
  }).diagramSceneCommand;
  const workspace = { root, projectRoot: root, config: {} };
  const scene = (action, input = {}, file = FILE) => command.run({ ref: "171", file, action, ...input }, { workspace });
  const saved = await scene("save", { baseRevision: null, scene: sceneOf([box("e-api", { customData: { aof: { id: "API" } } })]) });
  const { request: note } = await scene("request", { baseRevision: saved.revision, selectedIds: ["API"], request: "What does this box do?" });
  const invoked = [];
  const api = createBoardApi({
    loadWorkspace: async () => workspace, resolveCacheStalenessSeconds: () => 30,
    invoke: async (id, input, ctx) => { invoked.push({ id, input }); if (id !== "diagram:scene") throw new Error(`Unknown command id "${id}".`); return command.run(input, ctx); },
    ...(composed ? { conversations: port } : {}),
  });
  // The face's own clock never fires inside a test: the stream's timers are inert here.
  const inert = { setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} };
  const server = http.createServer(async (req, res) => { if (!await api.handleDiagramApi(req, res, { projectDir: root, timers: inert, watch: () => null })) res.writeHead(404).end(); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const host = `127.0.0.1:${server.address().port}`;
  const post = (body, { query = `ref=171&file=${FILE}`, origin = `http://${host}` } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, method: "POST", path: `/api/diagram/conversation?${query}`, headers: { host, origin, "content-type": "application/json" } }, (res) => {
      let text = ""; res.setEncoding("utf8"); res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on("error", reject); req.end(JSON.stringify(body));
  });
  const open = [];
  const connect = (file = FILE) => new Promise((resolve, reject) => {
    const client = { events: [] };
    const req = http.get({ host: "127.0.0.1", port: server.address().port, path: `/api/diagram/events?ref=171&file=${file}` }, (res) => {
      res.setEncoding("utf8");
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk;
        let at;
        while ((at = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, at); buffer = buffer.slice(at + 2);
          const event = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (event) client.events.push({ event, data: data ? JSON.parse(data) : null });
        }
      });
      const started = Date.now();
      const ready = () => client.events.some((e) => e.event === "conversation") || (!composed && client.events.length) ? resolve(client) : Date.now() - started > 5000 ? reject(new Error("no first events")) : setTimeout(ready, 10);
      ready();
    });
    req.on("error", (error) => { if (!client.closing) reject(error); });
    client.close = () => { client.closing = true; req.destroy(); };
    open.push(client);
  });
  const conversation = (client) => client.events.filter((e) => e.event === "conversation").map((e) => e.data);
  const settle = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  try { await run({ root, port, post, connect, conversation, settle, scene, note, invoked }); }
  finally {
    for (const client of open) client.close?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}
const KEY = `171\n${FILE}`;

export const diagramConversationApiTests = [
  { name: "172/00 task02 E1 · a posted request id is delivered as the review invocation, in the project root", run: () => withBoard(async ({ root, port, post, note, invoked }) => {
    const answer = await post({ requestId: note.id });
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    assert.deepEqual(port.delivered, [{ key: KEY, cwd: root, text: `/aof:diagram-review 171 ${FILE} ${note.id}`, requestId: note.id, tools: TOOLS }]);
    assert.deepEqual(answer.body, { outcome: "started", requestId: note.id }, "the answer carries the port's outcome");
    assert.deepEqual(invoked.map((call) => [call.id, call.input.action]), [["diagram:scene", "session"]], "the face asked the scene command what to type");
  }) },
  { name: "172/00 task02 · the answer carries whatever outcome the port gave", run: () => withBoard(async ({ post, note }) => {
    assert.deepEqual((await post({ requestId: note.id })).body, { outcome: "queued", requestId: note.id });
  }, { port: recordingPort({ outcome: "queued" }) }) },
  { name: "172/00 task02 · an empty body delivers the batch review", run: () => withBoard(async ({ port, post }) => {
    assert.equal((await post({})).status, 200);
    assert.equal(port.delivered.length, 1);
    assert.equal(port.delivered[0].text, `/aof:diagram-review 171 ${FILE}`);
    assert.equal(port.delivered[0].requestId, null, "no request id");
  }) },
  { name: "172/00 task02 · a cross-origin post is refused before the body is read", run: () => withBoard(async ({ port, post, note, invoked }) => {
    const answer = await post({ requestId: note.id }, { origin: "http://evil.test" });
    assert.equal(answer.status, 403); assert.equal(answer.body.code, "cross-origin-refused");
    assert.deepEqual(port.delivered, []); assert.deepEqual(invoked, []);
  }) },
  { name: "172/00 task02 E2 · each connected editor receives the session's events for its diagram only", run: () => withBoard(async ({ port, connect, conversation, settle }) => {
    const [a, b, other] = [await connect(), await connect(), await connect(OTHER)];
    assert.equal(port.subscriberCount(KEY), 2);
    port.emit(KEY, { type: "text", requestId: "r7", text: "The writer is " });
    await settle();
    for (const client of [a, b]) assert.deepEqual(conversation(client).at(-1), { type: "text", requestId: "r7", text: "The writer is " });
    assert.ok(!conversation(other).some((event) => event.type === "text"), "the other diagram's stream does not carry it");
  }) },
  { name: "172/00 task02 E11 · the first conversation event of a connection is the snapshot", run: () => {
    const written = "x".repeat(300);
    return withBoard(async ({ connect, conversation }) => {
      const client = await connect();
      assert.equal(client.events[0].event, "stamp", "the stamp still opens the stream");
      assert.deepEqual(conversation(client)[0], { type: "snapshot", state: "answering", requestId: "r7", text: written, queued: 0 });
    }, { port: recordingPort({ snapshot: (key) => (key === KEY ? { type: "snapshot", state: "answering", requestId: "r7", text: written, queued: 0 } : null) }) });
  } },
  { name: "172/00 task02 · a closed connection stops forwarding and leaves the port", run: () => withBoard(async ({ port, connect, settle }) => {
    const client = await connect();
    assert.equal(port.subscriberCount(KEY), 1);
    client.close();
    await settle(150);
    assert.equal(port.subscriberCount(KEY), 0, "the port has no subscriber from that connection");
  }) },
  { name: "172/00 task02 E12 · a request id the diagram does not hold is refused", run: () => withBoard(async ({ port, post }) => {
    const answer = await post({ requestId: "deadbeefdeadbeef" });
    assert.equal(answer.status, 404);
    assert.equal(answer.body.code, "diagram-review-unknown");
    assert.match(answer.body.error, /deadbeefdeadbeef/, "the refusal names the unknown request");
    assert.deepEqual(port.delivered, [], "nothing is handed to the port");
  }) },
  { name: "172/00 task02 E13 · with no session to launch the post answers unavailable", run: () => withBoard(async ({ post, note, scene }) => {
    const answer = await post({ requestId: note.id });
    assert.equal(answer.status, 503);
    assert.equal(answer.body.code, "architect-session-unavailable");
    assert.ok(answer.body.error.length > 0, "with the reason");
    const { requests } = await scene("proposals");
    assert.equal(requests.find((record) => record.id === note.id).status, "open", "the note is still open");
  }, { composed: false }) },
  { name: "172/00 task02 E13 · a port that cannot launch claude answers unavailable with its reason", run: () => {
    const port = recordingPort();
    port.deliver = async () => { throw Object.assign(new Error("No claude executable resolves on this server's PATH."), { code: "architect-session-unavailable", status: 503 }); };
    return withBoard(async ({ post, note }) => {
      const answer = await post({ requestId: note.id });
      assert.equal(answer.status, 503);
      assert.deepEqual(answer.body, { ok: false, error: "No claude executable resolves on this server's PATH.", code: "architect-session-unavailable" });
    }, { port });
  } },
];
