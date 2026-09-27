@executable @cli @work @validate
Feature: Every reason a proposal did not commit is said out loud, not only the first one found

  There are eight reasons a proposal can fail to commit, and a knob is routinely blocked by more than
  one of them at once. At HEAD every tunable knob is both inadmissible — nothing executed reads the
  value it declares — and unmeasurable, because no observation series exists to measure either arm.
  Those are two independent pieces of engineering. A report that stops at the first one hides half the
  work needed to make this machinery live, and an operator who closes the reported gap discovers the
  unreported one only on the next run.

  So all eight are a fixed vocabulary, every applicable member is reported, and they arrive in one
  frozen order regardless of the order they were discovered in — a report whose ordering varies is a
  report you cannot diff against last week's.

  Eight is the settled count, and what settles it is a rule about which refusals belong in this list
  at all. This list holds the reasons a *ruling* did not commit. A refusal raised while a ruling was
  being built — a criterion that could not be constructed, a pointer resolving to nothing, a knob
  priced with no unit declared beside it, a proposal that was never a single step — means no ruling
  was produced, so it can never be a reason one failed to commit. Those refusals are reported in
  their own right, and they never enter this list. A list mixing the two would be answering two
  questions at once, and an operator reading it could not tell which one a line answered.

  One reason arrives from a question asked before this one. Whether a knob may be proposed at all is
  settled first, on grounds of its own — a key nobody declared tunable, a harness stating its policy
  in prose and naming no configuration key — and exactly one word crosses from that answer into this
  list: that the knob is not admissible. The grounds are shown beneath it as detail, because the
  operator closing that gap needs them, but they are not themselves reasons a ruling did not commit.

  One member is easy to mistake for a shade of another. A proposal whose budget can no longer reach
  any crossing record is dead by arithmetic, not merely short of evidence, and it is reported under
  its own name; the discrimination itself is contracted alongside the other structural silence, in
  this story's task on telling silences apart.

  Two members are unlike all the others in that no work on this machinery can lift them. A knob whose
  key resolves to more than one bound has no single-notch step at all — every step on it moves two
  unrelated quantities — so no budget increase and no new instrument can ever clear it; it clears
  only if the key stops being two bounds, which is not this milestone's to do (ADR-009 §4a). And a
  knob whose declared values have no order has no notch to take: it is a change a person makes,
  permanently, and it is said by name rather than left sitting in a queue for a proposal that will
  never come. Both refusals are about committing, not about proposing: such a knob stays in the set
  admitted for tuning and stays on the report, exactly as an unaffordable knob does with its price.

  Each reported reason also names what would remove it. That is the difference between a refusal and a
  complaint: "no executed consumer" is a diagnosis, "a consumer that reads the resolved value at a
  decision site" is a task someone can pick up. Where the removal is another milestone's work, or is a
  redesign of the knob rather than a step on it, the report says so rather than naming a step this one
  could take.

  ADR-013 §1, §1b, §2, §3, §3a. ADR-010 §2. ADR-009 §4, §4a. ADR-001 §3a, §5. FF-6112.

  Scenario Outline: each reason is reported for its own situation, and names its own removal
    Given a knob that <situation>
    When the acceptor reports on it
    Then the report names it as <reason>
    And it names <removal> as what would remove that reason

    Examples: the frozen eight — each with the situation it describes and the work that clears it
      | situation                                                | reason                 | removal                                                  |
      | declares a value nothing executed ever reads             | not-admissible         | a consumer reading the resolved value at a decision site |
      | has no observation series able to measure either arm     | metric-unmeasurable    | an instrument writing the series its metric reads        |
      | needs a trial basket priced above the criterion's budget | trial-unaffordable     | the basket it needs and the budget ceiling it exceeded   |
      | yields under one discordant pair per epoch               | yield-bound            | the epochs its observed yield needs to reach the floor   |
      | is clear on every other count but short of the threshold | evidence-short         | the number of rulings still to accrue                    |
      | can reach no crossing record inside its remaining budget | budget-exhausted       | a fresh proposal, since a budget cannot grow in flight   |
      | has a key resolving to two bounds, so no step is single  | step-would-be-compound | the key ceasing to be two bounds, which is another milestone's work |
      | declares values with no order, so no notch on it means anything | not-an-ordinal-knob | the knob's values gaining an order, which is a redesign of the knob rather than a step on it |

  Scenario Outline: every applicable reason is reported, in the frozen order
    Given a knob that has <situation>
    When the acceptor reports on it
    Then the report names every one of <reasons>
    And it names them in that order
    And the first of them is not the only one it names

    Examples: refusals accumulate — collapsing them to the first hides independent work
      | situation                                                            | reasons                                                 |
      | no executed consumer and no observation series                       | not-admissible, metric-unmeasurable                     |
      | no observation series and a basket priced above the budget           | metric-unmeasurable, trial-unaffordable                 |
      | no executed consumer, no series, and a basket above the budget       | not-admissible, metric-unmeasurable, trial-unaffordable |
      | no consumer, no series, a basket above the budget, and a key that is two bounds | not-admissible, metric-unmeasurable, trial-unaffordable, step-would-be-compound |

  Scenario: the knob that earns four reasons at once earns all four on one run
    Given the knob whose key resolves to two bounds, at HEAD
    When the acceptor reports on it
    Then it names that nothing executed reads it
    And it names that it cannot be measured
    And it names that its trial is priced above the budget
    And it names that no step on it is single
    And each of those four carries its own removal

  Scenario: the order does not follow the order the reasons were discovered in
    Given two knobs refused for the same reasons, found in different orders
    When both are reported
    Then the reasons appear in the same order on both

  Scenario: the vocabulary is exactly eight reasons
    Given the reasons a proposal can be reported as not having committed for
    When they are enumerated
    Then there are exactly eight of them
    And a refusal that matches none of them is refused rather than reported as free text

  Scenario: a reason from this vocabulary is reported, never raised as a failure to run
    Given a knob carrying every reason in the vocabulary that can apply to it at once
    When the acceptor reports on it
    Then the run succeeds
    And every one of those reasons appears in the report rather than as a failure to run

  Scenario: at HEAD no knob is refused for a single reason
    Given the knobs this project's registry admits for tuning
    When the acceptor reports on each of them
    Then each names both that nothing executed reads it and that it cannot be measured
    And each of those two carries its own removal

  Scenario: a reason that stops applying stops being reported, and the others are unchanged
    Given a knob reported as both inadmissible and unmeasurable
    When something executed begins reading the value it declares
    And the acceptor reports on it again
    Then the report no longer names it as inadmissible
    And it still names it as unmeasurable, with the same removal as before

  Scenario: the reason that no raised budget and no new instrument can remove
    Given a knob refused as unmeasurable, as unaffordable, and because no step on it is single
    When the criterion's budget is raised past the price of its trial
    And an instrument begins writing the series its metric reads
    And the acceptor reports on it again
    Then the report no longer names it as unaffordable
    And it no longer names it as unmeasurable
    And it still names that no step on it is single, with the same removal as before

  Scenario: a knob refused because no step on it is single stays proposable
    Given a knob whose key resolves to more than one bound
    When the acceptor report is produced
    Then the knob appears on the report with its refusal
    And it is still a member of the set admitted for tuning
    And what is refused is committing a step on it, not proposing one

  Scenario: a knob refused for one reason reports one reason
    Given a knob that is admissible, measurable, affordable and accruing toward its threshold
    When the acceptor reports on it
    Then it names exactly one reason
    And that reason is that the ledger is still short of the threshold

  Scenario: a knob whose values have no order reports that alone
    Given a knob whose declared values have no order
    When the acceptor reports on it
    Then the only reason it names is that no notch on the knob means anything
    And it names no reason that is a statement about a step the knob could take
    And it is reported as a change a person makes, permanently
    And it is not reported as waiting for evidence

  Scenario Outline: a refusal raised while the ruling was being built is not a reason it did not commit
    Given a proposal whose ruling could not be built because <situation>
    When the acceptor reports on it
    Then <situation> is reported in its own right, naming the part that could not be built
    And it is not among the reasons that proposal did not commit

    Examples: no ruling was produced, so there is no ruling for these to be reasons about
      | situation                                                        |
      | the knob has no trial unit declared beside it on the criterion   |
      | the criterion's metric pointer resolves to nothing               |
      | the proposal moves the knob by more than one notch               |
      | the proposal names no step at all                                |

  Scenario: a knob with no trial unit is reported as a malformed criterion, not as a knob's silence
    Given a knob in the tunable set with no trial unit declared beside it
    When the acceptor reports on it
    Then the report states that the criterion does not price it, naming the declaration that is missing
    And that is not listed among the reasons the knob did not commit
    And the knob is not reported as accruing toward any threshold

  Scenario: the grounds for inadmissibility travel as detail beneath it, never as members
    Given a knob whose harness states its policy in prose and names no configuration key
    When the acceptor reports on it
    Then the reason it names is that the knob is not admissible
    And the harness ground is shown beneath that reason as detail
    And the harness ground is not itself one of the reasons the knob did not commit

  Scenario: a key nobody declared tunable is refused before this vocabulary is reached
    Given a proposal naming a key outside the declared tunable set
    When the acceptor reports on it
    Then it is refused, naming the declaration that decides membership
    And that refusal is not among the reasons a proposal did not commit
    And no reason from that vocabulary is reported for it
