// test/mesh/terminal/mesh-terminal-signal-source.test.mjs — traceability for milestone 46 / story 01,
// task 00 (tasks/00_the-signal-gate-follows-the-real-producer.feature, ADR-007).
//
// THE INVARIANT DID NOT MOVE — ONLY ITS SUBJECT. SECURITY T14's surviving half is
// "the streamed terminal output signal is sourced EXCLUSIVELY from `term.onData`, and
// no credential, env, askpass or mint material ever enters it". Until m46 that was
// asserted about `wireTerminalBridge`, a function with NO production caller (spike 44;
// deleted by this story). The bytes an operator actually sees ride
// `onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(sessionId, String(chunk))`
// — mesh-launcher.mjs's assignment call site and its resume call site — into
// worker-stream-client.mjs's `sendTerminalFrame`. This module asserts the invariant
// THERE, behaviourally.
//
// PRODUCER-FED, ACROSS THE SEAM (the feature's LITMUS). Both links are REAL and
// JOINED: the REAL `driveInteractiveClaudeSession` over a scripted node-pty double
// (`createScriptedPty`) and a stubbed `which` — never a real `claude`, which would hang
// a headless run forever — handing chunks through the SAME arrow production wires into
// the REAL `createWorkerStreamClient` over a fake transport that records every envelope.
// `test/mesh/worker/mesh-worker-driver-output-chunk.test.mjs` drives the first link and
// `test/work/worker-stream-client.test.mjs` the second; this joins them, so the property is
// asserted ACROSS the seam rather than on either side of it. No real PTY, no second
// machine, no relay socket, no `~/.aof` write.
//
// NOT ASSERTED HERE (deliberately, so a reviewer does not log an absence): that the
// fitness function `acd-fleet-terminal-input-constrained` detector #4 now reads
// `mesh-launcher.mjs` — that is the amended ARCH test's own subject, over source, and
// belongs nowhere below (ARCHITECTURE §Fitness functions). What lives here is the
// OBSERVABLE CONSEQUENCE: a streamed frame carries exactly the chunk, and a credential
// sitting in the worker's environment does not reach the wire.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { driveInteractiveClaudeSession, createMeshWorkerTerminalResumeHandler } from "../../../src/mesh/worker-execution.mjs";
import { meshWorktreePath } from "../../../src/mesh/worktree.mjs";
import { createWorkerStreamClient } from "../../../src/worker-stream-client.mjs";
import { TERMINAL_FRAME_KIND } from "../../../src/mesh/terminal-relay-bridge.mjs";
import { findWork, loadWorkspace } from "../../../src/work.mjs";
import { startRun } from "../../../src/run-store.mjs";
import { createFakeWhich, createScriptedPty, createFakePtySpawn } from "../../support/mesh-worker-terminal-fixture.mjs";
import { withMeshWorkerExecFixture, createStatusRecorder } from "../../support/mesh-worker-exec-fixture.mjs";

const NODE_ID = "worker-a";
const WORKSPACE_ID = "ws-1";
const NOW = "2026-08-08T10:00:00.000Z";
const ITEM_REF = "46/01/00";

function waitFor(predicate, { timeoutMs = 2000, label = "condition" } = {}) {
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

// recordingTransport() — the fake transport the REAL worker stream client sends over.
// Records every envelope it is HANDED, in order (never a re-shaped copy), so a test
// reads the value that would have gone on the wire.
function recordingTransport({ mintedWriteCredential = null } = {}) {
  const envelopes = [];
  let connectCalls = 0;
  let deliver = null;
  return {
    envelopes,
    get connectCalls() { return connectCalls; },
    async connect() { connectCalls += 1; return { id: connectCalls }; },
    // onMessage is the client's own down-channel seam. When a minted write credential
    // is scripted, this transport answers the worker's `write-credential-request` with
    // the real reply kind, exactly as the control node does at the push seam — so the
    // token genuinely passes THROUGH `createWorkerStreamClient`, the same instance whose
    // `sendTerminalFrame` builds every terminal frame. Without this the "a minted
    // credential appears in no frame" needle would assert nothing: a value no object on
    // the path ever holds cannot leak onto it.
    onMessage(handler) { deliver = handler; },
    async send(_handle, envelope) {
      envelopes.push(envelope);
      if (mintedWriteCredential != null && envelope?.kind === "write-credential-request" && deliver != null) {
        deliver(JSON.stringify({
          kind: "write-credential",
          to: envelope.nodeId,
          assignmentId: envelope.assignmentId,
          credential: mintedWriteCredential,
        }));
      }
    },
    close() {},
  };
}

// startProducerLane({ sessionId }) — THE ASSIGNMENT call site (mesh-launcher.mjs's
// dispatch wiring): the REAL driver, whose transcript watch resolves the session id
// MID-STREAM, so a test can emit a chunk BEFORE the id exists.
//
// The RESUME call site is NOT modelled here. It is driven through the REAL
// `createMeshWorkerTerminalResumeHandler` in its own lane below — see the note there;
// a resume lane that configured the driver by hand would name the second call site
// while never running it, which is the exact defect class ADR-007 is about.
//
// The connection is LIVE before any chunk is emitted (sendTerminalFrame is a no-op while
// disconnected — the live tail has no replay), so a frame is genuinely sent rather than
// dropped by the disconnected-is-a-no-op posture.
async function startProducerLane({ sessionId = "sess-1", mintedWriteCredential = null } = {}) {
  const lane = "assignment";
  const transport = recordingTransport({ mintedWriteCredential });
  const client = createWorkerStreamClient({ transport, nodeId: NODE_ID, workspaceId: WORKSPACE_ID, now: () => NOW });
  await client.sendSnapshot([{ ref: ITEM_REF, status: "in-progress" }]);
  assert.equal(client.connected, true, "the worker's stream connection is LIVE before any terminal frame is produced");

  let pty = null;
  let emit = null;
  const ptySpawn = async () => {
    pty = createScriptedPty({ onWrite: (ctrl) => { if (emit == null) emit = ctrl; } });
    return pty;
  };

  let resolveWatch;
  const watchGate = new Promise((res) => { resolveWatch = res; });
  let captured = null;

  const options = {
    ptySpawn,
    which: createFakeWhich(["claude"]),
    // The OS-liveness probe signal-0s a real pid every 15s; the scripted double's pid is
    // synthetic, so the probe is disabled rather than allowed to settle the run mid-test.
    livenessIntervalMs: 0,
    onSessionIdCaptured: (sid) => { captured = sid; },
    // ── THE PRODUCTION ARROW, mesh-launcher.mjs's assignment call site ──
    onOutputChunk: (chunk, sid) => client.sendTerminalFrame(sid, String(chunk)),
    onSessionEnd: (sid) => client.sendTerminalEnd(sid),
    watchTranscriptSessionId: () => watchGate,
  };
  const brief = {
    itemRef: ITEM_REF,
    worktreeCwd: path.join(os.tmpdir(), "aof-signal-source-wt"),
    task: "demo",
    command: "/aof:refine 46/01 --autonomous",
  };

  const driverPromise = driveInteractiveClaudeSession(brief, options);

  // The driver typing its directive is what hands back the emit control, and that write
  // is scheduled AFTER its onData subscription exists.
  await waitFor(() => emit != null, { label: "the driver types its directive (emit captured)" });
  assert.ok(pty != null, "the scripted PTY was spawned through the driver's own injected seam");

  const terminalFrames = () => transport.envelopes.filter((envelope) => envelope?.kind === TERMINAL_FRAME_KIND);

  return {
    transport,
    client,
    terminalFrames,
    get capturedSessionId() { return captured; },
    // resolveSessionId(id) — the mid-stream transcript capture (assignment lane only).
    async resolveSessionId(id) {
      resolveWatch(id);
      await waitFor(() => captured === id, { label: "the transcript watch resolves the session id" });
    },
    // emitChunk(bytes) — the PTY prints; returns once the resulting frame (if any) has
    // been handed to the transport.
    async emitChunk(bytes) {
      const before = terminalFrames().length;
      emit.emitData(bytes);
      await waitFor(() => terminalFrames().length > before, { label: `the chunk ${JSON.stringify(bytes)} reaches the transport` });
    },
    async end() {
      // The driver's settle awaits its transcript watch. The REAL watch resolves null
      // when aborted; the injected gate must do the same or a lane that never captured
      // an id would hang here rather than settle (a no-op if it already resolved).
      resolveWatch(null);
      try { emit?.emitExit?.(0); } catch { /* already settled */ }
      await driverPromise.catch(() => {});
      // The end marker rides the same lane, from the driver's ONE settle point.
      await waitFor(() => terminalFrames().some((envelope) => envelope?.signal?.end === true), { label: "the end-of-stream marker is streamed" });
    },
    async abandon() {
      resolveWatch(null);
      try { emit?.emitExit?.(0); } catch { /* already settled */ }
      await driverPromise.catch(() => {});
    },
    // mintWriteCredential(assignmentId) — pulls a write credential through the REAL
    // client the same way the push seam does (`client.requestWriteCredential`), so the
    // minted token is genuinely resolved by, and held live in, the object that owns
    // sendTerminalFrame while the PTY streams.
    async mintWriteCredential(assignmentId) {
      return client.requestWriteCredential({ assignmentId, workspaceId: WORKSPACE_ID });
    },
  };
}

// The ESC byte, built rather than spelled — a raw control character in a source file is
// exactly the kind of thing an editor, a linter or a checkout silently rewrites, and this
// row exists to prove escape bytes ride UNTOUCHED.
const ESC = String.fromCharCode(27);

// ── Scenario 1 rows. `chunk` and `expected` are SEPARATE literals of identical
// content on purpose: a producer that sanitised, normalised or re-encoded would make
// them differ, which an `expected === chunk` self-comparison could never see.
const SIGNAL_ROWS = [
  {
    case: "a plain line of output",
    lane: "assignment",
    chunk: "hello from the worker\n",
    expected: "hello from the worker\n",
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "the claude TUI's absolute-cursor repaint",
    lane: "assignment",
    chunk: `${ESC}[2J${ESC}[H claude ›`,
    expected: `${ESC}[2J${ESC}[H claude ›`,
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "CRLF, which this tree actually checks out",
    lane: "assignment",
    chunk: "line one\r\nline two\r\n",
    expected: "line one\r\nline two\r\n",
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "multi-byte UTF-8 box drawing and a check mark",
    lane: "assignment",
    chunk: "┌── ✓ done ──┐",
    expected: "┌── ✓ done ──┐",
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "output that READS like an env assignment",
    lane: "assignment",
    chunk: "GIT_ASKPASS=/tmp/aof-askpass\n",
    expected: "GIT_ASKPASS=/tmp/aof-askpass\n",
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "output that READS like a control message",
    lane: "assignment",
    chunk: '{"type":"resize","cols":80}',
    expected: '{"type":"resize","cols":80}',
    sessionId: "sess-assignment-1",
    preCapture: false,
  },
  {
    case: "a chunk emitted BEFORE the session is known",
    lane: "assignment",
    chunk: "early output\n",
    expected: "early output\n",
    sessionId: null,
    preCapture: true,
  },
  // ROW 8 (the resume lane) is NOT in this table — it does not share this harness,
  // because it must run the SECOND CALL SITE ITSELF. See `resumeLaneTest` below.
];

// ── Scenario 1, ROW 8 — the resumed session's first repaint, over the REAL
// createMeshWorkerTerminalResumeHandler.
//
// WHY THIS ROW HAS ITS OWN, HEAVIER HARNESS. The feature says in terms: "ROW 8 is the
// SECOND call site. mesh-launcher.mjs:1291 wires the identical arrow for
// createMeshWorkerTerminalResumeHandler, and two call sites are two chances to
// disagree — the defect class this whole milestone exists to end." Configuring
// driveInteractiveClaudeSession by hand with `resumeSessionId` reproduces the driver's
// resume SHAPE but never runs the handler, and the handler is where the second call
// site's own forwarding lives: it takes `onOutputChunk` as an option and passes it down
// to the driver (mesh-worker-execution.mjs's `onOutputChunk,` forward). Deleting that
// ONE forward darkens every resumed worker session's fleet card while leaving detector
// #4 green (deleting a forward adds no `.sendTerminalFrame(` call site) — so a row that
// bypassed the handler would name this call site while asserting nothing about it.
// Measured: with the forward deleted, this row goes RED and nothing else in the tree does.
//
// The cost is a REAL fixture (a git repo, a work item, a retained worktree, a hermetic
// AOF_GLOBAL_HOME) because the handler resolves a workspace, an item and a run record
// before it spawns. Still no real `claude`, no real PTY, no second machine, no relay
// socket, and no write outside the throwaway temp tree.
const RESUME_SESSION_ID = "resumed-sess-89d1f151";
const RESUME_CHUNK = "resumed session output\n";
const RESUME_EXPECTED = "resumed session output\n";

const resumeLaneTest = {
  name: "46/01/00 signal-source row 8 (the resumed session's first repaint): the resume lane streams exactly the chunk term.onData delivered — driven through the REAL createMeshWorkerTerminalResumeHandler, the SECOND production call site",
  run: async () => withMeshWorkerExecFixture(async (fx) => {
    const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
    const assignmentId = "asg-resume-signal-source";
    // A resume needs the assignment's RETAINED worktree to still be there.
    await mkdir(meshWorktreePath(fx.root, assignmentId), { recursive: true });
    const item = await findWork(fx.workDir, fx.itemRef).then((rows) => rows.find((row) => row.ref === fx.itemRef));
    await startRun(item, { now: NOW, sessionId: RESUME_SESSION_ID, brief: { assignmentId, itemRef: fx.itemRef } });

    const transport = recordingTransport();
    const client = createWorkerStreamClient({ transport, nodeId: NODE_ID, workspaceId: fx.workspaceId, now: () => NOW });
    await client.sendSnapshot([{ ref: fx.itemRef, status: "in-progress" }]);
    assert.equal(client.connected, true, "the worker's stream connection is LIVE before any terminal frame is produced");

    let emit = null;
    let capturing = false;
    const { spawn, spawnCalls, ptys } = createFakePtySpawn({ onWrite: (ctrl) => { if (capturing) emit = ctrl; } });
    const recorder = createStatusRecorder();

    const resumeHandler = createMeshWorkerTerminalResumeHandler({
      loadWs: () => Promise.resolve(ws),
      globalWorkStoreOptions: { env: fx.env },
      nodeId: NODE_ID,
      now: () => NOW,
      onLog: () => {},
      // ── THE PRODUCTION ARROW, mesh-launcher.mjs's RESUME call site (:1291) ──
      onOutputChunk: (chunk, sid) => client.sendTerminalFrame(sid, String(chunk)),
      onSessionEnd: (sid) => client.sendTerminalEnd(sid),
      sendAssignmentStatus: recorder.sendAssignmentStatus,
      sendEffectStep: recorder.sendEffectStep,
      ptySpawn: spawn,
      which: createFakeWhich(["claude"]),
      commandDelayMs: 0,
      livenessIntervalMs: 0,
      // The completion watch never settles here: this row is about the BYTES, and the
      // session is ended by its own PTY exit below.
      watchTranscriptCompletion: () => new Promise(() => {}),
    });

    const running = resumeHandler({ sessionId: RESUME_SESSION_ID, assignmentId, workspaceId: fx.workspaceId, itemRef: fx.itemRef });
    try {
      // The RESUMED session — selected by its own argv, never by spawn order (a
      // non-win32 daemon also spawns a throwaway pty self-test through this same seam).
      await waitFor(() => spawnCalls.some((call) => (call.args ?? []).includes("--resume")), { label: "the resumed session is spawned" });
      const resumeIndex = spawnCalls.findIndex((call) => (call.args ?? []).includes("--resume"));
      assert.ok(spawnCalls[resumeIndex].args.includes(RESUME_SESSION_ID), "the spawn carries --resume <sessionId> — the id is KNOWN at spawn, never derived");

      // The handler re-affirms the RESUMED id on a running frame from inside the
      // session-id capture — which is the deterministic proof the driver's own onData
      // subscription is already registered (the capture runs in a microtask after it).
      await waitFor(
        () => recorder.frames.some((frame) => frame.state === "running" && frame.sessionId === RESUME_SESSION_ID),
        { label: "the resumed session id is captured and re-affirmed" },
      );

      // No directive is typed into a resumed session, so nothing writes to the PTY on
      // its own — prime the scripted double to hand back its emit control.
      capturing = true;
      ptys[resumeIndex].write("");
      capturing = false;
      assert.ok(emit != null, "the resumed session's PTY handed back its emit control");

      const terminalFrames = () => transport.envelopes.filter((envelope) => envelope?.kind === TERMINAL_FRAME_KIND);
      const emitChunk = async (bytes) => {
        const before = terminalFrames().length;
        emit.emitData(bytes);
        await waitFor(() => terminalFrames().length > before, { label: `the chunk ${JSON.stringify(bytes)} reaches the transport` });
      };

      await emitChunk(RESUME_CHUNK);
      const frames = terminalFrames();
      assert.equal(frames.length, 1, "exactly ONE frame is streamed for the chunk");

      const frame = frames[0];
      assert.deepEqual(Object.keys(frame).sort(), ["kind", "nodeId", "signal"], "the frozen envelope: exactly { kind, nodeId, signal }");
      assert.equal(frame.kind, TERMINAL_FRAME_KIND);
      assert.equal(frame.nodeId, NODE_ID);
      assert.equal(frame.signal.bytes, RESUME_EXPECTED, "the streamed bytes are the chunk, verbatim");
      assert.equal(Buffer.byteLength(frame.signal.bytes), Buffer.byteLength(RESUME_EXPECTED), "byte count included");
      assert.equal(frame.signal.sessionId, RESUME_SESSION_ID, "the RESUMED id rides from the first byte — the fleet's existing tuple comes back to life");
      assert.equal(frame.sessionId, undefined, "sessionId is NOT a top-level envelope key");

      await emitChunk(RESUME_CHUNK);
      const second = terminalFrames();
      assert.equal(second.length, 2, "the second identical chunk streams its own frame");
      assert.deepEqual(second[1], second[0], "the identical chunk produces an IDENTICAL frame — no clock, no file, no ambient state");
    } finally {
      try { emit?.emitExit?.(0); } catch { /* already settled */ }
      await Promise.race([
        running.catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    }
  }, { milestoneNumber: "46", storySlug: "resume-signal", storyNumber: "01" }),
};

// ── Scenario 2 rows. Every secret is genuinely held by the worker PROCESS for the
// duration of the session (env vars are set on this process, exactly as a dispatched
// worker holds them), and the differential run re-runs the identical PTY script with the
// environment cleaned — absence by construction, never absence by luck of the test data.
const SECRET_TOKEN = "aof_mesh_clone_ghs_9WQ2kL8xTf0rP4bN6vZ1cA3sD5gH7jK";
const API_KEY = "sk-ant-api03-Zq7WxN2mB4vC6yT8uI0oP1aS3dF5gH7jK9lM";
const MINTED_TOKEN = "ghs_installationWriteCredential_4tR7yU9iO2pA5sD8fG1hJ3kL";
const ASKPASS_SECRET = "the one-shot askpass answer: x1Y2z3A4b5C6d7E8";
const ORDINARY_OUTPUT = ["cloning the worktree…\n", "running /aof:build 46/01\n", "done\n"];

export const meshTerminalSignalSourceTests = [
  // ══ Scenario Outline 1 — a streamed frame carries EXACTLY the chunk ══
  ...SIGNAL_ROWS.map((row, index) => ({
    name: `46/01/00 signal-source row ${index + 1} (${row.case}): the ${row.lane} lane streams exactly the chunk term.onData delivered — nothing appended, nothing normalised, nothing re-encoded`,
    async run() {
      const lane = await startProducerLane({ sessionId: row.sessionId ?? "sess-assignment-1" });
      try {
        if (!row.preCapture) {
          await lane.resolveSessionId(row.sessionId);
        }

        await lane.emitChunk(row.chunk);
        const frames = lane.terminalFrames();

        // Then exactly one frame is streamed for that chunk — never two, never none.
        assert.equal(frames.length, 1, "exactly ONE frame is streamed for the chunk");

        const frame = frames[0];
        // And the frame's top-level keys are exactly kind, nodeId, signal — no fourth key.
        assert.deepEqual(Object.keys(frame).sort(), ["kind", "nodeId", "signal"], "the frozen envelope: exactly { kind, nodeId, signal }");
        assert.equal(frame.kind, TERMINAL_FRAME_KIND);
        assert.equal(frame.nodeId, NODE_ID);

        // And its signal.bytes is the emitted bytes, verbatim.
        assert.equal(frame.signal.bytes, row.expected, "the streamed bytes are the chunk, verbatim");
        assert.equal(
          Buffer.byteLength(frame.signal.bytes),
          Buffer.byteLength(row.expected),
          "byte count included — no re-encoding, no split code point",
        );

        // And its signal.sessionId rides INSIDE the signal, never as a top-level key.
        assert.equal(frame.signal.sessionId, row.preCapture ? null : row.sessionId, "the session id the producer had at that chunk");
        assert.equal(frame.sessionId, undefined, "sessionId is NOT a top-level envelope key");

        // And emitting the identical chunk a second time produces an identical frame —
        // the streamed bytes are a function of the chunk alone, of no clock, no file and
        // no ambient state.
        await lane.emitChunk(row.chunk);
        const second = lane.terminalFrames();
        assert.equal(second.length, 2, "the second identical chunk streams its own frame");
        assert.deepEqual(second[1], second[0], "the identical chunk produces an IDENTICAL frame — no clock, no file, no ambient state");
      } finally {
        await lane.abandon();
      }
    },
  })),

  // ROW 8 — the SECOND call site, run for real (see the note above the definition).
  resumeLaneTest,

  // ══ Scenario Outline 2 — credential material the worker holds never reaches a frame ══
  ...[
    {
      case: "a clone token in the environment",
      env: { AOF_MESH_CLONE_TOKEN: SECRET_TOKEN },
      printed: ORDINARY_OUTPUT,
      // no frame's bytes contain the token, or any prefix of it longer than 8 chars
      verdict(streamed) {
        assert.ok(!streamed.includes(SECRET_TOKEN), "the clone token appears in no frame");
        for (let length = SECRET_TOKEN.length; length > 8; length -= 1) {
          assert.ok(!streamed.includes(SECRET_TOKEN.slice(0, length)), `no prefix of the clone token longer than 8 chars appears in any frame (checked ${length})`);
        }
      },
    },
    {
      case: "the askpass helper and its one-shot file",
      askpass: true,
      printed: ORDINARY_OUTPUT,
      verdict(streamed, { askpassPath }) {
        assert.ok(!streamed.includes(askpassPath), "the askpass helper's PATH appears in no frame");
        assert.ok(!streamed.includes(ASKPASS_SECRET), "the askpass file's CONTENTS appear in no frame");
      },
    },
    {
      // NOT an env row. A minted write credential never lives in the environment — it is
      // PULLED at the push seam through `client.requestWriteCredential`, which means the
      // value is resolved by, and held live in, the very stream client whose
      // `sendTerminalFrame` builds every frame. `runSecretLane` mints it that way (a
      // scripted `write-credential` reply over the client's own down-channel) BEFORE the
      // PTY prints, so the token is genuinely on the producer's object graph for the
      // whole session — otherwise this needle would be unfalsifiable.
      case: "a minted write credential held in memory",
      mintedWriteCredential: MINTED_TOKEN,
      printed: ORDINARY_OUTPUT,
      verdict(streamed) {
        assert.ok(!streamed.includes(MINTED_TOKEN), "the minted write credential appears in no frame");
      },
    },
    {
      case: "a provider API key in the environment",
      env: { ANTHROPIC_API_KEY: API_KEY },
      printed: ORDINARY_OUTPUT,
      verdict(streamed) {
        assert.ok(!streamed.includes(API_KEY), "the provider API key appears in no frame");
      },
    },
    {
      case: "the environment carries no secret at all (the baseline the rows above are compared to)",
      env: {},
      printed: ORDINARY_OUTPUT,
      verdict(streamed) {
        assert.equal(streamed, ORDINARY_OUTPUT.join(""), "the baseline run streams exactly what the PTY printed");
      },
    },
    {
      // THE BOUNDARY, recorded rather than quietly widened. T14's surviving half is "the
      // producer adds nothing", NEVER "the stream is scrubbed" — a session that PRINTS a
      // secret has printed it to a screen, and the mirror is a live view of that screen.
      // A redactor on a lane that is content-blind by contract, half-working, would be
      // worse than none. The litmus is the SAME concatenation identity as every other row.
      case: "THE BOUNDARY: the session PRINTS a secret",
      env: { AOF_MESH_CLONE_TOKEN: SECRET_TOKEN },
      printed: [`token is ${SECRET_TOKEN}\n`],
      verdict(streamed) {
        assert.ok(streamed.includes(SECRET_TOKEN), "a PRINTED secret DOES ride, verbatim, as printed — the producer neither adds nor scrubs");
      },
    },
  ].map((row, index) => ({
    name: `46/01/00 credential-source row ${index + 1} (${row.case}): the streamed frames are the emitted chunks exactly, and are byte-identical to the same session run with NO secret present`,
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-signal-source-secret-"));
      const askpassPath = path.join(tmp, "aof-askpass.sh");
      try {
        if (row.askpass) await writeFile(askpassPath, `#!/bin/sh\necho "${ASKPASS_SECRET}"\n`, "utf8");
        const secretEnv = { ...(row.env ?? {}), ...(row.askpass ? { GIT_ASKPASS: askpassPath } : {}) };

        // The secret is held by the worker PROCESS for the whole session (env rows) or
        // pulled through the stream client and held live on it (the minted-credential
        // row) — exactly the posture a dispatched worker is in while its PTY streams.
        const mintedWriteCredential = row.mintedWriteCredential ?? null;
        const withSecrets = await runSecretLane({ env: secretEnv, printed: row.printed, mintedWriteCredential });
        // …and the SAME session with NOTHING set.
        const withoutSecrets = await runSecretLane({ env: {}, printed: row.printed, mintedWriteCredential: null });

        const streamed = withSecrets.map((frame) => frame.signal.bytes ?? "").join("");
        const emitted = row.printed.join("");

        // Then the concatenation of every frame's signal.bytes equals the concatenation of
        // every chunk the PTY emitted, exactly — byte count included. THE load-bearing
        // Then: if the streamed bytes equal the emitted chunks exactly, there is no room
        // in the stream for a byte the PTY did not print, whatever the secret was.
        assert.equal(streamed, emitted, "the streamed bytes ARE the emitted chunks — the producer added nothing");
        assert.equal(Buffer.byteLength(streamed), Buffer.byteLength(emitted), "byte count included");

        // And the verdict on the secret's value.
        row.verdict(streamed, { askpassPath });

        // And no frame carries a key beyond kind/nodeId/signal, and no signal a key beyond
        // sessionId/bytes/end.
        for (const frame of withSecrets) {
          assert.deepEqual(Object.keys(frame).sort(), ["kind", "nodeId", "signal"], "no fourth top-level envelope key");
          for (const key of Object.keys(frame.signal)) {
            assert.ok(["sessionId", "bytes", "end"].includes(key), `signal carries no key beyond sessionId/bytes/end (found ${key})`);
          }
        }

        // And the same session run with NO secret material present produces a
        // byte-identical sequence of frames — the secrets are not merely absent from the
        // output, they are absent from the COMPUTATION.
        assert.deepEqual(withSecrets, withoutSecrets, "with-secrets and without-secrets stream byte-identical frame sequences");
        assert.equal(
          JSON.stringify(withSecrets),
          JSON.stringify(withoutSecrets),
          "byte-identical as serialized too — the wire is the same either way",
        );
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  })),
];

// runSecretLane({ env, printed, mintedWriteCredential }) — one whole session: the named
// environment is set on THIS process for the session's duration (and restored after), the
// minted write credential (if any) is PULLED through the real stream client before the
// first byte, the PTY prints each chunk, the driver settles, and every streamed envelope
// is returned.
async function runSecretLane({ env = {}, printed = [], mintedWriteCredential = null } = {}) {
  const previous = new Map();
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    const lane = await startProducerLane({ sessionId: "sess-secret-lane", mintedWriteCredential });
    if (mintedWriteCredential != null) {
      // The PUSH-SEAM PULL, for real: the client sends a write-credential-request up its
      // own transport and the scripted control answers with the token. The value is now
      // resolved BY the client that owns sendTerminalFrame — a leak has somewhere to come
      // from, which is what makes the needle below falsifiable at all.
      const minted = await lane.mintWriteCredential("asg-secret-lane");
      assert.equal(minted, mintedWriteCredential, "the minted write credential really was resolved through the stream client that owns sendTerminalFrame");
    }
    await lane.resolveSessionId("sess-secret-lane");
    for (const chunk of printed) await lane.emitChunk(chunk);
    await lane.end();
    return lane.terminalFrames();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
