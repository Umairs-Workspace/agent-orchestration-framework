@executable @cli @work @validate
Feature: The drives that prove nothing happened — `acd-loop-probe-contract` and `acd-loop-l1-read-only` catch a planted write

  Two gates that DRIVE rather than grep, over one shared instrument: a fixture work stream,
  an injected spawn seam, and a snapshot taken before and after. FF-5304 drives the registered
  `work:loop.run()` and proves the machine face is a PROBE — zero spawn calls, zero new run
  files — and pins its `--json` document to the frozen contract. FF-5306 drives a full
  `--level L1` loop to terminal and proves it wrote NOTHING, by file list AND by every byte.

  Why byte-level rather than a write-call grep, stated because 52 paid for the lesson: a
  static sweep sees `writeFile(x, …)` and cannot see where `x` resolves (52/FF-5201 leg (b)).
  So the promise is held by effect. A write through an indirection the grep cannot name still
  moves a byte, and that is what these gates read.

  Each scenario below contracts what the GATE does on a violating tree. The invariants
  themselves — "the probe spawns nothing", "L1 writes nothing" — are FF-5304 and FF-5306 and
  live in ARCHITECTURE.md; here a planted spawn, a planted mint and a planted byte are what
  the scenarios turn on.

  TWO ROWS CORRECTED, and both corrections are recorded rather than worked around. FF-5304's row
  reads "`cli.launch(options)` returns `null` when `options.json === true` and a function
  otherwise". ADR-005 §1's own declared seam is
  `(options) => (options.dryRun === true ? null : runLoopBody)` — it keys on `dryRun`, not on
  `json` — so a gate asserting the row's literal wording would be RED against the ADR's own
  code. The property the row is reaching for is real and stronger than the wording: `--json`
  NEVER launches, and it is FACE policy, checked before the seam is consulted
  (`src/spine/face.mjs:154`). So the scenarios contract both halves separately — the seam's own
  `dryRun` behaviour at the command, and the face's `--json` short-circuit driven through the
  real face — and neither restates the other.

  AND FF-5306's ACCOUNT IS AT THE REPORT CHANNEL, NOT IN THE RETURNED DOCUMENT (ADR-015 §1,
  which ruled the contradiction this feature raised at build time). The row's "an empty loop is
  not a read-only loop" leg was written as a claim on the returned `LoopState`, and that document
  cannot carry it: ADR-005 §3 freezes the key set at ten, and `drivenRow`
  (`src/commands/loop.mjs:312-321`) reads `record.runId`/`record.attempt` off a MINTED run record,
  which a zero-mint level has none of — so an L1 walk can populate a `driven` row only by minting
  or by lying about two of its six fields. An eleventh `reports` key is equally outside the
  envelope 54, 62 and 63 consume. The account is already emitted where 53/02's own contract puts
  it: `02/tasks/07_refusals-and-inert-levels.feature:110-113` contracts the L1 walk as a REPORT
  ("the report names each item an L2 loop would act on, with the act it would take") and its
  `--level L1 --json` scenario at `:137` requires `driven` empty. Measured 2026-08-17 by driving
  the real body: `runLoopBody({scope:"03", level:"L1"})` over the shared fixture returns exactly
  the ten keys with `driven: []` and emits `["03 — drive verify", "03/01 — drive continue"]`
  through `report`, at zero spawns. So the leg reads the injected `report` sink and asserts `driven`
  is `[]` — a gate that drives with `report: () => {}` and then fails for finding no account is
  discarding its own evidence, which is exactly what it did. The sink is injectable at exactly the ctx
  object the gate already builds (`src/commands/loop.mjs:330` reads `suppliedCtx.report` and passes it
  into `runL1` at `:363`, which emits one line per collected row at `:269`). One mechanisation note so
  the builder does not discover it late: the row-shape leg cannot import `drivenRow` — it is
  module-private at `src/commands/loop.mjs:312` — so the gate carries its own row predicate (a non-null
  `runId` and an integer `attempt`) and drives it over a planted array.

  The injected spawn seam is DECLARED and named, and it is a requirement this gate places on
  53/02's commands: `work:loop` and each `work:drive-<phase>` read `ctx.agentSessionDriverOptions`
  and pass it verbatim into `driveInteractiveClaudeSession`, which already accepts
  `options.ptySpawn` (`src/mesh-worker-execution.mjs:1464`) — one ctx key, following
  `ctx.globalWorkStoreOptions` exactly (ADR-010 §2). Without it neither zero-spawn leg is drivable
  at all.

  ADR-005 §1–§4; ADR-006 §3; ADR-015 §1; the `## Fitness functions` rows FF-5304 and FF-5306.

  Scenario: the probe drives a fixture stream and records zero spawn calls
    Given a fixture work stream with one ready story and an injected spawn seam that counts calls
    When the registered `work:loop.run()` is driven over it
    Then the spawn counter reads 0
    And the seam is proven live — the same seam records a call when a driving path is exercised, so a zero is a fact rather than a dead injection

  Scenario: a probe that spawns fails the gate, naming the call
    Given a fixture command whose registered `run()` calls the injected spawn seam once
    When the gate drives it
    Then the gate fails, reporting 1 spawn where 0 is required
    And the failure names the registered `run()`, not the launcher body

  Scenario: the probe mints no run record
    Given the fixture stream's run directories snapshotted before the probe
    When the registered `work:loop.run()` is driven
    Then the run-file list is unchanged — no record added, none rewritten
    And a fixture command that mints one run record fails the gate, naming the file it created

  Scenario: the probe's returned document key set equals the frozen contract exactly
    Given the probe's returned `LoopState`
    When its key set is compared with ADR-005 §3's frozen contract
    Then the two sets are equal in both directions — a missing key and an extra key both fail
    And the nested `act` key set is compared the same way
    And the nested `resumable` key set is compared the same way
    And a renamed key fails as one missing plus one extra, naming both

  Scenario: `next` is passed through verbatim rather than re-derived
    Given `work:next`'s answer for the fixture stream, taken directly
    When the probe's `next` field is compared with it
    Then the two are deeply equal
    And a probe that re-shapes, re-orders or drops a field of `work:next`'s answer fails the gate
    And a probe that returns `null` for a scope `work:next` answered fails

  Scenario: `driven` is empty on the probe
    Given the probe's returned document
    When `driven` is read
    Then it is an empty array
    And a probe returning a non-empty `driven` fails the gate

  Scenario: LOOP_STOPS is a frozen exported set equal to the eight declared ids
    Given `LOOP_STOPS` imported from the loop engine
    When it is compared with ADR-005 §4's eight ids
    Then the two are equal as sets, in both directions
    And the exported value is frozen — a mutation attempt does not change it
    And a ninth id fails the gate, naming it; a missing id fails the same way

  Scenario: every emitted stop carries a producer, driven per stop rather than asserted once
    Given each stop's producing condition arranged on the fixture
    When the loop is driven to that stop
    Then the emitted `act.stop` is the expected id
    And `act.producer` is populated
    And the producer names a code or a store fact, never a rendered message
    And a stop emitted with `producer` absent, empty or null fails the gate, naming the stop id

  Scenario: a producer derived from a message match fails the gate
    Given a fixture whose stop attribution is computed by matching a human-readable string
    When the gate drives that stop
    Then the gate fails, naming the stop and the message it matched
    And this is the leg that keeps 54's and 63's contract off a rendered string

  Scenario: the command's launch seam returns null under `--dry-run` and a body otherwise
    Given the registered `work:loop` command's `cli.launch`
    When it is called with `{ dryRun: true }`
    Then it returns null — the human probe falls through to invoke and render
    And calling it with no flags returns a function — the launcher body
    And a seam that returns a body under `--dry-run` fails the gate

  Scenario: `--json` never launches — driven through the real face, not asserted at the seam
    Given the real command face driven with `--json` over the fixture stream, with the launcher body instrumented
    When the face runs
    Then the launcher body records no invocation
    And exactly one parseable JSON document is written to stdout
    And the invocation returns rather than blocking — a launcher's machine face is its non-blocking probe
    And a fixture command whose body runs under `--json` fails the gate

  Scenario: the command carries its route and its three faces
    Given the registered `work:loop` command
    When its `cli` block is read
    Then `cli.route` equals `["work","loop"]`
    And `cli.argv`, `cli.render` and `cli.json` are each present and callable
    And the route table derived from the registry resolves `work loop` to this command with no collision

  Scenario: a full L1 loop leaves the fixture tree's file list identical
    Given a fixture work stream with a snapshot of every path under it
    When a `--level L1` loop is driven to terminal
    Then the file list after equals the file list before — nothing added, removed or renamed
    And the comparison is over the whole tree, not a named subset

  Scenario: a full L1 loop leaves every byte identical
    Given the same fixture with every file's bytes recorded before the run
    When the L1 loop is driven to terminal
    Then every file's bytes are identical afterwards
    And a one-character status change in one frontmatter fails the gate, naming the file
    And the byte comparison is what holds the promise — the file list alone would pass an in-place rewrite

  Scenario: a write through an indirection a grep cannot name still fails the byte leg
    Given a fixture loop path that writes through a computed target the call-form sweep does not resolve
    When the L1 loop is driven and the snapshots compared
    Then the gate fails, naming the file whose bytes moved
    And this is why the promise is held dynamically rather than by a grep

  Scenario: the L1 loop mints no run record and makes no spawn call
    Given the injected spawn seam and the fixture's run directories
    When the L1 loop is driven to terminal
    Then the spawn counter reads 0
    And no run record file exists that did not exist before
    And a fixture L1 path that mints one run fails the gate, naming the record

  Scenario: the L1 drive is proven to have actually run — an empty loop is not a read-only loop
    Given the fixture stream with at least one ready item, driven with a `report` sink that COLLECTS its lines
    When the L1 loop is driven
    Then the loop's report channel emits a non-empty per-item account — one line per in-scope actionable item, carrying the act an L2 loop would take
    And the returned document's `driven` is empty, asserted positively — a zero-mint level has no run record to build a row from, so `[]` is the correct value and not an omission
    And a run that reported nothing fails the gate before the snapshot comparison is made
    And a drive wired with a discarding `report` sink fails the gate as an unobservable account — the evidence the leg asserts on cannot be thrown away by the leg itself
    And this is what stops "wrote nothing" from being satisfied by "did nothing"

  Scenario: the L1 account never enters the frozen document
    Given the returned `LoopState` from the same L1 drive
    When its key set is compared with ADR-005 §3's frozen ten
    Then the two sets are equal in both directions — no eleventh key carries the account
    And `driven` carries only rows minted from real run records, so an L1 row in it fails the gate naming the field it had to invent
    And a fixture L1 path that pushes a hypothetical act into `driven` fails, naming the entries

  Scenario: the snapshots are taken over the fixture root only, and the fixture root is disposable
    Given the fixture root created under the OS temp directory
    When the gate finishes, pass or fail
    Then the fixture root is removed
    And no snapshot is ever taken over the operator's real work stream or global home

  Examples:
    | planted violation                                            | gate                      | what it reports                                          |
    | the registered run() calls the spawn seam                     | acd-loop-probe-contract   | 1 spawn where 0 is required                              |
    | the registered run() mints a run record                       | acd-loop-probe-contract   | the record file it created                               |
    | a key missing from the frozen `--json` contract               | acd-loop-probe-contract   | the missing key                                          |
    | an extra key on the `--json` document                         | acd-loop-probe-contract   | the extra key                                            |
    | a renamed key (`stopIds` for `stops`)                         | acd-loop-probe-contract   | one missing plus one extra, both named                   |
    | a missing key on nested `act`                                 | acd-loop-probe-contract   | the nested path and the key                              |
    | a missing key on nested `resumable`                           | acd-loop-probe-contract   | the nested path and the key                              |
    | `next` re-derived rather than passed through                  | acd-loop-probe-contract   | the field that differs from `work:next`'s answer         |
    | `driven` non-empty on the probe                               | acd-loop-probe-contract   | the entries it contains                                  |
    | a ninth member of LOOP_STOPS                                  | acd-loop-probe-contract   | the extra id                                             |
    | a missing member of LOOP_STOPS                                | acd-loop-probe-contract   | the missing id                                           |
    | LOOP_STOPS not frozen                                         | acd-loop-probe-contract   | the mutation that took effect                            |
    | a stop emitted with no `producer`                             | acd-loop-probe-contract   | the stop id                                              |
    | a `producer` derived from a message match                     | acd-loop-probe-contract   | the stop id and the matched string                       |
    | `cli.launch({dryRun:true})` returning a body                  | acd-loop-probe-contract   | the seam and the flag                                    |
    | the launcher body running under `--json`                      | acd-loop-probe-contract   | the body invocation the face should have short-circuited |
    | more than one document on stdout under `--json`               | acd-loop-probe-contract   | the unparseable stdout                                   |
    | `cli.route` other than `["work","loop"]`                      | acd-loop-probe-contract   | the route it carries                                     |
    | an L1 loop adding a file                                      | acd-loop-l1-read-only     | the added path                                           |
    | an L1 loop removing a file                                    | acd-loop-l1-read-only     | the removed path                                         |
    | an L1 loop renaming a file                                    | acd-loop-l1-read-only     | both paths                                               |
    | an L1 loop rewriting one frontmatter character                | acd-loop-l1-read-only     | the file whose bytes moved                               |
    | an L1 write through a computed target                         | acd-loop-l1-read-only     | the file whose bytes moved                               |
    | an L1 loop minting a run record                               | acd-loop-l1-read-only     | the record file                                          |
    | an L1 loop calling the spawn seam                             | acd-loop-l1-read-only     | the spawn count                                          |
    | an L1 loop whose report channel emitted no lines              | acd-loop-l1-read-only     | the empty report channel, before the snapshots           |
    | an L1 drive wired with a discarding `report` sink             | acd-loop-l1-read-only     | the unobservable account — evidence the leg discarded    |
    | an L1 drive returning `driven: []` with a non-empty report    | acd-loop-l1-read-only     | nothing — the account is at the report channel           |
    | an eleventh key carrying the account on the L1 document       | acd-loop-l1-read-only     | the extra key, against ADR-005 §3's frozen ten           |
    | an L1 path pushing a hypothetical act into `driven`           | acd-loop-l1-read-only     | the invented entries and the fields it had to invent     |

  Examples: stable evidence ownership for the probe controls
    | row id          | mutation / positive control                                           | expected observation                                                   | executable owner                                  |
    | PROBE-MUT-01    | registered `work:loop.run()` invokes the injected spawn seam once     | one forbidden spawn, attributed to the registered probe                | test/arch/acd-loop-probe-contract.test.mjs        |
    | PROBE-PC-01     | the same injected `ptySpawn` is exercised through a real driving path | exactly one call, proving the zero-spawn probe did not use a dead seam | test/arch/acd-loop-probe-contract.test.mjs        |
    | PROBE-MUT-02    | a fixture launch body is eligible under real-face `--json`            | zero body calls; any call fails before document assertions             | test/arch/acd-loop-probe-contract.test.mjs        |
    | PROBE-PC-02     | the real face resolves `work loop --json` through the registry         | registered `run()` answers once with one parseable JSON document       | test/arch/acd-loop-probe-contract.test.mjs        |
    | PROBE-PC-03     | the same real-face fixture is invoked without `--json`                 | the instrumented launch body is called, proving the face control live  | test/arch/acd-loop-probe-contract.test.mjs        |

  `PROBE-PC-01` must reach the same injected spawn function used by the zero-spawn assertion;
  calling an unrelated fake is not a live-seam control. `PROBE-PC-02` and `PROBE-PC-03` must drive
  the exported face/registry path, not call `cli.launch` directly. All other rows in the preceding
  Examples table are owned by the gate in its `gate` column; the literal planted-violation cell is
  their stable evidence handle.
