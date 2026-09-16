@executable @cli @work @work-stream
Feature: The driver still drives from its new home — the `{ptySpawn, which}` seam, unchanged

  The behavioural core of the move, observed from the new module's own door. ADR-001 §1
  freezes the moved set as VERBATIM — no rename, no signature change, no behaviour change —
  so every observable below is a re-proof of shipped behaviour at a new import path, not a
  new promise. RESEARCH §Q8 measured why that re-proof is affordable and honest:
  `test/support/mesh-worker-terminal-fixture.mjs` occupies exactly the `{ptySpawn, which}`
  seam whether the caller is the mesh assignment handler or a local loop, because
  `driveInteractiveClaudeSession` is itself mesh-blind. `createFakeWhich(presentBins)`
  mirrors `terminal-providers.mjs`'s own `which(bin, env) => path|null` contract;
  `createFakePtySpawn({onWrite})` records every spawn call and returns a full `IPty` double
  whose `onWrite` fires SYNCHRONOUSLY inside `term.write(...)`, so a test scripts the
  agent's reply to the exact line the driver typed with no race — the driver registers its
  `onData`/`onExit` handlers before it ever writes. Only the leaf node-pty spawn and the
  PATH lookup are faked; `resolveInteractiveDriverLaunch` and `terminal-providers.mjs`'s
  real `resolveProvider` are driven for real, which is the discipline that keeps this from
  becoming a hand-built stub of what the provider ought to emit.

  THE DRIVER NEVER THROWS. Its documented contract is that an unresolvable provider, an
  unresolvable binary, a spawn fault, a failing `trustWorktree` and a reporting fault in any
  optional hook are all CODED outcomes or swallowed degrades — never a rejection out of the
  seam. That is asserted here in both directions: the coded outcome is observed, and the
  call is observed not to reject.

  THE SETTLE IS EXACTLY ONCE. The driver funnels every outcome through one `finish`, and the
  fixture's `dispose()` genuinely splices handlers out, so "a chunk or an exit delivered
  after the settle changes nothing" is a real assertion at this seam rather than a hope.
  Two of these scenarios exist only to pin that, because a move that duplicated a settle
  path would still pass every single-outcome row.

  ONE SEAM IS NOT COVERED HERE AND IS NAMED RATHER THAN IMPLIED: the transcript watches
  themselves. This feature INJECTS `watchTranscriptSessionId`/`watchTranscriptCompletion` as
  scripted async functions so no scenario below touches a real transcript; the real watches
  are task 03's subject, against a real temp tree.
  Seam: `test/agent-session-driver-drives.test.mjs`, registered in `scripts/test.mjs` in this
  story's labelled milestone-53 story-00 block. Every scenario imports from
  `src/agent-session-driver.mjs` — the new door — and injects the fixture pair. No real
  node-pty, no real `claude`, no `~/.claude.json`, no network; any temp path used is under a
  `mkdtemp` root with `AOF_GLOBAL_HOME` set to it.
  ADR-001 §1 (the frozen moved set) and §3 (the frozen import set), RESEARCH §Q1 and §Q8.

  Scenario: an unresolvable provider binary is a coded failure with no spawn attempt
    Given a fake `which` with nothing on the fake PATH
    When the driver is driven with a claude brief
    Then it resolves `{outcome: "failed", failureReason: "agent_error", sessionId: null}`
    And zero spawn calls are recorded
    And the call does not reject

  Scenario: a spawn that throws is a coded failure, never a rejection
    Given a fake `which` resolving `claude` and a `ptySpawn` that throws
    When the driver is driven
    Then it resolves `{outcome: "failed", failureReason: "agent_error", sessionId: null}`
    And the call does not reject

  Scenario: one long-lived session per run — the driver spawns exactly once
    Given the terminal fixture with `claude` present and a scripted clean exit
    When the driver is driven to a terminal outcome
    Then exactly one spawn call is recorded
    And the session is never re-spawned to deliver a second command line

  Scenario: the launch argv is the interactive form, and carries no headless-print token
    Given the terminal fixture with `claude` present
    When the driver is driven
    Then the argv is the provider's own `buildArgs()` followed by `--permission-mode auto` and one `--append-system-prompt`
    And the appended payload is `WORKER_SESSION_INSTRUCTION`
    And the argv contains no `-p`, no `--print` and no `--output-format` as whole elements
    And the tokens are compared element-by-element, never as a substring of the stringified argv

  Scenario: the directive is typed into PTY stdin as exactly one carriage-return-terminated write
    Given the terminal fixture and a `brief.command` of `/aof:verify 53/00`
    When the driver is driven
    Then the PTY records exactly one write
    And that write is the whole command followed by `\r`
    And the command appears nowhere in the spawn argv

  Scenario: a resume brief with no command types nothing
    Given a brief whose `command` is null — the re-attach shape
    When the driver is driven
    Then the PTY records zero writes
    And the driver still resolves an outcome

  Scenario: `--resume` is the one additive launch variation and changes nothing else
    Given `options.resumeSessionId` set to a session id
    When the launch is resolved
    Then the argv is the ordinary interactive argv with `--resume` and that id appended, in that order
    And the permission mode, the appended system prompt and the resolved env are otherwise identical

  Scenario: the IDE-attachment env vars never reach a driven session
    Given an env carrying `CLAUDE_CODE_SSE_PORT`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` and a `VSCODE_*` key
    When the launch is resolved
    Then none of those keys is present in the resolved env
    And every other key rides through untouched

  Scenario: the PTY's cwd is the brief's worktree
    Given a brief whose `worktreeCwd` is a temp directory
    When the driver is driven
    Then the recorded spawn options carry that path as `cwd`

  Scenario: the PTY exit code decides the undeclared outcome
    Given a scripted PTY that exits after the command is written
    When the exit code is 0
    Then the driver resolves `done`
    And when the exit code is non-zero it resolves `{outcome: "failed", failureReason: "agent_error"}`

  Scenario: a complete NEEDS_INPUT line resolves the third outcome, never `done`
    Given a scripted PTY that emits the sentinel on its own terminated line
    When the driver is driven
    Then it resolves `needs-input`
    And it does not resolve `done`

  Scenario: the sentinel matches a whole line only — narration and near-tokens never fire it
    Given a scripted PTY emitting output that merely contains the sentinel's characters
    When the output is a longer token or a narrating sentence on one line
    Then the driver does not resolve `needs-input`
    And a clean exit after it still resolves `done`

  Scenario: a sentinel split across two chunks is detected exactly once, when the newline completes the line
    Given a scripted PTY emitting the sentinel in two `onData` chunks
    When the newline that terminates the line arrives
    Then the driver resolves `needs-input` once
    And a further chunk after the settle changes nothing

  Scenario: a dead PTY process settles `agent_died` through the same single settle point
    Given a driven session whose process is no longer alive at the liveness probe
    And an injected `livenessIntervalMs`, so no scenario wall-waits the production interval
    When the probe next runs
    Then the driver resolves `{outcome: "failed", failureReason: "agent_died"}`
    And it resolves exactly once

  Scenario: the settle is idempotent — nothing delivered after it changes the outcome
    Given a driven session that has already resolved
    When a further data chunk and a further exit are emitted into the same PTY
    Then the resolved outcome is unchanged
    And the disposed handlers are not invoked

  Scenario: a failing `trustWorktree` degrades, it does not escape
    Given `options.trustWorktree` as a function that rejects
    When the driver is driven
    Then the call does not reject
    And the session is still spawned
    And the outcome is decided by the session, not by the trust failure

  Scenario: every caller-facing hook is optional, and a caller that passes none is unaffected
    Given a drive with no `onPtyLive`, `onSessionIdCaptured`, `onSessionEnd`, `onOutputChunk` or `onNeedsInputPending`
    When the driver is driven to each of the three outcomes
    Then every outcome is the same as the equivalent drive with the hooks supplied
    And no hook is required for the driver to settle

  Scenario: `onSessionIdCaptured` fires at most once, mid-run, and `onSessionEnd` fires once at the settle
    Given an injected session-id watch that resolves a real id
    When the driver is driven to each of the three outcomes
    Then `onSessionIdCaptured` is called exactly once with that id
    And `onSessionEnd` is called exactly once, for all three outcomes, after the id is resolved
    And a hook that throws does not disturb the outcome

  Scenario: `onPtyLive` hands the caller a kill and a write into THIS pty
    Given `onPtyLive` supplied
    When the session is spawned
    Then the caller receives a kill function and a write function
    And the write function reports the target pid
    And the kill routes through the same `term.kill()` every settle path uses

  Scenario: the resolved session id rides the driver's own return value for every outcome
    Given an injected session-id watch resolving `sess-x`
    When the driver settles `done`, `failed` and `needs-input` in turn
    Then each resolved value carries `sessionId: "sess-x"`
    And a watch that resolves null yields `sessionId: null`, never a crash

  Scenario: the command write is delayed by `commandDelayMs`, defaulting to zero
    Given no `commandDelayMs` in the options bag
    When the driver is driven
    Then the command is written on the next tick, so the suite never wall-waits
    And a supplied `commandDelayMs` is honoured, which is the seam production wires `INTERACTIVE_COMMAND_READY_DELAY_MS` into

  # THE OUTCOME MATRIX — every way this driver can settle, the trigger that produces it, and
  # what the resolved value carries. `sessionId` is whatever the injected watch resolved; the
  # rows differ only in outcome, never in shape.
  Examples:
    | trigger                                          | outcome     | failureReason | spawn calls | writes |
    | nothing on the fake PATH                          | failed      | agent_error   | 0           | 0      |
    | `ptySpawn` throws                                 | failed      | agent_error   | 0           | 0      |
    | PTY exits 0                                       | done        | —             | 1           | 1      |
    | PTY exits 1                                       | failed      | agent_error   | 1           | 1      |
    | PTY exits 137                                     | failed      | agent_error   | 1           | 1      |
    | a complete NEEDS_INPUT line                       | needs-input | —             | 1           | 1      |
    | a NEEDS_INPUT line split across two chunks        | needs-input | —             | 1           | 1      |
    | injected completion watch resolves done           | done        | —             | 1           | 1      |
    | injected completion watch resolves needs-input    | needs-input | —             | 1           | 1      |
    | the liveness probe finds the process gone         | failed      | agent_died    | 1           | 1      |
    | a brief with `command: null` and a clean exit     | done        | —             | 1           | 0      |

  # THE SENTINEL DETECTOR'S BOUNDARY — the exact-line rule. Every row is one accumulated PTY
  # output buffer and whether the driver reads the sentinel from it.
  Examples:
    | emitted output                                   | resolves needs-input |
    | "NEEDS_INPUT\n"                                  | yes                  |
    | "...\nNEEDS_INPUT\n"                             | yes                  |
    | "  NEEDS_INPUT  \n"                              | yes — trimmed line   |
    | "NEEDS_I" then "NPUT\n"                          | yes — once           |
    | "NEEDS_INPUTS\n"                                 | no                   |
    | "the agent says NEEDS_INPUT to the user\n"        | no                   |
    | "NEEDS_INPUT" with no terminating newline         | no — still in flight |
    | ""                                                | no                   |

  # THE LAUNCH ARGV — what `resolveInteractiveDriverLaunch` returns, by input. `null` means the
  # caller turns it into a coded `failed`, never a throw.
  Examples:
    | driver     | which resolves | resumeSessionId | launch                                                         |
    | undefined  | claude         | absent          | buildArgs() + --permission-mode auto + --append-system-prompt   |
    | "claude"   | claude         | absent          | buildArgs() + --permission-mode auto + --append-system-prompt   |
    | "claude"   | claude         | "sess-x"        | the same, then --resume sess-x                                 |
    | "claude"   | nothing        | absent          | null                                                            |
    | ""         | claude         | absent          | treated as claude — buildArgs() + the two pairs                 |
    | "no-such"  | claude         | absent          | null — unknown provider id                                      |
