// `aof mesh desktop install` / `aof mesh desktop run` — install and launch the
// Tauri desktop supervisor alongside the m28 `aof` SEA binary (milestone 36 /
// story 03, ADR-003). Registered Commands since m42 wave (d) leg d1's wave-3
// tail: mesh:desktop-install / mesh:desktop-run ride THREE-WORD routes through
// the registry-derived route table + the ONE generic face (the
// mesh:repo-publish precedent — ADR-003's original "doesn't fit the
// single-positional meshVerbCli shape" rationale died with meshVerbCli). The
// core placement/discovery/launch logic stays here, unit-testable without
// spawning the CLI.
//
// Two verbs:
//   install(options) — places the desktop app executable(s) + the WebView2
//     Evergreen Bootstrapper (a placed file, ADR-001) into the install dir
//     (`$HOME/.aof/bin`, ADR-003 decision 3 — the SAME per-user dir the m28
//     installer places `aof` into). Idempotent (a re-install replaces in place,
//     never duplicates). A staged-then-swap write so a failure never leaves a
//     partial placement (mirrors the m28 install.sh/.ps1 stage-first discipline).
//   run(options) — discovers the installed app in the install dir by absolute
//     co-located path (no PATH search — the 00<->03 trusted-spawn contract) and
//     launches it DETACHED (spawn(..., { detached:true, stdio:"ignore" }).unref()
//     — the aof house detached-spawn idiom for a long-lived supervised app,
//     mirroring src/mesh/fabric.mjs's injected-exec-closure idiom for tests). The
//     CLI returns immediately; it never waits on the child.
//
// Every failure is a caught, coded, ONE-sentence refusal — never a stack trace
// (mirrors mesh-ui-serve.mjs's ui-build-missing / EADDRINUSE idiom): the errors
// this module throws always carry a `.code` a caller can render/--json without
// ever needing the stack.
import { access, constants as fsConstants, copyFile, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { guardMeshPositionals } from "./face-shared.mjs";
// The preflight is its OWN module (126/06 post-hoc review): these two verbs REPORT it and
// nothing here decides it. `defaultRunner` lives there too — one spawn seam, injectable
// end to end, reached by the autostart act and the process discovery below as well.
import { defaultRunner, preflightSeams, renderPreflight, runPreflight } from "./desktop-preflight.mjs";

// The desktop app's placed file names (Windows-first, ADR-001 §Tauri). Kept as
// named constants so install/run agree on exactly what "the installed app" means.
export const DESKTOP_APP_EXE = "aof-mesh-desktop.exe";
export const WEBVIEW2_BOOTSTRAPPER = "MicrosoftEdgeWebview2Setup.exe";

// resolveDesktopInstallDir(options) -> the per-user install dir the app + the
// WebView2 bootstrapper land in, CO-LOCATED with the m28 `aof` binary
// ($HOME/.aof/bin, ADR-003 decision 3 / m28/ADR-006's join point). Injectable
// (options.installDir, else AOF_DESKTOP_INSTALL_DIR, else derived from
// options.env/AOF_GLOBAL_HOME/homedir) so a test drives a FIXTURE dir, never the
// real machine — mirrors paths.mjs's defaultGlobalWorkspaceDir env-override idiom.
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

// A calm coded refusal — the ONLY error shape this module throws. `code` is what
// the CLI face renders under --json ({ ok:false, error, code }); `message` is the
// one-sentence, actionable text (never a stack trace).
function refuse(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function pathExists(target) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isWritableDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    return false;
  }
  try {
    await access(dir, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// The fixture/production app-artifact source resolver — mirrors the story's
// "a fixture desktop-app artifact to place" Background: production has no built
// Tauri bundle to reach for yet (the Rust subtree lands in stories 00-02), so
// callers (tests today, the real packaging step later) always supply explicit
// source paths; a caller that omits them gets the coded "artifact is missing"
// refusal, never a silent no-op.
function requireArtifactSource(value, code, message) {
  if (typeof value !== "string" || value.length === 0) {
    throw refuse(code, message);
  }
  return value;
}

// installDesktopApp({ installDir, env, appArtifactPath, bootstrapperArtifactPath,
// isWritableDirFn }) -> { ok:true, installDir, appPath, bootstrapperPath } |
// throws a coded refusal.
//
// Stages the new app exe + bootstrapper into a TEMP sibling dir first, verifies
// the install dir is writable, then moves the staged files into place — so a
// mid-install failure (dir goes unwritable, an artifact vanishes) never leaves a
// half-placed app (mirrors the m28 install.sh/.ps1 "stage first, swap on success"
// discipline the F5 fix hardened). Idempotent: re-running replaces the app exe +
// bootstrapper IN PLACE (same file names — no duplicate, no stale prior copy).
//
// `isWritableDirFn` is an INJECTED seam (mirrors mesh-fabric.mjs's injected exec
// closure) — defaults to the real filesystem writability probe; a test injects a
// fault (a function that returns false) to exercise the unwritable-dir refusal
// deterministically and cross-platform (POSIX chmod bits don't reliably lock a
// directory against its own owner on every OS/filesystem, notably Windows).
export async function installDesktopApp(options = {}) {
  const installDir = resolveDesktopInstallDir(options);
  const checkWritable = typeof options.isWritableDirFn === "function" ? options.isWritableDirFn : isWritableDir;
  const appArtifactPath = requireArtifactSource(
    options.appArtifactPath,
    "app-artifact-missing",
    "The packaged desktop app artifact is missing. Re-build or re-download the release bundle and try again.",
  );
  const bootstrapperArtifactPath = requireArtifactSource(
    options.bootstrapperArtifactPath,
    "bootstrapper-artifact-missing",
    "The WebView2 bootstrapper artifact is missing from the release bundle. Re-download the release bundle and try again.",
  );

  if (!(await pathExists(appArtifactPath))) {
    throw refuse(
      "app-artifact-missing",
      "The packaged desktop app artifact is missing. Re-build or re-download the release bundle and try again.",
    );
  }
  if (!(await pathExists(bootstrapperArtifactPath))) {
    throw refuse(
      "bootstrapper-artifact-missing",
      "The WebView2 bootstrapper artifact is missing from the release bundle. Re-download the release bundle and try again.",
    );
  }

  // `--dry-run` covers the WHOLE verb (126/04, ADR-007 amendment §1): no placement and
  // no registry write, so the bijection gate's `--json` probe of this machine-wide act
  // performs none of it. It returns AFTER the artifact refusals above — a dry run that
  // cannot name what it would install has nothing to report — and BEFORE the
  // writability probe, which `mkdir`s the install dir into existence.
  if (options.dryRun === true) {
    return {
      ok: true,
      dryRun: true,
      installDir,
      appPath: path.join(installDir, DESKTOP_APP_EXE),
      bootstrapperPath: path.join(installDir, WEBVIEW2_BOOTSTRAPPER),
      placed: false,
    };
  }

  // Verify writability BEFORE touching anything under installDir (verify-before-
  // place, the m28 verify-before-PATH precedent) — a pre-existing unwritable dir
  // never gets a partial write attempted against it.
  if (!(await checkWritable(installDir))) {
    throw refuse(
      "install-dir-not-writable",
      `${installDir} is not writable. Fix write access to that folder (check permissions/ownership) and try again.`,
    );
  }

  const stageParent = path.join(os.tmpdir(), "aof-mesh-desktop-install-");
  const stageDir = await mkdtemp(stageParent);
  try {
    const stagedAppPath = path.join(stageDir, DESKTOP_APP_EXE);
    const stagedBootstrapperPath = path.join(stageDir, WEBVIEW2_BOOTSTRAPPER);
    try {
      await copyFile(appArtifactPath, stagedAppPath);
      await copyFile(bootstrapperArtifactPath, stagedBootstrapperPath);
    } catch (error) {
      // A read/copy fault mid-stage (e.g. the dir went unwritable between the
      // pre-check and now) is the SAME calm refusal — never a raw stack trace,
      // and nothing has been placed under installDir yet at this point.
      throw refuse(
        "install-dir-not-writable",
        `${installDir} is not writable. Fix write access to that folder (check permissions/ownership) and try again.`,
      );
    }

    // Re-check writability immediately before the swap (the window a "becomes
    // unwritable MID-install" fault lands in — task 01's dedicated no-partial-
    // placement scenario). Everything up to here only touched the TEMP stage
    // dir; nothing under installDir has been written yet, so failing here still
    // leaves installDir holding exactly its prior contents.
    if (!(await checkWritable(installDir))) {
      throw refuse(
        "install-dir-not-writable",
        `${installDir} is not writable. Fix write access to that folder (check permissions/ownership) and try again.`,
      );
    }

    const appPath = path.join(installDir, DESKTOP_APP_EXE);
    const bootstrapperPath = path.join(installDir, WEBVIEW2_BOOTSTRAPPER);
    try {
      await moveInPlace(stagedAppPath, appPath);
      await moveInPlace(stagedBootstrapperPath, bootstrapperPath);
    } catch (error) {
      // A RUNNING app holds an execute lock on its own .exe, so the swap fails with
      // EPERM/EBUSY/EACCES — a cause that is not permissions, reported until now as
      // `install-dir-not-writable`, a permissions message for a locked file (126/04
      // STORY.md `## Notes`, fixed here because the blast radius is this one function).
      // `moveInPlace` already tries the rotation `scripts/install-local.mjs` uses; if
      // even that failed, the honest answer names the running app.
      if (isLockedFileFault(error)) {
        throw refuse(
          "desktop-app-running",
          `${appPath} is locked by the running desktop app. Stop it with \`aof mesh desktop stop\` and re-run this install.`,
        );
      }
      throw refuse(
        "install-dir-not-writable",
        `${installDir} is not writable. Fix write access to that folder (check permissions/ownership) and try again.`,
      );
    }

    return { ok: true, installDir, appPath, bootstrapperPath, placed: true };
  } finally {
    await rm(stageDir, { recursive: true, force: true });
  }
}

// moveInPlace(source, target) — rename (same-volume fast path) with a copy+rm
// fallback across-volume/EXDEV, so "replace in place" works whether the OS temp
// dir shares a volume with the install dir or not (a real cross-drive condition
// on a machine with multiple drives — the staged file must still land).
async function moveInPlace(source, target) {
  try {
    await rename(source, target);
    return;
  } catch (error) {
    if (error.code === "EXDEV") {
      await copyFile(source, target);
      await rm(source, { force: true });
      return;
    }
    if (!isLockedFileFault(error)) throw error;
  }

  // The target is LOCKED — on Windows a running .exe cannot be replaced, but it CAN be
  // renamed out of the way, which is what `scripts/install-local.mjs` already does
  // (`<name>.bak.<ts>`, never a delete: a running image's file must stay on disk).
  // Adopted here so a re-install over a running app places the new binary instead of
  // reporting a permissions problem it does not have.
  await rename(target, `${target}.bak.${backupStamp()}`);
  await rename(source, target);
}

// A fault that means "the file is held", not "the directory is unwritable". Windows
// raises EPERM or EBUSY for a running image and EACCES for a denied replace; the three
// are one condition as far as this module's remedy is concerned.
function isLockedFileFault(error) {
  return error?.code === "EPERM" || error?.code === "EBUSY" || error?.code === "EACCES";
}

// Filename-safe local timestamp for the `.bak` suffix (e.g. 20260909T110455) — the same
// shape `scripts/install-local.mjs` writes, so one prune rule reads both.
function backupStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

// discoverDesktopApp(options) -> the ABSOLUTE co-located app path if a runnable
// install is present, else throws a coded "not-installed"/"not-runnable" refusal.
// No PATH search — resolution is by absolute path inside the install dir only
// (ADR-004 §4's trusted co-located resolution, the thin 00<->03 contract this
// story's placement makes true).
export async function discoverDesktopApp(options = {}) {
  const installDir = resolveDesktopInstallDir(options);
  const appPath = path.join(installDir, DESKTOP_APP_EXE);

  let stats;
  try {
    stats = await stat(appPath);
  } catch {
    throw refuse(
      "desktop-not-installed",
      "The desktop app is not installed. Run `aof mesh desktop install` first.",
    );
  }

  if (!stats.isFile()) {
    throw refuse(
      "desktop-not-runnable",
      "The installed desktop app is not runnable (it may be corrupt). Re-run `aof mesh desktop install` to repair it.",
    );
  }

  // Windows has no execute permission bit on the file mode the way POSIX does;
  // a present regular .exe file under the install dir IS the runnable signal
  // there. On POSIX (dev-machine / CI), also require an execute bit — a present
  // but non-executable file is the "corrupt install" refusal, never a crash on
  // spawn.
  if (process.platform !== "win32") {
    const executable = (stats.mode & 0o111) !== 0;
    if (!executable) {
      throw refuse(
        "desktop-not-runnable",
        "The installed desktop app is not runnable (it may be corrupt). Re-run `aof mesh desktop install` to repair it.",
      );
    }
  }

  return appPath;
}

// launchDesktopApp(options) -> { ok:true, pid, appPath } — discovers the installed
// app then launches it DETACHED (the aof house detached-spawn idiom): stdio
// ignored, unref()'d, so the CLI process can exit/resolve without waiting on the
// long-lived app. `options.spawnFn` is the injected seam (mirrors
// mesh-fabric.mjs's injected exec closure) — defaults to the real
// child_process.spawn; a test injects a fixture-executable spawn to assert the
// SHAPE (detached, argv, resolved absolute path) without starting a real window.
export async function launchDesktopApp(options = {}) {
  const appPath = await discoverDesktopApp(options);
  const spawnFn = typeof options.spawnFn === "function" ? options.spawnFn : spawn;

  const child = spawnFn(appPath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  // Swallow an async spawn-level fault on the detached child (e.g. the file was
  // removed between discovery and spawn) so it never becomes an unhandled
  // rejection/crash in the parent CLI process — the launch already returned by
  // the time this could fire.
  if (child && typeof child.on === "function") {
    child.on("error", () => {});
  }
  if (child && typeof child.unref === "function") child.unref();

  return { ok: true, pid: child?.pid ?? null, appPath };
}

// ─────────────────────────────────────────────────────────────────────────────
// stop — the programmatic exit the supervisor never had (TECH_DEBT 20(b)).
//
// WHY THIS EXISTS. The app is deliberately close-to-tray: `WM_CLOSE` and the
// titlebar's `✕` only HIDE the window (`main.rs` prevent_close + hide, stated
// twice in the source), so the ONLY graceful exit is the tray menu's Quit item.
// That makes the documented deploy loop un-automatable — no script, no agent and
// no CI job can restart the control node's daemons — and it strands an operator
// completely whenever the tray menu is unreachable. Measured twice in one session
// (2026-08-08/09) on the m46 deploy.
//
// WHY A FORCIBLE TERMINATE IS THE RIGHT MECHANISM, not a shortcut. A "graceful"
// `taskkill` (no `/F`) posts `WM_CLOSE` — which this app converts to hide-to-tray
// by design, so it is a NO-OP here, not a gentler path. What makes terminating
// safe is the supervisor's Windows Job Object: it is created with
// `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, and `supervisor.rs` names the equivalence
// itself — the child tree is reaped "on Quit OR on the supervisor's OWN
// crash/exit (the OS closes every handle on process termination)". So the child
// daemons are reaped IDENTICALLY either way; Quit's only extra is `app.exit(0)`,
// which runs no cleanup this needs. `/T` is belt-and-braces beside the Job.
//
// Both seams are injectable (`listFn` / `killFn`) so the tests drive the parse
// and the refusal without a real process anywhere near them.

// The supervisor's process name per platform. Windows-first (ADR-001 §Tauri).
export function desktopProcessName(platform = process.platform) {
  return platform === "win32" ? DESKTOP_APP_EXE : "aof-mesh-desktop";
}

// Parse `tasklist /NH /FO CSV` output -> [pid]. Tolerates the "INFO: No tasks…"
// line tasklist prints (on STDOUT, exit 0) when nothing matches.
export function parseTasklistPids(stdout = "") {
  const pids = [];
  for (const line of String(stdout).split(/\r?\n/)) {
    const row = line.trim();
    if (row.length === 0 || row.startsWith("INFO:")) continue;
    // "aof-mesh-desktop.exe","23496","Console","1","123,456 K"
    const fields = row.match(/"([^"]*)"/g);
    if (!fields || fields.length < 2) continue;
    const pid = Number.parseInt(fields[1].replaceAll('"', ""), 10);
    if (Number.isInteger(pid) && pid > 0) pids.push(pid);
  }
  return pids;
}

// Parse `pgrep -x <name>` output -> [pid].
export function parsePgrepPids(stdout = "") {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

// findDesktopProcesses(options) -> [pid] — the running supervisors, newest last.
export async function findDesktopProcesses(options = {}) {
  const platform = options.platform ?? process.platform;
  const run = typeof options.listFn === "function" ? options.listFn : defaultRunner();
  const name = desktopProcessName(platform);

  if (platform === "win32") {
    const { stdout } = await run("tasklist", ["/FI", `IMAGENAME eq ${name}`, "/NH", "/FO", "CSV"]);
    return parseTasklistPids(stdout);
  }
  const { stdout } = await run("pgrep", ["-x", name]);
  return parsePgrepPids(stdout);
}

// stopDesktopApp(options) -> { ok:true, stopped:[pid], alreadyStopped:boolean }
// Terminating the supervisor reaps its children through the Job Object (above).
//
// `dryRun` REPORTS what would be stopped and terminates nothing. It exists for a
// blunt reason: this verb's effect is machine-wide (it finds the supervisor by
// process name, not through any injectable workspace), so the mesh CLI-bijection
// gate — which spawns EVERY registered mesh subcommand with `--json` — would kill
// the operator's running app every time the suite ran. `ui` set the precedent
// that a probe must not perform the act; this is that rule with the act still
// available under its own flag, rather than `--json` silently meaning "pretend".
export async function stopDesktopApp(options = {}) {
  const platform = options.platform ?? process.platform;
  const pids = await findDesktopProcesses(options);

  if (pids.length === 0) {
    return {
      ok: true,
      stopped: [],
      alreadyStopped: true,
      dryRun: options.dryRun === true,
      processName: desktopProcessName(platform),
    };
  }

  if (options.dryRun === true) {
    return {
      ok: true,
      stopped: [],
      wouldStop: pids,
      alreadyStopped: false,
      dryRun: true,
      processName: desktopProcessName(platform),
    };
  }

  const kill = typeof options.killFn === "function" ? options.killFn : defaultRunner();
  const stopped = [];
  const failed = [];
  for (const pid of pids) {
    const { code } =
      platform === "win32"
        ? await kill("taskkill", ["/PID", String(pid), "/T", "/F"])
        : await kill("kill", ["-TERM", String(pid)]);
    if (code === 0) stopped.push(pid);
    else failed.push(pid);
  }

  if (stopped.length === 0) {
    throw refuse(
      "desktop-stop-failed",
      `Found the desktop app (pid ${failed.join(", ")}) but could not stop it — it may be running as another user or elevated. Re-run this from the same account that launched it.`,
    );
  }

  return { ok: true, stopped, alreadyStopped: false, dryRun: false, failed, processName: desktopProcessName(platform) };
}

// ─────────────────────────────────────────────────────────────────────────────
// autostart — ONE `HKCU\…\Run` value, through the ONE injected runner (126/04,
// ADR-007 §1-§3).
//
// WHY A REGISTRY VALUE AND NOT A SERVICE. A Windows service runs in session 0, which
// has no login session, so `claude` there is unauthenticated and every supervised loop
// would start and die on auth — burning a run record per attempt, in exactly the shape
// the supervisor's backoff reads as a flapping child. That is the failure that burned
// the Mac worker's SSH-spawned runs. The login session IS the requirement, and
// `HKCU\…\Run` is the ordinary surface that meets it.
//
// WHY IT IS A FLAG ON `install` AND NOT A FIFTH VERB. The act is part of installing; a
// separate `aof mesh desktop autostart` would be a second door to one act.
// ─────────────────────────────────────────────────────────────────────────────

// The Run key and the ONE value name this verb owns. A Run value under any other name
// is not this verb's business in either direction — spelled once so the write and the
// removal cannot disagree.
export const AUTOSTART_RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
export const AUTOSTART_VALUE_NAME = "aof-mesh-desktop";

// `reg`'s sentence for "there was no such value". The ONE stderr text that turns a
// non-zero exit into a success — every other `ERROR:` line is a genuine fault
// (measured 2026-09-08 on the control node).
const REG_ABSENT_SENTENCE = "The system was unable to find the specified registry key or value";

// Which autostart act the flags ask for — `"write"`, `"remove"`, or `null` for neither.
//
// `parseSpecArgv` has NO `--no-` negation: a boolean flag sets `options[key] = true`,
// and `--no-autostart` camelCases to `noAutostart`, which is therefore its own declared
// boolean. Nothing downstream resolves the contradiction, so this does — loudly, and
// on the INPUT, rather than letting flag order decide.
export function resolveAutostartAction(input = {}) {
  const write = input.autostart === true;
  const remove = input.noAutostart === true;
  if (write && remove) {
    throw refuse(
      "autostart-flags-conflict",
      "`--autostart` and `--no-autostart` ask for opposite things. Pass exactly one of them.",
    );
  }
  if (write) return "write";
  if (remove) return "remove";
  return null;
}

// The platform admission — EXACT, and decided on the input ahead of the artifact check
// and the placement, which is the only reason "nothing was placed" is true of a
// refusal on a host where the artifacts do resolve.
//
// Admission is never case-folded and never falls back to the host: a default parameter
// fills only `undefined` and `??` only null-ish, so the empty string reaches here as
// itself and is refused by name rather than quietly becoming `process.platform`.
function admitAutostartPlatform(platform) {
  if (platform === "win32") return;
  const named = typeof platform === "string" && platform.length > 0 ? `\`${platform}\`` : "unset";
  throw refuse(
    "autostart-unsupported-platform",
    `Login autostart is Windows-only and this platform is ${named}. The desktop supervisor ships for Windows; nothing was registered.`,
  );
}

// applyAutostart({ action, platform, installDir, runner, dryRun }) -> the autostart
// result, or throws a coded refusal.
//
// Both invocations carry `/f`. Without it `reg add` on an existing value PROMPTS
// (`Value … exists, overwrite(Yes/No)?`) and `reg delete` asks to confirm — neither is
// an error a fake runner can show, and both hang a CLI that has no console to answer
// them.
export async function applyAutostart(options = {}) {
  const { action } = options;
  if (action == null) return null;

  admitAutostartPlatform(options.platform);

  const installDir = options.installDir;
  const data = path.join(installDir, DESKTOP_APP_EXE);
  const shape = {
    action,
    key: AUTOSTART_RUN_KEY,
    valueName: AUTOSTART_VALUE_NAME,
    ...(action === "write" ? { data } : {}),
  };

  if (options.dryRun === true) {
    return { ...shape, dryRun: true, changed: false };
  }

  const run = typeof options.runner === "function" ? options.runner : defaultRunner();
  const argv =
    action === "write"
      ? ["add", AUTOSTART_RUN_KEY, "/v", AUTOSTART_VALUE_NAME, "/t", "REG_SZ", "/d", data, "/f"]
      : ["delete", AUTOSTART_RUN_KEY, "/v", AUTOSTART_VALUE_NAME, "/f"];

  let answer;
  try {
    answer = await run("reg", argv);
  } catch (error) {
    throw autostartFault(action, { code: null, stderr: error?.message ?? "" });
  }

  const code = answer?.code;
  if (code === 0) {
    return { ...shape, dryRun: false, changed: true };
  }

  // ABSENT IS NOT BROKEN — the one fault that is a success, and it is decided on the
  // code AND the sentence. A removal that succeeded on any exit-1 would swallow
  // `Access is denied.` as "there was nothing to remove".
  const stderr = typeof answer?.stderr === "string" ? answer.stderr : "";
  if (action === "remove" && code === 1 && stderr.includes(REG_ABSENT_SENTENCE)) {
    return { ...shape, dryRun: false, changed: false, alreadyAbsent: true };
  }

  throw autostartFault(action, { code, stderr });
}

// The coded refusal for a registry fault, carrying what the runner actually said — a
// spawn fault (`code: -1`) says `reg` could not be run, an answer with no `code` at all
// is a fault rather than a silent success, and a stack trace never reaches the operator.
function autostartFault(action, { code, stderr }) {
  const which = action === "write" ? "autostart-write-failed" : "autostart-remove-failed";
  const verb = action === "write" ? "register" : "remove";
  const said = typeof stderr === "string" ? stderr.trim() : "";
  if (code === -1 || code == null) {
    const why = code === -1 ? "`reg` could not be run" : "`reg` answered with no exit code";
    return refuse(which, `Could not ${verb} the login autostart entry: ${why}.${said ? ` ${said}` : ""}`);
  }
  return refuse(which, `Could not ${verb} the login autostart entry: \`reg\` exited ${code}.${said ? ` ${said}` : ""}`);
}

// The autostart line, naming the value and the key it touched — or would have. A
// dry-run says what it would do and that nothing changed; a removal that found nothing
// says so rather than claiming a change it did not make.
export function renderAutostart(autostart) {
  const where = `${autostart.valueName} under ${autostart.key}`;
  if (autostart.dryRun) {
    return autostart.action === "write"
      ? `Would register login autostart: ${where} = ${autostart.data}. Nothing was changed.`
      : `Would remove login autostart: ${where}. Nothing was changed.`;
  }
  if (autostart.action === "write") {
    return `Login autostart is registered: ${where} = ${autostart.data}.`;
  }
  return autostart.alreadyAbsent
    ? `There was nothing to remove — ${where} was not set.`
    : `Login autostart removed: ${where}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// The registered Commands: `aof mesh desktop install` / `aof mesh desktop run`
// (m42 wave (d) leg d1, wave-3 tail — formerly the CLI-only meshDesktopCommand
// nested face, retired with its local parser/envelope). NOT launcher verbs:
// install copies files and returns; run spawns the app DETACHED and returns —
// so both are plain class A three-word routes (the mesh:repo-publish
// precedent), and their --json probes stay hermetic in the bijection gate (no
// installed app in an isolated AOF_GLOBAL_HOME ⇒ a coded refusal, never a real
// launch). The no-verb/unknown-verb SHIM stays in cli.mjs's meshCommand (the
// repo-shim precedent — refusals a route cannot express). The retired face's
// ctx seams survive on run(input, ctx): env / spawnFn / artifact paths are
// injectable by the white-box tests through invoke(), with the input flags
// taking precedence exactly as the face's options did.
// ─────────────────────────────────────────────────────────────────────────────

export const meshDesktopInstallCommand = {
  id: "mesh:desktop-install",
  input: {
    type: "object",
    properties: {
      installDir: { type: "string" },
      appArtifact: { type: "string" },
      bootstrapperArtifact: { type: "string" },
      autostart: { type: "boolean" },
      noAutostart: { type: "boolean" },
      dryRun: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx = {}) {
    // TWO REFUSALS ARE DECIDED ON THE INPUT, before any act — the flag contradiction
    // and the platform admission. Neither reaches the artifact check, the install dir
    // or the registry, which is the only reason "nothing was placed" is true of a
    // refusal on a host where the artifacts DO resolve.
    const action = resolveAutostartAction(input);
    if (action != null) admitAutostartPlatform(ctx.platform ?? process.platform);

    const dryRun = input.dryRun === true;

    // A coded refusal from the core (app-artifact-missing / install-dir-not-writable /
    // desktop-app-running) THROWS — the face's one envelope applies.
    const installed = await installDesktopApp({
      installDir: input.installDir ?? ctx.installDir,
      env: ctx.env,
      appArtifactPath: input.appArtifact ?? ctx.appArtifactPath,
      bootstrapperArtifactPath: input.bootstrapperArtifact ?? ctx.bootstrapperArtifactPath,
      isWritableDirFn: ctx.isWritableDirFn,
      dryRun,
    });

    const autostart = await applyAutostart({
      action,
      platform: ctx.platform ?? process.platform,
      installDir: installed.installDir,
      runner: ctx.runner,
      dryRun,
    });

    // The preflight rides the SUCCESS answer only, so a refusal above carried its
    // `{ ok, error, code }` envelope unchanged and no probe was spawned behind it.
    const preflight = await runPreflight(preflightSeams(ctx));

    return {
      ...installed,
      ...(dryRun ? { dryRun: true } : {}),
      ...(autostart != null ? { autostart } : {}),
      preflight,
    };
  },

  cli: {
    route: ["mesh", "desktop", "install"],
    spec: {
      usage:
        "aof mesh desktop install [--app-artifact <path>] [--bootstrapper-artifact <path>] [--install-dir <dir>] [--autostart|--no-autostart] [--dry-run] [--json]",
      workspace: false,
      flags: {
        appArtifact: { type: "string", description: "path to the packaged desktop app artifact" },
        bootstrapperArtifact: { type: "string", description: "path to the WebView2 bootstrapper artifact" },
        installDir: { type: "string", description: "override the per-user install dir" },
        // Two DECLARED booleans, because the face has no `--no-` negation: `--no-autostart`
        // camelCases to `noAutostart`, and the pair is a contradiction the verb refuses.
        autostart: { type: "boolean", description: "register the app to start at this account's login" },
        noAutostart: { type: "boolean", description: "remove the login autostart entry" },
        dryRun: { type: "boolean", description: "report what would be installed and registered, and change nothing" },
      },
    },

    argv: (positionals, options) => {
      guardMeshPositionals("desktop install", positionals);
      return {
        ...(options.installDir !== undefined ? { installDir: options.installDir } : {}),
        ...(options.appArtifact !== undefined ? { appArtifact: options.appArtifact } : {}),
        ...(options.bootstrapperArtifact !== undefined ? { bootstrapperArtifact: options.bootstrapperArtifact } : {}),
        ...(options.autostart ? { autostart: true } : {}),
        ...(options.noAutostart ? { noAutostart: true } : {}),
        ...(options.dryRun ? { dryRun: true } : {}),
      };
    },

    render: (result) => {
      const lines = [];
      lines.push(
        result.dryRun
          ? `Would install the desktop app into ${result.installDir}. Nothing was changed — drop --dry-run to do it.`
          : `Installed the desktop app into ${result.installDir}.`,
      );
      if (result.autostart) lines.push(renderAutostart(result.autostart));
      lines.push("Preflight:", ...renderPreflight(result.preflight));
      return lines.join("\n");
    },

    json: (result) => ({ ok: true, ...result }),
  },
};

export const meshDesktopRunCommand = {
  id: "mesh:desktop-run",
  input: {
    type: "object",
    properties: {
      installDir: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx = {}) {
    // Discovery refusals (desktop-not-installed / desktop-not-runnable) THROW —
    // the face envelopes them; a successful launch is DETACHED and this run
    // returns immediately (never a long-lived body — not a launcher-seam verb).
    const launched = await launchDesktopApp({
      installDir: input.installDir ?? ctx.installDir,
      env: ctx.env,
      spawnFn: ctx.spawnFn,
    });

    // BOTH verbs report the preflight, identically (ADR-007 §4, alternative (d)): a
    // check nobody runs is prose, and `run` is the verb an operator actually types at
    // every relaunch. A failing check does not refuse either verb.
    const preflight = await runPreflight(preflightSeams(ctx));

    return { ...launched, preflight };
  },

  cli: {
    route: ["mesh", "desktop", "run"],
    spec: {
      usage: "aof mesh desktop run [--install-dir <dir>] [--json]",
      workspace: false,
      flags: {
        installDir: { type: "string", description: "override the per-user install dir" },
      },
    },

    argv: (positionals, options) => {
      guardMeshPositionals("desktop run", positionals);
      return {
        ...(options.installDir !== undefined ? { installDir: options.installDir } : {}),
      };
    },

    render: (result) =>
      [`Launched the desktop app (${result.appPath}).`, "Preflight:", ...renderPreflight(result.preflight)].join("\n"),

    json: (result) => ({ ok: true, ...result }),
  },
};

export const meshDesktopStopCommand = {
  id: "mesh:desktop-stop",
  input: {
    type: "object",
    properties: {
      dryRun: { type: "boolean" },
    },
    additionalProperties: false,
  },

  async run(input, ctx = {}) {
    // `desktop-stop-failed` THROWS and the face envelopes it. "Already stopped"
    // is a SUCCESS, not a refusal — a stop verb whose job is already done has
    // nothing to complain about, and a deploy script must be able to run it
    // unconditionally.
    return await stopDesktopApp({
      dryRun: input.dryRun === true,
      platform: ctx.platform,
      listFn: ctx.listFn,
      killFn: ctx.killFn,
    });
  },

  cli: {
    route: ["mesh", "desktop", "stop"],
    spec: {
      usage: "aof mesh desktop stop [--dry-run] [--json]",
      workspace: false,
      flags: {
        dryRun: { type: "boolean", description: "report what would be stopped and terminate nothing" },
      },
    },

    argv: (positionals, options) => {
      guardMeshPositionals("desktop stop", positionals);
      return {
        ...(options.dryRun ? { dryRun: true } : {}),
      };
    },

    render: (result) => {
      if (result.alreadyStopped) return "The desktop app is not running.";
      if (result.dryRun) {
        return `Would stop the desktop app (pid ${result.wouldStop.join(", ")}) and, with it, its supervised daemons. Nothing was stopped — drop --dry-run to do it.`;
      }
      return `Stopped the desktop app (pid ${result.stopped.join(", ")}); its supervised daemons are reaped with it.`;
    },

    json: (result) => ({ ok: true, ...result }),
  },
};
