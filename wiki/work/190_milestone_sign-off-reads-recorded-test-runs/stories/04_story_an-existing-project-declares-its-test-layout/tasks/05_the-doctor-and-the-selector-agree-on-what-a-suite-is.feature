@bug @finding-F-05 @finding-F-06 @finding-F-07 @executable @cli @work @validate
Feature: the doctor and the selector agree on what a suite is

  WHY. At `aof:verify 190`, task 04's live run of `/aof:map-tests` showed two answers to "what is
  a suite".
  - F-05: on this repo, after a skill-faithful mapping, `test-layout-suites` still warns about 8
    native `node:test` files under `packages/{effects,server,contracts,messaging}/test` that
    `scripts/test.mjs` never registers. Its repair, "Declare them with /aof:map-tests", is one the
    skill must refuse, because declaring them makes files selectable that the runner rejects.
  - F-06: a project declaring `suiteSuffixes [".test.ts"]` is told `ok`, yet
    `aof test --scope all --plan` answers `0/0 suites`. `walkSuiteFiles` collects only `.test.mjs`
    and `.suite.mjs`, whatever the declaration says.
  - F-07: the skill never authors `gate.noLanesArgs`, so a mapped project's resume re-runs lanes
    that had finished.
  How the check learns what the runner can run without a second membership predicate (FF-19006) is
  the architect's ADR-008 amendment to make first. These rows pin the behaviour.

  Rule: R1 · A check says `ok` only when the selector can select what it counted

    Scenario: E1 · files the runner does not run are not reported as undeclared suites
      Given this repo with its 190 `work.test` declaration
      When `aof project doctor` runs
      Then `test-layout-suites` does not name the native `node:test` files that `scripts/test.mjs` never registers
      And it does not advise declaring a file the runner would reject

    Scenario: E2 · a declared suffix defines the whole suite
      Given a project whose `work.test` declares `roots ["src", "test"]` and `suiteSuffixes [".test.ts"]`, with one `.test.ts` file under each
      When `aof test --scope all --plan` runs
      Then the plan's whole suite holds both `.test.ts` files
      And `test-layout-suites` is `ok` only when that plan's whole suite is not empty

  Rule: R2 · A mapped resume skips the lanes that finished

    Scenario: E3 · the skill declares `noLanesArgs` when the gate program honours it
      When `map-tests.md` is read
      Then it says to declare `work.test.gate.noLanesArgs` beside `reportArgs` and `filesArgs` when the gate program takes a no-lanes flag
