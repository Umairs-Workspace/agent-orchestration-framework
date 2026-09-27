@executable @cli @work @work-stream
Feature: The eight stops — each driven to the halt an operator actually reads

  The stop set is CLOSED and every member names a PRODUCER (ADR-005 §4), because a stop the
  shell DECIDES would be product judgment and a stop it REPORTS because a store, a command or a
  driver returned a code is deterministic control. That distinction is what keeps the two
  `autonomous.md` conditions that are genuinely model judgments — a wrong or infeasible scenario,
  an open decision that cannot be safely defaulted — out of this set entirely: they reach the
  shell as `session-needs-input`, which is exactly what the NEEDS_INPUT sentinel exists to
  produce.

  This feature drives each of the eight to both observable faces without changing either one's
  contract. The machine result remains ADR-005 §3's frozen ten-key `LoopState`; a halted `act`
  carries exactly `{act, stop, ref, producer}` and no stop-specific eleventh key or nested field.
  The existing human `report` callback carries the operator detail that does not fit that shape:
  the STOP ID, the REF it stopped on, the producer-specific fact, and the EXACT command to resume.
  The stop and ref are therefore common to both faces; `readyAt`, `waitingOn`, holders, findings,
  attempt counts, session ids and item types are report facts only. An operator coming back to a
  halted overnight run should not have to work out the next move
  (`src/commands/resume.mjs:222-227` is the house precedent for that discipline).

  Failure classification is NOT re-derived here. When a driven session fails, the loop completes
  its run with the driver's own `failureReason` and then ASKS the store what to do — the same
  `transitionRunStart({mode:"retry"})` door `work:resume` uses — and follows the coded answer
  (`src/run-store.mjs:126-143`; `src/commands/resume.mjs:138-147`). A retryable infra failure is
  therefore an IN-LOOP recovery, not a hand-back, exactly as `autonomous.md:82-110` already
  prescribes; only the store's own refusals become stops. ADR-015 §7's driver amendment forwards
  exactly that optional `failureReason` and nothing else. In particular, the driver does not own or
  forward reset metadata. For `session_limit`, the command edge calls the run-store-owned pure policy
  exactly as `parseResumeAfter(null, { now })`, passes its `resumeAfter` through
  `transitionRunComplete`, and then asks `transitionRunStart({mode:"retry"})`. That retry door's coded
  `retry-parked` error carries the authoritative `readyAt`; the loop reports the error's instant and
  never substitutes a driver-stated reset. The policy's existing 60-minute fallback is used as-is —
  no new configuration key or clock seam is declared.

  THE SEAM. Every scenario drives the launcher body in-process over a temp-`AOF_GLOBAL_HOME`
  fixture stream with `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}`
  injected through the declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2), and scripts the
  producing condition at its own producer: the fixture stream produces
  `uat-gate`, `dependency-blocked` and `unmapped-item-type`; the scripted session produces
  `session-needs-input` and only the failure reasons behind `run-not-retryable` and `retry-parked`;
  the gate cycle and a seeded run record produce `cap-exhausted`; and `operator-interrupt` is
  produced by emitting SIGINT at the handler the launcher body registers, the
  `src/commands/mesh-serve.mjs:97-104` idiom driven in-process.
  The default-watch no-op proof uses that same real driver with no injected completion watcher: a
  temp Claude transcript reaches a declared terminal sentinel while the fake PTY remains live, and
  the promise must settle from `defaultWatchTranscriptCompletion` before any PTY exit is emitted.
  It therefore proves the default watcher path rather than winning a race through `onExit`. The
  executable recipe is already supported by the shipped seams: set a temp `CLAUDE_CONFIG_DIR`, inject
  only the known session-id watch, write that session's declared-complete JSONL, age its mtime past the
  declared-idle window, and leave the fake PTY live. No completion-watch injection or production
  timing change is needed.

  Mechanised as `test/loop-command-stops.test.mjs` and the default-watch case in
  `test/drive-command-phase-drivers.test.mjs`, both imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  The row-id Examples matrices below are executable case inventories: the suite asserts that the set
  of exercised row ids equals each declared row-id set. A parameterised test may exercise many
  rows, and one test may prove several clauses from one scenario; neither a total such as "25
  tests" nor a test-per-prose-sentence demand is traceability. What is required is an observable
  assertion for every headline scenario and every Examples row, with shared setup and assertions
  allowed where the exercised scenario/row ids remain explicit.
  ADR-005 §4, ADR-004 §3, ADR-009 §1 and §6, ADR-010 §2/§4/§10, RESEARCH §Q4 and §Q8.

  Scenario: `uat-gate` from a ready uat session
    Given a fixture stream whose next ready item is the uat session `04`
    When I run the loop body for scope `03-04`
    Then zero sessions are spawned and zero runs are minted
    And the loop halts with stop id `uat-gate` naming ref `04`
    And the producer names `work:next` returning `type: "uat"`
    And the report states that a uat sign-off is human and names `aof work loop 03-04 --resume` as the way back
    And the loop never signs a uat session off itself

  Scenario: `uat-gate` from a story whose tasks carry a @uat scenario
    Given a fixture stream whose story `03/01` has one task feature with a `@uat` scenario
    And a scripted agent that marks the story done and leaves the stream clean
    When I run the loop body for scope `03`
    Then the continue session, the gate and the verify session all run first
    And the loop then halts with stop id `uat-gate` naming ref `03/01`
    And the producer names `work:tasks` reporting `counts.uat > 0`
    And the count came from `work:tasks`, not from a second feature parse

  Scenario: `dependency-blocked`
    Given a fixture stream where milestone `03` declares `depends: [02]` and `02` is not done
    When I run the loop body for scope `03`
    Then the loop halts with stop id `dependency-blocked` naming ref `03`
    And it names the unmet driver `02` from `work:next`'s own `waitingOn`
    And zero sessions are spawned and zero runs are minted

  Scenario: `unmapped-item-type` — the shell names the gap instead of guessing a phase
    Given a fixture stream whose next ready item is the spike `05`
    When I run the loop body for scope `05`
    Then the loop halts with stop id `unmapped-item-type` naming ref `05` and type `spike`
    And no phase was dispatched for it — no `/aof:refine`, `/aof:continue` or `/aof:verify` was typed
    And the report states that the frozen phase map covers no phase for this type
    Given a fixture stream whose next ready item is the chore `06`
    When I run the loop body for scope `06`
    Then the loop halts with stop id `unmapped-item-type` naming ref `06` and type `chore`

  Scenario: `session-needs-input`
    Given a scripted session that emits the NEEDS_INPUT sentinel instead of completing
    When I run the loop body for scope `03`
    Then the loop halts with stop id `session-needs-input` naming ref `03/01`
    And the report carries the captured session id, so the operator can attach to that session
    And no further session is spawned after the halt
    And the producer names the driver's own `{outcome: "needs-input"}`

  Scenario: `run-not-retryable` — the store judged it, not the shell
    Given a scripted session that fails with reason `agent_error`
    When I run the loop body for scope `03`
    Then the run for `03/01` is completed `failed` with that reason
    And the loop asks the store to retry and is refused `not-retryable`
    And it halts with stop id `run-not-retryable` naming ref `03/01`
    And the shell re-derived no classification of its own — the refusal code is the producer
    And no second session was spawned for that ref

  Scenario: `retry-parked` — a session limit is waited out, never thrashed
    Given a scripted session that fails with reason `session_limit` and carries no reset metadata
    And the fixture clock is `2026-08-17T12:00:00.000Z` and the run-store's existing fallback policy parks it for 60 minutes
    When I run the loop body for scope `03`
    Then the loop asks the store to retry and is refused `retry-parked` with a `readyAt`
    And the store answer's `readyAt` is exactly `2026-08-17T13:00:00.000Z`, not a driver value
    And the returned LoopState halts with stop id `retry-parked` naming ref `03/01`
    And neither `act` nor any eleventh LoopState key carries `readyAt`
    And no further session is spawned — an early retry is certain to die the same way and burns one of the cap
    And the report names both `aof work loop 03 --resume` and the instant before which it will refuse again

  Scenario: the real default completion watcher remains a production no-op for `failureReason`
    Given a phase driver using the real `defaultWatchTranscriptCompletion`, with no injected completion watcher
    And a temp Claude transcript that reaches a declared done sentinel while the fake PTY remains live
    When the watch settles through that transcript before any PTY exit is emitted
    Then the phase result is `done` and carries the captured session id
    And the result has no `failureReason`, because the default watcher never produces one
    And exactly one session was spawned and the PTY-exit path did not win the result

  Scenario: a retryable infra failure is recovered IN-LOOP, and is not a stop at all
    Given a scripted session that fails with reason `runtime_offline` on its first attempt and completes on its second
    When I run the loop body for scope `03` with a resolved cap of 3
    Then the loop asks the store to retry and is granted a retry on the same lineage
    And a second session is spawned for `03/01`
    And the second run record carries `attempt: 2` and `retryOf` naming the first
    And the loop halts with no stop condition at all

  Scenario: `cap-exhausted` from the store's own ceiling
    Given a scripted session that fails with reason `timeout` on every attempt
    When I run the loop body for scope `03` with a resolved cap of 3
    Then exactly three sessions are spawned for `03/01`, all on the same retry lineage
    And the loop asks the store to retry and is refused `attempts-exhausted`
    And it halts with stop id `cap-exhausted` naming ref `03/01`
    And the producer names the store's refusal code, not a counter the shell kept

  Scenario: `operator-interrupt` — Ctrl-C stops the loop and tells it how to come back
    Given a fixture stream with two ready stories and a scripted agent that marks each done
    When I run the loop body for scope `03` and SIGINT is raised while the first session is live
    Then the loop stops before starting any further phase
    And no session is spawned after the signal
    And no run record is minted after the signal
    And it halts with stop id `operator-interrupt` naming the ref that was in flight
    And it names `aof work loop 03 --resume` as the way back
    And the interrupted run is left non-terminal, for `--resume` to settle through the store's own reclaim path
    And SIGTERM produces the same stop

  Scenario: every halt preserves the frozen machine face and reports its operator facts
    Given each producing condition in the stop-producer and report matrices below
    When the loop halts on it
    Then the returned LoopState has exactly ADR-005 §3's ten keys
    And its `act` has exactly `act`, `stop`, `ref` and `producer`
    And the report callback names the stop id, ref, producer-specific fact and exact resume command
    And the stop id is a member of the closed set — never a message the operator has to interpret
    And no stop-specific fact is added to `act`, `driven`, `resumable` or an eleventh top-level field
    And the exercised stop-row ids and report-row ids exactly equal the matrices' declared sets

  Scenario: every driver reason follows the store's coded answer
    Given each row in the failure-reason matrix below
    When the scripted completion watcher supplies that row's `failureReason`
    Then the completed run records exactly that reason
    And the retry ask receives the store answer in that row
    And the loop makes that row's move without classifying the reason itself
    And the exercised reason-row ids exactly equal the matrix's declared set

  Scenario: the store clock and policy own the parked boundary
    Given each row in the store-readiness matrix below
    When the row's producer input is applied at its fixture clock instant
    Then the run-store retry ask returns that row's exact answer
    And any `readyAt` in the run-store answer equals the row's recorded instant
    And the q01 completion watcher supplied only `{outcome: "failed", failureReason: "session_limit"}`
    And neither that driver result, returned `LoopState` nor nested `act` carries reset metadata or `readyAt`
    And the human report carries `readyAt` only when the store refuses `retry-parked`
    And the exercised readiness-row ids exactly equal the matrix's declared set

  Scenario: a halted loop stops driving, and leaves the rest of the scope alone
    Given a fixture stream whose milestone `03` holds a blocked story followed by two ready ones
    When the loop halts on any stop condition
    Then no further `work:next` ask drives anything
    And the items after the halt point are untouched — no run minted, no status written
    And re-running the loop after the halting condition is cleared picks the scope up from where the stream now is

  Examples: executable stop-producer matrix — thirteen producer rows, eight closed stop ids (ADR-005 §4)
    | row | stop id             | produced by                                                        |
    | s01 | uat-gate            | `work:next` returned `type: "uat"`                                 |
    | s02 | uat-gate            | `work:tasks <ref>` reported a task with `counts.uat > 0`           |
    | s03 | dependency-blocked  | `work:next` returned `state: "blocked"` with `waitingOn`           |
    | s04 | dependency-blocked  | `work:next` returned `state: "held"` with `skipped` holders        |
    | s05 | cap-exhausted       | the gate cycle reached the resolved cap                            |
    | s06 | cap-exhausted       | the store refused a retry `attempts-exhausted`                     |
    | s07 | session-needs-input | the driver resolved `{outcome: "needs-input"}`                     |
    | s08 | run-not-retryable   | the store refused a retry `not-retryable`                          |
    | s09 | retry-parked        | the store refused a retry `retry-parked` with a `readyAt`          |
    | s10 | unmapped-item-type  | `work:next` returned a ready `spike` the frozen phase map omits    |
    | s11 | unmapped-item-type  | `work:next` returned a ready `chore` the frozen phase map omits    |
    | s12 | operator-interrupt  | SIGINT in the launcher body                                        |
    | s13 | operator-interrupt  | SIGTERM in the launcher body                                       |

  Examples: executable human-report matrix — detail lives here, not in frozen LoopState
    | row | stop id             | the report additionally names                                      | resume with                    |
    | p01 | uat-gate            | the uat session ref and that sign-off is human                      | aof work loop <scope> --resume |
    | p02 | uat-gate            | the story ref and its `counts.uat` fact                             | aof work loop <scope> --resume |
    | p03 | dependency-blocked  | the ref and its `waitingOn` refs                                    | aof work loop <scope> --resume |
    | p04 | dependency-blocked  | the held ref and its `skipped` holders verbatim                     | aof work loop <scope> --resume |
    | p05 | cap-exhausted       | the ref, resolved cap and gate findings                             | aof work loop <scope> --resume |
    | p06 | cap-exhausted       | the ref and store-reported attempt count                            | aof work loop <scope> --resume |
    | p07 | session-needs-input | the ref and captured session id                                     | aof work loop <scope> --resume |
    | p08 | run-not-retryable   | the ref and completed run's failure reason                          | aof work loop <scope> --resume |
    | p09 | retry-parked        | the ref and store answer's authoritative `readyAt`                  | aof work loop <scope> --resume |
    | p10 | unmapped-item-type  | the ref and ready item type `spike`                                 | aof work loop <scope> --resume |
    | p11 | unmapped-item-type  | the ref and ready item type `chore`                                 | aof work loop <scope> --resume |
    | p12 | operator-interrupt  | the ref in flight and the received SIGINT                           | aof work loop <scope> --resume |
    | p13 | operator-interrupt  | the ref in flight and the received SIGTERM                          | aof work loop <scope> --resume |

  Examples: what is deliberately NOT a stop id (ADR-005 §4, ADR-009 §6)
    | condition                                          | reaches the shell as | why                                              |
    | a wrong or infeasible scenario / fitness function  | session-needs-input  | a model judgment — the shell must not compute it |
    | an open decision that cannot be safely defaulted   | session-needs-input  | a model judgment — the shell must not compute it |
    | a retryable infra failure under the ceiling        | (no stop — in-loop)  | the store granted the retry; recovery, not a halt |
    | a `duplicate-run` refusal on a slipped self-trigger| (no stop — in-loop)  | the guard did its job; m20/ADR-006's rule stands  |
    | a red validate gate under the cap                  | (no stop — in-loop)  | that is the retry, not the exhaustion             |

  Examples: executable failure-reason matrix — the driver supplies only the reason; the store decides
    | row | driver failureReason | store's answer to the retry ask | loop's move                  | stop id           |
    | r01 | runtime_offline      | retry granted (attempt < cap)   | re-drive on the same lineage | (none)            |
    | r02 | timeout              | retry granted (attempt < cap)   | re-drive on the same lineage | (none)            |
    | r03 | session_limit        | retry-parked with readyAt       | halt, report store readyAt   | retry-parked      |
    | r04 | session_limit        | retry granted (past readyAt)    | re-drive on the same lineage | (none)            |
    | r05 | agent_error          | not-retryable                   | halt                         | run-not-retryable |
    | r06 | runtime_offline      | attempts-exhausted              | halt                         | cap-exhausted     |
    | r07 | timeout              | attempts-exhausted              | halt                         | cap-exhausted     |
    | r08 | (an unknown reason)  | not-retryable — fail closed     | halt                         | run-not-retryable |

  Examples: executable store-readiness matrix — the driver supplies no reset metadata
    | row | producer input                                                | fixture clock                 | recorded readyAt                | store answer                         |
    | q01 | complete with only `failureReason: session_limit`; default 60m park | 2026-08-17T12:00:00.000Z | 2026-08-17T13:00:00.000Z        | retry-parked with that exact readyAt |
    | q02 | retry the q01 parked run                                      | 2026-08-17T12:59:59.999Z      | 2026-08-17T13:00:00.000Z        | retry-parked with that exact readyAt |
    | q03 | retry the q01 parked run                                      | 2026-08-17T13:00:00.000Z      | 2026-08-17T13:00:00.000Z        | retry granted                        |
