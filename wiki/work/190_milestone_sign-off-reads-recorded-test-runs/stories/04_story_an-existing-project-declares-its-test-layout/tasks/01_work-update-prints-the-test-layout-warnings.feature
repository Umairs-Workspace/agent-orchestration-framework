@executable @cli @work @distribution
Feature: `aof work update` prints the test-layout warnings

  WHY. A check that only `aof project doctor` shows has to be remembered before it helps, and that
  is how 190's gap would have stayed hidden. The update is the one command every project already on
  aof runs to take a new bundle, so it ends with the same warnings (ADR-008 §5, 190/04 Q1). It
  calls the same function as the project doctor, so the two cannot disagree. It follows the
  memory-config lines `work:update` already prints.
  The cases run `work:update` in a scratch repo with a planted config, under an isolated
  `AOF_GLOBAL_HOME`.

  Rule: R4 · `aof work update` tells a project what its test declaration leaves out

    Scenario: E20 · a pre-190 declaration prints one line per warning
      Given `work.test` declares `roots: ["test"]`, no `couplings`, and a gate with no `reportArgs` or `filesArgs`
      And the tree tracks `packages/work/test/a.suite.mjs`
      When `aof work update` runs
      Then after the `Updated ACD:` line it prints a `test-layout-suites`, a `test-layout-couplings` and a `test-layout-resume` line
      And each line names `/aof:map-tests`

    Scenario: E21 · a declaration that covers the tree prints nothing
      Given every `test-layout-*` check would be `ok`
      When `aof work update` runs
      Then no output line names `test-layout-`

    Scenario: E22 · the dry run prints the same lines
      Given the pre-190 declaration of E20
      When `aof work update --dry-run` runs
      Then it prints the same three `test-layout-*` lines
      And no file is written

    Scenario: the update and the project doctor agree
      Given the pre-190 declaration of E20
      When `aof work update --json` and `aof project doctor --json` run
      Then the update's `testLayout` warnings equal the doctor's `test-layout-*` warnings, id for id and message for message

    Scenario: an undeclared test runner adds no line
      Given `work.test` is absent
      When `aof work update` runs
      Then no output line names `test-layout-`
