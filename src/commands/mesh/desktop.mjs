// Transitional core composition for mesh-owned commands.
import { createMeshDesktopCommands } from "@aof/mesh/commands/desktop";
import { defaultRunner, preflightSeams, renderPreflight, runPreflight } from "./desktop-preflight.mjs";

export const { DESKTOP_APP_EXE, WEBVIEW2_BOOTSTRAPPER, resolveDesktopInstallDir, installDesktopApp, discoverDesktopApp, launchDesktopApp, desktopProcessName, parseTasklistPids, parsePgrepPids, findDesktopProcesses, stopDesktopApp, AUTOSTART_RUN_KEY, AUTOSTART_VALUE_NAME, resolveAutostartAction, applyAutostart, renderAutostart, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand } = createMeshDesktopCommands({ defaultRunner, preflightSeams, renderPreflight, runPreflight });
