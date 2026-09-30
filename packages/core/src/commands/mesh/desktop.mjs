// Compatibility entry; construction belongs to core application assembly.
import { commandsMeshDesktop } from "../../application/default.mjs";
export const {
  DESKTOP_APP_EXE,
  WEBVIEW2_BOOTSTRAPPER,
  resolveDesktopInstallDir,
  installDesktopApp,
  discoverDesktopApp,
  launchDesktopApp,
  desktopProcessName,
  parseTasklistPids,
  parsePgrepPids,
  findDesktopProcesses,
  stopDesktopApp,
  AUTOSTART_RUN_KEY,
  AUTOSTART_VALUE_NAME,
  resolveAutostartAction,
  applyAutostart,
  renderAutostart,
  meshDesktopInstallCommand,
  meshDesktopRunCommand,
  meshDesktopStopCommand,
} = commandsMeshDesktop;
