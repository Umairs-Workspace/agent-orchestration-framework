@executable @cli @work @validate
Feature: The refusal gates — `acd-phase-door-not-a-driver`, `acd-loop-level-l3-locked` and `acd-loop-scope-guard` catch a door that executes, a level that unlocks and a scope that widens

  Three gates over three boundaries that a later diff will be tempted to cross: a decider that
  starts executing (FF-5303), a locked rung that becomes reachable (FF-5305), and a scope that
  silently stops scoping (FF-5308). Each refusal is DRIVEN through the real command and
  asserted by its coded id and its zero side effects, never by its rendered sentence.

  TWO LEGS ARE GREEN TODAY AND THE GATE MUST KEEP THEM THAT WAY, which is a different
  obligation from the RED-until-built legs beside them and is contracted separately.
  FF-5303's `continue.mjs` half is green now: the shipped doors already spawn nothing, and the
  gate's job is to notice the day that changes. FF-5308's necessity leg is green now for a
  worse reason — it measures a live defect (`inRange` at `src/work.mjs:847-860` falls through
  to `() => true`), and it is the one leg in this milestone that SHOULD eventually go red.

  A GATE THAT REDS FOR A GOOD REASON MUST SAY SO, and this is the only place in the milestone
  where that matters. When TECH_DEBT item 49 is paid and `nextWork` stops failing open, the
  necessity leg's assertion stops holding — and a maintainer who meets a bare
  `AssertionError: expected ready item outside 02/01` will read it as a break. So the leg's
  failure message is part of its contract: it must name item 49, state that a red here means
  the silent-unscoped walk has been FIXED, and name the follow-on (widen `LOOP_SCOPE_FORMS` to
  whatever the single parser now admits, and retire this leg).

  PROXY HONESTY, again as a green assertion rather than a caveat. FF-5305's third leg — no
  executing branch keyed on `L3` anywhere in `src/` — is a named PROXY: a branch keyed on a
  computed string passes it. The scenarios contract what it catches AND assert that it passes
  on the stated false negative, so the proxy's surface is visible in the suite. Legs one and
  two are decision procedures and carry the real claim.

  ADR-002 §1–§4; ADR-003 §1–§4; ADR-006 §1–§2; the `## Fitness functions` rows FF-5303, FF-5305
  and FF-5308.

  Scenario: the shipped continue door carries no spawn token today, and the gate says so
    Given `src/commands/continue.mjs` with comments stripped
    When the gate sweeps it for `ptySpawn`, `term.write` and `driveInteractiveClaudeSession`
    Then none appears — this leg is GREEN NOW and is asserted, not assumed
    And the gate reports the file it read, so a moved or renamed door fails as "not found"

  Scenario: a spawn added to the shipped continue door fails the gate
    Given `driveInteractiveClaudeSession(brief, options)` added to `src/commands/continue.mjs`
    When the gate sweeps it
    Then the gate fails, naming the token and its line
    And it fails identically for `ptySpawn(` and for `term.write(`
    And the same token inside a stripped comment does not fail it

  Scenario: an import of either driver module into the shipped door fails the gate
    Given `import { driveInteractiveClaudeSession } from "../agent-session-driver.mjs"` added to `src/commands/continue.mjs`
    When the gate parses its static imports
    Then the gate fails, naming the import
    And it fails identically for an import of `../mesh-worker-execution.mjs`

  Scenario: the three shipped doors keep their routes and their decision-shaped return
    Given the registered `work:refine`, `work:continue` and `work:verify` commands
    When each is read from the registry
    Then each carries route `["work", <phase>]`
    And each local answer carries the `{where, command}` shape
    And a door whose route gained a third word fails the gate, naming the route it now carries
    And a door whose local answer no longer carries `where` fails, naming the field

  Scenario: the three driver commands carry their ids and three-word routes
    Given the registered `work:drive-refine`, `work:drive-continue` and `work:drive-verify` commands
    When each is read from the registry
    Then each id is `work:drive-<phase>`
    And each route is `["work","drive",<phase>]`
    And a driver registered under a two-word route fails the gate, naming the route

  Scenario: a driver command that makes a where-decision fails the gate
    Given `assignWork(...)` added to `src/commands/drive.mjs`
    When the gate sweeps the driver module with comments stripped
    Then the gate fails, naming the token
    And it fails identically for a `where` field on a driver's return and for a `node` decision branch

  Scenario: the route table is re-derived from the registry, never grepped, and derives with no collision
    Given the full command registry
    When `deriveRouteTable` is called over it
    Then it derives without throwing
    And `work loop`, `work drive refine`, `work drive continue` and `work drive verify` each resolve to their own command
    And `work refine`, `work continue` and `work verify` still resolve to the shipped doors
    And a second command claiming `["work","drive","continue"]` fails the gate through the derivation's own collision error, naming both ids

  Scenario: the level vocabulary equals its frozen literals exactly
    Given `LOOP_LEVELS` and `LOCKED_LOOP_LEVELS` imported from the loop engine
    When each is compared with ADR-006 §1's literal
    Then `LOOP_LEVELS` equals `["L1","L2"]` — ordered, both directions
    And `LOCKED_LOOP_LEVELS`'s key set is exactly `["L3"]`
    And its `L3` entry carries `unlockedBy: 55`
    And both exported values are frozen — a mutation attempt does not change them
    And `"L3"` appearing in `LOOP_LEVELS` fails the gate, naming the member

  Scenario: driving the real command with --level L3 yields the coded refusal, with zero side effects
    Given a fixture work stream, an injected spawn seam and a snapshot of the fixture's run files
    When the real `work:loop` is driven with `--level L3`
    Then the refusal's code is `loop-level-locked`
    And the refusal names milestone 55 as the unlocker
    And the spawn counter reads 0
    And no run record file exists that did not exist before
    And the assertion is on the coded id and the `unlockedBy` field, never on the rendered sentence

  Scenario: a level that resolves rather than refuses fails the gate
    Given a fixture command that treats `--level L3` as an alias for L2
    When the gate drives it
    Then the gate fails, reporting that a level was resolved where a refusal was required
    And it fails identically for a command that refuses with a different code

  Scenario: an unrecognised level is a distinct coded refusal
    Given the real `work:loop` driven with `--level L4`
    When the refusal is read
    Then its code is `loop-level-unknown`, not `loop-level-locked`
    And a command that answers `loop-level-locked` for an unrecognised level fails the gate — the two refusals mean different things

  Scenario: an executing branch keyed on L3 anywhere in src/ fails the gate
    Given `if (level === "L3") { … }` added to a module under `src/`
    When the gate sweeps `src/` for `"L3"` and `'L3'` outside the two frozen literals and the refusal message, comments stripped
    Then the gate fails, naming the module and the line
    And a `case "L3":` fails the same way
    And the two frozen literals and the refusal message do not fail it
    And `"L3"` in a stripped comment does not fail it

  Scenario: the L3 sweep PASSES on its own stated false negative — the proxy's surface is asserted, not hidden
    Given a fixture branch keyed on a computed string that evaluates to `L3`
    When the sweep runs
    Then the gate passes — this is the proxy's declared false negative
    And the frozen-vocabulary leg and the driven refusal leg are what refuse that fixture in practice
    And the sweep is proven non-vacuous — it reports the number of `src/` modules it read and fails on zero

  Scenario: the scope vocabulary equals its two frozen forms
    Given `LOOP_SCOPE_FORMS` imported from the loop engine
    When it is compared with ADR-003 §1's literal
    Then it holds exactly two members, `driver` and `range`
    And each member's pattern admits its own form and rejects the other's
    And the exported value is frozen
    And a third admitted form fails the gate, naming it

  Scenario: every non-admitted scope is the coded refusal, with zero side effects
    Given a fixture work stream, an injected spawn seam and a snapshot of the fixture tree
    When the real `work:loop` is driven with a story-shaped scope
    Then the refusal's code is `loop-scope-unsupported`
    And the refusal carries BOTH admitted forms
    And the spawn counter reads 0, no run record is minted, and the fixture tree's bytes are unchanged
    And the refusal is produced before any scope resolution, mint or read

  Scenario: the refusal covers the whole non-admitted space, not one example of it
    Given each non-admitted scope form in turn
    When the real command is driven with it
    Then each yields `loop-scope-unsupported`
    And a form that walks instead of refusing fails the gate, naming the form and what it walked

  Scenario: the necessity leg drives the REAL nextWork over two active milestones and two ready items
    Given active milestone `02` holds the one in-scope ready item `02/01`
    And active milestone `01` holds the one out-of-scope ready competitor `01/00`
    And `01/00` is out of scope because it belongs to the earlier active milestone, not because it is done, blocked or a dependency of `02/01`
    And neither milestone nor either story is done
    When `nextWork(workDir, "02/01")` is called on the real function
    Then it returns state `ready`
    And the returned `ref` is outside story `02/01`
    And the returned `ref` is `01/00` — the earlier ready competitor in a milestone the caller did not name
    And the leg calls the shipped `nextWork`, never a restatement of its regex

  Scenario: the necessity leg's failure message names TECH_DEBT item 49 and reads as good news
    Given a future tree in which `nextWork` no longer falls through to an unscoped walk
    When the necessity leg runs and its assertion no longer holds
    Then the failure message states that the silent-unscoped walk has been FIXED, not broken
    And it names TECH_DEBT item 49 and `src/work.mjs:847-860` as the subject
    And it names the follow-on: widen `LOOP_SCOPE_FORMS` to whatever the single parser now admits, and retire this leg
    And a bare assertion error with no such message fails this contract — a gate that reds for a good reason must be recognisable as one

  Scenario: the necessity fixture is proven discriminating before its claim is made
    Given the two-milestone fixture
    When the leg runs
    Then it first asserts that `nextWork(workDir, "02")` returns the in-scope ready item `02/01` — the scoped walk works for an admitted form
    And only then asserts that the non-admitted story scope `02/01` leaks to the out-of-scope ready competitor `01/00`
    And a fixture with one milestone, no in-scope ready item, or no ready competitor outside 02 fails as not discriminating rather than passing vacuously

  Scenario: `src/work.mjs` is byte-unchanged by this milestone
    Given the file's bytes at the milestone's base and at HEAD
    When they are compared
    Then they are identical
    And a widened `inRange` fails this leg, naming the changed function

  Examples:
    | planted violation                                        | gate                          | what it reports                                       |
    | `ptySpawn(` in `src/commands/continue.mjs`               | acd-phase-door-not-a-driver   | the token and its line                                |
    | `term.write(` in `src/commands/continue.mjs`             | acd-phase-door-not-a-driver   | the token and its line                                |
    | `driveInteractiveClaudeSession(` in the shipped door     | acd-phase-door-not-a-driver   | the token and its line                                |
    | an import of `agent-session-driver.mjs` into the door    | acd-phase-door-not-a-driver   | the import specifier                                  |
    | a shipped door's route grown to three words              | acd-phase-door-not-a-driver   | the route it now carries                              |
    | a shipped door's local answer losing `where`             | acd-phase-door-not-a-driver   | the missing field                                     |
    | a driver registered under a two-word route               | acd-phase-door-not-a-driver   | the route it carries                                  |
    | `assignWork(` in `src/commands/drive.mjs`                | acd-phase-door-not-a-driver   | the token and its line                                |
    | a second command claiming `work drive continue`          | acd-phase-door-not-a-driver   | both ids, through the derivation's collision error    |
    | `"L3"` added to `LOOP_LEVELS`                            | acd-loop-level-l3-locked      | the member                                            |
    | `LOCKED_LOOP_LEVELS` emptied                             | acd-loop-level-l3-locked      | the missing `L3` key                                  |
    | `unlockedBy` other than 55                               | acd-loop-level-l3-locked      | the field and its value                               |
    | either constant not frozen                               | acd-loop-level-l3-locked      | the mutation that took effect                         |
    | `--level L3` resolving as an alias for L2                | acd-loop-level-l3-locked      | the resolution where a refusal was required           |
    | `--level L3` refusing with a different code              | acd-loop-level-l3-locked      | the code it returned                                  |
    | `--level L3` spawning before refusing                    | acd-loop-level-l3-locked      | the spawn count                                       |
    | `--level L4` answering `loop-level-locked`               | acd-loop-level-l3-locked      | the code, and the code it should have been            |
    | `if (level === "L3")` in a `src/` module                 | acd-loop-level-l3-locked      | the module and the line                               |
    | `case "L3":` in a `src/` module                          | acd-loop-level-l3-locked      | the module and the line                               |
    | `"L3"` in a stripped comment                             | acd-loop-level-l3-locked      | nothing — code, not prose                             |
    | a branch keyed on a computed `L3` string                 | acd-loop-level-l3-locked      | nothing — the proxy's declared false negative         |
    | a third member of `LOOP_SCOPE_FORMS`                     | acd-loop-scope-guard          | the extra form                                        |
    | scope `53/02` walking instead of refusing                | acd-loop-scope-guard          | the form, and the item it walked to                   |
    | scope `the-fitness-functions` walking                    | acd-loop-scope-guard          | the form, and the item it walked to                   |
    | scope `""` walking                                       | acd-loop-scope-guard          | the form, and the item it walked to                   |
    | a refusal carrying only one admitted form                | acd-loop-scope-guard          | the missing form                                      |
    | a refusal minted after a spawn                           | acd-loop-scope-guard          | the spawn count and the run files                     |
    | the necessity leg restated as a regex assertion          | acd-loop-scope-guard          | that the shipped `nextWork` was never called          |
    | a one-milestone necessity fixture                        | acd-loop-scope-guard          | the vacuity — the fixture is not discriminating       |
    | `inRange` widened in `src/work.mjs`                      | acd-loop-scope-guard          | the changed function                                  |

  Examples: stable evidence ownership for the active scope fixture
    | row id          | driven call / mutation                                    | expected observation                                                     | executable owner                              |
    | SCOPE-PC-01     | `nextWork(workDir, "02")` on the two-active-milestone fixture | returns the in-scope ready item `02/01`                                  | test/arch/acd-loop-scope-guard.test.mjs       |
    | SCOPE-NEC-01    | `nextWork(workDir, "02/01")` on that same fixture            | returns earlier active competitor `01/00`, with the good-news message armed | test/arch/acd-loop-scope-guard.test.mjs       |
    | SCOPE-MUT-01    | milestone `01` or ready item `01/00` removed                   | fixture rejected as non-discriminating before the necessity assertion    | test/arch/acd-loop-scope-guard.test.mjs       |
    | SCOPE-MUT-02    | milestone `01` marked done instead of active                   | fixture rejected; a done dependency is not the contracted competitor     | test/arch/acd-loop-scope-guard.test.mjs       |

  These rows supersede the earlier `01/01`/done-milestone oracle completely; no test may retain it
  as a second acceptable fixture. All other rows in the preceding Examples table are owned by the
  gate in its `gate` column; their literal planted-violation cell is the stable evidence handle.
