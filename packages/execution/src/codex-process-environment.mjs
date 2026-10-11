import { lstatSync } from "node:fs";
import path from "node:path";

// App execution aliases are reparse points: following them with stat/exists can
// return EACCES even though Windows shell discovery selects the alias.
const isFile = file => { try { const entry = lstatSync(file); return entry.isFile() || entry.isSymbolicLink(); } catch { return false; } };

// Store PowerShell launchers can fail CreateProcessAsUserW under the native
// Windows sandbox. Keep its permission policy intact and let Codex discover an
// ordinary PowerShell instead. This changes only the owned child's PATH.
export function codexProcessEnvironment(env = process.env, { platform = process.platform, exists = isFile } = {}) {
  if (platform !== "win32") return env;
  const key = Object.keys(env).find(name => name.toUpperCase() === "PATH");
  if (key == null) return env;
  const entries = env[key].split(";");
  const directory = entry => entry.replace(/^"|"$/gu, "");
  const storeShell = entry => /(?:^|[\\/])WindowsApps(?:[\\/]|$)/iu.test(directory(entry)) && exists(path.win32.join(directory(entry), "pwsh.exe"));
  const firstPwsh = entries.find(entry => entry && exists(path.win32.join(directory(entry), "pwsh.exe")));
  if (firstPwsh == null || !storeShell(firstPwsh)) return env;
  const retained = entries.filter(entry => !storeShell(entry));
  // Never remove the only available shell. A user-selected ordinary pwsh stays
  // preferred, and all other PATH entries retain their original order.
  if (!retained.some(entry => entry && ["pwsh.exe", "powershell.exe"].some(name => exists(path.win32.join(directory(entry), name))))) return env;
  return { ...env, [key]: retained.join(";") };
}
