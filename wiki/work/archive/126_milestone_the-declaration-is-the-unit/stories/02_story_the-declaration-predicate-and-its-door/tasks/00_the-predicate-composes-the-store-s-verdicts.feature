@executable @cli @work @work-stream
Feature: The predicate composes the store's verdicts — run records in, rows out, no literal of its own, and an exhausted lineage left off the list even when the store says ready

  Died-versus-stopped-for-cause already has one home. `isRetryable` (`src/run-store.mjs:301-304`)
  admits three reasons; `shouldRetry` (`:316`) bounds them by attempt; `retryReadiness` (`:428-437`)
  answers one of five states — `ready`, `parked`, `not-retryable`, `attempts-exhausted`, `no-run` —
  and parks on a strict `readyAtMs > nowMs` (`:433`), so an instant exactly equal to `now` is
  READY. `isStale` (`:1022-1026`) is the ONE staleness predicate presence shares since 23/ADR-002,
  and its `>` is strict too, so an age exactly at the threshold is still LIVE.
  `readLoopDeclaration` (`src/work/loop.mjs:1190-1196`) recovers the latest usable declaration.
  A `needs-input` session settles `failed/needs-input` (`src/commands/drive.mjs:284-312`), which
  is not retryable.

  THE ENGINE MODULE IMPORTS NOTHING AT ALL — not one `import` statement exists in
  `src/work/loop.mjs`, and `test/loop/work-loop-determinism.test.mjs` proves it by copying the
  module alone into an empty directory and deciding with every source dependency absent. That is
  why 69/06's `import … from "../loop-progress.mjs"` was reverted (VERIFICATION F-69-V11) and its
  two deciders are HANDED IN by the caller instead (`decideLoopProgress`, `:556-562`). The store's
  verdicts reach this predicate the same way: by the input bag, never by import. It reads no
  filesystem and no clock; `now` arrives as data.

  THE SHAPES THIS CONTRACT EXPECTS, stated once so 126/00's and 126/03's builders agree.

    · `decideSupervisedDeclarations(input = {})` — exported from `src/work/loop.mjs`, taking
      `{ workspaces, maxAttempts, ceilingMs, stalenessMs, now, isRunning, isStale, retryReadiness }`
      and returning a frozen `{ rows }`. `workspaces` is
      `[{ workspaceId, projectRoot, items: [{ ref, runs }] }]` (ADR-004 §1); `now` is an ISO-8601 Z
      string, as every instant in this module is; `isRunning`, `isStale` and `retryReadiness` are
      the store's own functions, handed in.
    · A ROW is a frozen `{ workspaceId, projectRoot, loopRunId, scope, level, cap }` — six keys,
      no seventh. The display label, the argv and the `cwd` are the producer's (`tasks/03`), not
      the engine's, because composing an argv here would be an import.
    · `isRunning(record)` — a pure one-line export beside `isLegalTransition` in
      `src/run-store.mjs`, answering whether an attempt is still in flight. It exists because the
      store owns the run-state vocabulary and today exports no predicate over it, so the only
      alternative is this decider spelling a state name, which is exactly what §4 forbids. A
      `queued` record is NOT running (its own row below says so).
    · The clock leg calls 126/00's summer, which is in this same module and is therefore a direct
      call. This contract consumes three properties of it and nothing else: it lives in the
      engine, it takes `stalenessMs` as DATA, and a STALE running attempt ends at its last
      observed liveness (`heartbeatAt ?? updatedAt`) exactly as a reclaimed one does — only a
      FRESH running attempt ends at `now`. Without that, a laptop shut for eleven hours exhausts
      the budget by having been shut: the measured record sums to 1,785,756 ms as a stale running
      attempt, not to the 41,380,713 ms its wall-clock span reads (ADR-001, and its property).
      126/00 owns the summer's name and signature; only the three properties above are asserted
      here, and they are asserted through this decider's observable verdicts.
    · The ceiling comparison routes through `decideScheduleToClose({ elapsedMs, ceilingMs })`
      (126/00 §3), so `>=` is the halt in ONE home and the predicate cannot drift from the rule
      the shell halts on.

  THE LISTING RULE, three branches and no fourth. A declaration is listed iff its latest run in
  scope is (a) running and FRESH — listed on its own liveness, whatever the clock says, because
  the clock gates a RELAUNCH and a run already in flight is halted by its own shell; or (b)
  running and STALE — the died loop, a relaunch, and therefore subject to the clock; or (c)
  `retryReadiness(record, maxAttempts, nowMs).ready === true` — resumable, and subject to the
  clock. A stale running attempt over an exhausted lineage is NOT listed.

  Nothing persists a `deadline-exhausted` halt (`grep -rn "deadline-exhausted" src/` → 3
  in-process hits, measured at refine). A lineage whose compute budget is spent therefore looks
  `ready` to the store, and a reconciler fed that row would relaunch it every tick. The clock leg
  is the one place the predicate decides rather than reads.

  What would quietly undo this: `failureReason === "runtime_offline"` tested inside the decider (a
  fourth derivation of a classification the store owns); a `state === "running"` shortcut that
  bypasses `isStale`, which is what collapses branches (a) and (b) into one and lets a died loop
  outlive its budget; the clock leg dropped for tidiness; the store's verdicts IMPORTED rather
  than handed in, which makes the module unloadable alone and reds `work-loop-determinism`; and a
  `work:next` import to ask whether the scope is complete (a registered command, TECH_DEBT item
  26's ring — and unnecessary, since a completed scope's last run is `done`).

  ADR-004 §1-§4, §7. ADR-001 §2. FF-12604.

  Scenario Outline: every class of latest run is answered, and only the resumable ones are listed
    Given a declaration whose `supervised` is <supervised>, whose latest run in scope is <latest run>
    And that run is attempt <attempt> of 3, over a lineage whose accumulated ATTEMPT time <clock> — each attempt ending at `updatedAt` when settled, at `heartbeatAt ?? updatedAt` when reclaimed or when running and stale, and at `now` only when running and fresh
    When the decider is given the workspaces, `maxAttempts` 3, the ceiling, the staleness threshold, an injected `now`, and the store's own `isRunning`, `isStale` and `retryReadiness`
    Then the declaration is <listed>
    And a listed row carries the declaration's `loopRunId`, scope, level and cap plus its workspace's `workspaceId` and `projectRoot`, and no failure reason, run state or readiness verdict
    And nothing is listed on any ground but the three: running and fresh; running and stale with the clock still admitting; or `retryReadiness(...).ready` with the clock still admitting

    Examples: the classes — the store's five readiness states over one run of each shape
      | latest run                                    | supervised | attempt | clock                | listed     |
      | `running`, heartbeat fresh                    | true       | 1       | is under the ceiling | listed     |
      | `running`, heartbeat older than the threshold | true       | 1       | is under the ceiling | listed     |
      | `queued`, never started                       | true       | 1       | is under the ceiling | not listed |
      | `cancelled`                                   | true       | 1       | is under the ceiling | not listed |
      | `failed runtime_offline`, reclaimed           | true       | 1       | is under the ceiling | listed     |
      | `failed timeout`                              | true       | 2       | is under the ceiling | listed     |
      | `failed session_limit`, `resumeAfter` after `now`  | true  | 1       | is under the ceiling | not listed |
      | `failed session_limit`, `resumeAfter` before `now` | true  | 1       | is under the ceiling | listed     |
      | `failed session_limit`, no `resumeAfter`      | true       | 1       | is under the ceiling | listed     |
      | `failed needs-input`                          | true       | 1       | is under the ceiling | not listed |
      | `failed agent_error`                          | true       | 1       | is under the ceiling | not listed |
      | `failed runtime_offline`                      | true       | 3       | is under the ceiling | not listed |
      | `failed runtime_offline`                      | true       | 2       | is over the ceiling  | not listed |
      | `done`                                        | true       | 1       | is under the ceiling | not listed |
      | `running`, heartbeat fresh                    | false      | 1       | is under the ceiling | not listed |
      | `failed runtime_offline`, reclaimed           | false      | 1       | is under the ceiling | not listed |

    Examples: the boundaries, each stated as the instant or the count itself
      | latest run                                        | supervised | attempt | clock                     | listed     |
      | `failed session_limit`, `resumeAfter` exactly `now` | true     | 1       | is under the ceiling      | listed     |
      | `running`, heartbeat age exactly the threshold    | true       | 1       | is under the ceiling      | listed     |
      | `failed runtime_offline`                          | true       | 2       | is one ms under the ceiling | listed   |
      | `failed runtime_offline`                          | true       | 2       | equals the ceiling exactly  | not listed |
      | `failed runtime_offline`                          | true       | 3       | is one ms under the ceiling | not listed |

    Examples: liveness decides a run in flight — the pair on which `isStale` alone changes the verdict
      | latest run                                    | supervised | attempt | clock               | listed     |
      | `running`, heartbeat fresh                    | true       | 1       | is over the ceiling | listed     |
      | `running`, heartbeat older than the threshold | true       | 1       | is over the ceiling | not listed |

  Scenario: an exhausted lineage is not listed even though the store says ready
    Given a supervised declaration whose lineage is two settled attempts whose accumulated attempt time exceeds the ceiling, chained by `retryOf`, and whose latest run is `failed runtime_offline` at attempt 2 of 3
    When the decider is asked with the default ceiling
    Then `retryReadiness` answers `ready` for that record
    And no row is returned for it
    When the decider is asked again with only the ceiling raised above the lineage's total
    Then the row is returned

  Scenario Outline: which declaration a row answers for, and how many rows a workspace yields
    Given a workspace whose items' run records are <records>
    When the decider is asked with every other input held fixed
    Then the answer is <answer>
    And a scope's runs are those its records' `brief.loop.scope` names, its declaration is `readLoopDeclaration` over them, and its verdict is decided by the newest of them by `createdAt`

    Examples: one row per scope, recovered by the latest usable declaration — never one per item
      | records                                                                  | answer                                                          |
      | no run carrying a `brief.loop` at all                                    | no row, and no error                                            |
      | one supervised declaration whose runs span three items in its scope       | one row, decided by the newest run of the three                 |
      | two run sets over one scope carrying different `loopRunId`s               | one row, for the declaration the newest usable record carries    |
      | two supervised declarations over two different scopes, both resumable     | two rows, one per scope, each carrying its own `loopRunId`      |
      | the newest record's `brief.loop` missing a required key, an older usable  | the OLDER record's declaration is recovered, and the NEWEST record still decides the verdict |
      | an older supervised record and a newer unsupervised one, one `loopRunId`  | no row — the newest usable record's `supervised` is the one read |
      | an older unsupervised record and a newer supervised one, one `loopRunId`  | one row                                                         |
      | two usable records sharing a `createdAt`                                  | one row, and two asks return the identical answer               |
      | a workspace holding no items at all                                       | no row, and no error                                            |

  Scenario: the decider names no verdict the store owns
    Given the source of the decider
    When it is inspected with comments stripped
    Then it spells none of `runtime_offline`, `timeout`, `session_limit`, `agent_error`, `needs-input`, `running`, `queued`, `cancelled`, `failed` or `done`
    And it spells none of `retryReadiness`'s state names `parked`, `not-retryable`, `attempts-exhausted` or `no-run` — it reads only the `ready` boolean off that answer
    And it reaches `isRunning`, `isStale` and `retryReadiness` through its input bag and `readLoopDeclaration` by call
    And `src/work/loop.mjs` still carries no `import` statement of any kind, and the module copied alone still decides
    And it imports no `node:fs`, opens no store and reads no clock

  Scenario: the fresh-mint retry test is not collapsed into the predicate
    Given `src/commands/run-start.mjs:235-244`'s `reclaimedPrior` decision
    When both it and the predicate are inspected
    Then each routes its retry classification through `shouldRetry`
    And the run-start decision still carries its own `reclaimedAt != null` clause, which the predicate does not, because it answers a different question
