@executable @cli @work @work-stream
Feature: the per-story post-drive ladder is extracted to src/loop/cycle.mjs and sequential is byte-identical

  ADR-008 §3. The block inline in `runLoopBody` after a completed `continue` drive — the grade
  delta against the baseline, the progress sampler, the review gate and its rounds, the four
  bookkeeping maps (`pendingFixes`, `pendingGrades`, `progressStates`, `reviewRounds`) and the
  cross to `verify` — MOVES to `src/loop/cycle.mjs` as `settleStoryCycle(phaseRun, bookkeeping,
  ctx, { crossToVerify, narrate, report, now })`, parameterised by the WORKSPACE it grades in
  (`ctx.workspace`) so story 04's lanes can call it with a lane workspace. `runLoopBody` calls it
  with the primary workspace and `crossToVerify: true`; under `sequential` every observable of the
  loop is byte-identical — the standing loop suites are the proof and none of their assertions
  changes. `narrate` and `report` are PARAMETERS of every `src/loop/` function, never a second
  printer: `acd-loop-narrates-in-flight`'s needle scan (FF-12602) is extended over the family so
  `Gate work:grade` and its siblings are still found at the narrate seam wherever they now live.
  `src/commands/loop.mjs` is measured before and after; it is expected to LOSE around 300 lines,
  and a net growth is a review finding.

  Background:
    Given the standing loop fixtures under `test/support/` and the loop suites under `test/loop/`

  Scenario: settleStoryCycle is the one home of the ladder
    When `src/loop/cycle.mjs` is imported
    Then it exports `settleStoryCycle`
    And `src/commands/loop.mjs` contains no `invokeRegistered("work:grade"` call and no `recordBuildProgress(` call of its own
    And `src/commands/loop.mjs` reaches both through `settleStoryCycle`

  Scenario: sequential mode is byte-identical
    When every suite registered in `test/loop/index.mjs` that drives `runLoopBody` runs under an isolated global home
    Then every one is green with no assertion changed
    And the `LoopState` a probe answers has `Object.keys` exactly `["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]`
    And a `sequential` `driven` row has `Object.keys` exactly `["ref", "phase", "runId", "outcome", "attempt", "cycle"]` plus the grade keys when a rubric is declared, as today

  Scenario: the ladder grades in the workspace it is handed
    Given fake `work:grade`, `work:validate` and `work:doctor` that record `ctx.workspace.projectRoot`
    When `settleStoryCycle` runs with a ctx whose `workspace.projectRoot` is `C:/lanes/dispatch-127-02`
    Then every fake recorded `C:/lanes/dispatch-127-02`
    And the progress sampler received `worktreePath` `C:/lanes/dispatch-127-02`
    And `readChangeUnderReview` was asked with `C:/lanes/dispatch-127-02`

  Scenario Outline: the ladder's answer is decided by its rungs in rung order, whichever workspace it grades in
    Given a story `03/01` after a completed `continue` drive at cycle <cycle> of cap 3, with `reviewRounds` 0, a declared rubric and an injected sampler
    And `work:grade` answers <grade>, then `work:validate` answers <validate> and `work:doctor` answers <doctor>
    When `settleStoryCycle` runs with `crossToVerify: false`
    Then `work:grade` was invoked exactly once, with `run: true` and `claimRun` the drive's `runId`, before any other rung
    And the answer's `next` is <next>
    And `pendingFixes.get("03/01")?.findings` is <findings>
    And the answer's halt is <halt>

    Examples:
      | cycle | grade                               | validate   | doctor                                         | next       | findings                                                                            | halt                                                       |
      | 1     | pass                                | 0 findings | 0 admitted                                     | "verify"   | undefined                                                                           | none                                                       |
      | 1     | indeterminate `rubric-unconfigured` | 0 findings | 0 admitted                                     | "verify"   | undefined                                                                           | none                                                       |
      | 1     | pass                                | 2 findings | not asked                                      | "continue" | the two validate findings, verbatim                                                 | none                                                       |
      | 1     | pass                                | 0 findings | 1 `error` whose code is in `DOCTOR_GATE_CODES` | "continue" | that one doctor finding                                                             | none                                                       |
      | 1     | pass                                | 0 findings | 1 `warn`                                       | "verify"   | undefined                                                                           | none                                                       |
      | 1     | fail on `own-red`                   | not asked  | not asked                                      | "continue" | `[{ gate: "work:grade", code: "case-failed", case: "own-red", message, scenario }]` with `progressContinuation: true` | none |
      | 1     | fail on `own-red`, sampler faulted  | 1 finding  | not asked                                      | "continue" | the validate finding then the `work:grade` entry, `progressContinuation` absent      | none                                                       |
      | 1     | fail with `cases.failed` 0          | 0 findings | 0 admitted                                     | "continue" | `[]`                                                                                | none                                                       |
      | 1     | indeterminate `report-missing`      | 0 findings | 0 admitted                                     | "halt"     | undefined                                                                           | `grade-indeterminate` / `work:grade:report-missing`        |
      | 1     | throws `EPERM`                      | 0 findings | 0 admitted                                     | "halt"     | undefined                                                                           | `grade-indeterminate` / `work:grade`, detail `unavailable` |
      | 3     | pass                                | 2 findings | not asked                                      | "halt"     | undefined                                                                           | `cap-exhausted` / `engine:cycle>=cap`                      |

  Scenario: crossToVerify false stops at the gate
    Given a story whose gate is clean after its drive and whose grade is `pass`
    When `settleStoryCycle` runs with `crossToVerify: false`
    Then no `verify` drive is made and the answer reports `next: "verify"` for the caller to act on
    And the answer carries the grade record the caller must put on the verify run's `brief.grade`
    And `cycles.get("03/01\0verify")` is unchanged
    And with `crossToVerify: true` the same input drives `verify` as today, narrated `Driving 03/01 — verify, cycle 1 of 3, L2.`

  Scenario Outline: the bookkeeping maps are written by the ladder exactly as the shell wrote them
    Given a story `03/01` whose ladder answers <branch>
    When `settleStoryCycle` runs
    Then `pendingGrades.get("03/01")` is <pendingGrade>
    And `reviewRounds.get("03/01")` is <round>
    And `progressStates.get("03/01")` is <progress>

    Examples:
      | branch                                     | pendingGrade      | round     | progress                                       |
      | clean gate, grade pass                     | undefined         | undefined | `{ resets: 0, attemptRun: <the drive>, summary: null }` |
      | validate findings, grade pass              | the grade record  | 1         | `{ resets: 0, attemptRun: <the drive>, summary: null }` |
      | grade fail on `own-red`, sampler continues | the grade record  | undefined | `{ resets: 0, attemptRun: <the drive>, summary: null }` |
      | sampler decides `reset`                    | the grade record  | undefined | `{ resets: 1, attemptRun: null, summary: <the reset summary> }` |

  Scenario: narration rides the parameter, not a printer of its own
    When `src/loop/cycle.mjs` and `src/loop/wave.mjs` are read
    Then neither contains `console.log`, `console.error` or `process.stdout.write`
    And `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` finds `Gate work:validate`, `Gate work:doctor` and `Gate work:grade` at the narrate seam
    And a `settleStoryCycle` run with a recording `narrate` and a `NO_PRINT` `report` prints the three `Gate ` lines through `narrate` only

  Scenario: the shell is measured smaller
    When `src/commands/loop.mjs` is line-counted before and after this story
    Then the count after is lower than the count before
    And both counts and their difference are recorded in the story's OUTCOME.md
