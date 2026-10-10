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

// node-pty 1.1's non-DLL ConPTY kill forks a console enumerator and then closes
// that console. After an OS-confirmed tree kill there is nothing left to enumerate;
// its delayed bare-PID fallback is also unsafe. Keep handle release/onExit intact.
// Confine this compatibility seam to this instance and this synchronous kill call.
export function releasePtyAfterTreeTermination(term) {
  const agent = term._agent;
  if (!agent?._useConpty || agent._useConptyDll || typeof agent._getConsoleProcessList !== "function") return term.kill();
  const enumerate = agent._getConsoleProcessList;
  agent._getConsoleProcessList = () => Promise.resolve([]);
  try { return term.kill(); }
  finally { agent._getConsoleProcessList = enumerate; }
}
