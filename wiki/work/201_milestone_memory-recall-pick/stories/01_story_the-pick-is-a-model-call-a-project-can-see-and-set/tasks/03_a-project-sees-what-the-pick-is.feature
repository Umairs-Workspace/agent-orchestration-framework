@executable @cli @work @memory
Feature: A project sees what the pick is

  WHY. After `aof work update`, an existing project's recall starts making a model call it never
  configured. It should be able to see that in the two places it already looks: `aof memory status`
  and `aof project show` (ADR-004 §6). On a node where `claude` does not resolve, status says the
  blocks are the old ones before anyone reads a degraded recall.

  Background:
    Given a scratch project with the local memory backend and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R4 · A project can see what the pick is

    Scenario: E12 · status names the pick and that claude resolves
      Given the config has no "memory.recall"
      And a "claude" resolves on PATH
      When "aof memory status" runs
      Then it prints the line "recall: pick haiku, 20 s (default) · claude resolves"
      And no "claude" process is started

    Scenario: E13 · status says when the node cannot pick
      Given no "claude" resolves on PATH
      When "aof memory status" runs
      Then it prints the line "recall: pick haiku, 20 s (default) · claude not found, so every block is the lexical top 5"

    Scenario: E14 · status says when the project turned the pick off
      Given "memory.recall.pick" is "{ enabled: false }"
      When "aof memory status" runs
      Then it prints the line "recall: pick off (project setting)"

    Scenario: E15 · project show carries the pick and where each value came from
      Given the config has no "memory.recall"
      When "aof project show --json" runs
      Then its memory section's "recall.pick" is "{ enabled: true, model: 'haiku', timeoutMs: 20000, source: 'default' }"

    Scenario Outline: the status line follows the settings
      Given "memory.recall.pick" is <setting>
      And a "claude" resolves on PATH
      When "aof memory status" runs
      Then it prints the line <line>

      Examples:
        | setting                                    | line                                                              |
        | "{ model: 'sonnet' }"                      | "recall: pick sonnet, 20 s (project setting) · claude resolves"   |
        | "{ timeoutMs: 45000 }"                     | "recall: pick haiku, 45 s (project setting) · claude resolves"    |
        | "{ timeoutMs: 1500 }"                      | "recall: pick haiku, 1.5 s (project setting) · claude resolves"   |
        | "{ enabled: true }"                        | "recall: pick haiku, 20 s (project setting) · claude resolves"    |
        | "{}"                                       | "recall: pick haiku, 20 s (default) · claude resolves"            |

    Scenario: the line sits with the other settings, and the stale-index line stays last
      Given the memory index was written by an older build
      When "aof memory status" runs
      Then the "recall:" line comes after the "corpora:" line
      And the line naming the stale index is the last line

    Scenario: status as JSON carries the same facts
      Given "memory.recall.pick" is "{ model: 'sonnet' }"
      When "aof memory status --json" runs
      Then its "config.recall.pick" holds the model "sonnet", the time limit 20000 and the source "project setting"
      And it says whether "claude" resolves on this node

    Scenario: project show names what the pick sends, and to whom
      Given the config has no "memory.recall"
      When "aof project show" runs
      Then its memory section says the recall pick sends the query and up to 20 records' text to the provider behind "claude"
      And with "memory.recall.pick.enabled" false it says the pick is off and names nothing sent

    Scenario: with memory off, status claims no pick
      Given "memory.backend" is "none"
      When "aof memory status" runs
      Then the "recall:" line still names the setting
      And a block recall prints nothing and starts no process
