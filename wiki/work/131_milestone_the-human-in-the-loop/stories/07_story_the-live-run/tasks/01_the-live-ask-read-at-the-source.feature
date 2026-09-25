@manual @cli @work @work-stream
Feature: The live ask, read at the source — a real loop asks, Discord carries it within seconds, one answer from the CLI and one from the board resume the same sessions, the other lane builds on, and the loop finishes

  The SPEC's "outcome an outsider can verify", read on a running system rather than from the
  suites. Every observation is taken at its source: the ask file, the run record's bytes, the
  session's transcript, the diag log, the Discord message and the board card. A UI's word for any
  of them is never enough. Nothing lands in `src/`, and the results land in STATE.md for
  `aof:verify 131`. Deploy and restart obey `.claude/rules/build-deploy-restart.md`. An agent
  installs (task 00). The OPERATOR sets the env var, restarts the desktop app, starts the loop and
  gives both answers. No agent starts a daemon, the desktop app or a loop, and nothing is
  force-killed.

  RULINGS (QA, 2026-09-25):
  (1) "Pasted, not paraphrased" means the verbatim line copied from its source, with the source's
  own instant. A diag-log line keeps its leading ISO stamp. An ask file or run record is pasted
  whole (`Get-Content`). A terminal answer is preceded by `Get-Date -Format o`, run in the same
  terminal immediately before the command.
  (2) A Discord message is evidenced by its text, copied from the client, and its message id
  (Developer Mode, Copy Message ID). Its instant is derived from the id as
  `(id >> 22) + 1420070400000` ms since the epoch, so "within seconds" is a measured difference.
  A client's `HH:MM` is not an instant.
  (3) The webhook URL is never pasted, typed into a transcript or shown on screen in a capture.
  Its presence is checked as `[bool]$env:AOF_DISCORD_WEBHOOK_URL`, and nothing else.
  (4) The repository scrub applies to every paste: `umami`, never the real spelling.
  (5) `<log>` is the diag log T1's stderr announces
  (`~/.aof/mesh/logs/loop-diag.03.<stamp>.log`). `<runA>` and `<sA>` are 03/00's run id and
  session id, and `<runB>` and `<sB>` are 03/01's. `<recA>` and `<recB>` are those runs' records,
  `runs/node-7297/<run>.json` under the story's folder in its lane
  (`.aof/mesh/dispatch-worktrees/dispatch-03-00` or `…-03-01`). Each is recorded once in STATE.md
  and reused by every leg.
  (6) An ask file is `~/.aof/mesh/loop-asks/<run>.json`, read while it exists. The owner clears it
  only after the re-driven session returns, so it is readable for the whole re-drive.
  (7) Every ask in this run is a BUILD ask inside a lane, because the fixture's stories arrive
  refined (task 00). T1 narrates a lane as `Lane <ref> — …` (open, mint, drive, settle, commit,
  merge), never `Driving <ref>`, and the phase word on the row, the ask file, the card and Discord
  is `build`. A `refine` drive of a fixture story is the set-up fault below, never a finding.

  Background:
    Given task 00 is done and the PRECONDITION scenario below is signed off in STATE.md before any leg runs
    And terminal T1, in `C:\Source\umami\aof-test-repo`, runs `aof work loop 03` and stays visible
    And terminal T2 is in the same checkout, the board for the test-bed workspace is open (reached the operator's usual way, never through a port an agent handed out), and the Discord channel is visible beside them

  Scenario: PRECONDITION — the secret is in the operator's environment and the OPERATOR restarted the desktop
    Given the OPERATOR has set `AOF_DISCORD_WEBHOOK_URL` as a USER environment variable, holding a webhook for a channel they read
    When the OPERATOR quits the desktop app from its own UI and relaunches it with `aof mesh desktop run`, never with `Stop-Process -Force` or `taskkill`
    Then the newest `daemon-started` entries in `~/.aof/mesh/logs/mesh-serve.log` and `mesh-ui.log` name `build payload <buildId>`, with task 00's `<buildId>` and an `at` after the relaunch, both pasted
    And T1 and T2 are opened after the variable was set, and `[bool]$env:AOF_DISCORD_WEBHOOK_URL` prints `True` in each, pasted
    And `~/.aof/bin/aof.exe --version` in T2 prints `0.1.0 (payload <buildId>)`, pasted

  Scenario Outline: a set-up fault is corrected and the precondition re-checked, never recorded as a finding
    Given <signature> is observed
    Then no leg is recorded; the signature is noted in STATE.md, <remedy>, and the precondition is re-checked from the top

    Examples:
      | signature                                                                                               | remedy                                                                                                   |
      | `aof --version` prints `embedded`, or a `buildId` other than `BUILD_ID.json`'s                          | the install is re-run (task 00), because the payload did not land                                       |
      | a `daemon-started` entry older than the relaunch, or naming another build                                | the OPERATOR restarts the desktop app again                                                              |
      | `[bool]$env:AOF_DISCORD_WEBHOOK_URL` prints `False` in T1 or T2                                          | the terminal is closed and opened again, because a terminal keeps the environment it started with       |
      | a session settles the reserved choice itself, with no `waiting on you` row for its ref                    | the loop is left to finish; the story's reservation is reworded in the test-bed and the run is repeated on a fresh fixture, because WHEN a session asks is out of scope |
      | T1 prints `Driving 03/<SS> — refine`, because a fixture story arrived with no task                      | the loop is left to finish; the story is given its task in the test-bed (task 00) and the run is repeated on a fresh fixture |
      | T1 prints `03/02 — at capacity`, or the first `Wave` line does not dispatch all three stories            | the loop is left to finish; the bound or the overlapping `files:` is corrected in the test-bed (task 00) and the run is repeated on a fresh fixture |

  Scenario Outline: a failure is a finding against the owning story, never a retry
    Given <signature> is observed in a leg
    Then the leg is recorded as failed with the pasted evidence, and the finding is reported unnumbered for VERIFICATION's register, routed to story <story>
    And the loop is left as it is, with no hand kill, until the fix lands and the leg is re-run

    Examples:
      | signature                                                                                                                         | story |
      | an ask file or record whose `question` is `null`, or is not the session's last assistant message in its transcript                 | 01    |
      | a record whose last `asks` entry has `answeredAt` null after the answered session was re-driven                                    | 01    |
      | no Discord message for an ask row after 30 s, or a `notify-delivery-failed` or `notify-rate-limited` line in `<log>`               | 02    |
      | a Discord message over 2,000 characters, missing the answer command, or pinging anyone                                              | 02    |
      | the webhook URL appears in `<log>`, an ask file, a run record or a terminal line (and the operator rotates the webhook at once)      | 02    |
      | T1 prints `halted on session-needs-input` while another lane of `03` is still driving or dispatchable                               | 03    |
      | the answered story's next drive runs a session other than the one that asked                                                      | 03    |
      | `aof work answer` refuses `answer-not-waiting` while T1 shows that ref's `waiting on you` row                                       | 04    |
      | the board shows no ask card for a waiting ref, renders the question as Markdown, or prefills or suggests the reply                   | 05    |

  Scenario: leg 1 — a real question reaches the operator where they are
    Given T1 has printed `Lane 03/00 — mint: run <runA> …`
    When 03/00's session asks and T1 prints `03/00 — waiting on you (build, <elapsed>): <one-line ask>`
    Then the Discord channel receives a message whose first line starts `**03/00 — waiting on you** (build, <elapsed>)` (then ` · <node>` when the node resolves, the same node as leg 3's `by.node`), whose body is the ask, and whose action line is ``Answer: `aof work answer 03/00 "…"` ``, pasted with its message id
    And the instant derived from that id is within 10 s of the `<log>` instant of T1's row, and both instants are pasted
    And `<log>` carries no line naming `notify-` between the row and the message
    And the ask file for `<runA>` reads `"state": "waiting"`, `"ref": "03/00"`, `"phase": "build"`, `"sessionId": "<sA>"`, and a `question` identical to the last assistant message of `<sA>.jsonl`, both pasted
    And `<recA>` reads `"state": "running"`, and its last `asks` entry holds that `question` with `askedAt` set and `answer`, `answeredAt` and `parkedAt` null, pasted whole

  Scenario: leg 2 — the other lane keeps going while the question stands
    Given 03/00's `waiting on you` row is standing and has not been answered
    When the operator waits until `<log>` shows a `Lane 03/02 — …` line (drive, settle, commit or merge) after the row's instant
    Then that line is pasted with its instant, and T1 has printed no `halted on` line
    And T1 repeats 03/00's row with a larger elapsed, and both rows are pasted with their instants
    And `<recA>` is read twice, a minute apart, and its `heartbeatAt` advanced between the two reads while `state` stayed `running`: both pasted

  Scenario: leg 3 — the answer from the CLI resumes the same session
    Given leg 2 is recorded and 03/00 is still waiting
    When `Get-Date -Format o` then `aof work answer 03/00 "<the operator's own words>" --json` run in T2
    Then the envelope reads `"ok": true`, `"runId": "<runA>"`, `"delivery": "waiting"`, `"state": "answered"`, and `by` is `{ "actor": "you", "via": "cli", "node": "node-7297" }`, pasted
    And within 5 s T1 prints `03/00 — answered by you (build, <elapsed>)`, pasted with its `<log>` instant
    And the Discord channel receives a message whose first line starts `**03/00 — answered by you** (build, <elapsed>)`, with the answer verbatim as its body and `The session is resuming.` as its last line, pasted with its message id
    And `<sA>.jsonl` gains a user turn whose text holds the answer verbatim, stamped after the answer, pasted
    And `<recA>`'s last `asks` entry reads the answer verbatim, `"by": "you"` and `answeredAt` set, and its `sessionId` is still `<sA>`, pasted
    When `aof work answer 03/00 "a second answer" --json` runs in T2 while the ask file still reads `answered`
    Then it exits non-zero with `ask-already-answered`, naming `you`, and `<recA>` is unchanged, both pasted

  @ui @board
  Scenario: leg 4 — the answer from the board resumes the same session
    Given 03/01 is waiting, T1 shows its `waiting on you` row, and Discord carried its ask as in leg 1
    When the operator opens 03/01 on the board
    Then the detail panel's body opens with the ask card: `WAITING ON YOU`, the cost `build · <elapsed>`, the question as plain text identical to the ask file's `question`, the label `Your answer`, an empty textarea with no placeholder, and one `Send answer` button that is disabled
    And the card and its state are described in STATE.md with the instant noted
    When the operator types their own words and presses `Send answer`
    Then the card replaces the reply with `✓ Answered by <who> · <elapsed> — the session is resuming` and the answer verbatim below it
    And the ask file for `<runB>`, pasted whole during the re-drive, reads `"state": "answered"`, the answer verbatim, and `by.via` `"board"`
    And T1 prints `03/01 — answered by <who> (build, <elapsed>)`, and Discord carries the matching `answered by` message, both pasted
    And `<sB>.jsonl` gains a user turn holding the answer verbatim, and `<recB>`'s last `asks` entry reads it with `answeredAt` set and `sessionId` still `<sB>`, both pasted

  Scenario: leg 5 — the loop finishes and the record keeps the conversation
    Given both answers are given and nothing else is asked
    When the loop runs to its end
    Then T1's last line is `03 — loop done.`, and `<log>` ends with `exit code=0` and holds no `halted on` line, all pasted with their instants
    And the test-bed's `03_milestone_ask-target/SPEC.md` reads `status: done`, and Discord carries `**03 — accepted**` with the milestone title, and no `loop halted` message: both pasted
    And the merged run records of 03/00 and 03/01, read in the test-bed after the loop, each carry exactly one `asks` entry with the question, the answer verbatim, `by`, `askedAt` and `answeredAt` set, and `parkedAt` null, pasted whole
    And the merged run records of 03/02 carry `"asks": []`, pasted
    And `Get-ChildItem ~/.aof/mesh/loop-asks/` lists no file for `<runA>` or `<runB>`, pasted

  Scenario: every observation is in STATE.md
    Then `wiki/work/131_milestone_the-human-in-the-loop/STATE.md` carries, for each scenario above, the procedure as run, every instant, message id, file and record, pasted per RULING (1) and scrubbed per RULING (4)
    And each block carries a `verifies →` pointer to the scenario it discharges, for `aof:verify 131`
    And no block carries the webhook URL
