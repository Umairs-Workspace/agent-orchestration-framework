// Adapted from elirantutia/vibeyard (MIT) — the injectable node-pty spawn service.
// Native loading stays inside the call: importing this module never loads the addon.
// Core supplies the distribution sentinel; execution owns both loading mechanisms.
import { chmodSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// node-pty forks every unix session through its `spawn-helper` binary, and Yarn's cache stores
// every file 0644, so a `yarn install` on macOS lands a helper that cannot execute: every spawn
// dies `posix_spawnp failed` before the program starts (2026-11-10 — a loop's lanes all settled
// `agent_error` with no session id). The payload, the SEA sidecar and the release tarball copy
// that mode onward, so the bit is restored here, at the one seam every spawn loads through.
// Best-effort: a read-only install keeps its mode, and the spawn's own error names the fault.
// Answers the helpers it made executable. The dirs are node-pty's own `loadNativeModule` order.
// A dir that holds no build is expected; any other fault is reported as a `pty-spawn-helper` degrade.
export function ensureSpawnHelperExecutable(moduleEntry, { platform = process.platform, arch = process.arch, reportDegrade = () => {} } = {}) {
  if (platform === "win32") return [];
  const root = path.resolve(path.dirname(moduleEntry), "..");
  const fixed = [];
  for (const dir of ["build/Release", "build/Debug", `prebuilds/${platform}-${arch}`]) {
    const helper = path.join(root, dir, "spawn-helper");
    try {
      const { mode } = statSync(helper);
      if ((mode & 0o100) !== 0) continue;
      chmodSync(helper, mode | 0o111);
      fixed.push(helper);
    } catch (error) {
      if (error?.code !== "ENOENT") reportDegrade("pty-spawn-helper", error);
    }
  }
  return fixed;
}

// Both loader anchors are tried, so the distribution sentinel is still asked exactly once, by the
// load itself. Whichever one does not apply cannot resolve and is skipped: a CJS bundle has no
// `import.meta.url`, and a dev checkout has no node-pty beside its node binary. Those two misses
// are expected; any other fault is reported, and an unloadable module stays the load's own error.
const ANCHOR_MISSES = new Set(["MODULE_NOT_FOUND", "ERR_INVALID_ARG_TYPE", "ERR_INVALID_ARG_VALUE"]);
function ensureLoadableSpawnHelpers(reportDegrade) {
  for (const anchor of [() => import.meta.url, () => process.execPath]) {
    try {
      ensureSpawnHelperExecutable(createRequire(anchor()).resolve("node-pty"), { reportDegrade });
    } catch (error) {
      if (!ANCHOR_MISSES.has(error?.code)) reportDegrade("pty-spawn-helper", error);
    }
  }
}

export function createNodePtyLoader({ isPackaged, reportDegrade = () => {} }) {
  if (typeof isPackaged !== "function") throw new TypeError("createNodePtyLoader: isPackaged is required");
  let helperChecked = false;
  return function loadNodePty() {
    if (!helperChecked) { helperChecked = true; ensureLoadableSpawnHelpers(reportDegrade); }
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
