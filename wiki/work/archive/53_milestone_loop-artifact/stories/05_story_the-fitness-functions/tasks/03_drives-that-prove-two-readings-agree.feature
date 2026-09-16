@executable @cli @work @validate
Feature: The drives that prove two readings agree — `acd-loop-state-rides-the-run-record` and `acd-loop-ready-registry-optional` catch a second answer

  Two gates whose instrument is a ROUND TRIP rather than a snapshot. FF-5307 writes a
  `brief.loop` envelope through the loop's own path and reads it back through
  `work:run-status` — the board's one face — so "loop state reaches the board through the same
  face" is a measured equality, not a promise. FF-5309 drives `aof work doctor` and
  `work:loops-validate` over ONE fixture registry, both commands really invoked, and asserts
  the composed counts equal `work:loops-validate`'s own `summary.checks` — so the score cannot
  disagree with the graph because it does not compute.

  Both gates exist to catch the same species: a SECOND answer to a question something already
  answers. So each scenario below plants a second answer — a re-derived count, a re-classified
  finding, a state written somewhere `work:run-status` cannot see — and contracts the gate
  catching it.

  ONE MECHANISM CORRECTED, and the correction is recorded rather than worked around. FF-5307's
  row says the run-store freeze is proven by importing "`buildRecord`'s produced key list and
  `LEGAL_TRANSITIONS`". Both are module-PRIVATE in `src/run-store.mjs` today — `buildRecord` is
  a bare `function` at `:344` and `LEGAL_TRANSITIONS` a bare `const` at `:96-102`. Importing
  them means EXPORTING them, which edits the one file ADR-004's invariant says must be
  unchanged and which 53/05's partition forbids this story from touching at all. The
  behavioural form is buildable today and is strictly stronger, because it reads what is
  actually persisted rather than what a constructor intends: the 15 keys come from calling the
  exported `startRun` and reading the record back with the exported `readRuns`, and the 5 edges
  come from driving the exported pure predicate `isLegalTransition` (`:106`) over the whole
  25-cell cross product of the closed state vocabulary. Neither needs a new export.

  ADR-004 §1–§5; ADR-007 §1–§7; the `## Fitness functions` rows FF-5307 and FF-5309.

  Scenario: a loop-minted run's brief.loop survives the round trip through work:run-status
    Given a fixture item and a loop drive that mints one run carrying the `brief.loop` envelope
    When `work:run-status` is invoked for that ref and the returned record read
    Then the record's `brief.loop` is deeply equal to what the loop wrote
    And every one of the seven envelope keys is present with its written value
    And the assertion is over the value `work:run-status` returns, never over the file the loop wrote

  Scenario: a durable loop fact written anywhere other than brief.loop fails the gate
    Given a fixture loop path that persists its scope in a sidecar file beside the run record
    When the round trip runs
    Then the gate fails, naming the fact and the file that holds it
    And the message states the fact is invisible to `work:run-status`, which is the whole test

  Scenario: an envelope key that does not survive the round trip fails the gate
    Given a loop that writes `cycle` into `brief.loop` and a store read that returns it absent
    When the returned record is compared with what was written
    Then the gate fails, naming the missing key
    And it fails identically for a key whose value changed in transit — the brief is persisted verbatim or the gate reds

  Scenario: the envelope key set is exactly the seven frozen keys
    Given the `brief.loop` envelope read back through `work:run-status`
    When its key set is compared with ADR-004 §2's frozen seven
    Then the two sets are equal in both directions
    And an eighth key fails the gate, naming it
    And a missing key fails the same way

  Scenario: the persisted run record still carries exactly fifteen keys, in order — driven, not imported
    Given a fixture item and a run minted through the exported `startRun`
    When the record is read back through the exported `readRuns`
    Then `Object.keys(record)` equals the frozen fifteen in their frozen order
    And the comparison is ordered, not set-wise — the freeze is a key ORDER as well as a key set
    And a sixteenth key on the persisted record fails the gate, naming it
    And the gate imports no private binding from `src/run-store.mjs` to make this assertion

  Scenario: the transition table is still exactly five legal edges — driven over the whole cross product
    Given the closed state vocabulary queued, running, done, failed, cancelled
    When the exported `isLegalTransition` is driven over all 25 ordered pairs
    Then exactly 5 pairs return true
    And they are queued>running, queued>cancelled, running>done, running>failed, running>cancelled
    And every self-loop returns false, and every move out of a terminal state returns false
    And a sixth legal edge fails the gate, naming the pair

  Scenario: `src/run-store.mjs` is byte-unchanged by this milestone
    Given the file's bytes at the milestone's base and at HEAD
    When they are compared
    Then they are identical
    And a new export added to make an arch-test easier fails this leg, naming the added export

  Scenario: the loop engine is source-pure — no fs, no process, no clock, no dynamic import
    Given `src/work-loop.mjs` with comments stripped
    When it is swept
    Then it imports none of `node:fs`, `node:fs/promises`, `node:child_process`, `node:process`, `node:os`
    And it calls neither `Date.now(` nor `new Date(`
    And it performs no dynamic `import(`
    And each planted violation fails the gate naming the call form and its line
    And the same token inside a stripped comment does not fail it

  Scenario: no loop-store module exists anywhere under src/
    Given the `src/` tree walked for a module matching the loop-store shape
    When the sweep runs
    Then none is found
    And a planted `src/work-loop-store.mjs` fails the gate, naming the file
    And it fails identically for a nested `src/loop/loop-store.mjs`

  Scenario: the loop command's own body carries no write call form
    Given `src/commands/loop.mjs` with comments stripped
    When it is swept for `writeFile`, `mkdir` and `rename` call forms
    Then none appears, whatever its argument
    And the sweep does not ask where an argument resolves — that question is not decidable by reading, and the round trip above is what holds the real promise
    And a planted `writeFile(target, text)` fails, even where `target` is a computed variable

  Scenario: the board's read path is not edited by this milestone
    Given `src/commands/run-status.mjs`, `src/board-ui.mjs` and every file under `ui/`
    When their bytes are compared with the milestone's base
    Then all are unchanged
    And the gate reports the number of files it compared, so a zero-file comparison fails

  Scenario: the scorer module is a member of the doctor determinism glob
    Given the glob `/^work-doctor.*\.mjs$/` re-derived over `src/` exactly as `acd-doctor-engine-determinism.test.mjs:27-32` derives it
    When the resulting module set is read
    Then `src/work-doctor-loop-ready.mjs` is a member
    And the glob is re-derived rather than hard-coded, so a rename cannot silently escape the sweep
    And a scorer renamed to `src/loop-ready.mjs` fails this leg, naming the module that left the set

  Scenario: the scorer module is NOT a member of CHECK_GROUPS
    Given `CHECK_GROUPS` imported from `src/work-doctor.mjs`
    When its members are read
    Then no member is the scorer
    And a scorer registered as a check group fails the gate, naming the group
    And this is the leg that keeps `doctorWork`'s bare-array return unchanged

  Scenario: the scorer imports no loop-registry module, transitively
    Given `src/work-doctor-loop-ready.mjs` as a walk root
    When its static import graph is walked transitively
    Then no `src/work-loops*.mjs` module is reached
    And a fixture chain reaching one two hops away fails the gate, naming the chain
    And the walk asserts it visited its root before asserting anything about what it did not reach

  Scenario: the scorer reads no clock and no filesystem
    Given the scorer's source with comments stripped
    When it is swept
    Then it calls neither `Date.now(` nor `new Date(`
    And it imports no `node:fs` module
    And each planted violation fails the gate naming the call form

  Scenario: doctor holds no static import of command-core and reaches the registry only through a deferred import
    Given `src/commands/doctor.mjs` with comments stripped
    When its static import specifiers are parsed
    Then none resolves to `command-core.mjs`
    And the registry is reached by an `await import(` inside `run()`, not at module scope
    And a planted static `import { invoke } from "../command-core.mjs"` fails the gate, naming the import
    And the message names the registry ring the static form would close

  Scenario: with no registry present the five loop rows are not-applicable and leave the denominator
    Given a fixture workspace with no loop registry directory
    When `aof work doctor` is driven over it and its `loopReady` read
    Then `registry.present` is false and `registry.composed` is false
    And the five 52 check ids each appear with state `not-applicable`
    And `applicable` counts only the four base checks
    And a not-applicable row counted in the denominator fails the gate, reporting both numbers

  Scenario: with a registry present the composed counts equal work:loops-validate's own summary
    Given a fixture workspace whose loop registry produces findings on more than one check
    When both `aof work doctor` and `work:loops-validate` are really invoked over that same workspace
    Then for each of the five frozen ids, the composed row's count equals `summary.checks[<id>].findings` exactly
    And the equality is asserted per id, so a single drifting row is named rather than absorbed by a total
    And the fixture is proven discriminating — at least one id has a non-zero count, so an all-zero fixture cannot pass this leg vacuously

  Scenario: a re-derived count fails the composition gate
    Given a fixture scorer that recomputes one check's findings instead of reading `summary.checks`
    When the two commands are driven over the same registry
    Then the gate fails, naming the id and both numbers
    And it fails identically for a row that re-classifies a finding's severity

  Scenario: the five composed ids are exactly 52's frozen five
    Given the composed rows
    When their ids are read
    Then they are exactly grounding, pairing, reference-ownership, actuator-arbitration, timescale
    And a sixth composed id fails the gate, naming it
    And a missing one fails the same way

  Scenario: no module on a refusal path references loopReady
    Given `src/work-loop.mjs` and `src/commands/loop.mjs` with comments stripped
    When each is swept for the `loopReady` token
    Then neither carries it
    And a planted read of `loopReady` in the loop's refusal path fails the gate, naming the module and the line
    And the same token inside a stripped comment does not fail it — the score is advisory in 53, and the gate says so in code

  Scenario: both round trips run against their own disposable fixture, never the operator's tree
    Given each fixture root created under the OS temp directory
    When the gate finishes, pass or fail
    Then the fixture root is removed
    And any command driven in a child process inherits the test's `AOF_GLOBAL_HOME`
    And no assertion is made against the real work stream or the real global home

  Examples:
    | planted second answer / violation                                | gate                                    | what it reports                              |
    | loop scope persisted in a sidecar beside the run record          | acd-loop-state-rides-the-run-record     | the fact and the file that holds it          |
    | a `brief.loop` key absent after the round trip                   | acd-loop-state-rides-the-run-record     | the missing key                              |
    | a `brief.loop` value changed in transit                          | acd-loop-state-rides-the-run-record     | the key and both values                      |
    | an eighth key on the envelope                                    | acd-loop-state-rides-the-run-record     | the extra key                                |
    | a sixteenth key on the persisted run record                      | acd-loop-state-rides-the-run-record     | the extra key                                |
    | the fifteen keys persisted out of frozen order                   | acd-loop-state-rides-the-run-record     | the first position that differs              |
    | a sixth legal transition                                         | acd-loop-state-rides-the-run-record     | the pair that newly returns true             |
    | `src/run-store.mjs` edited to export a private binding           | acd-loop-state-rides-the-run-record     | the added export                             |
    | `node:fs` imported by the loop engine                            | acd-loop-state-rides-the-run-record     | the import and its line                      |
    | `Date.now(` in the loop engine                                   | acd-loop-state-rides-the-run-record     | the call form and its line                   |
    | a dynamic `import(` in the loop engine                           | acd-loop-state-rides-the-run-record     | the call form and its line                   |
    | `src/work-loop-store.mjs` added                                  | acd-loop-state-rides-the-run-record     | the module path                              |
    | `writeFile(target, text)` in `src/commands/loop.mjs`             | acd-loop-state-rides-the-run-record     | the call site, whatever the argument         |
    | `src/commands/run-status.mjs` edited                             | acd-loop-state-rides-the-run-record     | the changed file                             |
    | the scorer renamed out of the determinism glob                   | acd-loop-ready-registry-optional        | the module that left the derived set         |
    | the scorer registered in `CHECK_GROUPS`                          | acd-loop-ready-registry-optional        | the group it was added to                    |
    | the scorer reaching `work-loops.mjs` two hops away               | acd-loop-ready-registry-optional        | the transitive chain                         |
    | `Date.now(` in the scorer                                        | acd-loop-ready-registry-optional        | the call form and its line                   |
    | a static `command-core.mjs` import in doctor                     | acd-loop-ready-registry-optional        | the import, and the registry ring it closes  |
    | the registry read hoisted to doctor's module scope               | acd-loop-ready-registry-optional        | the hoisted call site                        |
    | a `not-applicable` row counted in `applicable`                   | acd-loop-ready-registry-optional        | the id, and both denominators                |
    | `registry.composed` true with no registry present                | acd-loop-ready-registry-optional        | both flags                                   |
    | a composed count recomputed instead of read                      | acd-loop-ready-registry-optional        | the id and both numbers                      |
    | a composed finding re-classified by severity                     | acd-loop-ready-registry-optional        | the id and both counts                       |
    | a sixth composed id                                              | acd-loop-ready-registry-optional        | the extra id                                 |
    | an all-zero fixture registry used for the equality leg           | acd-loop-ready-registry-optional        | the vacuity — the fixture is not discriminating |
    | `loopReady` read on the loop's refusal path                      | acd-loop-ready-registry-optional        | the module and the line                      |
