Feature: Memory reports effectiveness and health — observed decisions and repeats, never invented evidence
  153/03 binds its two task features (01_account-for-memory-effectiveness,
  02_report-recurring-and-unpromoted-lessons) to the REAL CLI. `aof work memory status` gains a nested
  `effectiveness` block (per record type, and per lesson under --lessons) read from completed recall
  observations and from `Recurs` stamps on distinct new lessons; `aof work doctor` gains two advisory
  warnings: a lesson that recurred, and an unpromoted lesson aged past five later ACCEPTED milestones
  (the operator's 153/03 Q1 answer). The tasks' Scenario Outlines are expanded to the rows this runner
  can express — the full rows (backends, defects, the six age events, the three promotion kinds) run in
  packages/work/test and packages/knowledge/test. The @manual scenarios are the verifier's: they are
  recorded with their red probes in the milestone VERIFICATION.

  Rule: R1 · Accounting preserves record identity and separates observation from recurrence

  Scenario: E1 · Surfacing and recurrence are counted from their separate evidence
    Given lesson "45/R13" is returned by two distinct completed recall observations, honoured then departed
    And one distinct new lesson in item 68 carries Recurs "45/R13"
    When the operator requests memory status with per-lesson accounting
    Then effectiveness lesson "45/R13" has surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 1
    And effectiveness type "lesson" has surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 1
    And the report states that honouring a lesson is not proof of prevention

  Scenario: E2 · Bare lesson ids do not join unrelated items
    Given indexed lessons "45/R13" and "68/R13" of which only "45/R13" has recall evidence
    When the operator requests memory status with per-lesson accounting
    Then effectiveness lesson "68/R13" has surfaced 0 honoured 0 departed 0 irrelevant 0 recurred 0
    And effectiveness lesson "45/R13" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 0

  Scenario: E3 · A removed target retains its observed history
    Given a completed recall records lesson "45/R14" as honoured, and the lesson is no longer in the current index
    When the operator requests memory status with per-lesson accounting
    Then effectiveness lesson "45/R14" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 0
    And lesson "45/R14" has provenance "unresolved"
    And effectiveness type "lesson" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 0

  Scenario: Every returned record type contributes only its own observations
    Given one observation returned a lesson as honoured, an ADR as irrelevant and a capability as departed
    When the operator requests memory status
    Then effectiveness type "lesson" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 0
    And effectiveness type "adr" has surfaced 1 honoured 0 departed 0 irrelevant 1 recurred 0
    And effectiveness type "capability" has surfaced 1 honoured 0 departed 1 irrelevant 0 recurred 0
    And per-lesson detail is omitted but the legacy status fields and record counts remain

  Scenario: Accounting is shared by the local backend
    Given the work stream holds two complete observations of lesson "45/R13" and the "local" memory backend is selected
    When the operator requests memory status
    Then effectiveness type "lesson" has surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 0
    And no source file was changed

  Scenario: Accounting is shared by the none backend
    Given the work stream holds two complete observations of lesson "45/R13" and the "none" memory backend is selected
    When the operator requests memory status
    Then effectiveness type "lesson" has surfaced 2 honoured 1 departed 1 irrelevant 0 recurred 0
    And no source file was changed

  Scenario: Empty and missing observations do not become lesson exposures
    Given an item has one completed recall with an empty records array and another item has no ledger
    When the operator requests memory status
    Then effectiveness type "lesson" has surfaced 0 honoured 0 departed 0 irrelevant 0 recurred 0
    And the report is complete with no diagnostics

  Scenario: Archived and story evidence is included without transitive recurrence
    Given an archived lesson "45/R13" is recalled by a story-owned observation, "68/R10" recurs from it and a third lesson "69/R2" recurs from "68/R10"
    When the operator requests memory status with per-lesson accounting
    Then effectiveness lesson "45/R13" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 1
    And effectiveness lesson "68/R10" has surfaced 0 honoured 0 departed 0 irrelevant 0 recurred 1

  Scenario: Identical replay evidence cannot inflate accounting
    Given the ledger holds one recall observation row twice, and one new lesson is listed twice
    When the operator requests memory status with per-lesson accounting
    Then effectiveness lesson "45/R13" has surfaced 1 honoured 1 departed 0 irrelevant 0 recurred 1

  Scenario: Unreadable evidence is not reported as a successful zero — malformed ledger JSON
    Given the evidence contains malformed ledger JSON
    When the operator requests memory status
    Then the report diagnoses "malformed ledger JSON" naming its source and is not complete
    And no source file was changed

  Scenario: Unreadable evidence is not reported as a successful zero — unknown ledger kind
    Given the evidence contains an unknown ledger kind
    When the operator requests memory status
    Then the report diagnoses "unknown ledger kind" naming its source and is not complete

  Scenario: Unreadable evidence is not reported as a successful zero — conflicting payloads
    Given the evidence contains conflicting payloads for one recall id
    When the operator requests memory status
    Then the report diagnoses "conflicting payloads for one recall id" naming its source and is not complete

  Scenario: Unreadable evidence is not reported as a successful zero — unreadable ledger file
    Given the evidence contains an unreadable ledger file
    When the operator requests memory status
    Then the report diagnoses "unreadable ledger file" naming its source and is not complete

  Rule: R2 · Unpromoted lesson age warnings start at the operator-selected acceptance threshold

  Scenario: E4 · The default warning is quiet at age four
    Given a lesson with Promoted to "none" in an item accepted on 2026-01-01 and 4 later accepted milestones
    When the operator runs normal work doctor
    Then no aged-unpromoted warning is emitted

  Scenario: E4 · The default warning starts at five later accepted milestones
    Given a lesson with Promoted to "none" in an item accepted on 2026-01-01 and 4 later accepted milestones
    And one more distinct milestone is accepted after that date
    When the operator runs normal work doctor
    Then an advisory aged-unpromoted warning identifies lesson "10/R1", age 5 and default threshold 5

  Scenario: E5 · A legacy absence is labelled apart from an explicit none
    Given a legacy lesson with no Promoted to field in an item accepted on 2026-01-01 and 5 later accepted milestones
    When the operator runs normal work doctor
    Then the aged-unpromoted warning for "10/R1" is labelled missing

  Scenario: E5 · An explicit none is labelled explicit
    Given a lesson with Promoted to "none" in an item accepted on 2026-01-01 and 5 later accepted milestones
    When the operator runs normal work doctor
    Then the aged-unpromoted warning for "10/R1" is labelled explicit none

  Scenario: E6 · Missing acceptance evidence remains unknown age
    Given an accepted item without an acceptance date holds an unpromoted lesson, and 8 later-numbered milestones exist
    When the operator runs normal work doctor
    Then doctor identifies "10/R1" as unknown age and issues no aged-unpromoted warning

  Scenario: A recorded promotion removes the aged-unpromoted signal
    Given a lesson with Promoted to "rule:.aof/rules/cleanup.md" in an item accepted on 2026-01-01 and 10 later accepted milestones
    When the operator runs normal work doctor
    Then no aged-unpromoted warning is emitted

  Rule: R3 · Health signals advise without becoming acceptance controls

  Scenario: E7 · A recurring archived lesson remains visible and unchanged
    Given a distinct lesson "68/R10" carries Recurs "45/R13" and the predecessor is archived and promoted
    When the operator runs normal work doctor
    Then a warning identifies predecessor "45/R13" and the new lesson "68/R10"
    And the archived retrospective is byte-identical

  Scenario: E8 · Memory health warnings preserve normal doctor success
    Given a fixture whose only findings are one recurrence and one aged-unpromoted warning
    When the operator runs normal work doctor
    Then doctor reports both memory findings as warnings with no memory error
    And doctor reports healthy "true" for strict "false"

  Scenario: Strict doctor retains its existing warning policy
    Given a fixture whose only findings are one recurrence and one aged-unpromoted warning
    When the operator runs work doctor in strict mode
    Then doctor reports both memory findings as warnings with no memory error
    And doctor reports healthy "false" for strict "true"

  Scenario: Scoped doctor filters reports without forgetting acceptance context
    Given item "10" holds an unpromoted lesson with 5 later accepted milestones elsewhere and an unrelated item has a recurring lesson
    When the operator runs work doctor scoped to item "10"
    Then doctor reports only in-scope memory findings and computes age 5
