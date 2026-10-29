
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 126 / story 04, tasks
// 00_autostart-is-a-flag-on-install.feature, 01_the-registry-is-reached-through-one-
// injected-runner.feature and 02_off-windows-is-a-coded-refusal.feature.
//
// `--autostart` / `--no-autostart` are flags on the EXISTING `install` verb (ADR-007 §1),
// the registry is reached through ONE injected runner (§2), and a non-Windows platform is
// a CODED refusal rather than a silent success (§3).
//
// NOTHING HERE TOUCHES THE REAL HIVE. The registry runner is a fake that MODELS the key —
// it holds a name→data map and answers the way `reg` actually answers, including the exact
// stderr sentence for an absent value (measured 2026-09-08). That is what makes the
// prior-state table meaningful rather than a check that a stub was called.
import assert from "node:assert/strict";
import path from "node:path";
const applyAutostart = _aofApplication.mesh.commandTools.mesh.desktop.applyAutostart;
const resolveAutostartAction = _aofApplication.mesh.commandTools.mesh.desktop.resolveAutostartAction;
const AUTOSTART_RUN_KEY = _aofApplication.mesh.commandTools.mesh.desktop.AUTOSTART_RUN_KEY;
const AUTOSTART_VALUE_NAME = _aofApplication.mesh.commandTools.mesh.desktop.AUTOSTART_VALUE_NAME;
const DESKTOP_APP_EXE = _aofApplication.mesh.commandTools.mesh.desktop.DESKTOP_APP_EXE;
const getCommand = _aofApplication.getCommand;
const invoke = _aofApplication.invoke;
const listCommands = _aofApplication.listCommands;
const runCommandFace = _aofApplication.cli.runCommandFace;
import { withMeshDesktopFixture } from "../../support/mesh-desktop-fixture.mjs";
import { parseLaunchAgent, readLaunchAgentPath, renderLaunchAgent } from "@aof/mesh/commands/desktop-launch-agent";

// 175/02 — a file seam over a map, standing in for `~/Library/LaunchAgents`.
function makeFakeFiles() {
  const disk = new Map();
  let writes = 0;
  return {
    seed: (file, text) => disk.set(file, text),
    read: (file) => (disk.has(file) ? disk.get(file) : null),
    writes: () => writes,
    seam: {
      read: async (file) => (disk.has(file) ? disk.get(file) : null),
      write: async (file, text) => {
        writes += 1;
        disk.set(file, text);
      },
      remove: async (file) => {
        disk.delete(file);
      },
    },
  };
}

// 175/02 — a fixture `.app` bundle with an executable inside.
async function seedBundle(dir) {
  const { chmod, mkdir, writeFile } = await import("node:fs/promises");
  const inner = path.join(dir, "aof-mesh-desktop.app", "Contents", "MacOS", "aof-mesh-desktop");
  await mkdir(path.dirname(inner), { recursive: true });
  await writeFile(inner, "fixture-bundle-exe", "utf8");
  await chmod(inner, 0o755);
  return path.join(dir, "aof-mesh-desktop.app");
}

// `reg`'s own sentence for "no such value" — the ONE stderr text that makes a non-zero
// exit a success, and only for a delete.
const REG_ABSENT =
  "ERROR: The system was unable to find the specified registry key or value.\r\n";

// A fake `reg` that MODELS the Run key. `values` is the prior state; every call is
// recorded so a test can assert zero writes as easily as one.
function makeFakeRegistry(values = {}) {
  const key = new Map(Object.entries(values));
  const calls = [];
  const runner = async (file, args) => {
    calls.push({ file, args });
    if (file !== "reg") return { stdout: "", stderr: "", code: -1 };
    const [verb] = args;
    const nameAt = args.indexOf("/v");
    const name = nameAt >= 0 ? args[nameAt + 1] : null;
    if (verb === "add") {
      const dataAt = args.indexOf("/d");
      key.set(name, args[dataAt + 1]);
      return { stdout: "The operation completed successfully.\r\n", stderr: "", code: 0 };
    }
    if (verb === "delete") {
      if (!key.has(name)) return { stdout: "", stderr: REG_ABSENT, code: 1 };
      key.delete(name);
      return { stdout: "The operation completed successfully.\r\n", stderr: "", code: 0 };
    }
    return { stdout: "", stderr: "ERROR: Invalid syntax.\r\n", code: 1 };
  };
  return {
    runner,
    calls,
    state: () => Object.fromEntries(key),
    writes: () => calls.filter((c) => c.args?.[0] === "add"),
    deletes: () => calls.filter((c) => c.args?.[0] === "delete"),
  };
}

// A fake that answers a FIXED result for every invocation — the fault table's seam.
function makeAnsweringRunner(answer) {
  const calls = [];
  return {
    calls,
    runner: async (file, args) => {
      calls.push({ file, args });
      if (typeof answer === "function") return answer(file, args);
      return answer;
    },
  };
}

// Preflight probes that answer instantly and touch nothing — every scenario in this file
// is about autostart, and a real preflight would reach the disk and `claude`.
function inertPreflightCtx() {
  return {
    claudeFn: async () => ({ stdout: '{"loggedIn":true,"authMethod":"claude.ai"}', stderr: "", code: 0 }),
    buildInfoFn: () => ({ mode: "payload", buildId: "fixture.20260909T000000", installedAt: null }),
    workspacesFn: async () => ({ ok: true, workspaces: [], skipped: [] }),
    workspaceConfigFn: async () => ({}),
    nodeId: "fixture-node",
  };
}

// 175/03 — a darwin row's preflight adds four probes, every one asked of `ctx.runner`. A darwin
// row that injects no runner of its own hands this one, so none of them reaches the real
// `xcode-select`, `cargo`, `xattr` or `claude`. It is NOT in `inertPreflightCtx`: the win32 rows
// spread that after their registry runner, which it would silently replace.
const inertDarwinRunner = async () => ({ stdout: "", stderr: "", code: 0 });

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
    process.exitCode = origExitCode;
  }
  return { logs, errors, exitCode: process.exitCode };
}

export const meshDesktopAutostartTests = [
  // ── task 00 ────────────────────────────────────────────────────────────────────

  {
    name: "126/04 task00 --autostart writes ONE value named `aof-mesh-desktop` whose data is the installed app's absolute path, non-interactively",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const registry = makeFakeRegistry();
        const result = await applyAutostart({
          action: "write",
          platform: "win32",
          installDir,
          runner: registry.runner,
        });

        assert.equal(registry.writes().length, 1, "exactly one value is written");
        assert.deepEqual(Object.keys(registry.state()), [AUTOSTART_VALUE_NAME], "under the current user's Run key, one value of ours");
        assert.equal(
          registry.state()[AUTOSTART_VALUE_NAME],
          path.join(installDir, DESKTOP_APP_EXE),
          "its data is the absolute path of aof-mesh-desktop.exe in that install dir",
        );
        assert.equal(result.key, AUTOSTART_RUN_KEY, "the render names the key");
        assert.equal(result.valueName, AUTOSTART_VALUE_NAME);
        assert.equal(result.data, path.join(installDir, DESKTOP_APP_EXE), "and names the path");

        // NON-INTERACTIVE: without `/f`, `reg add` on an existing value PROMPTS and hangs
        // a CLI with no console to answer it — the one failure a fake runner cannot show,
        // so it is asserted on the argv instead.
        assert.ok(registry.writes()[0].args.includes("/f"), "the write can never wait on a console prompt");
      });
    },
  },

  {
    name: "126/04 task00 every prior state of the key, under each flag — writing twice is one entry and two successes; removing an absent value is a success",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const current = path.join(installDir, DESKTOP_APP_EXE);
        const former = path.join(path.dirname(installDir), "former-bin", DESKTOP_APP_EXE);

        const cases = [
          // | prior | flag | after | render |
          { why: "no value of ours", prior: {}, action: "write", after: { [AUTOSTART_VALUE_NAME]: current } },
          { why: "ours, already the current app path", prior: { [AUTOSTART_VALUE_NAME]: current }, action: "write", after: { [AUTOSTART_VALUE_NAME]: current } },
          { why: "ours, a path in a former install dir", prior: { [AUTOSTART_VALUE_NAME]: former }, action: "write", after: { [AUTOSTART_VALUE_NAME]: current } },
          { why: "another NAME holds the same path", prior: { "Some Other App": current }, action: "write", after: { "Some Other App": current, [AUTOSTART_VALUE_NAME]: current } },

          { why: "ours, already the current app path", prior: { [AUTOSTART_VALUE_NAME]: current }, action: "remove", after: {} },
          { why: "ours, a path in a former install dir", prior: { [AUTOSTART_VALUE_NAME]: former }, action: "remove", after: {} },
          { why: "no value of ours", prior: {}, action: "remove", after: {}, alreadyAbsent: true },
          { why: "another NAME holds the same path", prior: { "Some Other App": current }, action: "remove", after: { "Some Other App": current }, alreadyAbsent: true },
        ];

        for (const testCase of cases) {
          const registry = makeFakeRegistry(testCase.prior);
          const result = await applyAutostart({
            action: testCase.action,
            platform: "win32",
            installDir,
            runner: registry.runner,
          });
          assert.deepEqual(registry.state(), testCase.after, `${testCase.action} over ${testCase.why}: the key ends as stated`);
          assert.equal(result.action, testCase.action, "the command succeeds");
          if (testCase.alreadyAbsent) {
            assert.equal(result.alreadyAbsent, true, `${testCase.why}: the render says there was nothing to remove`);
          } else {
            assert.notEqual(result.alreadyAbsent, true, `${testCase.why}: the render reports the change it made`);
          }
        }
      });
    },
  },

  {
    name: "126/04 task00 the data is the absolute path the resolved install dir gives — never the bare exe name, never relative — for all three ways the dir resolves",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, tmp }) => {
        const spaced = path.join(tmp, "install dir with spaces");
        const cases = [
          { source: "the default ~/.aof/bin", dir: installDir },
          { source: "--install-dir naming a directory whose path has a space", dir: spaced },
          // A relative `--install-dir` is resolved by `resolveDesktopInstallDir` before it
          // ever reaches the value, which is what this row is for.
          { source: "--install-dir given as a relative path", dir: path.resolve("./fixture-relative-install-dir") },
        ];

        for (const { source, dir } of cases) {
          const registry = makeFakeRegistry();
          await applyAutostart({ action: "write", platform: "win32", installDir: dir, runner: registry.runner });
          const data = registry.state()[AUTOSTART_VALUE_NAME];
          assert.equal(data, path.join(dir, DESKTOP_APP_EXE), `${source}: the data is that directory's exe as an absolute path`);
          assert.notEqual(data, DESKTOP_APP_EXE, `${source}: never the bare exe name`);
          assert.ok(path.isAbsolute(data), `${source}: never a path relative to anything`);

          // A second run against the same dir writes the same data and leaves one entry.
          await applyAutostart({ action: "write", platform: "win32", installDir: dir, runner: registry.runner });
          assert.deepEqual(Object.keys(registry.state()), [AUTOSTART_VALUE_NAME], `${source}: one entry`);
          assert.equal(registry.state()[AUTOSTART_VALUE_NAME], data, `${source}: the same data`);
        }
      });
    },
  },

  {
    name: "126/04 task00 the flag pair is declared and a contradiction refuses on the INPUT — before the artifact check, whatever artifacts were supplied",
    async run() {
      // The contradiction is decided by a pure function of the input, so it is the same
      // answer in the same words whether or not artifacts were supplied or resolve.
      for (const input of [{ autostart: true, noAutostart: true }, { noAutostart: true, autostart: true }]) {
        assert.throws(
          () => resolveAutostartAction(input),
          (error) => error.code === "autostart-flags-conflict",
          `${JSON.stringify(input)} is refused autostart-flags-conflict, decided on the input`,
        );
      }

      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const registry = makeFakeRegistry();
        for (const artifacts of [
          {},
          { appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath },
          { appArtifact: path.join(installDir, "does-not-exist.exe"), bootstrapperArtifact: bootstrapperArtifactPath },
        ]) {
          await assert.rejects(
            invoke(
              "mesh:desktop-install",
              { installDir, autostart: true, noAutostart: true, ...artifacts },
              { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
            ),
            (error) => error.code === "autostart-flags-conflict",
            `the same refusal in the same words with artifacts ${JSON.stringify(Object.keys(artifacts))}`,
          );
        }
        assert.equal(registry.calls.length, 0, "no registry runner is invoked");
      });

      // An undeclared flag is the face's own loud `unknown-flag`, before the run.
      const command = getCommand("mesh:desktop-install");
      assert.equal(command.cli.spec.flags.autostart.type, "boolean", "`--autostart` is a declared boolean");
      assert.equal(command.cli.spec.flags.noAutostart.type, "boolean", "and `--no-autostart` is its own declared boolean — the face has no `--no-` negation");
      assert.equal(command.cli.spec.flags.autostrt, undefined, "`--autostrt` is undeclared, so the face refuses it at the spec-parse");
    },
  },

  {
    name: "126/04 task00 no fifth command — the `mesh:desktop-*` ids are exactly install, run and stop, and the machine face is one document carrying dryRun and the autostart result",
    async run() {
      const ids = listCommands()
        .map((command) => command.id)
        .filter((id) => id.startsWith("mesh:desktop"))
        .sort();
      assert.deepEqual(ids, ["mesh:desktop-install", "mesh:desktop-run", "mesh:desktop-stop"], "exactly install, run and stop — the act is a flag, not a fifth door");

      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const registry = makeFakeRegistry();
        const command = getCommand("mesh:desktop-install");
        const result = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, autostart: true, dryRun: true },
          { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
        );
        const envelope = command.cli.json(result);
        assert.equal(envelope.ok, true, "one parseable envelope");
        assert.equal(envelope.dryRun, true, "carrying dryRun: true");
        assert.equal(envelope.autostart.action, "write", "and the autostart result");
        assert.equal(envelope.autostart.valueName, AUTOSTART_VALUE_NAME);
        assert.equal(registry.calls.length, 0, "no real hive was reached");
      });
    },
  },

  // ── task 01 ────────────────────────────────────────────────────────────────────

  {
    name: "126/04 task01 what the runner answers decides the verb's answer — absent is a success, every other fault is a coded refusal carrying what reg said",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        const write = { action: "write", platform: "win32", installDir };
        const remove = { action: "remove", platform: "win32", installDir };

        // The two clean paths.
        for (const [act, base] of [["write", write], ["delete", remove]]) {
          const { runner } = makeAnsweringRunner({ stdout: "", stderr: "", code: 0 });
          const result = await applyAutostart({ ...base, runner });
          assert.equal(result.changed, true, `${act} succeeds, reporting the value it touched`);
          assert.equal(result.valueName, AUTOSTART_VALUE_NAME);
        }

        // ABSENT IS NOT BROKEN — the one fault that is a success, decided on the code AND
        // the stderr sentence.
        {
          const { runner } = makeAnsweringRunner({ stdout: "", stderr: REG_ABSENT, code: 1 });
          const result = await applyAutostart({ ...remove, runner });
          assert.equal(result.alreadyAbsent, true, "a delete of an absent value succeeds, reporting there was nothing to remove");
          assert.equal(result.changed, false);
        }

        // Every other fault is a coded refusal carrying the code and the text.
        const faults = [
          { base: write, answer: { stdout: "", stderr: "ERROR: Access is denied.\r\n", code: 1 }, code: "autostart-write-failed", names: ["1", "Access is denied"] },
          { base: remove, answer: { stdout: "", stderr: "ERROR: Access is denied.\r\n", code: 5 }, code: "autostart-remove-failed", names: ["5", "Access is denied"] },
          { base: remove, answer: { stdout: "", stderr: "ERROR: Invalid syntax.\r\n", code: 1 }, code: "autostart-remove-failed", names: ["Invalid syntax"] },
          { base: write, answer: { stdout: "", stderr: "", code: -1 }, code: "autostart-write-failed", names: ["could not be run"] },
          { base: remove, answer: { stdout: "", stderr: "" }, code: "autostart-remove-failed", names: ["no exit code"] },
        ];
        for (const fault of faults) {
          const { runner } = makeAnsweringRunner(fault.answer);
          await assert.rejects(
            applyAutostart({ ...fault.base, runner }),
            (error) => {
              assert.equal(error.code, fault.code, `refuses ${fault.code}`);
              for (const fragment of fault.names) {
                assert.ok(error.message.includes(fragment), `the message names ${fragment}: ${error.message}`);
              }
              assert.ok(!/\n\s+at /.test(error.message), "never a stack trace");
              return true;
            },
          );
        }

        // A runner that THROWS is the same calm refusal.
        await assert.rejects(
          applyAutostart({ ...write, runner: async () => { throw new Error("spawn reg ENOENT"); } }),
          (error) => error.code === "autostart-write-failed" && error.message.includes("ENOENT"),
        );
      });
    },
  },

  {
    name: "126/04 task01 a coded refusal is ONE envelope, leaves the key as it found it, and carries no preflight",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const prior = { [AUTOSTART_VALUE_NAME]: path.join(installDir, DESKTOP_APP_EXE) };
        const registry = makeFakeRegistry(prior);
        // A runner that fails the write, over a key that already holds our value.
        const failing = async (file, args) => {
          registry.calls.push({ file, args });
          return { stdout: "", stderr: "ERROR: Access is denied.\r\n", code: 1 };
        };

        await assert.rejects(
          invoke(
            "mesh:desktop-install",
            { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, autostart: true },
            { runner: failing, platform: "win32", ...inertPreflightCtx() },
          ),
          (error) => {
            assert.equal(error.code, "autostart-write-failed", "code autostart-write-failed");
            assert.ok(error.message.length > 0, "error carries the one-sentence message");
            assert.equal(error.preflight, undefined, "a refusal is { ok, error, code } as it was — no preflight key");
            return true;
          },
        );
        assert.deepEqual(registry.state(), prior, "the key holds exactly what it held before");
      });
    },
  },

  {
    name: "126/04 task01 --dry-run reports the act and performs none of it, on both flags and both faces",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const command = getCommand("mesh:desktop-install");
        for (const flag of ["autostart", "noAutostart"]) {
          const registry = makeFakeRegistry();
          const result = await invoke(
            "mesh:desktop-install",
            { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, [flag]: true, dryRun: true },
            { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
          );
          assert.equal(registry.writes().length, 0, `${flag}: the runner records zero writes`);
          assert.equal(registry.deletes().length, 0, `${flag}: and zero deletes`);

          const rendered = command.cli.render(result);
          assert.ok(rendered.includes(AUTOSTART_VALUE_NAME), `${flag}: the render names the value`);
          assert.ok(rendered.includes(AUTOSTART_RUN_KEY), `${flag}: and the key it would have touched`);
          assert.ok(/Nothing was changed/i.test(rendered), `${flag}: and says nothing was changed`);

          const envelope = command.cli.json(result);
          assert.equal(envelope.dryRun, true, `${flag}: the envelope carries dryRun: true`);
          assert.equal(envelope.autostart.dryRun, true);
        }
      });
    },
  },

  {
    name: "126/04 task01 --dry-run covers the WHOLE verb — nothing is placed, nothing is written, and the artifact refusals are unchanged by it",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const { readdir } = await import("node:fs/promises");
        const before = (await readdir(installDir)).sort();
        const registry = makeFakeRegistry();
        const command = getCommand("mesh:desktop-install");

        const result = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, autostart: true, dryRun: true },
          { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
        );
        assert.deepEqual((await readdir(installDir)).sort(), before, "nothing is placed — no staged copy, no swap, no file created or replaced");
        assert.equal(registry.calls.length, 0, "zero writes and zero deletes");
        const rendered = command.cli.render(result);
        assert.ok(rendered.includes(installDir), "the render names what would be installed");
        assert.ok(rendered.includes(path.join(installDir, DESKTOP_APP_EXE)), "and the value that would be written");

        // `--no-autostart --dry-run` names instead the value that would be removed.
        const removal = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, noAutostart: true, dryRun: true },
          { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
        );
        assert.match(command.cli.render(removal), /Would remove login autostart/, "names the value that would be removed");

        // `--dry-run` with NEITHER flag still names what would be installed and touches nothing.
        const neither = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, dryRun: true },
          { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
        );
        assert.equal(neither.autostart, undefined, "no autostart result when neither flag was given");
        assert.ok(command.cli.render(neither).includes(installDir), "still names what would be installed");
        assert.deepEqual((await readdir(installDir)).sort(), before, "and still touches nothing");

        // BUT the artifact refusals are unchanged by --dry-run: a dry run that cannot name
        // what it would install has nothing to report.
        await assert.rejects(
          invoke(
            "mesh:desktop-install",
            { installDir, appArtifact: path.join(installDir, "absent.exe"), bootstrapperArtifact: bootstrapperArtifactPath, dryRun: true },
            { runner: registry.runner, platform: "win32", ...inertPreflightCtx() },
          ),
          (error) => error.code === "app-artifact-missing",
        );
      });
    },
  },

  {
    name: "126/04 task01 the bijection probe performs no act — the artifact refusal fires before any registry path, and no preflight probe runs behind it",
    async run() {
      // The gate spawns `aof mesh desktop install --json` with no artifact.
      const registry = makeFakeRegistry();
      let claudeCalls = 0;
      let workspaceCalls = 0;
      await assert.rejects(
        invoke(
          "mesh:desktop-install",
          {},
          {
            runner: registry.runner,
            platform: "win32",
            claudeFn: async () => { claudeCalls += 1; return { stdout: "{}", stderr: "", code: 0 }; },
            buildInfoFn: () => ({ mode: "payload", buildId: "x", installedAt: null }),
            workspacesFn: async () => { workspaceCalls += 1; return { ok: true, workspaces: [], skipped: [] }; },
            workspaceConfigFn: async () => ({}),
            nodeId: "fixture-node",
          },
        ),
        (error) => error.code === "app-artifact-missing",
      );
      assert.equal(registry.calls.length, 0, "no registry runner is invoked");
      assert.equal(claudeCalls, 0, "no `claude` is spawned by a probe that refuses");
      assert.equal(workspaceCalls, 0, "and no store is opened behind the refusal");
    },
  },

  // ── task 02 ────────────────────────────────────────────────────────────────────

  {
    // 175/02 widened the admitted set to `win32` and `darwin` (175/ADR-004 §3); the row below
    // is this suite following it. 126/04's delivered `.feature` stays as written.
    name: "126/04 task02 (widened by 175/02) the admitted platform set is exactly `win32` and `darwin` — every other value refuses `autostart-unsupported-platform` by name, never case-folded, never falling back to the host",
    async run() {
      await withMeshDesktopFixture(async ({ installDir }) => {
        // The one admitted value.
        const registry = makeFakeRegistry();
        await applyAutostart({ action: "write", platform: "win32", installDir, runner: registry.runner });
        assert.equal(registry.writes().length, 1, "win32 is admitted — the injected runner is asked to write the value");

        const refused = [
          { platform: "linux", names: "`linux`" },
          { platform: "sunos", names: "`sunos`" },
          { platform: "DARWIN", names: "`DARWIN`" },
          { platform: "WIN32", names: "`WIN32`" },
          { platform: "", names: "unset" },
        ];
        for (const { platform, names } of refused) {
          const fake = makeFakeRegistry();
          await assert.rejects(
            applyAutostart({ action: "write", platform, installDir, runner: fake.runner }),
            (error) => {
              assert.equal(error.code, "autostart-unsupported-platform", `${JSON.stringify(platform)} is refused by code`);
              assert.ok(error.message.includes(names), `and the message names ${names}: ${error.message}`);
              return true;
            },
          );
          assert.equal(fake.calls.length, 0, `${JSON.stringify(platform)}: no registry runner was invoked`);
        }
      });
    },
  },

  {
    name: "126/04 task02 (linux since 175/02) off the admitted platforms the refusal is decided on the INPUT — non-zero, never a silent success, and nothing is placed even when the artifacts DO resolve",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const { readdir } = await import("node:fs/promises");
        const before = (await readdir(installDir)).sort();

        for (const flag of ["autostart", "noAutostart"]) {
          const registry = makeFakeRegistry();
          await assert.rejects(
            invoke(
              "mesh:desktop-install",
              { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, [flag]: true },
              { runner: registry.runner, platform: "linux", ...inertPreflightCtx() },
            ),
            (error) => {
              assert.equal(error.code, "autostart-unsupported-platform", `${flag} off Windows is the same coded refusal`);
              assert.ok(error.message.includes("`linux`"), "naming the platform");
              assert.ok(!/nothing to remove/i.test(error.message), "a removal is never reported as `there was nothing to remove`");
              return true;
            },
          );
          assert.equal(registry.calls.length, 0, `${flag}: no registry runner was invoked`);
          assert.deepEqual(
            (await readdir(installDir)).sort(),
            before,
            `${flag}: nothing was placed in the install dir — not even a staged copy swapped into it`,
          );
        }
      });
    },
  },

  {
    name: "126/04 task02 the refusal reaches the operator as ONE { ok:false, error, code } envelope with a non-zero exit, through the real routed face",
    async run() {
      // WHY THE PLATFORM REFUSAL IS ASSERTED AT THE CORE AND THE ENVELOPE AT THE FACE.
      // `runCommandFace(command, args)` takes NO ctx (`packages/core/src/spine/face.mjs:128`), so the
      // face cannot be handed an injected platform — the same limit this directory's
      // delivered run suite already documents for `spawnFn`, and the reason it asserts a
      // success envelope through `invoke` and a refusal through the face. So: the darwin
      // refusal is asserted to be exactly the shape the face envelopes (a `refuse()` error
      // carrying `.code` and a one-sentence `.message`), and the ENVELOPE itself is driven
      // whole through the face by the flag contradiction, which needs no injection.
      await withMeshDesktopFixture(async ({ installDir, appArtifactPath, bootstrapperArtifactPath }) => {
        const registry = makeFakeRegistry();
        await assert.rejects(
          invoke(
            "mesh:desktop-install",
            { installDir, appArtifact: appArtifactPath, bootstrapperArtifact: bootstrapperArtifactPath, autostart: true },
            { runner: registry.runner, platform: "linux", ...inertPreflightCtx() },
          ),
          (error) => {
            assert.equal(error.code, "autostart-unsupported-platform", "carries the code the envelope prints");
            assert.ok(error.message.includes("`linux`"), "and an error naming linux");
            assert.equal(error.message.split(/[.!?]\s/).length <= 3, true, "one sentence, never a stack trace");
            assert.ok(error instanceof Error, "an Error the face's envelope consumes");
            return true;
          },
        );
      });

      // The flag contradiction is the refusal that needs NO platform injection, so it
      // drives the whole face — the same `refuse()` shape every other coded refusal in
      // this module uses, and the same envelope the platform refusal takes.
      const command = getCommand("mesh:desktop-install");
      const { logs } = await captureConsole(async () => {
        await runCommandFace(command, ["--autostart", "--no-autostart", "--json"], {});
      });
      const envelope = JSON.parse(logs.join("\n"));
      assert.equal(envelope.ok, false, "stdout is one envelope with ok: false");
      assert.equal(envelope.code, "autostart-flags-conflict", "carrying the code");
      assert.ok(typeof envelope.error === "string" && envelope.error.length > 0, "and a one-sentence error");
      assert.ok(!/\n\s+at /.test(envelope.error), "never a stack trace");
    },
  },

  // ── milestone 175 / story 02, task 03_autostart-registers-a-launch-agent.feature ──
  //
  // The plist is written through an INJECTED file seam that models one file system as a map, so
  // nothing reaches `~/Library`, and the runner records every command so "no launchctl" is an
  // assertion on what was asked, not on what happened to work.

  // Scenario: E11 · the plist carries the installing shell's PATH and starts at login only
  {
    name: "175/02 task03 E11 · the plist carries the installing shell's PATH and starts at login only, and no launchctl is asked",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, home, artifactsDir }) => {
        const bundle = await seedBundle(artifactsDir);
        const files = makeFakeFiles();
        const runner = makeAnsweringRunner({ stdout: "", stderr: "", code: 0 });
        const PATH = "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin";
        const result = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: bundle, autostart: true },
          { platform: "darwin", home, env: { PATH }, files: files.seam, runner: runner.runner, ...inertPreflightCtx() },
        );
        const plistPath = path.join(home, "Library", "LaunchAgents", "com.aof.mesh.desktop.plist");
        const plist = parseLaunchAgent(files.read(plistPath));
        assert.ok(plist, "the plist was written and parses");
        assert.equal(plist.Label, "com.aof.mesh.desktop");
        assert.deepEqual(plist.ProgramArguments, [path.join(installDir, "aof-mesh-desktop.app", "Contents", "MacOS", "aof-mesh-desktop")]);
        assert.equal(plist.RunAtLoad, true);
        assert.equal(plist.LimitLoadToSessionType, "Aqua");
        assert.equal(plist.ProcessType, "Interactive");
        assert.equal(plist.KeepAlive, false);
        assert.equal(plist.EnvironmentVariables.PATH, PATH);
        assert.ok(!runner.calls.some((c) => c.file === "launchctl"), "the runner was asked for no launchctl command");
        assert.equal(result.autostart.plistPath, plistPath, "the answer's autostart names the plist path");
      }, { seedArtifacts: false });
    },
  },

  // Scenario: E12 · removing an absent LaunchAgent is a success
  {
    name: "175/02 task03 E12 · removing an absent LaunchAgent is a success with alreadyAbsent",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, home, artifactsDir }) => {
        const result = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: await seedBundle(artifactsDir), noAutostart: true },
          { platform: "darwin", home, env: { PATH: "/usr/bin" }, files: makeFakeFiles().seam, runner: inertDarwinRunner, ...inertPreflightCtx() },
        );
        assert.equal(result.autostart.alreadyAbsent, true);
        assert.equal(result.autostart.changed, false);
      }, { seedArtifacts: false });
    },
  },

  // Scenario: E13 · linux is refused by name before anything is placed
  {
    name: "175/02 task03 E13 · linux is refused autostart-unsupported-platform by name before anything is placed",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, artifactsDir }) => {
        const { readdir } = await import("node:fs/promises");
        const before = (await readdir(installDir)).sort();
        await assert.rejects(
          invoke("mesh:desktop-install", { installDir, appArtifact: await seedBundle(artifactsDir), autostart: true }, { platform: "linux", ...inertPreflightCtx() }),
          (error) => {
            assert.equal(error.code, "autostart-unsupported-platform");
            assert.ok(error.message.includes("`linux`"), error.message);
            return true;
          },
        );
        assert.deepEqual((await readdir(installDir)).sort(), before, "the install dir is unchanged");
      }, { seedArtifacts: false });
    },
  },

  // Scenario Outline: each prior state ends where the flag says
  {
    name: "175/02 task03 each prior state of the LaunchAgent ends where the flag says",
    async run() {
      const current = "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin";
      const rows = [
        { before: "absent", flag: "autostart", after: "current", changed: true },
        { before: "old", flag: "autostart", after: "current", changed: true },
        { before: "current", flag: "noAutostart", after: "absent", changed: true },
        { before: "absent", flag: "noAutostart", after: "absent", changed: false },
      ];
      for (const row of rows) {
        await withMeshDesktopFixture(async ({ installDir, home }) => {
          const plistPath = path.join(home, "Library", "LaunchAgents", "com.aof.mesh.desktop.plist");
          const executable = path.join(installDir, "aof-mesh-desktop.app", "Contents", "MacOS", "aof-mesh-desktop");
          const files = makeFakeFiles();
          if (row.before !== "absent") {
            const priorPath = row.before === "old" ? "/usr/bin:/bin" : current;
            files.seed(plistPath, renderLaunchAgent({ label: "com.aof.mesh.desktop", executable, path: priorPath }));
          }
          const result = await applyAutostart({
            action: row.flag === "autostart" ? "write" : "remove",
            platform: "darwin", installDir, home, env: { PATH: current }, files: files.seam,
          });
          const label = `${row.before} + --${row.flag === "autostart" ? "autostart" : "no-autostart"}`;
          if (row.after === "absent") assert.equal(files.read(plistPath), null, `${label}: the plist is absent`);
          else assert.equal(readLaunchAgentPath(files.read(plistPath)), current, `${label}: present with the current PATH`);
          assert.equal(result.changed, row.changed, `${label}: changed is ${row.changed}`);
        });
      }
    },
  },

  // Scenario: --dry-run names the plist it would write and writes nothing
  {
    name: "175/02 task03 --dry-run on darwin names the plist it would write and writes nothing",
    async run() {
      await withMeshDesktopFixture(async ({ installDir, home, artifactsDir }) => {
        const files = makeFakeFiles();
        const result = await invoke(
          "mesh:desktop-install",
          { installDir, appArtifact: await seedBundle(artifactsDir), autostart: true, dryRun: true },
          { platform: "darwin", home, env: { PATH: "/usr/bin" }, files: files.seam, runner: inertDarwinRunner, ...inertPreflightCtx() },
        );
        const plistPath = path.join(home, "Library", "LaunchAgents", "com.aof.mesh.desktop.plist");
        assert.equal(result.autostart.dryRun, true);
        assert.equal(result.autostart.plistPath, plistPath, "it names the plist path");
        assert.equal(files.read(plistPath), null, "no plist exists");
        assert.equal(files.writes(), 0, "and nothing was written");
      }, { seedArtifacts: false });
    },
  },

  // Scenario: the rendered plist reads back the PATH it was given
  {
    name: "175/02 task03 the rendered plist reads back the PATH it was given",
    run: () => {
      const PATH = "/Users/u/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin";
      const xml = renderLaunchAgent({ label: "com.aof.mesh.desktop", executable: "/x/aof-mesh-desktop.app/Contents/MacOS/aof-mesh-desktop", path: PATH });
      assert.equal(readLaunchAgentPath(xml), PATH);
      assert.deepEqual(parseLaunchAgent(xml).AssociatedBundleIdentifiers, ["com.aof.mesh.desktop"], "Login Items names the job by its app (175/F-05)");
      assert.equal(readLaunchAgentPath(renderLaunchAgent({ label: "l", executable: "/x", path: "/a&b<c>" })), "/a&b<c>", "an escaped PATH reads back as given");
      assert.equal(readLaunchAgentPath("not a plist"), null, "anything else reads as no PATH");
    },
  },
];
