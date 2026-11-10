@executable @cli @work @distribution
Feature: A registration whose folder is gone stops costing anything

  WHY. 58 of the control node's 66 registrations pointed at deleted dispatch worktrees. Every tick
  resolved the registry twice and warned about each of them twice. The tick now resolves once, and
  a registration whose folder is gone is removed at once with one line saying so. Using the folder
  again re-registers it, and another node's rows are never touched.

  Background:
    Given an isolated global home with this node "node-7297"
    And a launcher driven by an injected 15-second ticker and clock

  Rule: R2 · A registration whose folder is gone stops costing anything

    Scenario: E6 · gone folders are reported once a tick, not twice
      Given 58 workspaces registered on "node-7297" whose folders do not exist
      When 1 tick runs
      Then the registry is resolved once for that tick
      And the warnings hold exactly 1 line for each of the 58 workspaces

    Scenario: E7 · a gone folder's registration is removed at once, with one line
      Given workspace "lane-3" is registered on "node-7297" at a folder that does not exist
      When 3 ticks run
      Then "node-7297" no longer has "lane-3" registered
      And exactly one line names "lane-3" and its folder path

    Scenario: a removed registration comes back when its folder is used
      Given the registration of "lane-3" on "node-7297" was removed because its folder was gone
      And the folder exists again as an aof workspace
      When an aof command runs in that folder
      Then "node-7297" has "lane-3" registered again

    Scenario: E8 · another node's rows are never removed
      Given workspace "lane-3" is registered on "node-7297" and on "node-2976" at a folder that does not exist
      When 1 tick runs on "node-7297"
      Then "node-2976" still has "lane-3" registered

    Scenario Outline: only a gone folder is removed
      Given workspace "ws" is registered on "node-7297" and its registry resolve reports "<reason>"
      When 3 ticks run
      Then "ws" is <outcome>

      Examples:
        | reason          | outcome                                                     |
        | workdir-missing | removed on the first tick, with 1 line                      |
        | not-a-directory | removed on the first tick, with 1 line                      |
        | no-descriptor   | still registered, warned once, and its pass is backed off   |

    Scenario: a registry that cannot be read removes nothing
      Given the global store cannot be opened
      When 1 tick runs
      Then no registration is removed
      And the warnings say the registered workspaces could not be read
