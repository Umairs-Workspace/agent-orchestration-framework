@cli @work @validate
Feature: a fix loop that stops converging stops itself and hands over

  WHY. A loop that keeps fixing without shrinking the failures, or whose fixes break new suites, is
  grinding, and the tool stops it rather than leaving that to the agent's judgement (ADR-005). The
  bound is the build terminator's own (`work.loop.buildNoProgressRounds`, default 2), so a chain
  that has not shrunk stops at its third run. A stopped chain is never re-opened. A named run with
  a stated reason starts a fresh one (210/05 Q1).

  Rule: R2 · A fix loop that stops converging stops itself and hands over

    @executable
    Scenario Outline: the chain stops when its failure set stops shrinking
      Given a chain whose runs fail <counts> cases, none pre-existing, all in suites that failed before
      When the last run of the chain is recorded
      Then the chain <outcome>

      Examples:
        | counts         | outcome                                         |
        | 5, 3, 1, 0     | never stops (E5)                                |
        | 4, 4, 4        | stops at the third run, "no progress" (E6)      |
        | 4, 4, 3, 3, 3  | stops at the fifth run, "no progress"           |
        | 4, 5           | does not stop yet                               |
        | 4, 5, 5        | stops at the third run, "no progress"           |

    @executable
    Scenario: E6 · a stopped chain refuses the next round, and the refusal is the hand-over
      Given a chain that stopped on "no progress" after failing 4, 4 and 4 cases
      When I run "aof test --failed"
      Then it is refused as "test-fix-stopped"
      And it names the rule, the counts 4, 4 and 4, and the hand-over: a blocker in the item's STATE.md, or in a driven session the loop's question
      And no runner is launched

    @executable
    Scenario: E7 · a fix that makes a new suite fail stops the chain at once
      Given a red named run whose failures are in suite A
      And a fix round whose run fails in suite A and, for the first time in the chain, in suite C
      When that round is recorded
      Then the chain stops on "new suite failing", naming suite C

    @executable
    Scenario: a newly failing suite whose failures are all pre-existing does not stop the chain
      Given a fix round whose run newly fails in suite C, and every failure in C is labelled pre-existing
      When that round is recorded
      Then the chain does not stop

    @executable
    Scenario: the bound is read from its one home
      Given "work.loop.buildNoProgressRounds" is 3 in the project config
      And a chain whose runs fail 4, 4, 4 and 4 cases
      When the last run is recorded
      Then the chain stops at the fourth run, not the third

    @executable
    Scenario: E11 · after a stop, a named run with a reason starts a new chain
      Given a chain that stopped on "no progress"
      When I run "aof test test/a.test.mjs --reason \"retry after reading the hand-over\""
      Then the runner is launched
      And if it is red, its record starts a new chain at round 0, and the next "aof test --failed" follows it

    @executable
    Scenario: E12 · the stopped chain stays stopped while it is the newest red
      Given a chain that stopped on "no progress", and no newer red record for this worktree
      When I run "aof test --failed" twice
      Then both are refused as "test-fix-stopped"
