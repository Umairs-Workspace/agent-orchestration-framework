@executable @cli @assets @distribution
Feature: Each runtime alone renders its own share

  WHY. A project that uses one runtime runs `assets apply --runtime <one>`. Held as a delta over the
  three-runtime tree, each runtime's share costs only its `removed.golden`. That list shows what
  that runtime does not get, and the files it still writes outside itself are held as they are
  today (ADR-001, ADR-006 §3).

  Background:
    Given the "assets-apply" lane is registered with the harness
    And scenarios "claude", "codex" and "opencode" each name base "every-kind" and start with the files of "EVERY_KIND"

  Rule: R2 · Each runtime alone renders its own share, and the files it writes outside it are held

    Scenario Outline: each runtime alone renders to its baseline
      Given scenario "<scenario>"'s step is "assets apply --runtime <scenario> --json"
      When the harness compares scenario "<scenario>" in lane "assets-apply"
      Then it passes

      Examples:
        | scenario |
        | claude   |
        | codex    |
        | opencode |

    Scenario Outline: each runtime's delta removes the other runtimes' outputs and none of its own
      When the stored baseline of "<scenario>" is read
      Then its "removed.golden" names <removed>
      And it names none of <kept>

      Examples:
        | example | scenario | removed                                                                                                  | kept                                                                     |
        | E5      | claude   | every ".agents/" and ".opencode/" path, "AGENTS.md", "src/AGENTS.md", every ".codex/" path but ".codex/config.toml" | any ".claude/" path, "CLAUDE.md", ".mcp.json", ".codex/config.toml"      |
        | E6      | codex    | every ".claude/" and ".opencode/" path but ".claude/settings.json", "CLAUDE.md", ".mcp.json"              | any ".codex/" or ".agents/" path, "AGENTS.md", "src/AGENTS.md", ".claude/settings.json" |
        | E6      | opencode | every ".claude/", ".codex/" and ".agents/" path but ".claude/settings.json" and ".codex/config.toml", "AGENTS.md", "src/AGENTS.md", "CLAUDE.md", ".mcp.json" | any ".opencode/" path, ".claude/settings.json", ".codex/config.toml"     |

    Scenario Outline: E7 · what a runtime alone writes outside itself is held as today's behaviour
      When scenario "<scenario>" runs
      Then ".claude/settings.json" exists
      And ".codex/config.toml" <codex config>

      Examples:
        | scenario | codex config                                     |
        | claude   | holds exactly "model = \"o3\"\n"                 |
        | codex    | declares the servers "docs" and "remote" too     |
        | opencode | holds exactly "model = \"o3\"\n"                 |
