@executable @cli @planning
Feature: Each recommended plugin is a standalone package

  WHY. Cowork uploads one plugin per file, and each pm-skills plugin folder is already a plugin root.
  A package is that folder exactly as it is at the commit, plus the repository's licence, which
  lives only at the root. The set is the recommended one, as on Claude, and pm-ai-shipping is never
  included.

  Background:
    Given a planner source tree whose HEAD is "5042ff6169e0df49086c846f69bf7b6cdb67a6de"
    And the tree holds the folders "pm-execution", "pm-product-discovery", "pm-product-strategy", "pm-market-research" and "pm-ai-shipping"
    And the tree's root holds "LICENSE" and "README.md"

  Rule: R2 · The recommended set, and never pm-ai-shipping

    Scenario Outline: the packaged set follows --with-optional
      When the planner is packaged <mode>
      Then the packages are exactly "<packages>"

      Examples:
        | example | mode                     | packages                                                                    |
        |         | with the recommended set | pm-execution, pm-product-discovery, pm-product-strategy                     |
        | E5      | with optional plugins    | pm-execution, pm-product-discovery, pm-product-strategy, pm-market-research |

    Scenario: E6 · pm-ai-shipping is never packaged
      When the planner is packaged with optional plugins
      Then no package is named "pm-ai-shipping"

  Rule: R3 · Every package can stand alone

    Scenario: E7 · a package is its plugin folder plus the licence
      When the planner is packaged
      Then the "pm-execution" package holds every file under "pm-execution/" in the tree, at the same relative path and with the same bytes
      And the "pm-execution" package holds ".claude-plugin/plugin.json"
      And the "pm-execution" package holds "LICENSE" with the bytes of the tree's root "LICENSE"

    Scenario: E8 · a package holds nothing from a sibling folder or the root besides the licence
      When the planner is packaged
      Then the "pm-execution" package holds no "README.md" from the tree's root
      And it holds no file from "pm-product-discovery/"

    Scenario: a plugin folder without its manifest is refused
      Given the "pm-product-strategy" folder has no ".claude-plugin/plugin.json"
      When the planner is packaged
      Then packaging is refused with reason "plugin-missing"
      And the message names "pm-product-strategy"
