@executable @cli @work @work-stream
Feature: The phase map — dispatch from `work:next`'s answer to which prompt runs, and nothing else

  ADR-005 §5's table, frozen, transcribed from `autonomous.md:60-81` without addition, and
  decided by code instead of read by a model. It is DISPATCH — which existing prompt runs
  next — never phase logic: `/aof:refine`, `/aof:continue` and `/aof:verify` are unchanged
  byte-for-byte and this module knows nothing about what any of them does (ADR-009 §5). Its
  whole input is plain data: `work:next`'s result VERBATIM (`{state, ref, type, slug,
  status, path, waitingOn?, skipped?}` — `src/work.mjs:862-869, 1011`, `src/commands/
  next.mjs:70-86`), `work:tasks`'s result verbatim for the ref (`{ref, tasks: [{file,
  feature, scenarios, counts}]}` — `src/commands/tasks.mjs:44-49`), a `{total, done}` story
  count the caller sources from the registered `work:list` (rows carry `type`, `parent` and
  `status`, `src/work.mjs:630-637`), and the last phase this loop drove for this ref. From
  `work:tasks` the engine reads exactly two things — how many tasks there are, and each
  task's `counts.uat` — so `hasTasks` and the `@uat` gate come through ONE registered door
  (ADR-005 §5's second decision): never `work-doctor.mjs`'s `hasTaskFiles` (a check-engine
  internal), never a second feature parser beside `src/feature-parse.mjs`, never the disk.
  Two things the table does NOT re-derive, deliberately: a ready story's `status` (the walk
  already skipped every done story, `src/work.mjs:979`) and whether a ready milestone's
  stories are all done (the walk offers a milestone ONLY when it has no stories or every
  story is done, `src/work.mjs:963-1008`) — re-checking what the one door guarantees is the
  second-answer disease ADR-003 §2 forbids, so the milestone rows key on `stories.total`
  alone. `spike` and `chore` HALT rather than guess: m37 added those types after the prose
  mapper was written, and a shell that invents a phase for an unmapped class is the shell
  encoding judgment (ADR-005 §5, ADR-009 §6) — the halt names the gap, and a one-row fix
  closes it later. Mechanised as `test/work-loop-phase-map.test.mjs`: a table-driven suite
  exporting `{ name, run }` over frozen literal fixtures — no tmpdir, no spawn, no clock —
  registered in `scripts/test.mjs` with this story (TECH_DEBT item 48). ADR-005 §3/§4/§5,
  ADR-003 §2, ADR-009 §5/§6, as measured by RESEARCH §Q3 and §Q7.

  Scenario: `work:next` answering `done` ends the loop
    Given `work:next` returned `{ state: "done" }`
    When the engine decides
    Then the act is `done`
    And no `ref` and no `phase` are decided
    And no stop is decided — a finished scope is not a halt

  Scenario: `work:next` answering `blocked` halts and reports what it waits on
    Given `work:next` returned `{ state: "blocked", ref: "54", type: "milestone", waitingOn: ["53"] }`
    When the engine decides
    Then the act is `halt`
    And the stop is `dependency-blocked`
    And the producer names `work:next` returning `state: "blocked"`
    And the decision carries `waitingOn: ["53"]` verbatim from `work:next`
    And it carries the blocked `ref`

  Scenario: `work:next` answering `held` halts too — being worked elsewhere is not being done
    Given `work:next` returned `{ state: "held", skipped: [{ ref: "53/02", holderNode: "aof-wsl" }] }`
    When the engine decides
    Then the act is `halt`
    And the stop is `dependency-blocked`
    And the producer names `work:next` returning `state: "held"` — a fact from the command, not a message match
    And the decision carries the `skipped` rows verbatim, so the operator can see who holds it
    And the act is not `done` — reporting done over work another node is doing is the invisible-item failure with a friendly face

  Scenario: a ready milestone with no stories is refined
    Given `work:next` returned a ready `milestone` `53`
    And `work:list` reports `stories: { total: 0, done: 0 }` for it
    When the engine decides
    Then the act is `drive` with phase `refine`
    And the `ref` is `53`

  Scenario: a ready milestone whose stories exist is verified — the walk already guaranteed they are done
    Given `work:next` returned a ready `milestone` `53`
    And `work:list` reports `stories: { total: 6, done: 6 }` for it
    When the engine decides
    Then the act is `drive` with phase `verify`
    And the `ref` is `53`
    And the decision did not re-check any story's status — `nextWork` offers a milestone ready only when no story remains open (`src/work.mjs:963-1008`)

  Scenario: a ready story with no tasks is refined
    Given `work:next` returned a ready `story` `53/01`
    And `work:tasks` returned `{ ref: "53/01", tasks: [] }`
    When the engine decides
    Then the act is `drive` with phase `refine`
    And the `ref` is `53/01`

  Scenario: a ready story with tasks is continued
    Given `work:next` returned a ready `story` `53/01`
    And `work:tasks` returned two tasks, each with `counts: { executable: 9, manual: 0, uat: 0 }`
    And this loop has driven no phase for `53/01` yet
    When the engine decides
    Then the act is `drive` with phase `continue`
    And the `ref` is `53/01`
    And the decided cycle for `(53/01, continue)` is 1

  Scenario: the story sequence is continue, then the deterministic gate, then verify
    Given a ready story with tasks
    When the engine is asked in turn after each phase completes
    Then it decides `drive continue`, then `gate`, then `drive verify`
    And it never decides `drive verify` before the gate has run (ADR-005 §6)

  Scenario: a ready story whose tasks carry a `@uat` scenario halts AFTER verify, not before
    Given `work:next` returned a ready `story` `53/04`
    And `work:tasks` returned a task with `counts: { executable: 4, manual: 1, uat: 1 }`
    And this loop has driven no phase for `53/04` yet
    When the engine decides
    Then the act is `drive` with phase `continue` — the uat gate is not an excuse to skip the build
    And when the same story is offered again with the last driven phase `verify`
    Then the act is `halt` with stop `uat-gate`
    And the producer names `work:tasks` `counts.uat`
    And the decision carries the `ref` and the uat count

  Scenario: a ready `uat` session item halts at the gate and names the by-hand alternative
    Given `work:next` returned a ready item of type `uat`, ref `47`
    When the engine decides
    Then the act is `halt` with stop `uat-gate`
    And the producer names `work:next` returning `type: "uat"`
    And the decision names `aof work drive verify 47` as the way to drive the session's automated lanes by hand
    And no phase is decided — a session's sign-off is human and the shell never self-signs

  Scenario: a ready `spike` halts as an unmapped type rather than guessing a phase
    Given `work:next` returned a ready item of type `spike`, ref `51`
    When the engine decides
    Then the act is `halt` with stop `unmapped-item-type`
    And the producer names `work:next`'s `type` value `spike`
    And the decision carries the unmapped type verbatim, so the missing table row is named
    And no phase is decided

  Scenario: a ready `chore` halts the same way
    Given `work:next` returned a ready item of type `chore`, ref `49`
    When the engine decides
    Then the act is `halt` with stop `unmapped-item-type` naming `chore`

  Scenario: a type nobody has mapped yet halts rather than falling through
    Given `work:next` returned a ready item whose `type` is `epic`
    When the engine decides
    Then the act is `halt` with stop `unmapped-item-type` naming `epic`
    And the decision is not `drive continue` — an unmapped type never falls through to a default phase

  Scenario: the predicates come from the input, never from the disk
    Given `work:next` returned a ready `story` `53/01`
    And `work:tasks` returned `{ ref: "53/01", tasks: [] }`
    And the real `53/01` folder on disk holds six `.feature` files
    When the engine decides
    Then the act is `drive` with phase `refine` — the input is authoritative
    And the decision is identical when the process runs from a directory with no work stream at all

  Scenario: the engine reads only two fields of `work:tasks`'s answer
    Given two `work:tasks` results identical in `tasks.length` and every `counts.uat`, differing in `feature`, `file`, `scenarios` and `counts.executable`
    When the engine decides for each
    Then the two decisions serialise byte-identically
    And a `work:tasks` result carrying `fromWorker: true` and `answeredFrom: "cache"` decides identically to a local one — provenance is not a dispatch key

  Scenario: a ready story's `status` is not a dispatch key
    Given a ready `story` with tasks and no phase driven
    When the engine decides for `status` `not-started`, `in-progress`, `blocked` and `in-review` in turn
    Then all four decide `drive continue`
    And the four decisions differ in nothing but the `status` they carry through

  Scenario: `work:next`'s answer is carried through, never re-derived
    Given any `work:next` result
    When the engine decides
    Then every field of `work:next`'s answer that the decision reports is byte-identical to the input
    And the engine derives no `ref` of its own, resolves no path, and walks no stream

  Examples:
    | next.state | item type | stories total | hasTasks | counts.uat | last phase | decision                            |
    | done       | —         | —             | —        | —          | —          | act done                            |
    | blocked    | milestone | —             | —        | —          | —          | halt dependency-blocked + waitingOn |
    | blocked    | story     | —             | —        | —          | —          | halt dependency-blocked + waitingOn |
    | held       | —         | —             | —        | —          | —          | halt dependency-blocked + skipped   |
    | ready      | milestone | 0             | —        | —          | none       | drive refine                        |
    | ready      | milestone | 6 (all done)  | —        | —          | none       | drive verify                        |
    | ready      | milestone | 3 (unreachable — the walk offers the STORY) | — | — | none | drive verify         |
    | ready      | story     | —             | false    | 0          | none       | drive refine                        |
    | ready      | story     | —             | false    | 2          | none       | drive refine — no tasks, no gate    |
    | ready      | story     | —             | true     | 0          | none       | drive continue                      |
    | ready      | story     | —             | true     | 2          | none       | drive continue                      |
    | ready      | story     | —             | true     | 0          | refine     | drive continue                      |
    | ready      | story     | —             | true     | 0          | continue   | gate                                |
    | ready      | story     | —             | true     | 2          | continue   | gate                                |
    | ready      | story     | —             | true     | 2          | verify     | halt uat-gate                       |
    | ready      | story     | —             | true     | 1          | verify     | halt uat-gate                       |
    | ready      | story     | —             | true     | 0          | verify     | drive verify — bounded by the (ref, phase) cycle cap, task 04 |
    | ready      | uat       | —             | —        | —          | —          | halt uat-gate                       |
    | ready      | spike     | —             | —        | —          | —          | halt unmapped-item-type             |
    | ready      | chore     | —             | —        | —          | —          | halt unmapped-item-type             |
    | ready      | task      | —             | —        | —          | —          | halt unmapped-item-type             |
    | ready      | epic (unknown) | —        | —        | —          | —          | halt unmapped-item-type             |
    | ready      | absent    | —             | —        | —          | —          | halt unmapped-item-type             |

  Examples:
    | predicate         | its ONE source                                                         |
    | hasTasks          | `work:tasks` result — `tasks.length > 0` (`src/commands/tasks.mjs`)     |
    | the `@uat` gate   | `work:tasks` result — each task's `counts.uat` (`tasks.mjs:44-49`)      |
    | stories total     | `work:list` rows with `parent` = the milestone (`src/work.mjs:630-637`) |
    | ref / type / state| `work:next`, verbatim (`src/work.mjs:862-869`)                          |
    | NOT a source      | `work-doctor.mjs`'s `hasTaskFiles` — a check-engine internal            |
    | NOT a source      | any `.feature` file read or parse                                      |
    | NOT a source      | the filesystem, the clock, or the process environment                  |
