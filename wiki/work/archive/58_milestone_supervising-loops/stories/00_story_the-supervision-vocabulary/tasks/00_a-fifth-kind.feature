@executable @cli @work @validate
Feature: A fifth node kind arrives, and the four before it are read exactly as they were

  The registry vocabulary has been widened twice. Milestone 55 took it from two kinds to three with
  the anchor, milestone 57 from three to four with the watcher, and both followed the same rule:
  widen additively, delete nothing, and prove it by showing that every record already on disk still
  parses exactly as it did. This is the third widening.

  An arbiter is the node that owns a standing trade-off between loops — it records which demand wins
  when two cycles want the same actuator — and it is a kind of its own rather than a key on the
  contenders, because a contender that declares its own precedence is arbitrating itself. What
  arrives here is only the grammar. The checks that read it are a later story's, and the records
  written in it are another's; a scenario below asserts what the loader hands over, never a verdict
  reached about it.

  The compatibility claim is the point of the story, and it is stated over the corpus rather than
  over an example. The fourteen records under the registry today are the framework's own declaration
  of how it improves itself, installed into every project that runs aof. A widening that
  re-classified one of them, or raised a single new finding against one, would break the thing this
  milestone exists to make trustworthy while claiming to strengthen it.

  ADR-003 §1, §2, §6. FF-5801.

  Scenario: an arbiter record parses as a node of its own kind
    Given a record declaring the arbiter kind
    When the registry is loaded
    Then it is parsed as a node
    And its kind is reported as arbiter
    And the id and title it declares are readable off the node

  Scenario: the four kinds that existed before are still read as themselves
    Given the loop, actor, anchor and watcher records already shipped
    When the registry is loaded
    Then each is parsed as the kind it declares
    And none of them is re-classified as the kind this story adds

  Scenario: every record already on disk parses with zero new findings
    Given the fourteen registry records that shipped before the arbiter kind
    When they are loaded by the widened registry loader
    Then all fourteen records are parsed
    And each reports the same finding codes, in the same counts, as it did before the widening
    And the prose-only and owner-unknown warnings they have carried since milestone 52 are neither silenced nor multiplied

  Scenario: a kind nobody has declared is still refused
    Given a record declaring a kind outside the vocabulary
    When the registry is loaded
    Then a bad-value finding names the kind key and quotes the value
    And no node is parsed as the unrecognised kind

  Scenario: an arbiter whose id does not name its kind is refused
    Given an arbiter record whose id declares a different kind
    When the registry is loaded
    Then the existing id-mismatch finding names the id it expected
    And the identity findings for the other four kinds are unchanged

  Scenario: an edge may name an arbiter as its endpoint
    Given an actor declaring a target-setting edge to a declared arbiter
    When the registry is loaded
    Then the arbiter is the endpoint of that edge
    And no bad-value finding names the edge

  Scenario: an edge naming an arbiter no record declares is dangling
    Given an actor declaring a target-setting edge to an arbiter id no record declares
    When the registry is loaded
    Then the existing dangling-endpoint finding names the missing endpoint

  Scenario: the kinds nothing points at are still not endpoints
    Given an actor declaring a target-setting edge whose endpoint names a watcher or an anchor
    When the registry is loaded
    Then a bad-value finding names the edge key
    And the endpoint vocabulary has widened by the arbiter alone

  Scenario Outline: what the kind vocabulary admits
    Given a record declaring the kind <kind>
    When the registry is loaded
    Then the record <outcome>

    Examples: five literals, and nothing else — including the near-miss spellings
      | kind       | outcome                   |
      | loop       | parses as a node          |
      | actor      | parses as a node          |
      | anchor     | parses as a node          |
      | watcher    | parses as a node          |
      | arbiter    | parses as a node          |
      | arbitrator | is refused as a bad value |
      | referee    | is refused as a bad value |
      | supervisor | is refused as a bad value |

  Scenario Outline: which keys each declared kind admits
    Given a record of kind <kind> declaring <key>
    When the registry is loaded
    Then the record <outcome>

    Examples: the three new keys land on one kind only, and every kind keeps what it already had
      | kind    | key         | outcome                        |
      | loop    | actuator    | admits the key                 |
      | loop    | cadence     | admits the key                 |
      | loop    | ceiling     | admits the key                 |
      | actor   | ground      | admits the key                 |
      | anchor  | observes    | admits the key                 |
      | watcher | counter     | admits the key                 |
      | watcher | determinism | admits the key                 |
      | arbiter | resolves    | admits the key                 |
      | arbiter | priority    | admits the key                 |
      | arbiter | dwell       | admits the key                 |
      | arbiter | veto        | admits the key                 |
      | loop    | resolves    | reports a key not admitted for kind |
      | actor   | dwell       | reports a key not admitted for kind |
      | anchor  | priority    | reports a key not admitted for kind |
      | watcher | resolves    | reports a key not admitted for kind |
      | arbiter | observes    | reports a key not admitted for kind |
      | arbiter | determinism | reports a key not admitted for kind |
