// test/mesh/terminal/mesh-terminal-relay-bridge.test.mjs — traceability for milestone 38 / story 06,
// task 00 (tasks/00_pty-bytes-ride-relay-signal.feature, ADR-014) AND milestone 46 /
// story 01, task 00 (ADR-007). The worker's PTY byte stream rides the FROZEN
// mesh-relay.mjs envelope as a NEW opaque `signal` kind ("terminal-frame"), routed by
// (nodeId, sessionId), with ZERO relay change.
//
// m46 / ADR-007 — WHAT CHANGED HERE, AND WHY NOTHING WAS SILENTLY DROPPED.
// `wireTerminalBridge` is DELETED (it had no production caller; the shipped producer is
// mesh-launcher.mjs's `onOutputChunk` arrow into worker-stream-client.sendTerminalFrame,
// driven end-to-end by test/mesh/terminal/mesh-terminal-signal-source.test.mjs). Every lane below that
// used to reach an envelope builder THROUGH that dying wrapper now drives the builder
// DIRECTLY — deleting the wrapper's lanes without re-homing them would have deleted the
// live builders' coverage silently, which is the mirror-image of the mistake this story
// exists to fix. The builders are all live: `buildTerminalFrameEnvelope` +
// `buildTerminalEndEnvelope` feed worker-stream-client.mjs, `buildTerminalInputEnvelope`
// feeds mesh-ui-serve.mjs, `buildTerminalResumeEnvelope` feeds
// commands/mesh-terminal-resume.mjs, and the mirror reads what they build.
//
// PRODUCER-FED where it matters (the milestone's earned lesson, ADR-008): the
// envelope-shape lanes drive the REAL createTerminalMirror with a REAL subscriber open,
// and the relay lane drives the REAL, unmodified src/mesh/relay.mjs `serveRelay()` broker
// over a REAL in-process ws socket via the REAL production
// `createTerminalRelayPushTransport` — the SAME in-process-real-relay harness
// test/mesh/relay/mesh-relay-broker-fanout.test.mjs and test/mesh/relay/mesh-relay-envelope-resilience.test.mjs
// already established for m23/m26's own "a new kind rides the wire with zero relay
// change" precedent — never a hand-built stub of what the relay's parseEnvelope/fan-out
// "should" do.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WebSocket } from "ws";
import { serveRelay } from "../../../src/mesh/relay.mjs";
import * as bridge from "../../../src/mesh/terminal-relay-bridge.mjs";
import {
  TERMINAL_FRAME_KIND,
  TERMINAL_INPUT_KIND,
  TERMINAL_RESUME_KIND,
  buildTerminalFrameEnvelope,
  buildTerminalEndEnvelope,
  buildTerminalInputEnvelope,
  buildTerminalResumeEnvelope,
  createTerminalRelayPushTransport,
} from "../../../src/mesh/terminal-relay-bridge.mjs";
import { createTerminalMirror } from "../../../src/mesh/terminal-mirror.mjs";

const BRIDGE_URL = new URL("../../../src/mesh/terminal-relay-bridge.mjs", import.meta.url).href;

// --- the REAL in-process relay harness (mirrors test/mesh-relay-broker-fanout /
// mesh-relay-envelope-resilience's own connect()/waitFor() shape) ---

function connect(url, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const frames = [];
    let joined = false;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error("join-ack timeout")); }
    }, timeoutMs);
    ws.on("message", (data) => {
      const text = data.toString();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* raw, non-JSON frame */ }
      if (parsed && parsed.type === "joined" && !joined) {
        joined = true;
        if (!settled) { settled = true; clearTimeout(timer); resolve({ ws, frames }); }
        return;
      }
      frames.push({ text, parsed });
    });
    ws.on("error", (error) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(error); }
    });
  });
}

function waitFor(predicate, { timeoutMs = 1500, label = "condition" } = {}) {
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

const closeAll = async (...clients) => {
  for (const c of clients) {
    try { c?.ws?.close?.(); } catch { /* noop */ }
  }
};

// THE FROZEN EXPORT SURFACE, after the ADR-007 deletion — exactly nine names.
const EXPECTED_EXPORTS = [
  "TERMINAL_FRAME_KIND",
  "TERMINAL_INPUT_KIND",
  "TERMINAL_RESUME_KIND",
  "loopbackRelayUrl",
  "buildTerminalFrameEnvelope",
  "buildTerminalEndEnvelope",
  "buildTerminalInputEnvelope",
  "buildTerminalResumeEnvelope",
  "createTerminalRelayPushTransport",
];

// THE WIRE, PINNED BEFORE THE DELETION. Each string was captured by importing
// `git show HEAD:src/mesh/terminal-relay-bridge.mjs` (i.e. the module WITH
// `wireTerminalBridge` still in it) and JSON.stringify-ing the builder's output for the
// fixed inputs below. "Byte-identical, not merely equivalent" is the point: a deepEqual
// would forgive a key-order change that a JSON-comparing consumer would not.
const PINNED = {
  frame: String.raw`{"kind":"terminal-frame","nodeId":"node-a","signal":{"sessionId":"sess-1","bytes":"pinned bytes\r\n"}}`,
  end: String.raw`{"kind":"terminal-frame","nodeId":"node-a","signal":{"sessionId":"sess-1","end":true}}`,
  input: String.raw`{"kind":"terminal-input","nodeId":"node-a","signal":{"sessionId":"sess-1","bytes":"a keystroke\r"}}`,
  resume: String.raw`{"kind":"terminal-resume","nodeId":"node-a","signal":{"sessionId":"sess-1","assignmentId":"asg-1","workspaceId":"ws-1","itemRef":"46/01/00","parkId":"park-event-1"}}`,
  unsubscribed: String.raw`{"kind":"terminal-frame","nodeId":"node-z","signal":{"sessionId":"sess-9","bytes":"bytes for an unsubscribed tuple\n"}}`,
};

// ── Scenario 3 rows: every SURVIVING builder, applied to the REAL mirror with one
// subscriber open on (node-a, sess-1).
const BUILDER_ROWS = [
  {
    case: "a live output frame",
    builder: "buildTerminalFrameEnvelope",
    build: () => buildTerminalFrameEnvelope("node-a", "sess-1", "pinned bytes\r\n"),
    kind: TERMINAL_FRAME_KIND,
    pinned: PINNED.frame,
    signal(signal) {
      assert.deepEqual(Object.keys(signal).sort(), ["bytes", "sessionId"], "signal carries the sessionId and the bytes, nothing else");
      assert.equal(signal.sessionId, "sess-1");
      assert.equal(signal.bytes, "pinned bytes\r\n", "the bytes ride VERBATIM — CRLF is never normalised");
    },
    observed: [{ bytes: "pinned bytes\r\n", meta: { end: false } }],
    delivered: true,
  },
  {
    case: "the end-of-stream marker",
    builder: "buildTerminalEndEnvelope",
    build: () => buildTerminalEndEnvelope("node-a", "sess-1"),
    kind: TERMINAL_FRAME_KIND,
    pinned: PINNED.end,
    signal(signal) {
      assert.deepEqual(Object.keys(signal).sort(), ["end", "sessionId"], "signal carries the sessionId and end:true — and NO bytes key");
      assert.equal(signal.sessionId, "sess-1");
      assert.equal(signal.end, true);
      assert.ok(!("bytes" in signal), "an end is a fact about the stream, never terminal content a worker's own output could forge");
    },
    observed: [{ bytes: undefined, meta: { end: true } }],
    delivered: true,
  },
  {
    case: "a browser keystroke on the input lane",
    builder: "buildTerminalInputEnvelope",
    build: () => buildTerminalInputEnvelope("node-a", "sess-1", "a keystroke\r"),
    kind: TERMINAL_INPUT_KIND,
    pinned: PINNED.input,
    signal(signal) {
      assert.deepEqual(Object.keys(signal).sort(), ["bytes", "sessionId"], "the TARGET nodeId's sessionId and the keystroke, nothing else");
      assert.equal(signal.sessionId, "sess-1");
      assert.equal(signal.bytes, "a keystroke\r", "the keystroke rides verbatim — the input lane is content-blind");
    },
    observed: [],
    delivered: false,
  },
  {
    case: "a control-driven resume request",
    builder: "buildTerminalResumeEnvelope",
    build: () => buildTerminalResumeEnvelope("node-a", { sessionId: "sess-1", assignmentId: "asg-1", workspaceId: "ws-1", itemRef: "46/01/00", parkId: "park-event-1" }),
    kind: TERMINAL_RESUME_KIND,
    pinned: PINNED.resume,
    signal(signal) {
      assert.deepEqual(Object.keys(signal).sort(), ["assignmentId", "itemRef", "parkId", "sessionId", "workspaceId"], "the worktree context and durable park identity, nothing else");
      assert.equal(signal.sessionId, "sess-1");
      assert.equal(signal.assignmentId, "asg-1");
      assert.equal(signal.workspaceId, "ws-1");
      assert.equal(signal.itemRef, "46/01/00");
      assert.equal(signal.parkId, "park-event-1");
    },
    observed: [],
    delivered: false,
  },
  {
    case: "a frame for an UNSUBSCRIBED tuple",
    builder: "buildTerminalFrameEnvelope on (node-z, sess-9)",
    build: () => buildTerminalFrameEnvelope("node-z", "sess-9", "bytes for an unsubscribed tuple\n"),
    kind: TERMINAL_FRAME_KIND,
    pinned: PINNED.unsubscribed,
    signal(signal) {
      assert.deepEqual(Object.keys(signal).sort(), ["bytes", "sessionId"]);
      assert.equal(signal.sessionId, "sess-9");
      assert.equal(signal.bytes, "bytes for an unsubscribed tuple\n");
    },
    observed: [],
    delivered: false,
  },
];

// ── Scenario 5 rows: every shipped module that imports the bridge. CLOSED at eight by
// measurement (the direct-import set under src/), not by belief — and not one of them
// takes the deleted export.
const DEPENDENT_ROWS = [
  { module: "src/worker-stream-client.mjs", bindings: ["buildTerminalFrameEnvelope", "buildTerminalEndEnvelope", "TERMINAL_INPUT_KIND", "TERMINAL_RESUME_KIND"] },
  { module: "src/mesh/ui-serve.mjs", bindings: ["buildTerminalInputEnvelope"] },
  { module: "src/mesh/terminal-mirror.mjs", bindings: ["TERMINAL_FRAME_KIND", "loopbackRelayUrl"] },
  { module: "src/mesh/terminal-input.mjs", bindings: ["TERMINAL_INPUT_KIND", "TERMINAL_RESUME_KIND"] },
  { module: "src/control-stream-server.mjs", bindings: ["TERMINAL_FRAME_KIND"] },
  { module: "src/mesh/launcher.mjs", bindings: ["createTerminalRelayPushTransport"] },
  { module: "src/commands/mesh/terminal-resume.mjs", bindings: ["buildTerminalResumeEnvelope", "createTerminalRelayPushTransport"] },
  { module: "src/commands/mesh/ui.mjs", bindings: ["createTerminalRelayPushTransport"] },
];

// A dependent's own URL, DERIVED from the repo-relative `module` each row already carries. The row
// used to store a second, test-relative spelling of the same path beside it; when 119/03 moved this
// suite two directories down, the repo-relative name stayed true and the stored copy went stale, so
// eight rows failed at import for a reason none of them was about. One name, resolved once.
const dependentUrl = (row) => new URL(`../../../${row.module}`, import.meta.url);

// bridgeImportClause(source) → the named specifiers a module takes FROM the bridge.
function bridgeImportClause(source) {
  const match = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*terminal-relay-bridge\.mjs["']/.exec(source);
  if (match == null) return null;
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export const meshTerminalRelayBridgeTests = [
  // ══ 46/01/00 Scenario 3 — every surviving builder still produces exactly the frame
  //    its consumer already reads ══
  ...BUILDER_ROWS.map((row, index) => ({
    name: `46/01/00 surviving-builder row ${index + 1} (${row.case}): ${row.builder} still produces exactly the frame its consumer reads — the frozen shape, byte-identical to the pin taken BEFORE the deletion`,
    async run() {
      // The REAL in-memory mirror with ONE subscriber open on (node-a, sess-1).
      const mirror = createTerminalMirror();
      const observed = [];
      const unsubscribe = mirror.subscribe("node-a", "sess-1", (bytes, meta) => { observed.push({ bytes, meta }); });
      try {
        const envelope = row.build();

        // Then the envelope's top-level keys are exactly kind, nodeId, signal — the
        // frozen shape, unchanged by the deletion.
        assert.deepEqual(Object.keys(envelope).sort(), ["kind", "nodeId", "signal"], "the frozen envelope: exactly { kind, nodeId, signal } — no fourth key");
        assert.equal(envelope.sessionId, undefined, "sessionId rides INSIDE signal, never as a top-level key");
        // And its kind.
        assert.equal(envelope.kind, row.kind);
        // And its signal carries exactly what it should.
        row.signal(envelope.signal);

        // And what the subscriber observes.
        const delivered = mirror.apply(envelope);
        assert.equal(delivered, row.delivered, row.delivered ? "the frame is delivered to the open subscription" : "the frame is NOT delivered on (node-a, sess-1) — dropped, never mis-routed, never an error");
        assert.deepEqual(observed, row.observed, "the subscriber observes exactly what this builder's frame means to it");

        // And the JSON is byte-identical to the frame pinned before the deletion — the
        // wire is unchanged, not merely equivalent.
        assert.equal(JSON.stringify(envelope), row.pinned, "byte-identical to the pre-deletion pin");
      } finally {
        unsubscribe?.();
      }
    },
  })),

  // ══ 46/01/00 Scenario 4 — the retired export is gone, and its absence is LOUD ══
  {
    name: "46/01/00 the retired wireTerminalBridge is gone from the shipped module, and asking for it fails to LINK — never a silently-undefined binding",
    async run() {
      // Then its exported names are exactly the nine live ones.
      assert.deepEqual(Object.keys(bridge).sort(), [...EXPECTED_EXPORTS].sort(), "the module's export surface is exactly the nine LIVE names");
      // And wireTerminalBridge is not among them.
      assert.ok(!("wireTerminalBridge" in bridge), "wireTerminalBridge is NOT among the exports");
      assert.equal(bridge.wireTerminalBridge, undefined);

      // CONTROL — the probe mechanism itself works: a module taking a LIVE export links.
      const liveProbe = `import { buildTerminalFrameEnvelope } from ${JSON.stringify(BRIDGE_URL)};\nexport const ok = typeof buildTerminalFrameEnvelope === "function";\n`;
      const live = await import(`data:text/javascript,${encodeURIComponent(liveProbe)}`);
      assert.equal(live.ok, true, "the probe mechanism links a module that takes a LIVE export — so a rejection below is about the NAME, not the probe");

      // And a module importing { wireTerminalBridge } fails to LINK, with an error
      // naming the missing export. In ESM that is a SyntaxError raised at link time —
      // which is what makes a leftover caller or a leftover test lane impossible to
      // leave behind: a suite still asserting the deleted function's internals cannot
      // run at all, let alone run green.
      const deadProbe = `import { wireTerminalBridge } from ${JSON.stringify(BRIDGE_URL)};\nexport const wired = wireTerminalBridge;\n`;
      await assert.rejects(
        () => import(`data:text/javascript,${encodeURIComponent(deadProbe)}`),
        (error) => {
          assert.ok(error instanceof SyntaxError, `a missing named export is a LINK-time SyntaxError, never a silently-undefined binding (got ${error?.constructor?.name})`);
          assert.match(String(error.message), /wireTerminalBridge/, "the error NAMES the missing export");
          return true;
        },
        "importing the deleted export must fail loudly",
      );
    },
  },

  // ══ 46/01/00 Scenario 5 — every shipped dependent still links, and still receives the
  //    binding it takes ══
  ...DEPENDENT_ROWS.map((row) => ({
    name: `46/01/00 dependent ${row.module} still links after the deletion, and still receives ${row.bindings.join(", ")} — and takes no binding named wireTerminalBridge`,
    async run() {
      // Then it loads without error — no unresolved import, no link failure. A ninth
      // reader nobody enumerated fails HERE, at import, rather than at daemon start.
      const loaded = await import(dependentUrl(row).href);
      assert.ok(loaded != null, `${row.module} loads`);

      // And the binding it takes from the bridge is defined.
      const source = await readFile(dependentUrl(row), "utf8");
      const taken = bridgeImportClause(source);
      assert.notEqual(taken, null, `${row.module} still imports from the bridge`);
      assert.deepEqual([...taken].sort(), [...row.bindings].sort(), `${row.module} takes exactly the bindings the deletion checklist enumerated`);
      for (const binding of taken) {
        assert.notEqual(bridge[binding], undefined, `${row.module} takes ${binding}, which the bridge still exports`);
      }

      // And it takes no binding named wireTerminalBridge.
      assert.ok(!taken.includes("wireTerminalBridge"), `${row.module} takes no binding named wireTerminalBridge`);
    },
  })),

  // ══ 38-06/task-00 (PRESERVED, re-homed off the deleted wrapper) — the relay envelope
  //    shape is UNBROKEN: a new kind rides with zero relay change ══
  {
    name: "task00/38-06 the relay envelope shape is UNBROKEN — the REAL relay forwards the terminal-frame envelope with EXACTLY {kind,nodeId,signal}, unparsed, unknown-kind-forwarded",
    async run() {
      const relay = await serveRelay({ port: 0 });
      let sender, peer;
      try {
        sender = await connect(relay.url);
        peer = await connect(relay.url);

        // The REAL production push transport, over a REAL ws socket, to the REAL relay.
        // (m46/ADR-007: the envelope used to reach this transport through
        // wireTerminalBridge; production reaches it through the builder directly, and so
        // does this lane now.)
        const senderTransport = createTerminalRelayPushTransport({ mesh: { relay: { url: relay.url } } });
        try {
          await senderTransport.push(buildTerminalFrameEnvelope("node-a", "sess-1", "real relay round-trip bytes\n"));
          await waitFor(() => peer.frames.length >= 1, { label: "peer receives the terminal-frame envelope" });
        } finally {
          senderTransport.close();
        }

        const received = peer.frames[0].parsed;
        // EXACTLY the frozen envelope keys { kind, nodeId, signal } — no fourth key.
        assert.deepEqual(Object.keys(received).sort(), ["kind", "nodeId", "signal"], "the received envelope has EXACTLY the frozen top-level keys — no fourth key");
        assert.equal(received.kind, TERMINAL_FRAME_KIND);
        assert.equal(received.nodeId, "node-a");
        assert.equal(received.signal.sessionId, "sess-1");
        assert.equal(received.signal.bytes, "real relay round-trip bytes\n", "the relay fans the ORIGINAL frame bytes out unparsed — no rewrite, no re-serialization");

        // An UNKNOWN kind is forwarded, never rejected (the m26 leasing property this
        // envelope relies on) — sent directly to prove the RELAY's own behaviour.
        sender.ws.send(JSON.stringify({ kind: "some-future-unknown-kind", nodeId: "node-z", signal: { anything: true } }));
        await waitFor(() => peer.frames.length >= 2, { label: "peer receives the unknown-kind frame" });
        assert.equal(peer.frames[1].parsed.kind, "some-future-unknown-kind", "an unknown kind is forwarded, never rejected");
      } finally {
        await closeAll(sender, peer);
        await relay.stop();
      }
    },
  },

  // ══ 38-06/task-00 (PRESERVED, re-homed off the deleted wrapper) — the routing key is
  //    (nodeId, sessionId), incl. the same-node multiplex (row 3: node-a again, a second
  //    session) ══
  ...[
    { nodeId: "node-a", sessionId: "5f3c1e00-ab90-4d21-9f7a-0011223344aa" },
    { nodeId: "node-b", sessionId: "7e21aa10-cd34-4a55-8b0c-99887766ddee" },
    { nodeId: "node-a", sessionId: "0c14bb20-ef56-4c66-7d1e-1122aabbccdd" },
  ].map((row, index) => ({
    name: `task00/38-06 Scenario Outline row ${index + 1}: the routing tuple is exactly (${row.nodeId}, ${row.sessionId}) — proven at the REAL mirror, which routes by that tuple`,
    async run() {
      // The REAL mirror, with a subscriber open on THIS row's tuple and one open on a
      // DIFFERENT session of the SAME node — so row 3's same-node multiplex is a real
      // discrimination, not an assertion about the builder's own inputs.
      const mirror = createTerminalMirror();
      const mine = [];
      const otherSessionOfSameNode = [];
      const unsubMine = mirror.subscribe(row.nodeId, row.sessionId, (bytes) => { mine.push(bytes); });
      const unsubOther = mirror.subscribe(row.nodeId, "a-different-session-on-the-same-node", (bytes) => { otherSessionOfSameNode.push(bytes); });
      try {
        const bytes = `output for ${row.nodeId}/${row.sessionId}\n`;
        const envelope = buildTerminalFrameEnvelope(row.nodeId, row.sessionId, bytes);
        assert.equal(envelope.nodeId, row.nodeId, `the envelope's nodeId is ${row.nodeId}`);
        assert.equal(envelope.signal.sessionId, row.sessionId, `the sessionId extracted from inside signal is ${row.sessionId}`);
        assert.deepEqual(
          [envelope.nodeId, envelope.signal.sessionId],
          [row.nodeId, row.sessionId],
          `the stream's routing tuple is exactly (${row.nodeId}, ${row.sessionId})`,
        );

        assert.equal(mirror.apply(envelope), true, "the frame reaches the subscription on its own tuple");
        assert.deepEqual(mine, [bytes], "the bytes reach exactly the subscriber on this tuple");
        assert.deepEqual(otherSessionOfSameNode, [], "a DIFFERENT session on the SAME node receives nothing — the tuple, never the node alone, is the routing key");
      } finally {
        unsubMine?.();
        unsubOther?.();
      }
    },
  })),
  // 131/04 — hoisted below.
  ...resumeAnswerEnvelopeTests(),
];

// ---- 131/04 task 03 — the answer rides the resume envelope, one additive key ----------------------
function resumeAnswerEnvelopeTests() {
  const BY = { actor: "umami", via: "board", node: "node-7297" };
  const A = { text: "zq-answer-marker", by: BY, askedAt: null };
  const FIVE = { sessionId: "s", assignmentId: "a", workspaceId: "w", itemRef: "18", parkId: "p" };
  return [
    {
      name: "131/04 task03 — the envelope carries the answer only when there is one",
      run() {
        const withAnswer = bridge.buildTerminalResumeEnvelope("node-a", { ...FIVE, answer: { text: "take b", by: BY, askedAt: null } });
        assert.deepEqual(Object.keys(withAnswer.signal).sort(), ["answer", "assignmentId", "itemRef", "parkId", "sessionId", "workspaceId"]);
        assert.deepEqual(withAnswer.signal.answer, { text: "take b", by: BY, askedAt: null });
        const without = bridge.buildTerminalResumeEnvelope("node-a", FIVE);
        assert.equal(
          JSON.stringify(without),
          '{"kind":"terminal-resume","nodeId":"node-a","signal":{"sessionId":"s","assignmentId":"a","workspaceId":"w","itemRef":"18","parkId":"p"}}',
          "today's five keys, byte-identical",
        );
      },
    },
    {
      name: "131/04 task03 — the envelope's signal carries answer last, and only when one is given (three rows)",
      run() {
        const rows = [
          [{ answer: undefined }, ["sessionId", "assignmentId", "workspaceId", "itemRef", "parkId"]],
          [{ answer: null }, ["sessionId", "assignmentId", "workspaceId", "itemRef", "parkId"]],
          [{ reservedAt: "r", previousNodeId: "n", answer: A }, ["sessionId", "assignmentId", "workspaceId", "itemRef", "reservedAt", "previousNodeId", "parkId", "answer"]],
        ];
        for (const [index, [extra, keys]] of rows.entries()) {
          assert.deepEqual(Object.keys(bridge.buildTerminalResumeEnvelope("node-a", { ...FIVE, ...extra }).signal), keys, `row ${index}`);
        }
      },
    },
    {
      name: "131/04 task03 — the mesh leg is one additive key on a closed schema, and imports no ask module",
      async run() {
        const { meshTerminalResumeCommand } = await import("../../../src/commands/mesh/terminal-resume.mjs");
        const { input, cli } = meshTerminalResumeCommand;
        assert.deepEqual(Object.keys(input.properties), ["session", "node", "answer"]);
        assert.equal(input.additionalProperties, false, "the schema refuses any other key");
        assert.deepEqual(input.properties.answer.required, ["text"]);
        assert.deepEqual(Object.keys(input.properties.answer.properties), ["text", "by", "askedAt"]);
        assert.equal(input.properties.answer.properties.text.type, "string");
        assert.equal(input.properties.answer.additionalProperties, false);
        assert.ok(!Object.hasOwn(cli.spec.flags, "answer"), "the CLI face has no answer flag");
        assert.deepEqual(cli.argv(["sess-89d1"], {}), { session: "sess-89d1" });
        for (const rel of ["src/mesh/terminal-input.mjs", "src/mesh/terminal-relay-bridge.mjs", "src/mesh/worker-execution.mjs", "src/mesh/park-resume.mjs"]) {
          const source = await readFile(new URL(`../../../${rel}`, import.meta.url), "utf8");
          assert.ok(!/from\s+["'][^"']*loop\/ask(?:-request)?\.mjs["']/u.test(source), `${rel} imports no ask module`);
        }
        const worker = await readFile(new URL("../../../src/mesh/worker-execution.mjs", import.meta.url), "utf8");
        assert.ok(worker.replace(/\r\n/gu, "\n").split("\n").length - 1 <= 1914, "worker-execution.mjs is at most 1,914 lines");
      },
    },
  ];
}
