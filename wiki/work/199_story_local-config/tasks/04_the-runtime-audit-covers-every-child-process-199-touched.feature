@executable @cli @work @bug @finding-F-03
Feature: the runtime audit covers every child process 199 touched

  F-03 (199/VERIFICATION), measured 2026-11-17 by running `test/bundle/core-workspace.test.mjs` at
  3562430f (before 199) and at 5d1ac698 (199). `scripts/workspace-runtime-audit.json` keys each
  audited call by its expression AND the comment-stripped source of its whole file, so every edit to
  a file holding an audited call must re-stamp that file's entries, with a line in each reason saying
  what changed around the call. 193 and chores 195–197 did this for `config-inspect.mjs`; 199 edited
  the file and did not. 199 also added `spawnSync("git", ["ls-files", "--error-unmatch", …])` to
  `work/doctor.mjs` (the `config-local-tracked` probe) with no audit entry.

  The case `workspace-boundaries/all actual owners are scanned…` was already red before 199, on three
  `packages/mesh` entries, so 199's four new offenders landed behind a red that was already
  expected. This task clears 199's part. The mesh entries stay outside its scope (prior occurrence of
  the cause: m161/F-05).

  Rule: every child process in a file 199 touched is audited, and no audit entry 199 left stale remains

    Scenario: the boundary detector names no file 199 touched
      When the workspace boundary detector runs over the real tree
      Then no finding names "packages/core/src/application/bindings/config-inspect.mjs"
      And no finding names "packages/core/src/application/bindings/work/doctor.mjs"

    Scenario: the doctor's tracked-file probe is audited with its reason
      Given "work/doctor.mjs" runs "git ls-files --error-unmatch -- aof.config.local.json"
      Then "scripts/workspace-runtime-audit.json" holds a "child-process" entry for that call
      And its reason says it reads one path's tracked state at the command edge, only when the local file exists, and constructs no application module

    Scenario Outline: config-inspect's audited calls are re-stamped, their reasons naming 199
      Then the "child-process" entry for <call> in "config-inspect.mjs" matches the file as it now stands
      And its reason says 199 edits the file around it and the call and its argv are unchanged

      Examples:
        | call                                   |
        | "spawnSync(locator, [binary], …)"      |
        | "spawnSync(\"git\", [\"ls-files\", \"-z\"], …)" |
        | "spawnSync(\"git\", [\"log\", \"-1\", …], …)"   |
