@executable @cli @work @work-stream
Feature: The classifier that reports zero is retired — a tool call is classified by what it was

  `TOOLCHAIN_RE` (`src/work-observe.mjs:67-68`) matches `npm test`, `vitest` and `jest`. This
  repo's own rules **forbid** `npm test` (`.claude/rules/build-deploy-restart.md`), and every real
  run here is `AOF_GLOBAL_HOME=$(mktemp -d) node …`, which falls through and classifies as
  `"bash"`.

  The measured result: **zero of sixty grind reasons were toolchain-related**, while a hand-written
  retrospective on the same work reported 33%. Reclassified by content over the same corpus:
  **340 test-ish calls averaging 30.5 s**, worst at ≥600 s
  (`RESEARCH-agent-loop-economics.md` §1).

  **A classifier that reports zero where the true figure is non-zero is worse than no classifier,
  because zero reads as a finding.** It is not a gap a reader notices; it is a confident wrong
  answer, and it sent a planning document's headline lever to the wrong place — the "targeted test
  execution" lever was ranked cheapest-highest-confidence on a 46% figure from a different repo,
  while this repo's real figure is ~6% because model generation is 84% of active time.

  So the pattern is retired rather than extended with more command names: a pattern that must
  enumerate every way a project can run its tests will be wrong again in the next repo, silently,
  in the same direction. Classification reads what the tool call actually was.

  This is the ONLY part of the miner ADR-006 retires. Its per-agent diagnostics — the grind flag,
  the edit↔test interleave, the thrashed-file counts — have no OTel equivalent, are the only place
  write-side thrash is visible, and are untouched here.

  ADR-006.

  Scenario: this repo's real test command is classified as a test run
    Given an agent run whose tool calls include this repo's isolated node test invocation
    When the run is classified
    Then those calls are classified as test runs
    And their duration is counted toward tool wait rather than toward model generation

  Scenario: the forbidden pattern is no longer what decides
    Given an agent run whose tool calls include no `npm test`, no `vitest` and no `jest`
    And whose calls are nonetheless test runs
    When the run is classified
    Then the test-run count is non-zero
    And the classification did not depend on any of those three command names

  Scenario: a category reading zero means zero
    Given an agent run that genuinely ran no tests
    When the run is classified
    Then the test-run count is zero
    And the report distinguishes that from a category it could not classify

  Scenario Outline: what a call is classified as
    Given an agent tool call that <call>
    When it is classified
    Then it is classified as <class>

    Examples: test runs, however this project spells them
      | call                                                     | class     |
      | runs the repo's isolated node test invocation             | test run  |
      | runs a focused suite through the repo's own test entry    | test run  |
      | runs the repo's check script                              | test run  |

    Examples: not test runs
      | call                                                     | class     |
      | reads a file                                             | read      |
      | edits a file                                             | edit      |
      | runs an unrelated shell command                          | other     |

  Scenario: the per-agent diagnostics the miner exists for are unchanged
    Given an agent run with a known edit-to-test interleave, grind assessment and thrashed-file set
    When the run is analysed after the classifier change
    Then the interleave pattern is reported as before
    And the grind assessment is reported as before
    And the thrashed-file set is reported as before
