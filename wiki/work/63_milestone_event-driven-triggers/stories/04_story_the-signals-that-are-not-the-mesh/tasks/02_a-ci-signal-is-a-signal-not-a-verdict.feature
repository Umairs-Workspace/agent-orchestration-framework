@executable @cli @work @validate
Feature: A CI signal names a ref and that is all of it — the build's outcome is read by nobody here

  A build's signal arrives carrying a great deal: an outcome, a pipeline, a job, a duration, a commit,
  an author, and often a failure class somebody's dashboard already computed. Exactly one of those
  answers the question this source was asked. The rest is the input of a policy, and a policy about
  which builds deserve a loop is a verdict — the same species the finding source is forbidden to
  reach by reading prose, arriving here through a status field instead.

  The wrong implementation is the obvious one and it will look like restraint: wake only on failure.
  It is one comparison, it is what everybody assumes a CI trigger does, and it is a rule about which
  outcomes matter living inside a layer whose whole job was to turn a signal into a scope. Its second
  form is narrower and harder to see — an allow-list of pipelines, a failure-class filter, a
  suppression for cancelled runs — and each of them is measured the same way: hand the source the
  same ref under a different outcome and require the same answer back.

  So the first table below is the criterion, and it is deliberately exhaustive over outcomes rather
  than representative. A green build resolves. A red build resolves the same. A cancelled, a
  timed-out, a skipped one, and one whose status is a spelling nobody has seen, all resolve the same,
  and so does a signal that carries no outcome at all. Nothing here is asserting that waking on a
  green build is useful; it is asserting that deciding it was not is somebody else's decision, made
  where it can be reviewed.

  The answer does not echo the outcome either. An echoed status is a status that was read, and once
  it is in the answer it is one branch away from being read by the next caller who receives it.

  ADR-007 §3. ADR-001 §2. FF-6307.

  Scenario Outline: the same ref under any outcome is the same answer
    Given two CI signals naming the same ref, one reporting <outcome> and one reporting a success
    When each is resolved
    Then the two answers are identical
    And each answers with the scope the ref names
    And neither answer reports the outcome it was handed

    Examples: the source holds no policy about which outcomes deserve a loop
      | outcome                              |
      | a failure                            |
      | a cancellation                       |
      | a timeout                            |
      | a skipped run                        |
      | an errored run                       |
      | a neutral or inconclusive run        |
      | a status of a spelling nobody knows  |
      | a status field that is empty         |
      | no status field at all               |

  Scenario Outline: the rest of what a signal carries reaches nothing
    Given a CI signal naming a ref and also carrying <field>
    And a second signal naming the same ref and carrying none of it
    When both are resolved
    Then the two answers are identical
    And <field> is named nowhere in either answer

    Examples: a signal is a courier, not a case file
      | field                                    |
      | a pipeline name                          |
      | a workflow and job name                  |
      | a failure class                          |
      | the names of the tests that failed       |
      | a count of failures                      |
      | a duration                               |
      | a commit sha                             |
      | a pull-request number                    |
      | an author                                |
      | a branch name                            |
      | a repository name                        |
      | a retry or attempt number                |
      | a label reading urgent                   |

  Scenario: a green build is answered, never withheld
    Given a CI signal reporting a successful build for a ref that resolves
    When it is resolved
    Then it answers with the scope the ref names
    And the answer is not withheld, deferred or emptied because the build passed

  Scenario: the ref decides, and only the ref
    Given one signal reporting a failure for one ref and one reporting a success for a ref under another driver
    And the same pair again with their two outcomes swapped between them
    When all four are resolved
    Then each answers with the scope its own ref names
    And swapping the outcomes changed no answer

  Scenario: no pipeline is privileged and none is excluded
    Given two signals naming the same ref from two pipelines that share no name, owner or history
    When both are resolved
    Then the two answers are identical
    And neither pipeline is checked against a list before it is answered

  Scenario: a signal that names no ref is refused, never guessed at
    Given a CI signal carrying an outcome, a pipeline and a commit, and no ref
    When it is resolved
    Then no scope is resolved for it
    And the answer is a refusal naming the CI source and the ref it could not find
    And no scope is inferred from the branch, the commit, the pipeline or a previous signal
