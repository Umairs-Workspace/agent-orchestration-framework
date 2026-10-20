@executable @cli @planning
Feature: Without the CLI a skill writes Markdown only

  WHY. Cowork's shell is a Linux VM where the Windows aof payload does not run, and committing there
  leaves git lock files behind. A planning skill must still finish with Markdown alone. It must
  never imitate a verb that changes state, because a number or a status written by hand is exactly
  the drift those verbs exist to prevent. These rules live once, in the cowork preamble, and every
  skill carries them.

  Background:
    Given the aof planning plugin is rendered

  Rule: R3 · Without the aof CLI, a skill keeps to Markdown and changes no state by hand

    Scenario Outline: E6 · every skill probes for the CLI and reports what it skipped
      Then the preamble of "skills/<skill>/SKILL.md" tells the agent to run "command -v aof" before its first aof step
      And it tells the agent, when aof is absent, to skip each aof step and list the skipped steps in its report

      Examples:
        | example | skill   |
        | E6      | shatter |
        |         | explain |

    Scenario: E7 · shatter without the CLI leaves its drivers in the backlog
      Then the preamble of "skills/shatter/SKILL.md" says that without aof the drivers stay in the backlog, to be promoted from Claude Code or Codex
      And it forbids writing a "number:" line by hand
      And it forbids changing a "status:" line by hand

    Scenario Outline: E8 · no skill commits
      Then the preamble of "skills/<skill>/SKILL.md" tells the agent never to commit

      Examples:
        | example | skill   |
        | E8      | shatter |
        |         | explain |

    Scenario: the preamble is the same text in every skill
      Then the preamble of "skills/shatter/SKILL.md" and the preamble of "skills/explain/SKILL.md" differ only in the skill's name and argument hint
