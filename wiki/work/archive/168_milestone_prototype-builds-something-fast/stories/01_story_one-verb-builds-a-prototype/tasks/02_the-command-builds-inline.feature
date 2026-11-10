@executable @docs @assets @distribution
Feature: The `/aof:prototype` command builds in the operator's own session, and ships to every runtime

  WHY. A prototype is fast because it carries none of the governed loop's machinery: no spawned
  agents, no lane, no review, no commit. The command is the prompt half of the verb, so it has
  to reach every runtime the bundle renders, the way every other work command does.

  Rule: R4 · The prototype is built in the operator's own session

    Scenario: E14 · the command carries none of the governed loop's machinery
      Given the shipped command "packages/core/assets/commands/prototype.md"
      Then its "allowed-tools" does not list "Agent"
      And it calls "aof work prototype" for each of the four moves
      And it tells the session to make no branch, no worktree and no commit, and to run no review lane
      And it tells the session to keep "## Shortcuts" current and to log as it goes with "--log"

    Scenario: E17 · on main the command says so once and then builds
      Given the shipped command "packages/core/assets/commands/prototype.md"
      Then its start move reads the current branch before building
      And when the branch is "main" it says once that the checkout is on "main" and the work should be committed to a branch
      And it builds whatever the branch

    Scenario Outline: E15 · the command reaches every rendered runtime
      Given a project initialised with runtimes "claude", "codex" and "opencode"
      When "aof work update" runs
      Then <surface> carries the prototype command

      Examples:
        | runtime  | surface                                      |
        | claude   | ".claude/commands/aof/prototype.md"          |
        | opencode | ".opencode/commands/aof/prototype.md"        |
        | codex    | the codex "workflow.md" "prototype" section  |

    Scenario: the bundle declares the command beside add-chore
      When the bundle manifest is read
      Then "prototype" is a command member for exactly the runtimes "add-chore" is
      And "prototype" is a template member

    Scenario: E16 · explain answers a prototype with its intent
      Given the shipped command "packages/core/assets/commands/explain.md"
      Then its record table maps "prototype" to "its ## Intent"
