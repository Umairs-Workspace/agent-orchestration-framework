@executable @work @distribution
Feature: @aof/learning is a workspace package that @aof/work never names

  WHY. Teaching is a practice and has its own package (SPEC Objective, ADR-004). Dependencies run one
  way, as 135's did for specification by example: the package may import `@aof/contracts`, and
  `@aof/work` imports nothing back. FF-17902 enforces it. Rows land in
  `test/bundle/yarn-installation.test.mjs` and the new arch test.

  Scenario: the package is a workspace member with only lower-level dependencies
    When `packages/learning/package.json` is read
    Then its name is `@aof/learning`, it is private, and its type is `module`
    And it exports `./mode`
    And its dependencies are exactly `@aof/contracts`
    And the root `yarn.lock` resolves `@aof/learning@workspace:packages/learning`
    And `node scripts/supply-chain-audit.mjs` passes

  Scenario: the package's own suites run under the repository runner
    When `scripts/test.mjs` collects its owned suites
    Then it imports `packages/learning/test/index.mjs`
    And that index runs `mode.suite.mjs`

  Scenario: the mode descriptor is the door's input, and nothing more
    When `@aof/learning/mode` is imported
    Then it exports a frozen `teachMode` equal to `{ flag: "teach", command: "teach", description }` with a non-empty description

  Scenario: FF-17902 · dependencies run one way
    When `test/arch/command/acd-learning-package-one-way.test.mjs` runs
    Then it fails if a module under `packages/work/src` imports `@aof/learning`
    And it fails if `packages/work/package.json` lists `@aof/learning`
    And it fails if a comment-stripped `@aof/work` source spells `teach`
    And it fails if a module under `packages/core/src` other than `practices.mjs` or `application/bindings/commands/continue.mjs` imports `@aof/learning`
