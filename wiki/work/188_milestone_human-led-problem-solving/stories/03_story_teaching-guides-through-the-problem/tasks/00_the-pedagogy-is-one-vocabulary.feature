@executable @work @assets
Feature: the pedagogy is one vocabulary in the package, and the prompt is pinned to it

  WHY. The stages, the rungs and the traps are named once, in `vocabulary.mjs`, so milestone 180's
  checks read the same words, and the hand-written prompt cannot drift from them (ADR-006). FF-17903
  enforces it, in `test/arch/bundle/acd-teach-vocabulary-one-home.test.mjs`.

  Scenario Outline: the vocabulary holds each list in order
    When `@aof/learning/vocabulary` is imported
    Then `<list>` is frozen and is exactly <entries>

    Examples:
      | list        | entries                                                                                                                       |
      | STAGES      | reinterpret, find analogies, consider solutions, evaluate a candidate, implement, evaluate the implementation                  |
      | HELP_LADDER | diagnostic question, conceptual hint, analogous example, partial scaffold, worked explanation                                  |

  Scenario Outline: each trap carries the control the SPEC pairs it with
    When `TRAPS` is read
    Then the trap `<trap>` has the control `<control>`

    Examples:
      | trap        | control                    |
      | Forming     | examples and counterexamples |
      | Assumption  | examples and counterexamples |
      | Dislodging  | revisiting an approach     |
      | Achievement | revisiting an approach     |
      | Location    | stage awareness            |
      | Progression | prerequisite questions     |
      | Interruption | pull-based hints          |
      | Mislead     | source and test checks     |

  Scenario: FF-17903 · the pedagogy has one home
    When `test/arch/bundle/acd-teach-vocabulary-one-home.test.mjs` runs
    Then it fails if an entry of `STAGES`, `HELP_LADDER` or `TRAPS` is missing from `teach.md`
    And it fails if a bundle asset other than `teach.md` names `Forming` or `Dislodging`

  Scenario: the package exports the vocabulary and writes nothing
    When `packages/learning/package.json` is read
    Then it exports `./vocabulary`
    And no module under `packages/learning/src` imports `node:fs` or writes a file
