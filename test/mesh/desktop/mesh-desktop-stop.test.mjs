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
import {
  desktopProcessName,
  findDesktopProcesses,
  parsePgrepPids,
  parseTasklistPids,
  stopDesktopApp,
  DESKTOP_APP_EXE,
} from "../../../src/commands/mesh/desktop.mjs";
import { getCommand } from "../../../src/command-core.mjs";

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
      assert.equal(desktopProcessName("darwin"), "aof-mesh-desktop");
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
      assert.deepEqual(posix.calls[0], { file: "pgrep", args: ["-x", "aof-mesh-desktop"] });
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
];
