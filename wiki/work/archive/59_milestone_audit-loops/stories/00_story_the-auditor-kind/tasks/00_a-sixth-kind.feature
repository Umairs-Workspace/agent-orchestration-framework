@executable @cli @work @validate
Feature: A sixth node kind arrives, and the five before it are read exactly as they were

  The registry vocabulary has been widened three times. Milestone 55 took it from two kinds to three
  with the anchor, 57 from three to four with the watcher, 58 from four to five with the arbiter, and
  each followed the same rule: widen additively, delete nothing, and prove it by showing that every
  record already on disk still parses exactly as it did. This is the fourth widening.

  An auditor is the node whose subject is the measuring apparatus itself — the gates, the recorded
  evidence, the anchors, the counters. It is a kind of its own rather than a flag on a loop, because a
  loop that audited itself would be the apparatus reporting on the apparatus, which is the failure the
  milestone exists to close.

  What arrives here is only the grammar. The checks that read it are a later story's, the lanes that
  produce its findings are two more, and the record written in it is a fourth; a scenario below
  asserts what the loader hands over, never a verdict reached about it.

  ADR-001 §1, §4. FF-5901.

  Scenario: an auditor record parses as a node of its own kind
    Given a record declaring the auditor kind with every key its kind requires
    When the registry is loaded
    Then it is parsed as a node
    And its kind is reported as auditor
    And the id and title it declares are readable off the node

  Scenario: the five kinds that existed before are still read as themselves
    Given the loop, actor, anchor, watcher and arbiter records already shipped
    When the registry is loaded
    Then each is parsed as the kind it declares
    And none of them is re-classified as the kind this story adds

  Scenario: every record already on disk parses with zero new findings
    Given the sixteen registry records that shipped before the auditor kind
    When they are loaded by the widened registry loader
    Then all sixteen records are parsed
    And each reports the same finding codes, in the same counts, as it did before the widening
    And the prose-only and owner-unknown warnings they have carried since milestone 52 are neither silenced nor multiplied

  Scenario: a kind nobody has declared is still refused
    Given a record declaring a kind outside the vocabulary
    When the registry is loaded
    Then a bad-value finding names the kind key and quotes the value
    And no node is parsed as the unrecognised kind

  Scenario: an auditor whose id does not name its kind is refused
    Given an auditor record whose id declares a different kind
    When the registry is loaded
    Then the existing id-mismatch finding names the id it expected
    And the identity findings for the other five kinds are unchanged

  Scenario: the vocabulary is closed at six and says so
    Given the loaded kind vocabulary
    When it is read back
    Then it holds exactly the six declared kinds
    And every kind the five earlier milestones declared is still a member
