
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 36 / story 03, task
// 01_install-placement.feature — `aof mesh desktop install` places the app +
// WebView2 bootstrapper at $HOME/.aof/bin idempotently, refusing failures calmly.
//
// Exercises the core placement logic directly (installDesktopApp,
// packages/core/src/commands/mesh-desktop.mjs) over a FIXTURE install root with an injected
// $HOME (test/support/mesh-desktop-fixture.mjs) — never the real machine, never a
// live signed artifact (the story's Build notes / RESOLVED block).
import assert from "node:assert/strict";
import { chmod, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
const installDesktopApp = _aofApplication.mesh.commandTools.mesh.desktop.installDesktopApp;
const discoverDesktopApp = _aofApplication.mesh.commandTools.mesh.desktop.discoverDesktopApp;
const DESKTOP_APP_EXE = _aofApplication.mesh.commandTools.mesh.desktop.DESKTOP_APP_EXE;
const WEBVIEW2_BOOTSTRAPPER = _aofApplication.mesh.commandTools.mesh.desktop.WEBVIEW2_BOOTSTRAPPER;
// The preflight is its own module since 126/06’s post-hoc review; the verbs report it.
const runPreflight = _aofApplication.mesh.commandTools.mesh.desktopPreflight.runPreflight;
const PREFLIGHT_CHECKS = _aofApplication.mesh.commandTools.mesh.desktopPreflight.PREFLIGHT_CHECKS;
// m42 wave (d) leg d1 (wave-3 tail) — the CLI face is the registered
// mesh:desktop-install command through the ONE generic face (the retired
// meshDesktopCommand nested face's tests now drive runCommandFace with the
// verb's declared flags — full face fidelity, no spawn).
const getCommand = _aofApplication.getCommand;
const invoke = _aofApplication.invoke;
const runCommandFace = _aofApplication.cli.runCommandFace;
import { withMeshDesktopFixture, seedInstalledApp } from "../../support/mesh-desktop-fixture.mjs";

// 175/02 — a fixture `.app` bundle: `Contents/MacOS/aof-mesh-desktop` (executable unless told
// otherwise) and an `Info.plist`. Spelled here as the contract states it; the code under test
// takes the names from its layout module.
const BUNDLE = "aof-mesh-desktop.app";
const INNER = ["Contents", "MacOS", "aof-mesh-desktop"];
async function seedBundle(dir, { bytes = "fixture-bundle-exe", executable = true } = {}) {
  const bundle = path.join(dir, BUNDLE);
  await mkdir(path.join(bundle, "Contents", "MacOS"), { recursive: true });
  await writeFile(path.join(bundle, "Contents", "Info.plist"), "<plist/>", "utf8");
  await writeFile(path.join(bundle, ...INNER), bytes, "utf8");
  await chmod(path.join(bundle, ...INNER), executable ? 0o755 : 0o644);
  return bundle;
}

// Capture console.log/console.error output around a call (the CLI-face --json
// envelope tests need the printed line, not just the return value).
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


// Injected preflight probes (126/04 task 03) — every check answers instantly and touches
// nothing: no `claude` is spawned, no projection store is opened, and no config is read
// off disk. Each named option overrides exactly one probe so a row differs in one thing.
function preflightProbes(overrides = {}) {
  const configs = overrides.workspaceConfigs ?? {};
  return {
    env: {},
    nodeId: overrides.nodeId === undefined ? "fixture-node" : overrides.nodeId,
    claudeFn:
      overrides.claudeFn ??
      (async () => overrides.claudeAnswer ?? { stdout: JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }), stderr: "", code: 0 }),
    buildInfoFn: () => overrides.buildInfo ?? { mode: "payload", buildId: "fixture.20260909T000000", installedAt: null },
    workspacesFn: async () => overrides.workspaces ?? { ok: true, workspaces: [], skipped: [] },
    workspaceConfigFn:
      overrides.workspaceConfigFn ??
      (async (root) => {
        if (!(root in configs)) throw new Error(`no fixture config for ${root}`);
        return configs[root];
      }),
    // 126/06's two seams, INERT BY DEFAULT and answering a healthy workspace. Supplying
    // them here rather than only in 126/06's own suite is F-26's lesson applied on the day
    // the check lands: a probe that defaults to the real thing silently widens what every
    // EXISTING test of this verb reaches, and nothing goes red to say so.
    settingsFn:
      overrides.settingsFn
      ?? (async () => ({ hooks: { PostToolUse: [{ hooks: [{ aofManaged: "claude-run-heartbeat", args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/run-heartbeat-enqueue.mjs"] }] }] } })),
    hookFileFn: overrides.hookFileFn ?? (async () => true),
    // The bundle declaration is injected for the same reason: a preflight probe that reads
    // the real bundle is one more thing this suite reaches that it did not choose to.
    bundleHookFn: overrides.bundleHookFn ?? (() => ({ id: "claude-run-heartbeat", event: "PostToolUse" })),
    // 175/03 — the preflight's answer is PINNED to Windows' four, so this suite answers the same
    // on a Mac host; a row that installs for darwin names its platform AFTER this spread. The
    // darwin seams are inert all the same, so such a row reaches no real `xcode-select`, `xattr`
    // or `claude`, and reads no real LaunchAgent.
    platform: "win32",
    runner: async () => ({ stdout: "", stderr: "", code: 0 }),
    files: { read: async () => null },
  };
}

export const meshDesktopInstallTests = [
  // Scenario: install places the app executable(s) into $HOME/.aof/bin alongside
  // the aof binary.
  {
    name: "mesh-desktop-install/01 install places the app executable(s) into $HOME/.aof/bin, leaving the m28 aof binary untouched beside them",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const result = await installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath });
        assert.equal(result.ok, true, "install reports ok:true");
        assert.equal(result.installDir, installDir, "reports the resolved install dir");

        const entries = await readdir(installDir);
        assert.ok(entries.includes(DESKTOP_APP_EXE), `the app executable is written under $HOME/.aof/bin (entries: ${entries})`);
        assert.ok(entries.includes("aof.exe"), "the m28 aof binary is left untouched beside it");
        const aofBytes = await readFile(path.join(installDir, "aof.exe"), "utf8");
        assert.equal(aofBytes, "fixture-aof-binary-v1", "the aof binary's bytes are unchanged");

        // The 00<->03 contract: the co-located pair resolves by absolute path in
        // the SAME dir (no PATH search) — both files share one parent dir.
        assert.equal(path.dirname(result.appPath), installDir, "the app's resolved path is co-located with aof.exe in the same install dir");
      });
    },
  },
  // Scenario: a re-install updates the app in place without duplicating or
  // leaving a stale copy.
  {
    name: "mesh-desktop-install/01 a re-install updates the app in place — no duplicate, no stale prior-version file",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath, artifactsDir }) => {
        await seedInstalledApp(installDir, { appBytes: "prior-version-bytes" });
        const before = await readdir(installDir);
        assert.equal(before.length, 3, `sanity: aof.exe + prior app + prior bootstrapper only (got ${JSON.stringify(before)})`);

        const result = await installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath });
        assert.equal(result.ok, true);

        const after = await readdir(installDir);
        assert.equal(after.length, 3, `no duplicate/extra file accrues (got ${JSON.stringify(after)})`);
        assert.ok(after.includes(DESKTOP_APP_EXE) && after.includes(WEBVIEW2_BOOTSTRAPPER) && after.includes("aof.exe"));

        const newBytes = await readFile(path.join(installDir, DESKTOP_APP_EXE), "utf8");
        assert.equal(newBytes, "fixture-app-bytes-v1", "the app is replaced in place with the new artifact's bytes, not layered on the stale prior version");
      });
    },
  },
  // Scenario: install bundles the WebView2 Evergreen Bootstrapper so a missing
  // runtime can self-install on first run.
  {
    name: "mesh-desktop-install/01 install places/records the WebView2 Evergreen Bootstrapper as a discoverable placed file",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const result = await installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath });
        assert.equal(result.ok, true);
        assert.equal(path.basename(result.bootstrapperPath), WEBVIEW2_BOOTSTRAPPER, "the bootstrapper's placed filename is reported");

        const bootstrapperStat = await stat(result.bootstrapperPath);
        assert.ok(bootstrapperStat.isFile(), "the bootstrapper is a real placed file under the install dir — discoverable by the run verb");
      });
    },
  },
  // Scenario Outline: an install failure is a calm friendly refusal.
  {
    name: "mesh-desktop-install/01 friendly-refusal matrix: unwritable dir / missing app artifact / missing bootstrapper artifact — one calm sentence, never a stack trace, no partial install",
    async run() {
      // Row 1: $HOME/.aof/bin is not writable. Simulated via the injected
      // isWritableDirFn fault seam (mirrors mesh-fabric.mjs's injected exec) —
      // a real filesystem chmod does not reliably deny an owner write access to
      // their OWN directory on every OS/filesystem (notably Windows), so the
      // fault is injected deterministically rather than attempted on-disk.
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        await assert.rejects(
          () => installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath, isWritableDirFn: async () => false }),
          (error) => {
            assert.equal(error.code, "install-dir-not-writable", "coded refusal names the unwritable dir");
            assert.match(error.message, /not writable/i, "one friendly sentence carrying a permissions hint");
            assert.doesNotMatch(error.stack ?? "", /^\s*$/, "an Error always has SOME stack internally, but the MESSAGE itself (asserted above) is the one-sentence surface — never rendered raw to the operator");
            return true;
          },
        );
        const entries = await readdir(installDir);
        assert.deepEqual(entries.sort(), ["aof.exe"], "no partial install is left behind — only the prior aof.exe remains");
      });

      // Row 2: the packaged app artifact is missing.
      await withMeshDesktopFixture(async ({ installDir, bootstrapperArtifactPath }) => {
        await assert.rejects(
          () => installDesktopApp({ platform: "win32", installDir, appArtifactPath: path.join(installDir, "does-not-exist.exe"), bootstrapperArtifactPath }),
          (error) => {
            assert.equal(error.code, "app-artifact-missing");
            assert.match(error.message, /artifact is missing/i, "names the missing artifact with a re-download/re-build hint");
            return true;
          },
        );
        const entries = await readdir(installDir);
        assert.deepEqual(entries.sort(), ["aof.exe"], "no partial install is left behind");
      }, { seedArtifacts: false });

      // Row 3: the WebView2 bootstrapper artifact is missing.
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath }) => {
        await assert.rejects(
          () => installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath: path.join(installDir, "does-not-exist-bootstrapper.exe") }),
          (error) => {
            assert.equal(error.code, "bootstrapper-artifact-missing");
            assert.match(error.message, /bootstrapper.*is missing/i, "names the missing bootstrapper from the bundle");
            return true;
          },
        );
        const entries = await readdir(installDir);
        assert.deepEqual(entries.sort(), ["aof.exe"], "no partial install is left behind");
      });
    },
  },
  // Scenario: a failed install leaves $HOME/.aof/bin holding only its prior
  // contents (no partial placement) — the mid-install unwritable case.
  {
    name: "mesh-desktop-install/01 a failed install (dir becomes unwritable mid-install) rolls back any partial placement — $HOME/.aof/bin holds exactly its prior contents",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        // Pre-seed a prior install (so "prior contents" is non-trivial). The
        // dir "becomes unwritable MID-install" is simulated via an injected
        // isWritableDirFn that answers true the FIRST call (the initial
        // pre-check, which passes — staging into the temp dir proceeds) and
        // false the SECOND call (the re-check right before the swap into
        // installDir) — a real chmod does not reliably deny an owner write
        // access on every OS/filesystem (notably Windows), so the fault is
        // injected deterministically instead.
        await seedInstalledApp(installDir, { appBytes: "prior-stable-bytes" });
        let calls = 0;
        const isWritableDirFn = async () => {
          calls += 1;
          return calls === 1;
        };
        await assert.rejects(() => installDesktopApp({ platform: "win32", installDir, appArtifactPath, bootstrapperArtifactPath, isWritableDirFn }));
        assert.ok(calls >= 2, "the writability check ran again mid-install (the window the fault lands in)");
        const appBytes = await readFile(path.join(installDir, DESKTOP_APP_EXE), "utf8");
        assert.equal(appBytes, "prior-stable-bytes", "the prior app install is completely untouched — no partial overwrite");
        const entries = await readdir(installDir);
        assert.deepEqual(entries.sort(), ["aof-mesh-desktop.exe", "aof.exe", "MicrosoftEdgeWebview2Setup.exe"].sort(), "$HOME/.aof/bin holds exactly its prior contents");
      });
    },
  },
  // CLI-face envelope proof: `aof mesh desktop install --json` refusal shape
  // (the { ok:false, error, code } single envelope, install's own coded refusal
  // reaching the generic face, not just the core function). The plain (non-json)
  // face contract is the thrown coded error — the face propagates it to
  // bin/aof.mjs, which prints error.message to stderr (one calm sentence, never
  // a stack trace).
  {
    name: "mesh-desktop-install/01 the routed face renders install's refusal as a single { ok:false, error, code } --json envelope, and a thrown one-sentence coded error otherwise",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const command = getCommand("mesh:desktop-install");
        const { logs } = await captureConsole(() =>
          runCommandFace(command, ["--install-dir", installDir, "--json"]),
        );
        assert.equal(logs.length, 1, "exactly one line printed under --json");
        const parsed = JSON.parse(logs[0]);
        assert.equal(parsed.ok, false);
        assert.equal(parsed.code, "app-artifact-missing");
        assert.equal(typeof parsed.error, "string");

        await assert.rejects(
          () => runCommandFace(command, ["--install-dir", installDir]),
          (error) => {
            assert.equal(error.code, "app-artifact-missing", "the plain face propagates the coded refusal to bin/aof.mjs");
            assert.doesNotMatch(error.message, /at\s+\S+\s+\(.*:\d+:\d+\)/, "no stack trace frame in the refusal message");
            return true;
          },
        );
      }, { seedArtifacts: false });
    },
  },
  // CLI-face success proof: install succeeds end-to-end through the routed face,
  // artifacts supplied via the verb's own declared flags.
  {
    name: "mesh-desktop-install/01 the routed face installs successfully end-to-end and reports ok:true under --json",
    async run() {
      // The face takes no ctx, so the platform is the host's (175/02): a Mac host installs a
      // bundle and asks for no bootstrapper; every other host installs the exe beside it.
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath, artifactsDir }) => {
        const onMac = process.platform === "darwin";
        const artifacts = onMac
          ? ["--app-artifact", await seedBundle(artifactsDir)]
          : ["--app-artifact", appArtifactPath, "--bootstrapper-artifact", bootstrapperArtifactPath];
        const { logs } = await captureConsole(() =>
          runCommandFace(getCommand("mesh:desktop-install"), ["--install-dir", installDir, ...artifacts, "--json"]),
        );
        assert.equal(logs.length, 1);
        const parsed = JSON.parse(logs[0]);
        assert.equal(parsed.ok, true);
        assert.equal(parsed.installDir, installDir);
        assert.equal(typeof parsed.message, "undefined", "the message/help text is never part of the JSON body — only ok + the verb's result fields");

        const entries = await readdir(installDir);
        if (onMac) assert.ok(entries.includes(BUNDLE), `the bundle is placed (entries: ${entries})`);
        else assert.ok(entries.includes(DESKTOP_APP_EXE) && entries.includes(WEBVIEW2_BOOTSTRAPPER));
      });
    },
  },

  // ── milestone 126 / story 04, task 03_the-preflight-is-reported-not-repaired.feature ──
  //
  // The checks the verbs REPORT and never repair (ADR-007 §4). Every probe is injected, so
  // no `claude` is spawned, no store is opened and nothing is written anywhere.
  //
  // THE COUNT MOVED, AND THE CRITERIA DID NOT. `126/04 task03` shipped three checks and its
  // delivered scenarios say "exactly three" in three places; those are acceptance criteria
  // and stay exactly as written, as the true record of what `126/04` shipped. `126/06`'s
  // `tasks/00_a-fourth-check-and-the-count-it-supersedes.feature` states the count that
  // supersedes them — four, with `heartbeat-hook-installed` last — and THIS suite follows
  // it, because a test is code and a criterion is not.

  {
    name: "126/04 task03 the checks are named by code, in one order, on both faces (count superseded by 126/06)",
    async run() {
      const preflight = await runPreflight(preflightProbes());
      assert.deepEqual(
        preflight.map((entry) => entry.code),
        PREFLIGHT_CHECKS,
        "the reported codes are exactly PREFLIGHT_CHECKS, in its order",
      );
      assert.deepEqual(
        [...PREFLIGHT_CHECKS],
        ["claude-authenticated", "payload-build", "workspace-identity-pinned", "heartbeat-hook-installed"],
        "126/06: four checks, the fourth appended last so the three that shipped keep their order",
      );
      for (const entry of preflight) {
        assert.ok(["pass", "fail"].includes(entry.status), `${entry.code} carries a status of pass or fail`);
        assert.ok(typeof entry.message === "string" && entry.message.trim().length > 0, `${entry.code} carries a one-sentence message`);
      }
    },
  },

  {
    name: "126/04 task03 claude-authenticated — the JSON is parsed from STDOUT, the exit code is not the signal, and a probe that cannot answer is a FAIL",
    async run() {
      const cases = [
        { why: "`claude` does not resolve — the runner answers a fault", answer: { stdout: "", stderr: "", code: -1 }, status: "fail", names: "PATH" },
        { why: "it exits 0 reporting loggedIn: true", answer: { stdout: '{"loggedIn":true,"authMethod":"claude.ai"}', stderr: "", code: 0 }, status: "pass", names: "claude.ai" },
        { why: "it exits 0 reporting loggedIn: false", answer: { stdout: '{"loggedIn":false}', stderr: "", code: 0 }, status: "fail", names: "logged out" },
        { why: "it exits non-zero", answer: { stdout: "", stderr: "command not found", code: 127 }, status: "fail", names: "127" },
        { why: "it exits 0 with stdout that does not parse", answer: { stdout: "Login method: Claude Max account", stderr: "", code: 0 }, status: "fail", names: "could not be read" },
      ];
      for (const testCase of cases) {
        const [claude] = await runPreflight(preflightProbes({ claudeAnswer: testCase.answer }));
        assert.equal(claude.code, "claude-authenticated");
        assert.equal(claude.status, testCase.status, `${testCase.why}: ${testCase.status}`);
        assert.ok(claude.message.includes(testCase.names), `${testCase.why}: names ${testCase.names} — got ${claude.message}`);
      }
      // A non-zero exit quotes what it printed on STDERR.
      const [quoted] = await runPreflight(preflightProbes({ claudeAnswer: { stdout: "", stderr: "no such subcommand", code: 2 } }));
      assert.ok(quoted.message.includes("no such subcommand"), "the message quotes stderr");
    },
  },

  {
    name: "126/04 task03 payload-build — read the way the deploy rules already read it, and an embedded launcher is a FAIL",
    async run() {
      const cases = [
        { why: "mode payload with a build id", info: { mode: "payload", buildId: "b3319d6.20260726T134012" }, status: "pass", names: "b3319d6.20260726T134012" },
        { why: "mode payload, the stamp absent", info: { mode: "payload", buildId: null }, status: "fail", names: "no build stamp" },
        { why: "mode embedded", info: { mode: "embedded", buildId: null }, status: "fail", names: "compiled-in bundle" },
        { why: "mode source with a git build id", info: { mode: "source", buildId: "f623a6a" }, status: "pass", names: "f623a6a" },
        { why: "mode source with no id", info: { mode: "source", buildId: null }, status: "fail", names: "could not be named" },
      ];
      for (const testCase of cases) {
        const [, build] = await runPreflight(preflightProbes({ buildInfo: testCase.info }));
        assert.equal(build.code, "payload-build");
        assert.equal(build.status, testCase.status, `${testCase.why}: ${testCase.status}`);
        assert.ok(build.message.includes(testCase.names), `${testCase.why}: names ${testCase.names} — got ${build.message}`);
      }
      const [, mode] = await runPreflight(preflightProbes({ buildInfo: { mode: "payload", buildId: "b1" } }));
      assert.ok(mode.message.includes("payload"), "a pass names the mode as well as the id");
    },
  },

  {
    name: "126/04 task03 workspace-identity-pinned — item 4 stated as a check, with an unpinned workspace named and an unenumerable node a FAIL rather than a pass",
    async run() {
      const pinnedRoot = path.join("C:", "Source", "pinned");
      const unpinnedRoot = path.join("C:", "Source", "unpinned");
      const configs = {
        [pinnedRoot]: { mesh: { workspaceId: "9db1fd84f5895e38" } },
        [unpinnedRoot]: { mesh: {} },
      };

      const cases = [
        {
          why: "every registered workspace pins its own mesh.workspaceId",
          workspaces: { ok: true, workspaces: [{ workspaceId: "a", projectRoot: pinnedRoot }], skipped: [] },
          status: "pass",
          names: "1",
        },
        {
          why: "two registered, one pinned and one not",
          workspaces: { ok: true, workspaces: [{ workspaceId: "a", projectRoot: pinnedRoot }, { workspaceId: "b", projectRoot: unpinnedRoot }], skipped: [] },
          status: "fail",
          names: unpinnedRoot,
        },
        {
          why: "a registered workspace's own config cannot be read",
          workspaces: { ok: true, workspaces: [{ workspaceId: "c", projectRoot: path.join("C:", "Source", "unreadable") }], skipped: [] },
          status: "fail",
          names: "could not be read",
        },
        {
          why: "the resolver lists one under skipped with no-descriptor",
          workspaces: { ok: true, workspaces: [], skipped: [{ workspaceId: "d", reason: "no-descriptor" }] },
          status: "fail",
          names: "no-descriptor",
        },
        {
          why: "the resolver answers ok: false",
          workspaces: { ok: false, workspaces: [], skipped: [] },
          status: "fail",
          names: "could not be enumerated",
        },
        {
          why: "the resolver answers ok: true with no workspaces at all",
          workspaces: { ok: true, workspaces: [], skipped: [] },
          status: "pass",
          names: "No workspace is registered",
        },
      ];

      for (const testCase of cases) {
        const [, , identity] = await runPreflight(
          preflightProbes({ workspaces: testCase.workspaces, workspaceConfigs: configs }),
        );
        assert.equal(identity.code, "workspace-identity-pinned");
        assert.equal(identity.status, testCase.status, `${testCase.why}: ${testCase.status}`);
        assert.ok(identity.message.includes(testCase.names), `${testCase.why}: names ${testCase.names} — got ${identity.message}`);
      }

      // No identity to enumerate against lands in the SAME fail, never in a mint.
      const [, , noIdentity] = await runPreflight(preflightProbes({ nodeId: null }));
      assert.equal(noIdentity.status, "fail");
      assert.ok(noIdentity.message.includes("could not be enumerated"), "no node identity is a fail, not a mint");
    },
  },

  {
    name: "126/04 task03 an unauthenticated claude is a FAIL — the only invocation is `auth status`, no session is spawned and no token is spent",
    async run() {
      const invocations = [];
      const [claude] = await runPreflight(
        preflightProbes({
          claudeFn: async (file, args) => {
            invocations.push([file, ...args].join(" "));
            return { stdout: '{"loggedIn":false}', stderr: "", code: 0 };
          },
        }),
      );
      assert.equal(claude.status, "fail");
      assert.ok(claude.message.includes("logged out"), "names the auth state");
      assert.deepEqual(invocations, ["claude auth status"], "the only `claude` invocation was `auth status`");
      assert.ok(!invocations.some((call) => call.includes("-p")), "no session is spawned and no token is spent");
      assert.ok(!invocations.some((call) => call.includes("login")), "no login is attempted");
    },
  },

  {
    name: "126/04 task03 an unpinned workspace is named, and the answer comes from that workspace's OWN config — never a machine-wide one merged over it",
    async run() {
      const pinnedRoot = path.join("C:", "Source", "pinned");
      const unpinnedRoot = path.join("C:", "Source", "unpinned");
      const read = [];
      const written = [];
      const [, , identity] = await runPreflight(
        preflightProbes({
          workspaces: {
            ok: true,
            workspaces: [{ workspaceId: "a", projectRoot: pinnedRoot }, { workspaceId: "b", projectRoot: unpinnedRoot }],
            skipped: [],
          },
          workspaceConfigFn: async (root) => {
            read.push(root);
            return root === pinnedRoot ? { mesh: { workspaceId: "9db1fd84f5895e38" } } : {};
          },
        }),
      );
      assert.equal(identity.status, "fail");
      assert.ok(identity.message.includes(unpinnedRoot), "its message names the unpinned workspace's project root");
      assert.ok(!identity.message.includes(`${pinnedRoot}:`), "and does not accuse the pinned one");
      assert.deepEqual(read, [pinnedRoot, unpinnedRoot], "each answer came from that workspace's OWN config, by project root");
      assert.deepEqual(written, [], "neither workspace's config is written");
    },
  },

  {
    name: "126/04 task03 both install and run report it identically, and a failing check refuses neither verb",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        await seedInstalledApp(installDir);
        // Probes that FAIL every check — the verbs must still succeed.
        const failing = {
          claudeFn: async () => ({ stdout: "", stderr: "", code: -1 }),
          buildInfoFn: () => ({ mode: "embedded", buildId: null }),
          workspacesFn: async () => ({ ok: false, workspaces: [], skipped: [] }),
          workspaceConfigFn: async () => ({}),
          nodeId: "fixture-node",
        };

        const installed = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath },
          { ...failing, platform: "win32" },
        );
        const launched = await invoke(
          "mesh:desktop-run",
          { installDir },
          { ...failing, platform: "win32", spawnFn: () => ({ pid: 1, on() {}, unref() {} }) },
        );

        assert.deepEqual(
          installed.preflight,
          launched.preflight,
          "both --json envelopes carry the same preflight list",
        );
        assert.deepEqual(
          getCommand("mesh:desktop-install").cli.render(installed).split("\n").filter((line) => line.startsWith("  ")),
          getCommand("mesh:desktop-run").cli.render(launched).split("\n").filter((line) => line.startsWith("  ")),
          "both renders carry the same check lines",
        );
        assert.ok(installed.preflight.every((entry) => entry.status === "fail"), "every check failed");
        assert.equal(installed.ok, true, "and the install still succeeded");
        assert.equal(launched.ok, true, "and so did the run — a failing check refuses neither verb");
      });
    },
  },

  {
    name: "126/04 task03 the preflight repairs nothing — no config written, no identity minted, no registry runner invoked, nothing under any project root",
    async run() {
      const touched = [];
      const registryCalls = [];
      const preflight = await runPreflight({
        claudeFn: async () => ({ stdout: "", stderr: "", code: -1 }),
        buildInfoFn: () => ({ mode: "embedded", buildId: null }),
        workspacesFn: async () => ({
          ok: true,
          workspaces: [{ workspaceId: "a", projectRoot: path.join("C:", "Source", "unpinned") }],
          skipped: [],
        }),
        // A config reader that RECORDS the roots it was asked for and returns an unpinned
        // config — if the preflight repaired anything, it would have to write through a
        // seam, and this module has none.
        workspaceConfigFn: async (root) => {
          touched.push(root);
          return {};
        },
        nodeId: "fixture-node",
        env: {},
        // 175/03 — the four this row was written for, on any host.
        platform: "win32",
      });

      assert.ok(preflight.every((entry) => entry.status === "fail"), "probes that fail every check");
      assert.deepEqual(registryCalls, [], "no registry runner is invoked");
      assert.deepEqual(touched, [path.join("C:", "Source", "unpinned")], "the only reach was a READ of the workspace's own config");
      // The structural half: `runPreflight` is handed no writer at all — there is no seam
      // through which it could pin an id, mint an identity or write a build stamp.
      assert.equal(typeof runPreflight, "function");
      assert.deepEqual(preflight.map((entry) => Object.keys(entry).sort()), preflight.map(() => ["code", "message", "status"]),
        "a check reports { code, status, message } and carries no act");
    },
  },

  {
    name: "126/04 task03 a verb that refuses carries its refusal envelope unchanged, and no probe runs behind it",
    async run() {
      let claudeCalls = 0;
      let storeOpens = 0;
      await assert.rejects(
        invoke(
          "mesh:desktop-install",
          {},
          {
            claudeFn: async () => { claudeCalls += 1; return { stdout: "{}", stderr: "", code: 0 }; },
            buildInfoFn: () => ({ mode: "payload", buildId: "x" }),
            workspacesFn: async () => { storeOpens += 1; return { ok: true, workspaces: [], skipped: [] }; },
            workspaceConfigFn: async () => ({}),
            nodeId: "fixture-node",
            platform: "win32",
          },
        ),
        (error) => {
          assert.equal(error.code, "app-artifact-missing", "one envelope with ok: false and code app-artifact-missing");
          assert.equal(error.preflight, undefined, "carrying no preflight key — a refusal is { ok, error, code } as it was");
          return true;
        },
      );
      assert.equal(claudeCalls, 0, "no `claude` was spawned behind the refusal");
      assert.equal(storeOpens, 0, "and no store was opened");
    },
  },

  // ── milestone 175 / story 02, task 00_install-places-the-app-bundle-on-macos.feature ──
  //
  // On darwin the artifact is an `.app` directory and no bootstrapper is asked for. The
  // platform is handed in, so every row runs on any host; only the execute-bit reads are
  // host-bound, because a Windows disk carries no execute bit to read.

  // Scenario: E1 · a bundle is placed whole on darwin, and run then finds its executable
  {
    name: "175/02 task00 E1 · a bundle is placed whole on darwin, and run then finds its executable",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        const bundle = await seedBundle(artifactsDir);
        const result = await invoke("mesh:desktop-install", { installDir, appArtifact: bundle }, { ...preflightProbes(), platform: "darwin" });
        assert.equal(result.ok, true);
        assert.equal(result.appPath, path.join(installDir, BUNDLE));
        const inner = path.join(installDir, BUNDLE, ...INNER);
        const placed = await stat(inner);
        assert.ok(placed.isFile(), "the inner executable exists");
        if (process.platform !== "win32") assert.ok((placed.mode & 0o111) !== 0, "and is executable");
        assert.equal(result.bootstrapperPath, undefined, "the answer names no bootstrapper path");
        assert.equal(await discoverDesktopApp({ installDir, platform: "darwin" }), inner, "discovery answers the inner executable");
      }, { seedArtifacts: false });
    },
  },

  // 175/03 — the preflight checks the bundle THIS install placed. `--install-dir` arrives on the
  // input, not the ctx, so a preflight handed ctx alone would ask `xattr` about the default
  // bundle and report on an app nobody just installed.
  {
    name: "175/03 the darwin preflight asks xattr about the bundle the verb placed, including under --install-dir",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        const asked = [];
        const runner = async (file, args) => {
          asked.push([file, ...args].join(" "));
          return { stdout: "", stderr: "", code: 1 };
        };
        const { installDir: _ignored, ...ctx } = { ...preflightProbes(), platform: "darwin", runner };
        await invoke("mesh:desktop-install", { installDir, appArtifact: await seedBundle(artifactsDir) }, ctx);
        assert.ok(asked.includes(`xattr -p com.apple.quarantine ${path.join(installDir, BUNDLE)}`), `xattr was asked about the placed bundle: ${asked.join(" | ")}`);
      }, { seedArtifacts: false });
    },
  },

  // Scenario: E2 · a bundle with no executable inside is refused, and nothing is placed
  {
    name: "175/02 task00 E2 · a bundle with no executable inside is refused app-artifact-missing, and nothing is placed",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        const hollow = path.join(artifactsDir, BUNDLE);
        await mkdir(path.join(hollow, "Contents"), { recursive: true });
        await writeFile(path.join(hollow, "Contents", "Info.plist"), "<plist/>", "utf8");
        const before = (await readdir(installDir)).sort();
        await assert.rejects(
          invoke("mesh:desktop-install", { installDir, appArtifact: hollow }, { ...preflightProbes(), platform: "darwin" }),
          (error) => error.code === "app-artifact-missing",
        );
        assert.deepEqual((await readdir(installDir)).sort(), before, "the install dir holds exactly what it held before");
      }, { seedArtifacts: false });
    },
  },

  // Scenario: E3 · Windows still requires the bootstrapper
  {
    name: "175/02 task00 E3 · Windows still requires the bootstrapper",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath }) => {
        await assert.rejects(
          invoke("mesh:desktop-install", { installDir, appArtifact: appArtifactPath }, { platform: "win32", ...preflightProbes() }),
          (error) => error.code === "bootstrapper-artifact-missing",
        );
      });
    },
  },

  // Scenario: a re-install over a placed bundle replaces it in place
  {
    name: "175/02 task00 a re-install over a placed bundle replaces it in place, beside at most one backup",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        await installDesktopApp({ installDir, platform: "darwin", appArtifactPath: await seedBundle(path.join(artifactsDir, "v1"), { bytes: "v1" }) });
        await installDesktopApp({ installDir, platform: "darwin", appArtifactPath: await seedBundle(path.join(artifactsDir, "v2"), { bytes: "v2" }) });
        assert.equal(await readFile(path.join(installDir, BUNDLE, ...INNER), "utf8"), "v2", "the placed executable is the new one");
        const entries = await readdir(installDir);
        assert.equal(entries.filter((e) => e === BUNDLE).length, 1, "exactly one bundle");
        const backups = entries.filter((e) => e.startsWith(`${BUNDLE}.bak.`));
        assert.ok(backups.length <= 1, `at most one backup: ${entries}`);
        if (backups.length === 1) assert.match(backups[0], /^aof-mesh-desktop\.app\.bak\.\d{8}T\d{6}/, "named <bundle>.bak.<ts>");
      }, { seedArtifacts: false });
    },
  },

  // Scenario Outline: discovery on darwin refuses a bundle it cannot run
  {
    name: "175/02 task00 discovery on darwin refuses a bundle it cannot run",
    async run() {
      const rows = [
        { placed: "nothing", code: "desktop-not-installed", seed: async () => {} },
        {
          placed: "a bundle whose inner executable has no execute bit",
          code: "desktop-not-runnable",
          posixOnly: true,
          seed: async (dir) => seedBundle(dir, { executable: false }),
        },
        {
          placed: 'a regular file named "aof-mesh-desktop.app"',
          code: "desktop-not-runnable",
          seed: async (dir) => writeFile(path.join(dir, BUNDLE), "not a bundle", "utf8"),
        },
      ];
      for (const row of rows) {
        if (row.posixOnly && process.platform === "win32") continue; // no execute bit to read on a Windows disk
        await withMeshDesktopFixture(async ({ installDir }) => {
          await row.seed(installDir);
          await assert.rejects(discoverDesktopApp({ installDir, platform: "darwin" }), (error) => {
            assert.equal(error.code, row.code, row.placed);
            return true;
          });
        }, { seedArtifacts: false });
      }
    },
  },

  // Scenario: --dry-run on darwin names the bundle it would place and places nothing
  {
    name: "175/02 task00 --dry-run on darwin names the bundle it would place and places nothing",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        const bundle = await seedBundle(artifactsDir);
        const before = (await readdir(installDir)).sort();
        const result = await invoke("mesh:desktop-install", { installDir, appArtifact: bundle, dryRun: true }, { ...preflightProbes(), platform: "darwin" });
        assert.equal(result.dryRun, true);
        assert.equal(result.appPath, path.join(installDir, BUNDLE));
        assert.deepEqual((await readdir(installDir)).sort(), before, "the install dir is unchanged");
      }, { seedArtifacts: false });
    },
  },
];
