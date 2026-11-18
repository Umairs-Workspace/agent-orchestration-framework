@executable @cli @work @memory
Feature: The pick fails soft and says so

  WHY. A recall must never fail, or go quiet, because a model did not answer (SPEC Scope, third
  bullet). On any miss the block is the first five of the shortlist, which is what an agent is
  handed today, and one stderr line names the miss the way the graph-signal line does (ADR-003).
  Stdout stays the block alone, because prompts paste it.

  Background:
    Given a memory index in which 60 records match the query "worktree junction"
    And a picker stub that misses as each scenario says

  Rule: R2 · When the pick cannot answer, the block is the lexical top 5 and stderr says why

    Scenario: E7 · a picker that does not answer in time leaves the lexical top 5
      Given the picker misses with "pick-timeout"
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is the 5 best-ranked records, in rank order
      And stderr is "[memory] pick unavailable (pick-timeout) — this block is the lexical top 5; records intact."
      And the exit code is 0

    Scenario: E8 · an answer with no array in it is unreadable
      Given the picker answers "I think the second one"
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is the 5 best-ranked records, in rank order
      And stderr names "pick-unreadable"

    Scenario: E9 · a caller that injects no picker gets the lexical top 5, unannounced
      Given no picker is injected
      When the seam's recall runs in process with the block asked for
      Then the result's records are the 5 best-ranked records
      And its pick report says mode "lexical" and code "pick-unwired"
      And nothing is announced

    Scenario Outline: every miss leaves the same block, and only a failure is announced
      Given the picker <miss>
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is the 5 best-ranked records, in rank order
      And stderr <stderr>
      And the exit code is 0

      Examples:
        | miss                                   | stderr                     |
        | misses with "pick-unavailable"         | names "pick-unavailable"   |
        | misses with "pick-failed"              | names "pick-failed"        |
        | throws an error                        | names "pick-failed"        |
        | answers "[21, 40]"                     | names "pick-unreadable"    |
        | answers ""                             | names "pick-unreadable"    |
        | answers "{ \"cards\": [1] }"           | names "pick-unreadable"    |
        | misses with "pick-off"                 | is empty                   |

    Scenario: a miss on a short shortlist names how many records the block holds
      Given only 3 records match the query
      And the picker misses with "pick-timeout"
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is those 3 records, in rank order
      And stderr is "[memory] pick unavailable (pick-timeout) — this block is the lexical top 3; records intact."

    Scenario: the announcement never reaches stdout
      Given the picker misses with "pick-failed"
      When "aof memory recall 'worktree junction' --block" runs
      Then every line of stdout is a record line
      And stdout does not contain "[memory]"
