// Regression: milestone 38 / story 05 fix (live two-machine soak 2026-07-25,
// VERIFICATION F27) — the worker types the directive command into claude's PTY only
// AFTER a readiness delay, never at t=0. A t=0 write raced claude's interactive-TUI
// startup: the keystrokes were lost and claude sat idle at an empty prompt, never
// starting a session (no transcript -> no sessionId -> nothing for the story-06 terminal
// view to bind to). The delay is injected (options.commandDelayMs); the driver defaults
// to 0 so the rest of the suite stays fast, and mesh-launcher wires the real value.
import assert from "node:assert/strict";
import { driveInteractiveClaudeSession } from "../../../src/mesh/worker-execution.mjs";
import { createFakeWhich, createFakePtySpawn } from "../../support/mesh-worker-terminal-fixture.mjs";

// The bracketed-paste protocol bytes, built here from char codes rather than
// imported: they are a TERMINAL PROTOCOL constant (like the carriage return that
// submits), not an export of the driver - and the driver's export set is frozen at
// seventeen by an enforced gate. Asserting them here is what keeps the gate honest.
const ESC = String.fromCharCode(27);
const BRACKETED_PASTE_START = `${ESC}[200~`;
const BRACKETED_PASTE_END = `${ESC}[201~`;


export const meshWorkerCommandTimingTests = [
  {
    name: "F27 the directive command is typed only AFTER commandDelayMs, never at t=0",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const written = [];
      // record each write; emit a clean exit AFTER the (delayed) command lands so the
      // session settles deterministically.
      // `rawChunk` — this asserts the TRANSPORT (the paste framing), so it reads the wire
      // rather than the un-framed input the double hands to a directive test as `chunk`.
      const { spawn } = createFakePtySpawn({ onWrite: ({ rawChunk, emitExit }) => { written.push(rawChunk); if (rawChunk === "\r") emitExit(0); } });
      const p = driveInteractiveClaudeSession(
        { itemRef: "38/05", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:refine 38/05 --autonomous" },
        { ptySpawn: spawn, which, watchTranscriptSessionId: async () => null, commandDelayMs: 60 },
      );
      // 15ms in — well under the 60ms delay — nothing has been typed yet.
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(written.length, 0, "the command is NOT typed before commandDelayMs elapses");
      const result = await p; // resolves after the body write -> the separate submit -> emitExit(0) -> done
      assert.deepEqual(
        written,
        [`${BRACKETED_PASTE_START}/aof:refine 38/05 --autonomous${BRACKETED_PASTE_END}`, "\r"],
        "70/06: the directive body is ONE bracketed paste; the Enter is a SEPARATE write (carriage return, never line feed)",
      );
      assert.equal(result.outcome, "done");
    },
  },
  {
    name: "F27 with commandDelayMs 0 (the test/default) the command is still typed (immediate next tick)",
    run: async () => {
      const which = createFakeWhich(["claude"]);
      const { spawn, spawnCalls } = createFakePtySpawn({ onWrite: ({ chunk, emitExit }) => { if (chunk === "\r") emitExit(0); } });
      const result = await driveInteractiveClaudeSession(
        { itemRef: "38/05", worktreeCwd: "/tmp/wt", task: "demo", command: "/aof:continue" },
        { ptySpawn: spawn, which, watchTranscriptSessionId: async () => null, commandDelayMs: 0 },
      );
      assert.equal(spawnCalls.length, 1);
      assert.equal(result.outcome, "done", "the default-0 delay still drives the command to a clean done");
    },
  },
];
