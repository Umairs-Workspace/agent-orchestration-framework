@executable @cli @work @memory
Feature: The pick asks claude once, from outside the project

  WHY. 177 measured the pick as one cheap model call, and paid about 39,000 input tokens for it
  because the call carried the CLI's whole context. Launched lean it reads under 1,000 (ADR-004,
  measured 2026-11-17). It must also leave no trace in the project: a pick that fired the project's
  hooks or left a transcript would be counted by `aof work observe` as an agent session.

  Background:
    Given a scratch project whose memory index has 60 records matching "worktree junction"
    And a stand-in "claude" that records its arguments, stdin, working directory and environment
    And the stand-in answers as each scenario says

  Rule: R1 · The pick is one `claude` call at the project's model, run outside the project

    Scenario: E1 · one process is started, and its answer is the block
      Given the stand-in answers "[3, 1]"
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in was started exactly once
      And it was asked for the model "haiku"
      And its stdin held the query "worktree junction" and 20 numbered cards
      And it was given no tools
      And its working directory is not the project and not inside it
      And the block is the records ranked 3rd and 1st, in that order

    Scenario: E2 · nothing of the calling session reaches the child
      Given the recall runs with "CLAUDECODE=1" and "CLAUDE_CODE_SSE_PORT=4711" in its environment
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in's environment holds neither "CLAUDECODE" nor "CLAUDE_CODE_SSE_PORT"
      And it still holds "HOME" and "PATH"

    Scenario Outline: what the launch asks for, and what it never asks for
      When "aof memory recall 'worktree junction' --block" runs
      Then the stand-in's arguments <hold> <argument>

      Examples:
        | hold           | argument                          |
        | include        | "--print" or "-p"                 |
        | include        | "--output-format" "json"          |
        | include        | "--no-session-persistence"        |
        | include        | "--strict-mcp-config"             |
        | include        | "--disable-slash-commands"        |
        | do not include | "--bare"                          |
        | do not include | "--dangerously-skip-permissions"  |
        | do not include | the query or any card's text      |

    Scenario: a recall that needs no pick starts no process
      When "aof memory recall 'worktree junction' --json" runs
      And "aof memory recall 'no record says this' --block" runs
      Then the stand-in was never started
