Feature: Memory lesson recurrence — a new lesson names the lesson it repeats and where its prevention went
  153/02 binds its two task features (01_preserve-forward-lesson-metadata,
  02_match-recurrences-from-labelled-evidence) to the REAL CLI. `Promoted to` and `Recurs` ride the
  existing lesson meta line: validate holds them at a retrospective's `promotionFrom` watermark,
  ingest keeps them in the frozen record slots, and `aof work memory recurrence <lesson text>
  [--exclude <ref>]` decides, from a calibrated score over the whole lesson index, whether a new
  lesson repeats an earlier one. The labelled texts are the calibration fixture's
  (test/arch/memory/fixtures/recurrence-pairs.json), so this feature and FF-15302 judge the same
  incidents. The tasks' Scenario Outlines are expanded one row per scenario because this runner has
  no Examples support. The @manual threshold-audit scenario is the verifier's: it is recorded with
  its red probe in the milestone VERIFICATION.

  Rule: R1 · New lessons name a promotion while older lesson bodies remain unchanged

  Scenario: E2 · Missing promotion is held at the new-lesson boundary
    Given a live retrospective with promotionFrom 4 and a conforming R4 without Promoted to
    When I run `work validate 07 --json`
    Then the command should fail
    And the validation findings mention "R4" and "Promoted to"

  Scenario: E1 · A promotion of none at the watermark is accepted and older lessons owe nothing
    Given a live retrospective with promotionFrom 4 and a conforming R4 with Promoted to "none"
    When I run `work validate 07 --json`
    Then the command should succeed

  Scenario: Malformed forward boundaries do not silently exempt new lessons
    Given a live retrospective with promotionFrom "four" and a conforming R4 with Promoted to "none"
    When I run `work validate 07 --json`
    Then the command should fail
    And the validation findings mention "promotionFrom" and "positive integer"
    And the retrospective is byte-identical to what was written

  Scenario: E3 · Promotion and recurrence are indexed into the frozen record fields, and ingest leaves the source alone
    Given the local memory backend and a retrospective whose R4 has Promoted to "prompt:packages/core/assets/commands/refine.md", Recurs "m45/R13" and Kind "mistake (recurring)"
    When the memory index is built and the lessons are recalled
    Then the recalled R4 status is "prompt:packages/core/assets/commands/refine.md"
    And the recalled R4 tags are "recurring" and "recurs:45/R13"
    And the recalled legacy R1 status is empty and has no recurs tag
    And the retrospective is byte-identical to what was written

  Rule: R2 · Whole-index recurrence uses the calibrated lesson match across kinds

  Scenario: E4 · The named junction recurrence crosses item and Kind boundaries
    Given the local memory backend indexing lesson "45/R13" from item 45 and lesson "68/R10" from item 68
    When recurrence is evaluated for the text of "68/R10" excluding "68/R10"
    Then the command should succeed
    And the qualifying reference is "45/R13"
    And the result reports a score above its threshold and a calibration version
    And no source document was edited

  Scenario: E5 · Similar vocabulary is not sufficient evidence of recurrence
    Given the local memory backend indexing lesson "43/R7" from item 43 and lesson "47/R4" from item 47
    When recurrence is evaluated for the text of "47/R4" excluding "47/R4"
    Then the command should succeed
    And there is no qualifying reference
    And the result still reports the best candidate score and the threshold

  Scenario: E6 · The excluded identity never matches itself
    Given the local memory backend indexing lesson "45/R13" from item 45 and lesson "68/R10" from item 68
    When recurrence is evaluated for the text of "68/R10" excluding "45/R13"
    Then the command should succeed
    And the candidates are exactly "68/R10"

  Scenario: Memory off decides no candidates and writes nothing
    Given memory is off and lesson "68/R10" is in item 68
    When recurrence is evaluated for the text of "68/R10" excluding "none"
    Then the command should succeed
    And there is no qualifying reference
    And there are no candidates
    And no retrieval index exists anywhere

  Scenario: A malformed exclusion is refused before any decision
    Given the local memory backend indexing lesson "45/R13" from item 45 and lesson "68/R10" from item 68
    When recurrence is evaluated for the text of "68/R10" excluding "R10"
    Then the command should fail
    And the JSON error envelope should carry code "invalid-exclude"
