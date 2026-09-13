// Harness for milestone 46 / story 00 (ADR-008) — the pre-session frame queue.
//
// It is the EXISTING channel `test/session/terminal-ws.test.mjs` already drives (the REAL
// upgrade through serveSetupUi, with an injected spawn and an injected PATH
// lookup), plus the two additions both task features name as their feasibility
// requirement:
//
//   (1) a stub PTY that RECORDS every resize(cols, rows) / write(bytes) / kill()
//       in call order — the existing stub discards them;
//   (2) a spawn the scenario RELEASES on demand, so "before the session exists"
//       is a window the test OWNS rather than a race it hopes for. Without it the
//       scenarios would depend on loadWorkspace's real file I/O being slower than
//       a loopback round-trip, which is true today and is not a contract.
//
// THE ARRIVAL BARRIER is the third piece and it is what makes these tests
// non-vacuous. A frame the client merely *sent* proves nothing: if it arrived
// after the drain it would be served live and the assertions would pass on the
// broken server too. `client.barrier()` sends a WebSocket PING and waits for the
// PONG — `ws` answers pings automatically and processes received frames in order,
// so a pong is proof that every data frame sent before it has already been
// dispatched as a server-side `message` event. With the spawn still held at that
// point, the frames are provably pre-session.
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";
import { serveSetupUi } from "../../src/setup-ui.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";

export const GREETING = "ready\r\n";

// --- fixtures ----------------------------------------------------------------

// The same minimal repo test/session/terminal-ws.test.mjs builds: a workspace config and
// one item, enough for loadWorkspace and GET /api/work/list.
export async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-termq-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8",
  );
  const storyDir = path.join(workDir, "46_milestone_terminal", "stories", "00_story_queue");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(
    path.join(workDir, "46_milestone_terminal", "SPEC.md"),
    "---\ntype: milestone\nnumber: \"46\"\nslug: terminal\nstatus: in-progress\ntitle: \"Terminal\"\ncreated: 2026-08-08\nupdated: 2026-08-08\n---\n# 46\n",
    "utf8",
  );
  await writeFile(
    path.join(storyDir, "STORY.md"),
    "---\ntype: story\nnumber: \"00\"\nslug: queue\nstatus: in-progress\ntitle: \"Queue\"\nparent: 46\ncreated: 2026-08-08\nupdated: 2026-08-08\n---\n# 00\n",
    "utf8",
  );
  return repo;
}

// Only the named binaries resolve; everything else is absent.
export function stubWhich(presentBins) {
  const present = new Set(presentBins);
  return (bin) => (present.has(bin) ? `/fake/bin/${bin}` : null);
}

// --- the recording stub PTY ---------------------------------------------------

function makeStubPty(record, greeting) {
  let exitHandler = null;
  return {
    pid: 4242,
    onData(handler) {
      // One chunk, on the next microtask: the client's first received raw frame
      // is therefore proof that this session is wired and live.
      if (greeting !== null) queueMicrotask(() => handler(greeting));
      return { dispose() { record.disposed = true; } };
    },
    onExit(handler) {
      exitHandler = handler;
      return { dispose() {} };
    },
    write(data) { record.calls.push({ method: "write", data }); },
    resize(cols, rows) { record.calls.push({ method: "resize", cols, rows }); },
    kill() { record.calls.push({ method: "kill" }); },
    // test-only: drive the PTY's own exit through the frozen envelope.
    emitExit(exitCode) { exitHandler?.({ exitCode }); },
  };
}

// heldSpawn() — an injected spawn whose every call HANGS until the scenario
// releases it, so the pre-session window is the scenario's to control.
//
//   spawn      : pass as serveSetupUi's `spawn`
//   sessions   : one record per spawn CALL, in call order:
//                { bin, args, options, calls: [...], pty }
//   release()  : settle every pending call (and, by default, every later one)
//   release({ error }) : settle them by THROWING — the "binary vanished between
//                the check and the spawn" path.
export function heldSpawn({ greeting = GREETING } = {}) {
  const sessions = [];
  const pending = [];
  let auto = null;

  const spawn = (bin, args, options) => {
    const record = { bin, args, options, calls: [], disposed: false };
    record.pty = makeStubPty(record, greeting);
    sessions.push(record);
    if (auto?.error) return Promise.reject(auto.error);
    if (auto?.ok) return Promise.resolve(record.pty);
    return new Promise((resolve, reject) => pending.push({ record, resolve, reject }));
  };

  return {
    spawn,
    sessions,
    release({ error = null, sticky = true } = {}) {
      if (sticky) auto = error ? { error } : { ok: true };
      for (const call of pending.splice(0)) {
        if (error) call.reject(error);
        else call.resolve(call.record.pty);
      }
    },
    // Wait until the server has actually reached `spawn` n times.
    waitForCalls(n, options) {
      return waitFor(() => sessions.length >= n, `${n} spawn call(s)`, options);
    },
  };
}

// heldAsync(result) — the same held-window shape for the two awaits BEFORE the
// spawn (`loadWorkspace`, `trustCwd`), so "the socket closed while the workspace
// config was still loading" is an exact window rather than a hopeful one.
export function heldAsync(result) {
  const pending = [];
  let calls = 0;
  let released = false;
  const fn = () => {
    calls += 1;
    if (released) return Promise.resolve(result);
    return new Promise((resolve) => pending.push(resolve));
  };
  return {
    fn,
    get calls() { return calls; },
    waitForCalls(n, options) {
      return waitFor(() => calls >= n, `${n} call(s) into the held await`, options);
    },
    // `sticky: false` settles only what is pending and re-arms the hold for the
    // NEXT connection — what the repeat-fifty-times litmus needs.
    release({ sticky = true } = {}) {
      if (sticky) released = true;
      for (const resolve of pending.splice(0)) resolve(result);
    },
  };
}

// --- server + client ----------------------------------------------------------

// Every client this harness opens, so a scenario that leaves one open does not
// wedge `server.close()` (which waits for live connections).
const liveClients = new Set();

export async function withServer(repo, serverOptions, body) {
  const { url, server } = await serveSetupUi(null, { projectDir: repo, port: 0, ...serverOptions });
  const wsBase = `ws://127.0.0.1:${server.address().port}`;
  try {
    return await body({ url, wsBase, server });
  } finally {
    for (const client of [...liveClients]) client.close();
    liveClients.clear();
    await new Promise((resolve) => setTimeout(resolve, 10));
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

// A real `ws` client. `onOpen` runs SYNCHRONOUSLY inside the open event — the
// same tick, exactly as TerminalDock's `socket.onopen = () => sendResize()`.
export function openTerminal(wsBase, { ref = "46/00", provider = "claude", onOpen } = {}) {
  const params = new URLSearchParams({ ref, provider });
  const ws = new WebSocket(`${wsBase}/ws/terminal?${params.toString()}`);
  const frames = [];
  const controls = [];
  const framesAfterClose = [];
  const sendErrors = [];
  let isClosed = false;
  let sent = 0;

  const client = {
    ws,
    ref,
    frames,
    controls,
    framesAfterClose,
    sendErrors,
    get sent() { return sent; },
    get isClosed() { return isClosed; },
    // Raw output frames only (everything the server sent that is not a control frame).
    output() { return frames.filter((f) => !f.control); },
    send(payload, { binary = false } = {}) {
      sent += 1;
      try {
        ws.send(payload, { binary });
      } catch (error) {
        // A socket the SERVER already closed (the error-frame paths): recorded,
        // never thrown, so the scenario can still assert on what it received.
        sendErrors.push(error);
      }
    },
    sendJson(value) { client.send(JSON.stringify(value)); },
    sendResize(cols, rows) { client.sendJson({ type: "resize", cols, rows }); },
    close() { try { ws.close(); } catch (error) { sendErrors.push(error); } },
    // The arrival barrier — see this file's header.
    barrier({ timeoutMs = 10000 } = {}) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("the pre-session arrival barrier timed out")), timeoutMs);
        ws.once("pong", () => { clearTimeout(timer); resolve(); });
        try {
          ws.ping();
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    },
  };

  ws.on("message", (data, isBinary) => {
    const text = isBinary ? null : data.toString();
    let control = null;
    if (text && text.startsWith("{")) {
      try { control = JSON.parse(text); } catch (error) { sendErrors.push(error); }
    }
    const frame = { text, data, isBinary, control };
    frames.push(frame);
    if (control) controls.push(control);
    if (isClosed) framesAfterClose.push(frame);
  });

  client.opened = new Promise((resolve, reject) => {
    ws.on("open", () => {
      onOpen?.(client);
      resolve();
    });
    ws.on("error", (error) => reject(error));
  });
  liveClients.add(client);
  client.closed = new Promise((resolve) => {
    ws.on("close", () => { isClosed = true; liveClients.delete(client); resolve(); });
  });
  // A client-side socket error (a server that closed under a send) must not
  // become an unhandled 'error' event.
  ws.on("error", (error) => sendErrors.push(error));

  return client;
}

// --- assertions' raw material -------------------------------------------------

// The PTY calls a scenario reasons about: resize + write, in call order. `kill()`
// is excluded here and asserted explicitly where a scenario is about teardown.
export function io(record) {
  return (record?.calls ?? []).filter((call) => call.method !== "kill");
}

export function killed(record) {
  return (record?.calls ?? []).some((call) => call.method === "kill");
}

// The session record a given connection produced — matched on the ref the server
// bakes into AOF_TERMINAL_SESSION, so two sockets opened in the same tick are
// never confused for one another.
export function sessionFor(sessions, ref) {
  return sessions.find((record) => String(record.options?.env?.AOF_TERMINAL_SESSION ?? "").startsWith(`${ref}:`));
}

export function writeText(call) {
  const { data } = call;
  if (typeof data === "string") return data;
  return Buffer.from(data).toString();
}

export function callBytes(call) {
  if (call.method !== "write") return 0;
  const { data } = call;
  return typeof data === "string" ? Buffer.byteLength(data) : Buffer.from(data).length;
}

// --- timing -------------------------------------------------------------------

export async function waitFor(predicate, message, { timeoutMs = 15000, stepMs = 5 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}

// A deliberate beat, used to catch what must NOT happen (a second delivery, a
// replayed tape) rather than what must.
export function settle(ms = 40) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- the degrade sink ----------------------------------------------------------

// A recording sink through degrade.mjs's own test seam. setDegradeSinkForTest
// also clears the per-code throttle, so each scenario's entry count is its own.
export function recordingDegradeSink() {
  const entries = [];
  setDegradeSinkForTest(() => ({ write: (entry) => entries.push(entry) }));
  return {
    entries,
    withCode(code) { return entries.filter((entry) => entry.code === code); },
    restore() { setDegradeSinkForTest(undefined); },
  };
}
