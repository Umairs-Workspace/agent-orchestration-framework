@uat @cli @work-stream
Feature: the operator is taught, not taken over

  WHY. The milestone's claim is that a person keeps the keyboard and is helped to think, which only a
  person can judge. The operator runs one teaching session on a real story of their choosing, and
  records the verdict and any observation in the milestone's VERIFICATION.md. No claim of learning
  efficacy is made; that is milestone 180's.

  Scenario: the operator works one story through a teaching session and accepts the interaction
    Given a refined story the operator has not built, in a repository of their choosing
    When the operator runs `/aof:teach <ref>` on Claude Code and works the story to green with the session's help
    Then the operator confirms that the session never wrote or offered to write their code unasked
    And the operator confirms that every hint they received was one they asked for
    And the operator records accept or reject, with any observation, in VERIFICATION.md
