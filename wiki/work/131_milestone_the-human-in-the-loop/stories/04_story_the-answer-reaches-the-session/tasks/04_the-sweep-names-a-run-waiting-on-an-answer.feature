@executable @cli @work @work-stream
Feature: the resume sweep names a run that is waiting on an answer, with the command that answers it, and never as stranded

  ADR-003 §5. `work:resume`'s sweep (`readinessRow` in `src/commands/resume.mjs`) gains one
  case, checked FIRST: a `running` run whose last `asks` entry has `answeredAt == null` is
  reported as `state: "waiting-on-you"`, `ready: false` — never `in-flight`, `stranded` or
  `attempts-exhausted`. A question waiting on a human is not an orphan, however long its owner
  has been silent: a parked ask has no owner beating it, and today's sweep would offer to
  reclaim it. The row gains two additive keys, `askedAt` and `parkedAt` (null while the owner
  still waits), and the render prints the answer command. The ACT face (`aof work resume <ref>`)
  is unchanged: 131/01's reclaim skip leaves the waiting run alone, and the store's own refusal
  stands.

  RULINGS (PO, 2026-09-23).
  (1) The waiting case is decided before the liveness window is consulted, so a beaten waiting
  run and a parked silent one read the same state. A waiting run outranks a failed prior on the
  same item: it is the live lineage.
  (2) The row keeps the eleven keys every row carries, plus `askedAt` and `parkedAt` after them.
  `silentSince` stays `heartbeatAt ?? updatedAt`, the honest liveness fact; `readyAt` and
  `failureReason` are `null`; `sessionId` is the record's.
  (3) The render line is `  <ref>  NEEDS YOUR ANSWER — asked <askedAt>[, parked <parkedAt>]  —
  answer: aof work answer <ref> "…" (attempt <a>/<m>, run <runId>)`. The sweep does not spell
  `waiting on you`: that phrase has one home, `src/notify/form.mjs` (FF-13108), and this verb is
  not one of its four readers. The `state` id is the ADR's hyphenated word.
  (4) A waiting run's ref is not in `ready`, and the `Resume now:` tail never lists it. When the
  sweep holds waiting rows the tail gains, first, one `Answer:` line per waiting row, and the
  no-ready sentence reads `Nothing is ready yet — answer the questions above, or re-run this
  command after the earliest readyAt.` when a waiting row exists.
  (5) A record with no `asks` key, or an empty one, has no waiting case (a sixteen-key record
  reads forward as `[]`). A record whose last entry is answered is not waiting, whatever an
  earlier entry says.
  (6) ACT: `work:resume <ref>` over an item whose only `running` run has an open ask reclaims
  nothing (131/01's skip) and mints nothing: the store refuses `duplicate-run`, untouched, and
  the record is byte-unchanged.

  RULINGS (QA, 2026-09-23).
  (1) Only a `running` run waits: a settled record whose last entry is open reads as today's
  retry row. An answered last entry is not waiting, so a silent run whose ask was answered is
  `stranded`, as today.
  (2) `askedAt` and `parkedAt` are the LAST entry's, and ride only on a waiting row; every other
  row is key for key today's, so the delivered sweep cases hold. For the PO to ratify: PO ruling
  (2) names the waiting row and leaves the others unstated.
  (3) A waiting row's keys, in order: the eleven (`ref, runId, attempt, maxAttempts,
  failureReason, sessionId, resumeAfter, ready, state, readyAt, silentSince`), `askedAt`,
  `parkedAt`, then the sweep's `status` and `title`; `resumeAfter` is `null`.
  (4) Pending order is today's sort, ready first and then `readyAt` as a string, so a waiting
  row (`readyAt: null`) precedes a parked retry.
  (5) The tail's blocks are separated by one blank line: `Answer:` first, then `Resume now:` or
  the no-ready sentence. With no waiting row the tail is byte-identical to today's.
  (6) A cache-only row (no `dir`) is skipped before any run is read, as today.

  RULINGS (PO, answering QA, 2026-09-23).
  (7) QA (1)–(6) are RATIFIED; (2) completes PO ruling (2): the two keys ride only on a waiting
  row, and every other row is key for key today's.

  RULINGS (developer, 2026-09-23).
  (8) INFEASIBLE AS WRITTEN; the smallest fix is made here. Over a waiting run, the act face
  refuses `no-retryable-run`, not `duplicate-run`. `R` is `348`'s only run, so `retryRun` finds
  no failed prior and refuses before `mintRun`'s dedup can say `duplicate-run`. The act
  scenario's `duplicate-run` reads as `no-retryable-run` (409), and the Outline's first row is
  amended. What a case observes is unchanged: nothing reclaimed, nothing minted, `R` untouched.
  (9) The fixture writes asks through 131/01's `openRunAsk`, `parkRunAsk` and `answerRunAsk`, and
  beats through `heartbeat`. The rows marked "written directly", and `asks: "x"`, are `writeFile`s,
  as this suite's fourteen-key compat case already does.
  (10) The cache-only row needs a cache fixture: the `test/support/cache-read-fixture.mjs` that
  `run-status-document-frozen` uses. That file joins `reads:`.
  (11) The row fits `render()`'s line as it stands: `when` is `NEEDS YOUR ANSWER — asked
  <askedAt>[, parked <parkedAt>]`, and `cause` is `answer: aof work answer <ref> "…"`. The
  `Answer:` block goes before the existing `Resume now:` or no-ready branch.

  RULINGS (PO, answering the developer, 2026-09-23).
  (12) Developer (8)–(11) are RATIFIED; (8) amends PO ruling (6): the act face's refusal is the
  store's `no-retryable-run`, and the observation stands.

  Background:
    Given the `run-session-limit-resume` fixture: a temporary repo with items `348` and `349`, an isolated `AOF_GLOBAL_HOME`, and `NOW` = `"2026-08-06T00:00:00.000Z"`
    And `348` has one run `R` minted at `2026-08-05T20:00:00.000Z`, `running`, with one ask opened at `2026-08-05T21:00:00.000Z` and unanswered

  Scenario: a beaten waiting run is reported as waiting on you, not in flight
    Given `R`'s `heartbeatAt` is `2026-08-05T23:59:30.000Z`
    When `work:resume` sweeps with `{ now: NOW }`
    Then `pending` holds one row for `348`: `state: "waiting-on-you"`, `ready: false`, `runId: R`, `attempt: 1`, `askedAt: "2026-08-05T21:00:00.000Z"`, `parkedAt: null`, `silentSince: "2026-08-05T23:59:30.000Z"`, `readyAt: null`, `failureReason: null`
    And `ready` is `[]`

  Scenario: the waiting row carries two keys more, and every other row is as it was
    Given `R`'s `heartbeatAt` is `2026-08-05T23:59:30.000Z`, and `349` has a failed `session_limit` run parked until `2026-08-06T00:10:00.000Z`
    When `work:resume` sweeps with `{ now: NOW }`
    Then `348`'s row keys are, in order, the eleven, `askedAt`, `parkedAt`, `status` and `title`, with `resumeAfter: null` and `sessionId` the record's
    And `349`'s row has no `askedAt` or `parkedAt` key, and `pending` lists `348` before `349`

  Scenario: a parked, silent waiting run is still waiting on you, never stranded
    Given `R`'s ask was parked at `2026-08-05T22:00:00.000Z` and its last heartbeat is `2026-08-05T21:00:00.000Z`
    When `work:resume` sweeps with `{ now: NOW }`
    Then the row for `348` reads `state: "waiting-on-you"`, `parkedAt: "2026-08-05T22:00:00.000Z"` and `ready: false`
    And no row reads `stranded`

  Scenario: the render prints the answer command and never offers to resume it
    Given `R`'s ask was parked at `2026-08-05T22:00:00.000Z`
    When `aof work resume` runs without `--json`
    Then it prints the row `  348  NEEDS YOUR ANSWER — asked 2026-08-05T21:00:00.000Z, parked 2026-08-05T22:00:00.000Z  — answer: aof work answer 348 "…" (attempt 1/3, run R)`
    And the tail holds `Answer:` then `  aof work answer 348 "…"`, and no `aof work resume 348` line
    And no printed line contains `waiting on you`

  Scenario: an ask that was never parked renders without a parked clause
    Given `R`'s `heartbeatAt` is `2026-08-05T23:59:30.000Z`
    When `aof work resume` runs without `--json`
    Then it prints the row `  348  NEEDS YOUR ANSWER — asked 2026-08-05T21:00:00.000Z  — answer: aof work answer 348 "…" (attempt 1/3, run R)`

  Scenario Outline: the tail answers first, then resumes, and says nothing new when nothing waits
    Given <sweep>
    When `aof work resume` runs without `--json`
    Then the lines after the last row are exactly <tail>, where `/` separates lines and `(blank)` is an empty line

    Examples:
      | sweep                                                                 | tail                                                                                                                                                   |
      | only `348` waits                                                      | (blank) / `Answer:` / `  aof work answer 348 "…"` / (blank) / `Nothing is ready yet — answer the questions above, or re-run this command after the earliest readyAt.` |
      | `348` waits, and `349` has a failed run ready to retry                | (blank) / `Answer:` / `  aof work answer 348 "…"` / (blank) / `Resume now:` / `  aof work resume 349`                                                   |
      | `348` waits, and `349` has a failed run parked until a later readyAt  | (blank) / `Answer:` / `  aof work answer 348 "…"` / (blank) / `Nothing is ready yet — answer the questions above, or re-run this command after the earliest readyAt.` |
      | `348`'s ask was answered and `R` beats, and `349` is parked           | (blank) / `Nothing is ready yet — re-run this command after the earliest readyAt above.`                                                               |

  Scenario: a cache-only row is skipped as today, even when its run waits on another node
    Given the stream also answers a cache-only row for `350`, with no `dir`, reported by another node
    When `work:resume` sweeps with `{ now: NOW }`
    Then no row names `350`, and the sweep answers as it does without that row

  Scenario Outline: the waiting case outranks every other, and only an open last entry is waiting
    Given `348`'s runs are <runs>
    When `work:resume` sweeps with `{ now: NOW }`
    Then the row for `348` <outcome>

    Examples:
      | runs                                                                              | outcome                                            |
      | `R` running with an open ask, and an earlier `failed` retryable run               | reads `state: "waiting-on-you"`, `runId: R`        |
      | `R` running with one answered ask                                                 | reads `state: "in-flight"` inside the window       |
      | `R` running with one answered ask and a second open one                           | reads `state: "waiting-on-you"`                    |
      | `R` running with `asks: []`                                                       | reads `state: "in-flight"` inside the window       |
      | `R` running as a sixteen-key record with no `asks`                                | reads `state: "in-flight"` inside the window       |
      | `R` running with an open ask, at attempt 3 of 3                                   | reads `state: "waiting-on-you"`, not `attempts-exhausted` |
      | `R` running with an open, parked ask, silent a day, at attempt 3 of 3             | reads `state: "waiting-on-you"`, `ready: false`    |
      | `R` running with an open ask, and an earlier `failed` `agent_error` run           | reads `state: "waiting-on-you"`, `runId: R`        |
      | `R` running with one answered ask, silent past the window                         | reads `state: "stranded"`, `ready: true`           |
      | `R` running with `asks: "x"` on disk                                              | reads `state: "in-flight"` inside the window       |
      | `R` running whose first entry is open and last answered, written directly         | reads `state: "in-flight"` inside the window       |
      | `R` settled `failed` (`runtime_offline`) with its last entry still open           | reads today's retry row, `state: "ready"`, with no `askedAt` key |

  Scenario: the act face over a waiting run reclaims nothing and mints nothing
    Given `R`'s ask was parked and its last heartbeat is a day old
    When `work:resume` runs with `{ ref: "348", now: NOW }`
    Then it rejects with `code` `duplicate-run`, `348` has one run, and `R`'s record is byte-unchanged

  Scenario Outline: the act face leaves a waiting run alone, and only a waiting one
    Given `R`'s ask <ask>, and its last heartbeat is <heartbeat>
    When `work:resume` runs with `{ ref: "348", now: NOW }`
    Then <outcome>

    Examples:
      | ask            | heartbeat            | outcome                                                                                   |
      | is waiting     | 30 s old             | it rejects `no-retryable-run` (ruling 8), `348` has one run, and `R`'s record is byte-unchanged |
      | was answered   | a day old            | it reclaims `R` first and resumes attempt 2 — today's path, since `R` no longer waits      |
