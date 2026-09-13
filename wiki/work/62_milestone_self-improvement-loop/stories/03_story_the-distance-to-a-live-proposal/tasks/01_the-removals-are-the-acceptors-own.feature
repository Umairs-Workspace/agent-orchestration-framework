@executable @cli @work @validate
Feature: The work that clears a refusal is the acceptor's own sentence, and it moves when that moves

  The acceptor already ships, beside every refusal it reports, the thing that would remove it. That is
  the difference between a diagnosis and a task: "nothing executed reads this value" is a complaint,
  and the sentence naming the consumer that would fix it is a work item someone can schedule. This
  surface's job is to carry that sentence to a reader who is looking at a proposal rather than at a
  ruling. Its job is not to say the same thing again in its own words.

  The failure this prevents is a copy. Two sentences for one fact drift the moment one of them is
  edited, and the one that gets edited is the original — so the reader of the copy is told to do work
  that is no longer the work. This repository has measured that species repeatedly, which is why the
  contract here is not "the sentence is correct" but "the sentence cannot be wrong": change the
  acceptor's removal text for a code and this surface changes with it, with nothing edited here. A
  content check would pass on the day it was written and go stale silently; a drift check cannot.

  The tree-shaped half of this — that no removal sentence for a member of the ruling vocabulary is
  authored under this milestone's modules — is a property of the tree and lives in the register. What
  is contracted here is only what a caller sees when the original moves.

  The vocabulary the acceptor rules with is frozen today, but this surface is not the place that
  knows the freeze. A refusal arriving that this surface has never seen must render from the report it
  arrived on, in full, rather than as a blank line or as a sentence guessed for it — because the
  report is the source of truth and a local table would be the copy all over again.

  61/ADR-010 §2. 61/ADR-013 §1b, §2. ADR-001 §3. ADR-002 §3. FF-6206.

  Scenario Outline: whatever the acceptor's report says is what a reader is shown
    Given the acceptor's report refuses a tunable proposal as <refusal>
    And the removal its report carries for that refusal is <treatment>
    When the distance for that proposal is read
    Then the removal it states is <outcome>
    And nothing in this surface was edited to produce it

    Examples: every member of the frozen ruling vocabulary, each read from the report it arrived on
      | refusal                | treatment                                           | outcome                                                           |
      | not-admissible         | the sentence the acceptor ships today               | that sentence, character for character                            |
      | metric-unmeasurable    | the sentence the acceptor ships today               | that sentence, character for character                            |
      | trial-unaffordable     | rewritten to name a different subject entirely      | the rewritten sentence, and nothing about a basket or a budget    |
      | yield-bound            | extended with a clause naming the epochs it needs   | the extended sentence, with that clause included                  |
      | evidence-short         | shortened to a single word                          | that single word, with no fuller sentence supplied for it         |
      | budget-exhausted       | rewritten to name a different milestone's work      | the rewritten sentence, naming that milestone                     |
      | step-would-be-compound | rewritten to describe a redesign rather than a step | the rewritten sentence, unchanged in either direction             |
      | not-an-ordinal-knob    | emptied, so the report carries no removal at all    | that the removal is unknown, rather than a sentence supplied here |

  Scenario: the same refusal reported twice with different text reads differently both times
    Given two acceptor reports refusing the same code with different removal sentences
    When the distance is read from each
    Then each states the sentence its own report carried
    And the two differ

  Scenario: a refusal this surface has never seen still renders, from the report
    Given the acceptor's report carries a refusal code this surface has no case for
    When the distance for that proposal is read
    Then the refusal appears, with the removal the report carried for it
    And it is not rendered blank
    And no removal is supplied in place of the one that arrived
    And it is counted among the things standing between that proposal and a commit

  Scenario: the refusals arrive in the acceptor's order and are neither reordered nor merged
    Given an acceptor report refusing one proposal on several counts at once
    When the distance is read
    Then the refusals appear in the order the report gave them
    And none is dropped
    And none is collapsed into another

  Scenario: a refusal the acceptor stops reporting stops appearing here
    Given a proposal reported with two refusals from the acceptor
    When a later report from the acceptor carries only one of them
    And the distance is read again
    Then it states that one refusal only
    And the removal it states is the one the later report carried

  Scenario: where a refusal and a prerequisite limb name the same fact, it is stated once
    Given a proposal the acceptor refuses on a ground that is also one of this milestone's limbs
    When the distance is read
    Then that fact appears once
    And the removal stated for it is the acceptor's
    And the limb's measurement appears beneath it as the evidence for that refusal
    And no second removal sentence is stated for the same fact

  Scenario: a limb the acceptor reports no refusal for stands alone, on the same reading
    Given a proposal standing behind a prerequisite limb the acceptor reports no refusal for
    When the distance is read
    Then the limb appears in its own right, with the engineering that would close it
    And the reading it carries is the same one it carries beneath a refusal
    And every line taken from the acceptor's report is attributable to it

  Scenario: an advisory proposal reaches no acceptor, and no acceptor sentence is invented for it
    Given an advisory-lane proposal
    When its distance is read
    Then it names no member of the acceptor's ruling vocabulary
    And it states no removal attributed to the acceptor
