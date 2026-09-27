@executable @cli @work @work-stream
Feature: the run record's seventeenth key is asks, written only by the run's owner through three store writers

  ADR-003 §3, by `68/ADR-001`'s additive discipline. `asks` is appended LAST to the run record,
  as an array defaulting to `[]`. A sixteen-key record reads forward as `asks: []`, exactly as a
  fifteen-key record read forward as `spend: null`. Each entry is `{ question, phase, askedAt,
  parkedAt, answer, answeredAt, by }`, seven keys in that order. The writers are `openRunAsk`,
  `parkRunAsk` and `answerRunAsk` in `src/run-store.mjs`. They are no-state-change persists shaped
  like `heartbeat`, and the run's owner is their single writer. The record stores the human's
  decision and its instants. It never stores a derived `waitedMs` (`119/ADR-003`). Every suite and
  control that pins the sixteen keys moves to seventeen, with `asks` last. `53/FF-5307`'s pin of
  `src/run-store.mjs` is re-pinned with this story's reason.

  RULINGS (PO, 2026-09-23). (1) Signatures: `openRunAsk(item, runId, { question, phase, now })`,
  `parkRunAsk(item, runId, { now })`, `answerRunAsk(item, runId, { answer, by, now })`, where `now`
  is a UTC-Z string as `heartbeat` takes it. Each answers the updated record. (2) Each writer
  changes `asks` and `updatedAt` and nothing else: not `state`, `outcome`, `attempt`,
  `heartbeatAt` or `spend`. Liveness stays the owner's `heartbeat` call. (3) `openRunAsk` appends
  a new entry, with `parkedAt`, `answer`, `answeredAt` and `by` null. `parkRunAsk` stamps
  `parkedAt` on the LAST entry. `answerRunAsk` stamps `answer`, `answeredAt` and `by` on the LAST
  entry, and keeps its `parkedAt`. (4) Refusals, each persisting nothing: a run that is not
  `running` is refused `no-running-run` (409). `openRunAsk` over a last entry with
  `answeredAt == null` is refused `run-ask-open` (409). `parkRunAsk` or `answerRunAsk` with no
  entry, or with a last entry already answered, is refused `run-ask-not-open` (409). (5) A retry
  mints a fresh record with `asks: []`. An ask belongs to its attempt, and is never carried.
  (6) A forward read of a non-array `asks` reads `[]`.

  RULINGS (PO, answering QA, 2026-09-23). (7) `parkRunAsk` over a last entry that is already
  parked and unanswered RE-STAMPS `parkedAt`. A `--resume` re-enters the wait with a fresh bound
  (ADR-004 §5), and the bound can park it again.

  RULINGS (QA, 2026-09-23). (1) The `running` check comes before the entry checks, so a settled
  run with no ask, or with an open one, is refused `no-running-run`.

  Background:
    Given a fixture item in a temporary repo, and a run `R` minted on it by `startRun` at `2026-09-23T17:00:00.000Z`

  Scenario: a minted record carries seventeen keys with asks last and empty
    When the run record for `R` is read from disk
    Then its keys deep-equal, in order, the sixteen delivered keys followed by `"asks"`
    And `asks` deep-equals `[]`

  Scenario Outline: an older record reads forward with asks empty
    Given a run record on disk that <shape>
    When it is read through `readRuns`
    Then its keys are the seventeen, in order, and `asks` deep-equals `[]`

    Examples:
      | shape                                  |
      | carries the sixteen keys and no `asks` |
      | carries `asks: null`                   |
      | carries `asks: "x"`                    |
      | carries `asks: {}`                     |
      | carries `asks: 0`                      |
      | carries the fifteen keys, no `spend` and no `asks` |

  Scenario: a forward read keeps a delivered asks array verbatim
    Given a run record on disk carrying `asks: [<one answered entry E>]`
    When it is read through `readRuns`
    Then its `asks` deep-equals `[E]`, and every other key reads as it did

  Scenario: open, park and answer write one entry through the owner's writers
    When `openRunAsk(item, R, { question: "Decision needed: X", phase: "refine", now: "2026-09-23T17:01:00.000Z" })` is awaited
    And `parkRunAsk(item, R, { now: "2026-09-23T21:01:00.000Z" })` is awaited
    And `answerRunAsk(item, R, { answer: "b", by: { actor: "you", via: "cli", node: "node-7297" }, now: "2026-09-23T22:00:00.000Z" })` is awaited
    Then the record's `asks` deep-equals `[{ question: "Decision needed: X", phase: "refine", askedAt: "2026-09-23T17:01:00.000Z", parkedAt: "2026-09-23T21:01:00.000Z", answer: "b", answeredAt: "2026-09-23T22:00:00.000Z", by: { actor: "you", via: "cli", node: "node-7297" } }]`
    And its `state` is `"running"`, its `outcome` `null`, its `heartbeatAt` unchanged, and its `updatedAt` `"2026-09-23T22:00:00.000Z"`

  Scenario: a re-ask after an answer appends a second entry
    Given `R` has one answered ask
    When `openRunAsk(item, R, { question: "Decision needed: Y", phase: "build", now: "2026-09-23T22:10:00.000Z" })` is awaited
    Then `asks` has two entries, the first unchanged and the second open

  Scenario Outline: a writer refuses a move the record cannot make, and persists nothing
    Given `R` <given>
    When `<writer>` is awaited on `R`
    Then it rejects with `code` `<code>` and `status` 409
    And the record on disk is byte-unchanged

    Examples:
      | given                             | writer       | code             |
      | has settled `done`                | openRunAsk   | no-running-run   |
      | has one open ask                  | openRunAsk   | run-ask-open     |
      | has no ask                        | parkRunAsk   | run-ask-not-open |
      | has one answered ask              | answerRunAsk | run-ask-not-open |
      | has settled `done`                | parkRunAsk   | no-running-run   |
      | has settled `failed` with one open ask | answerRunAsk | no-running-run |
      | has been reclaimed, with one open ask | parkRunAsk | no-running-run  |
      | has one parked, unanswered ask    | openRunAsk   | run-ask-open     |
      | has no ask                        | answerRunAsk | run-ask-not-open |
      | has one answered ask              | parkRunAsk   | run-ask-not-open |
      | has two answered asks             | parkRunAsk   | run-ask-not-open |

  Scenario: parking an already-parked, unanswered ask re-stamps its parkedAt
    Given `R` has one ask opened at `2026-09-23T17:01:00.000Z` and parked at `2026-09-23T21:01:00.000Z`
    When `parkRunAsk(item, R, { now: "2026-09-24T09:00:00.000Z" })` is awaited
    Then `asks` still has one entry, and its `parkedAt` reads `"2026-09-24T09:00:00.000Z"`

  Scenario: an answer after a park keeps the park, and a second ask lands on the last entry only
    Given `R` has one answered ask `E1`, and a second ask opened at `2026-09-23T22:10:00.000Z`
    When `parkRunAsk(item, R, { now: "2026-09-23T22:20:00.000Z" })` and then `answerRunAsk(item, R, { answer: "c", by: { actor: "you", via: "cli", node: "node-7297" }, now: "2026-09-23T22:30:00.000Z" })` are awaited
    Then `asks[0]` deep-equals `E1`
    And `asks[1]` reads `parkedAt: "2026-09-23T22:20:00.000Z"`, `answer: "c"` and `answeredAt: "2026-09-23T22:30:00.000Z"`

  Scenario Outline: every other store write carries asks unchanged
    Given `R` has one open ask opened at `2026-09-23T17:01:00.000Z`
    When <write> is awaited
    Then the record's `asks` deep-equals what it was before the write, and its keys are the seventeen, in order

    Examples:
      | write                                                                                |
      | `heartbeat(item, R, { now: "2026-09-23T17:02:00.000Z" })`                            |
      | `recordSessionId(item, { runId: R, sessionId: "S2", now: "2026-09-23T17:02:00.000Z" })` |
      | `applyTransition(item, R, "done", { now: "2026-09-23T17:03:00.000Z" })`              |
      | `reclaimRun(item, R, { now: "2026-09-23T17:03:00.000Z" })`                           |

  Scenario: a node-partitioned run keeps its asks on its own record
    Given a run `RN` minted with `node: "node-2976"`
    When `openRunAsk(item, RN, { question: "Decision needed: X", phase: "build", now: "2026-09-23T17:01:00.000Z" })` is awaited
    Then the record at `runNodeRecordPath(item, "node-2976", RN)` carries the one open entry
    And no record exists at `runRecordPath(item, RN)`

  Scenario: a retry starts its own asks
    Given `R` carries one open ask and has then failed retryably
    When `retryRun(item, { runId: R })` mints the next attempt
    Then the new record's `asks` deep-equals `[]`

  Scenario: asks is written only through the three writers
    When every module under `src/` is read with its comments stripped
    Then only `src/run-store.mjs` assigns an `asks` key on a run record, and only inside `buildRecord`, `normalizeRecord`, `openRunAsk`, `parkRunAsk` and `answerRunAsk`

  Scenario: every sixteen-key pin moves to seventeen, and FF-5307 is re-pinned with a reason
    When the suites and controls that pinned the sixteen record keys are run
    Then each pins the seventeen keys with `asks` last, and each is green
    And `acd-loop-state-rides-the-run-record`'s pin of `src/run-store.mjs` carries this story's digest and a comment naming 131/01 and the seventeenth key
