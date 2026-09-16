@executable @cli @work @validate
Feature: Grounding is seeded by what a node is grounded BY, not by what kind of node it is

  The algorithm already works. Components are decomposed, ground floods forward along the five edge
  types, and every component gets a verdict. What it cannot currently express is any ground but the
  human's, because the seed is a single hard predicate: an actor node whose ground reads exogenous.

  Widening that predicate is the whole change, and the constraint is that nothing else moves. The
  flood is correct. The component decomposition is correct. A milestone that "improves" either while
  passing through would be shipping a regression dressed as progress, and the report would lose the
  property that makes it worth reading — that a cycle is not automatically a pathology, because an
  outer loop setting an inner loop's reference while the inner feeds data back is a correct cascade
  and a textbook strongly connected component.

  ADR-002. FF-5502.

  Scenario: an anchor grounds the loop it feeds
    Given an anchor declaring an edge into a loop
    When the report is produced
    Then the loop's component is grounded
    And the verdict names the anchor's ground class

  Scenario: no verdict is ever reported without its ground class
    Given a registry whose components are grounded by different classes
    When the report is produced
    Then every grounded verdict names the class that supported it

  Scenario: a component grounded only by the human still reports as the weakest ground
    Given a component reachable only from an actor declaring exogenous ground
    When the report is produced
    Then it is reported as grounded by exogenous ground only
    And it is not reported as fully anchored

  Scenario: a correct cascade is not flagged merely for being a cycle
    Given two loops where each is an endpoint of the other's edges, reachable from an anchor
    When the report is produced
    Then their component is grounded
    And no finding is raised about the cycle itself

  Scenario: the component decomposition is unchanged by the widening
    Given a registry with several disjoint and several mutually reachable nodes
    When the components are decomposed before and after the seed widens
    Then the same members fall into the same components in both cases

  Scenario Outline: what seeds ground, and what does not
    Given a node of kind <kind> whose ground reads <ground>
    When the report is produced
    Then it <seeds> the flood

    Examples: the seed is the ground key, on any node permitted to carry one
      | kind   | ground        | seeds         |
      | anchor | process-exit  | seeds         |
      | anchor | build-stamp   | seeds         |
      | anchor | frozen-rule   | seeds         |
      | actor  | exogenous     | seeds         |
      | actor  | no ground key | does not seed |
      | loop   | no ground key | does not seed |
