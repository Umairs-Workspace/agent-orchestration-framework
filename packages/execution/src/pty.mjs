// Adapted from elirantutia/vibeyard (MIT) — the injectable node-pty spawn service.
// Native loading stays inside the call: importing this module never loads the addon.
// Core supplies the distribution sentinel; execution owns both loading mechanisms.
import { createRequire } from "node:module";

export function createNodePtyLoader({ isPackaged }) {
  if (typeof isPackaged !== "function") throw new TypeError("createNodePtyLoader: isPackaged is required");
  return function loadNodePty() {
    return isPackaged() ? createRequire(process.execPath)("node-pty") : import("node-pty");
  };
}

export function createTerminalSpawn(ptyLoader) {
  return async function spawnWithLoader(bin, args, options) {
    const pty = await ptyLoader();
    return pty.spawn(bin, args, options);
  };
}

// releaseAfterTreeKill(term) — release the pseudoconsole of a session whose process tree the OS
// tree kill has already ended. node-pty 1.1.0's Windows `kill()` first forks
// `conpty_console_list_agent` to list the console's processes; with the tree gone the agent cannot
// attach, dies printing `Error: AttachConsole failed` and its stack to the inherited stderr (every
// lane's narration, 2026-10-06), and five seconds later node-pty falls back to
// `process.kill(innerPid)`, a pid the OS may already have reused. This is `WindowsTerminal.kill()`
// with that list left out: `_close()`, both sockets unreadable, the native pseudoconsole close and
// the conout worker disposed. Answers false, doing nothing, for any terminal not of that shape (a
// test double, a conpty.dll terminal, one not yet ready), and the caller then calls `term.kill()`.
export function releaseAfterTreeKill(term) {
  const agent = term?._agent;
  if (term?._isReady !== true || typeof term._close !== "function") return false;
  if (agent?._useConpty !== true || agent._useConptyDll === true) return false;
  if (typeof agent._ptyNative?.kill !== "function" || typeof agent._conoutSocketWorker?.dispose !== "function") return false;
  term._close();
  agent._inSocket.readable = false;
  agent._outSocket.readable = false;
  agent._ptyNative.kill(agent._pty, false);
  agent._conoutSocketWorker.dispose();
  return true;
}
