@executable @cli @work @validate
Feature: The doctor lane — the record is reported, and nothing is blocked

  ONE LANE, APPENDED. `CHECK_GROUPS` (`src/work-doctor.mjs:575`) is an append-only array of pure
  `(snapshot, ctx) => Finding[]` functions; this milestone appends one entry, the shape 66/02 and
  54/04 each used. The group is pure — it answers from the snapshot and reads no disk, so it tests
  against literal snapshots with no filesystem present.

  IT REPORTS AND NEVER GATES (ADR-007). Every finding is `warn`, and a warn-only doctor result does not
  fail `aof:validate` — which is the intended strength, not a weakness. Three arguments stand behind
  it: 66 declined the same move for the observability report; 59's thesis that a rubber-stamped
  agent-generated record launders a machine claim as human judgement; and the measurement taken at
  refine — 0 of 61 run records carry `brief.loop`, so a gate's first act would be to refuse every
  accept in the stream over a fact no operator can currently supply.

  THE RECORD IS READ WHEN PRESENT AND NEVER DEMANDED (ADR-001). `EXECUTION.md` is deliberately not in
  `CONVENTION_DOCS`: an item that ran no loops owes no record, and a lane that demanded one from every
  item would report on the whole stream on day one.

  Scenario: an item with no record produces no finding
    Given a work item with no `EXECUTION.md`
    When `aof work doctor` runs over it
    Then the lane produces no finding for that item
    And the record is not reported as missing

  Scenario Outline: each finding is produced by its own cause, and every one is a warning
    Given a work item whose <fixture>
    When `aof work doctor` runs over it
    Then a <code> finding is produced, anchored at `EXECUTION.md`
    And its severity is `warn`

    Examples: the frozen codes of this lane
      | code                     | fixture                                                                       |
      | loop-record-unsigned     | record carries engagements and no row is signed                                |
      | loop-record-part-signed  | record carries several engagements and only some rows are signed               |
      | loop-record-stale        | record's engagements do not match what the item's run records now project       |
      | loop-record-malformed    | record's sign-off heading or header row is not the frozen literal               |

  Scenario: every code in the lane is reachable, and no other code is emitted
    Given a fixture stream engineered to fire every code in this lane at once
    When `aof work doctor` runs over it
    Then each frozen code is produced at least once
    And no code outside the frozen set reaches a reader

  Scenario: the severity does not harden once the item is done
    Given an item carrying an unsigned record
    When `aof work doctor` runs while the item is open
    And when it runs once that item is `done`
    Then the finding is `warn` in both cases

  Scenario: a warn-only result does not fail validate
    Given a stream whose only findings come from this lane
    When `aof work validate` runs
    Then it is green
    And the doctor findings are still reported

  Scenario: no door reads the signature as a verdict
    Given an item whose record is unsigned
    When the item is moved to `done`
    Then the move succeeds
    And no status, doctor, validate or acceptor door consulted the signature

  Scenario: the group answers from a literal snapshot with no filesystem present
    Given a snapshot constructed in memory whose paths name a directory that does not exist
    When the group is called
    Then it returns its findings without reading disk
    And calling it twice with the same snapshot returns byte-identical findings

  Scenario: doctor's existing answers are unchanged
    Given a stream carrying no `EXECUTION.md` anywhere
    When `aof work doctor` runs over it
    Then its findings are identical to the pre-change answer, code for code and path for path
    And the lane appears in the check registry exactly once
