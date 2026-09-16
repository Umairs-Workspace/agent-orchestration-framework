@executable @cli @work @work-stream
Feature: The probe — `aof work loop <scope> --json` returns a frozen document, spawns nothing, writes nothing

  `work:loop` sits on the launcher seam (`src/spine/face.mjs:144-161`), and face policy checks
  `--json` BEFORE the seam is consulted (`face.mjs:154`): a launcher verb's machine face is its
  registered `run()`, which must therefore always be a promptly-returning PROBE. So the machine
  face of this command is not a stream of events and never will be — it resolves the scope, asks
  `work:next` ONCE, asks the pure engine what it WOULD do, and returns (ADR-005 §2). `--dry-run`
  is the HUMAN probe: the same document, rendered, with the launcher body deliberately not
  entered. `meshServeCommand` is the shipped precedent for both halves
  (`src/commands/mesh-serve.mjs:120-125, 153`).

  The document itself is a CONTRACT, not a render: milestones 54, 62 and 63 consume it, so
  ADR-005 §3 freezes its key set and this feature pins that key set EXACTLY — an extra key is as
  much a defect as a missing one. Three parts of it are load-bearing and each gets its own
  scenarios. `next` is `work:next`'s answer PASSED THROUGH VERBATIM (ADR-003 §2) — never
  re-derived, never trimmed, so every candidacy, lease and item-lock guard m26/m27/m43 added is
  inherited at every ready-return and a field this shell has never heard of survives the trip.
  `stops` carries the CLOSED eight-member set in full, on every answer, halted or not, because a
  downstream consumer that has to pattern-match a message to learn the vocabulary is m37/R2's
  measured failure. `resumable` REPORTS what a `--resume` would settle and settles none of it —
  a probe that reclaimed a stranded run would be a write, and this document is a read.

  A REFUSAL IS NOT THIS DOCUMENT, and ADR-010 §5 is why this contract changed. `state` is FOUR
  members — `ready`, `blocked`, `done`, `halted` — and the fifth this feature originally carried,
  `refused`, is STRUCK. A refused invocation produces no LoopState at all: the coded refusal raised
  out of `run()` reaches `--json` through the face's ONE error envelope (`emitJsonErrorEnvelope`,
  `src/spine/face.mjs:186-194`) as `{ok:false, error, code, …structuredDetail(error)}`, carrying
  none of the ten keys below, with `code` a member of the new frozen `LOOP_REFUSALS` four-member
  set (`loop-scope-unsupported` · `loop-level-locked` · `loop-level-unknown` ·
  `loop-bound-unresolved`) and a non-zero exit. Giving this document a `code` key instead would be
  the second face vocabulary `face.mjs:196-202` warns about in writing. Two documents, two shapes,
  told apart by `ok`; the refusal document's own scenarios are task 07's.

  THE SEAM. Every scenario drives the registered `work:loop` command over a temp-`AOF_GLOBAL_HOME`
  fixture work stream with the `{ptySpawn, which}` pair of
  `test/support/mesh-worker-terminal-fixture.mjs` injected through the declared seam
  `ctx.agentSessionDriverOptions` (ADR-010 §2), and asserts the fixture's `spawnCalls` array and
  the fixture tree's run records directly. "Spawns nothing" is proven at
  the seam that would have spawned; "writes nothing" is proven by reading the run history back
  through `work:run-status` and by the fixture's own file list.
  Mechanised as `test/loop-command-probe.test.mjs`, imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-005 §1–§4, ADR-003 §2, ADR-004 §3, ADR-009 §1, ADR-010 §2/§5, RESEARCH §Q2 and §Q8.

  Scenario: the machine face is a probe — zero spawns, zero run records, zero status writes
    Given a fixture work stream with milestone `03` in progress and story `03/01` ready
    And the injected `{ptySpawn, which}` pair, with `claude` resolving
    When I run `aof work loop 03 --json`
    Then exactly one JSON document is printed on stdout and it parses
    And zero spawn calls are recorded at the injected seam
    And no run record exists anywhere in the fixture that did not exist before
    And no item's status frontmatter changed
    And the process returns without waiting on any session, and exits 0

  Scenario: the document's key set is exactly ADR-005 §3's frozen contract
    Given the fixture stream
    When I run `aof work loop 03 --json`
    Then the document carries exactly the keys scope, level, cap, loopRunId, state, next, act, stops, resumable and driven
    And it carries no other key — no `ok`, no `error`, no `findings`, no timing bag
    And `act` carries exactly `act` plus whichever of ref, phase, stop and producer apply to that act
    And `resumable` carries exactly the keys stranded and lastDeclaration
    And `driven` is an empty array — a probe drove nothing
    And every key is present even when its value is empty or null: none is omitted to signal absence

  Scenario: `state` is drawn from the closed four and reports what the loop WOULD do
    Given a fixture stream whose scope answers ready, then blocked, then done on three fixtures
    When I run `aof work loop <scope> --json` against each
    Then `state` is one of ready, blocked, done or halted, and nothing else
    And no answer carries `state: "refused"` — ADR-010 §5 struck it, and a refusal emits no LoopState
    And a scope whose next ready item is a `uat` session reports `state: "halted"` with `act.stop` set
    And no probe reports `state: "halted"` without an `act.stop`, and none reports a stop outside the closed set

  Scenario: `next` is `work:next`'s answer, passed through verbatim
    Given a fixture stream where `aof work next 03 --json` answers ready `03/01`
    When I run `aof work loop 03 --json`
    Then `next` carries the same state, ref, type, slug, status and path `work:next` itself returned
    And `next.skipped` is present exactly as `work:next` emitted it, including when it is empty
    And no field of `next` is renamed, dropped, re-ordered into a different shape or recomputed

  Scenario: a `work:next` field this shell does not understand still arrives unchanged
    Given a fixture stream in which `work:next` answers ready with `reclaimable: true` and `leasedBy` set
    When I run `aof work loop 03 --json`
    Then `next.reclaimable` and `next.leasedBy` appear in the document unchanged
    And the loop's own `act` is decided without consulting them
    And nothing in the document contradicts what `aof work next 03 --json` says on its own

  Scenario: `stops` always carries the closed set in full
    Given the fixture stream
    When I run `aof work loop 03 --json` on a scope that halts nothing
    Then `stops` carries exactly the eight ids of ADR-005 §4 and no ninth
    And the same eight appear when the loop halts, when it is blocked and when it is done
    And their order is stable across repeated runs and across two separate processes
    And no stop id appears that the shell has no producer for

  Scenario: an emitted stop names the code or fact that produced it, never a message
    Given a fixture stream whose next ready item is a `uat` session
    When I run `aof work loop 03 --json`
    Then `act.act` is `halt` and `act.stop` is `uat-gate`
    And `act.producer` names the producing fact — `work:next` returned `type: "uat"`
    And `act.ref` is the uat session's own ref
    And the producer is a code or a named fact, never a substring of a rendered sentence

  Scenario: `resumable` reports what a resume would settle, and settles none of it
    Given a fixture stream carrying one `running` run record on `03/01`, silent past the staleness window
    When I run `aof work loop 03 --resume --json`
    Then `resumable.stranded` names that run with its ref, runId and node
    And `aof work run-status 03/01 --json` still reports that run as `running` — the probe reclaimed nothing
    And no `run.completed` consequence was raised
    And `resumable.lastDeclaration` is the most recent `brief.loop` declaration among the scope's runs, or null when there is none

  Scenario: `level` and `cap` are the RESOLVED values, and the cap is read, never chosen
    Given a fixture whose `.aof/aof.config.json` sets `work.autonomous.maxAttempts` to 3
    When I run `aof work loop 03 --json`
    Then `level` is `L2` — the default when `--level` is absent
    And `cap` is 3, read from the existing key
    When I run `aof work loop 03 --level L1 --cap 5 --json`
    Then `level` is `L1` and `cap` is 5
    And no new configuration key was read and none was written

  Scenario: `loopRunId` is the id this invocation would carry, and it never reaches disk from a probe
    Given the fixture stream
    When I run `aof work loop 03 --json` twice
    Then each document carries a non-empty `loopRunId`
    And the two ids differ — each invocation is its own loop
    And neither id appears in any run record in the fixture, because the probe minted none

  Scenario: `--dry-run` is the human probe — the same document, rendered
    Given the fixture stream and the injected seam
    When I run `aof work loop 03 --dry-run`
    Then the launcher body is not entered and zero spawn calls are recorded
    And the output names the scope, the resolved level, the resolved cap and the act the loop would take
    And it names the ref that act applies to
    And no raw JSON document is printed
    And the process exits 0
    When I run `aof work loop 03 --dry-run --json`
    Then the printed document is the same frozen key set, with `driven` empty

  Scenario: the probe answers the same on a repeat and in a fresh process
    Given the fixture stream, unchanged between runs
    When I run `aof work loop 03 --json` twice in two separate processes
    Then the two documents are identical except for `loopRunId`
    And neither run changed the fixture, so the second is answering the same stream as the first

  Scenario: a scope whose stream is finished is `done`, not an error
    Given a fixture stream in which every item of milestone `03` is `done`
    When I run `aof work loop 03 --json`
    Then `state` is `done` and `act.act` is `done`
    And `next` is `work:next`'s own done answer
    And `driven` is empty and the process exits 0

  Examples: the frozen top-level key set (ADR-005 §3) — all ten, always present
    | key        | shape                                                        | on a probe                            |
    | scope      | the admitted scope verbatim                                  | "03" or "50-53"                       |
    | level      | "L1" \| "L2" — resolved                                      | "L2" unless --level said otherwise    |
    | cap        | integer — resolved from work.autonomous.maxAttempts          | 3 on this repo's own config           |
    | loopRunId  | string — the id this invocation carries or would carry       | present, unwritten                    |
    | state      | "ready" \| "blocked" \| "done" \| "halted" — four, no `refused` | whatever next + the engine decided |
    | next       | work:next's answer, verbatim, or null                        | verbatim                              |
    | act        | { act, ref?, phase?, stop?, producer? }                      | the act it WOULD take                 |
    | stops      | the closed eight ids of ADR-005 §4                           | in full, always                       |
    | resumable  | { stranded: [{ref, runId, node}], lastDeclaration \| null }  | reported, never settled               |
    | driven     | [{ ref, phase, runId, outcome, attempt, cycle }]             | []                                    |

  Examples: `act`, per what `work:next` answered (the probe's one decision)
    | work:next answers                           | act.act | act.ref | act.phase | act.stop           | state   |
    | ready milestone with no stories             | drive   | 03      | refine    | (absent)           | ready   |
    | ready story with no task features           | drive   | 03/01   | refine    | (absent)           | ready   |
    | ready story with tasks, not done            | drive   | 03/01   | continue  | (absent)           | ready   |
    | ready milestone whose stories are all done  | drive   | 03      | verify    | (absent)           | ready   |
    | ready uat session                           | halt    | 04      | (absent)  | uat-gate           | halted  |
    | ready spike                                 | halt    | 05      | (absent)  | unmapped-item-type | halted  |
    | ready chore                                 | halt    | 06      | (absent)  | unmapped-item-type | halted  |
    | blocked, waitingOn ["02"]                   | halt    | 03      | (absent)  | dependency-blocked | blocked |
    | done                                        | done    | (absent)| (absent)  | (absent)           | done    |

  Examples: what the probe must NOT do, proven at the seam that would have done it
    | act                        | proven by                                                      | on the probe |
    | spawn a session            | the injected ptySpawn's recorded call count                    | 0            |
    | mint a run record          | work:run-status before and after, per in-scope item             | unchanged    |
    | complete or reclaim a run  | the run records' state/failureReason/reclaimedAt fields         | unchanged    |
    | write a status             | each item's record-doc frontmatter                              | unchanged    |
    | write any file             | the fixture tree's file list                                    | unchanged    |
    | block on a session         | the process returning and exiting 0                             | returns      |
