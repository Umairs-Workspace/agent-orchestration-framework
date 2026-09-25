@manual @cli @work @work-stream
Feature: The live ask, read at the source — a real loop asks, the bot carries it within seconds, answers from the CLI, the board and a Discord reply resume the same sessions, the other lane builds on, the loop finishes, and a supervised loop is stopped and handed back from Discord

  The SPEC's "outcome an outsider can verify", read on a running system rather than from the
  suites, now through aof's own bot (09–11). Every observation is taken at its source: the ask
  file, the run record's bytes, the session's transcript, the diag log, the Discord message and the
  board card. A UI's word for any of them is never enough. Nothing lands in `src/`, and the results
  land in STATE.md for `aof:verify 131`. The OPERATOR stores the token, invites the bot, names the
  channel and the allowlist, restarts the desktop app, starts the loops and gives every answer. No
  agent starts a daemon, the desktop app or a loop, and nothing is force-killed. A worker's ask (12)
  is not exercised here: this is a loop on this machine, and 12's live proof stays its OUTCOME gap.

  RULINGS:
  (1) "Pasted, not paraphrased" means the verbatim line copied from its source, with the source's
  own instant. A diag-log line keeps its leading ISO stamp. An ask file or run record is pasted
  whole (`Get-Content`). A terminal answer is preceded by `Get-Date -Format o`, run in the same
  terminal immediately before the command.
  (2) A Discord message is evidenced by its text, copied from the client, and its message id
  (Developer Mode, Copy Message ID). Its instant is `(id >> 22) + 1420070400000` ms since the epoch.
  A client's `HH:MM` is not an instant.
  (3) The bot token is never pasted, typed into argv or a transcript, or shown in a capture. Its
  presence is checked only through `aof messaging status`. The env override stays UNSET, so the
  sends prove the store path.
  (4) The repository scrub applies to every paste: `umami`, never the real spelling. The operator's
  Discord user id is written only into the test-bed's config, never pasted into STATE.md; a paste
  that shows it replaces it with `<user-id>`.
  (5) `<log>` is the diag log T1's stderr announces (`~/.aof/mesh/logs/loop-diag.03.<stamp>.log`).
  `<runA>`/`<sA>`, `<runB>`/`<sB>` and `<runD>`/`<sD>` are the run and session ids of 03/00, 03/01
  and 03/03. `<recX>` is that run's record, `runs/node-7297/<run>.json` under the story's folder in
  its lane (`.aof/mesh/dispatch-worktrees/dispatch-03-<SS>`). Each is recorded once and reused.
  (6) An ask file is `~/.aof/mesh/loop-asks/<run>.json`, readable for the whole re-drive.
  (7) Every ask is a BUILD ask inside a lane. T1 narrates a lane as `Lane <ref> — …`, and the phase
  word on the row, the ask file, the card and Discord is `build`.

  Background:
    Given task 00 is done and the PRECONDITION scenario below is signed off in STATE.md before any leg runs
    And terminal T1, in `C:\Source\umami\aof-test-repo`, runs `aof work loop 03` and stays visible
    And terminal T2 is in the same checkout, the board for the test-bed workspace is open (reached the operator's usual way), and the Discord channel is visible beside them

  Scenario: PRECONDITION — the bot is stored, invited and allowed, and the OPERATOR restarted the desktop
    Given the OPERATOR has created a Discord application with a bot user, turned on Message Content Intent, and run `aof messaging init discord`, pasting the bot token at its hidden prompt
    And the OPERATOR opened the invite URL `init` printed and added the bot to the server that holds the channel
    And in the test-bed root the OPERATOR ran `aof messaging enable discord --channel <channel-id>`, added their own user id as `"allow": ["<user-id>"]` to `work.notify.channels.discord`, and committed `.aof/aof.config.json` on the test-bed branch
    When the OPERATOR quits the desktop app from its own UI and relaunches it with `aof mesh desktop run`, never with `Stop-Process -Force` or `taskkill`
    Then the newest `daemon-started` entries in `~/.aof/mesh/logs/mesh-serve.log` and `mesh-ui.log` name `build payload <buildId>`, with task 00's `<buildId>` and an `at` after the relaunch, both pasted
    And `mesh-serve.log` since that entry holds no `discord-bot-off`, `discord-bot-failed`, `discord-token-rejected`, `discord-intent-disallowed` or `discord-command-register-failed` line, checked and stated
    And `aof messaging status` in T2, in the test-bed root, prints `this machine: set (…)`, `env override AOF_DISCORD_BOT_TOKEN: not set` and `this project: enabled (discord → <channel-id>, 1 may answer by reply)`, pasted
    And typing `/` in the channel lists the bot's `status`, `asks` and `loop` commands, which proves the gateway reached READY and registered them, described
    And `git status --short` in the test-bed is empty, pasted

  Scenario Outline: a set-up fault is corrected and the precondition re-checked, never recorded as a finding
    Given <signature> is observed
    Then no leg is recorded; the signature is noted in STATE.md, <remedy>, and the precondition is re-checked from the top

    Examples:
      | signature                                                                                         | remedy                                                                                                   |
      | `aof --version` prints `embedded`, or a `buildId` other than `BUILD_ID.json`'s                    | the install is re-run (task 00), because the payload did not land                                       |
      | a `daemon-started` entry older than the relaunch, or naming another build                          | the OPERATOR restarts the desktop app again                                                              |
      | `discord-intent-disallowed` in `mesh-serve.log`                                                    | Message Content Intent is turned on in the Developer Portal and the desktop app restarted                |
      | `discord-token-rejected` in `mesh-serve.log`, or `this machine: not set`                           | the OPERATOR re-runs `aof messaging init discord` with the bot's current token and restarts the desktop |
      | `this project` names no channel id, or omits `1 may answer by reply`                               | the OPERATOR re-runs `enable discord --channel <id>` or fixes `allow`, and commits                      |
      | `env override AOF_DISCORD_BOT_TOKEN: set`                                                          | the variable is removed and T1 and T2 are reopened, so the sends read the store                         |
      | a session settles its reserved choice itself, with no `waiting on you` row for its ref             | the loop is left to finish; the reservation is reworded in the test-bed and the run repeated on a fresh fixture |
      | T1 prints `Driving 03/<SS> — refine`, or the first `Wave` line does not dispatch all four stories | the loop is left to finish; the fixture is corrected (task 00) and the run repeated on a fresh fixture   |

  Scenario Outline: a failure is a finding against the owning story, never a retry
    Given <signature> is observed in a leg
    Then the leg is recorded as failed with the pasted evidence, and the finding is reported unnumbered for VERIFICATION's register, routed to story <story>
    And the loop is left as it is, with no hand kill, until the fix lands and the leg is re-run

    Examples:
      | signature                                                                                                          | story |
      | an ask file or record whose `question` is `null`, or is not the session's last assistant message                     | 01    |
      | a record whose last `asks` entry has `answeredAt` null after the answered session was re-driven                      | 01    |
      | a Discord message over 2,000 characters, or pinging anyone                                                           | 02    |
      | T1 prints `halted on session-needs-input` while another lane of `03` is still driving or dispatchable                | 03    |
      | the answered story's next drive runs a session other than the one that asked                                        | 03    |
      | `aof work answer` refuses `answer-not-waiting` while T1 shows that ref's `waiting on you` row                         | 04    |
      | the board shows no ask card for a waiting ref, renders the question as Markdown, or prefills the reply               | 05    |
      | no bot message for an ask row after 30 s, or a `notify-delivery-failed` or `notify-rate-limited` line in `<log>`     | 09    |
      | the bot token appears in `<log>`, `mesh-serve.log`, an ask file, a run record or a terminal line (rotate it at once) | 09    |
      | an allowlisted reply to the ask message gets no ✅ and leaves the ask `waiting`, or gets a refusal line               | 10    |
      | a slash command answers nothing within 3 s ("The application did not respond"), or its text contradicts `work:list` | 11    |
      | `/loop resume` is accepted and the supervisor relaunches nothing within two polls                                   | 11    |

  Scenario: leg 1 — a real question reaches the operator where they are
    Given T1 has printed `Lane 03/00 — mint: run <runA> …`
    When 03/00's session asks and T1 prints `03/00 — waiting on you (build, <elapsed>): <one-line ask>`
    Then the channel receives a message from the bot whose first line starts `**03/00 — waiting on you** (build, <elapsed>)`, whose body is the ask, and whose action line is ``Answer: reply to this message, or `aof work answer 03/00 "…"` ``, pasted with its message id
    And the instant derived from that id is within 10 s of the `<log>` instant of T1's row, and both instants are pasted
    And the ask file for `<runA>` reads `"state": "waiting"`, `"ref": "03/00"`, `"phase": "build"`, `"sessionId": "<sA>"`, and a `question` identical to the last assistant message of `<sA>.jsonl`, both pasted
    And `<recA>` reads `"state": "running"`, and its last `asks` entry holds that `question` with `askedAt` set and `answer`, `answeredAt` and `parkedAt` null, pasted whole

  Scenario: leg 2 — the other lane keeps going, and the bot's views show the questions
    Given 03/00's `waiting on you` row is standing and has not been answered
    When the operator waits until `<log>` shows a `Lane 03/02 — …` line after the row's instant
    Then that line is pasted with its instant, and T1 has printed no `halted on` line
    And `<recA>` is read twice, a minute apart, and its `heartbeatAt` advanced between the two reads while `state` stayed `running`: both pasted
    When the operator runs `/status` in the channel
    Then the reply, visible only to them, is headed `**aof-test-repo**` and holds a line `03/00 — waiting on you (build, <elapsed>)`, pasted
    When the operator runs `/asks` in the channel
    Then the reply lists a line `03/00 — waiting on you (build, <elapsed>): <one-line ask>` followed by a `https://discord.com/channels/<guild>/<channel>/<message>` link whose message id is leg 1's, and a line for every other waiting ask, pasted

  Scenario: leg 3 — the answer from the CLI resumes the same session
    Given leg 2 is recorded and 03/00 is still waiting
    When `Get-Date -Format o` then `aof work answer 03/00 "<the operator's own words>" --json` run in T2
    Then the envelope reads `"ok": true`, `"runId": "<runA>"`, `"delivery": "waiting"`, `"state": "answered"`, and `by` is `{ "actor": "you", "via": "cli", "node": "node-7297" }`, pasted
    And within 5 s T1 prints `03/00 — answered by you (build, <elapsed>)`, pasted with its `<log>` instant
    And the channel receives a bot message whose first line starts `**03/00 — answered by you** (build, <elapsed>)`, with the answer verbatim as its body and `The session is resuming.` as its last line, pasted with its message id
    And `<sA>.jsonl` gains a user turn whose text holds the answer verbatim, and `<recA>`'s last `asks` entry reads the answer verbatim, `"by": "you"` and `answeredAt` set, with `sessionId` still `<sA>`, both pasted
    When `aof work answer 03/00 "a second answer" --json` runs in T2 while the ask file still reads `answered`
    Then it exits non-zero with `ask-already-answered`, naming `you`, and `<recA>` is unchanged, both pasted

  @ui @board
  Scenario: leg 4 — the answer from the board resumes the same session
    Given 03/01 is waiting, T1 shows its `waiting on you` row, and the bot carried its ask as in leg 1
    When the operator opens 03/01 on the board
    Then the detail panel opens with the ask card: `WAITING ON YOU`, the cost `build · <elapsed>`, the question as plain text identical to the ask file's `question`, the label `Your answer`, an empty textarea with no placeholder, and one disabled `Send answer` button, described with the instant
    When the operator types their own words and presses `Send answer`
    Then the card replaces the reply with `✓ Answered by <who> · <elapsed> — the session is resuming` and the answer verbatim below it
    And the ask file for `<runB>`, pasted whole during the re-drive, reads `"state": "answered"`, the answer verbatim, and `by.via` `"board"`
    And T1 prints `03/01 — answered by <who> (build, <elapsed>)`, and the bot posts the matching `answered by` message, both pasted
    And `<recB>`'s last `asks` entry reads the answer verbatim with `answeredAt` set and `sessionId` still `<sB>`, pasted

  Scenario: leg 5 — a Discord reply answers the session
    Given 03/03 is waiting, T1 shows its `waiting on you` row, and the bot carried its ask as in leg 1, with message id `<mD>`
    When the operator uses Discord's Reply on message `<mD>` and sends their own words
    Then within 10 s the reply carries one ✅ reaction from the bot, and the bot posts no refusal line, described with the reply's message id
    And T1 prints `03/03 — answered by @<username> (build, <elapsed>)`, and the bot posts a message whose first line starts `**03/03 — answered by @<username>** (build, <elapsed>)` with the reply's text verbatim as its body, both pasted
    And the ask file for `<runD>`, pasted whole during the re-drive, reads `"state": "answered"`, the reply's text verbatim, `by.actor` `"@<username>"` and `by.via` `"discord"`
    And `<sD>.jsonl` gains a user turn holding the reply's text verbatim, and `<recD>`'s last `asks` entry reads it with `"by": "@<username>"`, `answeredAt` set and `sessionId` still `<sD>`, both pasted

  Scenario: leg 6 — the loop finishes and the record keeps the conversation
    Given all three answers are given and nothing else is asked
    When the loop runs to its end
    Then T1's last line is `03 — loop done.`, and `<log>` ends with `exit code=0` and holds no `halted on` line, pasted with their instants
    And the test-bed's `03_milestone_ask-target/SPEC.md` reads `status: done`, and the bot posts `**03 — accepted**` with the milestone title and no `loop halted` message, both pasted
    And the merged run records of 03/00, 03/01 and 03/03, read in the test-bed after the loop, each carry exactly one `asks` entry with the question, the answer verbatim, `by`, `askedAt` and `answeredAt` set, and `parkedAt` null, pasted whole
    And the merged run records of 03/02 carry `"asks": []`, and `Get-ChildItem ~/.aof/mesh/loop-asks/` lists no file for `<runA>`, `<runB>` or `<runD>`, both pasted

  Scenario: leg 7 — a supervised loop is stopped and handed back from Discord
    Given leg 6 is recorded
    When T1 runs `aof work loop 04 --supervised` and prints `Lane 04/00 — …` or a drive of `04/00`
    And the operator runs `/loop stop scope:04` in the channel
    Then the bot's in-channel reply reads `@<username> asked 04 to stop — draining (a second /loop stop cancels the in-flight session)`, pasted
    And the in-flight drive finishes, T1 prints a `halted on` line for `04` and exits, and `~/.aof/mesh/loop-stops/<loopRunId>.json` reads `"state": "honoured"`, all pasted
    When the operator runs `/loop resume scope:04` in the channel
    Then the bot's in-channel reply reads `@<username> handed 04 to the supervisor — it relaunches with --resume on its next poll`, and `~/.aof/mesh/loop-resumes/<loopRunId>.json`, read before the relaunch, holds `loopRunId`, `scope` `"04"`, `workspaceId`, `by` and `requestedAt`, both pasted
    And a new `~/.aof/mesh/logs/loop-diag.04.<stamp>.log` appears, stamped after the resume reply, and ends with `exit code=0`, while no terminal of the operator's started it, pasted
    And the resume request file is gone after the relaunch, the test-bed's `04_milestone_resume-target/SPEC.md` reads `status: done`, and the bot posts `**04 — accepted**`, all pasted

  Scenario: every observation is in STATE.md
    Then `wiki/work/131_milestone_the-human-in-the-loop/STATE.md` carries, for each scenario above, the procedure as run, every instant, message id, file and record, pasted per RULING (1) and scrubbed per RULING (4)
    And each block carries a `verifies →` pointer to the scenario it discharges, for `aof:verify 131`
    And no block carries the bot token or the operator's user id
