@executable @cli @work @work-stream
Feature: The two transcript watches, from the new home — the session id and the settled outcome

  The half of the driver that has no PTY in it at all, and the half a local loop most needs
  to behave identically after the move. ADR-001 §1 moves `defaultWatchTranscriptSessionId`
  and `defaultWatchTranscriptCompletion` verbatim along with `COMPLETION_IDLE_MS`,
  `DECLARED_COMPLETION_IDLE_MS` and `HUMAN_INPUT_TOOL_NAMES`; ADR-001 §3 keeps
  `work-observe.mjs` — the module that owns `claudeProjectsDir` — in the frozen five-module
  import set for exactly this reason. Both watches are producer-fed with zero model
  cooperation: Claude Code itself writes `<claudeProjectsDir({cwd, env})>/<session_id>.jsonl`,
  so the FIRST NEW `*.jsonl` basename after a pre-spawn snapshot NAMES the session, and the
  last settled assistant record in that file carries the outcome. Neither is a marker anyone
  had to be instructed to print — the F-38.05 lesson that a consumer with no producer reads
  green forever.

  THE HERMETIC SEAM IS `CLAUDE_CONFIG_DIR`, and it is what makes these real-file scenarios
  runnable rather than a soak. `claudeProjectsDir` reads `env.CLAUDE_CONFIG_DIR` before it
  falls back to the home directory (`src/work-observe.mjs:36-39`), so a `mkdtemp` root plus a
  synthetic `cwd` gives every scenario below a real directory, real `.jsonl` files and real
  mtimes with no `~/.claude` anywhere near it — the idiom
  `test/mesh-worker-completion-detection.test.mjs:85-100` already uses. `pollMs`, `idleMs`,
  `declaredIdleMs`, `maxWaitMs`, `now` and `sinceOffset` are all injectable, so no scenario
  wall-waits a production window and none of them is asserted by reading a constant back.

  THE TWO WINDOWS ARE THE POINT, and conflating them is the defect the whole design exists
  against. `end_turn` means the MODEL finished speaking, not that the WORK finished — a
  premature `done` destroys work and reports success, a late `done` only costs time. So a
  DECLARED outcome (the turn printed a sentinel) confirms after the short window, an
  UNDECLARED `end_turn` must out-wait the long one, and a LIVE pending question out-waits
  the long one too because it is answerable at the terminal and parking it fast kills the
  session the operator is about to type into. And the quiet clock reads the WHOLE session
  tree — the parent `.jsonl` plus everything under `<projectsDir>/<sessionId>/` — so a
  parked parent over still-writing subagents is never quiet at all.
  Seam: `test/agent-session-driver-transcript.test.mjs`, registered in `scripts/test.mjs` in
  this story's labelled milestone-53 story-00 block. Every scenario imports the watches from
  `src/agent-session-driver.mjs` — the new door — and runs against a `mkdtemp` root with
  `CLAUDE_CONFIG_DIR` and `AOF_GLOBAL_HOME` both set inside it, cleaned in a `finally`.
  ADR-001 §1 and §3, RESEARCH §Q1 and §Q8.

  Scenario: the session id is the first NEW transcript basename to appear after the snapshot
    Given a projects directory holding one pre-existing `.jsonl`
    When the watch is started and a second `.jsonl` is then written
    Then the watch resolves the new file's basename without its extension
    And it never resolves the pre-existing one

  Scenario: the snapshot is the first completed tick, not the call
    Given a projects directory holding several `.jsonl` files
    When the watch is started and nothing new is ever written
    Then no pre-existing basename is ever resolved
    And the watch resolves null at its deadline

  Scenario: an absent projects directory is an empty snapshot, never a throw
    Given a `cwd` whose projects directory does not exist
    When the watch is started and the directory is then created with one `.jsonl` in it
    Then the watch resolves that basename
    And no error is raised at any tick

  Scenario: a non-`.jsonl` file is never a session id
    Given a projects directory into which a `.txt` and a `.jsonl.tmp` appear
    When the watch runs
    Then neither is resolved
    And a subsequent real `.jsonl` is

  Scenario: an abort resolves null promptly, without waiting out the deadline
    Given a watch started with an abort signal
    When the signal is aborted immediately after the call
    Then the watch resolves null
    And it resolves without reaching its `maxWaitMs`

  Scenario: an already-aborted signal short-circuits before any filesystem call
    Given a signal that is already aborted
    When the watch is started
    Then it resolves null

  Scenario: the deadline degrades to a null session id, never an unbounded loop
    Given an injected `maxWaitMs` of a few milliseconds and no transcript ever written
    When the watch runs
    Then it resolves null
    And the driver that consumes it reports `sessionId: null` rather than crashing

  Scenario: the completion watch refuses a missing session id without touching the disk
    Given a completion watch called with `sessionId` absent, empty or not a string
    When it runs
    Then it resolves null immediately

  Scenario: a settled `end_turn` with no sentinel is DONE and UNDECLARED
    Given a transcript whose last assistant record is `stop_reason: "end_turn"` with ordinary text
    When the completion watch settles it
    Then the resolved value is `{outcome: "done", declared: false}`

  Scenario: the DIRECTIVE_COMPLETE sentinel on its own line is DONE and DECLARED
    Given a transcript whose finished turn carries the sentinel on a line of its own
    When the completion watch settles it
    Then the resolved value is `{outcome: "done", declared: true}`

  Scenario: the NEEDS_INPUT sentinel on its own line is NEEDS-INPUT and DECLARED
    Given a transcript whose finished turn carries the sentinel on a line of its own
    When the completion watch settles it
    Then the resolved value is `{outcome: "needs-input", declared: true}`
    And it is not `done`

  Scenario: a still-working turn never settles at all
    Given a transcript whose last assistant record has a pending `stop_reason` other than `end_turn`
    When the completion watch runs
    Then nothing is settled
    And an abort is what ends the watch, not an outcome

  Scenario: a declared outcome confirms after the SHORT window and an undeclared one out-waits the LONG one
    Given an injected clock and distinct short and long idle windows
    When a declared outcome has been quiet for the short window
    Then it settles
    And an undeclared `end_turn` quiet for the same stretch has not settled
    And it settles only once the long window has passed

  Scenario: any movement anywhere in the session tree restarts the quiet stretch
    Given a settled `end_turn` in the parent transcript
    When a file under `<projectsDir>/<sessionId>/` is written before the window elapses
    Then the quiet stretch restarts
    And the outcome does not settle on the original clock

  Scenario: a parent that finished over a still-writing subagent is never quiet
    Given a parent transcript ending `end_turn` and a subagent transcript still being appended to
    When the completion watch runs
    Then it does not settle while the subagent keeps writing
    And it settles only after the whole tree is quiet for the required window

  Scenario: a live AskUserQuestion is reported at once and parked only as a last resort
    Given a transcript whose last assistant record is a `tool_use` turn with an unanswered `AskUserQuestion`
    When the completion watch runs with the report pair supplied
    Then `onPendingInput` fires exactly once
    And the outcome does not settle on the short window despite being declared
    And it settles `needs-input` only after the long window

  Scenario: an answered question clears the report and the session reads live again
    Given a pending question that has already been reported
    When a `user` record is appended behind it
    Then `onPendingInputCleared` fires exactly once
    And the outcome reads as still working

  Scenario: an ordinary pending tool is genuinely still working
    Given a `tool_use` turn whose pending call is `Bash`, `Edit` or a subagent `Task`
    When the completion watch runs
    Then nothing settles
    And no pending report fires
    And `HUMAN_INPUT_TOOL_NAMES` is the closed set that decides this

  Scenario: `sinceOffset` is the resume baseline — pre-resume history is not the verdict
    Given a transcript that already ends in a settled outcome
    When the completion watch is given that file's size as `sinceOffset`
    Then the pre-baseline outcome is not returned
    And a record written after the baseline is

  Scenario: a baseline that lands exactly on a record boundary keeps the next record
    Given a `sinceOffset` whose preceding byte is a newline
    When the watch reads
    Then the first post-baseline record is not dropped
    And a baseline that cut mid-record does drop its partial first line

  Scenario: an absent, empty or half-written transcript is "nothing settled yet", never a throw
    Given a transcript file that is missing, zero-length, or ends in a truncated JSON line
    When the completion watch runs
    Then nothing settles
    And no error is raised
    And a later complete record still settles normally

  Scenario: a reporting fault in either optional hook never disturbs the watch
    Given `onPendingInput` or `onPendingInputCleared` supplied as a function that throws or rejects
    When the watch detects and then clears a pending question
    Then the watch still settles on its own rules
    And the fault does not escape

  # THE LAST-RECORD MAPPING — what the transcript's own final assistant record resolves to.
  # `declared` chooses the window; `pending` marks a LIVE question, which is declared but must
  # still out-wait the long window. `null` means "still working", never a fallback outcome.
  Examples:
    | last assistant record                                     | resolved                                          | window it waits |
    | end_turn, ordinary text                                    | {outcome: done, declared: false}                  | long            |
    | end_turn, text carrying AOF_DIRECTIVE_COMPLETE on its line | {outcome: done, declared: true}                   | short           |
    | end_turn, text carrying NEEDS_INPUT on its line            | {outcome: needs-input, declared: true}            | short           |
    | end_turn, text carrying both sentinels                     | {outcome: needs-input, declared: true} — the human wins | short      |
    | end_turn, string content rather than blocks                | mapped identically to block content               | as above        |
    | tool_use, unanswered AskUserQuestion                       | {outcome: needs-input, declared: true, pending: true} | long        |
    | tool_use, AskUserQuestion with a user record behind it     | null — answered, the session is live              | —               |
    | tool_use, Bash                                             | null                                               | —               |
    | tool_use, Edit                                             | null                                               | —               |
    | tool_use, Task                                             | null                                               | —               |
    | stop_reason null                                           | null                                               | —               |
    | max_tokens                                                 | null                                               | —               |
    | no assistant record at all                                 | null                                               | —               |
    | file absent                                                | null                                               | —               |
    | file present but every line unparseable                    | null                                               | —               |

  # THE SESSION-ID WATCH'S BOUNDARY — every way it can end. `resolves` is the whole contract:
  # a basename or null, never a throw and never an unbounded wait.
  Examples:
    | condition                                              | resolves        |
    | a new `.jsonl` appears after the snapshot               | its basename    |
    | only pre-existing `.jsonl` files exist                  | null at deadline |
    | the projects directory does not exist, then does        | the new basename |
    | the projects directory never exists                     | null at deadline |
    | a `.txt` appears                                        | null at deadline |
    | the signal aborts mid-watch                             | null            |
    | the signal was already aborted                          | null            |
    | `maxWaitMs` elapses                                     | null            |
    | `readdir` fails on a tick                               | null at deadline — never a throw |
