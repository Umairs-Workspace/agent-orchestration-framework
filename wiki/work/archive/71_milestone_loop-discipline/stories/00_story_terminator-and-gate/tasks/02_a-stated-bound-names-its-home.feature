@docs @work @validate
Feature: A loop bound stated in a bundled asset names its home, and equals it
  In order that a bound changed in its one home cannot silently drift from the prompt that quotes it
  every bundled asset stating a loop bound must name the `work.loop.*` key it comes from, and the
  value it states must equal that key's own declared default.

  # Contract, not restated: ADR-002 keeps the numeral and ADDS the citation — no shipped surface
  # prints the resolved value, so a citation alone would leave the reader with no number. The
  # structural sweep over the whole bundle is FF-7101; this feature is the check's own behaviour,
  # driven by planting a mutation and reading what it answers.

  Background:
    Given the bundle under "src/bundle/" as it ships
    And the bound declarations in "src/loop-bounds.mjs"

  @executable
  Scenario Outline: each bound fact a bundled asset states names its home
    When "<asset>" is read
    Then the stated <fact> names "<home>" beside its value

    Examples:
      | asset                                    | fact                       | home                            |
      | src/bundle/commands/continue.md          | review rounds by default   | work.loop.reviewRounds          |
      | src/bundle/commands/continue.md          | the review hard cap        | MAX_REVIEW_ROUNDS               |
      | src/bundle/commands/continue.md          | the build no-progress stop | work.loop.buildNoProgressRounds |
      | src/bundle/commands/code-review.md       | the review hard cap        | MAX_REVIEW_ROUNDS               |
      | src/bundle/loops/review-fix-rereview.md  | the review ceiling         | work.loop.reviewRounds          |
      | src/bundle/loops/build-to-green.md       | the build ceiling          | work.loop.buildNoProgressRounds |

  @executable
  Scenario Outline: a stated value is compared with the key's own declared default
    Given a bundled asset states <stated> as the value of a "work.loop.*" key
    When the check compares it with that key's resolved default
    Then the check is <verdict>

    Examples:
      | stated                            | verdict                                                              |
      | that key's own declared default   | green                                                                |
      | one more than that key's default  | red, naming the asset, the key, the stated value and the resolved one |
      | one less than that key's default  | red, naming the asset, the key, the stated value and the resolved one |
      | another loop key's default        | red, naming the asset, the key, the stated value and the resolved one |
      | no value at all — the key alone   | green, because a citation with no numeral states no value             |

  @executable
  Scenario Outline: what the check answers when the bundle is mutated
    Given the bundle with <plant>
    When the check runs
    Then it is <verdict>

    Examples:
      | plant                                                     | verdict                                   |
      | nothing planted — the bundle as it ships                  | green                                     |
      | a "work.loop.*" key renamed to one the resolver map lacks | red, naming the asset and the unknown key |
      | the review-default citation deleted                       | red, naming the missing bound fact        |
      | the review hard-cap citation deleted                      | red, naming the missing bound fact        |
      | the build no-progress citation deleted                    | red, naming the missing bound fact        |
      | a spawn stagger stated in seconds                         | green — it names no key and no clamp      |
      | the 390 / 768 / 1280 breakpoints                          | green — they name no key and no clamp     |
      | a bare numeral in prose beside no key and no clamp        | green                                     |
