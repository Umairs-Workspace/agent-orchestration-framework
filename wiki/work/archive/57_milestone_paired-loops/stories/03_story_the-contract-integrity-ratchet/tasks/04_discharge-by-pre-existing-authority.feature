@executable @cli @work @validate
Feature: A fired leg clears only against an authority that existed before the work started

  Every one of these legs fires on legitimate work sometimes. Contracts are genuinely renegotiated,
  closed sets are genuinely converted, and a ratchet with no way to discharge a fire is a ratchet
  that gets bypassed on its second week.

  What makes a discharge meaningful is timing. An architectural decision written before the work
  began is an authority; one written during the work, by the same loop that is now citing it, is the
  optimizer authorising itself. So the discharge resolves the ADR id **cited by the weakened
  artifact**, in the **owning item's** own decision register, **as that register stood at the base
  commit**. Spike 56's review measured what happens without all three qualifiers: the rule reads true
  repo-wide and clears virtually every weakening.

  One source is off limits entirely. The comment explaining the weakening lives inside the weakened
  artifact, which means it is the optimizer's own output. A watcher that reads it is re-coupled to
  the maker — the same failure this milestone exists to close, one level down.

  ADR-004. FF-5705.

  Scenario: a fire clears against an ADR that pre-dates the work
    Given a fired leg whose artifact cites an ADR present in the owning item's register at the base commit
    When the ratchet runs
    Then the leg is reported as discharged
    And the ADR it cleared against is named

  Scenario: a fire does not clear against an ADR written during the work
    Given a fired leg whose artifact cites an ADR absent from the register at the base commit
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: a fire does not clear against another item's register
    Given a fired leg whose cited ADR resolves only in a different item's register
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: a fire with no citation at all does not clear
    Given a fired leg whose artifact cites no ADR
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: the justification comment is never read
    Given a fired leg whose artifact carries a comment explaining the weakening
    When the ratchet runs
    Then the leg is reported as fired
    And the comment is not among the inputs the ratchet read

  Scenario: the register is read as it stood at the base commit
    Given a cited ADR added to the owning item's register after the base commit
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: the disposition is reported, not decided
    Given a fired leg that does not discharge
    When the ratchet runs
    Then it reports the leg as fired
    And it makes no claim about whether the weakening was legitimate

  Scenario: the output carries no precision claim
    Given any ratchet result
    When it is rendered
    Then it states no detection rate

  Scenario Outline: which citations discharge
    Given a fired leg whose cited ADR is <situation>
    When the ratchet runs
    Then the leg is <outcome>

    Examples: pre-existing, in the owning item, at the base commit
      | situation                                          | outcome     |
      | in the owning item's register at the base commit   | discharged  |
      | in the owning item's register only at head         | fired       |
      | in a different item's register at the base commit  | fired       |
      | absent everywhere                                  | fired       |
