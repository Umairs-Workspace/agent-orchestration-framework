@manual @cli @work @distribution
Feature: the view model lists the declarations the app supervises, and stop_loop takes a declaration down the ladder — request, hold, grace, tree kill — never start_kill

  ADR-004 §1-§3, §5. `IpcViewModel` gains `loops: Vec<IpcLoopRow>` with EXACTLY `{ id, label,
  signal }` — one per NON-reserved id in the signals map, joined on id with
  `SupervisorState.declared` (new: the rows of the last ANSWERED declarations tick, replaced on
  every answered tick and never cleared by a failed poll) for the `label`. `SupervisedChild` is
  unchanged. ONE Tauri command, `stop_loop(id)`, sends the existing `SupervisorCommand::Stop(id)`;
  the command loop branches on `is_reserved_id(&id)`: a reserved id keeps today's `hold` +
  `set_desired(false)`; a declaration takes `ctl.hold()` and the ladder. The shell applies
  `stop_step`: `Request` → spawn `stop_argv(child)` through `form_argv_spawn(resolved, argv,
  child.cwd)` (the resolved absolute `aof`, `CREATE_NO_WINDOW`, the row's own cwd), signal
  `stopping`; a spawn that fails or exits non-zero → the standing notice `loop <scope>: <last
  non-empty line>` keyed to the id, the pill keeping the child's true signal; `Cancel` → spawn
  again and start the grace; `Kill` → `taskkill /PID <child.id()> /T /F` then `child.wait()`,
  signal `stopped`; `Done` → `stopped`. A declaration's Stop NEVER calls `child.start_kill()`; the
  two daemons keep theirs. The shell is not cargo-tested (the `app` crate is excluded), so this
  task is verified by the developer against the running app after `install-local --desktop` and
  the operator's restart; the pure decisions it applies are task 00's.

  RULINGS (QA, 2026-09-13): the installed app is a `--release` build with no WebView console, so a
  step that calls `invoke` or reads `get_view_model` by hand runs against a devtools build of the
  same source (`cargo run --manifest-path app/desktop/crates/app/Cargo.toml`, the release app quit
  first — the single-instance guard hands a second launch to the first); every other observation is
  the release window's, where the rendered loop bar (task 02) is `loops` made visible. `<loop pid>`
  is the pid of the `aof work loop <scope> …` process the supervisor spawned (`Get-CimInstance
  Win32_Process`, `CommandLine` matching `work loop <scope>`), never the supervisor's. The app keeps
  no log: "the tree kill did not fire" is read from the run record and the loop-diag log
  (`~/.aof/mesh/logs/loop-diag.<scope>.*.log`) — a killed tree leaves a `running` record and no
  halt line. `exited` is the exit observed AFTER press 1 (the exit that closes the bracket), never
  "the child is in a backoff": a press on a `restarting` declaration is `Request`, as DESIGN
  §Surface 2's rung 1 says. The stand-in for a child that will not exit is a stub `aof` on the
  resolved path that forwards every argv except the declaration's own launch (`work loop <scope>
  --level …`) to the real `aof`, and for that one spawns a grandchild and sleeps forever — the
  poll, the daemons and `--stop` still reach the real verb; the crash-looping stand-in exits 1 for
  that argv instead.

  Background:
    Given the desktop app rebuilt by `node scripts/install-local.mjs --desktop` and restarted by the operator
    And a supervised loop running on this machine — `aof work loop <scope> --supervised` on a fixture item — so the reconcile has started a controller for its declaration

  Scenario: the view model lists the declaration with its label and signal
    When `get_view_model` is invoked from the window (`invoke('get_view_model')` in the WebView console)
    Then its `loops` carries one row `{ id: <loopRunId>, label: "loop <scope>", signal: "running" }` with exactly those three keys — no `argv`, `cwd`, `scope`, `level` or `cap`
    And the two daemons appear nowhere in `loops`
    And after a poll that fails to answer (the resolved `aof` briefly renamed), the row's `label` is unchanged (the last answered tick is kept)

  Scenario: stop_loop on a declaration spawns the verb and reports stopping
    When `invoke('stop_loop', { id: <loopRunId> })` is called once
    Then within a second the request file exists under `~/.aof/mesh/loop-stops/<loopRunId>.json` at level 1 with `by.pid` the SPAWNED aof's pid (not the supervisor's)
    And `get_view_model().loops[0].signal` reads `"stopping"` and the two daemon pills are unchanged
    And the controller is held — the next declarations tick (≤ 30 s) does not restart it
    And the loop's own terminal halts `operator-interrupt` after its in-flight drive; the child exits 0; the row reads `stopped` with no control; after the next declarations tick the row is gone

  Scenario: a second press cancels now, and the grace is counted from it
    Given a supervised loop in flight and `stop_loop` pressed once (the pill reads `stopping`)
    When `stop_loop` is pressed again
    Then the request file reads level 2 within a second
    And the loop's session is cancelled through the driver's bracket (the diag log shows `stop-requested` … `exit-confirmed`), its run record reads `cancelled`, and the child exits on its own well inside 30 s
    And the fallback never fired: `<loop pid>` is gone before the 30 s grace elapses, the record is `cancelled` and the diag log ends on the halt line

  Scenario: two presses inside the request spawn's lifetime land in press order
    Given a supervised loop in flight
    When `stop_loop` is invoked twice within 200 ms (a double-click on the control)
    Then after both spawns exit the request file reads level 2 — level 1 then 2, never two level-1 writes
    And the pill reads `stopping` throughout, the grace is counted from the SECOND spawn, and no third spawn occurs

  Scenario: the tree kill is the fallback for a loop that does not answer
    Given the sleeping stand-in supervised under its declaration
    When `stop_loop` is pressed twice and 30 s pass
    Then the supervisor runs `taskkill /PID <loop pid> /T /F` after the grace, awaits the child, and the row reads `stopped`
    And the stand-in's grandchild is gone with it (`/T`), and neither is gone earlier than 30 s after the SECOND press
    And no notice is raised in the footer — the fallback is the designed rung, not a fault

  Scenario: a stop on a restarting declaration takes the same ladder and is never relaunched
    Given the crash-looping stand-in supervised under its declaration, its pill reading `restarting` under the backoff
    When `stop_loop` is pressed once
    Then the request file exists and is already `honoured` (`live: false` — the loop is not live, ADR-002 §6)
    And the pill reads `stopping` then `stopped`, the stand-in is not spawned again for that scope, and after the next declarations tick the row is gone
    And across two further ticks nothing relaunches that scope, and the honoured mark stands until `aof work loop <scope> --resume` clears it

  Scenario: a failed request spawn is a footer notice and the pill tells the truth
    Given the resolved `aof` is replaced by a stub that exits 1 printing `stop refused: loop-stop-no-declaration`
    When `stop_loop` is pressed
    Then the footer's standing notice reads `loop <scope>: stop refused: loop-stop-no-declaration`, keyed to the declaration's id
    And the row's pill still reads `running`
    And a later successful restart of the SERVER daemon does not clear that notice

  Scenario: the notice is keyed to the loop and cleared only by that loop's own next start
    Given the notice `loop <scope>: stop refused: loop-stop-no-declaration` standing and the real `aof` restored
    When the Mesh web UI is stopped and started from its toggle, and a second supervised loop on another fixture item starts (its own row appears)
    Then the notice still stands
    When `<loop pid>` is killed by hand (`taskkill /PID <loop pid> /T /F`) and the watchdog relaunches the declaration
    Then that relaunch clears it — the footer reads the freshness line, or the relaunch's own outcome (`loop <scope>: duplicate-run` while the killed run is still non-terminal), never the stale refusal

  Scenario: a stop for an id no controller holds changes nothing
    When `invoke('stop_loop', { id: "no-such-loop" })` is called, and again with the id of a row already retired
    Then no request file is written, no signal changes and no notice is raised

  Scenario: the daemons keep their immediate stop
    When `invoke('stop_mesh_ui')` is called
    Then the UI daemon is killed at once (`stopped` within a second) with no request file written — `is_reserved_id` routed it to today's path

  Scenario: the shell contains no start_kill on the declaration path
    When `app/desktop/crates/app/src/supervisor.rs` is read
    Then `child.start_kill()` appears only on the reserved-id (daemon) path, and the declaration path's kill is `taskkill` with `/T /F` on `child.id()`
