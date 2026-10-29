
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 36 / story 03, task 02_run-launch.feature —
// `aof mesh desktop run` discovers the installed app and launches it detached,
// refusing calmly when it is not installed.
//
// Exercises discoverDesktopApp/launchDesktopApp directly (packages/core/src/commands/mesh-
// desktop.mjs) over a FIXTURE install root with an injected $HOME. The detached
// spawn is asserted on SHAPE via an injected spawnFn (mirrors packages/core/src/mesh/fabric.mjs's
// injected-exec-closure idiom) — no real Tauri app is started, no window opens
// (the story's RESOLVED developer-amigo note).
import assert from "node:assert/strict";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const discoverDesktopApp = _aofApplication.mesh.commandTools.mesh.desktop.discoverDesktopApp;
const launchDesktopApp = _aofApplication.mesh.commandTools.mesh.desktop.launchDesktopApp;
const DESKTOP_APP_EXE = _aofApplication.mesh.commandTools.mesh.desktop.DESKTOP_APP_EXE;
// m42 wave (d) leg d1 (wave-3 tail) — the CLI face is the registered
// mesh:desktop-run command through the ONE generic face. The success envelope is
// asserted at the core+adapter level (invoke with an injected spawnFn — the face
// cannot inject a fake spawn, and a face-level success would launch a REAL
// process); the refusal path drives runCommandFace whole (it refuses before any
// spawn).
const getCommand = _aofApplication.getCommand;
const invoke = _aofApplication.invoke;
const runCommandFace = _aofApplication.cli.runCommandFace;
import { withMeshDesktopFixture, seedInstalledApp } from "../../support/mesh-desktop-fixture.mjs";

// 175/02 — a fake launchd that MODELS one job, `com.aof.mesh.desktop` in `gui/501`, and records
// every command as one line. `print` exits 0 for a loaded job and 113 (launchd's "could not
// find service") otherwise; `bootstrap` loads the job.
function makeFakeLaunchd({ loaded = false } = {}) {
  const asked = [];
  let isLoaded = loaded;
  const runner = async (file, args) => {
    asked.push([file, ...args].join(" "));
    if (file !== "launchctl") return { stdout: "", stderr: "", code: -1 };
    const [verb] = args;
    if (verb === "print") return isLoaded ? { stdout: "state = running", stderr: "", code: 0 } : { stdout: "", stderr: "Could not find service", code: 113 };
    if (verb === "kickstart") return { stdout: "", stderr: "", code: isLoaded ? 0 : 113 };
    if (verb === "bootstrap") {
      isLoaded = true;
      return { stdout: "", stderr: "", code: 0 };
    }
    return { stdout: "", stderr: "Unrecognized subcommand", code: 64 };
  };
  return { runner, asked };
}

// 175/02 — an install dir holding an installed fixture bundle, with an injected home.
async function withDarwinInstall(fn) {
  await withMeshDesktopFixture(async (fixture) => {
    const bundle = path.join(fixture.installDir, "aof-mesh-desktop.app");
    const inner = path.join(bundle, "Contents", "MacOS", "AOF Desktop");
    await mkdir(path.dirname(inner), { recursive: true });
    await writeFile(inner, "fixture-bundle-exe", "utf8");
    await chmod(inner, 0o755);
    return await fn(fixture);
  }, { seedArtifacts: false });
}

async function captureConsole(run) {
  const logs = [];
  const errors = [];
  const origLog = console.log;
  const origError = console.error;
  const origExitCode = process.exitCode;
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));
  try {
    await run();
  } finally {
    console.log = origLog;
    console.error = origError;
    // The CLI face sets process.exitCode on a refusal — restore the test
    // runner's OWN process.exitCode so exercising a refusal path here never
    // leaks a non-zero exit code onto the node:test process itself.
    process.exitCode = origExitCode;
  }
  return { logs, errors };
}

// A fixture spawn recording exactly how it was called, standing in for the real
// Tauri .exe spawn — asserts the SHAPE (detached, argv, resolved absolute path),
// never actually starting a process.
function makeFixtureSpawn() {
  const calls = [];
  const spawnFn = (command, args, options) => {
    const child = {
      pid: 4242,
      unrefCalled: false,
      on(event) { /* the real code registers an 'error' handler; a no-op here */ },
      unref() { child.unrefCalled = true; },
    };
    calls.push({ command, args, options, child });
    return child;
  };
  return { spawnFn, calls };
}


// 126/04 — `run` REPORTS the preflight (ADR-007 §4), whose default probes spawn `claude`
// and open the projection store. Every invocation here injects inert ones, so this suite
// keeps reaching nothing on the real machine — the same discipline its fixture install dir
// already applies to the filesystem.
function inertPreflightCtx() {
  return {
    claudeFn: async () => ({ stdout: JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }), stderr: "", code: 0 }),
    buildInfoFn: () => ({ mode: "payload", buildId: "fixture.20260909T000000", installedAt: null }),
    workspacesFn: async () => ({ ok: true, workspaces: [], skipped: [] }),
    workspaceConfigFn: async () => ({}),
    // 126/06's two seams, inert here for the same reason as the three above.
    settingsFn: async () => ({ hooks: { PostToolUse: [{ hooks: [{ aofManaged: "claude-run-heartbeat", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs"] }] }] } }),
    hookFileFn: async () => true,
    bundleHookFn: () => ({ id: "claude-run-heartbeat", event: "PostToolUse" }),
    nodeId: "fixture-node",
    // 175/03 — the preflight's answer is pinned to Windows' four, so it reaches no darwin probe
    // on a Mac host either.
    platform: "win32",
  };
}

export const meshDesktopRunTests = [
  // Scenario: run discovers the installed app in $HOME/.aof/bin and launches it
  // detached.
  {
    name: "mesh-desktop-run/02 run discovers the installed app by absolute co-located path (no PATH search) and launches it as a detached spawn that returns immediately",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        await seedInstalledApp(installDir);
        const { spawnFn, calls } = makeFixtureSpawn();

        const result = await launchDesktopApp({ platform: "win32", installDir, spawnFn });
        assert.equal(result.ok, true, "ok:true reporting the launch");
        assert.equal(result.appPath, path.join(installDir, DESKTOP_APP_EXE), "discovered by absolute co-located path");

        assert.equal(calls.length, 1, "spawned exactly once");
        const call = calls[0];
        assert.equal(call.command, path.join(installDir, DESKTOP_APP_EXE), "the resolved absolute path is spawned directly — no PATH search / no shell string");
        assert.equal(call.options.detached, true, "launched detached");
        assert.equal(call.options.stdio, "ignore", "stdio ignored (a long-lived app, not piped to the CLI's own streams)");
        assert.equal(call.child.unrefCalled, true, "unref()'d so the CLI can exit/resolve without waiting on the long-lived app");
      });
    },
  },
  // Scenario: run before install is a calm, actionable refusal that names the
  // install verb, never a crash.
  {
    name: "mesh-desktop-run/02 run before install refuses calmly, names `aof mesh desktop install`, launches nothing",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const { spawnFn, calls } = makeFixtureSpawn();
        await assert.rejects(
          () => launchDesktopApp({ platform: "win32", installDir, spawnFn }),
          (error) => {
            assert.equal(error.code, "desktop-not-installed");
            assert.match(error.message, /aof mesh desktop install/, "names the install verb");
            return true;
          },
        );
        assert.equal(calls.length, 0, "nothing is launched");
      }, { seedArtifacts: false });
    },
  },
  // Scenario Outline: a present-but-unrunnable install is a coded refusal, never
  // a stack trace.
  {
    name: "mesh-desktop-run/02 discovery-failure matrix: runnable / never-installed / aof-only / not-runnable — each a coded outcome, never a stack trace",
    async run() {
      // Row 1: holds a runnable app executable -> discovers + launches detached.
      await withMeshDesktopFixture(async ({ installDir }) => {
        await seedInstalledApp(installDir);
        const { spawnFn, calls } = makeFixtureSpawn();
        const result = await launchDesktopApp({ platform: "win32", installDir, spawnFn });
        assert.equal(result.ok, true);
        assert.equal(calls.length, 1);
      });

      // Row 2: is empty (app never installed) -> refuses, names the install verb.
      await withMeshDesktopFixture(async ({ installDir }) => {
        await assert.rejects(() => discoverDesktopApp({ platform: "win32", installDir }), (error) => {
          assert.equal(error.code, "desktop-not-installed");
          assert.match(error.message, /aof mesh desktop install/);
          return true;
        });
      }, { seedAofBinary: false, seedArtifacts: false });

      // Row 3: holds only the aof binary (no desktop app placed yet) -> refuses,
      // names the install verb.
      await withMeshDesktopFixture(async ({ installDir }) => {
        await assert.rejects(() => discoverDesktopApp({ platform: "win32", installDir }), (error) => {
          assert.equal(error.code, "desktop-not-installed");
          assert.match(error.message, /aof mesh desktop install/);
          return true;
        });
      }, { seedArtifacts: false });

      // Row 4: holds an app file that is not executable / is corrupt -> refuses
      // with a coded not-runnable error (a re-install hint). (POSIX-only bit
      // check inside discoverDesktopApp; simulate "corrupt" as a directory in
      // the app's place, which is unrunnable on every platform.)
      await withMeshDesktopFixture(async ({ installDir }) => {
        const { mkdir } = await import("node:fs/promises");
        await mkdir(path.join(installDir, DESKTOP_APP_EXE), { recursive: true });
        await assert.rejects(() => discoverDesktopApp({ platform: "win32", installDir }), (error) => {
          assert.equal(error.code, "desktop-not-runnable");
          assert.match(error.message, /re-run `aof mesh desktop install`/i, "a re-install hint");
          return true;
        });
      });
    },
  },
  // POSIX-specific: a present file with no execute bit is the coded not-runnable
  // refusal (the "is corrupt" branch on a platform where the bit is meaningful).
  {
    name: "mesh-desktop-run/02 POSIX: a present app file with no execute bit is a coded not-runnable refusal, never a crash",
    async run() {
      if (process.platform === "win32") return; // the execute-bit check is POSIX-only (see the module's platform guard)
      await withMeshDesktopFixture(async ({ installDir }) => {
        await seedInstalledApp(installDir);
        await chmod(path.join(installDir, DESKTOP_APP_EXE), 0o644);
        await assert.rejects(() => discoverDesktopApp({ platform: "win32", installDir }), (error) => {
          assert.equal(error.code, "desktop-not-runnable");
          return true;
        });
      });
    },
  },
  // Command+adapter proof: mesh:desktop-run's registered run (an injected fake
  // spawn — no real process) returns the launch report, and its cli.json adapter
  // shapes the single { ok:true, ... } envelope the face prints under --json.
  {
    name: "mesh-desktop-run/02 the registered command reports the launch and its --json adapter shapes the single { ok:true, ... } envelope",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        await seedInstalledApp(installDir);
        const { spawnFn, calls } = makeFixtureSpawn();
        const command = getCommand("mesh:desktop-run");
        const result = await invoke("mesh:desktop-run", { installDir }, { platform: "win32", spawnFn, ...inertPreflightCtx() });
        assert.equal(calls.length, 1, "the injected spawn ran exactly once");
        const parsed = command.cli.json(result);
        assert.equal(parsed.ok, true);
        assert.equal(parsed.appPath, path.join(installDir, DESKTOP_APP_EXE));
      });
    },
  },
  // CLI-face refusal proof: `aof mesh desktop run --json` (not installed) is the
  // single { ok:false, error, code } envelope through the REAL routed face —
  // the refusal fires at discovery, before any spawn, so the whole face runs.
  // The plain face contract is the thrown coded error (bin/aof.mjs prints
  // error.message to stderr — one calm sentence, never a stack trace).
  {
    name: "mesh-desktop-run/02 the routed face's not-installed refusal is the single { ok:false, error, code } envelope, and a thrown one-sentence coded error otherwise",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const command = getCommand("mesh:desktop-run");
        const { logs } = await captureConsole(() => runCommandFace(command, ["--install-dir", installDir, "--json"]));
        assert.equal(logs.length, 1);
        const parsed = JSON.parse(logs[0]);
        assert.equal(parsed.ok, false);
        assert.equal(parsed.code, "desktop-not-installed");
        assert.match(parsed.error, /aof mesh desktop install/);

        await assert.rejects(
          () => runCommandFace(command, ["--install-dir", installDir]),
          (error) => {
            assert.equal(error.code, "desktop-not-installed");
            assert.doesNotMatch(error.message, /at\s+\S+\s+\(.*:\d+:\d+\)/, "no stack trace frame in the refusal message");
            return true;
          },
        );
      }, { seedArtifacts: false });
    },
  },

  // ── milestone 175 / story 02, task 01_run-starts-the-app-in-the-login-session.feature ──
  //
  // launchd is a FAKE that models the job `com.aof.mesh.desktop` in `gui/501`: `print` answers
  // whether it is loaded, `kickstart` starts a loaded one, `bootstrap` loads and starts it. The
  // home is injected, so the plist the verb looks for is the fixture's, never `~/Library`.

  // Scenario: E4 · a loaded LaunchAgent is kickstarted, and nothing is spawned
  {
    name: "175/02 task01 E4 · a loaded LaunchAgent is kickstarted, and nothing is spawned",
    async run() {
      await withDarwinInstall(async ({ installDir, home }) => {
        const launchd = makeFakeLaunchd({ loaded: true });
        const { spawnFn, calls } = makeFixtureSpawn();
        const result = await launchDesktopApp({ platform: "darwin", installDir, home, uid: 501, runner: launchd.runner, spawnFn, env: {} });
        assert.ok(launchd.asked.includes("launchctl kickstart gui/501/com.aof.mesh.desktop"), launchd.asked.join(" | "));
        assert.equal(calls.length, 0, "spawnFn was never called");
        assert.equal(result.launch, "launchd", "the answer names the launch as launchd");
      });
    },
  },

  // Scenario: E5 · a plist on disk that is not loaded is bootstrapped
  {
    name: "175/02 task01 E5 · a plist on disk that is not loaded is bootstrapped",
    async run() {
      await withDarwinInstall(async ({ installDir, home }) => {
        const plist = path.join(home, "Library", "LaunchAgents", "com.aof.mesh.desktop.plist");
        await mkdir(path.dirname(plist), { recursive: true });
        await writeFile(plist, "<plist/>", "utf8");
        const launchd = makeFakeLaunchd({ loaded: false });
        const { spawnFn, calls } = makeFixtureSpawn();
        const result = await launchDesktopApp({ platform: "darwin", installDir, home, uid: 501, runner: launchd.runner, spawnFn, env: {} });
        assert.ok(launchd.asked.includes(`launchctl bootstrap gui/501 ${plist}`), launchd.asked.join(" | "));
        assert.equal(calls.length, 0, "spawnFn was never called");
        assert.equal(result.launch, "launchd");
      });
    },
  },

  // Scenario: E6 · with no LaunchAgent, a GUI terminal spawns the bundle's executable detached
  {
    name: "175/02 task01 E6 · with no LaunchAgent, a GUI terminal spawns the bundle's executable detached",
    async run() {
      await withDarwinInstall(async ({ installDir, home }) => {
        const launchd = makeFakeLaunchd({ loaded: false });
        const { spawnFn, calls } = makeFixtureSpawn();
        const result = await launchDesktopApp({ platform: "darwin", installDir, home, uid: 501, runner: launchd.runner, spawnFn, env: {} });
        assert.equal(calls.length, 1, "spawnFn was called once");
        assert.equal(calls[0].command, path.join(installDir, "aof-mesh-desktop.app", "Contents", "MacOS", "AOF Desktop"));
        assert.equal(calls[0].options.detached, true, "detached");
        assert.equal(calls[0].options.stdio, "ignore", "stdio ignored");
        assert.ok(!launchd.asked.some((c) => /launchctl (kickstart|bootstrap)/.test(c)), "no kickstart or bootstrap was asked for");
        assert.equal(result.launch, "spawn");
      });
    },
  },

  // Scenario: E7 · with no LaunchAgent, SSH is refused and nothing starts
  {
    name: "175/02 task01 E7 · with no LaunchAgent, SSH is refused desktop-run-needs-gui-session and nothing starts",
    async run() {
      await withDarwinInstall(async ({ installDir, home }) => {
        const launchd = makeFakeLaunchd({ loaded: false });
        const { spawnFn, calls } = makeFixtureSpawn();
        await assert.rejects(
          launchDesktopApp({
            platform: "darwin", installDir, home, uid: 501, runner: launchd.runner, spawnFn,
            env: { SSH_CONNECTION: "10.0.0.5 51022 10.0.0.9 22" },
          }),
          (error) => {
            assert.equal(error.code, "desktop-run-needs-gui-session");
            assert.match(error.message, /aof mesh desktop install --autostart/, "the message names the way in from SSH");
            return true;
          },
        );
        assert.equal(calls.length, 0, "spawnFn was never called");
      });
    },
  },

  // Scenario: an uninstalled app is refused before launchd is asked anything
  {
    name: "175/02 task01 an uninstalled app is refused desktop-not-installed before launchd is asked anything",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, home }) => {
        const launchd = makeFakeLaunchd({ loaded: true });
        await assert.rejects(
          launchDesktopApp({ platform: "darwin", installDir, home, uid: 501, runner: launchd.runner, spawnFn: makeFixtureSpawn().spawnFn, env: {} }),
          (error) => error.code === "desktop-not-installed",
        );
        assert.deepEqual(launchd.asked, [], "the runner was asked for no launchctl command at all");
      }, { seedArtifacts: false });
    },
  },

  // Scenario: Windows still spawns the exe directly
  {
    name: "175/02 task01 Windows still spawns the exe directly, and launchd is never asked",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, home }) => {
        await seedInstalledApp(installDir);
        const launchd = makeFakeLaunchd({ loaded: true });
        const { spawnFn, calls } = makeFixtureSpawn();
        const result = await invoke("mesh:desktop-run", { installDir }, { platform: "win32", home, runner: launchd.runner, spawnFn, ...inertPreflightCtx() });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].command, path.join(installDir, DESKTOP_APP_EXE));
        assert.deepEqual(launchd.asked, [], "no launchctl command");
        assert.equal(result.launch, "spawn");
      });
    },
  },
];
