@executable @bug @finding-F-73-G @cli @work @work-stream
Feature: a record doc that cannot be read is a fault with its own code, not an idempotent no-op

  WITHOUT THIS, TASK 00's BOUND IS UNENFORCEABLE. The story reserves the narrowing to exactly one
  code and requires that *"an unreadable or frontmatter-less record doc keeps throwing"*. It cannot:
  today those faults ARE that code. `writeItemStatusLine` (`src/work.mjs:619-634`) throws the
  CALLER's code for three doc-shape faults — no record doc, unreadable, no frontmatter block — and
  on the forward face the caller's code is `status-edge-not-applicable`. So a flag that swallows the
  code would swallow a malformed record doc with it, and the narrowing would be a claim the code
  cannot make.

  IT IS ALREADY SWALLOWED ONCE, WHICH IS WHY THIS IS A BUG AND NOT A NEW BOUND. F-73-G, raised at
  story 73's accept and routed as one of the two defect-typed follow-ons worth doing first: the
  run-mint reactor treats `status-edge-not-applicable` as its SANCTIONED no-op
  (`effects/table.mjs:76`), so a mint against an item whose record doc is malformed reports
  `{ skipped: true }` and the fault never surfaces. The known leading `<!-- aof-generated: bundle -->`
  comment trap — a hand-authored record doc whose frontmatter parses as nothing — lands exactly here.
  Adding the flag without this would make it twice.

  THE FIX IS AT THE SHARED WRITER, NOT AT ITS TWO CALLERS. The fault is a property of the DOCUMENT,
  not of the transition asked for, so it cannot honestly borrow the caller's refusal vocabulary —
  and the rollback face has the same hole, where `rollback-not-applicable` is likewise the sanctioned
  no-op (`rollbackStatusIfFailed`). One code raised from the one place that detects the fault fixes
  both faces and leaves each caller's own refusal untouched.

  Scenario Outline: a doc-shape fault is refused with its own code, on both faces of the shared writer
    Given an item whose record doc <fault>
    When I move it through <face>
    Then the writer raises a "record-doc-unusable" error
    And the message names the item's ref and which fault it hit
    And no status line anywhere is rewritten

    Examples:
      | fault                                                              | face                 |
      | is absent from the item folder                                     | the lifecycle writer |
      | cannot be read                                                     | the lifecycle writer |
      | has no frontmatter block                                           | the lifecycle writer |
      | opens with a comment before the frontmatter fence                  | the lifecycle writer |
      | is absent from the item folder                                     | the rollback writer  |
      | has no frontmatter block                                           | the rollback writer  |

  # The re-coding must narrow the fault OUT of the refusal, not move the refusal.
  Scenario Outline: the lifecycle refusals keep their own codes, unchanged
    Given an item whose record doc is well-formed and whose frontmatter status is "<from>"
    When I move it to "<to>" through the lifecycle writer
    Then the writer raises a "<code>" error
    And the record doc is byte-unchanged

    Examples:
      | from        | to          | code                       |
      | done        | in-progress | status-edge-not-applicable |
      | in-progress | in-progress | status-edge-not-applicable |
      | not-started | started     | invalid-status             |

  # A record doc with a frontmatter block but NO `status:` line is a different thing from a doc with
  # no frontmatter at all: the document is usable, and the refusal is the lifecycle's, because a
  # missing status has no legal from-state. Story 73 delivered that clause; it must not move.
  Scenario: a usable doc carrying no status line is still the lifecycle's refusal, not a doc fault
    Given an item whose record doc has frontmatter but no `status:` line
    When I move it to "in-progress" through the lifecycle writer
    Then the writer raises a "status-edge-not-applicable" error
    And the record doc is byte-unchanged

  Scenario: the run-mint reactor's sanctioned no-op stays narrow
    Given a `run.started` event for an item whose record doc has no frontmatter block
    When the advance-status reactor runs
    Then it does not report a skip of "status-edge-not-applicable"
    And the fault is surfaced rather than absorbed as ordinary idempotence
    And the mint itself is not failed by it
    And a mint against a well-formed item already "in-progress" still reports the sanctioned skip

  Scenario: the failure rollback's sanctioned no-op stays narrow too
    Given a `run.completed --outcome failed` event for an item whose record doc is absent
    When the rollback reactor runs
    Then it does not report a skip of "rollback-not-applicable"
    And the fault is surfaced rather than absorbed
    And a rollback against a well-formed item that is not "in-progress" still reports the sanctioned skip

  Scenario: --if-applicable does not swallow a doc fault
    Given a story whose record doc opens with a comment before the frontmatter fence
    When I run "aof work status <ref> in-progress --if-applicable"
    Then the command fails with "record-doc-unusable"
    And it exits non-zero
