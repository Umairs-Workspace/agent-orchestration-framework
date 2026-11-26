@cli @work @validate
Feature: a record keeps why it ran, where it ran, and the round it belongs to

  WHY. A reviewer judges a run by its reason (ADR-002). "The last red run here" must mean this
  worktree, because records are shared by every worktree of one clone (m190/ADR-001 §5). A fix
  round must know the record it follows (ADR-004). Records written before this milestone stay
  readable, because a store schema change has to be backwards compatible. The cases drive
  `record.mjs` against a temporary git repository with two worktrees, never this repository's
  `.git`.

  Rule: R2 · A record keeps why it ran, where it ran, and the round it belongs to

    @executable
    Scenario: E3 · reason, mode and round read back as written, with this worktree's git dir
      Given a temporary repository and its ledger
      When a red record is written with reason "record.mjs changed", mode "named" and round 0
      Then reading it back gives reason "record.mjs changed", mode "named" and round 0
      And its worktree is the repository's absolute git dir

    @executable
    Scenario: E4 · a record from before this milestone still reads
      Given a stored record with no reason, mode, worktree, parent or round, and failures with no file
      When the store is read
      Then the record is returned
      And its failures carry file null, and its reason and worktree read as unknown

    @executable
    Scenario: E5 · the newest red is looked up per worktree
      Given worktree A wrote a red record at 10:00 and worktree B a red record at 09:00
      When the newest red for worktree B in this environment is asked for
      Then B's 09:00 record is returned

    @executable
    Scenario Outline: only a red record in this environment is a root
      Given worktree A's newest record is <newest>
      When the newest red for worktree A in this environment is asked for
      Then the answer is <answer>

      Examples:
        | newest                                           | answer                              |
        | a red at 10:00 after a green at 09:00            | the 10:00 red                       |
        | a green at 10:00 after a red at 09:00            | the 09:00 red                       |
        | a red at 10:00 written on another Node major     | none                                |
        | a not-finished record at 10:00, no earlier red   | none                                |

    @executable
    Scenario: a round's record names the record it follows
      Given a red record R0 written with round 0
      When a record is written with parent R0's id and round 1
      Then reading it back gives parent R0's id and round 1

