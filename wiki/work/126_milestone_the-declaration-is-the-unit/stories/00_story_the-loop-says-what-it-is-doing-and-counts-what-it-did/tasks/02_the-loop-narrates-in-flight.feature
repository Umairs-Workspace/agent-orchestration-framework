@executable @cli @work @work-stream
Feature: The loop narrates in flight — a narrate seam derived from the one printer, an act line before every drive, and the three existing in-flight lines moved onto it

  `reportLine` (`src/commands/loop.mjs:982-993`) replays `state.driven` and prints the state line,
  and all nineteen of its call sites are terminal returns — a loop that drives for hours prints
  nothing until it stops. Three in-flight lines already exist and prove the seam works: the two
  gate-ladder lines (`:243`, `:251`) and the grade rung (`:1873`). The seam is the injected `report`
  (`:1233`, defaulting to `NO_PRINT` at `:102`); the one `console.log` is the launcher's printer
  (`:2076`), licensed as a `cli.launch` body in the PRINTERS roster
  (`test/arch/command/acd-console-log-confined.test.mjs:32-64`, ceiling 12 at `:71`). The missing
  line is at `drivePhase` (`:1027-1058`), where the run is minted and the multi-hour PTY wait
  begins, and every fact it needs is in scope at its call site: `act.ref`, `act.phase`, the shell's
  `cycle`, `resolved.cap`, `resolved.level`.

  THE CLASSIFICATION IS BY ROLE, NOT BY CALL SITE (ADR-002, AMENDED). An ACCOUNT line is what an
  invocation returns to the operator; an IN-FLIGHT line is one printed while a drive or a gate is
  still pending. The call-site proxy — "every `reportLine` site is the account, everything else is
  in flight" — fails on its own list twice: `runL1` calls no `reportLine` at all and prints its row
  lines directly (`:1023`, entered at `:1425`), and those rows are the ENTIRE output of an L1
  invocation; and `Nothing to resume in <scope> …` (`:1276`) is an account line that the proxy never
  reaches. So the accounts are the nineteen `reportLine` sites PLUS the L1 row lines PLUS
  `Nothing to resume`, all staying on `report`; the in-flight lines are the two gate rungs, the
  grade rung and the four this contract adds, all going on `narrate`. The existing lines that move
  number THREE.

  EVERY DRIVE ANNOUNCES ITSELF, ONCE, BEFORE IT RUNS. A drive through the main site (`:1656`) —
  first attempt or resumed lineage — is announced by `Driving`; a drive through the in-process retry
  site (`:1691`) is announced by `Retrying`, which carries the same ref and phase plus the attempt
  and the reason, so no drive is silent and none is announced twice. `Resumed` and `Reclaimed` are
  lineage facts and ride beside the act line rather than replacing it.

  AND THEY ARE PRINTED WHERE THE FACT IS TRUE. `Retrying` and `Resumed` go AFTER the store admits
  the mint and before the drive they describe — never before `transitionRunStart`, which is what
  keeps a refused retry (`agent_error` → `not-retryable`, `session_limit` → `retry-parked`,
  `attempt > cap` → `attempts-exhausted`) from announcing a retry that never happened.

  What would quietly undo this: a second `console.log` for progress (the ratchet forbids it, and
  one injected function already reaches stdout); an in-flight line routed through `report` so that
  `--quiet` cannot silence it; an ACCOUNT line routed through `narrate`, which is how `--level L1`
  loses its whole output; a `narrate` that is a second parameter rather than derived from `report`,
  so a caller injecting one collector misses half the lines; a retry line printed before the store
  has admitted the retry; and a line that spells a stop or a phase in a second vocabulary.

  ADR-002 §1-§3, AMENDED. 53/ADR-016. FF-12602.

  Scenario: the act line arrives before the drive, not after it
    Given a loop fixture with a collecting `report` over a ready story at cycle 1 of cap 3, level L2
    When the loop drives it
    Then the collector's first line is `Driving 03/01 — continue, cycle 1 of 3, L2.`
    And it precedes every `Driven 03/01 …` row
    And every `Driven …` row falls inside the contiguous block the terminal account prints last
    And that terminal account is exactly what it is today

  Scenario Outline: every drive of an invocation announces itself with its own facts
    Given <fixture> with a collecting `report`
    When the invocation runs to its stop
    Then the collector holds, in order, <lines>
    And each of them precedes the first `Driven …` row
    And the ref each line names is the ref of the run that drive mints

    Examples: one line per drive, and no line where there is no drive
      | fixture                                                       | lines                                                                                   |
      | a story whose gate stays red, at cap 3                        | `Driving 03/01 — continue, cycle 1 of 3, L2.`, then the same at cycle 2, then at cycle 3 |
      | a story that closes, driving continue then verify at cap 3    | `Driving 03/01 — continue, cycle 1 of 3, L2.` then `Driving 03/01 — verify, cycle 1 of 3, L2.` |
      | a milestone whose stories are done, at cap 3                  | `Driving 03 — verify, cycle 1 of 3, L2.`                                                |
      | the same story driven with `--level L1`                       | no `Driving` line at all — L1 drives nothing                                            |
      | a scope that halts `dependency-blocked` before any drive      | no `Driving` line at all                                                                |
      | a scope that halts `uat-gate` on a `@uat` task after verify   | exactly two `Driving` lines, one per drive that ran                                     |

  Scenario Outline: a retry, a resume and a reclaim each say so once, in the module's own idiom
    Given <situation>
    When the invocation runs
    Then the collector receives exactly one <line>
    And it arrives before the drive it describes, and before any `Driven …` row

    Examples: facts the shell already holds, and no second spelling of a stop
      | situation                                                                          | line                                                                             |
      | `--resume` over a run stale past the heartbeat threshold, settled by the sweep      | `Reclaimed 03/01 — run <runId> (runtime_offline).`, naming the run the sweep settled |
      | that reclaimed lineage retried at the resume-lineage site, cap 3                    | `Resumed 03/01 — attempt 2 of 3 on run <runId>.`, naming the retry run the drive uses |
      | a drive that fails `timeout` and is retried in process, cap 3                       | `Retrying 03/01 — continue, attempt 2 of 3 (timeout).`                            |
      | that retry failing `timeout` again and retried once more                            | `Retrying 03/01 — continue, attempt 3 of 3 (timeout).`                            |
      | a drive that fails `agent_error`, which the store refuses to retry                  | no `Retrying` line at all — the loop halts `run-not-retryable`                    |
      | a drive that fails `session_limit` before its `resumeAfter`                         | no `Retrying` line at all — the loop halts `retry-parked`                         |
      | a third `timeout` at cap 3, where the store refuses a fourth attempt                | no fourth `Retrying` line — the loop halts `cap-exhausted`                        |
      | `--resume` over two items each carrying one stale run                               | one `Reclaimed` line per run, two in all                                         |

  Scenario Outline: the three in-flight lines that exist today reach the same collector
    Given a fixture in which <site> runs, with a collecting `report`
    When the invocation runs
    Then the collector receives <line>
    And it arrives through the narrate seam, not through the terminal account

    Examples: the lines that already prove the seam works, moved without changing a byte of their text
      | site                                   | line                                                         |
      | the gate ladder's first rung           | `Gate work:validate 03/01 — 0 finding(s).`                   |
      | the gate ladder's second rung          | `Gate work:doctor 03/01 — N admitted finding(s).`            |
      | the grade rung, with a rubric declared | `Gate work:grade 03/01 — <verdict>, N of M case(s) failing.` |

  Scenario Outline: the account lines that are not `reportLine` sites stay on the account seam
    Given a fixture in which <site> runs, with a collecting `report`
    When the invocation runs
    Then the collector receives <line>
    And it arrives through the terminal account seam, not through narrate

    Examples: the two the call-site proxy missed — an L1 invocation's whole output, and a resume with nothing to resume
      | site                                | line                                                                |
      | the L1 row line, under `--level L1` | one `<ref> — <act> <phase>` row per item the walk offers             |
      | `--resume` with no prior run        | `Nothing to resume in 03 — no run carries a loop declaration.`       |

  Scenario: the seam is derived, the printer is one, and the roster does not grow
    Given the loop shell's source with comments stripped, and the PRINTERS roster
    When both are inspected
    Then `src/commands/loop.mjs` contains exactly one `console.log`, the launcher's injected printer
    And the roster has no new row and its ceiling is still 12
    And every `reportLine` call site is on `report`, all nineteen of them
    And the L1 row line and the `Nothing to resume` line are on `report` too
    And every in-flight line is on `narrate` — the two gate rungs, the grade rung, and the four this contract adds
    And `narrate` is derived from `report` rather than injected beside it: a caller that injects one collector receives both classes of line
