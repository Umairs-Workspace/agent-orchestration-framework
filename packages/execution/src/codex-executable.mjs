import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { isSupportedCodexVersion } from "./codex-protocol-profile.mjs";

const isFile = file => { try { return statSync(file).isFile(); } catch { return false; } };
const packagePath = (root, name) => {
  try { return createRequire(path.join(root, "package.json")).resolve(`${name}/package.json`); }
  catch { return null; }
};

export function desktopLocations({ env = process.env, signal } = {}, { run = execFile } = {}) {
  return new Promise((resolve, reject) => {
    // Read registered package locations, never evaluate a launcher or interpolate input.
    const systemRoot = env.SystemRoot ?? env.SYSTEMROOT ?? "C:\\Windows";
    run(path.win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", "Get-AppxPackage -Name OpenAI.Codex | Select-Object -ExpandProperty InstallLocation"],
      { env, signal, windowsHide: true, timeout: 15000, maxBuffer: 65536 }, (error, stdout) => {
        if (signal?.aborted) { reject(Object.assign(new Error("abort"), { code: "abort" })); return; }
        if (error) { reject(Object.assign(new Error("Desktop discovery failed"), { code: error.killed ? "discovery_timeout" : "discovery_failed" })); return; }
        resolve(String(stdout).split(/\r?\n/u).map(value => value.trim()).filter(Boolean));
      });
  });
}

// Read installed extension registrations, not arbitrary stale extension folders.
export async function editorExecutables({ env = process.env, signal, onDiscoveryIssue = () => {} } = {}, { arch = process.arch, read = readFile } = {}) {
  const home = env.USERPROFILE;
  if (!home || !path.win32.isAbsolute(home)) return [];
  const binaries = [];
  for (const editor of [".vscode", ".vscode-insiders"]) {
    if (signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
    const extensions = path.win32.join(home, editor, "extensions");
    let registrations;
    try { registrations = JSON.parse(await read(path.win32.join(extensions, "extensions.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") onDiscoveryIssue({ source: "editor", code: "discovery_failed" }); continue; }
    if (!Array.isArray(registrations)) { onDiscoveryIssue({ source: "editor", code: "discovery_failed" }); continue; }
    for (const entry of registrations) {
      if (entry?.identifier?.id !== "openai.chatgpt" || typeof entry.relativeLocation !== "string"
        || !/^openai\.chatgpt-[0-9A-Za-z.-]+$/u.test(entry.relativeLocation)) continue;
      binaries.push(path.win32.join(extensions, entry.relativeLocation, "bin", arch === "arm64" ? "windows-aarch64" : "windows-x86_64", "codex.exe"));
    }
  }
  return binaries;
}

// npm's Windows launcher is a .cmd file, which cannot be execFile'd without a
// shell. Resolve its native package instead, keeping one directly owned process.
export async function* codexExecutables({ codexBin, env = process.env, signal, onDiscoveryIssue = () => {} } = {}, {
  platform = process.platform, arch = process.arch, exists = isFile,
  resolvePackage = packagePath, installedDesktopLocations = desktopLocations, installedEditorExecutables = editorExecutables,
} = {}) {
  if (platform !== "win32") { yield codexBin ?? "codex"; return; }
  const win = path.win32;
  const seen = new Set();
  function* native(launcher) {
    if (/\.(?:cmd|ps1)$/iu.test(launcher)) {
      const root = win.join(win.dirname(launcher), "node_modules", "@openai", "codex");
      const target = arch === "arm64" ? "aarch64-pc-windows-msvc" : "x86_64-pc-windows-msvc";
      const manifest = resolvePackage(root, `@openai/codex-win32-${arch}`);
      for (const vendor of [manifest && win.join(win.dirname(manifest), "vendor"), win.join(root, "vendor")].filter(Boolean)) {
        const bin = win.join(vendor, target, "codex", "codex.exe");
        if (exists(bin) && !seen.has(bin.toLowerCase())) { seen.add(bin.toLowerCase()); yield bin; }
      }
    } else if (exists(launcher) && !seen.has(launcher.toLowerCase())) {
      seen.add(launcher.toLowerCase()); yield launcher;
    }
  }
  const explicitPath = codexBin != null && (win.isAbsolute(codexBin) || /[\\/]/u.test(codexBin));
  if (explicitPath) { yield* native(codexBin); return; }
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === "PATH");
  for (const entry of (env[pathKey] ?? "").split(";").filter(Boolean)) {
    const dir = entry.replace(/^"|"$/gu, "");
    for (const name of codexBin && /\.(?:exe|cmd|ps1)$/iu.test(codexBin) ? [codexBin] : ["exe", "cmd", "ps1"].map(ext => `${codexBin ?? "codex"}.${ext}`)) {
      const launcher = win.join(dir, name);
      if (exists(launcher)) yield* native(launcher);
    }
  }
  if (codexBin != null || signal?.aborted) return;
  // A terminal launched outside VS Code does not inherit its bundled CLI on PATH.
  // Each independent discovery source can fail without hiding the other sources.
  for (const [source, discover] of [["editor", () => installedEditorExecutables({ env, signal, onDiscoveryIssue }, { arch })],
    ["desktop", () => installedDesktopLocations({ env, signal })]]) {
    if (signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
    try {
      for (const location of await discover()) {
        if (!win.isAbsolute(location)) continue;
        const bin = source === "desktop" ? win.join(location, "app", "resources", "codex.exe") : location;
        if (!exists(bin)) { onDiscoveryIssue({ source, code: "executable_missing" }); continue; }
        yield* native(bin);
      }
    } catch (error) {
      if (signal?.aborted || error.code === "abort") throw Object.assign(new Error("abort"), { code: "abort" });
      onDiscoveryIssue({ source, code: error.code === "discovery_timeout" ? "discovery_timeout" : "discovery_failed" });
    }
  }
}

export async function selectCodexExecutable(options, { readVersion, probeExecutable, candidates = codexExecutables } = {}) {
  const detectedVersions = [];
  let incompatible = false, probeFailed = false;
  const discoveryIssues = [], probeIssues = [];
  for await (const bin of candidates({ ...options, onDiscoveryIssue: issue => discoveryIssues.push(issue) })) {
    if (options.signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
    try {
      const cliVersion = await readVersion(bin, options);
      if (options.signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
      if (isSupportedCodexVersion(cliVersion)) {
        if (!probeExecutable) return { bin, cliVersion };
        try {
          const probe = await probeExecutable({ bin, cliVersion });
          if (options.signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
          return { bin, cliVersion, probe };
        } catch (error) {
          if (options.signal?.aborted || error.code === "abort") throw Object.assign(new Error("abort"), { code: "abort" });
          probeFailed = true;
          probeIssues.push({ version: cliVersion, code: ["timeout", "protocol_timeout"].includes(error.code) ? "probe_timeout" : "probe_failed" });
        }
      }
      incompatible = true;
      if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(cliVersion)) detectedVersions.push(cliVersion);
    } catch (error) {
      if (options.signal?.aborted || error.code === "abort") throw Object.assign(new Error("abort"), { code: "abort" });
      if (!["runtime_unavailable", "unsupported_profile"].includes(error.code)) throw error;
      if (error.code === "runtime_unavailable") probeIssues.push({ code: "version_unavailable" });
      if (error.code === "unsupported_profile") incompatible = true;
    }
  }
  if (options.signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
  const code = discoveryIssues.length ? "runtime_discovery_failed" : probeFailed ? "runtime_preflight_failed" : incompatible ? "unsupported_profile" : "runtime_unavailable";
  throw Object.assign(new Error(code), { code, detectedVersions, discoveryIssues, probeIssues });
}
