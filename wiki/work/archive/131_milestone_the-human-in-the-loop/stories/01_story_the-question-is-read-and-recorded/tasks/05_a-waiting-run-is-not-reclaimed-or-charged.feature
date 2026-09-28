@executable @cli @work @work-stream
Feature: a run waiting on a human is not reclaimed as stale, and the wait is charged to no attempt

  ADR-003 §3-§4 and ADR-001 §4. The stale-run scan skips a `running` run whose LAST ask has
  `answeredAt == null`. A question waiting on a human is not an orphan, and every reclaim path
  inherits the skip because they all select through the store's one scan, `staleRunningRuns`:
  `transitionStaleRunsReclaimed`, `reclaimStaleRuns`, `work:run-start`, `work:resume` and the
  loop. The owner still beats a waiting run, so this is the backstop for a parked one, which no
  one beats. `attemptElapsedMs` (`src/work/loop.mjs`, pure, zero imports) subtracts each ask's
  interval, from `askedAt` to `answeredAt ?? parkedAt ?? now`. An answered question therefore
  never exhausts its lineage's budget on the next retry. The charge is derived from the instants,
  and never stored.

  RULINGS (PO, 2026-09-23). (1) The skip reads only the last entry of `asks`. A run whose last ask
  is answered is scanned exactly as today. (2) Each interval is clipped to the attempt's own
  window, `[createdAt, end]`, where `end` is what `attemptEndMs` answers today. Overlapping
  intervals are merged before they are subtracted, so an interval is never subtracted twice. An
  entry with an unparseable `askedAt` is ignored. (3) The result is never negative, and a record
  with no `asks`, or with `asks: []`, answers exactly what it answers today. (4) `src/work/loop.mjs`
  stays zero-import. The subtraction is written there, over the record it is handed.

  RULINGS (QA, 2026-09-23). (1) The skip needs a last entry that is a plain object with
  `answeredAt == null`. A last entry that is not an object, such as `null`, does not exempt the run,
  so a corrupt entry can never make an orphan unreclaimable. (2) An entry whose chosen end
  (`answeredAt ?? parkedAt ?? now`) does not parse is ignored, as an unparseable `askedAt` is. An
  interval that ends before it starts, or lies wholly outside the window, subtracts nothing.

  Background:
    Given a fixture item with a run `R` created at `2026-09-23T10:00:00.000Z`, and a staleness threshold of 5 minutes

  Scenario Outline: the scan skips a run waiting on an unanswered ask, and only that run
    Given `R` is `running`, its last heartbeat was at `2026-09-23T10:01:00.000Z`, and its `asks` is <asks>
    When `staleRunningRuns([item], { now: "2026-09-23T14:00:00.000Z", stalenessThreshold: 300000 })` is awaited
    Then `R` <selected>

    Examples:
      | asks                                        | selected           |
      | `[]`                                        | is selected        |
      | one entry, open                             | is not selected    |
      | one entry, parked and unanswered            | is not selected    |
      | one entry, answered                         | is selected        |
      | an answered entry, then an open entry       | is not selected    |
      | absent (a sixteen-key record)               | is selected        |
      | `"x"` (read forward as `[]`)                | is selected        |
      | `[null]`                                    | is selected        |
      | an open entry, then an answered entry       | is selected        |
      | two answered entries                        | is selected        |
      | an answered entry, then a parked, unanswered entry | is not selected |

  Scenario Outline: the skip adds nothing to what a live or settled run already answers
    Given `R` is <state>, and its `asks` is one open entry
    When `staleRunningRuns([item], { now: "2026-09-23T14:00:00.000Z", stalenessThreshold: 300000 })` is awaited
    Then `R` is not selected

    Examples:
      | state                                               |
      | `running`, last beat at `2026-09-23T13:58:00.000Z`  |
      | settled `done`                                      |
      | settled `failed` / `runtime_offline`                |

  Scenario: a reclaim sweep leaves a waiting run byte-unchanged
    Given `R` is `running` with an open ask, and its last heartbeat was at `2026-09-23T10:01:00.000Z`, so the `answerRunAsk` below does not refresh its liveness
    When `transitionStaleRunsReclaimed([item], { now: "2026-09-23T14:00:00.000Z", stalenessThreshold: 300000 })` is awaited
    Then it answers `[]`, and `R`'s record on disk is byte-unchanged
    And after `answerRunAsk` answers the ask, the same sweep reclaims `R` as `failed` / `runtime_offline`

  Scenario Outline: every sweep inherits the skip
    Given `R` is stale and `running`, and its last ask is <ask>
    When <sweep> is awaited with `now: "2026-09-23T14:00:00.000Z"` and `stalenessThreshold: 300000`
    Then it reclaims nothing, and `R`'s record on disk is byte-unchanged

    Examples:
      | ask                    | sweep                                    |
      | open                   | `reclaimStaleRuns([item], …)`            |
      | parked and unanswered  | `reclaimStaleRuns([item], …)`            |
      | parked and unanswered  | `transitionStaleRunsReclaimed([item], …)` |

  Scenario: a three-hour answered wait is charged to nobody
    Given `R` settled `done` at `2026-09-23T13:30:00.000Z`, with one ask from `2026-09-23T10:15:00.000Z` answered at `2026-09-23T13:15:00.000Z`
    When `attemptElapsedMs({ record: R, now: "2026-09-23T14:00:00.000Z" })` is asked
    Then it answers `30 * 60 * 1000`, the same as for `R` with the three hours removed

  Scenario Outline: the interval ends at the answer, the park, or now, and is clipped to the attempt
    Given `R` is <state>, with one ask from <askedAt> that <ends>
    When `attemptElapsedMs({ record: R, now: "2026-09-23T14:00:00.000Z" })` is asked
    Then it answers <ms>

    Examples:
      | state                          | askedAt                        | ends                                         | ms                  |
      | `running`, alive               | `2026-09-23T12:00:00.000Z`     | is still open                                | `2 * 60 * 60 * 1000`|
      | `running`, alive               | `2026-09-23T12:00:00.000Z`     | was parked at `2026-09-23T13:00:00.000Z`     | `3 * 60 * 60 * 1000`|
      | settled at `11:00:00.000Z`     | `2026-09-23T10:30:00.000Z`     | is still open                                | `30 * 60 * 1000`    |

  Scenario Outline: intervals are clipped to the attempt, merged, and never charged twice
    Given `R` was created at `10:00` and is <record>, and its `asks` is <asks>, all instants on `2026-09-23`
    When `attemptElapsedMs({ record: R, now: "2026-09-23T14:00:00.000Z"<extra> })` is asked
    Then it answers <ms>

    Examples:
      | record                              | asks                                                         | extra                                         | ms         |
      | `running`, alive                    | one from `09:00` answered at `10:30`                         |                                               | `12600000` |
      | `running`, alive                    | one from `09:00`, still open                                 |                                               | `0`        |
      | `running`, alive                    | `11:00` to `12:00` answered, and `11:30` to `12:30` answered |                                               | `9000000`  |
      | `running`, alive                    | `11:00` to `13:00` answered, and `11:30` to `12:00` answered |                                               | `7200000`  |
      | `running`, alive                    | `10:15` to `10:45` answered, and `12:00` to `12:30` answered |                                               | `10800000` |
      | `running`, alive                    | `11:00` to `12:00` answered, then one from `13:00` still open |                                              | `7200000`  |
      | `running`, alive                    | one from `12:00`, parked at `13:00`, answered at `13:30`     |                                               | `9000000`  |
      | `running`, alive                    | one whose `askedAt` is `"not-a-date"`, answered at `12:00`   |                                               | `14400000` |
      | `running`, alive                    | one whose `askedAt` is `null`, answered at `12:00`           |                                               | `14400000` |
      | `running`, alive                    | one from `12:00` whose `answeredAt` is `"garbage"`           |                                               | `14400000` |
      | `running`, alive                    | one from `12:00` answered at `11:00`                         |                                               | `14400000` |
      | settled `done` at `11:00`           | one from `13:00` answered at `13:30`                         |                                               | `3600000`  |
      | `running`, last beat at `13:00`     | one from `12:00`, parked at `13:00`                          | `, stalenessMs: 300000, isStale`              | `7200000`  |
      | `running`, alive, `createdAt` `"x"` | one from `12:00`, still open                                 |                                               | `null`     |

  Scenario: an answered ask on an earlier attempt is not charged to the lineage
    Given attempt 1 was created at `2026-09-23T10:00:00.000Z` and failed at `11:00`, with one ask from `10:15` answered at `10:45`
    And attempt 2, `retryOf` attempt 1, was created at `12:00` and settled `done` at `13:00` with `asks: []`
    When `lineageElapsedMs({ runs: [<attempt 1>, <attempt 2>], now: "2026-09-23T14:00:00.000Z" })` is asked
    Then it answers `5400000`

  Scenario: a record without asks answers what it answers today
    Given the delivered cases of `acd-clock-counts-attempts` and `test/work/loop` `attemptElapsedMs` fixtures
    When each is run with `asks` absent and with `asks: []`
    Then every answer is unchanged, and `lineageElapsedMs` over them is unchanged

  Scenario: the engine stays pure
    When `src/work/loop.mjs` is read with its comments stripped
    Then it has zero `import` statements, and no `Date.now(` or `new Date(`
