@executable @cli @work @work-stream
Feature: The gate order and the bound — deterministic before model, and a cap the engine reads but never chooses

  `GATE_ORDER` is frozen at ADR-005 §6 and 54 depends on it: `drive continue` → `work:validate
  <ref>` (deterministic, no model turn) → on findings, re-`drive continue` carrying them, up
  to `cap` → `drive verify`. "Deterministic before model" is 54's headline and it is true
  here by construction rather than by promise — `validate` is the only gate 53 runs, and the
  engine cannot be talked out of running it: a session that reports itself done still gets
  the gate next. The BOUND is this shell's whole reason for existing. `SPEC §Objective` opens
  by calling today's cap unenforceable — *"it is an instruction a model may skip"* — and
  RESEARCH §Q7 confirmed it at the source: `autonomous.md:14`'s `maxAttempts` is prose, with
  no code path that stops a model mid-turn. Here it is arithmetic. The cycle is 1-based and
  scoped to a `(ref, phase)` pair exactly as `brief.loop.cycle` defines it (ADR-004 §2), so
  ONE rule bounds every repeat: the engine never decides a `drive` for a `(ref, phase)` whose
  cycle has already reached the cap — it halts `cap-exhausted`. That covers the gate retry
  and it also closes the no-progress case (a phase driven, the stream not advanced, the same
  item offered again), which is the only way this design could spin. The comparison is the
  run store's own, deliberately: `shouldRetry` fails closed at `record.attempt >= maxAttempts`
  (`src/run-store.mjs:141-143`), so `cap: 1` means one attempt and no retry, in both homes.
  The engine READS the cap: ADR-009 §1 rules that this milestone adds no new cap, no new
  key, no new default and no new resolution site — `work.autonomous.maxAttempts` (default 3)
  is resolved by `src/commands/loop.mjs`, from the same key `src/commands/run-retry.mjs:62`,
  `src/commands/resume.mjs:119` and `src/commands/run-start.mjs:200` already read. So an
  unresolved or nonsensical bound is a
  coded refusal here, never a quiet `3`: a default invented in the engine would be a second
  home for the number the whole milestone exists to give one home (FF-5310).
  `loop-bound-unresolved` is a member of the frozen `LOOP_REFUSALS` set beside `LOOP_STOPS`, and
  deliberately NOT of `LOOP_STOPS` itself, so FF-5304's frozen eight is untouched (ADR-010 §5/§10a).
  The cap key's readers are the measured three — `src/commands/run-retry.mjs:62`,
  `src/commands/resume.mjs:119` and `src/commands/run-start.mjs:200` — plus
  `src/commands/loop.mjs`, which is the set FF-5310 is armed at. 53 ships no
  rubric — the findings a red gate produces are carried into the re-drive VERBATIM, and 54
  replaces that payload with its structured feedback without touching the order or the bound
  (ADR-009 §2). Mechanised as `test/work-loop-gate-order.test.mjs`: a table-driven suite
  exporting `{ name, run }` over frozen literal fixtures — no tmpdir, no spawn, no clock —
  registered in `scripts/test.mjs` with this story (TECH_DEBT item 48). ADR-005 §6, ADR-004
  §2, ADR-009 §1/§2.

  Scenario: `GATE_ORDER` is exported frozen and the decisions follow it
    Given the exported `GATE_ORDER`
    When it is read
    Then it is the frozen sequence `drive continue` → `gate` → `drive verify`
    And the gate step names `work:validate` — the one deterministic gate 53 runs
    And it names no model turn, no rubric and no grader

  Scenario: a completed continue is followed by the gate, never by verify
    Given a ready story with tasks whose last driven phase is `continue`, resolved `{ outcome: "done" }`
    And no gate result yet for that ref
    When the engine decides
    Then the act is `gate`
    And the `ref` is carried through
    And the act is not `drive verify` — nothing reaches verify without passing the deterministic gate first

  Scenario: a session that declares itself finished cannot skip the gate
    Given a `continue` session that resolved `{ outcome: "done", declared: true }`
    When the engine decides
    Then the act is `gate`
    And the decision reads no claim the session made about its own quality

  Scenario: a clean gate advances to verify
    Given a story whose gate ran with 0 findings at cycle 1, cap 3
    When the engine decides
    Then the act is `drive` with phase `verify`
    And no stop is decided
    And the cycle for `(ref, verify)` starts at 1

  Scenario: a red gate re-drives continue below the cap, carrying the findings
    Given a story whose gate reported 2 findings at cycle 1, cap 3
    When the engine decides
    Then the act is `drive` with phase `continue`
    And the decided cycle is 2
    And the gate's findings are carried into the decision verbatim
    And the engine neither summarises, ranks nor rewrites them — the rubric is 54's

  Scenario: a red gate at the cap halts, and says which bound was hit
    Given a story whose gate reported 2 findings at cycle 3, cap 3
    When the engine decides
    Then the act is `halt` with stop `cap-exhausted`
    And the producer names the engine's own `cycle === cap` fact, not the run store
    And the decision carries the `ref`, the `phase`, the `cycle` and the resolved `cap`
    And no further `drive` is decided

  Scenario: the bound fails closed above the cap as well as at it
    Given a story whose gate reported findings at cycle 4, cap 3
    When the engine decides
    Then the act is `halt` with stop `cap-exhausted`
    And the comparison is `cycle >= cap`, the same fail-closed shape as `shouldRetry` (`src/run-store.mjs:141-143`)

  Scenario: `cap: 1` means one attempt and no retry
    Given a story whose gate reported findings at cycle 1, cap 1
    When the engine decides
    Then the act is `halt` with stop `cap-exhausted`
    And no `drive continue` at cycle 2 is decided

  Scenario: the cycle is per `(ref, phase)`, never per loop and never per item
    Given `53/01` at `(continue, cycle 3)` with cap 3, and `53/02` never driven
    When the engine decides for each
    Then `53/01` halts `cap-exhausted`
    And `53/02` decides `drive continue` at cycle 1
    And a spent cycle on one ref never bounds another, and a spent `continue` cycle never bounds that ref's `verify`

  Scenario: the same `(ref, phase)` offered again beyond the cap halts rather than spinning
    Given a ready story whose last driven phase is `verify` at cycle 3, with cap 3, and no `@uat` scenario
    When the engine decides
    Then the act is `halt` with stop `cap-exhausted`
    And the producer names the repeated `(ref, phase)` reaching the cap
    And no `drive verify` is decided — a phase that ran without advancing the stream is bounded by the same one rule

  Scenario: the engine reads the cap and never substitutes one
    Given an invocation with no `cap` at all
    When the engine decides
    Then the decision is a refusal with code `loop-bound-unresolved`
    And it names the field `cap`
    And it names `work.autonomous.maxAttempts` as the caller's resolution site
    And no decision anywhere reports a cap of 3 that the caller did not supply

  Scenario: a nonsensical cap is refused rather than clamped
    Given the caps `0`, `-1`, `2.5`, `"3"` and `null` in turn
    When the engine decides for each
    Then each is a refusal with code `loop-bound-unresolved` naming the field `cap`
    And no cap is rounded, floored, parsed or clamped into range

  Scenario: a nonsensical cycle is refused the same way
    Given a cap of 3 and the cycles `0`, `-1`, `1.5` and `"2"` in turn
    When the engine decides for each
    Then each is a refusal with code `loop-bound-unresolved` naming the field `cycle`
    And the engine's own first `drive` for a `(ref, phase)` always carries cycle 1, so a 0 never originates here

  Scenario: whatever cap the caller resolves is the cap enforced
    Given the caps 1, 2, 3, 5 and 10 in turn, each with a red gate at cycle 2
    When the engine decides for each
    Then cap 1 and cap 2 halt `cap-exhausted`
    And caps 3, 5 and 10 decide `drive continue` at cycle 3
    And the resolved cap is reported back in every decision, unchanged

  Scenario: the bound refusal precedes nothing and follows the level and the scope
    Given the level `L3`, an admitted scope and an absent cap
    When the engine decides the invocation
    Then the decision is a refusal with code `loop-level-locked`
    And given an admitted level, a refused scope and an absent cap, the refusal is `loop-scope-unsupported`
    And the bound is decided last, so a caller fixes one thing at a time in the order the refusals arrive

  Examples:
    | cap | cycle | gate result | decision                            |
    | 1   | 1     | 0 findings  | drive verify                        |
    | 1   | 1     | findings    | halt cap-exhausted                  |
    | 1   | 2     | findings    | halt cap-exhausted                  |
    | 1   | 2     | 0 findings  | drive verify                        |
    | 2   | 1     | 0 findings  | drive verify                        |
    | 2   | 1     | findings    | drive continue at cycle 2           |
    | 2   | 2     | 0 findings  | drive verify                        |
    | 2   | 2     | findings    | halt cap-exhausted                  |
    | 2   | 3     | findings    | halt cap-exhausted                  |
    | 3   | 1     | 0 findings  | drive verify                        |
    | 3   | 1     | findings    | drive continue at cycle 2           |
    | 3   | 2     | 0 findings  | drive verify                        |
    | 3   | 2     | findings    | drive continue at cycle 3           |
    | 3   | 3     | 0 findings  | drive verify                        |
    | 3   | 3     | findings    | halt cap-exhausted                  |
    | 3   | 4     | findings    | halt cap-exhausted                  |
    | 3   | 4     | 0 findings  | drive verify                        |

  Examples:
    | cap input     | decision                                          |
    | 1             | admitted — the bound is 1                         |
    | 3             | admitted — the bound is 3                         |
    | 10            | admitted — the bound is 10                        |
    | absent        | refused loop-bound-unresolved, field `cap`        |
    | `null`        | refused loop-bound-unresolved, field `cap`        |
    | `undefined`   | refused loop-bound-unresolved, field `cap`        |
    | 0             | refused loop-bound-unresolved, field `cap`        |
    | -1            | refused loop-bound-unresolved, field `cap`        |
    | 2.5           | refused loop-bound-unresolved, field `cap`        |
    | `"3"`         | refused loop-bound-unresolved, field `cap`        |
    | `Infinity`    | refused loop-bound-unresolved, field `cap`        |
    | `NaN`         | refused loop-bound-unresolved, field `cap`        |
    | `true`        | refused loop-bound-unresolved, field `cap`        |

  Examples:
    | step in GATE_ORDER | who runs it       | model turn? |
    | drive continue     | the phase prompt  | yes         |
    | gate               | `work:validate`   | no — deterministic, and the only gate 53 runs |
    | re-drive continue  | the phase prompt  | yes, bounded by cap                          |
    | drive verify       | the phase prompt  | yes                                          |
