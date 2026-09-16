@cli @distribution @adapter
Feature: A fourth preflight check — the missing heartbeat hook is named, and the count of three is superseded

  `126/04 task03` shipped a preflight of exactly three checks and its scenarios say so in three
  places. Those are delivered acceptance criteria: they are not edited, and they remain the true
  record of what `126/04` shipped. THIS feature states the count that supersedes them — four — and
  the suite implementing `126/04 task03` moves to it, because tests are code and criteria are not.

  WHY A FOURTH CHECK, MEASURED RATHER THAN IMAGINED. On this node, 2026-09-10, a supervised loop was
  declared in a workspace whose `.claude/settings.json` registers four `aofManaged` hooks and not
  `claude-run-heartbeat`. Its runtime died after about a minute. With no hook, no `heartbeatAt` was
  ever stamped, so the attempt's last observed liveness fell back to the `updatedAt` the reclaim
  wrote 8½ hours later, and `aof work loop 01 --resume` halted
  `deadline-exhausted, elapsedMs=30851979` against `ceilingMs=7200000`. Nothing warned. The
  condition is detectable and fixable — `aof work update` installs the hook — so the only thing
  missing was the report.

  BOTH HALVES ARE ASKED, because a registration pointing at a file that is not there fails at hook
  time and looks identical to a healthy workspace from the settings file alone.

  ADR-007 §4 is unchanged: this check REPORTS. It runs no `aof work update`, writes nothing on any
  path, and a failing check refuses neither verb.

  @executable
  Scenario: the preflight reports FOUR checks, in one order, on both faces
    Given a node whose workspaces all carry the heartbeat hook
    When `mesh:desktop-install` reports its preflight
    Then it reports exactly four checks, in the order `claude-authenticated`, `payload-build`, `workspace-identity-pinned`, `heartbeat-hook-installed`
    And the `--json` envelope carries them under `preflight` as an ordered list of four, in that same order
    And `mesh:desktop-run` reports the same four check lines
    And this count supersedes `126/04 task03`'s three

  @executable
  Scenario Outline: the check over each condition — and a probe that cannot answer is a fail
    Given a node with one workspace whose settings are <settings> and whose hook file is <hookFile>
    When the preflight runs
    Then `heartbeat-hook-installed` reports <status>
    And its message names <named>

    Examples: the four conditions
      | settings          | hookFile | status | named                          |
      | registers-the-id  | present  | pass   | nothing                        |
      | registers-the-id  | absent   | fail   | the workspace and the file     |
      | omits-the-id      | present  | fail   | the workspace and the id       |
      | unreadable        | present  | fail   | the workspace and the fault    |

  @executable
  Scenario: every workspace that lacks the hook is named, not just the first
    Given a node with three workspaces of which two lack the hook
    When the preflight runs
    Then `heartbeat-hook-installed` reports `fail`
    And its message names both workspaces that lack it
    And it does not name the workspace that carries it

  @executable
  Scenario: a node with no workspaces registered is a pass, not a fault
    Given a node whose workspace list is empty
    When the preflight runs
    Then `heartbeat-hook-installed` reports `pass`
    And its message says no workspace is registered to this node

  @executable
  Scenario: an unenumerable node is a FAIL rather than a silent pass
    Given a node whose workspaces cannot be enumerated
    When the preflight runs
    Then `heartbeat-hook-installed` reports `fail`
    And its message names that the workspaces could not be enumerated

  @executable
  Scenario: the check repairs nothing and reaches nothing it was not given
    Given a node with one workspace that lacks the hook
    When the preflight runs on both faces
    Then no file is written under any project root
    And no bundle install or update is invoked
    And every read goes through an injected seam
    And the message names the remedy `aof work update`
