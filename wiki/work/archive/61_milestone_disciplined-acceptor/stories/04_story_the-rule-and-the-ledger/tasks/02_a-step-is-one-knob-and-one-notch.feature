@executable @cli @work @validate
Feature: A step is one notch on one knob, and everything else is a refusal with a name

  A proposal that moves two knobs is two experiments sharing one ledger. Whichever knob moved the
  metric, both are credited — which is precisely the multiple-testing failure the whole rule exists to
  refuse, smuggled in as convenience. Splitting such a proposal silently is worse than refusing it:
  the operator asked for one trial and would get two they never priced.

  A knob with no ordering has no next notch at all. A map from roles to models is a set of choices,
  not a ladder, so a step on it is not expensive or unaffordable — it is meaningless. It stays a human
  change, permanently, and the refusal says that by name rather than inventing a range for it.

  The distinction worth arguing is that every one of these refusals is a distinct thing to do about
  it: split the proposal, re-propose one notch, or accept that this knob is never machine-tunable.
  Collapsing them into one rejection hides which.

  ADR-001 §4, §5. FF-6101.

  Scenario Outline: what a proposal may name
    Given a proposal that <shape>
    When it is read as a step
    Then it is <outcome>

    Examples:
      | shape                                                  | outcome                                     |
      | moves one ordered knob up by one notch                 | accepted as a step                          |
      | moves one ordered knob down by one notch               | accepted as a step                          |
      | moves one ordered knob by two notches                  | refused as more than one notch              |
      | moves two ordered knobs by one notch each              | refused as more than one knob               |
      | moves a knob whose values have no ordering             | refused as not an ordinal knob              |
      | names a knob but leaves its value where it was         | refused as no step at all                   |

  Scenario: a two-knob proposal is refused rather than split
    Given a proposal naming two knobs
    When it is read as a step
    Then no step is produced for either knob
    And the refusal names both knobs
    And neither knob accrues a pair from it

  Scenario: an unordered knob is refused by a different name than a compound proposal
    Given a proposal on a knob whose values have no ordering
    And a proposal naming two ordered knobs
    When each is read as a step
    Then each is refused
    And the two refusals carry different names

  Scenario: an unordered knob is reported as a human change rather than as evidence pending
    Given a knob whose values have no ordering
    When the acceptor reports
    Then the knob is reported as one that cannot be stepped
    And it is not listed as awaiting evidence
    And no proposal is offered for it

  Scenario: the price of a whole ladder is stated in pairs, not asserted
    Given a knob whose values span three notches
    When the cost of moving it from its lowest value to its highest is asked for
    Then it is reported as two steps
    And as twice the pairs one step needs to reach its earliest crossing
    And as up to twice the pairs one step is funded for

  Scenario: a refused proposal accrues nothing
    Given a proposal that was refused as a step
    When the ledger is read
    Then it holds no pair attributable to that proposal
    And the refusal is reported rather than the proposal disappearing
