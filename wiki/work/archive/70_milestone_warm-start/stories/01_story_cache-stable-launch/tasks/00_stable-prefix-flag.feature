@executable @cli @work @work-stream
Feature: The spawn moves its per-machine sections out of the system prompt — and keeps the right to

  Claude Code's cache is *"effectively scoped to one machine and directory… That includes worktrees
  of the same repository, since each worktree has its own working directory."* aof dispatches one
  worktree per story and mutates the tree during build, so every story is cold against every other
  story by construction. That is the mechanism behind 927k cache-create tokens per spawn — $5.79
  against $0.46 for the same tokens read, a 12.6× delta.

  `--exclude-dynamic-system-prompt-sections` is the shipped remedy: it moves cwd, env info, memory
  paths and git status into the first user message *"so identical configurations share a cache entry
  across users and machines."*

  **The enabling condition was measured, not assumed** — STATE asked refine to verify this before
  the design leaned on it. On `claude 2.1.233` the flag's own help ends: *"Only applies with the
  default system prompt (ignored with `--system-prompt`)."* aof builds
  `["--permission-mode", "auto", "--append-system-prompt", WORKER_SESSION_INSTRUCTION]`
  (`src/agent-session-driver.mjs:646`) and `--system-prompt` appears **nowhere** in `src/**`. aof
  appends; it has never replaced. So the flag applies.

  That condition is the fragile part and it is why the second half of this contract exists. A future
  migration from `--append-system-prompt` to `--system-prompt` would make this milestone's headline
  lever inert with **no error, no warning and no observable change in behaviour**.

  ADR-004. FF-7004 (an extension of the existing launch-argv guard) and FF-7005 make it loud.

  Scenario: the spawn asks for a shareable prefix
    Given a phase session about to be spawned
    When the launch is resolved
    Then the argv carries the flag that relocates the per-machine sections
    And the worker system prompt is still appended rather than replaced

  Scenario: the worker instruction still reaches the session
    Given a spawn carrying the stable-prefix flag
    When the launch argv is inspected
    Then the worker session instruction is present as an appended system prompt
    And the sentinel behaviour that instruction produces is unchanged

  Scenario: aof never replaces the system prompt
    Given every module that contributes to a spawn
    When the launch argv is assembled
    Then no replacement system prompt argument is constructed anywhere
    And the append form is the only system-prompt form in use

  Scenario: two phases with identical configuration resolve an identical prefix
    Given two phases spawned from different worktrees of the same repository
    When both launches are resolved
    Then the parts of the launch that determine the cached prefix are identical
    And they differ only in what the first user message carries

  Scenario: the permission mode and the IDE scrub are untouched
    Given a spawn carrying the stable-prefix flag
    When the launch is resolved
    Then the permission mode is unchanged
    And the environment is still scrubbed of the IDE-attachment vector

  Scenario Outline: what the launch must and must not carry
    Given a resolved phase launch
    When its argv is inspected
    Then <argument> is <presence>

    Examples: the argv contract — the first two are this task, the rest are inherited and must hold
      | argument                                   | presence |
      | the stable-prefix flag                     | present  |
      | an appended system prompt                  | present  |
      | a replacement system prompt                | absent   |
      | a one-shot print flag                      | absent   |
      | a non-interactive output-format flag       | absent   |

  Scenario Outline: the flag's enabling condition, stated as a rule a future change must pass
    Given a launch whose system prompt is supplied by <form>
    When the stable-prefix flag is present
    Then the configuration is <verdict>

    Examples: why FF-7004 exists — one of these is silently useless
      | form                        | verdict                                  |
      | an appended system prompt   | admitted, the flag applies               |
      | a replacement system prompt | refused, the flag would be silently inert|
