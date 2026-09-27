@executable @cli @work @work-stream
Feature: The runtime dispatch — `codex` is a one-shot child, everything else is the PTY session

  The two runtime-dispatch members ADR-001 §1 moves because they have no other caller:
  `defaultSpawnRuntime` and `buildDriverCommand`. They are the fork in the driver's road and
  the easiest thing in the moved block to get subtly wrong, because the two branches share
  nothing — one resolves a provider, spawns a PTY, types a line and watches a transcript;
  the other builds an argv, runs `execFile` and parses stdout. A move that let `claude` fall
  into the codex branch would throw on the first line of it (`buildDriverCommand("claude")`
  returns `null` and the branch destructures its result), and a move that let `codex` fall
  into the PTY branch would silently start spawning terminals for a driver that has never
  had one. Both are observable at the injected seam, and both are asserted here.

  `buildDriverCommand` IS RETIRED FOR CLAUDE AND ONLY FOR CLAUDE. Milestone 38 / ADR-013
  replaced the `claude -p <prompt> --output-format json` one-shot with the interactive PTY
  path; `codex` kept its own pre-existing headless-print form UNCHANGED, because codex was
  never the subscription-billing / human-in-the-loop problem. So `buildDriverCommand` returns
  a command for exactly one driver id and `null` for every other, including `claude` — and
  `null` is a fail-closed instruction to the caller, never a licence to fall back to a
  headless print form. That is a pure `(driver, brief) => {bin, args} | null` function with
  no I/O at all, so every row of its table below is decided directly.

  ONE CODEX BEHAVIOUR IS DELIBERATELY NOT COVERED HERE, and naming it is the point rather
  than an omission. The codex branch's stdout mapping — `terminal_reason`/`stop_reason` in
  {completed, end_turn} to `done`, everything else and every parse failure and every spawn
  fault to `{outcome: "failed", failureReason: "agent_error"}` — runs through the module's
  own top-level `execFile` with **no injected exec seam**, and ADR-001 forbids adding one
  (a signature change is a second change riding a move). It is therefore unobservable
  without a real `codex` binary, and the mapping table below records it with the lane that
  decides it rather than pretending a fixture reached it. What IS asserted here is that this
  story adds no such seam: an options bag carrying an `execFile`/`exec` override changes
  nothing, because the branch never consults one.

  THE CODEX SCENARIOS MUST NEVER EXECUTE A REAL `codex`, and the guard is written into them:
  every codex drive uses a `worktreeCwd` under a `mkdtemp` root that has been removed, so
  the child fails to start on its working directory before any binary is looked up — the
  outcome is the same coded failure on a machine that has codex installed and one that does
  not. A builder that "fixes" this by pointing at a real directory has turned a hermetic
  suite into a soak.
  Seam: `test/agent-session-driver-runtime-dispatch.test.mjs`, registered in `scripts/test.mjs`
  in this story's labelled milestone-53 story-00 block. Every scenario imports
  `defaultSpawnRuntime` and `buildDriverCommand` from `src/agent-session-driver.mjs` — the new
  door — and injects `test/support/mesh-worker-terminal-fixture.mjs`'s pair, with the `which`
  double wrapped so its calls are counted. `AOF_GLOBAL_HOME` is set to the `mkdtemp` root.
  ADR-001 §1, RESEARCH §Q1.

  Scenario: `buildDriverCommand` answers for codex and refuses everything else
    Given a brief of `{itemRef, worktreeCwd, task, command}`
    When `buildDriverCommand` is called with `"codex"`
    Then it returns `{bin: "codex", args: [...]}`
    And when it is called with `"claude"` it returns null
    And when it is called with an unknown driver id, an empty string or `undefined` it returns null

  Scenario: the codex argv is the pre-existing headless one-shot, unchanged by the move
    Given `buildDriverCommand("codex", brief)`
    When its `args` are read
    Then they are `exec --json -o last-message.txt --sandbox workspace-write --ask-for-approval never` followed by the prompt
    And the prompt is the last element, so the flags cannot be reordered around it

  Scenario: the codex prompt is composed from the brief and trims a missing task
    Given a brief whose `itemRef` is `53/00`
    When the prompt is read
    Then it names `53/00`
    And it ends with the brief's `task` when one is supplied
    And it has no trailing whitespace when `task` is absent or null

  Scenario: a codex drive makes no PTY spawn and no provider lookup
    Given a `which` double that counts its calls and a `ptySpawn` double that records its calls
    And a `worktreeCwd` that does not exist, so no child is ever executed
    When `defaultSpawnRuntime` is driven with `driver: "codex"`
    Then zero spawn calls are recorded
    And zero `which` calls are recorded
    And the promise resolves rather than rejecting

  Scenario: a codex drive that cannot start its child is a coded failure, never a rejection
    Given the same removed `worktreeCwd`
    When `defaultSpawnRuntime` is driven with `driver: "codex"`
    Then it resolves `{outcome: "failed", failureReason: "agent_error"}`
    And nothing is thrown out of the seam

  Scenario: the codex branch consults no injected exec seam — this move added none
    Given an options bag carrying `execFile`, `exec` and `spawnRuntime` overrides
    When `defaultSpawnRuntime` is driven with `driver: "codex"`
    Then none of those overrides is called
    And the outcome is the same coded failure as without them
    And the signature of `defaultSpawnRuntime` is still `(brief, options)`

  Scenario: an absent driver defaults to claude and takes the PTY path
    Given the terminal fixture with `claude` present and a scripted clean exit
    When `defaultSpawnRuntime` is driven with no `driver` in the options bag
    Then exactly one PTY spawn is recorded
    And the resolved outcome is `done`

  Scenario: an explicit claude driver takes the PTY path and never destructures a null command
    Given the same fixture
    When `defaultSpawnRuntime` is driven with `driver: "claude"`
    Then exactly one PTY spawn is recorded
    And nothing is thrown
    And `buildDriverCommand("claude", brief)` is null, so the codex branch would have thrown had it been taken

  Scenario: an unknown driver id takes the PTY path, where the provider gate refuses it honestly
    Given the terminal fixture
    When `defaultSpawnRuntime` is driven with `driver: "no-such-provider"`
    Then no PTY spawn is recorded
    And it resolves `{outcome: "failed", failureReason: "agent_error"}`
    And it does not fall back to a headless print form

  Scenario: the codex path and the claude path never both run for one drive
    Given a counted `which`, a recording `ptySpawn` and a removed `worktreeCwd`
    When each driver id in the closed set below is driven in turn
    Then exactly one of the two paths is entered per drive
    And the drive that entered the codex path recorded zero PTY spawns
    And the drive that entered the PTY path resolved through the provider gate

  Scenario: the dispatch is observed from the new module's door
    Given `defaultSpawnRuntime` and `buildDriverCommand` imported from `src/agent-session-driver.mjs`
    When every scenario above is driven
    Then each is decided at that door
    And the equivalent drive through the sink's re-export resolves the same outcome

  # THE DISPATCH — every driver id this seam can be handed, which branch it enters, and what
  # `buildDriverCommand` answers for it. The set is closed: `codex` is the only id with a
  # headless form, and `null` is a fail-closed instruction, never a fallback.
  Examples:
    | options.driver     | buildDriverCommand | branch entered | PTY spawns | which calls | resolves                       |
    | "codex"            | {bin, args}        | execFile       | 0          | 0           | failed / agent_error (no child) |
    | undefined          | null               | PTY session    | 1          | >= 1        | done on a clean exit            |
    | "claude"           | null               | PTY session    | 1          | >= 1        | done on a clean exit            |
    | ""                 | null               | PTY session    | 1          | >= 1        | treated as claude               |
    | "no-such-provider" | null               | PTY session    | 0          | >= 1        | failed / agent_error            |

  # THE CODEX ONE-SHOT'S OWN STDOUT MAPPING — unchanged by this move, and NOT observable at
  # any injected seam because the branch owns its `execFile` outright. Recorded here as case
  # DESIGN with the lane that decides each row, so a later reader does not mistake it for
  # covered. Adding an exec seam to make these executable is a signature change ADR-001
  # forbids; it belongs to whoever next needs the codex driver, not to this move.
  Examples:
    | child result                                    | outcome | failureReason | decided by                          |
    | stdout JSON with terminal_reason "completed"     | done    | —             | @manual soak (53/04) — unchanged code |
    | stdout JSON with stop_reason "end_turn"          | done    | —             | @manual soak (53/04) — unchanged code |
    | stdout JSON with terminal_reason "error"         | failed  | agent_error   | @manual soak (53/04) — unchanged code |
    | stdout that is not JSON                          | failed  | agent_error   | @manual soak (53/04) — unchanged code |
    | a non-zero exit                                  | failed  | agent_error   | @manual soak (53/04) — unchanged code |
    | the child cannot be started at all               | failed  | agent_error   | ASSERTED ABOVE — the removed-cwd lane |
