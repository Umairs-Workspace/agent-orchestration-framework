@executable @cli @assets @distribution
Feature: An operator's permission entries survive a compile, in their own positions

  The settings document has several authors and one of them is a person. The hook half of it is
  already written correctly: aof's entries carry an ownership marker, an unmarked entry is treated
  as the operator's and is never adopted or retracted, retraction reaches every place aof left
  something rather than only the places it is writing now, and a file that cannot be parsed refuses
  the write rather than replacing the document with a fresh one.

  The permissions half has none of that. It is merged by replacing the whole top-level key, which
  means the first frozen rule compiled into it takes the operator's entire permissions block with
  it. On this repository that is four hand-authored entries; on an installed one it is whatever they
  had. This lands before anything compiles to permissions, because the alternative is discovering it
  in someone else's checkout.

  ADR-004. FF-5505.

  Scenario: an operator's permission entries survive a compile
    Given a settings document with hand-authored permission entries
    When the frozen set is compiled into it
    Then every hand-authored entry is still present with its original value

  Scenario: an operator's entries keep their positions
    Given a settings document whose permission entries are in a deliberate order
    When the frozen set is compiled into it
    Then the operator's entries appear in their original order

  Scenario: aof's own permission entries are identifiable
    Given a compiled settings document
    When its permission entries are read
    Then aof's own entries are distinguishable from the operator's

  Scenario: retracting a member removes only aof's entry
    Given a compiled settings document with both aof and operator permission entries
    When the member is removed from the declaration and recompiled
    Then aof's entry is gone
    And the operator's entries are untouched

  Scenario: a compile that changes nothing writes nothing
    Given a settings document already matching the declaration
    When the frozen set is compiled
    Then the file is not rewritten

  Scenario: an unparseable settings document refuses the compile
    Given a settings document that cannot be parsed
    When the frozen set is compiled
    Then the write is refused with a code
    And the document is left exactly as it was

  Scenario: other top-level settings are carried through untouched
    Given a settings document carrying unrelated top-level configuration
    When the frozen set is compiled into it
    Then every unrelated key is unchanged
