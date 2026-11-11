@manual @cli @work @validate
Feature: `/aof:map-tests` proves a real declaration on a real tree

  WHY. The prose cases prove what the skill says, not what it does on a tree. Two trees carry the
  question: this repo with its pre-190 `work.test` block, where the right answer is known (190/01
  declared it by hand), and a small project on a runner that cannot resume. Agent-runnable. The
  evidence goes in VERIFICATION.md, never written into this repo's own config.

  Rule: R3 · /aof:map-tests declares the layout and proves it by replay

    Scenario: E14 · this repo's pre-190 declaration is mapped and the replay improves
      Given a scratch clone of this repo at the current commit, its `work.test` block replaced by the one at 4ff7fba6, and an isolated `AOF_GLOBAL_HOME`
      When `/aof:map-tests` runs in it
      Then the before replay shows how many of the 30 commits widened
      And the declaration it writes includes the `packages/*/test` roots and the `.suite.mjs` suffix
      And the after replay shows fewer widened, with the median and 75th-percentile selected counts
      And `aof project doctor` shows `test-layout-suites` and `test-layout-couplings` at `ok`
      And VERIFICATION.md records both replays and the diff

    Scenario: E16 · near-total narrowing is said, not hidden
      Given the after replay of E14
      When its median selected count is within 10% of the total
      Then the report says the narrowed runs are near-total and names the composition root it sees
      And VERIFICATION.md records the line

    Scenario: E19 · the dry run leaves the config untouched
      Given the scratch clone of E14, freshly reset
      When `/aof:map-tests --dry-run` runs
      Then `.aof/aof.config.json` hashes the same before and after
      And the proposed change and the before replay are printed

    Scenario: E15 · a runner that cannot resume is told so
      Given a scratch project whose `work.test.gate` runs `npx vitest run --shard`
      When `/aof:map-tests` runs in it
      Then no `reportArgs` or `filesArgs` are written
      And the report says resume is unavailable for this runner and names the resume contract
      And `aof project doctor` still shows `test-layout-resume` as a `warning`
