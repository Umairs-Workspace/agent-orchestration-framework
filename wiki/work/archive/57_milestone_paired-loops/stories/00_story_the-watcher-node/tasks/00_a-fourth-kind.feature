@executable @cli @work @validate
Feature: A fourth node kind arrives without disturbing the three that exist

  The registry vocabulary has been widened once before. Milestone 55 took it from two kinds to three
  by adding an anchor, and the rule it followed is the rule here: widen additively, delete nothing,
  and prove it by showing that every record already on disk still parses exactly as it did.

  That proof is not ceremony. The eleven records under the registry today are the framework's own
  declaration of how it improves itself, installed into every project that runs aof. A widening that
  quietly re-classified one of them, or introduced a finding against one, would break the thing this
  milestone is trying to make trustworthy while claiming to strengthen it.

  ADR-001. FF-5701.

  Scenario: a watcher record parses as a node of its own kind
    Given a record declaring the watcher kind
    When the registry is loaded
    Then it is parsed as a node
    And its kind is reported as watcher

  Scenario: the three existing kinds are unchanged
    Given the loop, actor and anchor records already shipped
    When the registry is loaded
    Then each is parsed as the kind it declares
    And no finding is raised against any of them

  Scenario: every record already on disk parses with zero new findings
    Given the eleven registry records that shipped before the watcher kind
    When they are loaded by the widened registry loader
    Then all eleven records are parsed
    And their finding codes equal the frozen pre-widening finding set

  Scenario: an unrecognised kind is still refused
    Given a record declaring a kind outside the vocabulary
    When the registry is loaded
    Then a bad-value finding names the kind key
    And no node is parsed as the unrecognised kind

  Scenario Outline: what the kind vocabulary admits
    Given a record declaring the kind <kind>
    When the registry is loaded
    Then the record <outcome>

    Examples: four literals, and nothing else
      | kind     | outcome                  |
      | loop     | parses as a node         |
      | actor    | parses as a node         |
      | anchor   | parses as a node         |
      | watcher  | parses as a node         |
      | observer | is refused as a bad value |
      | monitor  | is refused as a bad value |
