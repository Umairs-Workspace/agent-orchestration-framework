// The desktop app's names and paths, per platform — the ONE home they are spelled in
// (175/ADR-002 §5, FF-17502). Pure: no I/O, and every path is a function of what it is
// handed, so the darwin layout is computed the same way on any host.
//
// `desktop.mjs`, the preflight and `scripts/install-local.mjs` import it, and none of them
// spells these names itself. The Windows constants moved here unchanged from `desktop.mjs`,
// which re-exports them, so the binding's `commandTools` shape is what it was.
import os from "node:os";
import path from "node:path";

// Windows: one placed exe, beside the WebView2 bootstrapper it needs (36/ADR-001).
export const DESKTOP_APP_EXE = "aof-mesh-desktop.exe";
export const WEBVIEW2_BOOTSTRAPPER = "MicrosoftEdgeWebview2Setup.exe";
// Windows login autostart: one value under the per-user Run key (126/ADR-007).
export const AUTOSTART_RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
export const AUTOSTART_VALUE_NAME = "aof-mesh-desktop";

// macOS: an `.app` bundle (175/ADR-002 §1). The inner executable is named "AOF Desktop"
// because Login Items names an ad-hoc-signed app's LaunchAgent by its executable
// (175/F-05). That is 11 characters, inside macOS's MAXCOMLEN of 16, so `pgrep -x` finds it
// by name (RESEARCH M4).
export const DESKTOP_APP_BUNDLE = "aof-mesh-desktop.app";
export const DESKTOP_BUNDLE_EXECUTABLE = "AOF Desktop";
// Every other POSIX platform keeps the process name the verbs have always used.
export const DESKTOP_POSIX_PROCESS_NAME = "aof-mesh-desktop";
// The identifier `tauri.conf.json` declares, and the LaunchAgent's label (175/ADR-004 §1).
export const DESKTOP_BUNDLE_ID = "com.aof.mesh.desktop";
export const LAUNCH_AGENT_LABEL = DESKTOP_BUNDLE_ID;

// resolveDesktopInstallDir(options) -> the per-user install dir the app lands in,
// CO-LOCATED with the m28 `aof` binary ($HOME/.aof/bin, 36/ADR-003 decision 3 — m28/ADR-006's
// join point). Injectable (options.installDir, else AOF_DESKTOP_INSTALL_DIR, else derived
// from options.env/AOF_GLOBAL_HOME/homedir) so a test drives a FIXTURE dir, never the real
// machine — mirrors paths.mjs's defaultGlobalWorkspaceDir env-override idiom.
export function resolveDesktopInstallDir(options = {}) {
  if (typeof options.installDir === "string" && options.installDir.length > 0) {
    return path.resolve(options.installDir);
  }
  const env = options.env ?? process.env;
  if (typeof env.AOF_DESKTOP_INSTALL_DIR === "string" && env.AOF_DESKTOP_INSTALL_DIR.length > 0) {
    return path.resolve(env.AOF_DESKTOP_INSTALL_DIR);
  }
  const home = env.AOF_GLOBAL_HOME ? path.resolve(env.AOF_GLOBAL_HOME) : path.join(os.homedir(), ".aof");
  return path.join(home, "bin");
}

// desktopLayout({ platform, installDir, home }) -> where the app sits on this platform:
//   placed       — what `install` places: the exe on Windows, the bundle directory on macOS;
//   executable   — what `run` spawns: the exe itself, or the bundle's inner executable;
//   processName  — what `stop` finds it by (`tasklist` image name / `pgrep -x` name);
//   bootstrapper — the WebView2 bootstrapper beside the exe, or null where none is needed;
//   launchAgent  — the per-user LaunchAgent plist on macOS, or null elsewhere.
// Every platform other than darwin keeps the one layout the verbs have always used.
export function desktopLayout({ platform, installDir, home }) {
  if (platform === "darwin") {
    const placed = path.join(installDir, DESKTOP_APP_BUNDLE);
    return {
      platform,
      installDir,
      placed,
      executable: bundleExecutable(placed),
      processName: DESKTOP_BUNDLE_EXECUTABLE,
      bootstrapper: null,
      launchAgent: path.join(home, "Library", "LaunchAgents", `${LAUNCH_AGENT_LABEL}.plist`),
    };
  }
  const placed = path.join(installDir, DESKTOP_APP_EXE);
  return {
    platform,
    installDir,
    placed,
    executable: placed,
    processName: platform === "win32" ? DESKTOP_APP_EXE : DESKTOP_POSIX_PROCESS_NAME,
    bootstrapper: path.join(installDir, WEBVIEW2_BOOTSTRAPPER),
    launchAgent: null,
  };
}

// The inner executable of a bundle at `bundlePath` — where macOS looks for it.
export function bundleExecutable(bundlePath) {
  return path.join(bundlePath, "Contents", "MacOS", DESKTOP_BUNDLE_EXECUTABLE);
}
