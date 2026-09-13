// Traceability wiring for milestone 46 / story 00, task 01 (ADR-008) —
// `tasks/01_the-queue-is-bounded-and-degrades-honestly.feature`.
//
//   @executable Scenario Outline: a pre-session flood is bounded, and it is the
//       NEWEST frames that survive                                      (5 rows)
//   @executable Scenario Outline: a few enormous frames cannot buy what many
//       small ones cannot — the bound holds in bytes as well as in count (3 rows)
//   @executable Scenario: the overflow is a named, countable event — never a
//       silent truncation and never a failed session
//   @executable @bug Scenario Outline: a socket that closes before the session is
//       live discards its queue and leaves nothing running              (4 rows)
//   @executable Scenario Outline: a session that fails to spawn discards its
//       queue and the client still receives the error control-frame     (3 rows)
//   @executable Scenario: the ceiling applies only to the pre-session window
//
// `the ceiling` is READ from the value the server publishes for its pre-session
// bound (MAX_PRESESSION_FRAMES / MAX_PRESESSION_BYTES) and never retyped as a
// number here — the number is the build's to choose, the SHAPE is the contract:
// bounded, newest-wins, reported.
//
// ISOLATION: AOF_GLOBAL_HOME=$(mktemp -d) — focused, never the full suite.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { rm } from "node:fs/promises";
import {
  MAX_PRESESSION_FRAMES,
  MAX_PRESESSION_BYTES,
  PRESESSION_OVERFLOW_CODE,
  SOCKET_ERROR_CODE,
  createConnectionGate,
} from "../../src/terminal-ws.mjs";
import {
  makeRepo,
  stubWhich,
  heldSpawn,
  heldAsync,
  withServer,
  openTerminal,
  io,
  killed,
  sessionFor,
  writeText,
  callBytes,
  recordingDegradeSink,
  waitFor,
  settle,
} from "../support/terminal-presession-harness.mjs";

const CEILING = MAX_PRESESSION_FRAMES;

// A pre-session burst: sequence-numbered input frames, the last of them a resize
// to 111×11 — so "which frames survived" and "what geometry did the PTY end at"
// are both readable off the stub's recorded calls.
function burst(count, { pad = 0, cols = 111, rows = 11 } = {}) {
  const frames = [];
  for (let n = 1; n < count; n += 1) frames.push({ kind: "write", text: pad ? padTo(`#${n}`, pad) : `#${n}` });
  if (count > 0) frames.push({ kind: "resize", cols, rows });
  return frames;
}

function padTo(prefix, bytes) {
  return prefix + "x".repeat(Math.max(0, bytes - prefix.length));
}

function sendFrame(client, frame) {
  if (frame.kind === "resize") client.sendResize(frame.cols, frame.rows);
  else client.send(frame.text);
}

function expectedCall(frame) {
  return frame.kind === "resize"
    ? { method: "resize", cols: frame.cols, rows: frame.rows }
    : { method: "write", text: frame.text };
}

function normalise(call) {
  return call.method === "resize"
    ? { method: "resize", cols: call.cols, rows: call.rows }
    : { method: "write", text: writeText(call) };
}

// What a queue bounded in BOTH dimensions, evicting the OLDEST, must be left
// holding. Written from the published bounds, not from the implementation.
function survivors(frames) {
  const kept = [];
  let bytes = 0;
  for (const frame of frames) {
    const size = frame.kind === "resize"
      ? Buffer.byteLength(JSON.stringify({ type: "resize", cols: frame.cols, rows: frame.rows }))
      : Buffer.byteLength(frame.text);
    if (size > MAX_PRESESSION_BYTES) continue;
    kept.push({ frame, size });
    bytes += size;
    while (kept.length > MAX_PRESESSION_FRAMES || bytes > MAX_PRESESSION_BYTES) bytes -= kept.shift().size;
  }
  return kept.map((entry) => entry.frame);
}

async function withBoundedServer(body, { which = stubWhich(["claude"]), serverOptions = {} } = {}) {
  const repo = await makeRepo();
  const spawner = heldSpawn();
  const degrade = recordingDegradeSink();
  try {
    return await withServer(repo, { spawn: spawner.spawn, which, ...serverOptions }, (ctx) => body({ ...ctx, spawner, degrade }));
  } finally {
    degrade.restore();
    await rm(repo, { recursive: true, force: true });
  }
}

export const terminalWsPreSessionBoundTests = [
  // ===== 1. bounded, and the NEWEST frames survive ==============================
  ...[
    // A FLOOR, not an example: the real client sends a fit on open and types its
    // command as ordinary input on the same clock. A ceiling that drops either has
    // broken the ordinary session to fix the rare one.
    { name: "an ordinary dock's burst — a fit and one typed command", sent: 2 },
    { name: "one frame under the ceiling", sent: CEILING - 1 },
    { name: "exactly at the ceiling", sent: CEILING },
    { name: "one frame over", sent: CEILING + 1 },
    { name: "a determined flood", sent: CEILING * 10 },
  ].map((row) => ({
    name: `terminal-ws/46-00-01 a pre-session flood is bounded and the NEWEST frames survive — ${row.name} (${row.sent} frames)`,
    async run() {
      await withBoundedServer(async ({ wsBase, url, spawner }) => {
        const frames = burst(row.sent);
        const client = openTerminal(wsBase, { onOpen: (c) => { for (const frame of frames) sendFrame(c, frame); } });
        await client.opened;
        await client.barrier();
        await spawner.waitForCalls(1);
        const session = spawner.sessions[0];
        assert.equal(io(session).length, 0, "nothing is applied before the session exists");

        spawner.release();
        const kept = survivors(frames);
        await waitFor(() => io(session).length >= kept.length, "the bounded queue to drain");
        await settle();

        const calls = io(session).map(normalise);
        // Then the stub PTY records no more than `the ceiling` calls …
        assert.ok(calls.length <= CEILING, `the PTY received ${calls.length} calls, over the published ceiling of ${CEILING}`);
        // … and they are the survivors, in the order the client sent them.
        assert.deepEqual(calls, kept.map(expectedCall), "the newest frames survived, in arrival order");
        if (row.sent > CEILING) {
          assert.equal(calls.length, CEILING, "a flood is held at exactly the ceiling");
          // The survivors start one past the last evicted frame: `sent - CEILING`
          // of them went, and they went from the FRONT. A queue that dropped the
          // newest instead would have kept #1 … and left the PTY at the geometry
          // that arrived first.
          assert.equal(calls[0].text, `#${row.sent - CEILING + 1}`, "the OLDEST frames are the ones that went — the survivors start where the eviction stopped");
        } else {
          assert.equal(calls.length, row.sent, "nothing at or under the ceiling is dropped");
        }
        // And the PTY's final geometry is the newest resize, at every flood size.
        assert.deepEqual(calls.at(-1), { method: "resize", cols: 111, rows: 11 }, "the newest resize is the true one");
        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server is still listening and still serving");
      });
    },
  })),

  // ===== 2. the bound holds in BYTES as well as in count =======================
  ...[
    { name: "many small frames", frames: CEILING * 10, each: 8 },
    { name: "few huge frames", frames: 8, each: 1024 * 1024 },
    // The degenerate case said out loud: a queue that made an exception for the one
    // frame it could not hold would have no bound at all.
    { name: "one frame larger than the whole bound", frames: 1, each: 8 * 1024 * 1024 },
  ].map((row) => ({
    name: `terminal-ws/46-00-01 the bound holds in bytes as well as in count — ${row.name} (${row.frames} × ${row.each}B)`,
    async run() {
      await withBoundedServer(async ({ wsBase, url, spawner, degrade }) => {
        const frames = [];
        for (let n = 1; n <= row.frames; n += 1) frames.push({ kind: "write", text: padTo(`#${n}`, row.each) });
        const client = openTerminal(wsBase, { onOpen: (c) => { for (const frame of frames) sendFrame(c, frame); } });
        await client.opened;
        await client.barrier({ timeoutMs: 30000 });
        await spawner.waitForCalls(1);
        const session = spawner.sessions[0];

        spawner.release();
        const kept = survivors(frames);
        await waitFor(() => io(session).length >= kept.length, "the bounded queue to drain");
        await settle();

        const calls = io(session);
        // Then the total bytes the PTY received from the pre-session window is no
        // more than the published bound.
        const received = calls.reduce((total, call) => total + callBytes(call), 0);
        assert.ok(received <= MAX_PRESESSION_BYTES, `the PTY received ${received} bytes, over the published bound of ${MAX_PRESESSION_BYTES}`);
        assert.ok(calls.length <= CEILING, "and no more than the published frame ceiling");
        assert.deepEqual(calls.map(normalise), kept.map(expectedCall), "what survives is the newest frames that fit inside the bound");
        if (row.each > MAX_PRESESSION_BYTES) {
          assert.equal(calls.length, 0, "a frame larger than the whole bound is dropped, never retained");
        }
        // And every dropped frame is reported as scenario 3 requires.
        const dropped = frames.length - kept.length;
        const overflow = degrade.withCode(PRESESSION_OVERFLOW_CODE);
        if (dropped > 0) {
          assert.equal(overflow.length, 1, "ONE coded entry for the burst");
          assert.equal(Number(/dropped (\d+)/.exec(overflow[0].message)?.[1]), dropped, "the entry names how many frames were dropped");
        }
        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server is still listening and still serving");
      });
    },
  })),

  // ===== 3. the overflow is a named, countable event ===========================
  {
    name: "terminal-ws/46-00-01 the overflow is a named, countable event — never a silent truncation and never a failed session",
    async run() {
      await withBoundedServer(async ({ wsBase, url, spawner, degrade }) => {
        const over = 7;
        const frames = burst(CEILING + over);
        const client = openTerminal(wsBase, { onOpen: (c) => { for (const frame of frames) sendFrame(c, frame); } });
        await client.opened;
        await client.barrier();
        await spawner.waitForCalls(1);
        const session = spawner.sessions[0];
        spawner.release();
        await waitFor(() => io(session).length >= CEILING, "the bounded queue to drain");
        await settle();

        // Then the degrade sink holds at least one coded entry for the drop …
        const overflow = degrade.withCode(PRESESSION_OVERFLOW_CODE);
        assert.ok(overflow.length >= 1, "the drop is reported, not silent");
        // … whose code names the pre-session queue overflow and is DISTINCT from
        // the code the module's existing guarded catches report (reportDegrade
        // throttles per CODE for 5s, so a shared code could swallow it whole).
        assert.notEqual(PRESESSION_OVERFLOW_CODE, "terminal-ws", "the overflow does not share the module's generic degrade code");
        assert.match(overflow[0].code, /pre-?session/, "the code names the pre-session queue");
        assert.match(overflow[0].code, /overflow/, "the code names the overflow");
        // … and it names HOW MANY frames were dropped — a number a reader can act on.
        const named = /dropped (\d+)/.exec(overflow[0].message);
        assert.ok(named, `the entry carries a count, not a bare "dropped": ${overflow[0].message}`);
        assert.equal(Number(named[1]), over, "the count is the number of frames actually dropped");
        // … and there is ONE entry for that burst, not one per dropped frame.
        assert.equal(overflow.length, 1, "one entry for the burst");

        // And the client receives NO error control-frame — a client that talks too
        // fast is not a failed session …
        assert.equal(client.controls.some((control) => control.type === "error"), false, "the overflow is not reported to the client as a failed session");
        // … and the session still spawns and still streams the PTY's output.
        await waitFor(() => client.output().length >= 1, "the session to stream the PTY's output afterwards");
        assert.equal(client.isClosed, false, "the socket is still open");
        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server is still listening and still serving");
      });
    },
  },

  // ===== 4. a socket that closes before the session is live =====================
  ...[
    { name: "closed the same tick it opened, one resize sent", when: "immediately after sending", gate: "none", frames: 1 },
    { name: "closed while the workspace config is still loading", when: "before loadWorkspace resolves", gate: "workspace", frames: CEILING + 2 },
    { name: "closed while the folder-trust pre-write runs", when: "before trustCwd resolves", gate: "trust", frames: CEILING + 2 },
    { name: "closed while the PTY is spawning", when: "before the spawn resolves", gate: "spawn", frames: CEILING + 2 },
  ].map((row) => ({
    name: `terminal-ws/46-00-01 a socket that closes before the session is live discards its queue and leaves nothing running — ${row.name}`,
    async run() {
      const repo = await makeRepo();
      const spawner = heldSpawn();
      const workspaceGate = heldAsync({ config: undefined });
      const trustGate = heldAsync(undefined);
      const degrade = recordingDegradeSink();
      try {
        await withServer(
          repo,
          {
            spawn: spawner.spawn,
            which: stubWhich(["claude"]),
            loadWorkspace: row.gate === "workspace" ? workspaceGate.fn : undefined,
            trustCwd: row.gate === "trust" ? trustGate.fn : undefined,
          },
          async ({ wsBase, url }) => {
            // One open-flood-close cycle, closing at exactly the await this row names.
            const cycle = async (index) => {
              const frames = burst(row.frames);
              const client = openTerminal(wsBase, {
                ref: `close-${index}`,
                onOpen: (c) => { for (const frame of frames) sendFrame(c, frame); },
              });
              await client.opened;
              if (row.gate === "workspace") await workspaceGate.waitForCalls(index + 1);
              if (row.gate === "trust") await trustGate.waitForCalls(index + 1);
              if (row.gate === "spawn") await spawner.waitForCalls(index + 1);
              if (row.gate !== "none") await client.barrier();
              // … and then the socket goes away, before any session exists. The
              // beat after the client's own close event is the SERVER's: `ws`
              // emits its `close` once its receiver has finished, which can trail
              // the client's by a tick. Releasing before that would be testing a
              // close the server has not seen yet, which is a different scenario.
              client.close();
              await client.closed;
              await settle(50);
              // When the harness releases the spawn (and whatever else is held).
              workspaceGate.release({ sticky: false });
              trustGate.release({ sticky: false });
              spawner.release({ sticky: false });
              await settle();
              return client;
            };

            const client = await cycle(0);
            // Then not one queued frame is applied after the socket is gone …
            const applied = spawner.sessions.flatMap((record) => io(record));
            assert.deepEqual(applied, [], "zero resize calls and zero write calls after the socket is gone");
            // … and no PTY is left running for that socket: either none was
            // spawned, or the one that was records a kill().
            for (const record of spawner.sessions) {
              assert.equal(killed(record), true, "a PTY spawned for a socket that had already gone is killed, never left running");
            }
            assert.deepEqual(client.framesAfterClose, [], "the client received no frame after its close");
            let response = await fetch(new URL("/api/work/list", url));
            assert.equal(response.status, 200, "the server is still listening and still serving");

            // And repeating that open-flood-close cycle fifty times leaves the
            // recorded resize and write count at zero, no PTY running, and the
            // server still answering 200.
            for (let index = 1; index < 50; index += 1) await cycle(index);
            await settle();
            assert.deepEqual(spawner.sessions.flatMap((record) => io(record)), [], "fifty open-flood-close cycles applied nothing");
            assert.equal(spawner.sessions.every((record) => killed(record)), true, "fifty cycles left no PTY running");
            response = await fetch(new URL("/api/work/list", url));
            assert.equal(response.status, 200, "the server is still listening and still serving after fifty cycles");
          },
        );
      } finally {
        degrade.restore();
        await rm(repo, { recursive: true, force: true });
      }
    },
  })),

  // ===== 5. a session that fails to spawn discards its queue ====================
  ...[
    {
      name: "an unrecognised provider id",
      provider: "not-a-provider",
      which: ["claude"],
      recover: "claude",
      names: /not-a-provider/,
      // NO pre-session window EXISTS on this row, and that is a property of the
      // server rather than a gap in the harness: the unknown-provider rejection is
      // the first thing handleConnection does, before any await, so the error frame
      // and the close are already on the wire before a client could get a frame in.
      // The Given is therefore unestablishable here and the row's load-bearing
      // assertions are the byte-identical message and the non-inheriting second
      // connection — exactly as the feature's own footnote says.
      hold: null,
      fail: null,
    },
    {
      name: "a chosen provider whose binary is absent from PATH",
      provider: "claude",
      which: ["codex"],
      recover: "codex",
      names: /claude CLI not found — install it or pick another provider\./,
      // This row DOES have a window — the config read sits between the provider
      // gate and the PATH gate — so the flood is genuinely established: hold
      // loadWorkspace, flood, prove arrival with the barrier, then release into
      // the failure.
      hold: "workspace",
      fail: null,
    },
    {
      name: "the binary vanishes between the check and the spawn",
      provider: "claude",
      which: ["claude"],
      recover: "claude",
      names: /claude CLI failed to start: the binary vanished\./,
      hold: "spawn",
      fail: "the binary vanished",
    },
  ].map((row) => ({
    name: `terminal-ws/46-00-01 a failed session discards its queue and the error control-frame is unchanged — ${row.name}`,
    async run() {
      // The await this row's failure sits BEHIND, held so the flood is provably
      // pre-session rather than hopefully so.
      const workspaceGate = heldAsync({ config: undefined });
      await withBoundedServer(async ({ wsBase, url, spawner, degrade }) => {
        const frames = burst(CEILING + 2);

        // The FLOODED connection.
        const flooded = openTerminal(wsBase, {
          ref: "flooded",
          provider: row.provider,
          onOpen: (c) => { for (const frame of frames) sendFrame(c, frame); },
        });
        await flooded.opened;
        if (row.hold === "workspace") {
          // The window is open at the config read: wait until the server is inside
          // it, prove the flood arrived (ping/pong), THEN let it run on to fail.
          await workspaceGate.waitForCalls(1);
          await flooded.barrier();
          workspaceGate.release();
        }
        if (row.hold === "spawn") {
          await spawner.waitForCalls(1);
          await flooded.barrier();
          spawner.release({ error: new Error(row.fail) });
        }
        await flooded.closed;

        // THE GIVEN, MADE OBSERVABLE. "A client that floods the pre-session window"
        // is only established if the frames were actually HELD, and the overflow
        // report is the black-box proof of it: CEILING + 2 frames means exactly 2
        // evicted, and an entry naming 2 can only have been written by a queue that
        // held the other CEILING. On the row with no window, there must be NO such
        // entry — nothing was ever queued, and claiming otherwise would be the
        // vacuous Given this assertion exists to prevent.
        const overflow = degrade.withCode(PRESESSION_OVERFLOW_CODE);
        if (row.hold === null) {
          assert.deepEqual(overflow, [], "no pre-session window exists on this row, so nothing was ever queued");
        } else {
          assert.equal(overflow.length, 1, "the flood was genuinely held in the pre-session window");
          assert.equal(Number(/dropped (\d+)/.exec(overflow[0].message)?.[1]), 2, "and the queue was full enough to evict the 2 frames over its ceiling");
        }

        // Then the client receives exactly one {type:"error"} frame and the socket
        // then closes; no {type:"exit"} fakes a finished run.
        const errors = flooded.controls.filter((control) => control.type === "error");
        assert.equal(errors.length, 1, "exactly one error control-frame");
        assert.match(errors[0].message, row.names, "the message names the failure");
        assert.equal(flooded.controls.some((control) => control.type === "exit"), false, "no exit frame fakes a finished run");
        assert.equal(flooded.isClosed, true, "the socket then closes");

        // … byte-identical to the message the same failure produces with NO frames
        // queued.
        const quiet = openTerminal(wsBase, { ref: "quiet", provider: row.provider });
        await quiet.opened;
        await quiet.closed;
        const quietError = quiet.controls.find((control) => control.type === "error");
        assert.ok(quietError, "the same failure with an empty queue still reports");
        assert.equal(errors[0].message, quietError.message, "a queued flood changes nothing about the error message");

        // And no queued frame is applied to anything.
        assert.deepEqual(spawner.sessions.flatMap((record) => io(record)), [], "no stub PTY records a resize or a write for a failed socket");

        // And a second connection opened afterwards, sending nothing before its own
        // session is live, gets a PTY that records only its own later frames.
        spawner.release();
        const after = openTerminal(wsBase, { ref: "after", provider: row.recover });
        await after.opened;
        await waitFor(() => after.output().length >= 1, "the recovered session to become live");
        const session = sessionFor(spawner.sessions, "after");
        assert.deepEqual(io(session), [], "the failed socket's queue is inherited by nobody");
        after.send("y");
        await waitFor(() => io(session).length >= 1, "the new session's own frame");
        await settle();
        assert.deepEqual(io(session).map(normalise), [{ method: "write", text: "y" }], "only its own later frames");

        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server is still listening and still serving");
      }, {
        which: stubWhich(row.which),
        serverOptions: row.hold === "workspace" ? { loadWorkspace: workspaceGate.fn } : {},
      });
    },
  })),

  // ===== 6. the ceiling is a property of the pre-session window only ============
  {
    name: "terminal-ws/46-00-01 the ceiling applies only to the pre-session window — once live, nothing is queued and nothing is dropped",
    async run() {
      await withBoundedServer(async ({ wsBase, url, spawner, degrade }) => {
        // A session whose spawn has been released and whose queue has drained.
        spawner.release();
        const client = openTerminal(wsBase, { ref: "live" });
        await client.opened;
        await waitFor(() => client.output().length >= 1, "the session to become live");
        const session = sessionFor(spawner.sessions, "live");
        assert.deepEqual(io(session), [], "the session starts with an empty drain");

        // When the client sends ten times the ceiling in frames, one at a time,
        // the last of them a resize to 137×43.
        const frames = burst(CEILING * 10, { cols: 137, rows: 43 });
        for (const frame of frames) {
          sendFrame(client, frame);
          await new Promise((resolve) => setImmediate(resolve));
        }
        await waitFor(() => io(session).length >= frames.length, "every live frame to reach the PTY");
        await settle();

        // Then the stub PTY records every one of them, in order — none dropped.
        assert.deepEqual(io(session).map(normalise), frames.map(expectedCall), "a live session drops nothing");
        assert.equal(io(session).length, CEILING * 10, "ten times the ceiling, all of it applied");
        // And the degrade sink holds no overflow entry for that session.
        assert.deepEqual(degrade.withCode(PRESESSION_OVERFLOW_CODE), [], "the pre-session ceiling never fires on live traffic");
        // And the PTY's final geometry is 137 × 43.
        assert.deepEqual(io(session).at(-1), { method: "resize", cols: 137, rows: 43 }, "the last frame is the geometry the PTY ends at");
        const response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "the server is still listening and still serving");
      });
    },
  },

  // ===== review-driven, NOT a contract scenario ================================
  // Raised at QA review: the gate's already-closed `onClose` branch is UNREACHABLE
  // through the socket — handleConnection has no `await` between its post-spawn
  // `gate.closed` check and `wireSession`'s `gate.onClose(...)`, so `closed` cannot
  // flip in the gap, and mutating the branch away leaves every other case green.
  // The branch is kept as defence for a future `await` landing in that window
  // (production comment retargeted to say exactly that), so it is driven DIRECTLY
  // here rather than left as a surviving mutant. White-box on purpose: this is the
  // one place where driving through the real socket cannot reach the code.
  {
    name: "terminal-ws/46-00 (review-driven, not a contract scenario) a teardown hook registered AFTER close has fired runs immediately, not never",
    run() {
      // A stand-in socket: the gate only ever calls `ws.on`.
      const socket = new EventEmitter();
      const gate = createConnectionGate(socket);
      const ran = [];

      // Before the close, a hook is HELD — it belongs to the close that is coming.
      gate.onClose(() => ran.push("registered-before"));
      assert.deepEqual(ran, [], "a hook registered while the socket is open does not run yet");
      assert.equal(gate.closed, false, "the gate does not report a close that has not happened");

      socket.emit("close");
      assert.equal(gate.closed, true, "the close is recorded");
      assert.deepEqual(ran, ["registered-before"], "the held hook runs on close");

      // AFTER the close: a listener attached to an event that already fired never
      // runs — that is this story's whole root cause. The gate runs it instead.
      gate.onClose(() => ran.push("registered-after"));
      assert.deepEqual(ran, ["registered-before", "registered-after"], "a hook registered after close has fired runs immediately");

      // And a hook that throws does not take the connection down with it.
      gate.onClose(() => { throw new Error("teardown blew up"); });
      gate.onClose(() => ran.push("after-a-throwing-hook"));
      assert.deepEqual(ran, ["registered-before", "registered-after", "after-a-throwing-hook"], "a throwing teardown hook is contained, not propagated");
    },
  },

  // ===== review-driven, NOT a contract scenario ================================
  // Raised at architect review of this story, and it is the same sentence as the
  // defect ADR-008 fixes: a receiver fault (invalid UTF-8 in a text frame, a bad
  // opcode, RSV bits, an unmasked frame, an over-size payload) is emitted as an
  // `error` on the connection, and an `error` event with NO LISTENER is an uncaught
  // exception. Measured before the fix: one malformed frame exits the process and
  // takes the board's HTTP API with it. Pinned here rather than in a task feature
  // because no scenario in either feature covers it — it is evidence for a fix the
  // contract did not ask for, deliberately labelled so a reader is not misled into
  // treating it as an acceptance criterion.
  {
    name: "terminal-ws/46-00 (review-driven, not a contract scenario) a malformed frame is a coded degrade, never a dead server",
    async run() {
      await withBoundedServer(async ({ wsBase, url, spawner, degrade }) => {
        spawner.release();
        const client = openTerminal(wsBase, { ref: "malformed" });
        await client.opened;
        await waitFor(() => client.output().length >= 1, "the session to become live");

        // A TEXT frame (opcode 0x1) carrying bytes that are not valid UTF-8 — the
        // receiver rejects it before any handler of ours is reached.
        client.send(Buffer.from([0xc3, 0x28]), { binary: false });
        await client.closed;
        await settle();

        // Then the server survived it …
        let response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "one malformed frame does not take the board's HTTP API down");
        // … the fault was reported under its own code, not swallowed …
        const reported = degrade.withCode(SOCKET_ERROR_CODE);
        assert.ok(reported.length >= 1, "the receiver fault is a coded degrade event");
        assert.notEqual(SOCKET_ERROR_CODE, PRESESSION_OVERFLOW_CODE, "a malformed frame and a flooded queue are never the same line");
        // … the PTY behind the broken socket was not left running …
        const session = sessionFor(spawner.sessions, "malformed");
        assert.equal(killed(session), true, "the socket's PTY is killed when the socket dies of a protocol fault");
        // … and the very next session is served exactly as before.
        const next = openTerminal(wsBase, { ref: "after-malformed" });
        await next.opened;
        await waitFor(() => next.output().length >= 1, "the next session to become live");
        const nextSession = sessionFor(spawner.sessions, "after-malformed");
        next.send("k");
        await waitFor(() => io(nextSession).length >= 1, "the next session's own frame");
        await settle();
        assert.deepEqual(io(nextSession).map(normalise), [{ method: "write", text: "k" }], "the next session is served exactly as before");
        response = await fetch(new URL("/api/work/list", url));
        assert.equal(response.status, 200, "and the server is still listening");
      });
    },
  },
];
