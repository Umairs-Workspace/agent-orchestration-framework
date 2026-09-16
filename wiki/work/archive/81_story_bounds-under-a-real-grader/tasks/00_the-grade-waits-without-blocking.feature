@executable @cli @work @work-stream
Feature: The grade waits without blocking, and can never outlast the window that supervises it

  **THE HEADLINE, AND THE ADR-LEVEL CHOICE 54 WAS BARRED FROM TAKING.** `commands/grade.mjs` spawns
  the declared rubric with `spawnSync`, and `work:grade` is rung 3 of `GATE_ORDER` — so for the whole
  time a rubric runs, the process that is running the loop is *stopped*. `69/ADR-002`'s `heartbeat`
  window is 15 minutes and its stated terminal behaviour is *"kill the attempt and retry it"*, so a
  healthy grade that outlasts the window is reaped as a stranded run.

  Measured at 54's accept (2026-08-23, **F-54-VERIFY-3**): this repository's declared rubric runs in
  **116 s / 118 s** against **900 s** — a **7.8×** margin, ~13% of the window. The fault is therefore
  **latent here, not absent**, and reinstates in full on this repository as its tier grows or on any
  consumer repository with a slower suite. Routed 54/01 → 54/02 → 54/03 and refused three times,
  because `54/ADR-009 §1` forbids milestone 54 choosing a bound at all.

  **THE SHAPE THIS TASK DECIDES, AND THE READING IT REFUSES.** The discharge condition offered two
  limbs — *"an async spawn that heartbeats while the runner works"* or *"a grade deadline resolved
  under the heartbeat window"*. The first limb's gloss is **rejected on `69/ADR-003`**: the heartbeat
  is stamped by **CONSUMPTION**, and *"the producer is a hook, not a pinger"*. A grade that stamped a
  heartbeat while it waited would be precisely that pinger — it would defeat the liveness signal
  instead of satisfying it, because a grade is progress-free from the attempt's point of view. So:

  **(1) The spawn stops blocking the event loop, and produces no heartbeat of its own.** What limb
  one is actually worth is *liveness of the process*, not a beat: with the loop turning, `SIGINT`
  reaches `onSigint` (`src/commands/loop.mjs:1220-1222`) and becomes an `operator-interrupt` halt,
  queued timers fire, and every other run's heartbeat consumption keeps draining. Today none of that
  happens until the child exits.

  **(2) The deadline resolves UNDER the window that supervises it, and no value is invented.**
  The grade's deadline is derived — `min(startToCloseMs, heartbeatMs)` — from two numbers `69`
  already chose, in `69/ADR-001`'s single home `src/loop-bounds.mjs`. **No new config key, no new
  default, no new resolution site**, so `LOOP_BOUND_CONFIG_KEYS`, `LOOP_BOUND_VALUE_RESOLVERS` and the
  tuner's range probe are all untouched and `compoundStepRefusal` is not provoked. Today the grade
  resolves `startToClose` (30 min) — **twice the window it must survive** — which is the second half
  of the fault and is invisible from the 7.8× margin.

  **THE COST, NAMED.** A consumer repository whose declared rubric legitimately exceeds `heartbeatMs`
  now gets `runner-timeout` → `indeterminate` → the `grade-indeterminate` stop: a **named, legible
  halt** carrying the deadline it exceeded, instead of a silent reap-and-retry. The remedy is one
  existing key — `work.loop.heartbeatMs` — not a grade-specific knob. That is the trade this task
  takes deliberately: a slow suite is refused loudly rather than killed quietly.

  **WHAT DOES NOT MOVE.** `src/work-grade.mjs` is not edited — the pure compiler, the frozen nine
  `GRADE_CODES` (`runner-timeout` is already one of them; no tenth is coined), `GRADE_VERDICTS` and
  `GradeRecord`'s exact key set are all untouched, so FF-5402 and FF-5403 stay green unchanged.
  `rubricSpawnOptions` stays pure, exported and the thing the spawn is actually built from, because
  `acd-grade-bounded-single-spawn` asserts the guards through it without a live binary.

  `54/ADR-003 §2`; `54/ADR-009 §1`; `69/ADR-001`; `69/ADR-002`; `69/ADR-003`; `53/ADR-009 §1`;
  F-54-VERIFY-3.

  Scenario: the loop stays responsive for as long as the runner works
    Given a repository with a declared rubric
    And a runner that has started and has not yet finished
    When the loop is running its grade rung
    Then the process observes an operator interrupt while the runner is still working
    And the loop halts on `operator-interrupt` naming the item it was grading
    And it does not wait for the runner to finish before observing it

  Scenario: a timer scheduled before the grade fires while the grade is still waiting
    Given a repository with a declared rubric
    And a callback scheduled to fire sooner than the runner will finish
    When the loop takes the grade
    Then that callback has fired by the time the grade returns
    And it fired before the runner exited

  Scenario Outline: the deadline is derived from the two bounds and never exceeds the liveness window
    Given a workspace whose `work.loop.startToCloseMs` resolves to <startToClose>
    And whose `work.loop.heartbeatMs` resolves to <heartbeat>
    When the grade builds its plan
    Then the plan's deadline is <deadline>
    And the deadline is the value the spawn is given

    Examples:
      | startToClose | heartbeat | deadline |
      | 1800000      | 900000    | 900000   |
      | 900000       | 1800000   | 900000   |
      | 600000       | 900000    | 600000   |
      | 900000       | 900000    | 900000   |

  Scenario: the deadline resolves through 69's one home, and the grade path declares none of its own
    Given the grade path is read as source
    Then it resolves its deadline through `src/loop-bounds.mjs`
    And it hard-codes no timeout value
    And it does not read `work.loop.startToCloseMs` or `work.loop.heartbeatMs` behind their resolvers
    And the guard that pinned the old resolver by name now pins the new one
    And no new `work.loop.*` key is declared, so the tuner's declared ranges are unchanged

  Scenario: a runner that outlasts the derived deadline is killed and graded, not reaped
    Given a repository with a declared rubric
    And a runner that will not finish within the derived deadline
    When the loop takes the grade
    Then the runner is force-killed
    And the grade's verdict is `indeterminate` carrying the code `runner-timeout`
    And the loop halts on `grade-indeterminate` naming `work:grade:runner-timeout` as the producer
    And the reported detail names the deadline the runner exceeded
    And no run is left in a `running` state to be reclaimed as stranded

  Scenario Outline: the guards the blocking spawn used to give for free still hold on the async one
    Given a repository with a declared rubric
    When the loop takes the grade
    Then <guarantee>

    Examples:
      | guarantee                                                                          |
      | no shell interprets the declared argv, and each element reaches the child verbatim  |
      | a runner that reads standard input observes end-of-input rather than blocking       |
      | both standard output and standard error are captured                                |
      | output beyond the capture ceiling is discarded rather than graded                   |
      | the re-entrancy stamp is set in the child's environment                             |
      | exactly one `--run` performs exactly one launch                                     |

  Scenario: exactly one module still spawns the declared rubric, and the pure leaf still spawns nothing
    Given every module under `src/**` is read as source
    Then exactly one of them spawns the declared rubric argv
    And that module is the registered grade command
    And `src/work-grade.mjs` imports no child-process facility and reads no clock
    And the read face still launches nothing without `--run`

  Scenario: a repository that declares no rubric is unchanged, byte for byte
    Given a repository that declares no `work.rubric`
    When the loop reaches its grade rung
    Then nothing is launched and no deadline is resolved for a runner
    And the grade reports `indeterminate` with the code `rubric-unconfigured`
    And the loop proceeds exactly as it does today
