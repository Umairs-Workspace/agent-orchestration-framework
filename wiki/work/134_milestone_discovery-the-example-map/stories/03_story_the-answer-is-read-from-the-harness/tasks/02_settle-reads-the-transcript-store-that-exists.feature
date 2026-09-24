@executable @cli @work @work-stream
Feature: Settle reads the transcript store that exists, so a hand-run settle stamps spend and answers

  WHY. `transitionRunComplete` is the one seam every terminal transition passes. It hands
  `completeRun` a transcript directory, and when its caller gives none it falls back to the
  repository root, where no transcript lives (RESEARCH R5). So a hand-run `aof work run-complete`
  has never stamped spend: the three newest settled runs of 133 carry a `sessionId` and
  `spend: null`. An answer stamp hung on the same seam would stamp nothing and report nothing wrong,
  which is exactly R6's failure mode. The seam now resolves the directory through
  `claudeProjectsDir`, the one place that knows where Claude Code keeps transcripts, and never
  passes the repository root (ADR-003 §4, FF-13404).

  This is a fix, not a feature: it applies whatever `work.examples` says (ADR-006 §3). Hand-run
  settles start stamping spend, which is a behaviour change, and the spend suite gains the case
  that proves it.

  RULINGS (developer feasibility, 2026-09-24).
  (1) The directory resolves from `claudeProjectsDir({ cwd: workspace.projectRoot, env, home })`,
      never from `process.cwd()`: a CLI settle run from a subdirectory still loads the workspace at
      the repository root, and a loop lane's workspace is its dispatch worktree, whose slug is the
      one its session wrote under. `env` and `home` are injectable opts (default `process.env`
      and the OS home), so a test points `CLAUDE_CONFIG_DIR` at a temp directory and never reads
      the real store.
  (2) The default applies only when the caller names a `workspace`. The mesh callers
      (`worker-execution`, `park-resume`) pass none, their sessions ran elsewhere, and they read
      nothing, as today.
  (3) THE WITHHELD-SPEND HAZARD (confirmed at feasibility). The two driven settles
      (`settleDriven` in `src/loop/cycle.mjs`, the local drive in `src/commands/drive.mjs`)
      settle spend themselves against a resume baseline, and withhold it when the baseline is
      unavailable or its delta held no usage. With a resolved default, `completeRun` would then
      stamp the WHOLE tree, charging earlier runs' cost to this one. So `transitionRunComplete`
      takes `spendSettled` (default false), which `completeRun` receives as `settleSpend: false`:
      spend is skipped, answers are still stamped. Both driven settles pass their own
      `projectsDir` and `spendSettled: true`. They are the only place answers are stamped on the
      loop's path, because `run-complete` inside a driven session writes nothing.

  RULINGS (QA, 2026-09-24).
  (1) An empty-string transcript directory counts as none given, so a workspace caller's is
      resolved rather than passed through to read nothing.
  (2) An empty `CLAUDE_CONFIG_DIR` counts as unset, as `claudeProjectsDir` already treats it.
  (3) A caller's explicit directory wins over the workspace's, and is read as given, with no
      check that a transcript lives there.

  Background:
    Given a fixture project in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And a fixture Claude config directory in a third fresh temp directory, standing in for `~/.claude`

  Scenario: a hand-run settle now stamps spend from the session's transcript
    Given a running run of a fixture story whose `sessionId` names a transcript with usage, under the fixture config directory's project folder for the fixture project
    When the run is completed through `transitionRunComplete` with the fixture workspace and no transcript directory
    Then the committed run record's `spend` is stamped from that transcript

  Scenario Outline: the transcript directory is the caller's, or it is resolved — never the repository root — <caller>
    Given <caller>
    When the run is completed through `transitionRunComplete`
    Then the directory `completeRun` reads is <directory>

    Examples:
      | caller                                                                                                    | directory                                                                   |
      | the fixture workspace and no transcript directory, with `CLAUDE_CONFIG_DIR` the fixture config directory  | `<fixture config directory>/projects/<slug of the fixture project root>`    |
      | the fixture workspace and the explicit transcript directory `D`                                           | `D`                                                                         |
      | no workspace and the explicit transcript directory `D`                                                    | `D`                                                                         |
      | no workspace and no transcript directory, as the mesh callers pass                                        | none: no transcript is read, and no degrade is reported                     |
      | the fixture workspace and no transcript directory, with `CLAUDE_CONFIG_DIR` unset and the injected home `H` | `<H>/.claude/projects/<slug of the fixture project root>`                 |
      | the fixture workspace and no transcript directory, with `CLAUDE_CONFIG_DIR` the empty string and home `H` | `<H>/.claude/projects/<slug of the fixture project root>`                   |
      | the fixture workspace and the empty-string transcript directory `""`                                      | `<fixture config directory>/projects/<slug of the fixture project root>`    |
      | the fixture workspace, with the process working directory a subdirectory of the fixture project           | `<fixture config directory>/projects/<slug of the fixture project root>`    |
      | a workspace whose root is a dispatch worktree of the fixture project                                      | `<fixture config directory>/projects/<slug of that worktree's root>`        |

  Scenario: a spend the caller settled or withheld is not settled again
    Given a running run whose session's transcript holds usage and one answered question `134/02 Q1`, and whose `spend` the caller left null
    When the run is completed through `transitionRunComplete` with the fixture workspace, the transcript directory and `spendSettled: true`
    Then the run record's `spend` is still null
    And its `brief.answers` holds the record for `134/02 Q1`

  Scenario: FF-13404 — the seam never hands the repository root to a transcript read
    Given the comment-stripped text of `src/effects/run-transitions.mjs`
    When the control `test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs` reads it
    Then no transcript directory is taken from `workspace.projectRoot` itself
    And the directory a caller does not give is resolved through `claudeProjectsDir`, and only when the caller names a workspace
    And `settleDriven` in `src/loop/cycle.mjs` and the drive settle in `src/commands/drive.mjs` each pass their own `projectsDir` and `spendSettled: true`
    And a planted `projectsDir ?? workspace?.projectRoot`, or a driven settle with its `spendSettled: true` removed, turns the control red
