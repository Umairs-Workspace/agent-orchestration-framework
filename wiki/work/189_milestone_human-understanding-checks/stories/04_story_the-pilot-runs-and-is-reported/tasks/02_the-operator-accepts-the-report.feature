@uat @docs @planning
Feature: the operator accepts the report

  WHY. The report is a human-reviewed research deliverable, not automatic learner telemetry (SPEC
  Scope). Whether it says only what the evidence supports is the operator's judgement.

  Scenario: the operator accepts the report as an honest account of the pilot
    Given `wiki/planning/PILOT-REPORT-human-led-learning.md` drafted from the filled sheet
    When the operator reads it
    Then the operator confirms that its audience, sample size, missing observations, spend and limitations are stated
    And the operator confirms that it claims no learning efficacy beyond what was measured
    And the operator records accept or reject, with any observation, in VERIFICATION.md
