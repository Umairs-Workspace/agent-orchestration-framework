// Traceability wiring for milestone 50 / story 01 — tasks 00 + 01.
// Covers every @executable scenario:
//   Task 00: buildSessionSpawnFrame produces a well-formed down-frame;
//            buildSessionSpawnAckFrame produces a well-formed up-frame;
//            kind literals are exported correctly.
//   Task 01: worker-stream-client dispatches session-spawn to a registered handler;
//            an unregistered handler drops the frame silently;
//            a session-spawn frame does not interfere with the directive handler.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { WebSocketServer } from "ws";
import {
  SESSION_SPAWN_KIND,
  SESSION_SPAWN_ACK_KIND,
  buildSessionSpawnFrame,
  buildSessionSpawnAckFrame,
} from "../../../src/mesh/session-spawn-directive.mjs";
import { startControlStreamServer } from "../../../src/control-stream-server.mjs";
import { createWorkerStreamClient, createWorkerWsTransport } from "../../../src/worker-stream-client.mjs";

function createFakeTransport() {
  const sent = [];
  let messageHandler = null;
  return {
    sent,
    async connect() { return "handle"; },
    async send(_handle, frame) { sent.push(frame); },
    close() {},
    onMessage(handler) { messageHandler = handler; },
    deliver(frame) { messageHandler?.(JSON.stringify(frame)); },
  };
}

function waitFor(predicate, { timeoutMs = 2000, label = "condition" } = {}) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) { resolve(); return; }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 5);
    };
    tick();
  });
}

async function withGlobalHome(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-session-spawn-directive-"));
  try {
    return await fn({ env: { AOF_GLOBAL_HOME: home } });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function listen(wss) {
  if (wss.address() != null) return;
  await new Promise((resolve, reject) => {
    wss.once("listening", resolve);
    wss.once("error", reject);
  });
}

async function closeWebSocketServer(wss) {
  for (const socket of wss.clients) socket.terminate();
  await new Promise((resolve) => wss.close(resolve));
}

export const meshSessionSpawnDirectiveTests = [
  // ═══ Task 00: the kind literal and frame builder ═══════════════════════════

  {
    name: "session-spawn-directive/00 SESSION_SPAWN_KIND is the string 'session-spawn'",
    run() {
      assert.equal(SESSION_SPAWN_KIND, "session-spawn");
    },
  },
  {
    name: "session-spawn-directive/00 SESSION_SPAWN_ACK_KIND is the string 'session-spawn-ack'",
    run() {
      assert.equal(SESSION_SPAWN_ACK_KIND, "session-spawn-ack");
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnFrame produces a well-formed down-frame",
    run() {
      const frame = buildSessionSpawnFrame("n1", {
        sessionId: "abc-123",
        workspaceId: "ws1",
        assistant: "claude",
        itemRef: null,
        at: "2026-08-14T00:00:00.000Z",
      });
      assert.deepEqual(frame, {
        kind: "session-spawn",
        to: "n1",
        sessionId: "abc-123",
        workspaceId: "ws1",
        assistant: "claude",
        itemRef: null,
        at: "2026-08-14T00:00:00.000Z",
      });
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnFrame carries an itemRef when provided",
    run() {
      const frame = buildSessionSpawnFrame("n1", {
        sessionId: "abc-123",
        workspaceId: "ws1",
        assistant: "claude",
        itemRef: "42",
        at: "2026-08-14T00:00:00.000Z",
      });
      assert.equal(frame.itemRef, "42");
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnFrame defaults assistant to 'claude' when absent",
    run() {
      const frame = buildSessionSpawnFrame("n1", {
        sessionId: "abc-123",
        workspaceId: "ws1",
        assistant: "",
        at: "2026-08-14T00:00:00.000Z",
      });
      assert.equal(frame.assistant, "claude");
    },
  },
  {
    name: "session-spawn-directive/00 every Examples row preserves the wire fields",
    run() {
      const rows = [
        { sessionId: "uuid-1", nodeId: "n1", workspaceId: "ws-aof", assistant: "claude", itemRef: null, at: "2026-08-14T10:00:00.000Z" },
        { sessionId: "uuid-2", nodeId: "n2", workspaceId: "ws-test", assistant: "codex", itemRef: "50", at: "2026-08-14T10:01:00.000Z" },
        { sessionId: "uuid-3", nodeId: "n1", workspaceId: "ws-aof", assistant: "claude", itemRef: "50/01", at: "2026-08-14T10:02:00.000Z" },
      ];

      for (const row of rows) {
        assert.deepEqual(
          buildSessionSpawnFrame(row.nodeId, row),
          { kind: "session-spawn", to: row.nodeId, sessionId: row.sessionId, workspaceId: row.workspaceId, assistant: row.assistant, itemRef: row.itemRef, at: row.at },
        );
      }
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnAckFrame produces a well-formed up-frame on success",
    run() {
      const frame = buildSessionSpawnAckFrame({ sessionId: "abc-123", nodeId: "n1", ok: true });
      assert.deepEqual(frame, {
        kind: "session-spawn-ack",
        sessionId: "abc-123",
        nodeId: "n1",
        ok: true,
      });
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnAckFrame carries a code on failure",
    run() {
      const frame = buildSessionSpawnAckFrame({
        sessionId: "abc-123",
        nodeId: "n1",
        ok: false,
        code: "session-repo-unavailable",
      });
      assert.equal(frame.ok, false);
      assert.equal(frame.code, "session-repo-unavailable");
      assert.equal(frame.kind, "session-spawn-ack");
    },
  },
  {
    name: "session-spawn-directive/00 buildSessionSpawnAckFrame omits code on success",
    run() {
      const frame = buildSessionSpawnAckFrame({ sessionId: "abc-123", nodeId: "n1", ok: true, code: "" });
      assert.equal(frame.code, undefined);
    },
  },

  // ═══ Task 01: the worker-stream-client receive lane ════════════════════════

  {
    name: "session-spawn-directive/01 a session-spawn frame is dispatched to the registered handler",
    run() {
      const transport = createFakeTransport();
      const client = createWorkerStreamClient({
        transport,
        nodeId: "n1",
        workspaceId: "ws1",
        now: "2026-08-14T00:00:00.000Z",
      });

      const received = [];
      client.onSessionSpawn((frame) => received.push(frame));

      transport.deliver({
        kind: "session-spawn",
        to: "n1",
        sessionId: "s1",
        workspaceId: "ws1",
        assistant: "claude",
        itemRef: null,
        at: "2026-08-14T00:00:00.000Z",
      });

      assert.equal(received.length, 1);
      assert.equal(received[0].kind, "session-spawn");
      assert.equal(received[0].sessionId, "s1");
      assert.equal(received[0].workspaceId, "ws1");
    },
  },
  {
    name: "session-spawn-directive/01 an unregistered handler drops the frame silently",
    run() {
      const transport = createFakeTransport();
      createWorkerStreamClient({
        transport,
        nodeId: "n1",
        workspaceId: "ws1",
        now: "2026-08-14T00:00:00.000Z",
      });

      // No onSessionSpawn registered — must not throw
      assert.doesNotThrow(() => {
        transport.deliver({
          kind: "session-spawn",
          to: "n1",
          sessionId: "s1",
          workspaceId: "ws1",
          assistant: "claude",
          itemRef: null,
          at: "2026-08-14T00:00:00.000Z",
        });
      });
    },
  },
  {
    name: "session-spawn-directive/01 every Examples row reaches the registered handler unchanged",
    run() {
      const transport = createFakeTransport();
      const client = createWorkerStreamClient({ transport, nodeId: "n1", workspaceId: "ws-aof" });
      const received = [];
      client.onSessionSpawn((frame) => received.push(frame));
      const rows = [
        { sessionId: "uuid-1", workspaceId: "ws-aof", assistant: "claude", itemRef: null },
        { sessionId: "uuid-2", workspaceId: "ws-test", assistant: "codex", itemRef: "50" },
      ];

      for (const row of rows) {
        transport.deliver({ kind: "session-spawn", to: "n1", ...row, at: "2026-08-14T00:00:00.000Z" });
      }

      assert.deepEqual(received.map(({ sessionId, workspaceId, assistant, itemRef }) => ({ sessionId, workspaceId, assistant, itemRef })), rows);
    },
  },
  {
    name: "session-spawn-directive/01 a session-spawn frame does not interfere with the directive handler",
    run() {
      const transport = createFakeTransport();
      const client = createWorkerStreamClient({
        transport,
        nodeId: "n1",
        workspaceId: "ws1",
        now: "2026-08-14T00:00:00.000Z",
      });

      const directives = [];
      const spawns = [];
      client.onDirective((frame) => directives.push(frame));
      client.onSessionSpawn((frame) => spawns.push(frame));

      // Send a directive
      transport.deliver({
        kind: "directive",
        to: "n1",
        assignmentId: "a1",
        itemRef: "42",
        workspaceId: "ws1",
        at: "2026-08-14T00:00:00.000Z",
      });

      assert.equal(directives.length, 1);
      assert.equal(spawns.length, 0);

      // Send a session-spawn
      transport.deliver({
        kind: "session-spawn",
        to: "n1",
        sessionId: "s1",
        workspaceId: "ws1",
        assistant: "claude",
        itemRef: null,
        at: "2026-08-14T00:01:00.000Z",
      });

      assert.equal(directives.length, 1);
      assert.equal(spawns.length, 1);
    },
  },
  {
    name: "session-spawn-directive/01 REAL loopback stream dispatches a session-spawn through sendDirective to the registered handler",
    async run() {
      await withGlobalHome(async ({ env }) => {
        const server = await startControlStreamServer({
          peerNodeIds: ["n1"],
          peersByAddress: [{ nodeId: "n1", dialAddress: "127.0.0.1" }],
          storeOptions: { env },
        });
        let client = null;
        try {
          const port = server.server.address().port;
          client = createWorkerStreamClient({
            transport: createWorkerWsTransport(`ws://127.0.0.1:${port}/`),
            nodeId: "n1",
            workspaceId: "ws1",
            now: () => "2026-08-14T00:00:00.000Z",
          });
          const received = [];
          client.onSessionSpawn((frame) => received.push(frame));

          assert.equal(await client.ensureConnected(), true);
          await waitFor(() => server.directiveTargets.get("n1") != null, { label: "worker target registration" });

          const frame = buildSessionSpawnFrame("n1", {
            sessionId: "s1",
            workspaceId: "ws1",
            assistant: "claude",
            itemRef: null,
            at: "2026-08-14T00:00:00.000Z",
          });
          assert.deepEqual(server.dispatchDirective(frame), { sent: true });

          await waitFor(() => received.length === 1, { label: "session-spawn receive handler" });
          assert.deepEqual(received[0], frame);
        } finally {
          client?.stop();
          server.stop();
        }
      });
    },
  },
  {
    name: "session-spawn-directive/01 a connected worker serializes and sends the session-spawn-ack over the REAL WebSocket transport",
    async run() {
      const receivedRaw = [];
      const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
      await listen(wss);
      wss.on("connection", (socket) => {
        socket.on("message", (data) => receivedRaw.push(data.toString()));
      });
      let client = null;
      try {
        const port = wss.address().port;
        client = createWorkerStreamClient({
          transport: createWorkerWsTransport(`ws://127.0.0.1:${port}/`),
          nodeId: "n1",
          workspaceId: "ws1",
          now: () => "2026-08-14T00:00:00.000Z",
        });

        assert.equal(await client.ensureConnected(), true);
        assert.deepEqual(
          await client.sendSessionSpawnAck({ sessionId: "s1", ok: true }),
          { sent: true },
        );
        await waitFor(() => receivedRaw.length === 1, { label: "serialized session-spawn-ack" });

        const expected = {
          kind: "session-spawn-ack",
          sessionId: "s1",
          nodeId: "n1",
          ok: true,
        };
        assert.equal(receivedRaw[0], JSON.stringify(expected));
        assert.deepEqual(JSON.parse(receivedRaw[0]), expected);
      } finally {
        client?.stop();
        await closeWebSocketServer(wss);
      }
    },
  },
  {
    name: "session-spawn-directive/01 a session-spawn-ack send fault is isolated from the caller",
    async run() {
      const warnings = [];
      const transport = createFakeTransport();
      transport.send = async () => { throw new Error("ack send failed"); };
      const client = createWorkerStreamClient({
        transport,
        nodeId: "n1",
        workspaceId: "ws1",
        onWarning: (warning) => warnings.push(warning),
      });

      assert.deepEqual(
        await client.sendSessionSpawnAck({ sessionId: "s1", ok: false, code: "session-spawn-failed" }),
        { sent: false },
      );
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].code, "worker-stream-send-failed");
    },
  },
];
