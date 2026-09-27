@docs @work @distribution
Feature: Every reviewer lens ships a reporting bar, and a clean review is a valid one

  THE DEFECT WAS AN ABSENCE, NOT A WRONG RULE. Nothing in any reviewer agent said what not to
  report, how confident to be before reporting, or that finding nothing is an acceptable outcome.
  An agent spawned to review, told only to review, treats its own thoroughness as the success
  criterion — 91 findings against 59 verification rows on one milestone, 19 `fix` and 18 `test`
  commits against 7 `feat` on another.

  THE FOUR GATES DO THE LOAD-BEARING WORK, NOT THE CONFIDENCE NUMBER. A reviewer that must produce
  `file:line` plus an input → state → outcome trace cannot report an impression: assembling the
  evidence is itself the filter. The explicit do-not-flag list handles the recurring false positives
  no confidence gate catches, because the reviewer is genuinely confident about those.

  FIVE LENSES, NOT THREE. FIX-1 names the architect, QA and designer as the surface and adds
  security and compliance "when they run". All five carry the bar, so a conditional-tier lens cannot
  be the one unbounded reviewer left in the loop.

  WHAT THIS TASK CANNOT PROVE. A bundled instruction is distribution, not behaviour. The executable
  scenarios below assert that every lens SHIPS the bar; whether a bar changes what a reviewer
  reports is a measurement over milestones, and is the @manual scenario.

  @executable
  Scenario: every reviewer lens carries the reporting bar
    Given the five reviewer agent prompts in the bundle
    When I read each one
    Then each declares a reporting-bar section
    And each states a confidence threshold above 80%
    And each states that a clean review is a valid review
    And each permits a lower-confidence suspected Blocker as an explicit question rather than a finding

  @executable
  Scenario Outline: each lens's bar names its own evidence, not a generic one
    When I read the <lens> prompt's reporting bar
    Then it requires <evidence> as the citation
    And it grades findings as Blocker, Important or Nit

    Examples:
      | lens           | evidence                                             |
      | aof-architect  | the exact file:line                                  |
      | aof-qa         | the scenario/case plus its owning file:line or route |
      | aof-designer   | the screenshot, region and baseline region           |
      | aof-security   | the exact file:line, with attacker input             |
      | aof-compliance | the obligation and its evidence file:line            |

  @executable
  Scenario: the reviewers that read a story are also told what to read
    Given the architect, QA and designer prompts
    When I read each one
    Then each declares a review-context section scoping the review to the task features, the diff and the story's declared reads set

  @manual
  Scenario: the bar changes what reviewers report, without letting defects escape
    Given a milestone reviewed before the bar and a milestone reviewed after it
    When I compare findings per verification row, the Blocker share, and defects escaping to aof:verify
    Then findings per verification row falls
    And defects escaping to aof:verify does not rise
