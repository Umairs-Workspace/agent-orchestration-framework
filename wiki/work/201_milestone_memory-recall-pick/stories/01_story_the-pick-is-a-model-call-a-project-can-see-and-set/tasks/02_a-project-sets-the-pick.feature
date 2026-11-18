@executable @cli @work @memory
Feature: A project sets the pick

  WHY. The pick is a model call on every block recall, so a project must be able to turn it off,
  and to change its model and its time limit (ADR-004 §5). The keys live on the memory node, which
  has one reader and a closed schema (180/ADR-001). Their absence is the pick turned on, so an
  existing project has nothing to adopt.

  Background:
    Given a scratch project whose memory index has 60 records matching "worktree junction"
    And a stand-in "claude" that records its arguments and answers "[2]"

  Rule: R3 · A project sets the pick under `memory.recall.pick`, and a bad value is refused

    Scenario: E8 · with no setting, the pick is on at haiku with 20 seconds
      Given the config has no "memory.recall"
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in was asked for the model "haiku"
      And the block is the record ranked 2nd

    Scenario: E9 · a project turns the pick off
      Given "memory.recall.pick" is "{ enabled: false }"
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in was never started
      And the block is the 5 best-ranked records
      And stderr is empty

    Scenario: E10 · a project names its own model and time limit
      Given "memory.recall.pick" is "{ model: 'sonnet', timeoutMs: 45000 }"
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in was asked for the model "sonnet"
      And a stand-in that answers after 25 seconds is still read

    Scenario: E11 · a bad value is refused at the path the author wrote
      Given "memory.recall.pick" is "{ timeoutMs: 500 }"
      When "aof memory recall 'worktree junction' --block" runs
      Then it refuses with code "invalid-memory-recall-pick" at "memory.recall.pick.timeoutMs"
      And the stand-in was never started

    Scenario Outline: the three keys, at their edges
      Given "memory.recall" is <value>
      When "aof project validate --json" runs
      Then it reports <diagnostic>

      Examples:
        | value                                   | diagnostic                                                          |
        | "{}"                                    | no "invalid-memory-recall-pick" diagnostic                          |
        | "{ pick: {} }"                          | no "invalid-memory-recall-pick" diagnostic                          |
        | "{ pick: { timeoutMs: 1000 } }"         | no "invalid-memory-recall-pick" diagnostic                          |
        | "{ pick: { timeoutMs: 120000 } }"       | no "invalid-memory-recall-pick" diagnostic                          |
        | "{ pick: { timeoutMs: 999 } }"          | "invalid-memory-recall-pick" at "memory.recall.pick.timeoutMs"      |
        | "{ pick: { timeoutMs: 120001 } }"       | "invalid-memory-recall-pick" at "memory.recall.pick.timeoutMs"      |
        | "{ pick: { timeoutMs: '20000' } }"      | "invalid-memory-recall-pick" at "memory.recall.pick.timeoutMs"      |
        | "{ pick: { model: '' } }"               | "invalid-memory-recall-pick" at "memory.recall.pick.model"          |
        | "{ pick: { enabled: 'no' } }"           | "invalid-memory-recall-pick" at "memory.recall.pick.enabled"        |
        | "{ pick: { effort: 'low' } }"           | "invalid-memory-recall-pick" at "memory.recall.pick.effort"         |
        | "{ pick: false }"                       | "invalid-memory-recall-pick" at "memory.recall.pick"                |
        | "{ shortlist: 40 }"                     | "invalid-memory-recall-pick" at "memory.recall.shortlist"           |

    Scenario: the settings are honoured whichever backend serves the records
      Given "memory.recall.pick" is "{ enabled: false }"
      When the same block recall runs with "memory.backend" set to "local" and to "graphify"
      Then the stand-in was never started under either

    Scenario: the config editor's Memory section accepts the pick, and judges it the same way
      When the config editor saves a Memory section holding "recall.pick" as "{ model: 'sonnet' }"
      Then the save succeeds and the config holds "memory.recall.pick.model" as "sonnet"
      And saving "recall.pick" as "{ timeoutMs: 500 }" is refused at "memory.recall.pick.timeoutMs"
