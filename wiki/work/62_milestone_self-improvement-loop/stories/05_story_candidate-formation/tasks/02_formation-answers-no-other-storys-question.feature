@executable @cli @work @validate
Feature: A candidate carries its sources, its citations and its target, and answers nothing else

  A module that clusters evidence sits upstream of every other decision this milestone makes, which
  puts it in the one position from which every other decision looks easy to guess. The lane is nearly
  obvious from the target. The patch is nearly obvious from the key. The verdict feels safe to
  anticipate for a knob that is refused today anyway. Each of those guesses would be cheap to write
  here and each would create a second home for an answer that already has one — the failure this
  milestone refuses in every other direction, arriving through the door nobody was watching.

  So the boundary is stated as a boundary rather than as a list of empty fields. A candidate does not
  carry a lane set to nothing; it carries no lane at all, because a field named for a lane is a claim
  that formation is a place where lanes are known, and the next reader will fill it in. The five
  answers that live elsewhere are the lane, the patch, the applier, the verdict and the distance, and
  each is named here beside the home that gives it.

  The criterion that makes this behavioural rather than decorative is blindness, checked by moving the
  input each of those answers would depend on and watching nothing happen. Whether the registry
  declares the target key on its tuning edge is what decides a lane, so formation's output must be
  identical either way. Whether the acceptor would refuse the target is what decides a verdict, so
  formation's output must be identical either way. A module that has genuinely not guessed cannot be
  affected by the evidence for the guess.

  What formation does carry is the material the downstream leaves need and nothing more: the sources
  behind the cluster, the citations constructed from those sources' own locators, and the target the
  cluster is about. It constructs citations and checks none of them, because a citation that does not
  resolve demotes its proposal, and demotion is a ruling made where resolution is attempted.

  ADR-013 §1, §1a. ADR-002 §3. ADR-003. ADR-004. ADR-006. FF-6209.

  Scenario Outline: the five answers formation does not give, and the input it stays blind to
    Given a corpus of lane records
    When candidates are formed
    Then no candidate carries <absent>, neither with a value nor with an empty one
    And nothing on a candidate anticipates <answer that lives elsewhere>
    And the candidates are identical whether or not <condition>

    Examples: each absent answer, the home that gives it, and the input formation stays blind to
      | absent     | answer that lives elsewhere                            | condition                                       |
      | a lane     | the lane computed from the registry's tuning edge      | the tuning edge declares the target key         |
      | a patch    | the patch read against the value in force at its layer | the configuration carries the target key at all |
      | an applier | the applier resolved through the injected resolver     | the registry can answer for any applier         |
      | a verdict  | the ruling the acceptor returns when it is invoked     | the acceptor would refuse or admit the target   |
      | a distance | the distance rendered from the acceptor's own report   | the prerequisite limbs are open or closed       |

  Scenario: the boundary is absence, not a null
    Given a candidate
    When its fields are read
    Then no field named for a lane, a patch, an applier, a verdict or a distance is present
    And none of the five is present under a different name carrying the same answer

  Scenario: a candidate carries the three things it is for
    Given a candidate formed from several records
    When it is read
    Then it carries the sources behind it
    And it carries a citation constructed from each source's own locator
    And it names the target the cluster is about

  Scenario: citations are constructed here and judged elsewhere
    Given a corpus whose records name documents that no longer exist
    When candidates are formed
    Then each candidate still carries its citations
    And none is demoted, dropped or marked unresolvable by formation
    And no candidate carries a judgement about whether its citations resolve

  Scenario: the target is named, not shaped
    Given a candidate about a configuration key
    When its target is read
    Then it names what the cluster is about
    And it states no value to write, no layer to write it at and no value it is being changed from

  Scenario: no acceptance vocabulary appears on a candidate
    Given a corpus of lane records over targets the acceptor refuses today
    When the candidates are read
    Then none of them names a refusal, a removal or any word the acceptor rules with
    And none reports whether the target could be committed

  Scenario: the same records over two registries produce the same candidates
    Given one corpus of lane records
    When candidates are formed against a registry declaring one tunable key
    And candidates are formed again against a registry declaring none
    Then the two sets are identical
    And nothing in either set records which registry it was formed against
