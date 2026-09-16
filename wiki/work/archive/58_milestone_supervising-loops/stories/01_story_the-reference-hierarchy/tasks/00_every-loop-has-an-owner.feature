@executable @cli @assets @validate
Feature: Every declared loop has a node that sets its reference

  Seven loops ship in this registry and five of them have nobody above them. The validate run has
  reported exactly that since the check landed — five loops with no inbound target-setting edge, five
  findings, every run, for months. A reference nobody owns is a reference somebody edits.

  What changes is the registry, not the machinery. Each of those five loops gains an inbound
  target-setting edge from a node entitled to set a reference: a slower loop, an actor, or an anchor
  grounded on a rule no cycle revises. The two loops that already had an owner keep the one they had.

  The restraint is that an edge is declared because a relation is real, never because a check is red.
  Nothing sets its own reference, no loop is handed a second owner, a node that only watches or only
  arbitrates sets nobody's reference, and the field naming who is accountable for a loop is left
  where it was — required to agree with the edge, not merged into it.

  ADR-001, ADR-002 §7. FF-5806.

  Scenario: every declared loop has a node that sets its reference
    Given the registry as it ships
    When it is loaded
    Then every declared loop is the endpoint of a target-setting edge from another node

  Scenario: the unowned-reference findings are gone
    Given the registry as it ships
    When the validate run completes
    Then no unowned-reference finding is reported

  Scenario: no loop sets its own reference
    Given the registry as it ships
    When each target-setting edge is read
    Then its source and its endpoint are different nodes

  Scenario: no loop is given two owners
    Given the registry as it ships
    When the nodes setting each loop's reference are counted
    Then exactly one node sets each loop's reference

  Scenario: only an admissible owner sets a reference
    Given the registry as it ships
    When the source of each target-setting edge is examined
    Then it is a loop, an actor, or an anchor grounded on a rule no cycle revises

  Scenario: a node that only watches or only arbitrates sets nobody's reference
    Given the registry as it ships
    When the watcher and arbiter records are read
    Then none of them declares a target-setting edge

  Scenario: the accountable owner and the edge agree
    Given the registry as it ships
    When a loop names the actor accountable for it
    Then that same actor declares the target-setting edge to that loop

  Scenario: naming an owner does not silence the accountability gap
    Given the registry as it ships
    When the validate run completes
    Then the loops that still name no accountable owner are reported as before

  Scenario Outline: the day-one reference hierarchy
    Given the registry as it ships
    When <loop> is examined
    Then its reference is set by <owner>, which is a <kind>

    Examples: seven loops, seven owners, three admissible kinds and no fourth — the hierarchy this milestone exists to author
      | loop                             | owner                       | kind   |
      | loop:build-to-green              | loop:autonomous-cascade     | loop   |
      | loop:review-fix-rereview         | loop:autonomous-cascade     | loop   |
      | loop:run-resilience              | anchor:run-lifecycle-policy | anchor |
      | loop:mesh-assignment-reclaim     | actor:operator              | actor  |
      | loop:retrospective-memory-ingest | actor:operator              | actor  |
      | loop:autonomous-cascade          | actor:operator              | actor  |
      | loop:verify-triage-accept        | actor:product-owner         | actor  |
