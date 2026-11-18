@executable @cli @work @memory
Feature: A model that cannot answer leaves the lexical block

  WHY. `claude` is not on every node, is not signed in for every environment a daemon gets, and can
  be slow. Each of those has burned runs before. The pick turns every one of them into the block an
  agent is handed today, plus one stderr line that names which it was (ADR-003, ADR-004 §1).

  Background:
    Given a scratch project whose memory index has 60 records matching "worktree junction"
    And a stand-in "claude" that behaves as each scenario says

  Rule: R2 · A model that is absent, slow, failing or garbled leaves the lexical block

    Scenario: E4 · no claude on the node
      Given no "claude" resolves on PATH
      When "aof memory recall 'worktree junction' --block" runs
      Then no process is started
      And the block is the 5 best-ranked records
      And stderr is "[memory] pick unavailable (pick-unavailable) — this block is the lexical top 5; records intact."
      And the exit code is 0

    Scenario: E5 · a claude that does not answer in time is ended
      Given "memory.recall.pick.timeoutMs" is 1000
      And the stand-in waits 30 seconds before answering
      When "aof memory recall 'worktree junction' --block" runs
      Then the command returns within 5 seconds
      And stderr names "pick-timeout"
      And the stand-in process is no longer running

    Scenario: E6 · a claude that is not signed in
      Given the stand-in prints "Not logged in" and exits 1
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is the 5 best-ranked records
      And stderr names "pick-failed"

    Scenario: E7 · a claude that is only a shell shim
      Given "claude" resolves to "claude.cmd"
      When "aof memory recall 'worktree junction' --block" runs
      Then no process is started
      And stderr names "pick-unavailable"

    Scenario Outline: what the model sends back, and what the recall makes of it
      Given the stand-in <behaviour>
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is <block>
      And stderr <stderr>
      And the exit code is 0

      Examples:
        | behaviour                                                  | block                         | stderr                    |
        | answers "[2]"                                              | the record ranked 2nd         | is empty                  |
        | answers "[]"                                               | empty                         | is empty                  |
        | answers "```json\n[4, 2]\n```"                             | the records ranked 4th, 2nd   | is empty                  |
        | answers "none of these apply"                              | the 5 best-ranked records     | names "pick-unreadable"   |
        | exits 0 with output that is not JSON                       | the 5 best-ranked records     | names "pick-unreadable"   |
        | exits 0 with a JSON result marked as an error              | the 5 best-ranked records     | names "pick-failed"       |
        | exits 0 with no output                                     | the 5 best-ranked records     | names "pick-unreadable"   |
        | cannot be started (the file is not executable)             | the 5 best-ranked records     | names "pick-failed"       |
        | is ended by a signal before it answers                     | the 5 best-ranked records     | names "pick-failed"       |

    Scenario: a miss costs one attempt
      Given the stand-in prints "Not logged in" and exits 1
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in was started exactly once
