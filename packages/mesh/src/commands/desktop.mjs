import { access, constants as fsConstants, copyFile, cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { guardMeshPositionals } from "./face-shared.mjs";
import {
  AUTOSTART_RUN_KEY,
  AUTOSTART_VALUE_NAME,
  DESKTOP_APP_EXE,
  LAUNCH_AGENT_LABEL,
  WEBVIEW2_BOOTSTRAPPER,
  bundleExecutable,
  desktopLayout,
  resolveDesktopInstallDir,
} from "./desktop-layout.mjs";
// The names live in the layout module (175/ADR-002 §5); these re-exports keep the binding's
// `commandTools` shape what it was.
export { AUTOSTART_RUN_KEY, AUTOSTART_VALUE_NAME, DESKTOP_APP_EXE, WEBVIEW2_BOOTSTRAPPER };

// Core supplies configured services; constructing command definitions performs no I/O.
export function createMeshDesktopCommands({ defaultRunner, preflightSeams, renderPreflight, runPreflight }) {
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
// The preflight is its OWN module (126/06 post-hoc review): these two verbs REPORT it and
// nothing here decides it. `defaultRunner` lives there too — one spawn seam, injectable
// end to end, reached by the autostart act and the process discovery below as well.

// The desktop app's names and the install-dir derivation live in `desktop-layout.mjs`
// (175/ADR-002 §5), so install/run/stop and `install-local` agree on exactly what "the
// installed app" means on each platform.

// The layout for one call: the platform is an input (`options.platform`, else the host's),
// and so is the home the LaunchAgent sits under, so every darwin leg runs on any host.
function layoutFor(options = {}) {
  return desktopLayout({
    platform: options.platform ?? process.platform,
    installDir: resolveDesktopInstallDir(options),
    home: options.home ?? os.homedir(),
  });
}

// Whether this HOST's filesystem carries POSIX execute bits. Windows reports none, so there a
// present file is the runnable signal; this is a property of the disk being read, not of the
// platform being installed for, which is why it reads the host.
function hostHasExecuteBits() {
  return process.platform !== "win32";
}

async function isExecutableFile(target) {
  try {
    const stats = await stat(target);
    return stats.isFile() && (!hostHasExecuteBits() || (stats.mode & 0o111) !== 0);
  } catch {
    return false;
  }
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
async function installDesktopApp(options = {}) {
  const layout = layoutFor(options);
  if (layout.platform === "darwin") return await installDesktopBundle(options, layout);
  const installDir = layout.installDir;
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
      appPath: layout.placed,
      bootstrapperPath: layout.bootstrapper,
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

    const appPath = layout.placed;
    const bootstrapperPath = layout.bootstrapper;
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

// installDesktopBundle(options, layout) — the darwin install (175/ADR-003 §1): the
// `--app-artifact` is an `.app` directory, placed whole by the same stage-then-swap, and no
// bootstrapper is asked for, because WebView2 is a Windows requirement. A bundle with no
// executable inside is the same `app-artifact-missing` refusal as a missing exe, decided before
// anything is staged.
async function installDesktopBundle(options, layout) {
  const { installDir, placed } = layout;
  const checkWritable = typeof options.isWritableDirFn === "function" ? options.isWritableDirFn : isWritableDir;
  const missing = () =>
    refuse(
      "app-artifact-missing",
      "The packaged desktop app bundle is missing, or holds no Contents/MacOS executable. Re-build it (`node scripts/install-local.mjs --desktop`) and try again.",
    );
  const source = requireArtifactSource(options.appArtifactPath, "app-artifact-missing", missing().message);
  if (!(await isExecutableFile(bundleExecutable(source)))) throw missing();

  if (options.dryRun === true) {
    return { ok: true, dryRun: true, installDir, appPath: placed, placed: false };
  }

  const notWritable = () =>
    refuse(
      "install-dir-not-writable",
      `${installDir} is not writable. Fix write access to that folder (check permissions/ownership) and try again.`,
    );
  if (!(await checkWritable(installDir))) throw notWritable();

  const stageDir = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-desktop-install-"));
  try {
    const staged = path.join(stageDir, path.basename(placed));
    try {
      await cp(source, staged, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
    } catch {
      throw notWritable();
    }
    if (!(await checkWritable(installDir))) throw notWritable();
    try {
      await moveBundleInPlace(staged, placed);
    } catch {
      throw notWritable();
    }
    return { ok: true, installDir, appPath: placed, placed: true };
  } finally {
    await rm(stageDir, { recursive: true, force: true });
  }
}

// moveBundleInPlace(source, target) — a bundle is a directory, which `rename` will not move
// over a non-empty one, so a live bundle is renamed aside to `<bundle>.bak.<ts>` first: a
// running app keeps its mapped image, and `install-local` prunes the backups (175/ADR-002 §3).
async function moveBundleInPlace(source, target) {
  let backup = null;
  if (await pathExists(target)) {
    backup = `${target}.bak.${backupStamp()}`;
    for (let n = 2; await pathExists(backup); n += 1) backup = `${target}.bak.${backupStamp()}-${n}`;
    await rename(target, backup);
  }
  try {
    try {
      await rename(source, target);
    } catch (error) {
      if (error?.code !== "EXDEV") throw error;
      await cp(source, target, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
      await rm(source, { recursive: true, force: true });
    }
  } catch (error) {
    // The new bundle did not land: put the live one back, so a failed install leaves the app
    // exactly where it was rather than not installed at all.
    await rm(target, { recursive: true, force: true });
    if (backup != null) await rename(backup, target);
    throw error;
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
async function discoverDesktopApp(options = {}) {
  const layout = layoutFor(options);
  if (layout.platform === "darwin") return await discoverDesktopBundle(layout);
  const appPath = layout.placed;

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
  if (hostHasExecuteBits()) {
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

// The darwin discovery: the bundle must be a directory, and its inner executable a runnable
// file. Anything else is the same not-runnable refusal, with a re-install hint.
async function discoverDesktopBundle({ placed, executable }) {
  let stats;
  try {
    stats = await stat(placed);
  } catch {
    throw refuse("desktop-not-installed", "The desktop app is not installed. Run `aof mesh desktop install` first.");
  }
  if (!stats.isDirectory() || !(await isExecutableFile(executable))) {
    throw refuse(
      "desktop-not-runnable",
      "The installed desktop app is not runnable (it may be corrupt). Re-run `aof mesh desktop install` to repair it.",
    );
  }
  return executable;
}

// launchDesktopApp(options) -> { ok:true, pid, appPath } — discovers the installed
// app then launches it DETACHED (the aof house detached-spawn idiom): stdio
// ignored, unref()'d, so the CLI process can exit/resolve without waiting on the
// long-lived app. `options.spawnFn` is the injected seam (mirrors
// mesh-fabric.mjs's injected exec closure) — defaults to the real
// child_process.spawn; a test injects a fixture-executable spawn to assert the
// SHAPE (detached, argv, resolved absolute path) without starting a real window.
async function launchDesktopApp(options = {}) {
  // Discovery comes FIRST on every platform: an uninstalled app is refused before launchd is
  // asked anything, so the bijection gate's `--json` probe in an isolated home never reaches
  // the operator's real LaunchAgent (175/02 PLAN, known traps).
  const appPath = await discoverDesktopApp(options);
  const layout = layoutFor(options);
  if (layout.platform === "darwin") {
    const viaLaunchd = await launchThroughLaunchd(options, layout);
    if (viaLaunchd != null) return { ...viaLaunchd, appPath };
    const env = options.env ?? process.env;
    if (typeof env.SSH_CONNECTION === "string" && env.SSH_CONNECTION.length > 0) {
      throw refuse(
        "desktop-run-needs-gui-session",
        "This is an SSH session, and an app started from it would run outside your login session, where `claude` is signed out. Register the app once from the Mac with `aof mesh desktop install --autostart`, and `run` will start it through launchd from here.",
      );
    }
  }
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

  return { ok: true, pid: child?.pid ?? null, appPath, launch: "spawn" };
}

// launchThroughLaunchd(options, layout) -> the launch answer when launchd started the app, or
// null when no LaunchAgent is registered (175/ADR-003 §2). A loaded job is kickstarted; a plist
// on disk that is not loaded is bootstrapped, which starts it (RunAtLoad). launchd starts the job
// inside the login session even when asked from SSH. Every `launchctl` goes through the one
// injected runner.
async function launchThroughLaunchd(options, layout) {
  const run = typeof options.runner === "function" ? options.runner : defaultRunner();
  const uid = options.uid ?? process.getuid?.();
  const domain = `gui/${uid}`;
  const service = `${domain}/${LAUNCH_AGENT_LABEL}`;

  const loaded = (await run("launchctl", ["print", service]))?.code === 0;
  let argv;
  if (loaded) argv = ["kickstart", service];
  else if (await pathExists(layout.launchAgent)) argv = ["bootstrap", domain, layout.launchAgent];
  else return null;

  const answer = await run("launchctl", argv);
  if (answer?.code !== 0) {
    const said = typeof answer?.stderr === "string" ? answer.stderr.trim() : "";
    throw refuse(
      "desktop-run-launchd-failed",
      `launchd did not start the desktop app: \`launchctl ${argv[0]}\` exited ${answer?.code ?? "with no code"}.${said ? ` ${said}` : ""}`,
    );
  }
  return { ok: true, pid: null, launch: "launchd", service };
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

// The supervisor's process name per platform, from the layout (175/ADR-002 §5).
function desktopProcessName(platform = process.platform) {
  return desktopLayout({ platform, installDir: "", home: "" }).processName;
}

// Parse `tasklist /NH /FO CSV` output -> [pid]. Tolerates the "INFO: No tasks…"
// line tasklist prints (on STDOUT, exit 0) when nothing matches.
function parseTasklistPids(stdout = "") {
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
function parsePgrepPids(stdout = "") {
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

// findDesktopProcesses(options) -> [pid] — the running supervisors, newest last.
async function findDesktopProcesses(options = {}) {
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
async function stopDesktopApp(options = {}) {
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
  const signalled = [];
  const failed = [];
  for (const pid of pids) {
    const { code } =
      platform === "win32"
        ? await kill("taskkill", ["/PID", String(pid), "/T", "/F"])
        : await kill("kill", ["-TERM", String(pid)]);
    if (code === 0) signalled.push(pid);
    else failed.push(pid);
  }

  if (signalled.length === 0) {
    throw refuse(
      "desktop-stop-failed",
      `Found the desktop app (pid ${failed.join(", ")}) but could not stop it — it may be running as another user or elevated. Re-run this from the same account that launched it.`,
    );
  }

  // Off Windows SIGTERM is a graceful Quit that reaps the daemons (175/ADR-001 §4), so the verb
  // waits for each pid to go before it answers: a `stop` that returned early would let the next
  // `run` hand off to a dying instance and leave nothing running (RESEARCH M10). It never
  // escalates — a pid that outlives the wait is refused by name and left running (ADR-003 §3).
  const stopped = platform === "win32" ? signalled : await awaitExit(signalled, kill, options);

  return { ok: true, stopped, alreadyStopped: false, dryRun: false, failed, processName: desktopProcessName(platform) };
}

// How long `stop` waits for a SIGTERM'd supervisor to exit: the 5 s reap grace plus headroom
// (175/ADR-003 §3, 175/02 Q1), polled.
const STOP_WAIT_MS = 20_000;
const STOP_POLL_MS = 250;

// awaitExit(pids, run, options) -> the pids, once every one is gone; throws
// `desktop-stop-timeout` naming any still alive when the wait runs out. Liveness is
// `kill -0 <pid>` through the same injected runner; the clock and the sleep are injectable too.
async function awaitExit(pids, run, options = {}) {
  const now = typeof options.nowFn === "function" ? options.nowFn : Date.now;
  const sleep = typeof options.sleepFn === "function" ? options.sleepFn : (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const deadline = now() + STOP_WAIT_MS;
  let alive = [...pids];
  for (;;) {
    const still = [];
    for (const pid of alive) {
      if ((await run("kill", ["-0", String(pid)]))?.code === 0) still.push(pid);
    }
    alive = still;
    if (alive.length === 0) return pids;
    if (now() >= deadline) {
      throw refuse(
        "desktop-stop-timeout",
        `Asked the desktop app (pid ${alive.join(", ")}) to quit, and it was still running ${STOP_WAIT_MS / 1000} s later. It was left running; quit it from its menu-bar menu, then re-run this.`,
      );
    }
    await sleep(Math.min(STOP_POLL_MS, Math.max(0, deadline - now())));
  }
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
function resolveAutostartAction(input = {}) {
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
  if (platform === "win32" || platform === "darwin") return;
  const named = typeof platform === "string" && platform.length > 0 ? `\`${platform}\`` : "unset";
  throw refuse(
    "autostart-unsupported-platform",
    `Login autostart is for Windows and macOS, and this platform is ${named}. The desktop supervisor ships for those two; nothing was registered.`,
  );
}

// applyAutostart({ action, platform, installDir, runner, dryRun }) -> the autostart
// result, or throws a coded refusal.
//
// Both invocations carry `/f`. Without it `reg add` on an existing value PROMPTS
// (`Value … exists, overwrite(Yes/No)?`) and `reg delete` asks to confirm — neither is
// an error a fake runner can show, and both hang a CLI that has no console to answer
// them.
async function applyAutostart(options = {}) {
  const { action } = options;
  if (action == null) return null;

  admitAutostartPlatform(options.platform);
  if (options.platform === "darwin") return await applyLaunchAgent(options);

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

// applyLaunchAgent(options) — the darwin autostart (175/ADR-004 §1-§2): write or delete the
// per-user LaunchAgent plist through an injected file seam. It never calls `launchctl`: the
// write registers the app for the next login and starts nothing, and the removal never stops a
// running app. A rewrite with the same content is no change, and an absent plist is a success.
async function applyLaunchAgent(options) {
  const { action, installDir } = options;
  const layout = desktopLayout({ platform: "darwin", installDir, home: options.home ?? os.homedir() });
  const files = { ...defaultLaunchAgentFiles, ...(options.files ?? {}) };
  const env = options.env ?? process.env;
  const shape = {
    action,
    label: LAUNCH_AGENT_LABEL,
    plistPath: layout.launchAgent,
    ...(action === "write" ? { executable: layout.executable, path: env.PATH ?? "" } : {}),
  };
  if (options.dryRun === true) return { ...shape, dryRun: true, changed: false };

  const prior = await files.read(layout.launchAgent);
  try {
    if (action === "remove") {
      if (prior == null) return { ...shape, dryRun: false, changed: false, alreadyAbsent: true };
      await files.remove(layout.launchAgent);
      return { ...shape, dryRun: false, changed: true };
    }
    // Loaded here, on the one path that renders a plist, so no other verb pays for the module.
    const { renderLaunchAgent } = await import("./desktop-launch-agent.mjs");
    const xml = renderLaunchAgent({ label: LAUNCH_AGENT_LABEL, executable: layout.executable, path: shape.path });
    if (prior === xml) return { ...shape, dryRun: false, changed: false };
    await files.write(layout.launchAgent, xml);
    return { ...shape, dryRun: false, changed: true };
  } catch (error) {
    const which = action === "write" ? "autostart-write-failed" : "autostart-remove-failed";
    const verb = action === "write" ? "write" : "remove";
    throw refuse(which, `Could not ${verb} the login autostart LaunchAgent ${layout.launchAgent}: ${error?.message ?? "the file seam failed"}.`);
  }
}

// The real file seam the LaunchAgent act writes through — a test hands in its own.
const defaultLaunchAgentFiles = {
  read: async (file) => {
    try {
      return await readFile(file, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  },
  write: async (file, text) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text, "utf8");
  },
  remove: async (file) => {
    await rm(file, { force: true });
  },
};

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
function renderAutostart(autostart) {
  if (autostart.plistPath) return renderLaunchAgentAutostart(autostart);
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

// The darwin autostart line, naming the LaunchAgent plist it wrote — or would have.
function renderLaunchAgentAutostart(autostart) {
  const where = `the LaunchAgent ${autostart.plistPath}`;
  if (autostart.dryRun) {
    return autostart.action === "write"
      ? `Would register login autostart: ${where}, starting ${autostart.executable}. Nothing was changed.`
      : `Would remove login autostart: ${where}. Nothing was changed.`;
  }
  if (autostart.action === "write") {
    return autostart.changed
      ? `Login autostart is registered: ${where}. It takes effect at your next login.`
      : `Login autostart was already registered: ${where}.`;
  }
  return autostart.alreadyAbsent
    ? `There was nothing to remove — ${where} was not there.`
    : `Login autostart removed: ${where}. A running app keeps running until you quit it.`;
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

const meshDesktopInstallCommand = {
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
    const platform = ctx.platform ?? process.platform;
    const installed = await installDesktopApp({
      platform,
      installDir: input.installDir ?? ctx.installDir,
      env: ctx.env,
      appArtifactPath: input.appArtifact ?? ctx.appArtifactPath,
      bootstrapperArtifactPath: input.bootstrapperArtifact ?? ctx.bootstrapperArtifactPath,
      isWritableDirFn: ctx.isWritableDirFn,
      dryRun,
    });

    const autostart = await applyAutostart({
      action,
      platform,
      installDir: installed.installDir,
      runner: ctx.runner,
      home: ctx.home,
      env: ctx.env,
      files: ctx.files,
      dryRun,
    });

    // The preflight rides the SUCCESS answer only, so a refusal above carried its
    // `{ ok, error, code }` envelope unchanged and no probe was spawned behind it. It is handed
    // the install dir this verb placed into, so `--install-dir` reaches the bundle it checks.
    const preflight = await runPreflight(preflightSeams({ ...ctx, installDir: installed.installDir }));

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

const meshDesktopRunCommand = {
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
      platform: ctx.platform,
      installDir: input.installDir ?? ctx.installDir,
      env: ctx.env,
      home: ctx.home,
      uid: ctx.uid,
      runner: ctx.runner,
      spawnFn: ctx.spawnFn,
    });

    // BOTH verbs report the preflight, identically (ADR-007 §4, alternative (d)): a
    // check nobody runs is prose, and `run` is the verb an operator actually types at
    // every relaunch. A failing check does not refuse either verb. The install dir is the one
    // this verb launched from, as on `install`.
    const preflight = await runPreflight(preflightSeams({ ...ctx, installDir: input.installDir ?? ctx.installDir }));

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
      [
        result.launch === "launchd"
          ? `Started the desktop app through launchd (${result.service}), in your login session.`
          : `Launched the desktop app (${result.appPath}).`,
        "Preflight:",
        ...renderPreflight(result.preflight),
      ].join("\n"),

    json: (result) => ({ ok: true, ...result }),
  },
};

const meshDesktopStopCommand = {
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
      nowFn: ctx.nowFn,
      sleepFn: ctx.sleepFn,
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

return { DESKTOP_APP_EXE, WEBVIEW2_BOOTSTRAPPER, resolveDesktopInstallDir, installDesktopApp, discoverDesktopApp, launchDesktopApp, desktopProcessName, parseTasklistPids, parsePgrepPids, findDesktopProcesses, stopDesktopApp, AUTOSTART_RUN_KEY, AUTOSTART_VALUE_NAME, resolveAutostartAction, applyAutostart, renderAutostart, meshDesktopInstallCommand, meshDesktopRunCommand, meshDesktopStopCommand };
}
