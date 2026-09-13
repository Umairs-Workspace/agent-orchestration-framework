@executable @cli @work @validate
Feature: A change that cannot be computed as a complete before→after carries no patch and no applier

  The failure this prevents is the half-diff. A proposal that renders a plausible-looking change it
  cannot actually produce hands a reader something to finish approximately, and the approximation then
  gets committed carrying the authority of a computed change. The cheapest way to make that impossible
  is to leave the object no partial state to be in: a patch is complete, or it is absent, and there is
  no third answer for an implementation to drift into.

  Complete means three things present together — a declared target, the value in force as `from`, and
  the proposed value as `to`. Two of the four classes reach it. A cap adjustment is this key, this
  current value, this proposed value. A model reallocation is this role, this current model, this
  proposed model. A prompt or brief revision is not: this milestone cannot author the replacement
  prose, and model-written text presented as a computed diff is worse than no proposal at all. A
  story-sizing hint has no target file whatsoever.

  A wrong implementation turns this green by rendering the uncomputable classes anyway — a `to` filled
  from a template with the `from` left blank, or a summary sentence standing where a value belongs.
  Both read as diffs at a glance and neither is one. So the criterion runs over the whole emitted set
  and in both directions: no patch missing one of its three parts, and no applier hanging off a
  proposal that has no patch to apply.

  What must not follow from any of this is a smaller output. A proposal with no patch is still
  emitted, still carries the evidence that motivated it, and says which ground made it uncomputable.
  It is a finding addressed to a human. Shrinking the report to what happened to be diffable would
  discard most of what the corpus actually supports, and would look like a clean run.

  ADR-004 §1, §2. FF-6203.

  Scenario Outline: the four proposal classes and what each of them can compute
    Given a candidate of class <class> over <target>
    When the proposal is emitted
    Then it carries <patch>
    And it carries <applier>

    Examples:
      | class                    | target                            | patch                   | applier |
      | cap adjustment           | a configuration key holding a cap | a complete before→after | one     |
      | model reallocation       | a role holding a model name       | a complete before→after | one     |
      | prompt or brief revision | a prompt document                 | no patch                | none    |
      | prompt or brief revision | a brief document                  | no patch                | none    |
      | story sizing             | no target file at all             | no patch                | none    |

  Scenario Outline: a patch is carried only where all three of its parts are present
    Given a candidate that can state <parts>
    When the proposal is emitted
    Then <outcome>

    Examples:
      | parts                                                  | outcome                                      |
      | a target, the value in force, and a proposed value     | it carries a patch, with all three           |
      | a target and a proposed value, but no value in force   | it carries no patch, naming the part missing |
      | a target and the value in force, but no proposed value | it carries no patch, naming the part missing |
      | a value in force and a proposed value, but no target   | it carries no patch, naming the part missing |
      | a target alone                                         | it carries no patch, naming the part missing |
      | none of the three                                      | it carries no patch, naming the part missing |

  Scenario: there is no third, partial state among the emitted proposals
    Given the proposals emitted over a corpus spanning all four classes
    When every proposal's patch is read
    Then each one either carries no patch at all, or carries a target, a `from` and a `to`
    And no proposal carries a patch with any of the three missing
    And no `from` or `to` is a sentence describing a value in place of the value

  Scenario: no proposal carries an applier with no patch
    Given the proposals emitted over a corpus spanning all four classes
    When every proposal is read
    Then no proposal without a patch carries an applier
    And every proposal carrying an applier carries a complete patch

  Scenario: a proposal with no patch is emitted rather than dropped
    Given a candidate whose change cannot be computed
    When the proposal set is produced
    Then the proposal appears in it
    And it carries the evidence that motivated it
    And it is presented as a finding for a human rather than as a change to apply

  Scenario: the two uncomputable grounds are told apart
    Given a prompt revision and a story-sizing hint, neither carrying a patch
    When each reason is read
    Then the first names the replacement prose as the thing that cannot be computed
    And the second names the absence of any target to change
    And neither is reported with the other's reason

  Scenario: the reason is a code, not a sentence composed for each proposal
    Given two prompt revisions over two different documents, neither carrying a patch
    When their reasons are read
    Then both carry the same reason code
    And the code names what makes the class uncomputable rather than describing either document

  Scenario: a computable patch does not depend on which lane the proposal is in
    Given a model reallocation, which no tuning edge declares
    When the proposal is emitted
    Then it is advisory
    And it still carries a complete before→after
    And its lane decided nothing about whether a patch was computable
