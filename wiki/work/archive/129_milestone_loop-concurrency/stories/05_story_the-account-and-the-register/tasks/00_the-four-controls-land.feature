@executable @cli @work @validate
Feature: the four arch-test files land at their declared paths, registered, non-vacuous, and the row rises by four

  ARCHITECTURE.md § Fitness functions declares seven controls in four NEW files under
  `test/arch/loop/` plus one extension (task 02). This task lands the four files exactly at the
  paths the register cites — `acd-loop-concurrency-single-home.test.mjs` (FF-12901),
  `acd-loop-family-boundary.test.mjs` (FF-12902, FF-12906),
  `acd-lane-records-and-the-declaration.test.mjs` (FF-12903, FF-12907),
  `acd-lane-grade-is-lane-scoped.test.mjs` (FF-12905) — each exporting `archTests` (an array of
  `{ name, run }`, 119/ADR-010's harness shape), each registered by ONE import and ONE spread in
  `test/arch/loop/index.mjs` and by nothing else, and each NON-VACUOUS: a leg that sweeps must
  find the subject it sweeps for and assert it found it, so an emptied sweep is a red, never a
  silent green. The fixture legs of FF-12903, FF-12907 and FF-12905 drive a two-member wave
  through `runLoopBody` with the injected `spawnLaneDrive` and git seams of
  `test/support/loop/lane-fixture.mjs`. The `test/arch/loop` budget row rises by exactly
  these four from its value at HEAD when the story lands (54 at `2321dce8`; a sibling story's
  uncommitted control makes it 55 in this tree, so the literal is never asserted, the delta is), with its `why` amended to say so; every other row and exemption is untouched by
  this task (task 02 touches none either).

  Background:
    Given this repository at HEAD after the story's build

  Scenario Outline: each declared file exists, exports archTests and is registered once
    When `test/arch/loop/<file>` is imported
    Then it exports `archTests` as a non-empty array whose every member has exactly the own keys `name` and `run`, with `run` a function
    And `test/arch/loop/index.mjs` holds exactly one line `import { archTests as <alias> } from "./<file>";` and exactly one line `...<alias>,`
    And no line of `scripts/test.mjs` and no other `index.mjs` under `test/` names `<file>`
    And `acd-test-suite-registration` and `acd-loop-suite-registration` are green with `<file>` absent from their unregistered set

    Examples:
      | file                                              | alias                                    |
      | acd-loop-concurrency-single-home.test.mjs         | acdLoopConcurrencySingleHomeTests        |
      | acd-loop-family-boundary.test.mjs                 | acdLoopFamilyBoundaryTests               |
      | acd-lane-records-and-the-declaration.test.mjs     | acdLaneRecordsAndTheDeclarationTests     |
      | acd-lane-grade-is-lane-scoped.test.mjs            | acdLaneGradeIsLaneScopedTests            |

  Scenario Outline: each control names its register id in its case names
    When `test/arch/loop/<file>`'s `archTests` names are read
    Then every name begins `arch/129/05 FF-129`
    And at least one name contains `<id>` followed by a space or a colon

    Examples:
      | file                                              | id       |
      | acd-loop-concurrency-single-home.test.mjs         | FF-12901 |
      | acd-loop-family-boundary.test.mjs                 | FF-12902 |
      | acd-loop-family-boundary.test.mjs                 | FF-12906 |
      | acd-lane-records-and-the-declaration.test.mjs     | FF-12903 |
      | acd-lane-records-and-the-declaration.test.mjs     | FF-12907 |
      | acd-lane-grade-is-lane-scoped.test.mjs            | FF-12905 |

  Scenario: the four files are green at HEAD under an isolated global home
    When `node scripts/test.mjs --only <the four paths>` runs with `AOF_GLOBAL_HOME` set to a fresh temp dir
    Then stdout carries one `ok - arch/129/05 FF-129…` line per exported case and no `not ok` line
    And the exit code is 0

  Scenario Outline: every sweeping leg is non-vacuous — it asserts the subject was FOUND before asserting anything about it
    Given `<subject file>` is replaced by a copy with `<subject>` removed
    When `test/arch/loop/<file>` runs
    Then the `<leg>` leg fails with a message containing `NOT FOUND` and `<subject file>`
    And after the file is restored the leg is green

    Examples:
      | file                                          | leg                     | subject file              | subject                                                            |
      | acd-loop-concurrency-single-home.test.mjs     | leg 2 sweep             | src/work/loop.mjs         | the engine's `"refine_first"` branch in `decideLoopPhase`          |
      | acd-loop-concurrency-single-home.test.mjs     | leg 2 sweep             | src/work/dispatch.mjs     | the one `dispatch.concurrency` read                                |
      | acd-loop-family-boundary.test.mjs             | FF-12902 spawn leg      | src/loop/child-drive.mjs  | the `runBounded(` call and its `process.execPath` command          |
      | acd-loop-family-boundary.test.mjs             | FF-12906 wave-read leg  | src/loop/wave.mjs         | every `invokeRegistered("work:next"` call with `throughReview: true` |
      | acd-lane-records-and-the-declaration.test.mjs | FF-12903 structural leg | src/loop/wave.mjs         | the lane mint's `resolveRefInWorktree(` call                       |
      | acd-lane-records-and-the-declaration.test.mjs | FF-12907 structural leg | src/loop/wave.mjs         | the `brief.loop` pass-through into the lane mint                   |
      | acd-lane-grade-is-lane-scoped.test.mjs        | FF-12905 structural leg | src/loop/cycle.mjs        | the `invokeRegistered("work:grade"` call bound to `ctx.workspace`  |
      | acd-lane-grade-is-lane-scoped.test.mjs        | FF-12905 structural leg | src/loop/wave.mjs         | the `gradeBaselines` binding keyed by `baseCommit`                 |

  Scenario Outline: the fixture legs drive a real two-member wave in-process
    When the `<control>` fixture leg runs
    Then it drove `runLoopBody` over a two-member wave with `test/support/loop/lane-fixture.mjs`'s injected `spawnLaneDrive` and git seams
    And the fixture records exactly two `spawnLaneDrive` calls, one per member ref, and zero real child processes
    And the leg asserts `<found>` before asserting `<claim>`, so an empty wave is a red

    Examples:
      | control  | found                                                        | claim                                                           |
      | FF-12903 | both lane story dirs hold exactly one run record             | the primary's two story dirs hold no `runs/` file before merge  |
      | FF-12907 | `decideSupervisedDeclarations` returned at least one row     | it returned exactly one row whose `loopRunId` is the loop's     |
      | FF-12905 | the fake `work:grade` was invoked at least twice              | both lane grades report their lane paths and the baseline ran once |

  Scenario: the test/arch/loop row rises by exactly four
    When `test/arch/testing/acd-source-directory-budget.test.mjs` runs
    Then the `test/arch/loop` row's `ceiling` equals its value at the story's base commit plus four, and its `why` contains `129` and each of the four file names
    And the gate is green
    And every other row's `ceiling` and every exemption entry is byte-identical to HEAD before this story

  Scenario: the doctor's control resolution is clean for 129
    When `aof work doctor 129 --json` runs from the repo root
    Then no finding has code `control-unresolved` and a message containing any of `FF-12901` … `FF-12907`
    And each of the seven ids' cited paths under `test/arch/loop/` and `test/arch/grade/` is a file on disk

  Scenario: FF-12902's legs read direct imports, and the child_process exclusivity is the family's alone
    When `test/arch/loop/acd-loop-family-boundary.test.mjs` is read
    Then its PTY leg resolves the DIRECT import specifiers of `src/commands/loop.mjs` and `src/loop/*.mjs` through `importSpecifiers`, never a closure walk
    And its spawn leg asks which modules under `src/loop/` reach `runBounded` or `node:child_process`, and `src/commands/loop.mjs`'s own git `execFile` is outside that leg

  Scenario: every new control's module scope is import-safe
    When each of the four files is imported with no case run
    Then no side effect occurs and `archTests` is the only export read by the harness's entry-key sweep
