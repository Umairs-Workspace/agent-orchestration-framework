@executable @work @assets
Feature: aof:grill-me ships for Claude Code through the practices registry

  WHY. A check is learning behaviour, so it ships from `@aof/learning` beside `teach`, through the
  practices registry 188 built, and adds no registry, seam or core module (ADR-001). It is proven on
  Claude Code only, so Codex and OpenCode render nothing for it, and the README says so.

  Rule: R1 · The check command ships for Claude Code only

    Scenario: E1 · a three-runtime render writes the Claude command and nothing else
      Given a project whose lock renders claude, codex and opencode
      When `aof work update` runs
      Then `.claude/commands/aof/grill-me.md` is written
      And no path under `.agents/skills/aof-grill-me/` and no `.opencode/commands/aof/grill-me.md` is planned

    Scenario: E2 · the README lists the command and its runtime limit
      When `README.md`'s command table is read
      Then it has a row starting "| `/aof:grill-me`"
      And that row says Codex and OpenCode render no grill-me command

    Scenario Outline: the grill-me member is declared as teach is
      When `readDescriptor()` is read
      Then the `grill-me` member has `<key>` equal to <value>

      Examples:
        | key              | value                    |
        | kind             | "command"                |
        | file             | "commands/grill-me.md"   |
        | runtimes         | ["claude"]               |
        | commandNamespace | "aof"                    |
        | mapped           | false                    |

    Scenario: the member carries no integration gate
      When `readDescriptor()` is read
      Then the `grill-me` member has no `integration` key
      And a project with no `work.integrations` block still renders `.claude/commands/aof/grill-me.md`

    Scenario: every command census counts the new member
      When the bundle's command censuses are run
      Then the command count in `packages/core/test/bundle.suite.mjs` is one more than before this story, with grill-me named in its reason
      And `wiki/prompt-audit.md` carries a `command:grill-me` row and its audited member count is one more
      And `test/loop/autonomous-shell-out-prompt.test.mjs` and `acd-learning-edge-reaches-every-cut` classify `grill-me`
      And the two "every command maps to codex" controls exclude `grill-me` as a `mapped: false` member
