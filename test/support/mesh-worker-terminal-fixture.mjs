// test/support/mesh-worker-terminal-fixture.mjs — shared fakes for milestone 38 /
// story 05 (ADR-013): a scripted node-pty double + a stubbed terminal-providers
// `which` binary-resolution seam, so @executable coverage drives the REAL
// driveInteractiveClaudeSession / resolveInteractiveDriverLaunch / resolveProvider
// chain (mesh-worker-execution.mjs / terminal-providers.mjs) with no real node-pty,
// no real `claude`, no PTY, no network — the fake occupies EXACTLY the seam
// terminal-ws.mjs's own spawn/which injections occupy (the SAME "test through the
// real seam, only the leaf spawn/PATH-lookup is faked" discipline).

// createFakeWhich(presentBins) — a stubbed-present/absent PATH lookup mirroring
// terminal-providers.mjs's own `which(bin, env) => path|null` contract. `presentBins`
// names which binaries resolve; anything else resolves to null (the honest-degrade
// path terminal-ws.mjs's own provider gate keeps).
export function createFakeWhich(presentBins = ["claude"]) {
  return (bin) => (presentBins.includes(bin) ? `/fake/bin/${bin}` : null);
}

// The BRACKETED PASTE control sequences milestone 70 / story 06 wraps the directive
// body in. Spelled here rather than imported: the producer keeps them module-private on
// purpose (its export set is a frozen seventeen, FF-7002), and a double that imported its
// subject's constants would agree with it by construction instead of by contract.
const ESC = String.fromCharCode(27);
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

// createScriptedPty({ onWrite }) — a node-pty IPty double (onData/onExit/write/kill,
// the SAME shape terminal-ws.mjs's wireSession already drives). `onWrite` is called
// SYNCHRONOUSLY, inside term.write(...), with { chunk, rawChunk, emitData, emitExit } —
// letting a test script the "agent's" response to the EXACT command line the driver
// typed, with no timing race against driveInteractiveClaudeSession's own internal awaits
// (its onData/onExit handlers are registered BEFORE term.write is ever called, so a
// synchronous emit inside onWrite always reaches an already-registered handler).
//
// TWO VIEWS OF ONE WRITE, and the split is the point (milestone 70 gate, F-21).
// 70/06 changed the directive's wire shape: the body is now delivered as a bracketed
// paste and the Enter follows as its own write. A real terminal in paste mode consumes
// `ESC[200~`/`ESC[201~` as PROTOCOL — they never enter the content, which is measured:
// the live run's transcript holds the directive as one message with no ESC byte in it.
// So the double models both layers rather than picking one:
//   - `pty.writes` and `rawChunk` are THE WIRE — the exact bytes written, framing and all.
//     A test about the TRANSPORT asserts here.
//   - `chunk` is THE INPUT the session received — the paste framing stripped, exactly as
//     the TUI would present it. A test about the DIRECTIVE asserts here.
// Before this split every consumer read the raw bytes as if they were the directive, so
// one production change to the framing turned 38 delivered scenarios red across five
// milestones while production was provably fine. Un-framing in the ONE shared double is
// what stops the next transport change doing it again.
export function createScriptedPty({ onWrite } = {}) {
  const dataHandlers = [];
  const exitHandlers = [];
  const writes = [];
  const resizes = [];
  let killed = false;
  const pty = {
    pid: 4242,
    // onData/onExit's returned dispose() SPLICES the handler back out of its
    // array — mirroring real node-pty's own unsubscribe contract, so a test can
    // assert "no fire-after-settle" (a handler disposed after the driver settles
    // must never be invoked by a later emitData/emitExit call).
    onData(cb) {
      dataHandlers.push(cb);
      return {
        dispose() {
          const i = dataHandlers.indexOf(cb);
          if (i !== -1) dataHandlers.splice(i, 1);
        },
      };
    },
    onExit(cb) {
      exitHandlers.push(cb);
      return {
        dispose() {
          const i = exitHandlers.indexOf(cb);
          if (i !== -1) exitHandlers.splice(i, 1);
        },
      };
    },
    write(chunk) {
      writes.push(chunk);
      // Strip the frame only when the write IS a complete paste. A partial or absent
      // frame is handed through untouched rather than repaired — a double that quietly
      // fixed a malformed paste would hide exactly the defect this framing exists to
      // prevent (a body that closes its own paste and leaves the rest as keystrokes).
      const pasted = chunk.startsWith(PASTE_START) && chunk.endsWith(PASTE_END);
      onWrite?.({
        chunk: pasted ? chunk.slice(PASTE_START.length, -PASTE_END.length) : chunk,
        rawChunk: chunk,
        emitData: (data) => dataHandlers.slice().forEach((cb) => cb(data)),
        emitExit: (exitCode = 0) => exitHandlers.slice().forEach((cb) => cb({ exitCode })),
      });
    },
    resize(cols, rows) {
      resizes.push({ cols, rows });
    },
    kill() {
      killed = true;
      // node-pty confirms a successful kill through onExit. Model that contract
      // so parking tests cannot pass merely because kill() was called.
      exitHandlers.slice().forEach((cb) => cb({ exitCode: 0 }));
    },
    writes,
    resizes,
    get killed() {
      return killed;
    },
  };
  return pty;
}

// createFakePtySpawn({ onWrite }) — records every spawn call (bin/args/options) and
// returns a FRESH createScriptedPty(...) for each spawn — a test asserts spawnCalls
// for the argv-shape scenarios and drives the returned pty (via ptys[n]) for the
// output-stream scenarios. Task 01's "ONE long-lived session per assignment"
// invariant is proven by asserting spawnCalls.length itself.
export function createFakePtySpawn({ onWrite } = {}) {
  const spawnCalls = [];
  const ptys = [];
  const spawn = async (bin, args, options) => {
    const pty = createScriptedPty({ onWrite });
    spawnCalls.push({ bin, args, options });
    ptys.push(pty);
    return pty;
  };
  return { spawn, spawnCalls, ptys };
}
