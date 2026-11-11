@executable @docs @planning
Feature: the two packs are comparable and reproducible

  WHY. A comparison between the arms is fair only if the two packs are of matched size, and it can be
  run again only if each pack is red before the build and green on its reference (ADR-005 §2, §6).
  `packages/learning/test/pilot-kit.suite.mjs` runs each pack's `*.spec.mjs` files with `node --test`
  in a temporary copy of the pack, once on the stub and once with the reference in its place.

  Rule: R2 · The packs are comparable and reproducible

    Scenario Outline: E3 · each pack is red on its stub and green on its reference
      Given a temporary copy of `packages/learning/pilot/<pack>/`
      When its specs run on the stub, then again with the reference solution in the stub's place
      Then at least one spec fails on the stub
      And every spec passes on the reference

      Examples:
        | pack   |
        | pack-a |
        | pack-b |

    Scenario: E4 · the packs are of matched size
      When both packs are read
      Then their stories hold the same number of scenarios
      And each pack's `FACILITATOR.md` holds exactly one held-out item of each `CHECK_KINDS` entry, each with its answer
      And each holds one delayed item, with its answer

    Scenario: E6 · each pack is a small project the participant has not seen
      When each pack is read
      Then it holds a small fixture project with its own source files, beyond the stub
      And one refined story whose `reads:` and `files:` name paths inside the pack
      And `aof work validate` passes in a temporary copy of the pack

    Scenario: the kit is never collected or shipped
      When the repository's test runners and `packages/learning/package.json` are read
      Then no file under `packages/learning/pilot/` is named `*.test.mjs` or `*.suite.mjs`
      And the package's `files` list is still `src` and `assets`
