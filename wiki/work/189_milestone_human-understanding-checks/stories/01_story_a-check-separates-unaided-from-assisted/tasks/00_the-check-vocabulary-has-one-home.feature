@executable @work @assets
Feature: the check vocabulary has one home

  WHY. The words a check reports with are the evidence's labels, so they are named once in
  `vocabulary.mjs`, beside teaching's stages, rungs and traps, and `grill-me.md` is pinned to them
  (ADR-003 §1, §6). Help reuses `HELP_LADDER` rather than minting new words. FF-18902 is a second leg
  in FF-17903's file, `test/arch/command/acd-teach-vocabulary-one-home.test.mjs`.

  Scenario Outline: the vocabulary holds each check list in order
    When `@aof/learning/vocabulary` is imported
    Then `<list>` is frozen and is exactly <entries>

    Examples:
      | list          | entries                                                                                                  |
      | CHECK_KINDS   | explain a design choice, predict an unseen input, diagnose a faulty example, adapt to a changed requirement |
      | CHECK_RESULTS | consistent with the reference, partly consistent, not consistent, unclear, skipped, unmeasured            |

  Scenario: FF-18902 · every check word appears in the prompt
    When `test/arch/command/acd-teach-vocabulary-one-home.test.mjs` runs
    Then it fails if an entry of `CHECK_KINDS` or `CHECK_RESULTS` is missing from `grill-me.md`
    And it fails if `grill-me.md` names a help rung that is not a `HELP_LADDER` entry, `none` or `answer revealed`

  Scenario Outline: FF-18902 · the summary never spells a verdict word
    Given `grill-me.md` with `<word>` added to its `<summary>` region
    When the FF-18902 check runs over that text
    Then it reports `<word>` as a word the summary may not spell

    Examples:
      | word    |
      | mastery |
      | score   |
      | grade   |

  Scenario: FF-17903 still holds beside it
    When `test/arch/command/acd-teach-vocabulary-one-home.test.mjs` runs
    Then `grill-me.md` names neither `Forming` nor `Dislodging`
    And every `STAGES`, `HELP_LADDER` and `TRAPS` entry still appears in `teach.md`
