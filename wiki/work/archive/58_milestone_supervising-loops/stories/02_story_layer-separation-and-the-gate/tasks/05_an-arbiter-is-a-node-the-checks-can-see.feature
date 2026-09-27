@executable @cli @work @validate
Feature: An arbiter is a node the checks can see

  The checks decide for themselves which nodes their traversals consider, from a list of kinds
  written out by hand inside the module. That list is not the registry's vocabulary — one says which
  kinds a record may declare, the other says which nodes a traversal will walk — and they agree today
  by discipline rather than by construction, because the checks module imports nothing and cannot ask
  the loader what the vocabulary is.

  So a fifth kind is not admitted by being admitted. A node the traversals do not consider is
  invisible to four lanes at once: the grounding decomposition never reaches its component, the
  anchor lane never judges that component, the ownership lane cannot see it as the source of a
  supervising edge — which is exactly the source the admissible-owner rule most needs to catch — and
  the arbitration lane finds no arbiter to clear on. Membership is a precondition of four checks, so
  it is contracted here rather than inside any one of them.

  Between the story that ships the arbiter record and this one, that record sits on disk while the
  traversals still filter it out — the three shared-actuator warnings still stand, and the registry
  is short of the end state this milestone is judged against. Landing this is the flip. And the claim
  is made over the whole kind vocabulary rather than over the one kind being added, so a sixth kind
  fails loudly instead of being silently invisible four times over.

  ADR-003 §6. FF-5805.

  Scenario: an arbiter is one of the nodes the traversal considers
    Given a registry containing an arbiter that vetoes the loops it names
    When the checks are run
    Then the component decomposition names the arbiter
    And the verdict reached about its component is reported

  Scenario: the authority that points at an arbiter reaches it
    Given an actor with human ground setting the arbiter's priority
    When the checks are run
    Then the arbiter's component is reported as grounded by a human alone

  Scenario: an arbiter that sets a target is a source the ownership lane can see
    Given an arbiter declaring a target-setting edge to a loop
    When the checks are run
    Then the not-admitted finding names the arbiter

  Scenario: an arbiter that vetoes every contender is a node the arbitration lane can clear on
    Given an actuator driven by two loops and an arbiter vetoing both
    When the checks are run
    Then no unarbitrated finding names that actuator

  Scenario: being seen is not being counted as a loop
    Given a registry containing an arbiter
    When the checks are run
    Then no unowned-reference finding names the arbiter
    And no unpaired-optimizer finding names it
    And no timescale finding names it

  Scenario: a registry with no arbiter in it gains nothing from the widened membership
    Given a registry declaring only the four kinds that came before
    When the checks are run
    Then the component decomposition names the same nodes it named before this milestone
    And every component carries the members it carried before
    And no finding is raised that the membership alone accounts for

  Scenario Outline: which lanes a node's membership is a precondition of
    Given an arbiter <situation>
    When the checks are run
    Then the <lane> lane reports <outcome>

    Examples: membership gates four lanes at once, so an unseen node is invisible four times over
      | lane                 | situation                                            | outcome                                     |
      | grounding            | reached only by the human who sets its priority      | its component, grounded by a human alone    |
      | anchor-grounding     | reached by an anchor whose authority no longer resolves | its component as stale, naming the arbiter |
      | reference-ownership  | declaring a target-setting edge to a loop            | that source as one not admitted             |
      | actuator-arbitration | vetoing every contender for a shared actuator        | nothing, the actuator now being arbitrated  |

    Examples: the other two lanes narrow to kinds an arbiter is not, so membership changes nothing there
      | lane      | situation                                            | outcome                                     |
      | pairing   | optimizing nothing and watched by nobody             | nothing about the arbiter                   |
      | timescale | declaring neither a cadence nor a layer              | nothing about the arbiter                   |

  Scenario Outline: every declared kind is a node the traversal considers
    Given a record of kind <kind>
    When the checks are run
    Then it is <outcome>

    Examples: the membership is claimed over the whole vocabulary, so a sixth kind fails rather than vanishing
      | kind    | outcome                                        |
      | loop    | named in the component decomposition           |
      | actor   | named in the component decomposition           |
      | anchor  | named in the component decomposition           |
      | watcher | named in the component decomposition           |
      | arbiter | named in the component decomposition           |
