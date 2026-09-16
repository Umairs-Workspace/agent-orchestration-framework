@executable @cli @work @work-stream
Feature: The `brief.loop` declaration and the resume reader — resumed, not restored

  ADR-004's central point is that the loop's POSITION is not state. `aof work next <scope>`
  re-derives "where am I" from the stream's own statuses on every tick, so persisting a
  position would create a second answer to a question the stream already answers — and the
  two would disagree the moment a human touched a status between a crash and a resume. So
  the loop persists a DECLARATION and never a position, and the declaration is the frozen
  seven-key envelope of ADR-004 §2 riding the `brief` bag of every run the loop mints —
  `brief` being a bag the run store already persists opaque and verbatim, never reshaped
  (`src/run-store.mjs:337, 352`). This task owns the SHAPE and the READER; the write itself
  is 53/02's, through the store's existing verbs, and `src/run-store.mjs` is not edited by
  this milestone at all (its 15 keys and 5 edges stay pinned by two loop-blind tests,
  RESEARCH §Q4). The reader implements ADR-004 §3(b): recover the most recent declaration in
  scope, take `{loopRunId, scope, level, cap, startedAt}` from it, let an explicit `--level`
  or `--cap` on the resume invocation WIN and an absent one INHERIT — and recover neither
  `phase` nor `cycle`, which are precisely the position, re-derived from `work:next` and the
  item's own runs instead. A loop that minted no runs has nothing to recover, and that is
  correct rather than an error: there is nothing to resume, and the reader says so out loud
  rather than resuming a fiction. Everything here is `(plain data) => decision`: the
  declarations arrive as an array of run records' `{runId, createdAt, brief}` — the engine
  opens no store, and the "most recent" answer is arithmetic over data the caller read, with
  a code-unit lexicographic tie-break (52/ADR-013 §1's sort rule, never locale collation) so
  two runs stamped the same millisecond still decide one way, always. The engine reads no
  clock, so `startedAt` is an input on the way in and an inherited value on the way back.
  Mechanised as `test/work-loop-declaration.test.mjs`: a table-driven suite exporting
  `{ name, run }` over frozen literal fixtures — no tmpdir, no spawn, no clock — registered
  in `scripts/test.mjs` with this story (TECH_DEBT item 48). ADR-004 §1–§3, ADR-005 §3,
  ADR-006 §5, ADR-009 §1.

  Scenario: the envelope is exactly the frozen seven keys, in the frozen order
    Given an admitted invocation at scope `53`, level `L2`, cap 3, driving `refine` at cycle 1
    When the engine builds the declaration
    Then its key set is exactly `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle`, `startedAt`
    And they serialise in that order, in every process
    And no eighth key appears for any input

  Scenario: every value in the envelope is an input, carried through
    Given the loop run id `lr-7`, the scope `50-53`, level `L2`, cap 3, phase `continue`, cycle 2 and `startedAt` `2026-08-15T00:52:42.569Z`
    When the engine builds the declaration
    Then each value is byte-identical to its input
    And `scope` is the admitted string verbatim, so what the guard admitted is what durable state carries
    And `startedAt` came from the caller — the engine never reads a clock to stamp one

  Scenario: nothing that looks like a position ever enters the envelope
    Given an invocation whose input also carries `ref`, `path`, `cursor`, `index` and `lastRef`
    When the engine builds the declaration
    Then none of those keys appears in it
    And the envelope's key set is still exactly the frozen seven
    And `phase` and `cycle` are the run's OWN facts, not the loop's place in the stream

  Scenario: a declaration cannot exist for a refused invocation
    Given the scope `53/02`, or the level `L3`, or an absent cap
    When the engine is asked for a declaration
    Then no envelope is built
    And the decision is the matching refusal — the guards decide before anything durable is shaped

  Scenario: the reader recovers exactly five keys — never the position
    Given a most-recent declaration `{ loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "2026-08-15T00:52:42.569Z" }`
    When the engine reads it for a resume
    Then the recovered declaration carries `loopRunId`, `scope`, `level`, `cap` and `startedAt`
    And it carries no `phase`
    And it carries no `cycle`
    And where the loop is gets re-derived from `work:next`, which is the whole of ADR-004 §1

  Scenario: the most recent declaration wins
    Given three runs in scope carrying declarations, created at `…T01:00Z`, `…T03:00Z` and `…T02:00Z`
    When the engine reads them for a resume
    Then the recovered declaration is the one from the `…T03:00Z` run
    And the other two are not merged into it

  Scenario: two declarations stamped the same instant still decide one way
    Given two runs with the identical `createdAt`, run ids `run-a` and `run-b`
    When the engine reads them for a resume
    Then the tie is broken by the greater run id under code-unit comparison — `run-b`
    And the same pair in the opposite array order decides identically

  Scenario: an explicit level on the resume invocation wins
    Given a recovered declaration with `level: "L2"`
    And a resume invocation carrying `--level L1`
    When the engine resolves the resume
    Then the resolved level is `L1`
    And the decision records that the level was overridden, not inherited

  Scenario: an absent level inherits the declaration's — including an L1 one
    Given a recovered declaration with `level: "L1"`
    And a resume invocation carrying no `--level`
    When the engine resolves the resume
    Then the resolved level is `L1`
    And it is not the absent-level default `L2` — a resumed report-only loop stays report-only
    And the decision records that the level was inherited

  Scenario: an explicit cap wins and an absent one inherits
    Given a recovered declaration with `cap: 3`
    When the engine resolves a resume carrying `--cap 5`
    Then the resolved cap is 5 and it is recorded as overridden
    And when the engine resolves a resume carrying no `--cap`
    Then the resolved cap is 3 and it is recorded as inherited

  Scenario: an explicit level that is locked is still refused on a resume
    Given a recovered declaration with `level: "L2"`
    And a resume invocation carrying `--level L3`
    When the engine resolves the resume
    Then the decision is a refusal with code `loop-level-locked` naming milestone 55
    And nothing is inherited — a resume is not a way around the lock

  Scenario: the loop run id and the start instant are inherited, never re-minted
    Given a recovered declaration `{ loopRunId: "lr-7", startedAt: "2026-08-15T00:52:42.569Z" }`
    When the engine resolves a resume
    Then the resolved `loopRunId` is `lr-7`
    And the resolved `startedAt` is `2026-08-15T00:52:42.569Z`
    And neither is generated here — one loop's runs stay one loop's runs, which is what makes the aggregate a one-key filter

  Scenario: no prior declaration at all is said out loud
    Given a scope whose runs carry no `brief.loop` at all
    When the engine reads them for a resume
    Then the recovered declaration is null
    And the decision says there is nothing to resume, naming the scope
    And it is not an error — a loop that halted before minting a run leaves no trace, and that is the documented cost of ADR-004
    And the level and cap fall back to the ordinary resolution: an absent level is `L2`, an absent cap is `loop-bound-unresolved`

  Scenario: an empty run list is the same answer
    Given no runs in scope at all
    When the engine reads them for a resume
    Then the recovered declaration is null and the decision says there is nothing to resume

  Scenario: a malformed declaration is skipped, not repaired
    Given the most recent run carries `brief` with no `loop` key
    And the run before it carries a complete declaration
    When the engine reads them for a resume
    Then the recovered declaration is the older, complete one
    And nothing is invented for the malformed one

  Scenario: a declaration missing any recovered key is not a usable declaration
    Given the most recent declaration is missing `cap`
    And the run before it carries all five recovered keys
    When the engine reads them for a resume
    Then the recovered declaration is the older, complete one
    And a partial declaration is never half-inherited

  Scenario: when no declaration is usable the answer is still null, never a merge of fragments
    Given three declarations, each missing a different recovered key
    When the engine reads them for a resume
    Then the recovered declaration is null
    And no key is taken from one and another key from a second

  Scenario: the resume invocation's scope is authoritative, and a difference is reported
    Given a recovered declaration with `scope: "50-53"`
    And a resume invocation at scope `53`
    When the engine resolves the resume
    Then the resolved scope is `53` — the string that passed the guard
    And the declaration's `50-53` is reported alongside it, so a narrowed resume is visible rather than silent

  Scenario: the reader opens nothing
    Given a declarations array read by the caller from the run store
    When the engine reads it
    Then the decision depends only on that array
    And the same array decides identically from any working directory, with or without a `runs/` folder anywhere on disk

  Examples:
    | envelope key | value                                                            |
    | loopRunId    | minted once per invocation by the caller; inherited on a resume  |
    | scope        | the admitted scope string, verbatim (task 00)                    |
    | level        | the resolved `L1` or `L2` (task 01) — `L3` never appears         |
    | cap          | the resolved gate-retry ceiling, read never chosen (task 04)     |
    | phase        | `refine`, `continue` or `verify` — which phase THIS run is       |
    | cycle        | the 1-based cycle index for this `(ref, phase)`                  |
    | startedAt    | the LOOP's start instant, ISO-8601 Z, supplied by the caller     |

  Examples:
    | resume field | explicit on the invocation | prior declaration | resolved                        |
    | level        | `L1`                       | `L2`              | L1, overridden                  |
    | level        | `L2`                       | `L1`              | L2, overridden                  |
    | level        | absent                     | `L2`              | L2, inherited                   |
    | level        | absent                     | `L1`              | L1, inherited                   |
    | level        | absent                     | none              | L2, the absent-level default    |
    | level        | `L3`                       | any               | refused loop-level-locked       |
    | level        | `l1`                       | any               | refused loop-level-unknown      |
    | cap          | 5                          | 3                 | 5, overridden                   |
    | cap          | absent                     | 3                 | 3, inherited                    |
    | cap          | absent                     | none              | refused loop-bound-unresolved   |
    | cap          | 0                          | 3                 | refused loop-bound-unresolved   |
    | loopRunId    | never explicit             | `lr-7`            | lr-7, inherited                 |
    | loopRunId    | never explicit             | none              | null — nothing to resume        |
    | startedAt    | never explicit             | an instant        | that instant, inherited         |
    | scope        | the admitted scope         | any               | the invocation's, with the declaration's reported beside it |
    | phase        | not a resume field         | present           | never recovered — position      |
    | cycle        | not a resume field         | present           | never recovered — position      |
