@executable @cli @work @validate
Feature: The anchor check joins the readiness score, and an unreadable registry is still not a pass

  The readiness score composes the registry's structural checks by id, and the anchor check is a new
  one. Registering it belongs here rather than with the story that builds it, because this is the
  story that gates on the result — a gate that inherits a half-registered score is a gate that
  passes for the wrong reason, quietly, on the exact rung where that matters most.

  The property that has to survive registration is the score's existing honesty about not knowing. A
  registry it cannot read yields not-applicable, never a pass. That distinction is the reason the
  score is worth gating on at all: it can say "I could not tell", and a gate can treat that as a
  refusal rather than a green light.

  ADR-006, ADR-007. FF-5508.

  Scenario: the anchor check appears in the score
    Given a workspace with a readable registry
    When the readiness score is computed
    Then the anchor check is among the checks it composes

  Scenario: the check is composed, not re-derived
    Given the readiness score
    When it is computed
    Then the anchor check's verdict comes from the registry's own check
    And the score does not recompute it

  Scenario: an unreadable registry yields not-applicable rather than a pass
    Given a workspace whose registry cannot be read
    When the readiness score is computed
    Then every composed check reports not-applicable
    And the reason is stated

  Scenario: a not-applicable score does not admit L3
    Given a workspace whose registry cannot be read
    When a loop is requested at L3
    Then it is refused

  Scenario: a workspace with no registry is reported as such
    Given a workspace that has never installed a registry
    When the readiness score is computed
    Then the absence is reported
    And no composed check reports a pass

  Scenario: the score stays a fraction over equally weighted checks
    Given a workspace where some checks pass and others fail
    When the score is computed
    Then it reflects each composed check equally
