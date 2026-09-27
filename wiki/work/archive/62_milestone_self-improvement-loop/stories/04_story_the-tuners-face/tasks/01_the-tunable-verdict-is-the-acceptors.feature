@executable @cli @work @validate
Feature: The verdict on a tunable proposal is the acceptor's, rendered exactly as it arrived

  The acceptor declared an input for proposals a milestone ago and nothing has ever handed it one. A
  declared input with no producer is a species this repository has measured twice, and this command is
  the producer that closes it. What it does with the answer is the whole of this criterion: it shows
  it. The proposals go out, the rows come back, and the rows are what a reader sees.

  The temptation this guards against is a soft one, which is why it needs a contract rather than a
  convention. A proposer naturally wants to rank its own output, and a ranking with a cut-off is an
  acceptance rule wearing a friendlier noun. So there is no re-scoring, no re-ordering of what came
  back, no promotion of a nearly-eligible proposal, and no improvement to the wording. The ordering
  this command does perform is over proposals — which one a reader meets first — and it decides
  nothing about any of them.

  The failing implementation this catches is the helpful one. It collapses several reasons to the most
  important-looking. It rounds an evidence count for display. It rewrites a refusal into something
  more readable. Each of those is small, each looks like polish, and each makes the surface a second
  opinion about a question it is not allowed to hold one on.

  Two evidence figures travel here and they answer different questions. A proposal's own evidence is
  the count of distinct source documents behind it, and it decides whether the proposal is worth
  reading. The acceptor's evidence is rulings against its threshold, and it decides whether a change
  may be committed. They are stated under their own names, side by side, and never added or compared.

  ADR-002 §1, §3, §4. ADR-007 §4. FF-6201.

  Scenario: the tunable-lane proposals are the ones the acceptor is asked about
    Given a report over proposals in both lanes
    When the verdicts are obtained
    Then the acceptor is asked about exactly the tunable-lane proposals
    And every verdict on the report belongs to a proposal it answered for
    And no advisory-lane proposal carries a verdict

  Scenario Outline: whatever the acceptor answers is what the surface shows
    Given the acceptor answers a tunable proposal <answer>
    When that proposal's line is read
    Then its verdict reads <verdict>
    And its eligibility reads <eligibility>
    And the reasons it names are <reasons>

    Examples: the surface is a window on the answer, never a second opinion about it
      | answer                                                            | verdict               | eligibility  | reasons                                                                        |
      | eligible, with evidence at the threshold and no reason against it | eligible              | eligible     | none                                                                           |
      | report-only, one reason: the ledger is short of the threshold     | report-only           | not eligible | evidence-short                                                                 |
      | report-only, two reasons, in the order it gave them               | report-only           | not eligible | not-admissible, metric-unmeasurable                                            |
      | report-only, four reasons, in the order it gave them              | report-only           | not eligible | not-admissible, metric-unmeasurable, trial-unaffordable, step-would-be-compound |
      | report-only, one reason no work on this machinery can remove      | report-only           | not eligible | not-an-ordinal-knob                                                            |
      | report-only, the budget can reach no crossing record              | report-only           | not eligible | budget-exhausted                                                               |
      | that no ruling could be constructed for it at all                 | no ruling constructed | not eligible | none, with the construction refusal shown in its own right                     |

  Scenario: the reasons leave in the order they arrived
    Given an acceptor answering a proposal with several reasons in a stated order
    When that proposal's line is read
    Then the reasons appear in that same order
    And they are not re-sorted by count, by severity, or by anything this command knows

  Scenario: a reason is rendered in the acceptor's own words
    Given an acceptor answering with a reason and what would remove it
    When that proposal's line is read
    Then the reason and its removal read as the acceptor gave them
    And neither is paraphrased, shortened or expanded here

  Scenario: the evidence figures are the acceptor's, unrounded and unrecomputed
    Given an acceptor answering with an evidence count against a threshold
    When that proposal's line is read
    Then both figures read as the acceptor gave them
    And the distance between them is the one it stated
    And no evidence figure appears that the acceptor did not carry

  Scenario Outline: the proposal's evidence and the commit's evidence never merge into one figure
    Given a tunable proposal citing <documents> distinct source documents whose ledger holds <rulings> rulings
    When its line is read
    Then it states <documents> against the floor a proposal must meet to be emitted
    And it states <rulings> against the threshold a commit must meet
    And it states no single figure standing for both

    Examples: two floors, two questions — whether to read it, and whether it may be committed
      | documents | rulings |
      | 2         | 0       |
      | 3         | 4       |
      | 5         | 8       |
      | 2         | 8       |

  Scenario: the census the report states is the one the acceptor counted
    Given an acceptor answer carrying a census of what could be observed
    When the report states its population figures
    Then they are the figures that census carried, with what it excluded attached
    And no population figure appears that the census did not carry

  Scenario: the ordering of proposals decides nothing
    Given two tunable proposals whose verdicts differ
    When the report orders them
    Then the order changes only which one a reader meets first
    And each verdict, eligibility and reason is the one the acceptor gave for that proposal

  Scenario: no proposal is withheld from the report on account of its verdict
    Given a report over proposals the acceptor refused for every reason it holds
    When the report is read
    Then every proposal the run formed appears on it
    And none was withheld for scoring poorly

  Scenario: an answer that changes changes the surface, with nothing edited here
    Given a proposal the acceptor reports as refused for want of evidence
    When the acceptor's own answer for it becomes eligible, and the report is produced again
    Then the surface reports it as eligible
    And no message or table here was edited to make that happen
