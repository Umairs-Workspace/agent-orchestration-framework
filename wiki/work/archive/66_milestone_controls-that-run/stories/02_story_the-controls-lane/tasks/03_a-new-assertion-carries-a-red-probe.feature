@executable @cli @work @validate
Feature: A declared control carries a recorded failing observation

  THE ONE PROPERTY ALL FOUR MEASURED GUARD DEFECTS SHARED: nobody had ever seen the assertion fail.
  Four `\b` word boundaries in a prohibition guard were literal `0x08` bytes, so the pattern could
  never match — and a prohibition guard's EXPECTED state is green, so a vacuous ban is
  indistinguishable from a working one by every signal except a red probe. A second guard's clause
  could not cross a newline; its first execution under a runner was at a later story's verify. A
  third had no test at all. A fourth was fed hand-written literals, so the predicate it existed to
  check was never called. The architect's own audit of five put FOUR OF FIVE "green for the wrong
  reason".

  THE PRACTICE ALREADY EXISTS IN CODE AND IS INVISIBLE TO THE RECORD. 164 of ACD's 287 arch tests
  (57%) carry a self-check, non-vacuity or planted-defect lane;
  `test/arch/acd-no-internal-project-names.test.mjs:132-155` is the model. Against that, 0 of 50
  `VERIFICATION.md` files mention a red probe in any form — because ACD ships no `VERIFICATION.md`
  template at all, and doctor checks only that the file exists and is non-empty
  (`src/work-doctor.mjs:109`). You cannot require a field on a model that has no fields.

  SHAPE, NEVER CONTENT. Doctor checks that a row exists for the declared id and that its probe cell
  is non-empty and is not the placeholder. It makes no natural-language judgment about whether a
  failure message is plausible — the same trick `duplicate-driver-number` already plays.

  THE PLACEHOLDER LITERAL IS FROZEN IN ADR-009/H, WHICH IS WHY THIS LANE NEEDS NO EDGE ON 66/03.
  Freezing a literal in an ADR is the instrument ADR-001 §2 already uses for the declaration
  grammar; the ADR is the one home, and both this check and the shipped template take the token
  from it. So the token is not 66/03's template file to define, and 66/03 stays dependency-free.

  WHAT THIS CANNOT CATCH, SO THE CONTRACT NEVER IMPLIES OTHERWISE: a fabricated probe (no
  declarative model can catch one); any assertion that is not a declared control; and whether the
  probe was performed on the bytes that shipped. The claim is that an invisible absence becomes a
  specific, checkable lie in a document a reviewer reads. A smaller surface, not a closed one.

  THE OBLIGATION RUNS FROM ONE REGISTER TO THE OTHER, ID BY ID. For each id declared in the item's
  `## Fitness functions`, the item's `VERIFICATION.md` fitness register must carry a row with that
  id in first position and a red-probe cell that is neither empty nor the frozen placeholder. The
  register's columns are id, enforced by, result, red probe (ADR-005 §1). A register absent
  altogether is ONE finding for the document, never one per declared id, because the fix is one act
  — the cardinality rule `duplicate-driver-number` already sets ("the collision is one fact about
  the stream, not one per participant", `src/work-doctor.mjs:372-376`).

  Scenario Outline: the probe-cell matrix
    Given a milestone declaring `FF-01` in its architecture register
    And a verification document where <state>
    When `aof work doctor` runs
    Then the finding is <finding>

    Examples: the register itself
      | state                                                        | finding                                                  |
      | no fitness register section exists                            | one missing-register finding for the document            |
      | a fitness register exists carrying no row for `FF-01`         | one missing-red-probe finding naming `FF-01`             |
      | a fitness register exists and the milestone declares no ids   | none, a register with no ids declares nothing            |
      | a fitness register carries a row for `FF-02`, never declared  | none from this check, the obligation runs from the architecture register outward |

    Examples: the cell, once the row exists
      | state                                                        | finding                                                  |
      | the red-probe cell is empty                                   | missing-red-probe, an empty cell records no observation  |
      | the red-probe cell holds spaces and a tab only                | missing-red-probe, whitespace is not an observation      |
      | the red-probe cell holds the frozen placeholder alone          | missing-red-probe, a placeholder is never evidence       |
      | the red-probe cell holds the placeholder quoted inside a recorded observation | none, the cell is not the placeholder       |
      | the red-probe cell holds a recorded failure message            | none                                                     |
      | the red-probe cell holds an implausible sentence               | none, the check is shape and makes no judgment           |
      | the red-probe cell holds a single hyphen                       | none, it is non-empty and not the placeholder            |

  Scenario: the untouched shipped template is reported, and the placeholder literal has one home
    Given a milestone scaffolded from the shipped `VERIFICATION.md` template, with one declared control
    When `aof work doctor` runs before anybody edits the template's fitness rows
    Then the placeholder row is reported as a missing red probe
    And the token this lane treats as a placeholder is the literal ADR-009/H freezes, which is also where the shipped template takes it from
    And a second literal of that token in either place would be a defect, because a drifted copy passes silently

  Scenario: the id in the verification register is not itself reported as a dangling citation
    Given a milestone whose verification fitness register carries a row for its own declared `FF-01`
    When `aof work doctor` runs
    Then no dangling-citation finding is produced for that row
    And the form the shipped template asks authors to write is the form that resolves

  Scenario: a document with no register at all is reported once, however many controls are declared
    Given a milestone declaring eight fitness functions
    And a verification document with no fitness register section
    When the check runs
    Then exactly one missing-register finding is produced for that document
    And no missing-red-probe finding is produced alongside it, because the fix is one act

  Scenario: the obligation reaches declared controls and nothing else
    Given a milestone with declared fitness functions and hundreds of scenarios across its task features
    When the check runs
    Then the obligation is asserted for the declared ids only
    And no claim is made over any scenario or over any assertion inside a behavioural suite
