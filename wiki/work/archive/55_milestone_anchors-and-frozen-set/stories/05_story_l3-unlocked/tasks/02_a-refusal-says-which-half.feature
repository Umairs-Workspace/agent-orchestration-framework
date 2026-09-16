@executable @cli @work @work-stream
Feature: A refused request says which half failed, and names the parts that failed it

  The milestone's claim is that ungrounded is computable rather than a matter of taste — a component
  with no path to an anchor is floating free, and the command can say so by name. A refusal that
  amounts to "not yet" throws that away and leaves the operator with a system that has an opinion
  and no argument.

  The refusal is the most-read output this story produces, because by definition it is what a
  workspace sees until it qualifies. It has to be actionable: which half failed, which checks or
  which components did it, and therefore what would have to change.

  ADR-006. FF-5508.

  Scenario: a refusal on the score names the failing checks
    Given a workspace whose readiness score does not pass
    When a loop is requested at L3
    Then the refusal names the checks that failed

  Scenario: a refusal on grounding names the components
    Given a workspace with two floating components
    When a loop is requested at L3
    Then the refusal names both components and their members

  Scenario: a refusal on a decayed anchor names the pointer
    Given a workspace whose anchor no longer resolves
    When a loop is requested at L3
    Then the refusal names the anchor and the authority that failed to resolve

  Scenario: a refusal failing both halves reports both
    Given a workspace failing the score and carrying a floating component
    When a loop is requested at L3
    Then both halves are reported

  Scenario: the refusal is machine-readable
    Given a refused L3 request
    When the outcome is read in its machine form
    Then it carries a code
    And it carries the failing half and its particulars as structured values

  Scenario: the refusal is not a crash
    Given a workspace that does not qualify
    When a loop is requested at L3
    Then the command completes and reports the refusal
