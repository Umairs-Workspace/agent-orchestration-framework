// Adapted from elirantutia/vibeyard (MIT) — the node-pty lifecycle
// (pty.spawn options + onData/onExit/write/resize/kill, win32-guarded) and the
// CliProvider seam, re-homed off vibeyard's Electron IPC carrier onto `ws@8` at
// /ws/terminal. vibeyard is MIT-licensed; see the repo NOTICE file. ADR-001 (one
// http.createServer; the terminal WS only at /ws/terminal via `ws` noServer +
// server.on('upgrade')) and ADR-003 (the frozen wire envelope; a missing provider
// → an {type:'error'} control-frame, NEVER a crash).
//
// The wire envelope (frozen, ADR-003):
//   - PTY bytes  : raw WS frames both directions (client→server → pty.write;
//                  server→client → ws.send(data)).
//   - control    : client→server JSON { type:'resize', cols, rows } → pty.resize;
//                  server→client JSON { type:'exit', exitCode }     (clean/failed exit)
//                  server→client JSON { type:'error', message }     (spawn failure).
import { createRequire } from "node:module";
import { WebSocketServer } from "ws";
import { loadWorkspace } from "./work.mjs";
// The SAME folder-trust pre-write the mesh worker's spawn uses (a leaf module, so this
// never reaches back into mesh-worker-execution.mjs — which imports THIS file).
import { ensureWorktreeTrusted } from "./claude-trust.mjs";
import { resolveProvider, PROVIDER_IDS } from "./terminal-providers.mjs";
import { registerSession, unregisterSession } from "./terminal-sessions.mjs";
import { resolveHeadroomLaunch } from "./headroom.mjs";
// milestone 28 / story 00 (ADR-002): the SEA sentinel this module's node-pty
// re-home branches on — the SAME sentinel src/asset-base.mjs's assetBase()
// keys on, so a test flips ONE seam and both the asset base AND the node-pty
// loader branch move in lock-step.
import { isPackaged } from "./asset-base.mjs";
// m42 item 3 — every former silent catch reports a coded degrade event.
import { reportDegrade } from "./degrade.mjs";

// The single terminal pathname (ADR-001). Any other upgrade pathname is destroyed.
const TERMINAL_PATH = "/ws/terminal";

// milestone 46 / story 00 (ADR-008) — THE PRE-SESSION QUEUE'S PUBLISHED BOUNDS.
//
// The route accepts the upgrade long before a PTY exists: loadWorkspace, the
// folder-trust pre-write and the spawn itself all sit between `connection` and a
// live session, and the browser sends its fit in the same tick `onopen` fires.
// Frames that arrive in that window are HELD here and drained, in arrival order,
// the moment the session is wired — the route accepted them, so the route must
// not throw them on the floor.
//
// BOUNDED IN BOTH DIMENSIONS, because a frame COUNT alone does not bound memory:
// the WebSocketServer below is constructed with `{ noServer: true }` and no
// `maxPayload`, so ONE pre-session frame may be as large as `ws`'s own default
// permits and eight of those is eight times that. Over either bound the OLDEST
// frames are evicted, never the newest — the newest resize is the true one. A
// single frame larger than the whole byte bound is unholdable and is dropped
// outright; an exception for the one frame that cannot be held would be no bound
// at all.
//
// RETAINED vs TRANSIENT, said out loud so the number is not read as more than it
// is. This bounds what the server HOLDS across the pre-session window. The
// per-connection TRANSIENT is still `ws`'s own default — `maxPayload: 100 * 1024 *
// 1024` — because one frame is assembled in the receiver before this code ever
// sees it. Task 01's "one frame larger than the whole bound" row rides an 8 MiB
// frame through exactly that gap: it is received, measured, refused and reported,
// and never retained.
//
// WHY `maxPayload` IS NOT SET, and this is load-bearing rather than taste.
// MEASURED (architect review, 2026-08-08): a `WebSocketServer({ maxPayload: 64 })`
// whose connection registers only `message`/`close` — this gate's exact shape —
// dies with `WS_ERR_UNSUPPORTED_MESSAGE_LENGTH` as an UNCAUGHT EXCEPTION. A
// transport-level ceiling would therefore have turned that 8 MiB row from a
// reported drop into a killed board server, and the operator's honest degrade
// (the coded overflow entry below) would never have been written at all: the
// contract-level check must fire BEFORE the protocol layer's own limit. Now that
// the connection registers an `error` listener (see createConnectionGate),
// `maxPayload` IS genuinely available as a bound on the transient — a deliberate
// follow-on decision with its own evidence, not a tidy-up to fold into this one.
//
// The ceiling is a named constant in the same spirit as the input lane's
// MAX_TERMINAL_INPUT_BYTES (mesh-ui-serve.mjs), and is EXPORTED because a bound
// nobody can read is a bound nobody can test.
export const MAX_PRESESSION_FRAMES = 64;
export const MAX_PRESESSION_BYTES = 1024 * 1024;

// The overflow's OWN degrade code — deliberately NOT the module's generic
// "terminal-ws". reportDegrade throttles per CODE for 5 seconds, so an overflow
// sharing the generic code could be swallowed whole by an unrelated guarded catch
// in the same window: the exact silence ADR-008 exists to forbid.
export const PRESESSION_OVERFLOW_CODE = "terminal-ws-presession-overflow";

// A RECEIVER fault on the socket itself gets its own code for the same reason: it
// is a different event with a different cause, and a 5-second throttle shared with
// the module's generic guarded catches would hide whichever arrived second.
export const SOCKET_ERROR_CODE = "terminal-ws-socket-error";

// The node-pty LOADER — separated from defaultSpawn so an @executable test can
// inject a stub loader (resolves / throws) and assert WHICH branch ran, with no
// built binary and no real node-pty (the Build-notes developer-seat guidance).
// Real behaviour, exactly as before the split:
//   - SEA (isPackaged() true): createRequire(process.execPath)("node-pty") —
//     a filesystem require resolved against the on-disk sidecar the build
//     recipe ships beside the binary (a raw `await import("node-pty")` THROWS
//     for an FS module inside a SEA main — RESEARCH §1/§2).
//   - dev (isPackaged() false): the EXISTING `await import("node-pty")`,
//     byte-for-byte unchanged.
// Exported (F12 craft-review) so an @executable test can drive the REAL
// branch-selection logic directly — flipping isPackaged() via
// setSeaSentinelForTest and observing WHICH mechanism was actually attempted
// (its distinct failure/success signature in a dev environment), rather than
// only asserting on the source text. This does not change production
// behaviour: defaultSpawn (below) still calls this exact function.
export function loadNodePty() {
  return isPackaged() ? createRequire(process.execPath)("node-pty") : import("node-pty");
}

// The default PTY spawner: loads node-pty INSIDE the call (via the injectable
// ptyLoader) so that importing this module never requires the native addon at
// load time (CI tests inject a stub spawn; only a real session touches
// node-pty). Returns the node-pty process handle.
//
// The load stays INSIDE this function, never hoisted to a top-level import
// (fitness #3 — a missing/unloadable sidecar must never crash startup;
// importing terminal-ws.mjs must never need the addon).
async function defaultSpawn(bin, args, options) {
  const pty = await loadNodePty();
  return pty.spawn(bin, args, options);
}

// A defaultSpawn FACTORY, parameterised on the ptyLoader — the injectable seam
// an @executable test uses to model "sidecar resolves" / "ENOENT" / "throws on
// require" / "wrong-arch dlopen failure" / "missing Windows companion" without
// a built binary and without a real node-pty (mirrors the isPackaged/
// setSeaSentinelForTest injection shape in src/asset-base.mjs). The real
// defaultSpawn above is EXACTLY createTerminalSpawn(loadNodePty)'s behaviour —
// this factory does not change the production default, it only exposes the
// same shape for a test-supplied loader.
export function createTerminalSpawn(ptyLoader) {
  return async function spawnWithLoader(bin, args, options) {
    const pty = await ptyLoader();
    return pty.spawn(bin, args, options);
  };
}

// Attach the terminal WebSocket to an existing http.Server (ADR-001: the SAME
// server serveSetupUi returns — no second server, no second port). The `spawn`
// option is injected for testability; it defaults to the real node-pty spawner.
//
//   attachTerminalWebSocket(server, { projectDir, spawn })
//
// On upgrade: route by pathname; only /ws/terminal handshakes, everything else is
// socket.destroy()'d (the `ws` default branch — the only "auth" a 127.0.0.1
// single-user server needs).
export function attachTerminalWebSocket(server, options = {}) {
  const projectDir = options.projectDir ?? process.cwd();
  const spawn = options.spawn ?? defaultSpawn;
  const baseEnv = options.env ?? process.env;
  // Injectable PATH lookup (default: real PATH). Tests pass a stub that reports a
  // provider's binary present/absent so the @executable scenarios drive the
  // missing-binary error path with no real PATH and no real PTY.
  const which = options.which;
  // Persist running sessions to .aof/terminal-sessions.json? Default OFF so the
  // test suite's serveSetupUi servers never touch .aof (no temp-dir teardown
  // race); the real `aof work ui` (serveBoard) turns it ON.
  const recordSessions = options.recordSessions ?? false;
  // trustCwd(cwd) — the claude folder-trust pre-write. DEFAULT NO-OP on purpose: the
  // real writer touches the operator's own ~/.claude.json, and a test that stands up
  // this server and opens a terminal would write real entries for its temp fixture
  // dirs. So the real one is wired ONLY at the production call site (board-serve.mjs's
  // serveBoard — the same "literal key at the production call site" discipline the mesh
  // launcher uses for its own trustWorktree seam). No test run can touch that file by
  // construction, rather than by every fixture remembering to stub it.
  const trustCwd = options.trustCwd ?? (() => {});
  // The workspace-config reader — a PURE TIMING SEAM, and a lesser thing than the
  // three injections above it. `spawn`, `which` and `trustCwd` protect PRODUCTION
  // STATE: they exist so a test run can never load node-pty, never walk the real
  // PATH and never write the operator's own ~/.claude.json. This one protects
  // nothing; it only lets a scenario OWN the pre-session window at the config read
  // (ADR-008's window is the thing under test) instead of racing real file I/O
  // against a loopback round-trip. That is a weaker warrant, it is stated as such
  // so it is not cited to justify a fourth and a fifth, and it is unreachable from
  // the production board launcher — serveBoard does not forward it. Production
  // passes nothing and gets the real loader, byte-for-byte as before.
  const readWorkspace = options.loadWorkspace ?? loadWorkspace;

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    let pathname;
    try {
      pathname = new URL(request.url ?? "/", "ws://127.0.0.1").pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== TERMINAL_PATH) {
      // Unknown upgrade pathname: reject (the ws pattern's default branch).
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws, request) => {
    // ADR-008 — the listeners go on HERE, at connection time, BEFORE the first
    // await. A listener registered after the async gap misses the event that
    // already fired: that is why an on-open resize used to land on the floor, and
    // (the identical root cause) why a PTY used to outlive a socket that closed
    // while it was still spawning.
    const gate = createConnectionGate(ws);
    handleConnection(ws, request, { projectDir, spawn, baseEnv, which, recordSessions, trustCwd, readWorkspace, gate }).catch((error) => {
      // A defensive backstop: even an unexpected error in connection setup must
      // surface as the dock error state, never an unguarded throw (ADR-003).
      gate.discard();
      sendControl(ws, { type: "error", message: error?.message ?? "terminal session failed" });
      safeClose(ws);
    });
  });

  return wss;
}

// The per-CONNECTION gate (ADR-008), created inside `wss.on("connection")` before
// the first await. It owns the three events that were registered too late, or not
// at all:
//
//   message : delivered live once the session is wired; until then held in a
//             BOUNDED queue and drained IN ORDER through the SAME handler that
//             serves live frames — the queue changes timing, never semantics.
//   close   : RECORDED, so that `gate.closed` can be read after every await in
//             handleConnection. That readback — not the hook list — is what stops
//             a PTY outliving its socket today; see the explicit `term.kill()`
//             after the spawn.
//   error   : a receiver fault is loud instead of fatal (below).
//
// Per CONNECTION, never per server: one shared queue would deliver one pane's
// geometry to another pane — worse than the defect being fixed, and exactly the
// shape a grid of N panes opens N of at once.
//
// EXPORTED for the same reason `loadNodePty` and `createTerminalSpawn` are: so an
// @executable test can drive this logic DIRECTLY where driving it through the
// socket is impossible (the already-closed `onClose` branch below). Production
// still constructs it in exactly one place, `wss.on("connection")`.
export function createConnectionGate(ws) {
  const queue = [];
  let queuedBytes = 0;
  let dropped = 0;
  let deliver = null;
  let closed = false;
  let abandoned = false;
  const closeHooks = [];

  const runHook = (hook) => {
    try {
      hook();
    } catch (error) {
      // a teardown hook must never throw back into the connection
      reportDegrade("terminal-ws", error);
    }
  };

  const forget = () => {
    queue.length = 0;
    queuedBytes = 0;
  };

  // ONE coded entry per burst, carrying the COUNT — a reader can act on
  // "dropped 37", never on a bare "dropped". Emitted when the pre-session window
  // closes (drained, discarded or closed), never once per dropped frame.
  const reportOverflow = () => {
    if (dropped === 0) return;
    const count = dropped;
    dropped = 0;
    reportDegrade(
      PRESESSION_OVERFLOW_CODE,
      `dropped ${count} pre-session terminal frame(s) over the pre-session ceiling (${MAX_PRESESSION_FRAMES} frames / ${MAX_PRESESSION_BYTES} bytes)`,
    );
  };

  ws.on("message", (data, isBinary) => {
    if (deliver) {
      // Live: the queue is out of the way, not a staging buffer every later
      // frame is copied through.
      deliver(data, isBinary);
      return;
    }
    if (closed || abandoned) return;
    const size = frameByteLength(data);
    if (size > MAX_PRESESSION_BYTES) {
      dropped += 1;
      return;
    }
    queue.push({ data, isBinary, size });
    queuedBytes += size;
    while (queue.length > MAX_PRESESSION_FRAMES || queuedBytes > MAX_PRESESSION_BYTES) {
      queuedBytes -= queue.shift().size;
      dropped += 1;
    }
  });

  // A RECEIVER fault — invalid UTF-8 in a text frame, a bad opcode, RSV bits set,
  // an unmasked client frame, an over-size payload — is emitted as an `error` on
  // THIS socket, and an `error` event with no listener is an uncaught exception:
  // MEASURED, one malformed frame exits the process and takes the board's HTTP API
  // down with it (`WS_ERR_INVALID_UTF8`). That is the same sentence as the defect
  // this gate exists to fix — the listener that would have handled it isn't there —
  // so it is registered in the same place, at connection time, beside the other
  // two. `ws` closes the socket itself afterwards, so teardown is the close path's
  // above; this only has to make the fault LOUD instead of fatal.
  ws.on("error", (error) => {
    reportDegrade(SOCKET_ERROR_CODE, error);
  });

  ws.on("close", () => {
    closed = true;
    deliver = null;
    forget();
    reportOverflow();
    for (const hook of closeHooks.splice(0)) runHook(hook);
  });

  return {
    get closed() {
      return closed;
    },
    // Register teardown for this connection.
    //
    // THE IMMEDIATE-RUN BRANCH IS DEFENCE, NOT THE FIX, and saying so is the point
    // of this comment: what actually discharges the orphaned PTY today is the
    // explicit `term.kill()` handleConnection runs when it finds `gate.closed`
    // true after the spawn. Between that check and this call there is no `await` —
    // only a console.log, a void-ed registerSession and wireSession's synchronous
    // body — so `closed` cannot flip in the gap, and this branch is UNREACHABLE
    // from production as the file stands (measured: mutating it away leaves the
    // whole suite green, which is why it carries its own direct case instead).
    //
    // It is kept because it stops being unreachable the moment anyone inserts an
    // `await` before wireSession, which is a plausible edit — and a reader who
    // believed this branch was the fix would be free to delete the kill that is
    // really doing the work. It is not; do not delete the kill.
    onClose(hook) {
      if (closed) {
        runHook(hook);
        return;
      }
      closeHooks.push(hook);
    },
    // The session is live: replay the arrival sequence (it is NOT compacted into
    // "the last one wins"), then step aside so later frames take the ordinary path.
    open(handler) {
      reportOverflow();
      if (closed || abandoned) return;
      const pending = queue.splice(0);
      queuedBytes = 0;
      // Drained BEFORE `deliver` is set, and the drain is synchronous, so nothing
      // is delivered twice and nothing overtakes what arrived before it.
      for (const frame of pending) handler(frame.data, frame.isBinary);
      deliver = handler;
    },
    // The session will never exist (unknown provider / missing binary / failed
    // spawn / a socket that went away): the queue dies with it, retained by
    // nobody and inherited by nobody.
    discard() {
      abandoned = true;
      deliver = null;
      forget();
      reportOverflow();
    },
  };
}

// The wire size of one received frame — the bound is in BYTES as well as frames,
// so it must be measured on every shape `ws` can hand a message listener. Under
// the default `binaryType: "nodebuffer"` those are Buffer / Buffer[] / ArrayBuffer
// / string, all covered above the fallback. The FALLBACK is not decoration: a
// shape this function does not recognise must not measure ZERO, because a frame
// that weighs nothing is a frame the byte bound cannot refuse — an unknown shape
// would be a hole in the bound rather than a rounding error in it.
function frameByteLength(data) {
  if (typeof data === "string") return Buffer.byteLength(data);
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (Array.isArray(data)) return data.reduce((total, chunk) => total + frameByteLength(chunk), 0);
  return Buffer.byteLength(String(data));
}

// Read the thin launch contract (ref + provider) off the upgrade URL, resolve the
// item dir + provider, and either spawn the session or emit the error
// control-frame. Never throws in a way that crashes the process.
async function handleConnection(ws, request, { projectDir, spawn, baseEnv, which, recordSessions, trustCwd, readWorkspace, gate }) {
  const params = parseQuery(request.url);
  const ref = (params.get("ref") ?? "").trim();
  const providerId = (params.get("provider") ?? "").trim();

  if (!PROVIDER_IDS.includes(providerId)) {
    // The error paths are UNCHANGED (ADR-008): the same frame, the same wording,
    // the same close — the queue simply dies with the session that never was.
    gate.discard();
    sendControl(ws, { type: "error", message: `Unknown provider "${providerId || "(none)"}".` });
    safeClose(ws);
    return;
  }

  const provider = resolveProvider(providerId, which);
  if (!provider) {
    gate.discard();
    sendControl(ws, { type: "error", message: `Unknown provider "${providerId}".` });
    safeClose(ws);
    return;
  }

  // The PTY cwd is the PROJECT ROOT — never the item's own wiki/work folder
  // (2026-07-26). An agent asked to build an item works on the REPO: source, tests,
  // config all live above the work folder, and a session rooted inside
  // `wiki/work/<NN>_<type>_<slug>/` starts every run outside the code it is there to
  // change. It also made claude's one-time folder-TRUST dialog unavoidable — trust is
  // keyed on the exact absolute cwd, so a per-item cwd is a NEW untrusted folder for
  // every item, forever (the mesh worker path has never had this problem: it spawns at
  // the worktree ROOT). The ref still reaches the agent as the typed slash-command.
  //
  // The workspace config is still resolved here for the headroom resolver (ADR-003):
  // it is left undefined on the catch path, so a config resolution failure is treated
  // as plugin-off and never breaks the terminal.
  const cwd = projectDir;
  let headroomConfig = undefined;
  try {
    const workspace = await readWorkspace(projectDir);
    headroomConfig = workspace.config;
  } catch (error) {
    // Non-fatal (the session still spawns, headroom off) but NOT silent — a config
    // that won't load silently changes how the agent is launched.
    console.error(`terminal: workspace config did not load for ${projectDir}, headroom disabled: ${error?.message ?? error}`);
  }
  // The socket went away while the config was loading: nobody is holding this
  // session. Stop BEFORE the folder-trust pre-write and the spawn, rather than
  // building a PTY for a client that is already gone (ADR-008 — the same
  // registered-too-late root cause as the dropped frame).
  if (gate.closed) {
    gate.discard();
    return;
  }
  // Pre-clear claude's one-time folder-trust dialog for THIS cwd — the SAME seam the
  // mesh worker's spawn already uses, never a second trust-writing rule. INJECTED
  // (`trustCwd`) for the same reason the launcher injects it: the real one writes the
  // operator's actual ~/.claude.json, which no test run may ever touch — the test
  // fixture passes a no-op. Best-effort: a fault here must never block the spawn.
  try {
    await trustCwd(cwd);
  } catch (error) {
    // NOT SILENT. Best-effort means "does not take the terminal down", never "fails
    // invisibly": if this throws, the very next thing the operator sees is claude's
    // blocking trust dialog with no explanation of why it came back. Reported on the
    // board server's stdout, beside the spawn line below.
    console.error(`terminal: folder-trust pre-write failed for cwd=${cwd}: ${error?.message ?? error}`);
  }
  // Same again after the trust pre-write's await: no spawn for a dead socket.
  if (gate.closed) {
    gate.discard();
    return;
  }

  // Resolve the binary path ONCE and reuse it for both the honest-degrade gate
  // and the spawn (avoids re-walking PATH per call). A null path is the missing
  // binary → the error control-frame, no spawn attempt, no faked success (ADR-003).
  const bin = provider.resolveBinaryPath(baseEnv);
  if (bin === null) {
    gate.discard();
    sendControl(ws, {
      type: "error",
      message: `${provider.id} CLI not found — install it or pick another provider.`,
    });
    safeClose(ws);
    return;
  }

  const args = provider.buildArgs();
  const sessionId = `${ref || "session"}:${provider.id}:${Date.now()}`;
  const env = provider.buildEnv(sessionId, baseEnv);

  // The headroom plugin's single seam ↔ runtime call (ADR-003). It runs AFTER the
  // provider gate (a missing PROVIDER fires the error frame above and never reaches
  // here) and BEFORE spawn: a pure decoration of the already-computed raw launch.
  // Plugin off / not-routable (gemini) / headroom-absent all return the raw launch
  // unchanged; enabled + routable + headroom on PATH returns the wrapped launch.
  // The injected `which` is the same PATH lookup the provider seam uses.
  const launch = resolveHeadroomLaunch({
    providerId: provider.id,
    config: headroomConfig,
    rawBin: bin,
    rawArgs: args,
    env: baseEnv,
    which,
  });

  let term;
  try {
    term = await spawn(launch.bin, launch.args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env,
    });
  } catch (error) {
    // pty.spawn threw (binary vanished between check and spawn, exec denied, …):
    // still the dock error state, never an unguarded crash (ADR-003). The queued
    // frames die here too — they are inherited by no later connection.
    gate.discard();
    sendControl(ws, {
      type: "error",
      message: `${provider.id} CLI failed to start: ${error?.message ?? "spawn failed"}.`,
    });
    safeClose(ws);
    return;
  }

  // The socket closed WHILE the PTY was spawning — the leak ADR-008 closes by
  // construction. The handle exists and nobody is holding it, so it is killed
  // here rather than left running for the lifetime of the server.
  //
  // THIS IS THE LINE THAT DISCHARGES THE ORPHANED PTY. The gate's own
  // already-closed `onClose` branch is defence for a future `await` landing above
  // this point, and is unreachable today (see the comment there). Removing this
  // block on the belief that the gate covers it reinstates the leak, and task 01's
  // "closed while the PTY is spawning" row is what says so.
  if (gate.closed) {
    gate.discard();
    try {
      term.kill();
    } catch (error) {
      // already-exited guard (win32)
      reportDegrade("terminal-ws", error);
    }
    return;
  }

  // Log the spawned PTY pid to the board server's stdout so a running session is
  // traceable from the host (e.g. to inspect or `taskkill` it). A live PTY can't
  // be migrated into a native terminal, so the pid is the handle to it.
  try {
    console.log(`terminal: ${provider.id} started · pid=${term?.pid ?? "?"} · ref=${ref || "-"} · cwd=${cwd}`);
  } catch (error) {
    /* logging must never break the session */
      reportDegrade("terminal-ws", error); }

  // Persist the running session to .aof/terminal-sessions.json (best-effort, when
  // enabled) so the live PTY is traceable from the host; dropped again when it ends.
  if (recordSessions) {
    void registerSession(projectDir, { pid: term?.pid, ref, provider: provider.id, cwd });
  }

  wireSession(ws, term, gate, recordSessions ? () => void unregisterSession(projectDir, term?.pid) : undefined);
}

// Wire the PTY ↔ WebSocket per the frozen envelope. All PTY mutations
// (write/resize/kill) are try/catch-guarded — the win32 "already-exited" guard
// carried from vibeyard.
function wireSession(ws, term, gate, onEnd = () => {}) {
  // Run the end hook (unregister the session) at most once, on exit OR close.
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    try {
      onEnd();
    } catch (error) {
      /* the end hook must never throw into the session */
      reportDegrade("terminal-ws", error); }
  };

  // PTY → client: raw frames.
  const dataSub = term.onData((data) => {
    try {
      ws.send(data);
    } catch (error) {
      // socket already closing
      reportDegrade("terminal-ws", error); }
  });

  // PTY exit → client: the {type:'exit', exitCode} control-frame.
  const exitSub = term.onExit(({ exitCode }) => {
    sendControl(ws, { type: "exit", exitCode });
    safeClose(ws);
    end();
  });

  // Teardown goes on through the GATE, not straight onto the socket: a `close`
  // that fired while this session was still spawning has no listener left to
  // reach, so the gate runs this immediately in that case (ADR-008).
  gate.onClose(() => {
    try {
      dataSub?.dispose?.();
      exitSub?.dispose?.();
    } catch (error) {
      /* no-op */
      reportDegrade("terminal-ws", error); }
    try {
      term.kill();
    } catch (error) {
      // already-exited guard (win32)
      reportDegrade("terminal-ws", error); }
    end();
  });

  // client → server. ONE handler serves both halves: the gate drains whatever
  // arrived before this moment through it, in arrival order, and then hands it
  // every later frame directly. A queued frame is therefore not a special case —
  // it means exactly what the same frame means live.
  gate.open((data, isBinary) => {
    // A JSON object is a control message; anything else is raw input bytes.
    const control = !isBinary && parseControl(data);
    if (control && control.type === "resize") {
      try {
        term.resize(toCols(control.cols), toRows(control.rows));
      } catch (error) {
        // already-exited guard (win32)
      reportDegrade("terminal-ws", error); }
      return;
    }
    try {
      term.write(isBinary ? data : data.toString());
    } catch (error) {
      // already-exited guard (win32)
      reportDegrade("terminal-ws", error); }
  });
}

// --- helpers -----------------------------------------------------------------

function parseQuery(url) {
  try {
    return new URL(url ?? "/", "ws://127.0.0.1").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function parseControl(data) {
  const text = data?.toString?.() ?? "";
  if (!text.startsWith("{")) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function sendControl(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (error) {
    // socket closed/closing — nothing to send
      reportDegrade("terminal-ws", error); }
}

function safeClose(ws) {
  try {
    ws.close();
  } catch (error) {
    /* already closed */
      reportDegrade("terminal-ws", error); }
}

function toCols(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 80;
}

function toRows(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 24;
}
