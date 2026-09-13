@executable @cli @work @work-stream
Feature: A phase brief is compiled from what refine already resolved

  The spawn brief is `{ itemRef, worktreeCwd, task, command }`
  (`src/mesh-worker-execution.mjs:1628`) and the prompt typed into the session is
  `/aof:continue <ref>` (`src/commands/drive.mjs:phaseCommand`). Everything else the phase needs, it
  rediscovers — in milestone 52 the invariant part alone (`ARCHITECTURE.md` + `SPEC.md`, 182,381 B
  ≈ 45.6k tokens) was re-read at all 30 phase boots, ≈1.37 M input tokens spent re-reading two files
  that never changed between reads.

  Refine already performs that extraction and then throws it away. This task keeps it.

  **The compiler is a pure leaf, and its home is forced rather than chosen.**
  `test/arch/acd-session-driver-single-home.test.mjs` (m53 FF-5302) asserts the driver's export set
  is exactly the frozen seventeen, by name, so a compiler exported from `agent-session-driver.mjs`
  fails on the first commit. It goes in `src/phase-brief.mjs`, importing nothing from `src/`,
  reading no filesystem and no wall-clock — the same shape 68/ADR-005 §2 used for
  `src/otel-attribution.mjs`. The callers already read the item's documents; they hand the text in.

  Purity is not tidiness here. It is what makes the ceiling in task 01 testable with no PTY, no
  worktree and no `claude` binary, and what makes the same brief reproducible run to run.

  ADR-001 (the bag it rides), ADR-002 (the home and the purity), ADR-003 (the bound task 01 adds).

  Scenario: a story's brief carries what the phase would otherwise rediscover
    Given a story with a record doc, a task contract and a milestone register
    When a brief is compiled for its build phase
    Then the brief names the item it is for
    And it carries the story's own outcome and its task contracts
    And it carries the structural constraints the story is bound by
    And it carries no content the compiler was not handed

  Scenario: the compiler performs no I/O of its own
    Given a compiler invoked with every input supplied by its caller
    When the brief is compiled
    Then no file is read by the compiler
    And no clock is read by the compiler
    And the same inputs produce a byte-identical brief on every invocation

  Scenario: an absent section is omitted rather than faked
    Given a story whose milestone has no structural register
    When a brief is compiled for it
    Then the brief omits that section
    And it states nothing about a register that does not exist
    And the remaining sections are unchanged in content and order

  Scenario: the brief is validated before it is anyone's input
    Given a compiled brief
    When it is handed back to its caller
    Then it conforms to the declared brief shape
    And a brief that does not conform is refused by the compiler rather than returned

  Scenario Outline: which sections a brief is assembled from
    Given a story whose <source> is available to the caller
    When the brief is compiled
    Then the brief carries <carried>

    Examples: the declared section set, in priority order
      | source                        | carried                                        |
      | the story record              | the user story and its stated benefit          |
      | the story's task contracts    | the scenarios the phase must satisfy           |
      | the milestone objective       | why the work exists, in one bounded statement  |
      | the milestone fitness register| the invariants the phase must not break        |
      | the item's dependency edges   | which sibling items this one is sequenced behind|

  Scenario Outline: inputs that are absent, empty or malformed
    Given a caller that supplies <input>
    When a brief is compiled
    Then the outcome is <outcome>

    Examples: the honest-degrade matrix
      | input                                  | outcome                                                |
      | every declared section                 | a complete brief                                       |
      | no fitness register                    | a brief without that section, other sections unchanged |
      | an empty task contract set             | a brief that says the contract set is empty            |
      | a section whose text is whitespace only| a brief that omits it, exactly as if absent            |
      | no item ref at all                     | a refusal, because a brief with no subject names nothing|
