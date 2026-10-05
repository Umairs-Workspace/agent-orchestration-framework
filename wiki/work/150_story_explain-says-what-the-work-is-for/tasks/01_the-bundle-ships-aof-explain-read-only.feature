@cli @work @work-stream
Feature: the bundle ships /aof:explain, and asking writes nothing

  WHY. The answer is plain-language synthesis from an item's record, which only a session can
  write, so `aof:explain` is a bundle command with no `aof work explain` CLI verb (the
  work-command-implies-claude-command rule runs from CLI to bundle, not back). It is composed of
  the existing read verbs: `aof work find`, `aof work doc`, `aof work list` and `aof work tasks`.
  It is not a phase: it mints no run, moves no status, stamps no `updated:`, captures no
  feedback, and writes no file. Its tool list offers no Write or Edit, and its prose names no
  writing verb except to forbid it. `aof work find` refreshing the machine-wide work
  cache is outside the work tree and holds no answer, so it does not break the promise.

  Rule: R1 · Asking leaves nothing behind in the work tree

    @executable
    Scenario: the bundle ships the command beside the others
      When the bundle is rendered by "aof work update"
      Then ".claude/commands/aof/explain.md", ".opencode/commands/aof/explain.md" and ".codex/skills/aof-explain/SKILL.md" exist
      And the bundle's command census names "explain"
      And its argument hint is "<ref…> [--verbose]"

    @executable
    Scenario: E1 · the command can read but cannot write
      When "packages/core/assets/commands/explain.md" is read
      Then its "allowed-tools" are exactly "Read", "Grep", "Glob" and "Bash"
      And it says it mints no run, moves no status and writes no file

    @executable
    Scenario Outline: the command names no verb that writes the work tree
      When "packages/core/assets/commands/explain.md" is read
      Then "<verb>" appears only in a sentence that forbids it

      Examples:
        | verb                 |
        | aof work run-start   |
        | aof work status      |
        | aof work feedback    |
        | aof work promote     |
        | aof work archive     |

    @manual
    Scenario: E2 · a real explain leaves every item its status and its updated date
      Given the payload is installed and the checkout's "git status --porcelain" is recorded
      When "/aof:explain 147 149 --verbose" is run in a Claude Code session in this repository
      Then "git status --porcelain" is unchanged
      And neither 147's nor 149's "runs/" folder gained a file
      And 147 and 149 keep their status and their "updated:" date
