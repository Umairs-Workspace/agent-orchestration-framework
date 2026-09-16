@cli @work @work-stream
Feature: The saving is stated as a delta, with the method that produced it

  The SPEC's baseline figures are the ones this milestone is judged against — **927,588
  cache-creation tokens per agent spawn**, a **316:1** context-in to output ratio across six
  instrumented milestones, and **$5.79 per spawn as cache-creates against $0.46 as cache-reads**.
  None of them has a measured successor. A level is not a saving; only a delta is.

  **THE BEFORE IS HISTORY, NOT A CONTROL — AND THE CONTRACT MUST SAY SO RATHER THAN IMPLY AN A/B.**
  Measured at refine: `--exclude-dynamic-system-prompt-sections` is a bare literal in the single
  argv builder (`src/agent-session-driver.mjs:665`), unconditional, with no config path. **There is
  no off-switch**, so a same-machine before/after taken by toggling the flag is not available
  without editing source. What is available is better than it sounds: **six pre-70 milestones carry
  a committed `observability/report.md` in-tree** (45, 47, 48, 49, 50, 52), each holding the
  per-agent `cache-create` / `cache-read` table that produced the SPEC's own figures. The baseline
  is on disk and reproducible, and does not depend on transcript retention.

  **THE SHARPEST WAY TO GET THIS WRONG IS TO CHANGE INSTRUMENTS MID-COMPARISON.** The reader has two
  surfaces and they measure different things. The per-agent table is derived from transcripts
  (`src/work-observe.mjs:152-153`) and exists for every milestone, before and after. The per-phase
  table is derived from run-record `spend` (70/02) and exists for **no** pre-70 milestone, because
  no pre-70 run carries the key. Comparing a per-agent before against a per-phase after would be an
  instrument change wearing the costume of an effect. The delta is therefore stated on the per-agent
  figures on **both** sides; the per-phase ratio is reported as a new measurement in its own right,
  never as the after half of a delta whose before was taken elsewhere.

  ADR-008 — reporting only. Closes finding F-12 with 00.

  @manual @finding-F-12
  Scenario: before and after are read by one instrument
    Given the pre-70 milestones carry committed per-agent cache figures
    When the before is taken
    Then it is re-read through the same reader that takes the after
    And no figure is carried into the comparison from the SPEC's prose without being re-read
    And the milestones and date range it was taken from are stated

  @manual @finding-F-12
  Scenario: the delta is stated for the figures the milestone is judged by
    Given a before and an after taken through the same reader
    When the comparison is recorded
    Then cache-creation tokens per spawn carries a before, an after and a delta
    And the cache read-to-create ratio carries a before, an after and a delta
    And cost per spawn carries a before, an after and a delta

  @manual @finding-F-12
  Scenario: the two reader surfaces are never spliced into one delta
    Given the per-agent table exists for both eras
    And the per-phase table exists for the after era alone
    When the comparison is recorded
    Then the delta is stated on the per-agent figures on both sides
    And the per-phase ratio is reported as a measurement in its own right
    And no delta pairs a per-agent before with a per-phase after

  @manual
  Scenario: the method states its confounders and its sample size
    Given the stable-prefix flag has no off-switch on this tree
    When the comparison is recorded
    Then it states that the before is history rather than a toggled control
    And it states the sample size behind each figure
    And it names the confounders it cannot remove
    And a delta recorded with neither sample size nor confounders is not accepted as a measurement

  @manual
  Scenario: a figure that cannot be taken is reported as not taken
    Given a figure the reader cannot produce for one side of the comparison
    When the comparison is recorded
    Then it is reported as not taken
    And it is never estimated, interpolated, or carried across from the other side
    And its absence does not remove the other figures from the comparison

  @manual
  Scenario: a delta that goes the wrong way is recorded as it was measured
    Given an after that is worse than the before on some figure
    When the comparison is recorded
    Then that figure is recorded with its measured direction
    And the comparison is not restricted to the figures that improved
    And the regression is raised as a finding rather than omitted

  @uat @finding-F-12
  Scenario: the person deciding whether warm start worked reads the delta
    Given the recorded before-and-after
    When it is read by whoever must decide whether this milestone paid for itself
    Then they state whether the delta answers that question
    And a delta that does not answer it is recorded as a finding rather than accepted

  @manual
  Scenario Outline: the headline figures, and what a recorded comparison owes each
    Given the SPEC-stated before for <figure> is <before>
    When the comparison is recorded
    Then it carries <owed>

    Examples: the three figures the objective is written in, each re-read rather than quoted
      | figure                        | before                  | owed                                              |
      | cache-create tokens per spawn | 927,588                 | a re-read before, an after, a delta, a sample size |
      | context-in to output ratio    | 316:1                   | a re-read before, an after, a delta, a sample size |
      | cost per spawn as creates     | $5.79                   | a re-read before, an after, a delta, a sample size |
      | cost per spawn as reads       | $0.46                   | the counterfactual it was always stated against    |
      | worst single run ingested     | 9.43M cache-create      | whether any run in the after era approaches it     |

  @manual
  Scenario Outline: baselines a comparison must refuse
    Given a proposed before taken from <source>
    When the comparison is assembled
    Then it is <verdict>

    Examples: the before is only as good as the instrument that took it
      | source                                       | verdict                                             |
      | a committed pre-70 observability snapshot    | admitted                                            |
      | the same reader re-run over pre-70 sessions  | admitted                                            |
      | the SPEC's prose, quoted without re-reading  | refused — nothing was measured                      |
      | a pre-70 per-phase ratio                     | refused — no pre-70 run carries spend               |
      | a figure from another repository             | refused — a different tree is a different baseline  |
