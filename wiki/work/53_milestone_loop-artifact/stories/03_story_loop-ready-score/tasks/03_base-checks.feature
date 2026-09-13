@executable @cli @work @validate
Feature: The four base checks — `stream-coherent`, `cap-declared`, `memory-on`, `tasks-authored`, each with its evidence and each under doctor's own scope

  ADR-007 §5 freezes four ids and names each one's source, and each is answerable from data the
  command boundary already has or already reaches. `stream-coherent` passes when there are zero
  `error`-severity doctor findings in scope — and it is pinned to the SAME number the document
  prints beside it (`errors`, `src/commands/doctor.mjs:242`), so the check and the count can never
  drift apart; that number is the FINAL set, after the fabric-preflight finding is appended at the
  impure edge (`doctor.mjs:162-172`). `cap-declared` passes when `work.autonomous.maxAttempts` is
  DECLARED — the id says `declared`, and the built-in fallback at `src/commands/run-retry.mjs:62`
  (`?? 3`) is a fallback, not a declaration; a check that also passed on the fallback could never
  fail, and a check that cannot fail measures nothing. `memory-on` reads the one key the memory
  seam itself reads (`selectBackendName`, `src/work-memory.mjs:62-65`), whose own rule is that an
  absent backend IS `"none"` — so an absent block, an absent key and an explicit `"none"` are one
  fact spelled three ways, and all three are memory OFF. `tasks-authored` passes when every
  in-scope STORY carries a task payload under `tasks/` — and ADR-010 §13 OVERRULED this contract on
  which door answers that. It is `buildSnapshot`'s own per-story `hasTasks`
  (`src/work-doctor.mjs:281`), read off the ONE snapshot doctor already builds, never an N-invoke
  `work:tasks` fan-out. The one-door rule yields here, and it yields to a measurement rather than
  to taste: driving `invoke("work:tasks", {ref})` for all 185 stories in this repo's stream costs
  3,214 ms against a 1,157 ms `aof work doctor --json` baseline — a 3.8× regression on the health
  command, on every unscoped run, for one advisory row in a score that gates nothing. A FOURTH
  scope parser is refused BY NAME for the same reason — three is what this milestone ledgered as
  TECH_DEBT item 49 — so `src/work-doctor.mjs` gains exactly two additive lines and no more: the
  `export` keyword on `inScope` (`:455`) and `options.snapshot ??` on the snapshot build (`:514`).
  The predicate that buys is LOOSER than `work:tasks`' and knowingly so: `hasTaskFiles`
  (`:138-144`) counts ANY regular file under `tasks/`, so a `tasks/` holding only `notes.md` reads
  `pass` here while `aof work tasks <ref>` correctly reports zero tasks. That is doctor's existing
  semantics for `started-story-no-tasks` (`src/work-doctor-coherence.mjs:322-330`), this story does
  not change a shipped check's meaning in flight, and the divergence is ledgered as TECH_DEBT item
  51 rather than hidden. Scope cuts unevenly and deliberately: `tasks-authored` is scoped by
  doctor's own now-EXPORTED `inScope` (`src/work-doctor.mjs:455-463`, which unlike `nextWork`'s
  DOES handle `NN/SS` — TECH_DEBT item 49), `stream-coherent` follows the scoped finding set (including the
  workDir-anchored stream-level findings doctor always reports, `work-doctor.mjs:465-481`), and
  `cap-declared` and `memory-on` are config-wide and therefore scope-invariant. Mechanised as
  `test/loop-ready-base-checks.test.mjs` — a NEW suite reusing `test/doctor-command-core.test.mjs`'s
  harness SHAPE, that file's ONLY edit being ADR-014's one-line envelope widening (superseding
  ADR-011 §3) — over a `mkdtemp` fixture repo
  whose `.aof/aof.config.json` and `wiki/work/` item tree are rewritten per row, driven through
  `loadWorkspace` + `invoke("work:doctor", …)` and through a spawned `aof work doctor [scope] --json`,
  under an isolated `AOF_GLOBAL_HOME`, and imported AND spread in `scripts/test.mjs` inside this
  story's own labelled `// milestone 53 / story 03` block so the evidence lands with the contract
  (ADR-011 §1, TECH_DEBT item 48).
  ADR-007 §5; ADR-010 §12 and §13; ADR-005 §5 (one door, one answer); RESEARCH §Q5.

  Scenario: `stream-coherent` is pinned to the document's own `errors` count
    Given any fixture work stream
    When `aof work doctor --json` runs
    Then `checks[stream-coherent].state` is `pass` exactly when `errors` is 0
    And it is `fail` exactly when `errors` is greater than 0
    And the two can never disagree, because they are the same measurement

  Scenario: `stream-coherent` counts `error` severity only — warnings never fail it
    Given a fixture producing 6 `warn`-severity doctor findings and no `error`-severity finding
    When `aof work doctor --json` runs
    Then `checks[stream-coherent].state` is `pass`
    And its `evidence` names 0 error-severity findings
    And `--strict` does not change the state — the face's gate is not the check's input

  Scenario: `stream-coherent` fails on one error finding and names the count
    Given a fixture producing 1 `error`-severity doctor finding
    When `aof work doctor --json` runs
    Then `checks[stream-coherent].state` is `fail`
    And its `evidence` names the count of error-severity findings in scope
    And `blocking` names `stream-coherent`

  Scenario: `stream-coherent` reads the scoped finding set
    Given a fixture with milestones 00 and 01, and an `error`-severity finding anchored inside 01 only
    When `aof work doctor 00 --json` runs
    Then `checks[stream-coherent].state` is `pass` — the finding is out of scope
    And when `aof work doctor 01 --json` runs the state is `fail`
    And when `aof work doctor --json` runs unscoped the state is `fail`

  Scenario: a stream-level error finding fails `stream-coherent` under EVERY scope
    Given a fixture producing an `error`-severity finding anchored at the work directory itself
    When `aof work doctor --json`, `aof work doctor 00 --json` and `aof work doctor 00/01 --json` each run
    Then `checks[stream-coherent].state` is `fail` in all three
    And this follows from doctor's own rule that a workDir-anchored finding is always reported

  Scenario: `cap-declared` passes on a declared ceiling and names the value
    Given a fixture whose config declares `work.autonomous.maxAttempts: 3`
    When `aof work doctor --json` runs
    Then `checks[cap-declared].state` is `pass`
    And its `evidence` names the declared value 3

  Scenario: `cap-declared` fails when the key is absent — the fallback is not a declaration
    Given a fixture whose config declares no `work.autonomous` block
    When `aof work doctor --json` runs
    Then `checks[cap-declared].state` is `fail`
    And its `evidence` names the key `work.autonomous.maxAttempts`
    And it names the value the retry path would otherwise fall back to
    And the check does not pass merely because a fallback exists

  Scenario: `memory-on` passes on a declared backend and names it
    Given a fixture whose config declares `memory.backend: "local"`
    When `aof work doctor --json` runs
    Then `checks[memory-on].state` is `pass`
    And its `evidence` names `local`

  Scenario: `memory-on` fails on absence, and an explicit `none` is the same fact said out loud
    Given a fixture whose config declares no `memory` block
    When `aof work doctor --json` runs
    Then `checks[memory-on].state` is `fail`
    And its `evidence` names the resolved backend `none`
    And a fixture declaring `memory.backend: "none"` produces the identical state and the identical evidence

  Scenario: `memory-on` does not adjudicate backend names
    Given a fixture whose config declares `memory.backend: "not-a-registered-backend"`
    When `aof work doctor --json` runs
    Then `checks[memory-on].state` is `pass`
    And its `evidence` names the declared backend verbatim
    And the score does not re-decide what the memory seam's own registry admits — a second checklist beside `BACKEND_REGISTRY` is exactly what this story must not build

  Scenario: `tasks-authored` passes when every in-scope story carries at least one task feature
    Given a fixture milestone with three stories, each holding at least one `tasks/*.feature`
    When `aof work doctor --json` runs
    Then `checks[tasks-authored].state` is `pass`
    And its `evidence` names 3 of 3 in-scope stories

  Scenario: `tasks-authored` fails and names a story that has none
    Given a fixture milestone with three stories, one of which has no `tasks/` directory
    When `aof work doctor --json` runs
    Then `checks[tasks-authored].state` is `fail`
    And its `evidence` names how many in-scope stories carry a task feature out of how many exist
    And it names at least one story ref that carries none
    And `blocking` names `tasks-authored`

  Scenario: `tasks-authored` counts a story regardless of its status
    Given a fixture milestone whose only story is `not-started` and has no `tasks/` directory
    When `aof work doctor --json` runs
    Then `checks[tasks-authored].state` is `fail`
    And a story is in scope for this check from the moment it exists, not from the moment it starts

  Scenario: `tasks-authored` counts STORIES only
    Given a fixture holding a milestone, a uat item, a spike and a chore, none with a `tasks/` directory
    And one story that does carry a task feature
    When `aof work doctor --json` runs
    Then `checks[tasks-authored].state` is `pass`
    And its `evidence` counts 1 of 1 — the four non-story items are not counted
    And no non-story ref is named

  Scenario: `tasks-authored` is answered by doctor's own snapshot, and the looseness that buys is ledgered
    Given a fixture story whose `tasks/` directory holds only `notes.md` and `README.txt`
    When `aof work doctor --json` runs
    Then `checks[tasks-authored].state` is `pass` — `hasTaskFiles` counts ANY regular file under `tasks/`
    And the answer comes from `buildSnapshot`'s per-story `hasTasks` (`src/work-doctor.mjs:281`), never from an N-invoke `work:tasks` fan-out and never from a second feature parse
    And `aof work tasks <ref>` still reports zero tasks for that same story — two answers to one question, left standing deliberately as TECH_DEBT item 51 rather than changed in flight
    And ADR-010 §13 ruled this way on a measurement: 3,214 ms for 185 stories against a 1,157 ms doctor baseline, a 3.8× regression on the health command for one advisory row

  Scenario: `tasks-authored` on a scope with no stories passes vacuously, and says so
    Given a fixture work stream with no milestone numbered 99
    When `aof work doctor 99 --json` runs
    Then `checks[tasks-authored].state` is `pass`
    And its `evidence` names 0 of 0 in-scope stories
    And an unresolved scope is not an error — it is an empty item set, exactly as doctor's own scope contract says

  Scenario: `cap-declared` and `memory-on` are scope-invariant
    Given a fixture whose config declares neither `work.autonomous.maxAttempts` nor `memory.backend`
    When `aof work doctor --json`, `aof work doctor 00 --json`, `aof work doctor 00/01 --json` and `aof work doctor 99 --json` each run
    Then `checks[cap-declared].state` is `fail` in all four
    And `checks[memory-on].state` is `fail` in all four
    And a scope narrows the stream, never the config

  Scenario: the score respects doctor's own scope filter, including `NN/SS`
    Given a fixture milestone 00 with stories `00/00` (one task feature) and `00/01` (none)
    When `aof work doctor 00/00 --json` runs
    Then `checks[tasks-authored].state` is `pass`
    And when `aof work doctor 00/01 --json` runs the state is `fail`
    And when `aof work doctor 00 --json` runs the state is `fail`
    And a story-shaped scope is honoured, not silently widened to the whole stream

  Scenario: every base row carries a non-empty evidence string in both states
    Given the fixtures of every row of the tables below
    When `aof work doctor --json` runs over each
    Then all four base rows are present in every run
    And every one carries a non-empty `evidence`
    And a passing row's evidence names the measured fact, not merely the word `ok`

  Examples: `cap-declared` over the declared value, exhaustively
    | `work.autonomous.maxAttempts` as declared | state | evidence names            |
    | 3                                         | pass  | 3                         |
    | 1                                         | pass  | 1                         |
    | 0                                         | pass  | 0                         |
    | 99                                        | pass  | 99                        |
    | key absent, `autonomous` block present    | fail  | the key and the fallback  |
    | `autonomous` block absent                 | fail  | the key and the fallback  |
    | `work` block absent                       | fail  | the key and the fallback  |
    | no config file at all                     | fail  | the key and the fallback  |
    | null                                      | fail  | the declared value        |
    | "3" — a string                            | fail  | the declared value        |
    | 2.5                                       | fail  | the declared value        |
    | -1                                        | fail  | the declared value        |
    | true                                      | fail  | the declared value        |
    | [] — an array                             | fail  | the declared value        |

  Examples: `memory-on` over the config, exhaustively
    | config `memory` block          | resolved backend | state |
    | `{ "backend": "local" }`       | local            | pass  |
    | `{ "backend": "graphify" }`    | graphify         | pass  |
    | `{ "backend": "unregistered" }`| unregistered     | pass  |
    | `{ "backend": "none" }`        | none             | fail  |
    | `{ "backend": "" }`            | "" — empty       | fail  |
    | `{ "backend": null }`          | none             | fail  |
    | `{ }`                          | none             | fail  |
    | block absent                   | none             | fail  |
    | `"local"` — a string, not object| none            | fail  |
    | no config file at all          | none             | fail  |

  Examples: `tasks-authored` over the in-scope story set — the predicate is `buildSnapshot`'s `hasTasks` (ADR-010 §13)
    | in-scope stories | stories doctor's snapshot reports `hasTasks` | state | evidence names |
    | 0                | 0                                           | pass  | 0 of 0         |
    | 1                | 1                                           | pass  | 1 of 1         |
    | 3                | 3                                           | pass  | 3 of 3         |
    | 1                | 0 — no `tasks/` directory                   | fail  | 0 of 1 + the ref |
    | 1                | 0 — empty `tasks/` directory                | fail  | 0 of 1 + the ref |
    | 1                | 1 — `tasks/` holds `notes.md` only          | pass  | 1 of 1 — any regular file counts (TECH_DEBT item 51) |
    | 3                | 2                                           | fail  | 2 of 3 + the ref |
    | 3                | 0                                           | fail  | 0 of 3 + the refs |
    | 1 story with 5 task features | 1                             | pass  | 1 of 1         |

  Examples: what each scope form moves
    | scope argument      | `stream-coherent` reads                              | `tasks-authored` measures            | `cap-declared` | `memory-on` | the five 52 rows |
    | absent              | every finding                                        | every story in the stream            | invariant      | invariant   | invariant        |
    | `00`                | 00's subtree + every workDir-anchored finding        | every story whose parent is 00       | invariant      | invariant   | invariant        |
    | `00/01`             | story 00/01 + every workDir-anchored finding        | exactly story 00/01                  | invariant      | invariant   | invariant        |
    | a slug substring    | every item whose slug contains it + workDir-anchored | every story whose slug contains it   | invariant      | invariant   | invariant        |
    | `99` — unresolved   | the workDir-anchored findings only                   | nothing — passes vacuously           | invariant      | invariant   | invariant        |
