@executable @cli @work @work-stream
Feature: The clock sums attempts — a pure summer over the retryOf lineage, and a decider that takes milliseconds rather than two instants

  `decideScheduleToClose` (`src/work/loop.mjs:770-792`) computes `elapsedMs = now − startedAt`
  (`:784`) and halts `deadline-exhausted` (producer `loop:schedule-to-close>=ceiling`, `disposition:
  "preserved-for-triage"`) when that span reaches `ceilingMs`. `69/ADR-002` sizes the ceiling as
  `maxAttempts × startToClose + slack`, titles it "total across all attempts" and says it runs "from
  the moment the attempt starts" — every clause names attempts, and the two readings agree exactly
  as long as nothing pauses. Measured on 2026-09-07/08: 124/00's attempt 1 (`createdAt`
  23:32:33.272Z, `heartbeatAt` 00:02:19.028Z, `reclaimedAt` = `updatedAt` 11:02:13.985Z,
  `failureReason` `runtime_offline`) ran for 1,785,756 ms and was billed 41,380,713 ms, so a
  30-minute attempt against a 120-minute ceiling was refused forever.

  The records already hold every instant the honest reading needs: `createdAt` opens an attempt;
  `heartbeatAt` is the last moment it was observed alive (stamped by consumption, 69/ADR-003, and it
  stamps `updatedAt` with it — `src/run-store.mjs:1005`); `updatedAt` closes it — except on a
  RECLAIMED run, whose `updatedAt` is the reclaim stamp, written hours later by a sweep. `retryOf`
  chains attempts, and the shell already walks it (`retryLineageStartedAt`,
  `src/commands/loop.mjs:674-685`). Nothing new is persisted.

  FOUR SHAPES, NOT THREE (ADR-001, AMENDED). Between the lid closing and the next reclaim sweep the
  died loop's record is still `running` — on the measured failure for eleven hours — so a rule that
  ends a `running` attempt at `now` reproduces the very bill this contract deletes, under a state
  name instead of a stamp. Reclaimed and stale are the same physical fact and are charged the same:
  an attempt ends at its close (`updatedAt`) if it SETTLED, at its last observed liveness
  (`heartbeatAt ?? updatedAt`) if it is RECLAIMED or if it is non-terminal and STALE by the store's
  own `isStale` (`src/run-store.mjs:1022`, strict `>`), and at `now` only while it is non-terminal
  and FRESH. `queued` is not a fifth shape: `buildRecord` opens every run `running`
  (`src/run-store.mjs:525-545`) so the mint never produces one, and a record in that state is
  charged by the same non-terminal rule as `running`.

  THE THRESHOLD IS AN OPTIONAL INPUT, BECAUSE TWO QUESTIONS SHARE ONE ARITHMETIC HOME. "How much
  budget has this lineage consumed" must not charge a dead runtime, so the shell supplies
  `stalenessMs` — read from the ONE bound home, `heartbeatFromConfig(workspace)`
  (`src/loop-bounds.mjs`), the same value `transitionStaleRunsReclaimed` is already handed, and
  never resolved inside the engine (`69/FF-6901`). "How long has this run been going" is a
  different question: a human render (126/01) wants time since the attempt started, printed beside
  the heartbeat age that shows whether it is still alive, so it calls the term WITHOUT a threshold.
  Absent — or not a finite positive number — a non-terminal attempt is treated as alive and ends at
  `now`; supplied, a stale one ends at its last liveness. One rule, one home, one optional input.

  THE EXPORTS THIS CONTRACT ADDS, named once here because two sibling contracts import them —
  126/01 the per-attempt term, 126/02 the walk and the summer. All three live in
  `src/work/loop.mjs`, all take ONE plain object (the module's `f(input = {})` idiom), read every
  instant as an ISO-8601 Z string, and open no clock, store or file. The two clocks answer in
  MILLISECONDS rather than in a verdict — they are the arithmetic a decider consumes, not deciders
  themselves:

    retryLineage({ runs, record })  ->  a frozen array of records, oldest first
      THE ONE TRAVERSAL IN THE TREE, and it lives here rather than in the shell because the
      declaration predicate 126/02 builds is engine-resident too and cannot import a command
      module. `runs` is the scope's run records; `record` is the attempt to start from. It walks
      `retryOf` back to the root and terminates exactly where `retryLineageStartedAt`
      (`src/commands/loop.mjs:674-685`) terminates today — on a `retryOf` naming a run no record
      carries, and on a cycle — visiting each record at most once. The shell adopts it and keeps no
      second walk.

    attemptElapsedMs({ record, now, stalenessMs?, isStale? })  ->  number | null
      One record. A non-negative safe integer, or `null` when the record carries no readable
      `createdAt` or no readable end instant — a declared absence, never `NaN` and never 0.

    lineageElapsedMs({ runs, now, stalenessMs?, isStale? })    ->  number
      The summer. `runs` is a lineage's records in any order; the answer is the sum of the term
      above over them, with a `null` contribution counted as 0 and an empty lineage answering 0.

  THE STALENESS PREDICATE RIDES IN ON THE BAG. This module imports nothing
  (`acd-loop-module-import-boundary`), which is why `decideLoopProgress` is already handed
  `evaluateProgressPolicy` and `decideBuildProgress` by its caller rather than importing them. The
  store's `isStale` (`src/run-store.mjs:1022`) arrives the same way, beside `stalenessMs`: the shell
  passes the store's own predicate and 126/02 passes the same one, so the staleness definition
  presence has shared since `23/ADR-002` is REUSED and never re-derived here. The correction is
  applied only when BOTH arrive — a threshold that is a finite positive number AND a callable
  predicate; with either absent a non-terminal attempt is treated as alive and ends at `now`.

  What would quietly undo this: a summer that ends a reclaimed attempt at `updatedAt` (the same
  11-hour bill under a new name); a summer that ends a STALE `running` attempt at `now` even when
  the threshold was supplied (the same bill again, before the sweep writes the stamp down); a
  BUDGET call site that omits `stalenessMs` or the predicate and so silently gets the render's
  reading; an `age > threshold` test written inline in the engine instead of the store's own
  predicate handed in, which is a fourth home for a definition that has one; an accumulator written
  onto the declaration (a second derivation of a fact the records carry, and the one that goes stale
  when a record is repaired by hand); a decider that keeps accepting `{startedAt, now}` beside
  `{elapsedMs}` so the old arithmetic survives on one branch; a `stalenessMs` resolved inside the
  engine instead of passed in; and a second `retryOf` traversal authored beside the one this
  contract moves into the engine.

  The declaration's key count is pinned here at EIGHT, which is what it is when this story lands.
  126/02 appends a ninth (`supervised`) by the same additive-supersession discipline 102/00 used for
  the eighth, and supersedes that line in its own contract — an expected succession, not a
  regression.

  ADR-001 §1-§3, §5, AMENDED. FF-12601.

  Scenario: a reclaimed attempt ends at its last heartbeat, never at its reclaim stamp
    Given the run record of 124/00's first attempt, created 2026-09-07T23:32:33.272Z, last heartbeat 2026-09-08T00:02:19.028Z, reclaimed and updated 2026-09-08T11:02:13.985Z
    When the lineage summer is given that one record, the store's `isStale`, a `stalenessMs` of 900000 and a `now` after the reclaim
    Then it returns 1785756 milliseconds
    And the wall-clock span from `createdAt` to `updatedAt` on the same record is 41380713 milliseconds
    And the summer's answer is the first figure and not the second
    And the same record as it stood at 2026-09-08T11:00:00.000Z — `state` `running`, `reclaimedAt` null, `heartbeatAt` and `updatedAt` both 00:02:19.028Z — sums to 1785756 too, where `now` minus its `createdAt` at that instant is 41246728
    And the `brief.loop.startedAt` that record carries, 2026-09-07T23:32:31.685Z, is not read: the same record stripped of its declaration returns 1785756 too

  Scenario Outline: an attempt ends where its own record says it ended
    Given one run record dated 2026-09-08 whose state is <state>, createdAt <createdAt>, heartbeatAt <heartbeatAt>, updatedAt <updatedAt> and reclaimedAt <reclaimedAt>
    When the summer is given that lineage, an injected `now` of 12:00:00.000, the store's `isStale` and a `stalenessMs` of <stalenessMs>
    Then it returns <ms> milliseconds
    And the answer is neither negative nor NaN

    Examples: settled — the close is the end, whatever the record beat, and the threshold is inert
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | done      | 10:00:00.000 | 10:00:10.000 | 10:00:20.000 | null         | 900000      | 20000   |
      | failed    | 10:00:00.000 | null         | 10:00:20.000 | null         | 900000      | 20000   |
      | cancelled | 10:00:00.000 | null         | 10:00:05.000 | null         | 900000      | 5000    |
      | done      | 10:00:00.000 | 10:00:10.000 | 10:00:20.000 | null         | absent      | 20000   |

    Examples: reclaimed — the last liveness is the end, the reclaim stamp is never read, and the threshold is inert
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | failed    | 10:00:00.000 | 10:00:30.000 | 11:00:00.000 | 11:00:00.000 | 900000      | 30000   |
      | failed    | 10:00:00.000 | null         | 11:00:00.000 | 11:00:00.000 | 900000      | 3600000 |
      | failed    | 10:00:00.000 | 10:00:30.000 | 11:00:00.000 | 11:00:00.000 | absent      | 30000   |

    Examples: non-terminal and STALE — the shape the amendment adds, charged like a reclaim
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | 900000      | 1800000 |
      | running   | 10:00:00.000 | 11:44:59.999 | 11:44:59.999 | null         | 900000      | 6299999 |
      | running   | 10:00:00.000 | null         | 10:00:00.000 | null         | 900000      | 0       |
      | queued    | 10:00:00.000 | null         | 10:00:00.000 | null         | 900000      | 0       |

    Examples: THE THRESHOLD IS WHAT TELLS THE TWO QUESTIONS APART — one record, two honest answers
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | 900000      | 1800000 |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | absent      | 7200000 |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | null        | 7200000 |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | 0           | 7200000 |
      | running   | 10:00:00.000 | 10:30:00.000 | 10:30:00.000 | null         | `"900000"`  | 7200000 |

    Examples: non-terminal and FRESH — it ends at `now` either way; `isStale` is strict `>`
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | running   | 10:00:00.000 | 11:59:00.000 | 11:59:00.000 | null         | 900000      | 7200000 |
      | running   | 10:00:00.000 | 11:45:00.000 | 11:45:00.000 | null         | 900000      | 7200000 |
      | running   | 12:00:00.000 | null         | 12:00:00.000 | null         | 900000      | 0       |
      | running   | 12:00:01.000 | null         | 12:00:01.000 | null         | 900000      | 0       |

    Examples: an instant the record does not carry contributes nothing, and never NaN
      | state     | createdAt    | heartbeatAt  | updatedAt    | reclaimedAt  | stalenessMs | ms      |
      | running   | absent       | null         | absent       | null         | 900000      | 0       |
      | done      | 10:00:00.000 | null         | absent       | null         | 900000      | 0       |

  Scenario: the staleness definition is the store's, handed in — the engine holds none of its own
    Given a `running` record created 10:00:00.000, last beat 10:30:00.000, and a `now` of 12:00:00.000
    When the summer is given a `stalenessMs` of 900000 and the store's `isStale`
    Then it returns 1800000 milliseconds, and the predicate it was handed was called with that record, the parsed `now` and that threshold — the store's own `(run, nowMs, stalenessThreshold)` shape
    When the summer is given the same 900000 and no `isStale` at all
    Then it returns 7200000 milliseconds, because with no predicate to ask there is no stale attempt
    And the engine's source, comments stripped, compares no age against a threshold: it computes the liveness INSTANT a reclaimed or stale attempt ends at, and asks the handed-in predicate for the VERDICT
    And `src/work/loop.mjs` imports nothing, exactly as it does today

  Scenario: the retryOf walk has one home, and it is the engine
    Given the scope's run records and one attempt to start from
    When `retryLineage` is called
    Then it returns that attempt and every earlier attempt its `retryOf` chain reaches, oldest first
    And each record appears at most once, whatever the chain does
    And a `retryOf` naming a run no record carries ends the walk there, as the shell's walk ends there today
    And a `retryOf` cycle ends the walk rather than spinning, as the shell's walk does today
    And `src/commands/loop.mjs`, with comments stripped, declares no `retryOf` traversal of its own

  Scenario Outline: the per-attempt term answers for ONE record, and says so when it cannot
    Given one run record dated 2026-09-08 whose state is <state>, createdAt <createdAt>, heartbeatAt <heartbeatAt>, updatedAt <updatedAt> and reclaimedAt <reclaimedAt>
    When `attemptElapsedMs` is called with that record and a `now` of <now>, and no `stalenessMs`
    Then it returns <ms>
    And the same call with a `stalenessMs` of 900000 and the store's `isStale` returns <staleMs>

    Examples: the rows 126/01's render pins, answered by this term and not re-derived there
      | state   | createdAt                | heartbeatAt   | updatedAt     | reclaimedAt   | now           | ms      | staleMs |
      | failed  | 2026-09-07T23:32:33.272Z | 00:02:19.028Z | 11:02:13.985Z | 11:02:13.985Z | 12:00:00.000Z | 1785756 | 1785756 |
      | failed  | 10:00:00.000Z            | null          | 11:00:00.000Z | 11:00:00.000Z | 12:00:00.000Z | 3600000 | 3600000 |
      | done    | 10:00:00.000Z            | 10:12:00.000Z | 10:18:00.000Z | null          | 12:00:00.000Z | 1080000 | 1080000 |
      | running | 10:00:00.000Z            | 10:10:00.000Z | 10:10:00.000Z | null          | 10:25:00.000Z | 1500000 | 1500000 |
      | running | 10:00:00.000Z            | 10:10:00.000Z | 10:10:00.000Z | null          | 10:40:00.000Z | 2400000 | 600000  |
      | running | 10:00:00.000Z            | null          | 10:00:00.000Z | null          | 10:25:00.000Z | 1500000 | 0       |
      | running | absent                   | null          | absent        | null          | 12:00:00.000Z | null    | null    |

  Scenario: the four attempt shapes compose into one total
    Given a lineage of four records chained by `retryOf`: one reclaimed, one settled `done`, one `running` and stale, one `running` and fresh
    When the summer is given the four records, an injected `now`, a `stalenessMs` and the store's `isStale`
    Then the reclaimed attempt contributes its last heartbeat minus its `createdAt`
    And the settled attempt contributes its `updatedAt` minus its `createdAt`
    And the stale running attempt contributes its last heartbeat minus its `createdAt`
    And the fresh running attempt contributes `now` minus its `createdAt`
    And the returned total is the sum of exactly those four contributions
    And the same four records without a `stalenessMs` return a larger total, differing by exactly the stale attempt's downtime
    And a lineage of no records returns 0
    And the summer is order-blind: the same four records shuffled return the same total

  Scenario Outline: the decider answers over milliseconds
    Given a ceiling of <ceilingMs> milliseconds
    When `decideScheduleToClose` is called with `elapsedMs` <elapsedMs>
    Then the answer is <verdict>

    Examples: the boundary is `>=`, and 0 is a value rather than an absence
      | elapsedMs | ceilingMs | verdict  |
      | 0         | 100       | admitted |
      | 1         | 100       | admitted |
      | 99        | 100       | admitted |
      | 100       | 100       | the halt |
      | 101       | 100       | the halt |
      | 0         | 7200000   | admitted |
      | 1785756   | 7200000   | admitted |
      | 7199999   | 7200000   | admitted |
      | 7200000   | 7200000   | the halt |
      | 41380713  | 7200000   | the halt |

  Scenario: both answers keep the shapes they have today
    Given a ceiling of 100 milliseconds
    When the decider is called with `elapsedMs` 99
    Then the answer carries `admitted` true, `ceilingMs` 100 and `elapsedMs` 99, and no other key
    When the decider is called with `elapsedMs` 100
    Then the halt is `deadline-exhausted` with producer `loop:schedule-to-close>=ceiling`, deadline `scheduleToClose`, `ceilingMs` 100, `elapsedMs` 100 and disposition `preserved-for-triage`

  Scenario Outline: an input that is not two numbers is refused — never admitted, never halted
    When `decideScheduleToClose` is called with <input>
    Then the answer is the refusal `loop-bound-unresolved` for field `scheduleToCloseMs`
    And its `resolution` names <resolution>

    Examples: the elapsed half — the two-instant form is refused here rather than accepted on a branch
      | input                                 | resolution                                           |
      | `{ startedAt, now, ceilingMs: 100 }`  | `elapsedMs`, and names neither `startedAt` nor `now` |
      | `{ ceilingMs: 100 }`                  | `elapsedMs`                                          |
      | `{ elapsedMs: -1, ceilingMs: 100 }`   | `elapsedMs`                                          |
      | `{ elapsedMs: 1.5, ceilingMs: 100 }`  | `elapsedMs`                                          |
      | `{ elapsedMs: "99", ceilingMs: 100 }` | `elapsedMs`                                          |

    Examples: the ceiling half — unchanged, and still decided FIRST
      | input                                 | resolution                    |
      | `{ elapsedMs: 99, ceilingMs: 0 }`     | `work.loop.scheduleToCloseMs` |
      | `{ elapsedMs: 99, ceilingMs: null }`  | `work.loop.scheduleToCloseMs` |
      | `{ elapsedMs: 99, ceilingMs: "100" }` | `work.loop.scheduleToCloseMs` |
      | `{ elapsedMs: -1, ceilingMs: 0 }`     | `work.loop.scheduleToCloseMs` |

  Scenario Outline: the measured lineages — the summer admits what the wall clock refuses
    Given <lineage>, whose records are those in 124/00's own run folder
    And a `stalenessMs` of 900000, the store's `isStale` and an injected `now` of <now>
    When the summer is given those records
    Then it returns <attemptMs> milliseconds
    And the reading the two shell sites produced before this change — `now` minus the lineage root's `createdAt` — is <priorMs>
    And against the 7200000 millisecond ceiling the decider <verdict> on <attemptMs> and <priorVerdict> on <priorMs>

    Examples: three lineages on disk and the downtime variant of the first, all at 7200000
      | lineage                                                                              | now                      | attemptMs | priorMs  | verdict                    | priorVerdict |
      | `-0000` alone — one reclaimed attempt whose `retryOf` is null                         | 2026-09-08T11:30:00.000Z | 1785756   | 43046728 | admits, leaving 5414244 ms | halts        |
      | `-0000` as it stood at 11:00Z — `state` `running`, `reclaimedAt` null, not yet swept  | 2026-09-08T11:00:00.000Z | 1785756   | 41246728 | admits, leaving 5414244 ms | halts        |
      | `-0001` → `-0002` → `-0003` — three settled attempts, none reclaimed                  | 2026-09-08T13:10:00.000Z | 4101267   | 4220552  | admits, leaving 3098733 ms | admits       |
      | `-0005` → `-0006` → `-0007` — three attempts, the middle reclaimed                    | 2026-09-08T15:40:00.000Z | 3180481   | 7639935  | admits, leaving 4019519 ms | halts        |

  Scenario: the cost ADR-001 §6 names, measured on the one lineage where nothing went down
    Given the lineage `-0001` → `-0002` → `-0003` from 124/00's own run folder
    When the summer is given its records
    Then it returns 4101267 milliseconds
    And the span from the root's `createdAt` to the last record's `updatedAt` is 4104442 milliseconds
    And the difference — the inter-attempt latency this contract no longer charges — is 3175 milliseconds
    And both readings admit against the 7200000 millisecond ceiling, so the widening costs no verdict here

  Scenario: nothing new is persisted
    Given a run minted through the store and a declaration built through the engine
    When their keys are listed
    Then the run record has exactly the sixteen keys it has today
    And the declaration has exactly the eight keys `buildLoopDeclaration` returns today, in the same order, ending `id`
    And no key of either names an accumulated or elapsed duration
