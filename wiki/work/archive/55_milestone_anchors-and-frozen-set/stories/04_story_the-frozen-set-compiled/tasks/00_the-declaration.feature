@executable @cli @assets @distribution
Feature: The frozen set is a declaration whose members say what they protect

  aof has exactly one rule that actually blocks, and it was hand-wired. It works — it exits with the
  blocking status and puts its reason on the error stream, and every path through it that cannot
  decide gets out of the way instead of interfering. What it does not have is a declaration behind
  it, and the cost of that is measurable: its only way to express its subject is a text match on a
  path, so it cannot tell running a file from reading one, and it has blocked both a read-only
  search and the writing of a document that merely quotes the path.

  A declared member says what it protects. That is the difference, and it is the whole reason the
  frozen set is a declaration rather than a folder of scripts: a rule with a subject can be narrowed
  correctly, reviewed in a diff, and retracted by deleting a line.

  ADR-004. FF-5505.

  Scenario: a frozen rule is declared, reviewable, and under version control
    Given a workspace with a declared frozen set
    When its members are read
    Then each member is readable from the working tree
    And each names what it protects and which enforcement point carries it

  Scenario: a member naming no enforcement point is refused
    Given a declared member with no enforcement point
    When the declaration is loaded
    Then it is refused by name

  Scenario: a member naming an unknown enforcement point is refused
    Given a declared member naming an enforcement point that does not exist
    When the declaration is loaded
    Then it is refused
    And the message lists the enforcement points that do exist

  Scenario Outline: the enforcement points the declaration may name
    Given a member naming the <point> enforcement point
    When the declaration is loaded
    Then it is <outcome>

    Examples: three that compile, one declared so downstream work has a spelling
      | point                     | outcome                       |
      | tool-call hook entries    | accepted and compiled         |
      | permission denials        | accepted and compiled         |
      | agent tool scope          | accepted and compiled         |
      | the worker launch envelope | accepted and not yet compiled |
      | an unnamed surface        | refused                       |

  Scenario: the test-isolation rule is a compiled member rather than a hand-wired entry
    Given a workspace with the frozen set installed
    When the enforcement point carrying the test-isolation rule is inspected
    Then the rule present there traces to a declared member

  Scenario: removing a member removes exactly its compiled rule
    Given a frozen set with a member removed
    When the declaration is compiled
    Then that member's rule is gone from the enforcement point
    And every other rule there is unchanged
