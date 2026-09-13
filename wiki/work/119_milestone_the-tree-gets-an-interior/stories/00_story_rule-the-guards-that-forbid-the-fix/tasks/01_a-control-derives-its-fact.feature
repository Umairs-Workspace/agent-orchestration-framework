@executable @cli @work @validate
Feature: A control stores the decision nobody can compute, and derives every fact about the tree it asserts over

  A control that asserts against a stored fact about the tree sends its next bill to a stranger: it
  has forced **four consecutive stories** of one milestone outside their declared write sets, each by
  a different control, and each story could only discover which control by running it. This milestone
  moves several hundred files, so the ruling is load-bearing for the four stories behind this one.

  **The species splits three ways when the tree moves, and only two of the three are defects.** A
  LOUD carrier opens a path that no longer exists and fails in the same seconds with the file named —
  that is a control naming its subject, which is what makes it a control. A SILENT carrier goes
  vacuous: `test/arch/acd-mesh-ui-single-data-command.test.mjs:71-77` sets `files = []` inside a
  `catch` and then asserts `joiners.length <= 1`, so once `src/commands/mesh-*.mjs` moves the claim is
  asserted over the empty set forever, with no message anywhere. The model is
  `test/arch/acd-controls-never-execute.test.mjs:664` — `assert.ok(edges >= 1, …)` behind a
  `startsWith("work-doctor")` filter, so a move reds it rather than emptying it.

  **The subject set is bounded by measurement, not by ambition.**
  `grep -rn 'assert\.equal([A-Za-z_$.]*\.length, [0-9]\+' test/*.test.mjs test/arch/*.test.mjs | wc -l`
  returns **1,641** sites across **502** files, and almost all of them assert over a temp fixture the
  test itself built — where the fixture IS the oracle and the equality is exact for good reason. The
  carriers are the controls whose set is produced by **walking the repository**, and it is that walk,
  not the literal, that makes the assertion a claim about the tree.
  `grep -rlE 'startsWith\("(mesh|work|assets|graph|loop|acd)-' test/arch/*.test.mjs` returns **4** —
  three carriers and one that filters finding codes rather than filenames. The candidate grep is not
  the answer; the sweep is.

  A derivation that asserts less is a weakening, not a fix. Each equality is replaced by the property
  it was standing in for, asserted over **every** member, with a floor kept for non-vacuity: the floor
  is a bound nobody can compute and stays stored, the equality goes. `SINK_CEILING`
  (`test/arch/acd-session-driver-single-home.test.mjs:39`, currently `2482`) and `SINK_FLOOR` (`:40`)
  are declared bounds, not facts; neither is softened, lowered or deleted here.

  What would quietly undo this: a derivation that keeps the count and drops the property, which reads
  as a smaller diff; a "known carriers" baseline list, which is the stored fact one level up; a sweep
  whose own walk can empty; and softening `SINK_CEILING` to make a later story cheaper, whose whole
  value is that raising it costs an ADR sentence.

  ADR-001 §2, ADR-003. FF-11902.

  Scenario Outline: the classifier separates a decision a reader cannot compute from a fact the tree already holds
    Given the stored literal <literal>
    When the control is classified
    Then it is <verdict>

    Examples: a bound and a policy are decisions; a count, a census and a citation are facts
      | literal                                                       | verdict                                  |
      | `SINK_CEILING = 2482`, a declared ceiling with no headroom     | decision — stays, with its reason in its comment |
      | `SINK_FLOOR = 1500`, a declared floor                          | decision — stays, with its reason in its comment |
      | a policy allowlist of the modules permitted to open a store    | decision — stays, with its reason in its comment |
      | `assert.equal(suites.length, 48)` over a walk of `test/`       | fact — derived, with a floor kept         |
      | a closed member census over a `readdir` of `test/arch/`        | fact — derived, with a floor kept         |
      | a closed list of the source files that import a module         | fact — derived, with a floor kept         |
      | a `<path>:<line>` citation checked against the symbol it names | fact — derived from the file              |
      | an exact size asserted over a temp fixture the test built      | not a carrier — the fixture is the oracle |

  Scenario Outline: each of the door's tree-walk equalities becomes the property it stood in for, plus a floor
    Given `test/agent-session-driver-door.test.mjs` and its census of the sink's dependents
    And the assertion at <site>
    When the control runs
    Then the equality is gone
    And the property <property> is asserted over every member
    And a floor of <floor> is kept for non-vacuity

    Examples: seven sites, measured at HEAD 2026-09-06
      | site   | property                                                        | floor |
      | `:598` | each member is a `*.test.mjs` file that statically imports the sink | 48 |
      | `:599` | each member is a `test/support/*.mjs` fixture importing the sink | 2     |
      | `:600` | each member is a file under `src/` or `scripts/` importing the sink | 4  |
      | `:601` | the three classes partition the census exhaustively              | 54    |
      | `:660` | the split's subject is the census the same walk produced         | 48    |
      | `:668` | each member of the zero-mention class names the driver zero times | 44   |
      | `:715` | each import-safe member links in one fresh process               | 53    |

  Scenario: a floor is a floor, not a second equality wearing one
    Given a derived census with a floor of 48
    When one suite that imports the sink is deleted rather than kept green
    Then the control fails
    When a new suite that imports the sink is added
    Then the control passes without any edit to it

  Scenario Outline: a move reds a control; it never empties one
    Given a control whose subject set is produced by walking the repository
    When <event>
    Then the control fails naming the subject it could not find
    And it does not pass over the empty set

    Examples: the four ways a sweep goes quiet
      | event                                                        |
      | the directory it walks is renamed                            |
      | every member matching its filename prefix moves into a subdirectory |
      | its `readdir` throws and the catch would substitute an empty list |
      | the walk succeeds and matches nothing                        |

  Scenario: every sweep asserts its own non-vacuity, in the same check that uses the set
    Given a control that sweeps the repository tree
    When the control runs
    Then it asserts the swept set is non-empty before asserting anything over it
    And the failure message names the directory that was walked

  Scenario: the control names the carriers it finds, and is non-vacuous on the day it lands
    Given this tree at the commit the control lands on
    When the control runs
    Then it reports the carriers it found by file and line
    And it asserts the set of controls it examined is non-empty
    And `test/arch/acd-mesh-ui-single-data-command.test.mjs` is among the carriers it names
    And `test/agent-session-driver-door.test.mjs` is among the carriers it names

  Scenario: the two declared bounds are unchanged by this story
    Given `test/arch/acd-session-driver-single-home.test.mjs` at HEAD
    When this story's diff over that file is read
    Then `SINK_CEILING` still reads `2482`
    And `SINK_FLOOR` still reads `1500`
    And neither constant is deleted, softened, or given headroom
    And the ratchet is asserted shrink-only, so lowering it needs no further decision

  Scenario: the red probe plants the silent shape and is caught by name
    Given a planted control that filters a `readdir` by filename prefix with no non-vacuity leg
    When the sweep runs
    Then it fails naming the planted control and the line of its unguarded filter
    Given the planted control gains a floor asserted over the filtered set
    When the sweep runs again
    Then it passes
