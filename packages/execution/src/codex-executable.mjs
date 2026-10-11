import { statSync } from "node:fs";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const isFile = file => { try { return statSync(file).isFile(); } catch { return false; } };
const packagePath = (root, name) => {
  try { return createRequire(path.join(root, "package.json")).resolve(`${name}/package.json`); }
  catch { return null; }
};

function desktopLocations({ env, signal }) {
  return new Promise(resolve => {
    // Read registered package locations, never evaluate a launcher or interpolate input.
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-AppxPackage -Name OpenAI.Codex | Select-Object -ExpandProperty InstallLocation"],
      { env, signal, windowsHide: true, timeout: 5000, maxBuffer: 65536 }, (error, stdout) => {
        resolve(error ? [] : String(stdout).split(/\r?\n/u).map(value => value.trim()).filter(Boolean));
      });
  });
}

// npm's Windows launcher is a .cmd file, which cannot be execFile'd without a
// shell. Resolve its native package instead, keeping one directly owned process.
export async function* codexExecutables({ codexBin, env = process.env, signal } = {}, {
  platform = process.platform, arch = process.arch, exists = isFile,
  resolvePackage = packagePath, installedDesktopLocations = desktopLocations,
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
  // Reached only if the caller rejected every PATH candidate. Registered desktop
  // builds can support a newer protocol than an older global npm installation.
  for (const location of await installedDesktopLocations({ env, signal })) {
    if (win.isAbsolute(location)) yield* native(win.join(location, "app", "resources", "codex.exe"));
  }
}

export async function selectCodexExecutable(options, { readVersion, supportedVersions, candidates = codexExecutables } = {}) {
  const detectedVersions = [];
  let incompatible = false;
  for await (const bin of candidates(options)) {
    if (options.signal?.aborted) throw Object.assign(new Error("abort"), { code: "abort" });
    try {
      const cliVersion = await readVersion(bin, options);
      if (supportedVersions.includes(cliVersion)) return { bin, cliVersion };
      incompatible = true;
      if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(cliVersion)) detectedVersions.push(cliVersion);
    } catch (error) {
      if (!["runtime_unavailable", "unsupported_profile"].includes(error.code)) throw error;
      if (error.code === "unsupported_profile") incompatible = true;
    }
  }
  throw Object.assign(new Error(incompatible ? "unsupported_profile" : "runtime_unavailable"), {
    code: incompatible ? "unsupported_profile" : "runtime_unavailable", detectedVersions,
  });
}
