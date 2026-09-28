// src/terminal/screen.mjs — THE SCREEN MODEL (138/ADR-001 §1-§4). One headless terminal emulator
// per driven session, fed the same PTY output node-pty hands the driver, so what claude DREW can be
// read as a screen rather than guessed at from a byte stream. It is the ONLY module in `src/` that
// imports `@xterm/headless` (FF-13801): every reader of the screen goes through the door,
// `session-screen.mjs`, which owns the one model a session has.
//
// THE MEMORY BOUND (§3). `scrollback: 0`, so the model holds two buffers of cols×rows cells (normal
// and alternate) whatever the session's length; a line pushed off the top is gone. Nothing reads
// history: evidence is the visible screen (ADR-004), and claude's REPL runs on the alternate buffer,
// which has no scrollback anyway.
//
// LAZY AND DEGRADABLE (§4). The package is loaded by a dynamic `import()` on first use, through a
// `load` seam whose outcome is remembered PER LOADER FUNCTION: a load that fails answers "no model"
// with one `screen-model-unavailable` degrade and is never retried in that process, and a failing
// injected loader never poisons the default one. The case is real — the Mac worker is an `npm
// link`ed clone, and between `git pull` and `npm ci` the package is absent — and the door answers it
// with today's byte gate.
import { reportDegrade } from "../degrade.mjs";

const defaultLoad = () => import("@xterm/headless");

// load -> Promise<Terminal constructor | null>. A WeakMap keyed by the function, so a suite that
// injects a fresh loader per case needs no reset, and the default loader is loaded once.
const loaded = new WeakMap();

function terminalConstructor(load) {
  let pending = loaded.get(load);
  if (pending == null) {
    // The async wrapper turns a loader that THROWS into a rejection, so both failure shapes reach
    // the one handler below.
    pending = (async () => load())().then(
      (mod) => {
        // `@xterm/headless` is CommonJS, so under `import()` its `Terminal` rides the default export.
        const Terminal = mod?.Terminal ?? mod?.default?.Terminal;
        if (typeof Terminal === "function") return Terminal;
        reportDegrade("screen-model-unavailable", new Error("the loaded module has no Terminal export; the session runs on the byte gate"));
        return null;
      },
      (error) => {
        reportDegrade("screen-model-unavailable", new Error(`${error?.name ?? "Error"}: ${error?.message ?? String(error)}; the session runs on the byte gate`));
        return null;
      },
    );
    loaded.set(load, pending);
  }
  return pending;
}

// createScreen({ cols, rows, load }) => Promise<model | null> — never rejects. A model answers:
//   write(chunk)  a promise that settles once the emulator has PARSED the chunk (and at once after
//                 dispose, so a late write is quiet);
//   snapshot()    { buffer: "normal" | "alternate", cursor: { row, col }, rows, cols, cursorKeys } —
//                 `rows` is exactly `rows` strings, each viewport row's `translateToString(true)`;
//                 the cursor is zero-based within the viewport; `cols` is the width the frame was
//                 drawn at, which a rule "across all cols" is measured against (ADR-002 §1);
//                 `cursorKeys` is `"application"` while the TUI has DECCKM on and `"normal"`
//                 otherwise, which is how an arrow key must be spelled to it (ADR-003 §4, amended);
//   dispose()     releases the emulator.
export async function createScreen({ cols = 80, rows = 24, load = defaultLoad } = {}) {
  const Terminal = await terminalConstructor(load);
  if (Terminal == null) return null;
  let terminal;
  try {
    // `allowProposedApi`: the headless build gates `terminal.buffer`, the one read this model
    // exists for, behind it (measured on 6.0.0: without it the first snapshot throws).
    terminal = new Terminal({ cols, rows, scrollback: 0, allowProposedApi: true });
  } catch (error) {
    reportDegrade("screen-model-unavailable", error);
    return null;
  }
  let disposed = false;
  // Resolvers of writes the emulator has not called back yet: a dispose settles them, so nothing
  // awaiting a write can hang on a released emulator.
  const waiting = new Set();

  return {
    cols,
    rows,
    write(chunk) {
      return new Promise((resolve) => {
        if (disposed) {
          resolve();
          return;
        }
        waiting.add(resolve);
        const parsed = () => {
          waiting.delete(resolve);
          resolve();
        };
        try {
          terminal.write(String(chunk), parsed);
        } catch (error) {
          reportDegrade("screen-model-write", error);
          parsed();
        }
      });
    },
    snapshot() {
      if (disposed) return { buffer: "normal", cursor: { row: 0, col: 0 }, rows: Array.from({ length: rows }, () => ""), cols, cursorKeys: "normal" };
      const active = terminal.buffer.active;
      const lines = [];
      for (let index = 0; index < rows; index += 1) {
        lines.push(active.getLine(active.viewportY + index)?.translateToString(true) ?? "");
      }
      return {
        buffer: active.type === "alternate" ? "alternate" : "normal",
        // `cursorY` counts from the buffer's base; the viewport is where a person looks.
        cursor: { row: active.baseY + active.cursorY - active.viewportY, col: active.cursorX },
        rows: lines,
        cols,
        cursorKeys: terminal.modes?.applicationCursorKeysMode === true ? "application" : "normal",
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const resolve of waiting) resolve();
      waiting.clear();
      try {
        terminal.dispose();
      } catch (error) {
        reportDegrade("screen-model-dispose", error);
      }
    },
  };
}
