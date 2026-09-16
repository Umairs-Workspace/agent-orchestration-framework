@executable @cli @work @work-stream
Feature: Both spawn paths hand the brief over by value, on the bag that already exists

  `aof graph impact src/agent-session-driver.mjs` reports exactly two production dependents:
  `src/commands/drive.mjs` and `src/mesh-worker-execution.mjs`. Those are the two seams, and this
  task closes both — a brief that reaches one path and not the other would make every measurement
  in 70/02 depend on which machine ran the phase.

  **It rides the bag that is already there.** The driver's first parameter is already named `brief`
  — `driveInteractiveClaudeSession(brief, options)` where `brief` is
  `{ itemRef, worktreeCwd, task, command }` (`src/agent-session-driver.mjs:691`) — and a second
  `brief` bag already carries milestone 53's loop declaration on the run record, read in production
  at `src/commands/loop.mjs:396`. The phase context is an additive key on that bag, not a third
  concept with the same name (ADR-001).

  **Absence stays benign.** A caller that supplies no compiled brief gets exactly today's behaviour,
  which is what lets the two callers land independently and what keeps every existing run record
  readable.

  The transport keys are deliberately not conflated with the context: `command`, `worktreeCwd` and
  `itemRef` are consumed by the PTY plumbing, not by the model.

  ADR-001, ADR-002. FF-7001 keeps this the only bag.

  Scenario: the local drive path hands over a compiled brief
    Given a phase driven locally against a resolved work item
    When the session is spawned
    Then the driver receives a compiled brief for that item
    And the brief is passed by value rather than named for the session to fetch

  Scenario: the mesh worker path hands over a compiled brief
    Given a phase driven by an assignment on a worker node
    When the session is spawned
    Then the driver receives a compiled brief for that item
    And the brief is passed by value rather than named for the session to fetch

  Scenario: the four existing brief keys keep their meaning
    Given a spawn carrying a compiled brief
    When the brief bag is inspected
    Then the item ref, worktree cwd, task and command are present and unchanged
    And the compiled context sits beside them rather than replacing any of them

  Scenario: a spawn without a compiled brief behaves exactly as before
    Given a caller that supplies no compiled context
    When the session is spawned
    Then the spawn proceeds
    And the launch is byte-identical to today's

  Scenario: the phase context reaches the model as input, not as an instruction to go and read
    Given a spawn carrying a compiled brief
    When the session receives its first input
    Then the brief's content is present in that input
    And the session is not merely told which files to open

  Scenario Outline: both seams, same contract
    Given a phase spawned through <seam>
    When the spawn is inspected
    Then a compiled brief for the item is present
    And the brief was compiled by the shared compiler rather than assembled at the seam

    Examples: the driver's two production callers, as the graph reports them
      | seam                            |
      | the local drive command         |
      | the mesh worker execution path  |

  Scenario Outline: the brief a phase is handed matches its phase
    Given a <phase> phase spawned for an item
    When its brief is inspected
    Then the brief is compiled for that phase
    And it carries the sections that phase needs rather than every section that exists

    Examples: the three phases the driver is invoked for
      | phase    |
      | refine   |
      | continue |
      | verify   |
