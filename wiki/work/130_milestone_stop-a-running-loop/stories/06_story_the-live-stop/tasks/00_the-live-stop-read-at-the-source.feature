@manual @cli @work @work-stream
Feature: the live stop, read at the source — the verb, the fleet and the desktop each stop a real loop on this machine, the record settles cancelled, nothing relaunches it, and --resume brings it back

  ADR-006 §5 and the SPEC's "outcome an outsider can verify", read on a running system rather than
  from the suites. Every observation is taken at its source — the run record's bytes, the diag log,
  the request file, the shell's halt line, the fleet's status body, the desktop's declarations
  answer — never a UI's word for it. Nothing lands in `src/`; the results land in STATE.md for
  `aof:verify 130`. Deploy and restart obey `.claude/rules/build-deploy-restart.md`: an agent
  installs, the OPERATOR restarts the desktop app; no agent starts a daemon, a worker or a loop;
  nothing is force-killed. Between legs the only levers are `--resume` and `--stop`; a hand
  `taskkill` of the loop would leave the `running` row this milestone exists to end.

  RULINGS (QA, 2026-09-13): (1) "pasted, not paraphrased" means the verbatim line copied from its
  source into STATE.md with the source's own instant: a diag-log line keeps its leading ISO stamp;
  a record or request file is pasted as the whole JSON (`Get-Content`); a terminal answer is
  preceded by `Get-Date -Format o` run in the same terminal immediately before the command; a
  status body is the JSON the command or `curl` returned. "The record was cancelled" is a
  paraphrase and discharges nothing. (2) The rule file's "both daemons print a `Build:` line" is
  read, under the supervisor, from the newest `daemon-started` entry in
  `~/.aof/mesh/logs/mesh-serve.log` and `mesh-ui.log` — the stdout line is not visible there.
  (3) The desktop writes no log of its own, so "no `taskkill` fallback" is read from the diag log:
  the halt line followed by `exit code=0` (a tree-killed process writes no exit line) inside
  `STOP_GRACE_MS` (30 s) of the cancel press. (4) `--resume` inherits `supervised` from the
  declaration it resumes; repeating `--supervised` is allowed, not needed. (5) A drain's halt
  `Details` carry no `cancelled=` (null facts are not printed); a cancel's carry `cancelled=<runId>`.
  (6) The loop runs on the standing test-bed `C:\Source\umami\aof-test-repo`, on an item STATE.md
  names once; `<scope>`, `<ref>`, `<L>`, `<log>` and `<path>` are recorded once and reused by every leg.

  Background:
    Given the PRECONDITION scenario below is signed off in STATE.md before any leg runs
    And terminal T1 in `C:\Source\umami\aof-test-repo` runs `aof work loop <scope> --supervised` and stays visible; its stderr announces the diag log, recorded as `<log>` (`~/.aof/mesh/logs/loop-diag.<scope>.<stamp>.log`)
    And `<L>` is `brief.loop.loopRunId` of the newest `runs/node-7297/*.json` under the driven item, and `<path>` is `~/.aof/mesh/loop-stops/<L>.json`
    And terminal T2 in the same checkout, the fleet at `http://127.0.0.1:4181/?mode=fleet` and the desktop window are visible beside T1

  Scenario: PRECONDITION — the payload is installed and the OPERATOR restarted the desktop
    Given `node scripts/install-local.mjs --desktop` has run from `C:\Source\umami\aof` — the Rust app changed in 04 and `ui/` in 03, so neither `--skip-ui` nor `--sea` — and `buildId` is read from `~/.aof/bin/BUILD_ID.json`
    When `~/.aof/bin/aof.exe --version` runs in T2
    Then it prints `0.1.0 (payload <buildId>)` with that exact `buildId`, pasted
    When the OPERATOR quits the desktop app from its own UI and relaunches it with `aof mesh desktop run` — never an agent, never `Stop-Process -Force`, never `taskkill`
    Then the newest `daemon-started` entry in `~/.aof/mesh/logs/mesh-serve.log` reads `mesh serve running (node win-host-a, build payload <buildId>)` and in `mesh-ui.log` reads `mesh ui running (build payload <buildId>)`, both with `at` after the relaunch, both pasted
    And `aof work loop --help` in T2 shows `[--stop]` in its usage — the shell T1 will run is the new payload

  Scenario Outline: a wrong build is refused before any observation
    Given <signature> is observed
    Then no leg runs and nothing else is pasted; the signature is recorded in STATE.md and <remedy>, then the precondition is re-checked from the top

    Examples:
      | signature                                                                                     | remedy                                                                                    |
      | `aof --version` prints `embedded`, or a `buildId` other than `BUILD_ID.json`'s                | the install is re-run — the payload did not land or the launcher fell back                |
      | a `daemon-started` entry whose `at` precedes the relaunch, or whose build is not `<buildId>`  | the OPERATOR restarts the desktop app again — the daemons are the old payload's           |
      | `aof work loop --help` shows no `[--stop]`, or `--stop` answers `unknown option`               | install, then the operator's restart, then T1 is started again — the shell was the old payload |

  Scenario Outline: a failure signature is a finding against the owning story, never a re-try
    Given <signature> is observed in a leg
    Then the leg is recorded as failed with the pasted evidence, the finding is reported unnumbered for VERIFICATION's register routed to story <story>, and the loop is left as it is — no hand kill — until the fix lands and the leg is re-run

    Examples:
      | signature                                                                                                     | story   |
      | a run record still `"state": "running"` after the halt line                                                   | 02      |
      | a halt line whose `Details:` carry no `request=` on a file-driven stop (`signal=SIGINT` from a `--stop`)       | 02      |
      | `<path>` written under the checkout, or `git status --short` in T2 changed by a `--stop`                       | 01      |
      | a new `runs/node-7297/*.json` for `<ref>` within the two ticks after a honoured stop — the desktop relaunched it | 04      |
      | `<log>` ending with no halt line and no `exit code=` line after a desktop press — the loop reached only `taskkill` | 04      |
      | a fleet line or a desktop row still present 90 s after the halt line                                          | 03 / 04 |

  Scenario: leg 1 — the verb drains, the run settles as it ended, and resume clears
    Given T1 shows `Driving <ref> — <phase>, cycle <n> of <cap>, L2.` with no `Driven` after it
    When `Get-Date -Format o` then `aof work loop <scope> --stop` run in T2
    Then T2 prints `<scope> — stop requested (drain) for loop <L>, live. <path>` and exits 0, and `<path>` (pasted whole) reads `level: 1`, `state: "requested"`, `escalatedAt: null`, `honouredAt: null`, `cancelled: null`, `by: { node: "win-host-a", pid: <T2's aof pid> }`
    And T1 finishes the in-flight drive and `<log>` shows `stdout Driven <ref> — <phase> (<outcome>).` then `stdout <scope> — halted on operator-interrupt at <ref> (producer stop-request). Resume with: aof work loop <scope> --resume Details: signal=stop-request; level=1; request=<path>; by=win-host-a:<pid>.` then `exit code=0` — the three lines pasted with their instants
    And the drive's record (the newest `runs/node-7297/*.json` for `<ref>`, pasted whole) reads `state` `done` or `failed` as the drive ended — never `running` — and `<path>` now reads `state: "honoured"`, `honouredAt` set, `cancelled: null`
    When `aof work loop <scope> --resume` runs in T1
    Then T1 prints `Cleared stop request for <L> (honoured, level 1) — resumed.` exactly once, `Test-Path <path>` is `False`, and T1 prints a new `Driving …` line — the line, the `Test-Path` answer and the instant pasted

  Scenario: leg 2 — the verb cancels, the bracket closes the session, and the record reads cancelled
    Given T1 shows a `Driving <ref> — …` line with no `Driven` after it
    When `aof work loop <scope> --stop` runs twice in T2, each preceded by `Get-Date -Format o`
    Then the first answer reads `(drain) … live` and the second `<scope> — stop requested (cancel) for loop <L>, live. <path>`, and `<path>` reads `level: 2` with `escalatedAt` set — both answers and the file pasted
    And within 10 s of the second answer `<log>` shows, in order, `driver {"phase":"stop-requested","pid":<pid>,"outcome":"failed","failureReason":"cancelled"}`, `driver {"phase":"tree-terminated","pid":<pid>,"ok":true,…}`, `driver {"phase":"pty-released","pid":<pid>}`, `driver {"phase":"exit-confirmed","pid":<pid>,…,"sessionId":"<sessionId>"}`, `stdout Driven <ref> — <phase> (cancelled).`, `stdout <scope> — halted on operator-interrupt at <ref> (producer stop-request). Resume with: aof work loop <scope> --resume Details: signal=stop-request; level=2; request=<path>; by=win-host-a:<pid>; cancelled=<runId>.` and `exit code=0` — the seven lines pasted with their instants
    And `runs/node-7297/<runId>.json` (the halt's `cancelled=<runId>`, pasted whole) reads `"state": "cancelled"`, `"failureReason": null`, `"sessionId": "<sessionId>"` — the bracket's
    And `aof work run-status <ref> --json` lists no run with `"state": "running"`, and `<path>` reads `state: "honoured"`, `cancelled: "<runId>"` — both pasted

  Scenario: leg 3 — a stop in the between-drives gap answers not live and still stops the next tick
    Given the loop resumed and T1 has just printed `Driven <ref> — <phase> (<outcome>).` with no `Driving …` after it (a gate step is running, or the tick is between drives)
    When `Get-Date -Format o` then `aof work loop <scope> --stop` run in T2 inside that gap
    Then T2 prints `<scope> — stop requested (drain) for loop <L>, not live. <path>` and `<path>` reads `state: "honoured"` at once, `honouredAt` set, `cancelled: null` — ADR-002 §3f, the answer and the file pasted
    And within 2 s of the next tick head T1 prints no further `Driving …` and `<log>` shows `stdout <scope> — halted on operator-interrupt at <ref or scope> (producer stop-request). … Details: signal=stop-request; level=1; request=<path>; by=win-host-a:<pid>.` then `exit code=0` — no drive started, no new record under `runs/node-7297/`
    And the next `aof mesh status --json --declarations` answer's `declarations.rows` carries no row with `id: "<L>"` — a honoured request drops the row (ADR-004 §4b), the array pasted
    But if the answer read `live.` the gap was missed: T1's `Driving …` instant is pasted beside it and the scenario is re-run at the next gap — never a hand kill

  Scenario: leg 4 — the desktop does not relaunch a stopped loop, and shows the row's end
    Given leg 2's halt, `<path>` reading `honoured`, and the declaration `supervised: true`
    When `Get-Date -Format o` then `aof mesh status --json --declarations` run in T2 at 0 s, 30 s and 60 s after the halt (the desktop asks every tenth 3 s tick)
    Then each answer's `declarations.rows` carries no row with `id: "<L>"` — the three arrays pasted with their instants
    And the desktop's loop bar showed `loop <scope>` with the pill `stopped` and no control, then the row and the bar are gone — the instant of each state noted
    And `Get-ChildItem runs/node-7297/` for `<ref>` (pasted) lists no file newer than the cancel's `<runId>` — nothing relaunched it
    When `aof work loop <scope> --resume` runs in T1
    Then T1 prints `Cleared stop request for <L> (honoured, level 2) — resumed.`, and the next `--declarations` answer (≤ 30 s) carries a row with `id: "<L>"` and `label: "loop <scope>"`, pasted

  Scenario: leg 5 — the fleet's button walks the two rungs
    Given the loop resumed (leg 4) and T1 in a drive
    When `curl http://127.0.0.1:4181/api/mesh/status` runs in T2 and this node's card is read on the fleet
    Then the body's `localNodeId` is `"win-host-a"` and the `win-host-a` node's `presence.loops[0]` is the eleven-key entry with `loopRunId: "<L>"` and `stop: null`; the card's current-work region shows `loop <scope> · <phase> <ref> · cycle <n> of <cap>` with a `Stop` button; `umamis-mac-mini`'s card shows any loop line of its own with no button — the body pasted, the cards described
    When `Stop` is clicked (the instant noted)
    Then the line reads `loop <scope> · stopping · …`, the button reads `Stop now` (destructive) — disabled for one poll, then enabled; `<path>` reads `level: 1`; within 20 s the status body's `loops[0].stop` reads `"drain"` — the file and the entry pasted
    When `Stop now` is clicked (the instant noted)
    Then the line reads `· cancelling ·` with no button; `<log>` shows leg 2's bracket and halt with `level=2` and `cancelled=<runId>`; `runs/node-7297/<runId>.json` reads `"state": "cancelled"`; within 20 s the line is gone, the body's `presence` carries no `loops`, and `running N runs` decrements — the record and the body pasted

  Scenario: leg 6 — the desktop's row walks the ladder without the fallback
    Given `aof work loop <scope> --resume` run in T1 after leg 5, a drive in flight, the desktop's row `loop <scope>` at `running`
    When the row's stop control is pressed once (the instant noted)
    Then the pill reads `stopping`; `<path>` reads `level: 1` with `by.pid` NOT T1's pid (the desktop's spawned `aof`); after the drive `<log>` shows leg 1's halt with `level=1` then `exit code=0`; the pill reads `stopped` with no control; the row is gone after the next declarations tick — the file, the halt and the instants pasted
    When `aof work loop <scope> --resume` runs in T1, a drive is in flight, and the control is pressed twice (both instants noted)
    Then `<path>` reads `level: 2`; `<log>` shows the bracket, `stdout Driven <ref> — <phase> (cancelled).`, the halt with `level=2; … cancelled=<runId>` and `exit code=0`, that instant inside 30 s of the second press; `runs/node-7297/<runId>.json` reads `"state": "cancelled"` — no `taskkill` reached the loop

  Scenario: a remote loop is refused by name
    Given a loop the OPERATOR started on `umamis-mac-mini`'s own console, in a workspace this checkout is a member of (skipped and recorded as not exercised when none runs)
    When `aof work loop <its scope> --stop` runs in T2 against that workspace
    Then it exits non-zero with code `loop-stop-not-local`, the message naming `umamis-mac-mini`, `win-host-a` and "stop it on umamis-mac-mini's own console", and `Get-ChildItem ~/.aof/mesh/loop-stops/` gains no file — stderr and the listing pasted
    And the fleet renders that loop's line on the Mac's card with no button and a `title` ending `· remote — stop from umamis-mac-mini's own console`

  Scenario: every observation is in STATE.md
    Then `wiki/work/130_milestone_stop-a-running-loop/STATE.md` carries, per scenario above, the procedure as run, every instant, the record and request bytes, the `<log>` lines and the halt lines — pasted per RULING (1), never paraphrased — with a `verifies →` pointer at the scenario each discharges, for `aof:verify 130`
