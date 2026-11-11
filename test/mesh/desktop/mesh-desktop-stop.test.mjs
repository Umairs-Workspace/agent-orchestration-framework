import { defaultApplication as _aofApplication } from "aof/default-application";
// `aof mesh desktop stop` — the programmatic exit the supervisor never had
// (TECH_DEBT 20(b), raised again by the m46 deploy on 2026-08-09 when the tray
// menu's Quit — the ONLY graceful exit — was unreachable and the operator had no
// fallback at all).
//
// Both seams (`listFn` / `killFn`) are injected here, so nothing in this suite
// enumerates or terminates a real process: the assertions are on the PARSE, the
// argv the platform branch chooses, the refusal, and the already-stopped
// success. Killing a real supervisor is exactly the thing a test must never do
// on the control node — this file runs beside a live one.
import assert from "node:assert/strict";

// 175/02 — a process table and a clock in one fake. `exitsAfterTerm[pid]` is how long a pid
// takes to exit once it has had SIGTERM; a pid absent from it ignores SIGTERM.
function makeFakeProcesses({ running = [], exitsAfterTerm = {} } = {}) {
  let clock = 0;
  const termedAt = new Map();
  const asked = [];
  const alive = (pid) => {
    if (!running.includes(pid)) return false;
    if (!termedAt.has(pid) || !(pid in exitsAfterTerm)) return true;
    return clock < termedAt.get(pid) + exitsAfterTerm[pid];
  };
  const runner = async (file, args) => {
    asked.push([file, ...args].join(" "));
    if (file === "pgrep") return { stdout: running.filter(alive).map((p) => `${p}\n`).join(""), stderr: "", code: 0 };
    if (file === "kill") {
      const [signal, raw] = args;
      const pid = Number(raw);
      if (!alive(pid)) return { stdout: "", stderr: "No such process", code: 1 };
      if (signal === "-TERM" && !termedAt.has(pid)) termedAt.set(pid, clock);
      return { stdout: "", stderr: "", code: 0 };
    }
    return { stdout: "", stderr: "", code: -1 };
  };
  return { runner, asked, alive, now: () => clock, sleep: async (ms) => { clock += ms; } };
}

const isSigkill = (line) => /^kill -(KILL|9)\b/.test(line) || /SIGKILL/.test(line);
const desktopProcessName = _aofApplication.mesh.commandTools.mesh.desktop.desktopProcessName;
const findDesktopProcesses = _aofApplication.mesh.commandTools.mesh.desktop.findDesktopProcesses;
const parsePgrepPids = _aofApplication.mesh.commandTools.mesh.desktop.parsePgrepPids;
const parseTasklistPids = _aofApplication.mesh.commandTools.mesh.desktop.parseTasklistPids;
const stopDesktopApp = _aofApplication.mesh.commandTools.mesh.desktop.stopDesktopApp;
const DESKTOP_APP_EXE = _aofApplication.mesh.commandTools.mesh.desktop.DESKTOP_APP_EXE;
const getCommand = _aofApplication.getCommand;

// A recording runner: answers a queued { stdout, code } per call and records the
// argv it was handed, so a test can assert WHICH command the platform branch ran.
function recorder(answers = []) {
  const calls = [];
  let index = 0;
  const run = async (file, args) => {
    calls.push({ file, args });
    return answers[index++] ?? { stdout: "", code: 0 };
  };
  return { run, calls };
}

const TASKLIST_TWO = [
  '"aof-mesh-desktop.exe","23496","Console","1","148,232 K"',
  '"aof-mesh-desktop.exe","4120","Console","1","12,004 K"',
].join("\r\n");

export const meshDesktopStopTests = [
  {
    name: "mesh-desktop-stop: the process name is the placed exe on win32 and the bare binary elsewhere",
    run: () => {
      assert.equal(desktopProcessName("win32"), DESKTOP_APP_EXE);
      assert.equal(desktopProcessName("darwin"), "AOF Desktop", "the bundle's executable (175/F-05)");
      assert.equal(desktopProcessName("linux"), "aof-mesh-desktop");
    },
  },

  {
    name: "mesh-desktop-stop: tasklist CSV parses to pids, and its no-match INFO line (printed on STDOUT with exit 0) is not mistaken for one",
    run: () => {
      assert.deepEqual(parseTasklistPids(TASKLIST_TWO), [23496, 4120]);
      assert.deepEqual(
        parseTasklistPids("INFO: No tasks are running which match the specified criteria."),
        [],
        "the INFO line is tasklist's EMPTY answer — reading a pid out of it would kill nothing and report success",
      );
      assert.deepEqual(parseTasklistPids(""), []);
      assert.deepEqual(parsePgrepPids("23496\n4120\n"), [23496, 4120]);
      assert.deepEqual(parsePgrepPids(""), []);
    },
  },

  {
    name: "mesh-desktop-stop: the platform branch runs tasklist on win32 and pgrep elsewhere, filtered to the supervisor's own name",
    run: async () => {
      const win = recorder([{ stdout: TASKLIST_TWO, code: 0 }]);
      assert.deepEqual(await findDesktopProcesses({ platform: "win32", listFn: win.run }), [23496, 4120]);
      assert.deepEqual(win.calls[0].file, "tasklist");
      assert.deepEqual(win.calls[0].args, ["/FI", `IMAGENAME eq ${DESKTOP_APP_EXE}`, "/NH", "/FO", "CSV"]);

      const posix = recorder([{ stdout: "777\n", code: 0 }]);
      assert.deepEqual(await findDesktopProcesses({ platform: "darwin", listFn: posix.run }), [777]);
      assert.deepEqual(posix.calls[0], { file: "pgrep", args: ["-x", "AOF Desktop"] }, "the macOS executable (175/F-05)");

      const linux = recorder([{ stdout: "778\n", code: 0 }]);
      assert.deepEqual(await findDesktopProcesses({ platform: "linux", listFn: linux.run }), [778]);
      assert.deepEqual(linux.calls[0], { file: "pgrep", args: ["-x", "aof-mesh-desktop"] }, "linux keeps its name");
    },
  },

  {
    name: "mesh-desktop-stop: nothing running is a SUCCESS, not a refusal — a deploy script must be able to run stop unconditionally",
    run: async () => {
      const list = recorder([{ stdout: "INFO: No tasks are running which match the specified criteria.", code: 0 }]);
      const kill = recorder();
      const result = await stopDesktopApp({ platform: "win32", listFn: list.run, killFn: kill.run });
      assert.equal(result.ok, true);
      assert.equal(result.alreadyStopped, true);
      assert.deepEqual(result.stopped, []);
      assert.equal(kill.calls.length, 0, "nothing to stop means nothing is terminated");
    },
  },

  {
    name: "mesh-desktop-stop: every running supervisor is terminated with /T /F — the tree flag beside the Job Object, and /F because a graceful WM_CLOSE is a NO-OP on a close-to-tray app",
    run: async () => {
      const list = recorder([{ stdout: TASKLIST_TWO, code: 0 }]);
      const kill = recorder([{ stdout: "", code: 0 }, { stdout: "", code: 0 }]);
      const result = await stopDesktopApp({ platform: "win32", listFn: list.run, killFn: kill.run });

      assert.deepEqual(result.stopped, [23496, 4120]);
      assert.equal(result.alreadyStopped, false);
      assert.deepEqual(kill.calls.map((c) => c.args), [
        ["/PID", "23496", "/T", "/F"],
        ["/PID", "4120", "/T", "/F"],
      ]);
      assert.ok(
        kill.calls.every((c) => c.args.includes("/F")),
        "without /F, taskkill posts WM_CLOSE — which this app converts to hide-to-tray, so the stop would silently do nothing",
      );
    },
  },

  {
    name: "mesh-desktop-stop: a found-but-unkillable supervisor is a coded one-sentence refusal that names the likely cause, never a silent success",
    run: async () => {
      const list = recorder([{ stdout: TASKLIST_TWO, code: 0 }]);
      const kill = recorder([{ stdout: "", code: 1 }, { stdout: "", code: 1 }]);
      await assert.rejects(
        () => stopDesktopApp({ platform: "win32", listFn: list.run, killFn: kill.run }),
        (error) => {
          assert.equal(error.code, "desktop-stop-failed");
          assert.match(error.message, /23496/);
          assert.match(error.message, /elevated|another user/);
          assert.doesNotMatch(error.message, /at\s+\S+\s+\(.*:\d+:\d+\)/, "no stack frame in the refusal");
          return true;
        },
      );
    },
  },

  {
    name: "mesh-desktop-stop: --dry-run reports what WOULD be stopped and terminates nothing — the mesh bijection gate spawns every subcommand, and a bare probe would kill the operator's live app",
    run: async () => {
      const list = recorder([{ stdout: TASKLIST_TWO, code: 0 }]);
      const kill = recorder();
      const result = await stopDesktopApp({ platform: "win32", dryRun: true, listFn: list.run, killFn: kill.run });

      assert.equal(result.ok, true);
      assert.equal(result.dryRun, true);
      assert.deepEqual(result.wouldStop, [23496, 4120]);
      assert.deepEqual(result.stopped, [], "a dry run stops nothing, so `stopped` must stay empty rather than describing intent");
      assert.equal(kill.calls.length, 0, "THE assertion of this lane: no terminate is ever issued under --dry-run");
    },
  },

  {
    name: "mesh-desktop-stop: the verb is REGISTERED and routed as a three-word route, so `aof mesh desktop stop` reaches it rather than the unknown-verb shim",
    run: () => {
      const command = getCommand("mesh:desktop-stop");
      assert.ok(command, "mesh:desktop-stop is in the registry");
      assert.deepEqual(command.cli.route, ["mesh", "desktop", "stop"]);
      assert.equal(command.cli.spec.workspace, false, "stopping the app is not workspace-scoped");
      assert.match(command.cli.spec.usage, /aof mesh desktop stop/);
      assert.ok(command.cli.spec.flags.dryRun, "--dry-run is part of the contract, not a test affordance: the bijection probe depends on it");
    },
  },

  {
    name: "mesh-desktop-stop: the rendered line tells the operator the daemons went with it, and the already-stopped line never claims a kill",
    run: () => {
      const { render } = getCommand("mesh:desktop-stop").cli;
      assert.match(render({ ok: true, stopped: [23496], alreadyStopped: false }), /Stopped the desktop app \(pid 23496\)/);
      assert.match(render({ ok: true, stopped: [23496], alreadyStopped: false }), /daemons are reaped/);
      assert.equal(render({ ok: true, stopped: [], alreadyStopped: true }), "The desktop app is not running.");
    },
  },

  // ── milestone 175 / story 02, task 02_stop-asks-the-app-to-quit-and-waits.feature ──
  //
  // The runner MODELS processes by pid: `pgrep` answers the running supervisors, `kill -TERM`
  // starts a pid's exit clock, `kill -0` answers whether it is still alive at the test clock's
  // time. The clock only moves when the verb sleeps, so a 20 s wait takes no real time.

  // Scenario: E8 · a supervisor that exits after SIGTERM is reported stopped
  {
    name: "175/02 task02 E8 · a supervisor that exits 2 s after SIGTERM is reported stopped, and stop returns no earlier than its exit",
    run: async () => {
      const os = makeFakeProcesses({ running: [812], exitsAfterTerm: { 812: 2_000 } });
      const result = await stopDesktopApp({ platform: "darwin", listFn: os.runner, killFn: os.runner, nowFn: os.now, sleepFn: os.sleep });
      assert.ok(os.asked.includes("kill -TERM 812"), os.asked.join(" | "));
      assert.equal(result.ok, true);
      assert.deepEqual(result.stopped, [812]);
      assert.ok(os.now() >= 2_000, `it returned no earlier than pid 812's exit (at ${os.now()} ms)`);
      assert.ok(!os.asked.some(isSigkill), "the runner was never asked for a SIGKILL");
    },
  },

  // Scenario: E9 · a supervisor still alive after the wait is refused and left running
  {
    name: "175/02 task02 E9 · a supervisor still alive after 20 s is refused desktop-stop-timeout naming it, and is never SIGKILLed",
    run: async () => {
      const os = makeFakeProcesses({ running: [812], exitsAfterTerm: {} });
      await assert.rejects(
        stopDesktopApp({ platform: "darwin", listFn: os.runner, killFn: os.runner, nowFn: os.now, sleepFn: os.sleep }),
        (error) => {
          assert.equal(error.code, "desktop-stop-timeout");
          assert.match(error.message, /\b812\b/, "the message names pid 812");
          return true;
        },
      );
      assert.ok(os.now() >= 20_000, `the refusal came after 20 s (at ${os.now()} ms)`);
      assert.ok(!os.asked.some(isSigkill), "the runner was never asked for a SIGKILL");
      assert.ok(os.alive(812), "and pid 812 was left running");
    },
  },

  // Scenario: E10 · nothing running is a success
  {
    name: "175/02 task02 E10 · nothing running on darwin is a success with alreadyStopped",
    run: async () => {
      const os = makeFakeProcesses({ running: [] });
      const result = await stopDesktopApp({ platform: "darwin", listFn: os.runner, killFn: os.runner, nowFn: os.now, sleepFn: os.sleep });
      assert.equal(result.ok, true);
      assert.equal(result.alreadyStopped, true);
    },
  },

  // Scenario: --dry-run names the pid and signals nothing
  {
    name: "175/02 task02 --dry-run on darwin names the pid and signals nothing",
    run: async () => {
      const os = makeFakeProcesses({ running: [812] });
      const result = await stopDesktopApp({ platform: "darwin", dryRun: true, listFn: os.runner, killFn: os.runner, nowFn: os.now, sleepFn: os.sleep });
      assert.deepEqual(result.wouldStop, [812]);
      assert.ok(!os.asked.some((c) => c.startsWith("kill")), "no kill was asked for");
    },
  },

  // Scenario: Windows stop is unchanged
  {
    name: "175/02 task02 Windows stop is unchanged — taskkill /T /F, and no wait",
    run: async () => {
      const list = recorder([{ stdout: '"aof-mesh-desktop.exe","23496","Console","1","148,232 K"', code: 0 }]);
      const kill = recorder([{ stdout: "", code: 0 }]);
      const result = await stopDesktopApp({ platform: "win32", listFn: list.run, killFn: kill.run });
      assert.deepEqual(kill.calls, [{ file: "taskkill", args: ["/PID", "23496", "/T", "/F"] }], "exactly the one taskkill, and no liveness poll");
      assert.deepEqual(result.stopped, [23496]);
    },
  },
];
