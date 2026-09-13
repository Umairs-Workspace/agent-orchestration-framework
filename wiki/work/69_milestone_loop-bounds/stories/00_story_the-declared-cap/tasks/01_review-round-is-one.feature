@executable @cli @work @work-stream
Feature: One review round by default — a second one has to name its blocker

  Review→fix→re-review is the loop with no stop condition. `continue.md` names three lanes and
  "apply confirmed fixes" with no round cap and no exit criterion; `code-review.md` says outright
  "Repeat until no blocking finding is open". Build, by contrast, already has a correct terminator.
  The cap belongs on review.

  The evidence that more rounds are worse, not merely dearer: Huang et al. (ICLR 2024) measured
  self-correction without an external oracle as net-NEGATIVE — GSM8K 95.5% → 91.5% → 89.0% across
  rounds. MAST measured step repetition at 17.14% across 7 frameworks. And this repo: m52 ran 13
  delta-application runs against 5 authoring runs — 41.8% of the milestone's tokens — and m66
  recorded five closure rounds, one of which refused the milestone it shipped.

  The operative rule is that a review round is worth paying for only when it consumes a
  DETERMINISTIC external signal. A reviewer LLM's opinion is not an oracle. So the second round is
  not forbidden — it is made to say which of the three blocker classes it is claiming.

  ADR-001.

  Scenario: the first review round is admitted without ceremony
    Given a story arriving at review for the first time
    When the loop decides what to do next
    Then the review round is admitted
    And no blocker needs to be named

  Scenario: a second round with no named blocker is refused
    Given a story whose first review round has completed
    And no blocker has been named
    When a second review round is requested
    Then it is refused
    And the refusal names the blocker classes that would admit one

  Scenario: a second round with a named blocker is admitted
    Given a story whose first review round has completed
    And a blocker has been named
    When a second review round is requested
    Then it is admitted
    And the named blocker is carried on the decision

  Scenario Outline: what counts as a blocker, and what becomes a work item instead
    Given a finding from the first review round described as <finding>
    When it is offered as the reason for a second round
    Then it is <verdict>

    Examples: the three classes, and the class everything else falls into
      | finding                                    | verdict                        |
      | a production defect                        | admitted as a blocker          |
      | a guard that protects nothing              | admitted as a blocker         |
      | a violation of the locked contract         | admitted as a blocker         |
      | a naming preference                        | refused — it becomes a work item |
      | a suggested refactor with no defect        | refused — it becomes a work item |
      | a documentation improvement                | refused — it becomes a work item |

  Scenario: the refusal is a stop, not a crash
    Given a loop driving a story whose review rounds are exhausted
    When the bound is reached
    Then the loop halts with the exhausted-cap stop rather than an error
    And the halt reports the round count and the cap it was measured against

  Scenario: the cap is read from the declared bound, not from a literal
    Given a workspace that declares a review round count of its own
    When the loop decides whether a further round is admitted
    Then the declared value is what bounds it
    And no second copy of the number exists in the decision path
