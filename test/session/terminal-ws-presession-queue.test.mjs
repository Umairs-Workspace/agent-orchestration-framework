// Traceability wiring for milestone 46 / story 00, task 00 (ADR-008) —
// `tasks/00_pre-session-frames-are-queued-and-drained.feature`.
//
//   @executable @bug Scenario Outline: a resize sent in the same tick the socket
//       opens is applied to the PTY once the session is live            (4 rows)
//   @executable @bug Scenario Outline: frames that arrived before the session
//       existed are drained in the order they arrived, and live frames
//       follow them                                                     (7 rows)
//   @executable Scenario Outline: a frame means the same thing on either side of
//       the boundary — the queue changes timing, never semantics       (12 rows)
//   @executable Scenario: once drained, the queue is out of the way — later
//       frames take the ordinary path and nothing is replayed
//   @executable Scenario: two sockets opening in the same tick each get their own
//       frames and nobody else's
//   @executable Scenario: the wire envelope is unchanged — no new frame type in
//       either direction and no handshake to wait for
//
// EVERY Then below reads the stub PTY's recorded calls, the frames a real `ws`
// client received, or an HTTP status from the same server — never a source file,
// never "the listener is registered at connection time".
//
// The one @manual scenario (a real node-pty resized microseconds after it
// spawned) is environment-dependent and is verified at aof:verify, not here.
//
// ISOLATION: AOF_GLOBAL_HOME=$(mktemp -d) — focused, never the full suite.
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import {
  GREETING,
  makeRepo,
  stubWhich,
  heldSpawn,
  withServer,
  openTerminal,
  io,
  sessionFor,
  waitFor,
  settle,
} from "../support/terminal-presession-harness.mjs";

// --- the frame vocabulary the Examples tables are written in -------------------

const R = (cols, rows) => ({ kind: "resize", cols, rows });
const W = (text) => ({ kind: "write", text });

function sendFrame(client, frame) {
  if (frame.kind === "resize") client.sendResize(frame.cols, frame.rows);
  else client.send(frame.text);
}

function expected(frame) {
  return frame.kind === "resize"
    ? { method: "resize", cols: frame.cols, rows: frame.rows }
    : { method: "write", text: frame.text };
}

// The recorded call, normalised for comparison. Deliberately distinguishes a
// BINARY write (node-pty receives the Buffer) from a TEXT write (it receives the
// decoded string) — that distinction is what row 11 of the semantics table pins.
function describeCall(call) {
  if (call.method === "resize") return `resize(${call.cols}, ${call.rows})`;
  if (call.method === "kill") return "kill()";
  const binary = typeof call.data !== "string";
  return `write[${binary ? "binary" : "text"}](${Buffer.from(call.data).toString("hex")})`;
}

function describeExpected(spec) {
  if (spec.method === "resize") return `resize(${spec.cols}, ${spec.rows})`;
  const binary = spec.bytes !== undefined;
  const buffer = binary ? spec.bytes : Buffer.from(spec.text, "utf8");
  return `write[${binary ? "binary" : "text"}](${buffer.toString("hex")})`;
}

function normalise(call) {
  if (call.method === "resize") return { method: "resize", cols: call.cols, rows: call.rows };
  return { method: "write", text: Buffer.from(call.data).toString() };
}

async function withTerminalServer(body, { which = stubWhich(["claude"]) } = {}) {
  const repo = await makeRepo();
  const spawner = heldSpawn();
  try {
    return await withServer(repo, { spawn: spawner.spawn, which }, (ctx) => body({ ...ctx, spawner }));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

export const terminalWsPreSessionQueueTests = [
  // ===== 1. a resize sent in the same tick the socket opens is applied ==========
  ...[
    { name: "the spike's own measurement, inverted", cols: 111, rows: 11 },
    { name: "a wide dock on a 1440px pane", cols: 213, rows: 47 },
    { name: "the narrowest pane a dock can be dragged to", cols: 20, rows: 4 },
    // The row that NEEDS the count: spawn is already called with cols:80 rows:24,
    // so a dropped 80×24 frame and an applied one leave the PTY at the same
    // geometry. The evidence is "exactly one resize call was RECORDED".
    { name: "a geometry identical to the spawn default", cols: 80, rows: 24 },
  ].map((row) => ({
    name: `terminal-ws/46-00-00 a resize sent in the same tick the socket opens is applied once the session is live — ${row.name} (${row.cols}×${row.rows})`,
    async run() {
      await withTerminalServer(async ({ wsBase, spawner }) => {
        // Given a client that sends its fit in the same tick the socket opens,
        // and nothing after it.
        const client = openTerminal(wsBase, { onOpen: (c) => c.sendResize(row.cols, row.rows) });
        await client.opened;
        // The frame has provably reached the server (ping/pong barrier) while the
        // spawn is still held — so it arrived BEFORE the session existed.
        await client.barrier();
        await spawner.waitForCalls(1);
        assert.equal(io(spawner.sessions[0]).length, 0, "nothing is applied while the session does not exist yet");

        // When the harness releases the spawn and the session becomes live.
        spawner.release();
        await waitFor(() => io(spawner.sessions[0]).length >= 1, "the queued resize to reach the PTY");
        await settle();

        // Then the stub PTY records exactly one resize call, with those arguments.
        const calls = io(spawner.sessions[0]);
        assert.deepEqual(calls, [{ method: "resize", cols: row.cols, rows: row.rows }], "exactly one resize, carrying the geometry the client sent");
        // And no further frame was sent by the client to make that happen.
        assert.equal(client.sent, 1, "the client sent exactly one frame — no second resize, no re-emitted fit");
        // And the stub PTY records no write calls.
        assert.equal(calls.filter((call) => call.method === "write").length, 0, "the control frame was never typed into the PTY as text");
      });
    },
  })),

  // ===== 2. drained in arrival order, live frames follow =======================
  ...[
    { name: "a fit, then typing", pre: [R(111, 11), W("l"), W("s")], live: [W("\r")] },
    { name: "typing, then a fit — the fit is the last word", pre: [W("a"), R(90, 30)], live: [] },
    // BOTH queued resizes are applied, in order: the drain replays the arrival
    // sequence, it does not compact it into "the last one wins".
    { name: "two fits before the session exists", pre: [R(80, 24), R(111, 11)], live: [] },
    { name: "a paste split across three frames", pre: [W("ec"), W("ho "), W("hi\r")], live: [] },
    { name: "nothing queued, everything live", pre: [], live: [R(100, 40), W("x")] },
    // The client as it is actually written: the auto-typed command travels as
    // ORDINARY INPUT on the raw path, so a queue that handled only control frames
    // would silently eat the operator's first command.
    { name: "the real dock's burst — fit, then the command", pre: [R(111, 11), W("/aof:refine 46/00\r")], live: [] },
    { name: "a fit between two live keystrokes", pre: [W("a")], live: [R(70, 20), W("b")] },
  ].map((row) => ({
    name: `terminal-ws/46-00-00 pre-session frames drain in arrival order and live frames follow — ${row.name}`,
    async run() {
      await withTerminalServer(async ({ wsBase, spawner }) => {
        const client = openTerminal(wsBase, {
          onOpen: (c) => { for (const frame of row.pre) sendFrame(c, frame); },
        });
        await client.opened;
        await client.barrier();
        await spawner.waitForCalls(1);
        const session = spawner.sessions[0];
        assert.equal(io(session).length, 0, "not one pre-session frame is applied before the session exists");

        // When the harness releases the spawn …
        spawner.release();
        await waitFor(() => io(session).length >= row.pre.length, "the queue to drain");
        // … and the client THEN sends its live frames (the session is live: the
        // PTY's own first output has already reached the client).
        await waitFor(() => client.output().length >= 1, "the PTY's first output — the session is live");
        let applied = row.pre.length;
        for (const frame of row.live) {
          sendFrame(client, frame);
          applied += 1;
          await waitFor(() => io(session).length >= applied, `live frame ${applied} to reach the PTY`);
        }
        await settle();

        // Then the stub PTY's recorded calls are exactly these, in that order.
        const calls = io(session).map(normalise);
        assert.deepEqual(calls, [...row.pre, ...row.live].map(expected), "the PTY records the client's frames in arrival order");
        // And no recorded call appears twice — nothing is drained and then replayed.
        assert.equal(new Set(calls.map((call) => JSON.stringify(call))).size, calls.length, "no call is replayed");
        // And the number of recorded calls equals the number of frames sent.
        assert.equal(calls.length, client.sent, "every frame the client sent is accounted for exactly once");
      });
    },
  })),

  // ===== 3. a frame means the same thing on either side of the boundary =========
  ...[
    { name: "a well-formed resize", frame: { text: '{"type":"resize","cols":111,"rows":11}' }, expect: { method: "resize", cols: 111, rows: 11 } },
    { name: "a resize with no cols", frame: { text: '{"type":"resize","rows":11}' }, expect: { method: "resize", cols: 80, rows: 11 } },
    { name: "a resize with a non-numeric cols", frame: { text: '{"type":"resize","cols":"wide"}' }, expect: { method: "resize", cols: 80, rows: 24 } },
    { name: "a resize with zero cols", frame: { text: '{"type":"resize","cols":0,"rows":11}' }, expect: { method: "resize", cols: 80, rows: 11 } },
    { name: "a resize with negative rows", frame: { text: '{"type":"resize","cols":111,"rows":-5}' }, expect: { method: "resize", cols: 111, rows: 24 } },
    { name: "a fractional geometry", frame: { text: '{"type":"resize","cols":111.7}' }, expect: { method: "resize", cols: 111, rows: 24 } },
    // PRE-EXISTING behaviour, pinned so the drain cannot silently change it: an
    // unknown control type falls through to term.write and is typed into the
    // agent's prompt as literal text. QA routed the oddity itself to the PO.
    { name: "an unknown JSON control type", frame: { text: '{"type":"paste","data":"x"}' }, expect: { method: "write", text: '{"type":"paste","data":"x"}' } },
    { name: "malformed JSON that opens with a brace", frame: { text: '{"type":' }, expect: { method: "write", text: '{"type":' } },
    { name: "plain input bytes", frame: { text: "ls -l\r" }, expect: { method: "write", text: "ls -l\r" } },
    { name: "text that only looks like JSON further in", frame: { text: 'echo {"type":"resize"}' }, expect: { method: "write", text: 'echo {"type":"resize"}' } },
    // The row a naive queue breaks: isBinary must survive the queue, or a pasted
    // binary payload that happens to be JSON becomes a geometry change.
    { name: "resize JSON sent as a BINARY frame", frame: { bytes: Buffer.from('{"type":"resize","cols":111,"rows":11}', "utf8") }, expect: { method: "write", bytes: Buffer.from('{"type":"resize","cols":111,"rows":11}', "utf8") } },
    { name: "an empty text frame", frame: { text: "" }, expect: { method: "write", text: "" } },
  ].map((row) => ({
    name: `terminal-ws/46-00-00 the queue changes timing, never semantics — ${row.name}`,
    async run() {
      await withTerminalServer(async ({ wsBase, spawner }) => {
        const send = (client) => {
          if (row.frame.bytes !== undefined) client.send(row.frame.bytes, { binary: true });
          else client.send(row.frame.text);
        };

        // Session one: the frame arrives BEFORE the session exists.
        const queued = openTerminal(wsBase, { ref: "queued", onOpen: send });
        await queued.opened;
        await queued.barrier();
        await spawner.waitForCalls(1);
        const queuedSession = sessionFor(spawner.sessions, "queued");
        assert.equal(io(queuedSession).length, 0, "the frame is held, not applied, while the session does not exist");
        spawner.release();
        await waitFor(() => io(queuedSession).length >= 1, "the queued frame to reach its PTY");

        // Session two: the identical frame, delivered once the session is LIVE.
        const live = openTerminal(wsBase, { ref: "live" });
        await live.opened;
        await waitFor(() => live.output().length >= 1, "session two's PTY to start streaming — it is live");
        const liveSession = sessionFor(spawner.sessions, "live");
        send(live);
        await waitFor(() => io(liveSession).length >= 1, "the live frame to reach its PTY");
        await settle();

        // Then both PTYs record the same single call …
        const queuedCalls = io(queuedSession);
        const liveCalls = io(liveSession);
        assert.equal(queuedCalls.length, 1, "the queued session applied the frame exactly once");
        assert.equal(liveCalls.length, 1, "the live session applied the frame exactly once");
        const want = describeExpected(row.expect);
        assert.equal(describeCall(queuedCalls[0]), want, "the queued frame means what the contract says it means");
        assert.equal(describeCall(liveCalls[0]), want, "the live frame means the same thing");
        // … and the two recorded calls are identical, byte for byte.
        assert.equal(describeCall(queuedCalls[0]), describeCall(liveCalls[0]), "queued and live are the same call, byte for byte");
      });
    },
  })),

  // ===== 4. once drained, the queue is out of the way ==========================
  {
    name: "terminal-ws/46-00-00 once drained the queue is out of the way — later frames take the ordinary path and nothing is replayed",
    async run() {
      await withTerminalServer(async ({ wsBase, spawner }) => {
        const pre = [R(111, 11), W("a"), W("b")];
        const client = openTerminal(wsBase, { onOpen: (c) => { for (const frame of pre) sendFrame(c, frame); } });
        await client.opened;
        await client.barrier();
        await spawner.waitForCalls(1);
        const session = spawner.sessions[0];
        spawner.release();
        await waitFor(() => io(session).length >= pre.length, "the queue to drain");

        // Then each LATER frame appears in the recorded calls before the client
        // sends the next one — the ordinary path, one at a time.
        const later = [R(90, 30), W("c"), W("d")];
        let seen = pre.length;
        for (const frame of later) {
          sendFrame(client, frame);
          seen += 1;
          await waitFor(() => io(session).length >= seen, `frame ${seen} to be applied before the next is sent`);
          assert.equal(io(session).length, seen, "exactly one call per frame — nothing is batched or replayed");
        }
        await settle();

        const calls = io(session).map(normalise);
        assert.deepEqual(calls, [...pre, ...later].map(expected), "every frame exactly once, in the order the client sent them");
        assert.equal(new Set(calls.map((call) => JSON.stringify(call))).size, calls.length, "nothing is replayed");
        assert.equal(calls.length, client.sent, "the recorded call count equals the frame count");
        const geometries = calls.filter((call) => call.method === "resize");
        assert.deepEqual(geometries.at(-1), { method: "resize", cols: 90, rows: 30 }, "the PTY's last geometry is the LAST resize the client sent");
      });
    },
  },

  // ===== 5. per-connection, not per-server =====================================
  {
    name: "terminal-ws/46-00-00 two sockets opening in the same tick each get their own frames and nobody else's",
    async run() {
      await withTerminalServer(async ({ wsBase, spawner }) => {
        // Two clients dialled without awaiting one another, each sending its own
        // geometry in the same tick its own socket opened.
        const first = openTerminal(wsBase, { ref: "pane-a", onOpen: (c) => c.sendResize(111, 11) });
        const second = openTerminal(wsBase, { ref: "pane-b", onOpen: (c) => c.sendResize(60, 20) });
        await Promise.all([first.opened, second.opened]);
        await Promise.all([first.barrier(), second.barrier()]);
        await spawner.waitForCalls(2);
        assert.equal(spawner.sessions.every((record) => io(record).length === 0), true, "neither session applied anything before it existed");

        spawner.release();
        const a = sessionFor(spawner.sessions, "pane-a");
        const b = sessionFor(spawner.sessions, "pane-b");
        await waitFor(() => io(a).length >= 1 && io(b).length >= 1, "both queues to drain");
        await settle();

        assert.deepEqual(io(a), [{ method: "resize", cols: 111, rows: 11 }], "the first session's PTY records exactly its own geometry");
        assert.deepEqual(io(b), [{ method: "resize", cols: 60, rows: 20 }], "the second session's PTY records exactly its own geometry");
        assert.equal(io(a).some((call) => call.cols === 60), false, "the first PTY never sees the second pane's geometry");
        assert.equal(io(b).some((call) => call.cols === 111), false, "the second PTY never sees the first pane's geometry");
        assert.equal(io(a).concat(io(b)).some((call) => call.method === "write"), false, "neither PTY records any write");
      });
    },
  },

  // ===== 6. the wire envelope is unchanged =====================================
  {
    name: "terminal-ws/46-00-00 the wire envelope is unchanged — no new frame type in either direction and no handshake to wait for",
    async run() {
      await withTerminalServer(async ({ wsBase, spawner, url }) => {
        const client = openTerminal(wsBase, { ref: "envelope", onOpen: (c) => c.sendResize(111, 11) });
        await client.opened;
        await client.barrier();
        await spawner.waitForCalls(1);
        const session = sessionFor(spawner.sessions, "envelope");
        spawner.release();
        await waitFor(() => io(session).length >= 1, "the queued resize to be applied");
        await waitFor(() => client.output().length >= 1, "the PTY's output to stream");

        // When the PTY exits with code 0.
        session.pty.emitExit(0);
        await client.closed;

        // Then every frame the client received is raw PTY output or one of the
        // two frozen control frames.
        for (const frame of client.frames) {
          if (!frame.control) continue;
          assert.ok(["exit", "error"].includes(frame.control.type), `an unfrozen control frame crossed the wire: ${frame.text}`);
        }
        for (const control of client.controls) {
          assert.equal(["ready", "ack", "queued", "resize"].includes(control.type), false, `the server announced a "${control.type}" frame the envelope does not have`);
        }
        assert.deepEqual(client.controls, [{ type: "exit", exitCode: 0 }], "exactly the frozen exit frame, nothing else");
        // And the FIRST frame the client received is the PTY's own first output —
        // the server announced nothing before it, so there was nothing to wait for.
        assert.equal(client.frames[0].control, null, "the first frame is not a server announcement");
        assert.equal(client.frames[0].text, GREETING, "the first frame is the PTY's own first output");
        // And the resize was applied without the client sending a second frame.
        assert.equal(client.sent, 1, "one frame from the client, ever");
        assert.deepEqual(io(session), [{ method: "resize", cols: 111, rows: 11 }], "the geometry landed");

        // And a client that sends nothing at all before the session is live is
        // served exactly as before: its PTY records only its own later frames.
        const quiet = openTerminal(wsBase, { ref: "quiet" });
        await quiet.opened;
        await waitFor(() => quiet.output().length >= 1, "the quiet session to become live");
        const quietSession = sessionFor(spawner.sessions, "quiet");
        assert.deepEqual(io(quietSession), [], "a session with an empty queue applies nothing on drain");
        quiet.send("z");
        await waitFor(() => io(quietSession).length >= 1, "the quiet session's only frame");
        await settle();
        assert.deepEqual(io(quietSession).map(normalise), [{ method: "write", text: "z" }], "only the frames it sent afterwards");

        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server still serves the HTTP API");
      });
    },
  },
];
