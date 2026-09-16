@executable @cli @work @validate
Feature: The gate run is recorded as evidence — what ran, when, against which commit, and what failed

  `aof test --scope all` already computes the gate boolean — `scope === "all" && widened.length === 0`
  — and then discards it. So the gate is not a new test run. It is durability and a door over a result
  the command already produces, and the first half of that is this contract.

  A boolean is not evidence. It cannot be read at accept, diffed against the last milestone, or used
  to tell a gate that ran from a gate that ran on a tree somebody was editing. The record carries the
  commit, the instant, the scope and what failed, and a rerun APPENDS — so the door reads the newest
  row and the history stays readable. An overwrite would make the record the same shape as the boolean
  it replaced.

  Where it lives follows 78/ADR-001 verbatim, because that ADR's reasoning transfers without change: a
  peer document in the item's own folder, never a section of `VERIFICATION.md` whose single writer is
  the product owner, and never under `runs/` or `observability/`, both of which their own headers
  declare rebuildable or deletable. Evidence that survives to accept cannot live in a directory the
  system is entitled to delete.

  The run must happen where nothing else is writing. A downstream retrospective records two agents
  red-probing on one checkout and getting silently unreliable results; another records worktrees
  isolating source but not derived artefacts, the database or the git index. A gate that runs inside
  whichever lane happens to hold the tree measures that lane, not the milestone — so a dirty tree is a
  refusal naming what is dirty, and the record names the commit it ran against.

  A half-written row is the failure this document cannot have. A row missing its commit, its instant,
  its scope or its result must be UNREADABLE rather than skipped, because a skipped row and a green
  gate render identically to the door — which is the observability report's failure mode with worse
  consequences.

  What would quietly undo this: a rerun that overwrites; a row written before the run finishes; and a
  record accepted from a run whose scope was not `all` or whose selection widened, either of which is
  a partial run wearing a gate's name.

  ADR-008 §1, §2. FF-9606.

  Scenario: a green gate run writes a row naming what it proved
    Given a clean checkout at a known commit
    When `aof work regression-gate <ref>` runs and the suite passes
    Then a row is appended to the milestone's regression record
    And it carries that commit
    And it carries the instant the run finished
    And it carries the scope the run ran as
    And it records the result as green

  Scenario: a red gate run records what failed
    Given a clean checkout at a known commit
    When `aof work regression-gate <ref>` runs and the suite fails
    Then a row is appended recording the result as red
    And it names what failed
    And the command exits non-zero

  Scenario: a rerun appends and the earlier row survives
    Given a milestone whose regression record already holds one row
    When the gate runs again at a later commit
    Then the record holds two rows
    And the earlier row is unchanged
    And the newest row is the one the door reads

  Scenario Outline: the run refuses a tree it cannot trust
    Given a checkout that is <state>
    When `aof work regression-gate <ref>` runs
    Then it <outcome>

    Examples: a gate measures the milestone or it measures nothing
      | state                                  | outcome                                      |
      | clean                                  | runs the suite and appends a row             |
      | carrying uncommitted tracked changes   | is refused, naming what is dirty             |
      | carrying untracked files under a source root | is refused, naming what is dirty       |

  Scenario Outline: a row missing any of its four facts is unreadable, never skipped
    Given a regression record whose newest row is missing its <field>
    When the record is read
    Then the read is refused, naming the malformed row
    And no row is silently ignored

    Examples: the four facts a gate row is made of
      | field   |
      | commit  |
      | instant |
      | scope   |
      | result  |

  Scenario Outline: a run that was not a whole-tree run is recorded and does not satisfy the door
    Given a gate run whose <property>
    When the row is written
    Then it is recorded
    And it is marked as not satisfying the door

    Examples: two ways to be a partial run
      | property                        |
      | scope was not `all`             |
      | selection widened during the run |

  Scenario: the record lives beside the milestone's other records
    Given a milestone whose gate has run
    When the written path is resolved
    Then it is inside that milestone's own directory
    And it is not under that item's runs directory
    And it is not under that item's observability directory
    And no section of the milestone's verification document was written

  Scenario: the document's frozen shape has one home
    Given the modules that write and read the regression record
    When they are examined
    Then the heading, the table header row and the divider are exported constants
    And no comparison site holds a second copy of any of them
