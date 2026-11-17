@executable @cli @work @validate
Feature: The local file wins, and every value says which file it came from

  WHY. Two people in one repository share one committed operator profile today, so discovery
  pitches questions at whoever committed last. An uncommitted `.aof/aof.config.local.json` lays
  each person's own values over the project's, which in turn lie over the machine-wide file. Each
  block keeps the merge it already has: the operator profile's `role` wins whole and its
  `expertise` merges per domain. A loop lane is a checkout of committed files only, so it finds the
  local file through the checkout that started it.

  Background:
    Given a scratch project and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R1 · A key in the local file wins over the project file, which wins over the machine-wide file; each block keeps its own merge, and every value says which file it came from

    Scenario: E1 · the local operator role wins over the project's
      Given the project's "work.operator.role" is "Builds the mesh"
      And the local file's "work.operator.role" is "Product owner, new to the codebase"
      When the project's workspace is loaded and the operator profile is resolved
      Then the role is "Product owner, new to the codebase"

    Scenario: E2 · expertise merges per domain, the local entry winning
      Given the project's "work.operator.expertise" is "{ mesh: expert, ui: working }"
      And the local file's "work.operator.expertise" is "{ ui: new }"
      When the project's workspace is loaded and the operator profile is resolved
      Then the level for "mesh" is "expert"
      And the level for "ui" is "new"

    Scenario: E3 · with no local file, every value is today's
      Given the project and global config of the shipped fixture set, and no local file
      When the project's workspace is loaded
      Then the loaded config equals the global file laid under the project file by today's per-block rules, key for key
      And no value is reported with source "local"

    Scenario: E4 · inspection names the local file as a value's source
      Given the local file's "work.operator.role" is "Product owner"
      When "aof project show --json" runs
      Then "work.operator.role" is reported with source "local" and the local file's path

    Scenario: E5 · a loop lane reads the local file of the checkout that started it
      Given the project is a git repository whose local file's "work.operator.role" is "Product owner"
      And a linked worktree of it, as a loop lane makes, which holds no local file
      When the workspace is loaded from inside the worktree and the operator profile is resolved
      Then the role is "Product owner"

    Scenario Outline: every layer and every allow-listed key, from the right file
      Given the global file's <key> is <global>
      And the project's <key> is <project>
      And the local file's <key> is <local>
      When the project's workspace is loaded
      Then <key> resolves to <resolved> with source <source>

      Examples:
        | key                                | global  | project   | local   | resolved  | source    |
        | "work.operator.role"               | "G"     | "P"       | "L"     | "L"       | "local"   |
        | "work.operator.role"               | "G"     | "P"       | absent  | "P"       | "project" |
        | "work.operator.role"               | "G"     | absent    | absent  | "G"       | "global"  |
        | "work.operator.role"               | "G"     | absent    | "L"     | "L"       | "local"   |
        | "work.notify.channels"             | "{ discord: G }" | "{ discord: P }" | "{ discord: L }" | "{ discord: L }" | "local"   |
        | "work.notify.channels"             | "{ discord: G }" | absent | absent | "{ discord: G }" | "global"  |
        | "work.agents.session.effort.build" | absent  | "high"    | "xhigh" | "xhigh"   | "local"   |
        | "work.agents.session.effort.build" | absent  | "high"    | absent  | "high"    | "project" |

    Scenario: an unreadable local file is reported, never silently skipped
      Given the local file holds "{ not json"
      When "aof project validate --json" runs
      Then it reports an error with code "config-local-unreadable" naming the local file's path
      And the loaded config is not built from the project file alone as though nothing were wrong
