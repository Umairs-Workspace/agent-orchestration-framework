// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshDesktopCommands } from "@aof/mesh/commands/desktop";

export function assembleCommandsMeshDesktop({ commandsMeshDesktopPreflightServices }) {
  // Core composition for mesh-owned commands.

  const { defaultRunner } = commandsMeshDesktopPreflightServices;
  const { preflightSeams } = commandsMeshDesktopPreflightServices;
  const { renderPreflight } = commandsMeshDesktopPreflightServices;
  const { runPreflight } = commandsMeshDesktopPreflightServices;

  const { DESKTOP_APP_EXE, WEBVIEW2_BOOTSTRAPPER, resolveDesktopInstallDir, installDesktopApp, discoverDesktopApp, launchDesktopApp, desktopProcessName, parseTasklistPids, parsePgrepPids, findDesktopProcesses, stopDesktopApp, AUTOSTART_RUN_KEY, AUTOSTART_VALUE_NAME, resolveAutostartAction, applyAutostart, renderAutostart, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand } = createMeshDesktopCommands({ defaultRunner, preflightSeams, renderPreflight, runPreflight });

  return { DESKTOP_APP_EXE, WEBVIEW2_BOOTSTRAPPER, resolveDesktopInstallDir, installDesktopApp, discoverDesktopApp, launchDesktopApp, desktopProcessName, parseTasklistPids, parsePgrepPids, findDesktopProcesses, stopDesktopApp, AUTOSTART_RUN_KEY, AUTOSTART_VALUE_NAME, resolveAutostartAction, applyAutostart, renderAutostart, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand };
}
