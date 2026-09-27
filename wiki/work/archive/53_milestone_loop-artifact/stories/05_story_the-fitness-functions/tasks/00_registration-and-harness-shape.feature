@executable @cli @work @validate
Feature: Registration and harness shape — eleven gates the runner actually invokes

  The seam before the subject. This task contracts nothing about the eleven invariants and
  everything about whether the eleven gates RUN: the export key the runner destructures, the
  eleven imports and eleven spreads in one labelled m53 block, and the name-set membership that
  filename presence cannot prove.

  Three failure shapes, each measured in this repo rather than imagined.
  (a) `{ name, fn }` instead of `{ name, run }`. The runner's loop is
  `for (const { name, run } of tests)` (`scripts/test.mjs:3362-3376`); a member exported
  under any other key has `run === undefined` and its body never executes. 52 measured 797
  `run:` entry keys and zero `fn:` across `test/arch/*.test.mjs`, which is exactly why the
  discipline is worth a gate — this is TECH_DEBT item 5's failure shape ("the gate reads
  green-ish while not running") reproduced on this milestone's own gate. It is PROVEN by
  driving the runner's own loop form over a planted two-member array, never asserted as a
  style rule.
  (b) IMPORTED BUT NEVER SPREAD. This one passes the gate that exists:
  `acd-test-suite-registration` (`:151`) keys registration on
  `runners.includes(path.basename(rel))`, so a file the runner NAMES in an import and never
  spreads into `tests` is not an orphan by that test's reckoning and is not run by anyone.
  `acd-roundtrip-registration` closes the hole by NAME-SET membership, but only for
  `acd-roundtrip-*`. So this task's registration leg is the name-set form, and the reason is
  on the record — it is FF-5311 `acd-loop-suite-registration`, the eleventh arch file, added by
  ADR-011 §4 and routing the general fix to TECH_DEBT item 50. Its sweep is WIDER than this
  story: it covers every suite milestone 53 authors, including the behavioural families 53/00
  through 53/04 land with their own stories, each inside its own labelled block.
  (c) A gate authored, registered and green that never touched the tree it claims to read.
  Every one of the eleven reports what it walked; a zero-file, zero-module or zero-record sweep
  is a failure, not a pass.

  Isolation rides here too, because it is a property of the harness rather than of any one
  invariant. The runner already points `AOF_GLOBAL_HOME` at a fresh per-test directory
  (`scripts/test.mjs:3363-3375`), which protects the eleven from each other but not the real
  `~/.aof` from a gate that resolves a home path itself or spawns a child with a scrubbed
  environment.

  ADR references: the `## Fitness functions` preamble (harness shape, grep discipline, sort
  discipline, proxy honesty) and the `## Story partition` row for 53/05.

  Scenario: each of the eleven files exports a non-empty array whose every member is `{ name, run }`
    Given the eleven `test/arch/acd-*.test.mjs` files this story authors
    When each is imported and its exported `archTests` array is read
    Then the array exists, is an array, and is non-empty
    And every member has a non-empty string `name`
    And every member has a `run` whose type is `function`
    And no member carries any other entry key — `fn`, `test`, `body` or `exec`

  Scenario: a member exported under `fn:` is never invoked — driven through the runner's own loop form, not asserted
    Given a planted two-member array `[{ name: "a", run }, { name: "b", fn }]` whose two bodies each append to a call log
    When the array is iterated with the runner's destructuring form `for (const { name, run } of tests)` and each `run()` awaited
    Then the call log holds exactly one entry, `"a"` — the `fn:` member's body never ran
    And iterating the `fn:` member raises `run is not a function` rather than reporting a passing test
    And this is the proof that the key matters, not a restatement of the rule

  Scenario: the loop form the proof reproduces is the runner's real one, re-read from source
    Given `scripts/test.mjs` read from disk with comments stripped
    When the suite loop is located
    Then it destructures `{ name, run }` from each member of `tests`
    And the gate fails if that loop form is no longer present — a proof against a stale runner is no proof
    And no other entry key appears in the loop's destructuring

  Scenario: no file among the eleven carries an `fn:` entry key anywhere in a test-object position
    Given each of the eleven files with comments stripped
    When the exported array's member literals are read
    Then no member declares `fn:`
    And a member rewritten from `run:` to `fn:` fails the gate, naming the file and the test's `name`
    And the same sweep over the whole of `test/arch/*.test.mjs` finds zero `fn:` entry keys

  Scenario: the eleven imports land in one labelled milestone-53 block
    Given `scripts/test.mjs`
    When the milestone-53 import block is located by its label comment
    Then the block names all eleven `acd-*.test.mjs` basenames
    And the eleven imports are contiguous — no unrelated import is interleaved
    And each import binds `archTests` under a distinct alias
    And the block mirrors the m52 block at `scripts/test.mjs:2446-2468` in shape
    And row `REG-MUT-04` plants an unrelated import between two of the eleven and must fail this exact contiguity leg

  Scenario: the eleven spreads land in one contiguous run inside the exported tests array
    Given the exported `tests` array in `scripts/test.mjs`
    When the milestone-53 spreads are located
    Then all eleven aliases appear as spreads
    And each alias is spread exactly once — a duplicated spread runs a file's tests twice
    And the eleven spreads are contiguous and carry one label naming milestone 53 / story 05
    And row `REG-MUT-05` plants an unrelated spread between two of the eleven and must fail this exact contiguity leg

  Scenario: an imported-but-never-spread file fails the gate — filename presence is not registration
    Given a milestone-53 file imported in `scripts/test.mjs` and absent from the `tests` array
    When registration is checked by NAME-SET membership against the assembled suite
    Then the gate fails, naming the file and the test names that no runner will invoke
    And `acd-test-suite-registration`'s filename check passes on that same tree — which is why this leg is name-set, not filename
    And the same failure is reported for a file spread but whose alias resolves to a different module

  Scenario: every test name the eleven files export is present in the assembled runner suite
    Given the `tests` array imported from `scripts/test.mjs` — a side-effect-free read, the suite runs only as an entry point
    When each of the eleven files is imported and its members' names collected
    Then every collected name is a member of the assembled suite's name set
    And no name appears twice in the assembled suite
    And the sweep is non-vacuous — it reports the eleven files it read and fails on fewer than eleven

  Scenario: the sweep covers every milestone-53 suite, not only this story's own
    Given the `test/**/*.test.mjs` files stories 53/00 through 53/04 authored — the `agent-session-driver-*`, `work-loop-*`, `loop-command-*`, `drive-command-*`, `loop-ready-*` and `autonomous-shell-out-*` families
    When registration is checked by NAME-SET membership against the assembled suite
    Then every test name each of those files exports is a member of the assembled `tests` array's name set
    And each is imported and spread inside ITS OWN story's labelled block, never this one's
    And this story registers none of them — it asserts they are registered and never registers them (ADR-011 §1/§4)
    And a suite authored on disk and absent from the assembled name set fails the gate, naming the story, the file and the test names no runner will invoke

  Scenario: the assembled suite grows by exactly the eleven files' own test count
    Given the assembled suite before the milestone-53 block and after it
    When the two name sets are compared
    Then the set difference is exactly the union of the eleven files' exported names
    And no pre-existing test name is removed, renamed or displaced
    And the count added equals the sum of the eleven arrays' lengths — eleven more suites, that many more reported tests

  Scenario: every one of the eleven test names identifies its milestone, its fitness function and its file
    Given each name exported by the eleven files
    When the name is read
    Then it begins with the milestone-and-FF prefix, in the shape `arch/53 FF-53NN (<file basename>): …`
    And a failing run therefore names the invariant that broke without opening the file
    And a name carrying no FF id fails the gate

  Scenario: the suite-registration orphan baseline is unchanged by this story
    Given `acd-test-suite-registration`'s `UNREGISTERED_BASELINE`
    When the eleven new files land registered
    Then the baseline still holds exactly its one pre-existing entry, `test/work-observe.test.mjs`
    And none of the eleven is added to it
    And a twelfth file authored under `test/arch/` and registered by neither runner fails that gate immediately

  Scenario: none of the eleven adds a positional slice to the ledger
    Given `acd-test-suite-registration`'s `POSITIONAL_SLICE_LEDGER`
    When the eleven files are swept for a fixed character window or an `indexOf`-sentinel slice end
    Then none of the eleven is measured over budget
    And the ledger gains no entry for any of the eleven
    And every source cut any of the eleven makes comes from `test/support/source-slice.mjs`, and reports NOT FOUND when the cut cannot be made

  Scenario: only the two milestone-52 accepted-test assertion regions may change in pre-existing tests
    Given the repository's `test/` tree before and after this story
    When the two trees are compared
    Then the only files added are the eleven, all under `test/arch/`
    And the only pre-existing test edits are these two named regions:
      | row id    | accepted test file                                  | permitted assertion block                                                                 | executable diff-ceiling owner                         |
      | ACCEPT-02 | `test/arch/acd-loop-finding-envelope.test.mjs`      | the milestone-52 roster assertion narrows to the ADR-015 §8 membership claim             | `test/arch/acd-loop-suite-registration.test.mjs`      |
      | ACCEPT-03 | `test/work-loops-coverage-ledger.test.mjs`          | its two milestone-52 roster assertions narrow to the ADR-015 §8 membership claim         | `test/arch/acd-loop-suite-registration.test.mjs`      |
    And each block may carry only its directly adjacent explanatory test label, assertion message or comment needed to state the amended claim truthfully, as granted by ADR-015 §10
    And that adjacent prose allowance changes no other assertion, fixture, setup, helper or executable path
    And every other pre-existing test byte is unchanged
    And no behavioural suite is added here — `test/agent-session-driver-*`, `test/work-loop-*`, `test/loop-command-*`, `test/drive-command-*`, `test/loop-ready-*` and `test/autonomous-shell-out-*` land with 53/00 through 53/04 in their own diffs (ADR-011 §1)
    And `test/arch/acd-work-command-cli-bijection.test.mjs` is byte-unchanged here — its four `argsFor` cases belong to 53/02
    And `test/arch/acd-worker-driver-no-headless-print.test.mjs` is byte-unchanged here — its `DRIVER_SOURCE`/`HANDLER_SOURCE` split belongs to 53/00
    And `scripts/test-unit.mjs` is byte-unchanged

  Scenario: the runner gains no logic — registration is additive only
    Given `scripts/test.mjs` before and after this story
    When the diff is read
    Then it holds exactly eleven added imports, eleven added spreads and the two label comments naming milestone 53 / story 05
    And no other story's labelled block is touched — 53/05 owns the m53 ARCH block only (ADR-011 §1)
    And the suite loop, the per-test global-home handling and the integration lane are byte-unchanged
    And no runner behaviour is conditioned on a milestone-53 test

  Scenario: every gate that builds a fixture roots it under its own temp directory and removes it
    Given each of the eleven that writes a fixture tree
    When the gate runs
    Then the fixture root is created by `mkdtemp` under the OS temp directory
    And it is removed in a `finally`, so a FAILING gate leaves no fixture behind
    And no fixture path is derived from the operator's home directory

  Scenario: a gate that spawns a child process passes AOF_GLOBAL_HOME through to it
    Given a gate that re-runs a module or a command in a fresh process
    When the child is spawned
    Then the child's environment carries the `AOF_GLOBAL_HOME` the runner set for this test
    And a child spawned with a scrubbed environment fails the gate rather than silently reading the real global home
    And the real `~/.aof` is named by no path any of the eleven constructs

  Scenario: every sweep reports what it read, so a zero-subject sweep fails
    Given each of the eleven
    When it walks source modules, test files, registry commands or fixture records
    Then it asserts the count it walked is above its stated floor before asserting anything about the contents
    And a rename, a moved directory or a truncated read fails as "nothing was read" rather than passing vacuously

  Examples:
    | row id      | file                                                    | FF       | exported alias in scripts/test.mjs        | must be                        | executable owner                                      |
    | REG-FILE-01 | test/arch/acd-session-driver-mesh-blind.test.mjs        | FF-5301  | acdSessionDriverMeshBlindTests            | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-02 | test/arch/acd-session-driver-single-home.test.mjs       | FF-5302  | acdSessionDriverSingleHomeTests           | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-03 | test/arch/acd-phase-door-not-a-driver.test.mjs          | FF-5303  | acdPhaseDoorNotADriverTests               | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-04 | test/arch/acd-loop-probe-contract.test.mjs              | FF-5304  | acdLoopProbeContractTests                 | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-05 | test/arch/acd-loop-level-l3-locked.test.mjs             | FF-5305  | acdLoopLevelL3LockedTests                 | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-06 | test/arch/acd-loop-l1-read-only.test.mjs                | FF-5306  | acdLoopL1ReadOnlyTests                    | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-07 | test/arch/acd-loop-state-rides-the-run-record.test.mjs  | FF-5307  | acdLoopStateRidesTheRunRecordTests        | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-08 | test/arch/acd-loop-scope-guard.test.mjs                 | FF-5308  | acdLoopScopeGuardTests                    | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-09 | test/arch/acd-loop-ready-registry-optional.test.mjs     | FF-5309  | acdLoopReadyRegistryOptionalTests         | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-10 | test/arch/acd-loop-cap-single-home.test.mjs             | FF-5310  | acdLoopCapSingleHomeTests                 | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-FILE-11 | test/arch/acd-loop-suite-registration.test.mjs          | FF-5311  | acdLoopSuiteRegistrationTests             | imported AND spread, name-set  | test/arch/acd-loop-suite-registration.test.mjs        |

  Examples:
    | row id      | planted defect / positive control in the harness        | what the gate reports                                          | executable owner                                      |
    | REG-MUT-01  | a member exported as `{ name, fn }`                    | the file and the test name; the body is proven never to run    | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-02  | a member with `run` bound to a non-function            | the file and the test name                                     | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-03  | an empty exported `archTests` array                    | the file — an empty gate is no gate                            | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-04  | an unrelated import interleaved inside the eleven      | the import and the split milestone-53 import block             | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-05  | an unrelated spread interleaved inside the eleven      | the spread and the split milestone-53 tests-array run          | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-06  | a file imported but never spread                       | the file and its unreachable test names                        | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-07  | a file spread twice                                    | the duplicated alias                                           | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-08  | a spread whose alias names a different module          | the alias and the module it actually binds                     | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-09  | a twelfth arch file registered by neither runner       | `acd-test-suite-registration`'s orphan list grows — it fails   | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-10  | a test name carrying no `FF-53NN` id                   | the name, and the file it came from                            | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-11  | a runner-logic edit outside the two m53 blocks         | the changed region of `scripts/test.mjs`                       | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-12  | a fixture rooted at the operator's home directory      | the constructed path                                           | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-13  | a child process spawned without `AOF_GLOBAL_HOME`      | the spawn site                                                 | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-14  | a sweep that read zero files / modules / records       | the floor it failed, before any content assertion              | test/arch/acd-loop-suite-registration.test.mjs        |
    | REG-MUT-15  | any edit outside ACCEPT-02/ACCEPT-03's assertion/prose ceilings | the changed accepted-test byte and owning row id          | test/arch/acd-loop-suite-registration.test.mjs        |
