@uat @cli @work-stream
Feature: the operator sees their understanding apart from shipping

  WHY. Whether a check's feedback is specific, fair and useful, and whether it ever reads like a
  grade, only a person can judge. The operator runs one check on a story they built, and records the
  verdict and any observation in the milestone's VERIFICATION.md. No claim of learning efficacy is
  made; that is the pilot's (04).

  Scenario: the operator is checked on a story they built and accepts the interaction
    Given a story the operator built themselves, through `aof:teach` or `aof:manual`
    When the operator runs `/aof:grill-me <ref>` on Claude Code and answers, skips or asks for help as they choose
    Then the operator confirms that every result names the help they actually had
    And the operator confirms that each gap named was specific to the story and came with a next practice opportunity
    And the operator confirms that nothing in the session read as a grade, a score or a mastery verdict
    And the operator records accept or reject, with any observation, in VERIFICATION.md
