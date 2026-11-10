@manual @cli @work @validate
Feature: the recent stories narrow

  WHY. The point of the story is a measured change in what a story's run costs, not a passing
  selector. RESEARCH Q1 is the baseline: 76 of 76 stories widened. This repo's declarations are the
  part only a real tree can test: its roots, its suffixes, and the couplings backed by a census of
  which suites read which documents. A replay through the shipped selector says whether they are
  enough, and names every remaining widening (ADR-003). Agent-runnable. The evidence goes in
  VERIFICATION.md.

  Rule: R4 · The recent stories narrow

    Scenario: E11 · the baseline stories are replayed through the shipped selector
      Given a code graph built fresh with `aof graph build .`
      When the 76 declared `files:` sets of RESEARCH Q1 are each put through `selectSuites` with this repo's declared roots, suffixes and couplings
      Then VERIFICATION.md records how many still widen, and for each one the file and the reason
      And VERIFICATION.md records the median and the 75th-percentile selected count of those that narrow

    Scenario: each declared coupling is backed by a reader census
      Given this repo's `work.test.couplings`
      When each coupling's `paths` are searched for in every suite file, both as a literal path and as `path.join` segments
      Then every suite found reading a coupled path is among that coupling's `suites`
      And VERIFICATION.md records the search and its result for each coupling

    Scenario: three narrowed stories run what was selected
      Given three stories from the replay that narrowed
      When `aof test --scope impacted --story <ref>` runs for each on a scratch checkout with an isolated `AOF_GLOBAL_HOME`
      Then each run's summary names the same suites the replay selected
      And VERIFICATION.md records the three summary lines
