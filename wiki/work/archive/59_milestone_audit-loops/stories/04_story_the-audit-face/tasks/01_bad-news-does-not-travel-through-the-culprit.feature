@executable @cli @work @validate
Feature: A finding is addressed to the reference-owner, and never to the loop it is about

  A report that tells the build loop its own gate is dead is a report the build loop can decide is not
  urgent. That is not a hypothetical: it is the whole reason this milestone exists as something
  separate from the loops it audits.

  So every finding carries two things the health command's findings do not: what it is about, and who
  hears it. The second is computed from the first — the instrument resolves to the loop that owns it,
  and that loop's reference-owner is the addressee — and the rule that makes it worth having is that
  the audited loop is never its own addressee.

  Where nothing owns the instrument, the finding is not dropped. An unowned instrument is a reason to
  escalate, not a reason for silence.

  ADR-006 §1, §2. FF-5909.

  Scenario: a finding names the instrument it is about
    Given an audit finding about a gate
    When the finding is read
    Then it names the instrument it concerns

  Scenario: a finding is addressed to the reference-owner of the loop that owns the instrument
    Given an instrument owned by a loop
    And that loop's reference is set by another node
    When an audit finding is raised about the instrument
    Then the finding is addressed to that other node

  Scenario: no finding is addressed to the loop it is about
    Given the loop records this framework ships
    When the audit is run over them
    Then no finding is addressed to the loop that owns the instrument it concerns

  Scenario: an instrument nobody owns escalates rather than disappearing
    Given an instrument that no loop declares
    When an audit finding is raised about it
    Then the finding is addressed to the declared escalation actor
    And it is not dropped

  Scenario: a loop whose reference nobody sets escalates rather than disappearing
    Given an instrument owned by a loop whose reference no node sets
    When an audit finding is raised about it
    Then the finding is addressed to the declared escalation actor

  Scenario Outline: addressing does not vary with severity
    Given an instrument owned by a loop whose reference is set by another node
    When an audit finding of <severity> severity is raised about it
    Then the finding is addressed to that other node

    Examples:
      | severity |
      | warning  |
      | error    |

  Scenario: the addressee is computed, never written on the finding by hand
    Given the audit's findings
    When each addressee is traced
    Then every one of them was resolved from the instrument it concerns
    And none of them was stated as a fixed value

  Scenario: the finding envelope holds exactly its declared keys
    Given an audit finding
    When its keys are read
    Then they are exactly the keys the envelope declares
    And they include both what the finding is about and who it is addressed to
