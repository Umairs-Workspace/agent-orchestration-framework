// The PNG half of a diagram export (milestone 133, ADR-005 §2-§3, §5). Generic and generator-
// agnostic: it rasterizes the COMMITTED SVG — never the generator's source — through a Chromium-
// family browser that aof FINDS and never installs. The plugin's own PNG path needs Python
// Playwright, which is policy-blocked here and absent on the worker nodes.
//
// TWO FACTS MAKE "DONE" (measured at refine): Chrome's headless shell exits only after it has
// written the screenshot, but Edge's launcher RETURNED in 0.07 s, before the file existed. So a
// render is done when the process has exited AND the output exists, is non-empty and has stopped
// growing — polled up to 30 s. A stale output is removed before the spawn, so old bytes can never
// satisfy the poll, and the isolated profile directory is removed on every path.
//
// EVERYTHING IMPURE IS INJECTED (the ladder's lookups, the spawn, the clock, the sleep), with real
// defaults for the CLI, so the suites drive every rung and the launcher-returns-early case without
// a real browser. The argv is formed by ONE function, `browserArgv`, and the one spawn below uses it
// (FF-13303). Nothing here imports Playwright or spawns a package manager.
import { spawn as spawnProcess } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { commandError } from "../command-error.mjs";
import { reportDegrade } from "../degrade.mjs";

export const RENDER_DEADLINE_MS = 30_000;
const POLL_MS = 100;
const ENV_KEY = "AOF_DIAGRAM_BROWSER";
const CONFIG_KEY = "work.diagrams.browser";
const PATH_NAMES = ["chromium", "chromium-browser", "google-chrome"];

// The executable inside a `chromium_headless_shell-<n>` directory, per OS — the newer
// `chrome-headless-shell-*` layout first, then the older `chrome-*/headless_shell` one.
const SHELL_EXECUTABLES = {
  win32: ["chrome-headless-shell-win64/chrome-headless-shell.exe", "chrome-win/headless_shell.exe"],
  darwin: [
    "chrome-headless-shell-mac-arm64/chrome-headless-shell",
    "chrome-headless-shell-mac-x64/chrome-headless-shell",
    "chrome-mac/headless_shell",
  ],
  linux: ["chrome-headless-shell-linux64/chrome-headless-shell", "chrome-linux/headless_shell"],
};

const INSTALLS = {
  win32: (localAppData) => ({
    chrome: [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      ...(localAppData ? [`${localAppData}/Google/Chrome/Application/chrome.exe`] : []),
    ],
    edge: [
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    ],
  }),
  darwin: () => ({
    chrome: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    edge: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
  }),
  linux: () => ({
    chrome: ["/opt/google/chrome/chrome"],
    edge: ["/opt/microsoft/msedge/msedge"],
  }),
};

const slashes = (value) => String(value).replace(/\\/g, "/").replace(/\/+$/, "");

export function playwrightCacheRoot({ platform, home, localAppData }) {
  if (platform === "win32") return localAppData ? `${slashes(localAppData)}/ms-playwright` : null;
  if (platform === "darwin") return `${slashes(home)}/Library/Caches/ms-playwright`;
  return `${slashes(home)}/.cache/ms-playwright`;
}

// A shell by its file name; everything else is a full browser, and only a full one needs
// `--headless=new` (ADR-005 §3).
function kindOf(executable) {
  return /chrome-headless-shell|headless_shell/i.test(path.basename(executable)) ? "headless-shell" : "full";
}

const FIX = `Install Chrome or Edge, or name a Chromium-family executable with ${CONFIG_KEY} in .aof/aof.config.json or the ${ENV_KEY} environment variable. aof downloads no browser.`;

function pinnedMissing(executable, pinnedBy) {
  return {
    ok: false,
    code: "diagram-png-renderer-missing",
    message: `${pinnedBy} names ${executable}, which does not exist.`,
    fix: `Point ${pinnedBy} at an existing Chromium-family executable, or unset it to let aof look for one.`,
  };
}

function newestCachedShell({ root, platform, exists, list }) {
  if (root == null) return null;
  let names;
  try {
    names = list(root);
  } catch {
    return null; // no cache on this node — the next rung answers
  }
  const revisions = names
    .map((name) => /^chromium_headless_shell-(\d+)$/.exec(name))
    .filter(Boolean)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const [dir] of revisions) {
    for (const rel of SHELL_EXECUTABLES[platform] ?? SHELL_EXECUTABLES.linux) {
      const candidate = `${root}/${dir}/${rel}`;
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

// THE LADDER (ADR-005 §3). Pure over injected lookups; the first rung that answers wins. A pinned
// rung (config or env) that names a missing file is HEARD, never skipped.
export function findBrowser({
  configured = null,
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
  localAppData = process.env.LOCALAPPDATA,
  exists = existsSync,
  which = whichOnPath,
  list = readdirSync,
} = {}) {
  const found = (rung, executable) => ({ ok: true, rung, kind: kindOf(executable), path: executable });
  if (configured) return exists(configured) ? found("config", configured) : pinnedMissing(configured, CONFIG_KEY);
  const pinned = env?.[ENV_KEY];
  if (typeof pinned === "string" && pinned.trim() !== "") {
    return exists(pinned) ? found("env", pinned) : pinnedMissing(pinned, ENV_KEY);
  }
  const shell = newestCachedShell({ root: playwrightCacheRoot({ platform, home, localAppData }), platform, exists, list });
  if (shell) return found("playwright-cache", shell);
  const installs = (INSTALLS[platform] ?? INSTALLS.linux)(localAppData ? slashes(localAppData) : null);
  for (const rung of ["chrome", "edge"]) {
    const hit = installs[rung].find((candidate) => exists(candidate));
    if (hit) return found(rung, hit);
  }
  for (const name of PATH_NAMES) {
    const hit = which(name);
    if (hit) return found("path", hit);
  }
  return {
    ok: false,
    code: "diagram-png-renderer-missing",
    message: "No Chromium-family browser was found to render the PNG.",
    fix: FIX,
  };
}

function whichOnPath(name, { env = process.env, platform = process.platform, exists = existsSync } = {}) {
  const dirs = String(env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const exts = platform === "win32" ? String(env.PATHEXT ?? ".EXE").split(";").filter(Boolean) : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, `${name}${ext.toLowerCase()}`);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

// THE ONE FUNCTION THAT FORMS A BROWSER ARGV (FF-13303). The window IS the viewBox, so the
// screenshot is the diagram and nothing else; the device scale factor is the export's scale.
export function browserArgv({ kind, width, height, scale, userDataDir, pngPath, svgPath }) {
  return [
    ...(kind === "full" ? ["--headless=new"] : []),
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${scale}`,
    `--user-data-dir=${userDataDir}`,
    `--screenshot=${slashes(path.resolve(pngPath))}`,
    pathToFileURL(path.resolve(svgPath)).href,
  ];
}

// The root `<svg>`'s viewBox width and height, rounded UP. The origin does not size the window.
export function viewBoxSize(svgText) {
  const root = /<svg\b[^>]*>/i.exec(svgText)?.[0] ?? "";
  const viewBox = /\sviewBox\s*=\s*["']([^"']*)["']/.exec(root)?.[1];
  const parts = viewBox?.trim().split(/[\s,]+/).map(Number) ?? [];
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) {
    throw commandError("The SVG has no usable viewBox, so its size cannot be rendered without guessing.", "diagram-svg-no-viewbox", 422);
  }
  return { width: Math.ceil(parts[2]), height: Math.ceil(parts[3]) };
}

const defaultStat = (file) => {
  try {
    return statSync(file);
  } catch {
    return null; // not written yet — the poll asks again
  }
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function rasterizeSvg({
  svgPath,
  pngPath,
  scale = 2,
  browser,
  spawn = spawnProcess,
  stat = defaultStat,
  now = Date.now,
  sleep = defaultSleep,
  tmp = os.tmpdir(),
  deadlineMs = RENDER_DEADLINE_MS,
}) {
  if (path.extname(svgPath).toLowerCase() !== ".svg") {
    throw commandError(`The rasterizer renders the committed SVG, never the source: ${svgPath} is not an .svg.`, "diagram-png-source-not-svg", 400);
  }
  const { width, height } = viewBoxSize(await readFile(svgPath, "utf8"));
  await rm(pngPath, { force: true });
  const userDataDir = await mkdtemp(path.join(tmp, "aof-diagram-profile-"));
  const failed = (exitCode, stderr) => ({
    ok: false,
    code: "diagram-png-render-failed",
    exitCode,
    stderr,
    fix: `The browser at ${browser.path} exited without writing the PNG. Try another with ${CONFIG_KEY} or ${ENV_KEY}.`,
  });
  try {
    let child;
    try {
      child = spawn(
        browser.path,
        browserArgv({ kind: browser.kind, width, height, scale, userDataDir, pngPath, svgPath }),
        { stdio: ["ignore", "ignore", "pipe"], windowsHide: true },
      );
    } catch (error) {
      // Not executable at all (a pinned path to something that is not a browser): Windows throws here.
      return failed(null, error.message);
    }
    let exit = null;
    let stderr = "";
    child.stderr?.on?.("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => { exit = { code: null, error }; });
    child.on("exit", (code) => { exit = { code }; });

    const started = now();
    let lastSize = -1;
    for (;;) {
      const size = stat(pngPath)?.size ?? 0;
      if (exit != null && size > 0 && size === lastSize) return { ok: true, pngPath };
      if (exit != null && size === 0 && (exit.error != null || exit.code !== 0)) {
        return failed(exit.code, exit.error ? exit.error.message : stderr.trim());
      }
      if (now() - started >= deadlineMs) {
        if (exit == null) child.kill?.();
        await rm(pngPath, { force: true });
        return {
          ok: false,
          code: "diagram-png-render-timeout",
          fix: `The browser at ${browser.path} wrote no complete PNG within ${deadlineMs / 1000} s. Try another with ${CONFIG_KEY} or ${ENV_KEY}.`,
        };
      }
      lastSize = size;
      await sleep(POLL_MS);
    }
  } finally {
    // A launcher that returned early may still hold the profile for a moment, hence the retries.
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
      .catch((error) => reportDegrade("diagram-profile-cleanup", error));
  }
}
