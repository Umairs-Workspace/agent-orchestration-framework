@manual @ui @distribution @adapter
Feature: A supervised loop relaunches on the real supervisor — a reclaimed declaration comes back with no console, drives a Claude session to completion, and stops appearing when it is done

  The one thing no fixture substitutes for. A supervisor-spawned `aof work loop` runs under
  `CREATE_NO_WINDOW` with piped stdio and no console, and must drive a Claude PTY through
  node-pty/ConPTY. The same-shaped precedent is the supervised `mesh serve --serve` daemon running
  the session-spawn handler on this node (`src/mesh/launcher.mjs:1339-1355`); this scenario proves
  the shape on the real supervisor rather than assuming it. It is the milestone's framing failure,
  replayed with the fix in place: a loop dies with the machine, and comes back.

  Two LIVE HALVES land here because `cargo test` compiles only `crates/core` and can therefore
  observe the decision but never the wiring: that an operator Stop by id really survives the ticks
  that follow it, and that a named clean exit really holds the declaration the same way. Their
  decisions are `@executable` in tasks 01 and 03; scenario four is the wiring, on the real thing.

  Run it on the control node with the payload installed and the desktop app relaunched through
  `aof mesh desktop run` (never a hand-spawned daemon — a hand-spawned one inherits the wrong
  cwd/env, which is the very thing the row's `cwd` exists to fix). Every Then below names the
  command output or the file that proves it; a claim is not evidence.

  One correction the operator should not trip over: `last_clean_exit` is NOT a tray field. It
  reaches the operator through the desktop WINDOW's footer — `get_view_model` copies it into the
  IPC view-model's `notice` (`app/desktop/crates/app/src/main.rs:106`) and the WebView renders it
  as the footer line (`app/desktop/ui/app.js:336`). `build_tray_menu` reads the two signals and the
  fleet summary, never the notice. The window footer is where scenarios three and four look.

  ADR-006 §4, §5, §7. STATE.md "The framing is a post-mortem, not a proposal". FF-12606.

  Scenario: a reclaimed supervised declaration comes back without an operator command
    Given `node scripts/install-local.mjs` has run and `~/.aof/bin/aof.exe --version` reports `0.1.0 (payload <buildId>)` for the build under test
    And a scope declared with `aof work loop <scope> --level L2 --supervised` on this node, driven for one cycle, then killed mid-drive
    And its stale run reclaimed by the next `run-start` sweep — the record at `wiki/work/<scope folder>/runs/<node>/<runId>.json` reading `state: failed`, `failureReason: runtime_offline`, and a stamped `reclaimedAt`
    And `aof mesh status --json --declarations` listing exactly one row under `declarations.rows` for that scope, carrying its id, the argv `["work","loop",<scope>,"--level","L2","--resume"]`, and this workspace's `projectRoot` as its `cwd`
    When the desktop app is relaunched through `aof mesh desktop run`
    Then within one declarations tick (30 s) a NEW record file appears under `wiki/work/<scope folder>/runs/<node>/`, whose `retryOf` is the reclaimed run's `runId` and whose `attempt` is one greater
    And `aof work run-status <scope> --json` reports that run with `state: "running"`, a non-null `sessionId`, `answeredFrom: "disk"`, and a `heartbeatAt` that has advanced between two reads taken 60 s apart
    And `Get-CimInstance Win32_Process -Filter "Name='aof.exe'" | Select ProcessId,ParentProcessId,CommandLine` shows that child's `ParentProcessId` as the running `aof-mesh-desktop.exe` and its `CommandLine` carrying `work loop <scope>`, with no console window on the desktop
    And the record it wrote is under THIS workspace's `wiki/work/`, which is the row's `cwd` and not the supervisor's own launch directory
    And the Claude session reaches a settled outcome under the supervisor — the same record's `state` leaving `running` in `aof work run-status <scope> --json`

  Scenario: a loop that finishes stops appearing and is not relaunched
    Given the relaunched loop above runs its scope to `done`, printing `<scope> — loop done.` and exiting 0
    When the next ten declarations ticks (5 minutes) pass
    Then `aof mesh status --json --declarations` lists no row for that scope
    And no further record file appears under `wiki/work/<scope folder>/runs/<node>/` in that window
    And no `aof.exe` child of `aof-mesh-desktop.exe` carries `work loop <scope>` in its `CommandLine`

  Scenario: a loop that halts for cause is visible and left alone
    Given a supervised declaration whose next drive halts `session-needs-input`, printing its halt line and exiting 0
    When the supervisor's child exits
    Then the desktop window's footer carries that line verbatim, including `Resume with: aof work loop <scope> --resume`
    And `aof mesh status --json --declarations` no longer lists a row for that scope
    And no further record file appears under `wiki/work/<scope folder>/runs/<node>/` over the next ten ticks

  Scenario: a hold really holds — an operator Stop, and a refusal, both survive the ticks that follow
    Given a supervised declaration running under the real supervisor, its row still listed by `aof mesh status --json --declarations`
    When the operator stops it from the desktop window
    Then no `aof.exe` child of `aof-mesh-desktop.exe` carries `work loop <scope>` over the next ten declarations ticks (5 minutes), and no new record file appears under `wiki/work/<scope folder>/runs/<node>/`, while its row is listed throughout
    When the operator starts it again from the desktop window
    Then a new child appears within one tick and a new record file is written
    Given instead a second `aof work loop <scope> --level L2` driven by hand in a terminal, so the supervisor's own launch is refused `a non-terminal run already exists for this item`
    When that refused child exits 1
    Then the desktop window's footer names that child and that reason
    And no further `aof.exe` child of `aof-mesh-desktop.exe` carries `work loop <scope>` over the next ten ticks — the refusal is surfaced once, never re-attempted every thirtieth second
