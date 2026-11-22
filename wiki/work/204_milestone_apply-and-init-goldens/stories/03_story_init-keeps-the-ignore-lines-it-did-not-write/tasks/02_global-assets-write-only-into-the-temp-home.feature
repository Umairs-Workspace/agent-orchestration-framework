@executable @cli @assets @scaffold
Feature: Global assets write only into the temp home

  WHY. A test that writes into the real `~/.aof` pollutes the operator's live config and mesh
  stores. `--global` is the one path that writes into the home by design. Held with the home tree
  captured beside the project's, it shows exactly what lands where (ADR-001 §4).

  Background:
    Given the "project-init" lane is registered with the harness
    And scenario "global" names base "empty", and its steps are, each with "--json":
      | step                                                                                         | exit |
      | init --runtime claude,codex,opencode                                                         | 0    |
      | assets add --global skill g-skill --description "Global skill" --body "Global skill body." --runtime claude,codex,opencode | 0 |
      | assets add --global agent g-agent --description "Global agent" --body "Global agent body." --runtime claude,codex,opencode | 0 |
      | assets add --global rule g-rule --description "Global rule" --body "Global rule body." --runtime claude,codex,opencode    | 0 |
      | assets add --global command g-command --body "x"                                             | 1    |
      | assets use --global skill g-skill                                                            | 0    |
      | assets use --global agent g-agent                                                            | 0    |
      | assets use --global rule g-rule                                                              | 0    |
      | assets apply                                                                                 | 0    |

  Rule: R3 · `--global` writes only into the temp global home

    Scenario: the global scenario renders to its baseline
      When the harness compares scenario "global" in lane "project-init"
      Then it passes

    Scenario: E6 · the home holds the global config and the three bodies, and nothing else
      When scenario "global" runs
      Then the captured home tree holds exactly "aof.config.json", "assets/skills/g-skill/SKILL.md", "assets/agents/g-agent/AGENT.md" and "assets/rules/g-rule/RULE.md"

    Scenario: E7 · a global command is refused
      When scenario "global" runs
      Then the fifth step exits 1 and its envelope says a global "command" is not a valid kind

    Scenario Outline: E8 · the project renders each global asset for each runtime that takes it
      When scenario "global" runs
      Then "<output>" exists, rendered from the global <kind> "<id>"

      Examples:
        | kind  | id      | output                              |
        | skill | g-skill | .claude/skills/g-skill/SKILL.md     |
        | skill | g-skill | .agents/skills/g-skill/SKILL.md     |
        | skill | g-skill | .opencode/skills/g-skill/SKILL.md   |
        | agent | g-agent | .claude/agents/g-agent.md           |
        | agent | g-agent | .codex/agents/g-agent.toml          |
        | agent | g-agent | .opencode/agents/g-agent.md         |
        | rule  | g-rule  | .claude/rules/g-rule.md             |
        | rule  | g-rule  | AGENTS.md                           |
        | rule  | g-rule  | .opencode/rules/g-rule.md           |

    Scenario: every path a step reports lies under the temp project or the temp home
      When scenario "global" runs
      Then every absolute path in the normalised step records starts with "<project>" or "<home>"
