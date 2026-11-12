@executable @cli @work @validate
Feature: The grammar keeps one home

  WHY. The doctor lane, the build door and the discovery prose all judge one map, and they agree
  only because one module spells its labels (134/FF-13402). Four new spellings arrive with this
  story: two classes, a state and a provenance, plus the finding's id and the research document's
  name. FF-19201 holds them to the same module, so a second reader cannot come to read
  `researched` its own way.

  Scenario: FF-19201 · the grammar still has one home
    When "test/arch/examples/acd-example-map-single-home.test.mjs" runs
    Then it fails unless the four classes, the five states and the four provenance labels are frozen arrays exported from "packages/specification-by-example/src/map.mjs"
    And it fails if any other runtime module spells a "researched F<n>" label or state, or builds a finding id
    And it fails if the research document's file name is spelt in more than one module of the package

  Scenario Outline: FF-19201 · each planted second spelling turns the control red
    Given a runtime module outside "map.mjs" with <planted> added
    When the FF-19201 sweep runs over that text
    Then it reports the module and the planted line

    Examples:
      | planted                                         |
      | a bracketed "researched F1" label in a string   |
      | a regex source that builds an "F" finding id    |
      | the four classes respelt as one literal list    |
      | a second "RESEARCH.md" literal in the package   |

  Scenario: the sweep still reports what it read
    When the FF-19201 sweep runs over this checkout
    Then it names the runtime modules it swept
    And it fails if it swept none, or did not find the home

  Scenario: the package README names what the map module now reads
    When "packages/specification-by-example/README.md" is read
    Then the "map" row says it also reads a research document's findings
    And it names the classes "domain" and "policy"

  Scenario: this story changes no bundle asset
    When "aof work update --dry-run --json" runs in this checkout
    Then it plans no change to any command, brief or template
