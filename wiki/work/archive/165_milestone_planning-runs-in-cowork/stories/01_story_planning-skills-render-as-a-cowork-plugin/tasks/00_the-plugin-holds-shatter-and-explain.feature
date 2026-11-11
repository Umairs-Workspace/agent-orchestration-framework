@executable @cli @planning
Feature: The plugin holds shatter and explain, rendered from their commands

  WHY. Cowork loads a plugin's skills, and the planning procedures already exist as aof commands.
  The plugin renders them through the same command-to-skill mapping Codex uses, so a change to
  shatter reaches every runtime from one source. A second, cowork-only copy of a command is never
  written.

  Background:
    Given the bundle's command sources as shipped

  Rule: R1 · The plugin carries shatter and explain, and each runs only when invoked as /aof:<skill>

    Scenario: E1 · the plugin's files are its manifest and two skills
      When the aof planning plugin is rendered
      Then its files are exactly:
        | path                       |
        | .claude-plugin/plugin.json |
        | skills/shatter/SKILL.md    |
        | skills/explain/SKILL.md    |
      And the manifest's "name" is "aof"

    Scenario: E2 · refine is not part of the plugin
      When the aof planning plugin is rendered
      Then no file path starts with "skills/refine/"
      And no file path starts with "commands/"

    Scenario: E3 · the manifest carries aof's own version
      Given aof's package version is "0.1.0"
      When the aof planning plugin is rendered
      Then the manifest's "version" is "0.1.0"

    Scenario Outline: each skill names itself and how it is invoked
      When the aof planning plugin is rendered
      Then the frontmatter of "skills/<skill>/SKILL.md" has exactly the keys "name" and "description"
      And its "name" is "<skill>"
      And its body names the invocation "/aof:<skill>"

      Examples:
        | skill   |
        | shatter |
        | explain |

    Scenario Outline: E9 · a description opens with its explicit invocation
      When the aof planning plugin is rendered
      Then the "description" of "skills/<skill>/SKILL.md" starts with "Use only when the user invokes `/aof:<skill>`"

      Examples:
        | example | skill   |
        | E9      | shatter |
        |         | explain |

  Rule: R2 · A skill runs the command's own procedure, unchanged

    Scenario Outline: E4 · a skill's body ends with its command's body, character for character
      When the aof planning plugin is rendered
      Then the body of "skills/<skill>/SKILL.md", after its preamble, equals the body of the "<skill>" command source

      Examples:
        | example | skill   |
        | E4      | shatter |
        |         | explain |

    Scenario: E5 · Codex's mapped skills are unchanged by the shared mapping
      Given the codex skills rendered before the mapping was shared
      When the codex skills are rendered now
      Then every codex skill is byte-for-byte what it was
