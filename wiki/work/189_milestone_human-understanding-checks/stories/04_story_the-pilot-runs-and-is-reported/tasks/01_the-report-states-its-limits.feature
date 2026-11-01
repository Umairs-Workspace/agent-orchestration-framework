@manual @docs @planning
Feature: the report states its limits

  WHY. At n = 1 the pilot shows whether the kit runs and what one person could do unaided, nothing
  wider, and the report must say so in its own words (SPEC Scope, ADR-005 §5). A developer drafts
  `wiki/planning/PILOT-REPORT-human-led-learning.md` from the filled sheet and the report template.
  The operator's acceptance of the report is task 02.

  Rule: R2 · The report states its limits

    Scenario: E2 · a skipped item is listed as missing
      Given the sheet shows pack A's adapt item as `skipped`
      When the report is drafted
      Then it says n = 1
      And it lists pack A's adapt item among the missing observations, and counts it nowhere as a result

    Scenario: E3 · the order effect is named as unseparated
      Given the sheet records the order pack A taught, then pack B manual
      When the report is drafted
      Then it says the order effect cannot be separated from the arm at n = 1

  Rule: R3 · A delayed item is run about a week later

    Scenario: E5 · a missed delayed item removes the retention claim for its pack
      Given the sheet has no delayed result for pack B
      When the report is drafted
      Then it lists pack B's delayed item as missing
      And it claims nothing about retention for pack B

  Scenario: assisted completion and unaided results are reported apart
    When the report is drafted
    Then it gives each arm's assisted completion and quality in one section, and the unaided item results in another
    And it gives no single score combining them

  Scenario: the report holds no raw answer
    When the report is read
    Then it quotes no participant answer and holds no transcript

