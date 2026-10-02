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
