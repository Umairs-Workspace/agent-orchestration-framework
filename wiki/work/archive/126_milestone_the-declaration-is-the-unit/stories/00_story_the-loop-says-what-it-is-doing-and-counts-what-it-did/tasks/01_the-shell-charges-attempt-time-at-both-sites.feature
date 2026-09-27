@executable @cli @work @work-stream
Feature: The shell charges attempt time at both sites — downtime is charged to nobody, and 69/02's two-instant criterion is superseded here

  The shell consults the deadline at two sites, and neither passes the declaration's `startedAt`.
  The resume-lineage site (`src/commands/loop.mjs:1613-1621`) passes
  `retryLineageStartedAt(resolved.resume.runs, prior)` — the `retryOf` root's `createdAt` — and the
  in-process retry site (`:1676-1680`) passes `attemptSeriesStartedAt`, which defaults to the fresh
  run's own `createdAt` (`:1657`). Both become a call to task 00's lineage summer over the records
  the shell already holds, passing its `elapsedMs` to the decider, with the staleness threshold read
  from the ONE bound home the shell already reads it from — `heartbeatFromConfig(ctx.workspace)`,
  the same value it hands `transitionStaleRunsReclaimed` at `:1284`.

  THE RECORDS COME FROM ONE WALK, AND IT MOVES INTO THE ENGINE. `retryLineageStartedAt` (`:674-685`)
  walks `retryOf` to the root today and returns one instant. Task 00 lands that walk as the engine's
  `retryLineage`, returning the visited RECORDS oldest first and terminating on a broken or cyclic
  `retryOf` exactly where this one does — because 126/02's declaration predicate needs the same
  lineage and, living in the engine, cannot import a command module. This story ADOPTS it: the shell
  calls the engine's walk at both sites and keeps none of its own. The in-process site has no walk
  today — it carries a single instant forward — so it calls the same one function over the item's
  runs as they stand at that moment, which is what lets it charge the attempts this invocation has
  already driven. A second traversal authored beside it is the defect, not the fix.

  The superseded criterion is a CALL SHAPE, and it lives in code. `69/02`'s task 01 is exercised
  with `{startedAt, now, ceilingMs}` at `test/work/four-deadlines.test.mjs:123-141`, and its lineage
  fixture at `:142-181` halts today only because the root's `createdAt` is subtracted from `now` —
  that fixture's one attempt ran 50 ms under a 100 ms ceiling, so under this contract it ADMITS and
  drives. BOTH tests flip, and both are in this story's write set: the second is an expected
  supersession, not a regression, and the row that preserves its claim is the third row of the first
  outline below. The delivered `.feature` is not touched — and does not need to be: its own words
  are "elapsed total across attempts", which is what this contract makes literally true. Both of its
  observable claims survive: 99 ms under a 100 ms ceiling admits, 100 ms halts `deadline-exhausted`
  with `preserved-for-triage`.

  AN INJECTED `now` MAKES AN IN-INVOCATION ATTEMPT COST 0, and that is a property of the fixture
  rather than of the clock: `drivePhase` passes `input.now` to `transitionRunStart` and `settleDriven`
  passes it to `transitionRunComplete`, so a run minted and settled inside one invocation has
  `createdAt === updatedAt`. Every figure below is therefore the PRIOR lineage's, which is exactly
  what makes "the eleven hours are not charged" observable.

  THE THRESHOLD IS OPTIONAL IN THE ENGINE AND OBLIGATORY HERE. `stalenessMs` is an optional input to
  the summer, because the same arithmetic answers a render's "how long has this been going" without
  one (task 00). A BUDGET site that omits it therefore gets a well-formed number that charges a dead
  runtime to `now` — the original defect, silently restored, with nothing red. Both sites pass it,
  and that is asserted structurally rather than left to the driven figures, because between the lid
  closing and the sweep there is no fixture instant at which the two readings differ for a record
  the sweep has already settled.

  What would quietly undo this: one shell site re-pointed and the other left subtracting instants;
  either site calling the summer without `stalenessMs`; a resume that reclaims a stale run and then
  sums the reclaim stamp; a site that resolves the staleness threshold itself instead of reading the
  one bound home; and a fresh declaration per reboot, which resets the total budget and makes a
  bounded loop unbounded (`SPEC §Scope` refuses it by name).

  ADR-001 §3, §4, §6, AMENDED. 69/ADR-002. FF-12601.

  Scenario Outline: the resume-lineage site charges attempts, and the hours the lid was shut are charged to nobody
    Given a scope whose only lineage on disk is <lineage>
    And a `work.loop.scheduleToCloseMs` ceiling of <ceilingMs>
    When `aof work loop 03 --resume` reaches the resume-lineage deadline check with `now` = <now>
    Then the check <verdict>
    And <evidence>

    Examples: instants are on 2026-09-08 unless dated; the wall-clock span from the root's `createdAt` to `now` decides nothing
      | lineage                                                                                            | ceilingMs | now                      | verdict                    | evidence                                                                     |
      | one attempt created 10:00:00.000Z, failed `timeout` at 10:00:00.050Z                               | 100       | 10:00:00.100Z            | admits                     | a retry is minted on that lineage and the drive is spawned                   |
      | one attempt created 10:00:00.000Z, failed `timeout` at 10:00:00.099Z                               | 100       | 22:00:00.000Z            | admits                     | a retry is minted on that lineage                                            |
      | one attempt created 10:00:00.000Z, failed `timeout` at 10:00:00.100Z                               | 100       | 10:00:00.100Z            | halts `deadline-exhausted` | the report line carries `elapsedMs=100`                                      |
      | two attempts of 50 ms each, minted eleven hours apart                                              | 100       | 22:00:00.000Z            | halts `deadline-exhausted` | the report line carries `elapsedMs=100`                                      |
      | 124/00's attempt 1 — created 2026-09-07T23:32:33.272Z, beat 00:02:19.028Z, reclaimed 11:02:13.985Z | 7200000   | 2026-09-08T11:30:00.000Z | admits                     | a retry is minted, where the same records halt today on `elapsedMs=43046728` |

  Scenario: a lineage that has genuinely spent its budget still halts, and preserves what it halted on
    Given a lineage of two failed attempts of 50 milliseconds each, minted eleven hours apart, under a 100 millisecond ceiling
    When the resume-lineage deadline check runs
    Then the loop halts `deadline-exhausted` at that ref with producer `loop:schedule-to-close>=ceiling`
    And the report line carries `deadline=scheduleToClose`, `ceilingMs=100`, `elapsedMs=100` and `disposition=preserved-for-triage`
    And no retry run is minted: the failed records are still the only records on the item
    And the item's worktree is untouched

  Scenario: the in-process retry site charges the attempts it has driven, not the clock on the wall
    Given a resumed lineage whose one prior attempt ran 50 milliseconds and whose root `createdAt` is eleven hours before `now`
    And the default ceiling of 7200000 milliseconds and a cap of 3
    And a driver that fails `timeout` on every drive
    When `aof work loop 03 --resume` runs to its stop with an injected `now`
    Then the resume-lineage check admits on `elapsedMs` 50 and the in-process retry check admits on the same 50
    And three attempts exist on that lineage
    And no `deadline-exhausted` halt is reported, where today the first check halts on the eleven hours
    And the loop halts `cap-exhausted` with producer `run-store:attempts-exhausted`, reporting `attempt=3`

  Scenario: a stale running attempt is charged its liveness at the shell, not the eleven hours to `now`
    Given a scope whose only run is `running`, created 2026-09-07T23:32:33.272Z, last beat 2026-09-08T00:02:19.028Z, never reclaimed
    And a `work.loop.heartbeatMs` of 900000 and the default 7200000 millisecond ceiling
    When `aof work loop 03 --resume` runs with `now` = 2026-09-08T11:30:00.000Z
    Then the sweep reclaims that run and the resume-lineage check admits
    And the elapsed it charged is 1785756, not the 43046728 the wall clock reads
    And a retry is minted on that lineage

  Scenario Outline: the records summed are the ones the one walk visits
    Given a lineage on disk of settled attempts of 10 milliseconds each, in the shape <chain>
    And a ceiling of 1 millisecond, so the check always halts and reports what it summed
    When the resume-lineage check runs from the newest failed or reclaimed record
    Then the report line carries `elapsedMs=<elapsedMs>`
    And the walk terminates

    Examples: the walk stops where `retryLineageStartedAt` stops today, and counts each record once
      | chain                                                        | elapsedMs |
      | C → B → A, `A.retryOf` null                                  | 30        |
      | A alone, `A.retryOf` null                                    | 10        |
      | C → B → A with `B.retryOf` naming a run id no record carries | 20        |
      | C → B → A where A, B and C sit under different node folders  | 30        |
      | C → B and B → C, a `retryOf` cycle                           | 20        |

  Scenario: both shell sites pass the same shape
    Given the loop shell's source with comments stripped
    When its calls to `decideScheduleToClose` are inspected
    Then there are exactly two
    And each passes `elapsedMs` and `ceilingMs` and neither passes `startedAt` or `now`
    And each obtains that `elapsedMs` from the engine's lineage summer, over the records the engine's one lineage walk returns
    And each hands the summer a `stalenessMs`, both of them, read from `heartbeatFromConfig` and never resolved or defaulted at the call site
    And each hands it the store's `isStale`, so the staleness definition is asked for rather than restated
    And `src/commands/loop.mjs` declares no `retryOf` traversal of its own: the one walk is the engine's, and this module calls it

  Scenario: 69/02's observable claims survive the supersession
    Given the re-pointed deadline tests
    When they run
    Then 99 milliseconds under a 100 millisecond ceiling is admitted
    And 100 milliseconds halts `deadline-exhausted` with disposition `preserved-for-triage`
    And the delivered `69/02` task-01 feature file is unedited, and its criterion "a run whose elapsed total across attempts exceeds the total ceiling" is now what the code computes
