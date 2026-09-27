@executable @cli @work @validate
Feature: A closed invariant may not be relaxed to an open bound on a file that already existed

  The second way to make a red test green without fixing anything is to loosen what it asserts. An
  assertion that fixed the whole of a set becomes an assertion that something is in it; an equality
  on a count becomes an inequality. The test still runs, still passes, and now permits everything it
  was written to forbid.

  The leg is scoped to files that existed at the base commit, because a brand-new test file's
  assertions were never a stronger promise that got weakened. And it has an exemption that is not
  optional: when a closed-set assertion is ADDED to the same file in the same commit, the change is a
  conversion rather than a relaxation. Spike 56's review found that both of its sharpest instances
  did exactly this, so the leg without the exemption fires on every legitimate count-to-bijection
  conversion — which is to say, on good work.

  The third answer is the honest one. Some assertions cannot be classified by a rule that reads a
  diff. Those are reported as unclassified and counted as neither fired nor clear, because a silent
  pass on something the rule did not understand is how a ratchet stops ratcheting without anyone
  noticing.

  ADR-004. FF-5705.

  Scenario: a deep equality relaxed to a membership check fires the leg
    Given a pre-existing file whose deep equality over a list becomes a membership check
    When the ratchet runs
    Then the closed-set leg fires
    And it names the file

  Scenario: an equality on a count relaxed to an inequality fires the leg
    Given a pre-existing file whose length equality becomes a greater-than comparison
    When the ratchet runs
    Then the closed-set leg fires

  Scenario: a compensating assertion added in the same commit clears the leg
    Given a pre-existing file whose closed-set assertion is relaxed
    And a new closed-set assertion added to that same file in the same commit
    When the ratchet runs
    Then the closed-set leg does not fire

  Scenario: a compensating assertion in a different file does not clear the leg
    Given a pre-existing file whose closed-set assertion is relaxed
    And a new closed-set assertion added to a different file
    When the ratchet runs
    Then the closed-set leg fires

  Scenario: a file created after the base commit is out of scope
    Given a file that did not exist at the base commit
    When the ratchet runs
    Then no closed-set finding names it

  Scenario: an assertion the rule cannot classify is reported as unclassified
    Given a pre-existing file whose changed assertion matches no closed-set or open-bound shape
    When the ratchet runs
    Then it is reported as unclassified
    And it is counted as neither fired nor clear

  Scenario: tightening an open bound is not a fire
    Given a pre-existing file whose inequality becomes a deep equality
    When the ratchet runs
    Then the closed-set leg does not fire

  Scenario: an unchanged assertion is not examined
    Given a pre-existing file whose assertions are unchanged
    When the ratchet runs
    Then no closed-set finding names it

  Scenario Outline: what is closed and what is open
    Given an assertion of the form <assertion>
    When it is classified
    Then it is <classification>

    Examples: a closed set fixes the whole of a set
      | assertion                              | classification |
      | a deep equality over a list literal    | closed         |
      | an equality against a literal length   | closed         |
      | an equality against a literal size     | closed         |
      | an exhaustive membership over a frozen literal | closed |
      | a greater-than comparison on a length  | open           |
      | a truthiness check on a length         | open           |
      | an existential over a collection       | open           |
      | a membership check for one element     | open           |

  Scenario Outline: how a change between two classifications is reported
    Given a pre-existing file whose assertion changes from <before> to <after>
    When the ratchet runs
    Then the closed-set leg <outcome>

    Examples: only closed-to-open is a relaxation
      | before       | after        | outcome        |
      | closed       | open         | fires          |
      | open         | closed       | does not fire  |
      | closed       | closed       | does not fire  |
      | open         | open         | does not fire  |
      | closed       | unclassified | reports unclassified |
